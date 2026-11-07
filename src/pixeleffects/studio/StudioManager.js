// StudioManager: Interactive Pixel Effects Studio & Archive for all 244 effects & 21 categories
// Full real-time preview, character rig toggle, speed control, backdrop changer, and parameter tuning

import { effects } from '../fx/index.js';
import { categories } from '../fx/categories.js';
import { createFrame, clearFrame, createFx, createAct, composite, backdrop, drawActor, painterFor, stockActor, actorAlphaOf, actBounds } from '../core/index.js';

export class StudioManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    // Format all effects
    this.allEffects = Object.entries(effects).map(([id, mod]) => {
      const cat = id.split('/')[0];
      const meta = {
        name: mod.meta?.name || id,
        desc: mod.meta?.desc || '',
        duration: mod.meta?.duration || 1,
        fps: mod.meta?.fps || 30,
        loop: mod.meta?.loop !== false,
        size: mod.meta?.size || [120, 120],
        origin: mod.meta?.origin || [60, 60],
        tags: mod.meta?.tags || [],
        options: mod.meta?.options || {},
        bg: mod.meta?.bg || 'ground',
        ...mod.meta,
      };
      return { id, cat, mod, meta };
    });

    this.categories = [{ id: 'all', name: 'all effects', blurb: 'all 244 procedural pixel art effects & moves' }, ...categories];
    this.activeCategory = 'moves';
    this.selectedEffectId = 'moves/dash-strike';

    // Player state
    this.playing = true;
    this.speed = 1.0;
    this.showActor = true;
    this.flip = false;
    this.backdropType = 'ground';
    this.theme = 'default';

    this.inst = null;
    this.frame = null;
    this.imgData = null;
    this.bgBuf = null;
    this.acc = 0;
    this.wait = 0;

    this.loadEffect(this.selectedEffectId);
  }

  get activeEffect() {
    return this.allEffects.find((e) => e.id === this.selectedEffectId) || this.allEffects[0];
  }

  get filteredEffects() {
    if (this.activeCategory === 'all') return this.allEffects;
    return this.allEffects.filter((e) => e.cat === this.activeCategory);
  }

  setCategory(catId) {
    this.activeCategory = catId;
    const list = this.filteredEffects;
    if (list.length > 0 && !list.some((e) => e.id === this.selectedEffectId)) {
      this.loadEffect(list[0].id);
    }
  }

  loadEffect(effectId) {
    this.selectedEffectId = effectId;
    const item = this.activeEffect;
    if (!item) return;

    const mod = item.mod;
    const isActed = !!mod.act && this.showActor;
    const b = isActed ? actBounds(mod) : null;
    const [w, h] = isActed && b ? [b.x1 - b.x0, b.y1 - b.y0] : item.meta.size;
    const [ox, oy] = isActed && b ? [-b.x0, -b.y0] : item.meta.origin;

    // Viewport dimensions
    const pad = 1.35;
    this.W = Math.max(160, Math.ceil(w * pad));
    this.H = Math.max(120, Math.ceil(h * pad));
    this.originX = Math.floor((this.W - w) / 2) + ox;
    this.originY = isActed ? Math.max(oy + 4, this.H - (b?.y1 || 20) - 4) : Math.floor((this.H - h) / 2) + oy;

    this.frame = createFrame(this.W, this.H);
    this.imgData = this.ctx.createImageData(this.W, this.H);
    this.setBackdrop(this.backdropType);

    this.restart();
  }

  setBackdrop(kind) {
    this.backdropType = kind;
    this.bgBuf = backdrop(kind, this.W, this.H, this.originY);
  }

  restart() {
    const item = this.activeEffect;
    if (!item) return;

    const isActed = !!item.mod.act && this.showActor;
    const opts = {
      x: this.originX,
      y: this.originY,
      flip: this.flip,
      actor: this.showActor,
      ...item.meta.options,
    };

    if (isActed) {
      this.inst = createAct(item.mod, opts);
    } else {
      this.inst = createFx(item.mod, opts);
    }

    this.acc = 0;
    this.wait = 0;
  }

  togglePlay() {
    this.playing = !this.playing;
  }

  step(dt) {
    const item = this.activeEffect;
    if (!item || !this.inst) return;

    const fps = item.meta.fps || 30;
    const step = 1 / fps;

    if (this.playing) {
      this.acc = Math.min(this.acc + dt * this.speed, 0.25);
    }

    while (this.acc >= step) {
      this.acc -= step;
      const isActed = !!item.mod.act && this.showActor;
      const done = isActed ? this.inst.done() : !item.meta.loop && this.inst.t >= item.meta.duration;

      if (done) {
        this.wait += step;
        if (this.wait > 0.4) {
          this.restart();
        }
      } else {
        this.inst.update(step);
      }
    }
  }

  draw(targetCtx, renderW, renderH) {
    if (!this.inst || !this.frame) return;

    const f = clearFrame(this.frame);
    const item = this.activeEffect;
    const isActed = !!item.mod.act && this.showActor;

    if (isActed) {
      this.inst.draw(f);
      composite(f, this.imgData.data, this.bgBuf);
      const [sx, sy] = this.inst.shake || [0, 0];
      this.ctx.putImageData(this.imgData, sx, sy);
    } else {
      this.inst.draw(f, 'back');
      const m = item.meta;
      const tt = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
      if (m.actor && this.showActor) {
        drawActor(
          painterFor(f).place(this.originX, this.originY, this.flip),
          this.inst.options.actor ?? stockActor(m.actor === 2 ? 2 : 1),
          actorAlphaOf(item.mod, tt, this.inst.options)
        );
      }
      this.inst.draw(f, 'front');
      composite(f, this.imgData.data, this.bgBuf);
      this.ctx.putImageData(this.imgData, 0, 0);
    }

    // Scale up onto target viewport canvas with pixelated crispness
    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;

    // Apply color theme filter if needed
    if (this.theme === 'bw') {
      targetCtx.filter = 'grayscale(100%) contrast(150%)';
    } else if (this.theme === 'green') {
      targetCtx.filter = 'sepia(100%) hue-rotate(90deg) saturate(300%)';
    } else if (this.theme === 'amber') {
      targetCtx.filter = 'sepia(100%) hue-rotate(5deg) saturate(300%)';
    }

    targetCtx.drawImage(this.canvas, 0, 0, renderW, renderH);
    targetCtx.restore();
  }
}

