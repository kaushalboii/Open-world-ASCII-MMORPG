// Floating Combat Text in Black & White ASCII
// Renders dynamic damage numbers, crits, blocks, and item pickups

export class DamageTextManager {
  constructor() {
    this.entries = [];
  }

  add(x, y, text, type = 'normal') {
    // types: 'normal' (-12), 'crit' (CRIT!), 'blocked' (BLOCK), 'heal' (+10), 'gold' (+$5), 'bleat' (Baa!)
    this.entries.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y - 6,
      text: String(text),
      type: type,
      vx: (Math.random() - 0.5) * 15,
      vy: -35 - Math.random() * 15, // Ascend upward
      age: 0,
      duration: type === 'crit' ? 1.0 : 0.75,
      color: type === 'heal' ? '#ffffff' : (type === 'blocked' ? '#aaaaaa' : '#ffffff')
    });
  }

  update(dt) {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      e.age += dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 30 * dt; // Slight deceleration / gravity arch

      if (e.age >= e.duration) {
        this.entries.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    if (this.entries.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const e of this.entries) {
      const screen = camera.worldToScreen(e.x, e.y);
      const alpha = Math.max(0, 1 - (e.age / e.duration));

      if (e.type === 'crit') {
        ctx.font = 'bold 15px monospace';
        // Inverted black text with white backing or bold white text with brackets
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(`[${e.text}]`, screen.x, screen.y);
      } else if (e.type === 'blocked') {
        ctx.font = '12px monospace';
        ctx.fillStyle = `rgba(180, 180, 180, ${alpha})`;
        ctx.fillText(`<${e.text}>`, screen.x, screen.y);
      } else {
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(e.text, screen.x, screen.y);
      }
    }

    ctx.restore();
  }
}

