/**
 * HiDPI Canvas P3 Amber Phosphor CRT renderer locked symmetrically to 104x38 cells.
 */

import {
  AMBER_HEX,
  BG_HEX,
  GRADE_BRIGHT,
  GRADE_GHOST,
  GRADE_LIT,
  GRID_COLS,
  GRID_ROWS,
} from './palette.js';

export class CrtCanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.cellW = 11;
    this.cellH = 20;
    this.logicalW = GRID_COLS * this.cellW;
    this.logicalH = GRID_ROWS * this.cellH;
    this.crtEnabled = true;
    this.vignette = null;
    this.resize();
  }

  resize() {
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    this.canvas.width = Math.round(this.logicalW * dpr);
    this.canvas.height = Math.round(this.logicalH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.textBaseline = 'top';
    this.ctx.font = "16px 'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

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

    // Batch non-bright glyphs per grade across each row
    for (let grade = GRADE_GHOST; grade <= GRADE_LIT; grade++) {
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

    // Incandescent bright pass with warm phosphor halo when CRT glow is active
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

    if (this.crtEnabled) {
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
