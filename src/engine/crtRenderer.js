/**
 * HiDPI Canvas P3 Amber Phosphor CRT renderer locked symmetrically to 104x38 cells.
 * Pre-bakes a HiDPI glyph atlas (5 phosphor grades + Rank-4 glow row) and CRT overlay
 * so 60 FPS animation blits drawImage() calls instead of per-frame shadowBlur/fillText.
 */

import {
  AMBER_HEX,
  BG_HEX,
  GRADE_BRIGHT,
  GRADE_GHOST,
  GRID_COLS,
  GRID_ROWS,
} from './palette.js';

const FONT_STACK = "16px 'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";
const ASCII_MIN = 32;
const ASCII_MAX = 126;
const ASCII_COUNT = ASCII_MAX - ASCII_MIN + 1;
const GLOW_ROW = 5;

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
    this.dpr = 1;
    this.vignette = null;
    this.atlas = null;
    this.crtOverlay = null;
    this._brightQueue = [];
    this.resize();

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          this._buildAtlas();
        })
        .catch(() => {});
    }
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

  _buildAtlas() {
    const off = this._createOffscreenCanvas(ASCII_COUNT * this.slotW, 6 * this.slotH, this.dpr);
    if (!off) {
      this.atlas = null;
      return;
    }
    const { canvas, ctx } = off;
    ctx.clearRect(0, 0, ASCII_COUNT * this.slotW, 6 * this.slotH);
    ctx.textBaseline = 'top';
    ctx.font = FONT_STACK;

    for (let row = GRADE_GHOST; row <= GLOW_ROW; row++) {
      const grade = row === GLOW_ROW ? GRADE_BRIGHT : row;
      const py = row * this.slotH + this.pad + 2;
      ctx.fillStyle = AMBER_HEX[grade];
      if (row === GLOW_ROW) {
        ctx.shadowColor = 'rgba(255, 196, 86, 0.72)';
        ctx.shadowBlur = 6;
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
    this.atlas = canvas;
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
    this.canvas.width = Math.round(this.logicalW * this.dpr);
    this.canvas.height = Math.round(this.logicalH * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.textBaseline = 'top';
    this.ctx.font = FONT_STACK;

    // Build radial phosphor falloff once per resize
    const grad = this.ctx.createRadialGradient(
      this.logicalW * 0.5,
      this.logicalH * 0.5,
      this.logicalH * 0.36,
      this.logicalW * 0.5,
      this.logicalH * 0.5,
      this.logicalW * 0.65
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(4, 2, 0, 0.52)');
    this.vignette = grad;

    this._buildAtlas();
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

  draw(buffer) {
    const ctx = this.ctx;
    ctx.fillStyle = BG_HEX;
    ctx.fillRect(0, 0, this.logicalW, this.logicalH);

    if (this.atlas) {
      this._drawWithAtlas(ctx, buffer);
    } else {
      this._drawFallback(ctx, buffer);
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
        const [ch, g] = rowCells[c];
        if (ch === ' ') continue;
        let idx = ch.charCodeAt(0) - ASCII_MIN;
        if (idx <= 0 || idx >= ASCII_COUNT) idx = 14; // '.' fallback
        if (g === GRADE_BRIGHT) {
          brightQueue.push(c, r, idx);
          continue;
        }
        const sx = (idx * slotW + pad) * dpr;
        const sy = (g >= 0 && g < GRADE_BRIGHT ? g : 3) * slotH * dpr + padDpr;
        ctx.drawImage(this.atlas, sx, sy, cw, chPx, c * cellW, dy, cellW, cellH);
      }
    }

    const brightSy = brightRow * slotH * dpr;
    for (let i = 0; i < brightQueue.length; i += 3) {
      const c = brightQueue[i];
      const r = brightQueue[i + 1];
      const idx = brightQueue[i + 2];
      const sx = idx * slotW * dpr;
      ctx.drawImage(
        this.atlas,
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

  _drawFallback(ctx, buffer) {
    for (let grade = GRADE_GHOST; grade < GRADE_BRIGHT; grade++) {
      ctx.fillStyle = AMBER_HEX[grade];
      ctx.shadowBlur = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        const y = r * this.cellH + 2;
        const rowCells = buffer[r];
        for (let c = 0; c < GRID_COLS; c++) {
          const [ch, g] = rowCells[c];
          if (g === grade && ch !== ' ') {
            ctx.fillText(ch, c * this.cellW, y);
          }
        }
      }
    }

    ctx.fillStyle = AMBER_HEX[GRADE_BRIGHT];
    if (this.crtEnabled) {
      ctx.shadowColor = 'rgba(255, 196, 86, 0.72)';
      ctx.shadowBlur = 6;
    } else {
      ctx.shadowBlur = 0;
    }
    for (let r = 0; r < GRID_ROWS; r++) {
      const y = r * this.cellH + 2;
      const rowCells = buffer[r];
      for (let c = 0; c < GRID_COLS; c++) {
        const [ch, g] = rowCells[c];
        if (g === GRADE_BRIGHT && ch !== ' ') {
          ctx.fillText(ch, c * this.cellW, y);
        }
      }
    }
    ctx.shadowBlur = 0;
  }
}
