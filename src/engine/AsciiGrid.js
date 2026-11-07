// Pure Monospace ASCII Character Grid Engine
// Manages a 2D matrix of discrete ASCII glyphs and luminance/contrast

export class AsciiGrid {
  constructor(cols = 100, rows = 34) {
    this.cols = cols;
    this.rows = rows;
    this.theme = 'bw'; // 'bw', 'green', 'amber'

    // Dual buffers for characters and color luminance
    this.chars = [];
    this.colors = [];
    this.brightness = [];

    this.clear();
  }

  clear() {
    for (let r = 0; r < this.rows; r++) {
      if (!this.chars[r]) {
        this.chars[r] = new Array(this.cols);
        this.colors[r] = new Array(this.cols);
        this.brightness[r] = new Float32Array(this.cols);
      }
      for (let c = 0; c < this.cols; c++) {
        this.chars[r][c] = ' ';
        this.colors[r][c] = '#ffffff';
        this.brightness[r][c] = 0;
      }
    }
  }

  setChar(col, row, ch, color = '#ffffff', bright = 1.0) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    if (ch === ' ' || ch === '') return; // Transparent space

    this.chars[row][col] = ch;
    this.colors[row][col] = color;
    this.brightness[row][col] = bright;
  }

  drawString(col, row, str, color = '#ffffff', bright = 1.0) {
    if (row < 0 || row >= this.rows) return;
    for (let i = 0; i < str.length; i++) {
      const c = col + i;
      if (c >= 0 && c < this.cols) {
        this.setChar(c, row, str[i], color, bright);
      }
    }
  }

  drawSprite(col, row, lines, flipX = false, color = '#ffffff') {
    for (let r = 0; r < lines.length; r++) {
      const lineY = row + r;
      if (lineY < 0 || lineY >= this.rows) continue;

      let lineStr = lines[r];
      if (flipX) {
        lineStr = this.mirrorString(lineStr);
      }

      for (let c = 0; c < lineStr.length; c++) {
        const lineX = col + c;
        if (lineX >= 0 && lineX < this.cols) {
          const ch = lineStr[c];
          if (ch !== ' ') {
            this.setChar(lineX, lineY, ch, color, 1.0);
          }
        }
      }
    }
  }

  mirrorString(str) {
    const mirrorMap = {
      '/': '\\',
      '\\': '/',
      '(': ')',
      ')': '(',
      '[': ']',
      ']': '[',
      '{': '}',
      '}': '{',
      '<': '>',
      '>': '<',
      'q': 'p',
      'p': 'q',
      'd': 'b',
      'b': 'd'
    };

    let result = '';
    for (let i = str.length - 1; i >= 0; i--) {
      const ch = str[i];
      result += mirrorMap[ch] || ch;
    }
    return result;
  }

  drawBox(col, row, w, h, title = '', color = '#ffffff') {
    // Top border
    let top = '╔';
    for (let i = 0; i < w - 2; i++) top += '═';
    top += '╗';
    this.drawString(col, row, top, color);

    // Title in top border
    if (title) {
      this.drawString(col + 2, row, `[ ${title} ]`, '#ffffff');
    }

    // Side borders
    for (let r = 1; r < h - 1; r++) {
      this.setChar(col, row + r, '║', color);
      this.setChar(col + w - 1, row + r, '║', color);
    }

    // Bottom border
    let bot = '╚';
    for (let i = 0; i < w - 2; i++) bot += '═';
    bot += '╝';
    this.drawString(col, row + h - 1, bot, color);
  }

  cycleTheme() {
    if (this.theme === 'bw') this.theme = 'green';
    else if (this.theme === 'green') this.theme = 'amber';
    else this.theme = 'bw';
    return this.theme;
  }

  // Render character matrix to high-performance Canvas
  renderToCanvas(ctx, canvasWidth, canvasHeight) {
    const charW = canvasWidth / this.cols;
    const charH = canvasHeight / this.rows;

    const bgMap = {
      bw: '#050505',
      green: '#040d04',
      amber: '#0d0702'
    };

    ctx.fillStyle = bgMap[this.theme] || '#050505';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.font = `bold ${Math.floor(charH * 0.95)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < this.rows; r++) {
      const y = r * charH + charH / 2;
      for (let c = 0; c < this.cols; c++) {
        const ch = this.chars[r][c];
        if (ch !== ' ') {
          if (this.theme === 'green') {
            ctx.fillStyle = this.colors[r][c] === '#555555' ? '#116611' : '#33ff33';
          } else if (this.theme === 'amber') {
            ctx.fillStyle = this.colors[r][c] === '#555555' ? '#774400' : '#ffaa00';
          } else {
            ctx.fillStyle = this.colors[r][c] || '#ffffff';
          }
          ctx.fillText(ch, c * charW + charW / 2, y);
        }
      }
    }
  }

  // Export raw ASCII text (for inspection / raw copy)
  toRawText() {
    let output = '';
    for (let r = 0; r < this.rows; r++) {
      output += this.chars[r].join('') + '\n';
    }
    return output;
  }
}

