// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
// Breakable obstacles that yield gold, hearts, and secret items

import { soundSynth } from '../audio/SoundSynth.js';

export class Destructible {
  constructor(x, y, type = 'crate') {
    this.x = x;
    this.y = y;
    this.type = type; // 'crate', 'barrel', 'chest'
    this.radius = 8;
    this.isBroken = false;

    if (type === 'crate') {
      this.glyph = '[x]';
    } else if (type === 'barrel') {
      this.glyph = '[o]';
    } else if (type === 'chest') {
      this.glyph = '[=]';
    }
  }

  smash(player, worldOrManager, particles, damageText, camera) {
    if (this.isBroken) return;
    this.isBroken = true;

    soundSynth.playHit();
    if (camera && camera.addShake) camera.addShake(4, 0.15);

    // Splinter debris
    if (particles && particles.emitSparks) {
      particles.emitSparks(this.x, this.y, 14, ['/', '\\', '·', 'x', '■', '✦']);
    }

    const isChest = this.type === 'chest';
    if (isChest) {
      soundSynth.playCoin();
      if (damageText && damageText.add) {
        damageText.add(this.x, this.y - 10, 'CHEST OPENED!', 'crit');
      } else if (worldOrManager && worldOrManager.addFloatingText) {
        worldOrManager.addFloatingText('★ CHEST OPENED! ★', this.x, this.y - 12, '#ffea00');
      }
    } else {
      if (damageText && damageText.add) {
        damageText.add(this.x, this.y - 10, '+SCRAP!', 'normal');
      } else if (worldOrManager && worldOrManager.addFloatingText) {
        worldOrManager.addFloatingText('+SCRAP!', this.x, this.y - 12, '#ffffff');
      }
    }

    // Support both PixelWorld (spawnLoot) and EntityManager (dropLoot)
    if (worldOrManager) {
      if (worldOrManager.spawnLoot) {
        worldOrManager.spawnLoot(this.x, this.y, isChest ? 'warlord' : 'slime');
      } else if (worldOrManager.dropLoot) {
        worldOrManager.dropLoot(this.x, this.y);
        if (isChest) {
          worldOrManager.dropLoot(this.x + 6, this.y);
          worldOrManager.dropLoot(this.x - 6, this.y);
        }
      }
    }
  }

  draw(frame, theme = 'color') {
    if (this.isBroken) return;
    const W = frame.w;
    const H = frame.h;
    const bx = Math.round(this.x) - 5;
    const by = Math.round(this.y) - 10;

    let col = this.type === 'chest' ? 0xfff0b424 : (this.type === 'barrel' ? 0xff8b4513 : 0xffa0522d);
    if (theme === 'bw') col = 0xffcccccc;
    else if (theme === 'green') col = 0xff20df60;

    for (let dy = 0; dy < 10; dy++) {
      for (let dx = 0; dx < 10; dx++) {
        const px = bx + dx;
        const py = by + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const isEdge = dx === 0 || dx === 9 || dy === 0 || dy === 9;
          frame.color[py * W + px] = isEdge ? 0xff141018 : col;
        }
      }
    }
  }

  render(ctx, cameraOrScale) {
    if (this.isBroken) return;

    let sx = this.x;
    let sy = this.y;
    if (cameraOrScale && typeof cameraOrScale.worldToScreen === 'function') {
      const s = cameraOrScale.worldToScreen(this.x, this.y);
      sx = s.x;
      sy = s.y;
    } else if (typeof cameraOrScale === 'number') {
      sx = this.x * cameraOrScale;
      sy = this.y * cameraOrScale;
    }

    ctx.save();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.type === 'chest' ? '#ffea00' : '#bbbbcc';
    ctx.fillText(this.glyph, sx, sy);
    ctx.restore();
  }
}

