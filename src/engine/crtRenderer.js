/**
 * HiDPI Canvas P3 Phosphor CRT renderer locked symmetrically to 104x38 cells.
 * Pre-bakes a HiDPI glyph atlas (5 phosphor grades + Rank-4 glow row), a soft
 * radial phosphor halation sprite for luminous objects, and a CRT overlay.
 */

import {
  FULL_COLOR_BG,
  GRADE_BRIGHT,
  GRADE_GHOST,
  GRID_COLS,
  GRID_ROWS,
  PHOSPHOR_THEMES,
  TONE_PALETTES,
} from './palette.js';

const FONT_STACK = "16px 'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";
const ASCII_MIN = 32;
const ASCII_MAX = 126;
const ASCII_COUNT = ASCII_MAX - ASCII_MIN + 1;
const GLOW_ROW = 5;
const EMISSIVE_GLYPHS = new Set(['@', '*', 'B', 'O', '>', 'V', '!', '+', '(', ')', 'X', '/']);

export class CrtCanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.cellW = 11;
    this.cellH = 20;
    this.pad = 6;
    this.slotW = this.cellW + this.pad * 2;
    this.slotH = this.cellH + this.pad * 2;
    this.logicalW = GRID_COLS * this.cellW;
    this.logicalH = GRID_ROWS * this.cellH;
    this.crtEnabled = true;
    this.colorEnabled = true;
    this.themeIndex = 0;
    this.dpr = 1;
    this.vignette = null;
    this.atlas = null;
    this.glowSprite = null;
    this.crtOverlay = null;
    this.toneAtlases = new Map();
    this.toneGlows = new Map();
    this._brightQueue = [];
    this.resize();

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          this.toneAtlases.clear();
          this._buildAtlas();
        })
        .catch(() => {});
    }
  }

  getTheme() {
    return PHOSPHOR_THEMES[this.themeIndex] || PHOSPHOR_THEMES[0];
  }

  toggleColor() {
    this.colorEnabled = !this.colorEnabled;
    return this.colorEnabled;
  }

  cyclePhosphor() {
    this.themeIndex = (this.themeIndex + 1) % PHOSPHOR_THEMES.length;
    this._buildAtlas();
    this._buildGlowSprite();
    return this.getTheme();
  }

  _createOffscreenCanvas(logicalW, logicalH, dpr) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }
    const c = document.createElement('canvas');
    if (!c || typeof c.getContext !== 'function') return null;
    c.width = Math.round(logicalW * dpr);
    c.height = Math.round(logicalH * dpr);
    const octx = c.getContext('2d');
    if (!octx) return null;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx: octx };
  }

  _buildAtlasForPalette(grades, glowRgba) {
    const off = this._createOffscreenCanvas(ASCII_COUNT * this.slotW, 6 * this.slotH, this.dpr);
    if (!off) return null;
    const { canvas, ctx } = off;
    ctx.clearRect(0, 0, ASCII_COUNT * this.slotW, 6 * this.slotH);
    ctx.textBaseline = 'top';
    ctx.font = FONT_STACK;

    for (let row = GRADE_GHOST; row <= GLOW_ROW; row++) {
      const grade = row === GLOW_ROW ? GRADE_BRIGHT : row;
      const py = row * this.slotH + this.pad + 2;
      ctx.fillStyle = grades[grade];
      if (row === GLOW_ROW) {
        ctx.shadowColor = glowRgba;
        ctx.shadowBlur = 7;
      } else {
        ctx.shadowBlur = 0;
      }
      for (let i = 1; i < ASCII_COUNT; i++) {
        const ch = String.fromCharCode(ASCII_MIN + i);
        const px = i * this.slotW + this.pad;
        ctx.fillText(ch, px, py);
      }
    }
    ctx.shadowBlur = 0;
    return canvas;
  }

  _buildAtlas() {
    const theme = this.getTheme();
    this.atlas = this._buildAtlasForPalette(theme.grades, theme.glowRgba);
  }

  _buildGlowSpriteForPalette(haloCore, haloMid) {
    const size = 48;
    const off = this._createOffscreenCanvas(size, size, this.dpr);
    if (!off) return null;
    const { canvas, ctx } = off;
    const g = ctx.createRadialGradient(size * 0.5, size * 0.5, 2, size * 0.5, size * 0.5, size * 0.5);
    g.addColorStop(0, haloCore);
    g.addColorStop(0.45, haloMid);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  _buildGlowSprite() {
    const theme = this.getTheme();
    this.glowSprite = this._buildGlowSpriteForPalette(theme.haloCore, theme.haloMid);
  }

  _getToneAtlas(tone) {
    if (!this.colorEnabled || tone == null || tone < 0 || tone >= TONE_PALETTES.length) {
      return this.atlas;
    }
    let a = this.toneAtlases.get(tone);
    if (!a) {
      const pal = TONE_PALETTES[tone];
      a = this._buildAtlasForPalette(pal.grades, pal.glowRgba);
      if (a) this.toneAtlases.set(tone, a);
    }
    return a || this.atlas;
  }

  _getToneGlow(tone) {
    if (!this.colorEnabled || tone == null || tone < 0 || tone >= TONE_PALETTES.length) {
      return this.glowSprite;
    }
    let gs = this.toneGlows.get(tone);
    if (!gs) {
      const pal = TONE_PALETTES[tone];
      gs = this._buildGlowSpriteForPalette(pal.haloCore, pal.haloMid);
      if (gs) this.toneGlows.set(tone, gs);
    }
    return gs || this.glowSprite;
  }

  _buildCrtOverlay() {
    const off = this._createOffscreenCanvas(this.logicalW, this.logicalH, this.dpr);
    if (!off) {
      this.crtOverlay = null;
      return;
    }
    const { canvas, ctx } = off;
    ctx.clearRect(0, 0, this.logicalW, this.logicalH);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    for (let y = 0; y < this.logicalH; y += 3) {
      ctx.fillRect(0, y, this.logicalW, 1);
    }
    if (this.vignette) {
      ctx.fillStyle = this.vignette;
      ctx.fillRect(0, 0, this.logicalW, this.logicalH);
    }
    this.crtOverlay = canvas;
  }

  resize() {
    this.dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    this.canvas.width = Math.round(this.logicalW * dprOr1(this.dpr));
    this.canvas.height = Math.round(this.logicalH * dprOr1(this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.textBaseline = 'top';
    this.ctx.font = FONT_STACK;

    // Gentle radial CRT bezel falloff (preserved clear inside active play center)
    const grad = this.ctx.createRadialGradient(
      this.logicalW * 0.5,
      this.logicalH * 0.5,
      this.logicalH * 0.42,
      this.logicalW * 0.5,
      this.logicalH * 0.5,
      this.logicalW * 0.68
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(3, 1, 0, 0.42)');
    this.vignette = grad;

    this.toneAtlases.clear();
    this.toneGlows.clear();
    this._buildAtlas();
    this._buildGlowSprite();
    this._buildCrtOverlay();
  }

  hitTestCell(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const lx = ((clientX - rect.left) / rect.width) * this.logicalW;
    const ly = ((clientY - rect.top) / rect.height) * this.logicalH;
    const col = Math.floor(lx / this.cellW);
    const row = Math.floor(ly / this.cellH);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  _bufferHasColor(buffer) {
    if (!this.colorEnabled) return false;
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = buffer[r];
      for (let c = 0; c < GRID_COLS; c++) {
        if (row[c][2] !== undefined) return true;
      }
    }
    return false;
  }

  draw(buffer) {
    const ctx = this.ctx;
    const theme = this.getTheme();
    const useMultiColor = this._bufferHasColor(buffer);
    ctx.fillStyle = useMultiColor ? FULL_COLOR_BG : theme.bg;
    ctx.fillRect(0, 0, this.logicalW, this.logicalH);

    if (this.atlas) {
      this._drawWithAtlas(ctx, buffer);
    } else {
      this._drawFallback(ctx, buffer, theme);
    }

    if (this.crtEnabled) {
      if (this.crtOverlay) {
        ctx.drawImage(this.crtOverlay, 0, 0, this.logicalW, this.logicalH);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        for (let y = 0; y < this.logicalH; y += 3) {
          ctx.fillRect(0, y, this.logicalW, 1);
        }
        if (this.vignette) {
          ctx.fillStyle = this.vignette;
          ctx.fillRect(0, 0, this.logicalW, this.logicalH);
        }
      }
    }
  }

  _drawWithAtlas(ctx, buffer) {
    const dpr = this.dpr;
    const cellW = this.cellW;
    const cellH = this.cellH;
    const slotW = this.slotW;
    const slotH = this.slotH;
    const sw = slotW * dpr;
    const sh = slotH * dpr;
    const cw = cellW * dpr;
    const chPx = cellH * dpr;
    const pad = this.pad;
    const padDpr = pad * dpr;
    const brightRow = this.crtEnabled ? GLOW_ROW : GRADE_BRIGHT;
    const brightQueue = this._brightQueue;
    brightQueue.length = 0;

    for (let r = 0; r < GRID_ROWS; r++) {
      const rowCells = buffer[r];
      const dy = r * cellH;
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = rowCells[c];
        const ch = normalizeGlyph(cell[0]);
        if (ch === ' ') continue;
        const g = cell[1];
        const tone = cell[2];
        let idx = ch.charCodeAt(0) - ASCII_MIN;
        if (idx <= 0 || idx >= ASCII_COUNT) idx = 14;
        if (g === GRADE_BRIGHT) {
          brightQueue.push(c, r, idx, ch, tone);
          continue;
        }
        const atlas = tone !== undefined && this.colorEnabled ? this._getToneAtlas(tone) : this.atlas;
        const sx = (idx * slotW + pad) * dpr;
        const sy = (g >= 0 && g < GRADE_BRIGHT ? g : 3) * slotH * dpr + padDpr;
        ctx.drawImage(atlas, sx, sy, cw, chPx, c * cellW, dy, cellW, cellH);
      }
    }

    // Blit subtle radial phosphor halation behind emissive Grade-4 symbols in playfield
    if (this.crtEnabled && this.glowSprite) {
      for (let i = 0; i < brightQueue.length; i += 5) {
        const c = brightQueue[i];
        const r = brightQueue[i + 1];
        const ch = brightQueue[i + 3];
        const tone = brightQueue[i + 4];
        if (r >= 1 && r < GRID_ROWS - 4 && EMISSIVE_GLYPHS.has(ch)) {
          const glow = tone !== undefined && this.colorEnabled ? this._getToneGlow(tone) : this.glowSprite;
          const cx = c * cellW + cellW * 0.5;
          const cy = r * cellH + cellH * 0.5;
          ctx.drawImage(glow, cx - 24, cy - 24, 48, 48);
        }
      }
    }

    const brightSy = brightRow * slotH * dpr;
    for (let i = 0; i < brightQueue.length; i += 5) {
      const c = brightQueue[i];
      const r = brightQueue[i + 1];
      const idx = brightQueue[i + 2];
      const tone = brightQueue[i + 4];
      const atlas = tone !== undefined && this.colorEnabled ? this._getToneAtlas(tone) : this.atlas;
      const sx = idx * slotW * dpr;
      ctx.drawImage(
        atlas,
        this.crtEnabled ? sx : sx + padDpr,
        this.crtEnabled ? brightSy : brightSy + padDpr,
        this.crtEnabled ? sw : cw,
        this.crtEnabled ? sh : chPx,
        this.crtEnabled ? c * cellW - pad : c * cellW,
        this.crtEnabled ? r * cellH - pad : r * cellH,
        this.crtEnabled ? slotW : cellW,
        this.crtEnabled ? slotH : cellH
      );
    }
  }

  _drawFallback(ctx, buffer, theme) {
    let lastStyle = '';
    ctx.shadowBlur = 0;
    for (let grade = GRADE_GHOST; grade < GRADE_BRIGHT; grade++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const y = r * this.cellH + 2;
        const rowCells = buffer[r];
        for (let c = 0; c < GRID_COLS; c++) {
          const cell = rowCells[c];
          const ch = normalizeGlyph(cell[0]);
          if (cell[1] === grade && ch !== ' ') {
            const tone = cell[2];
            const pal = tone !== undefined && this.colorEnabled && TONE_PALETTES[tone] ? TONE_PALETTES[tone] : theme;
            const style = pal.grades[grade];
            if (style !== lastStyle) {
              ctx.fillStyle = style;
              lastStyle = style;
            }
            ctx.fillText(ch, c * this.cellW, y);
          }
        }
      }
    }

    lastStyle = '';
    for (let r = 0; r < GRID_ROWS; r++) {
      const y = r * this.cellH + 2;
      const rowCells = buffer[r];
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = rowCells[c];
        const ch = normalizeGlyph(cell[0]);
        if (cell[1] === GRADE_BRIGHT && ch !== ' ') {
          const tone = cell[2];
          const pal = tone !== undefined && this.colorEnabled && TONE_PALETTES[tone] ? TONE_PALETTES[tone] : theme;
          const style = pal.grades[GRADE_BRIGHT];
          if (style !== lastStyle) {
            ctx.fillStyle = style;
            if (this.crtEnabled) {
              ctx.shadowColor = pal.glowRgba;
              ctx.shadowBlur = 6;
            } else {
              ctx.shadowBlur = 0;
            }
            lastStyle = style;
          }
          ctx.fillText(ch, c * this.cellW, y);
        }
      }
    }
    ctx.shadowBlur = 0;
  }
}

function normalizeGlyph(raw) {
  return typeof raw === 'string' && raw.length > 0 ? raw[0] : ' ';
}

function dprOr1(dpr) {
  return dpr > 0 ? dpr : 1;
}
