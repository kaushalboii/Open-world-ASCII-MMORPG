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

  render(ctx, cameraOrScale) {
    if (this.entries.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const e of this.entries) {
      let screenX = e.x;
      let screenY = e.y;
      if (cameraOrScale && typeof cameraOrScale.worldToScreen === 'function') {
        const s = cameraOrScale.worldToScreen(e.x, e.y);
        screenX = s.x;
        screenY = s.y;
      } else if (typeof cameraOrScale === 'number') {
        screenX = e.x * cameraOrScale;
        screenY = e.y * cameraOrScale;
      }

      const alpha = Math.max(0, 1 - (e.age / e.duration));

      if (e.type === 'crit') {
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.fillStyle = `rgba(255, 234, 0, ${alpha})`;
        ctx.fillText(`★ ${e.text} ★`, screenX, screenY);
      } else if (e.type === 'heal') {
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.fillText(e.text, screenX, screenY);
      } else if (e.type === 'bleat') {
        ctx.font = 'italic 12px "Courier New", monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(e.text, screenX, screenY);
      } else if (e.type === 'blocked') {
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = `rgba(180, 180, 180, ${alpha})`;
        ctx.fillText(`<${e.text}>`, screenX, screenY);
      } else {
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(e.text, screenX, screenY);
      }
    }

    ctx.restore();
  }
}

