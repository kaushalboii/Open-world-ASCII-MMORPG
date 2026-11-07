// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
// Emits high-contrast sparks, smoke puffs, water ripples, and dash afterimages

export class ParticleEngine {
  constructor() {
    this.particles = [];
  }

  emitSparks(x, y, count = 8, glyphs = ['*', '+', '·', 'x']) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        age: 0,
        lifetime: 0.25 + Math.random() * 0.25,
        size: 11 + Math.floor(Math.random() * 4),
        drag: 0.92,
        color: '#ffffff'
      });
    }
  }

  emitSmoke(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: -15 - Math.random() * 10, // Drift upwards from chimney or dust
        glyph: ['o', '·', '~', '°'][Math.floor(Math.random() * 4)],
        age: 0,
        lifetime: 0.8 + Math.random() * 0.4,
        size: 10,
        drag: 0.98,
        color: 'rgba(180, 180, 180, 0.7)'
      });
    }
  }

  emitWaterRipple(x, y) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      glyph: '≈',
      age: 0,
      lifetime: 0.6,
      size: 12,
      drag: 1.0,
      color: 'rgba(120, 120, 120, 0.6)'
    });
  }

  emitDashGhost(x, y, glyph) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      glyph: glyph,
      age: 0,
      lifetime: 0.2,
      size: 16,
      drag: 1.0,
      color: 'rgba(160, 160, 160, 0.5)'
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;

      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx, cameraOrScale) {
    if (this.particles.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of this.particles) {
      let screenX = p.x;
      let screenY = p.y;
      if (cameraOrScale && typeof cameraOrScale.worldToScreen === 'function') {
        const s = cameraOrScale.worldToScreen(p.x, p.y);
        screenX = s.x;
        screenY = s.y;
      } else if (typeof cameraOrScale === 'number') {
        screenX = p.x * cameraOrScale;
        screenY = p.y * cameraOrScale;
      }

      const alpha = Math.max(0, 1 - (p.age / p.lifetime));

      ctx.font = `${p.size}px monospace`;
      ctx.fillStyle = p.color.includes('rgba') ? p.color : `rgba(255, 255, 255, ${alpha})`;
      ctx.fillText(p.glyph, screenX, screenY);
    }

    ctx.restore();
  }
}

