// Interactive Retro ASCII Dialogue Box
// Shows NPC conversations, quest logs, and shop purchases

export class DialogueBox {
  constructor() {
    this.isOpen = false;
    this.speaker = '';
    this.text = '';
    this.displayedText = '';
    this.charIndex = 0;
    this.typingSpeed = 0.025; // Seconds per character
    this.timer = 0;
    this.onClose = null;
    this.options = []; // Optional choices, e.g. [ { label: 'Upgrade Sword ($50)', action: ... } ]
    this.selectedOption = 0;
  }

  open(speaker, text, options = [], onClose = null) {
    this.isOpen = true;
    this.speaker = speaker;
    this.text = text;
    this.displayedText = '';
    this.charIndex = 0;
    this.timer = 0;
    this.options = options;
    this.selectedOption = 0;
    this.onClose = onClose;
  }

  close() {
    this.isOpen = false;
    if (this.onClose) {
      this.onClose();
      this.onClose = null;
    }
  }

  update(dt, input) {
    if (!this.isOpen) return;

    // Typewriter effect
    if (this.charIndex < this.text.length) {
      this.timer += dt;
      if (this.timer >= this.typingSpeed) {
        this.timer = 0;
        this.charIndex++;
        this.displayedText = this.text.substring(0, this.charIndex);
      }
    }

    // Advance / Dismiss dialogue with Space, Enter, or E
    if (input.justPressed.slash || input.justPressed.dash || input.keys.block) {
      if (this.charIndex < this.text.length) {
        // Skip typing, show all text
        this.charIndex = this.text.length;
        this.displayedText = this.text;
      } else if (this.options.length > 0) {
        // Execute selected option
        const opt = this.options[this.selectedOption];
        if (opt && opt.action) opt.action();
        this.close();
      } else {
        this.close();
      }
    }
  }

  render(ctx, viewWidth, viewHeight) {
    if (!this.isOpen) return;

    ctx.save();
    const boxW = Math.min(540, viewWidth - 40);
    const boxH = 110;
    const boxX = (viewWidth - boxW) / 2;
    const boxY = viewHeight - boxH - 24;

    // Background & Double Border
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Header badge
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`[ ${this.speaker.toUpperCase()} ]`, boxX + 16, boxY + 12);

    // Dialogue text
    ctx.font = '12px monospace';
    ctx.fillStyle = '#cccccc';

    // Word wrap rendering
    const words = this.displayedText.split(' ');
    let line = '';
    let lineY = boxY + 36;
    const maxLineW = boxW - 32;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineW && i > 0) {
        ctx.fillText(line, boxX + 16, lineY);
        line = words[i] + ' ';
        lineY += 16;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, boxX + 16, lineY);

    // Choice / Dismiss prompt
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#ffffff';
    if (this.options.length > 0 && this.charIndex >= this.text.length) {
      ctx.fillText(`[ Press SPACE to ${this.options[0].label} ]`, boxX + boxW - 16, boxY + boxH - 16);
    } else {
      ctx.fillText('[ Press SPACE to continue ]', boxX + boxW - 16, boxY + boxH - 16);
    }

    ctx.restore();
  }
}

