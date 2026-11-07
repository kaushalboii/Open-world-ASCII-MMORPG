// Pure ASCII Floating Combat Text & Particle Effects

export class AsciiFeedback {
  constructor() {
    this.texts = [];
    this.particles = [];
  }

  add(x, y, text, type = 'normal') {
    this.texts.push({
      x: Math.round(x),
      y: Math.round(y),
      text: String(text),
      type,
      age: 0,
      lifetime: type === 'crit' ? 1.0 : 0.75
    });
  }

  emit(x, y, glyphs = ['*', '+', 'x', '·'], count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 12;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 2,
        y: y + (Math.random() - 0.5) * 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        age: 0,
        lifetime: 0.35 + Math.random() * 0.25
      });
    }
  }

  update(dt) {
    // Update texts
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      t.y -= dt * 3; // Float upwards
      if (t.age >= t.lifetime) {
        this.texts.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 12 * dt; // gravity
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(grid) {
    // Draw particles
    for (const p of this.particles) {
      grid.setChar(Math.round(p.x), Math.round(p.y), p.glyph, '#ffffff', 0.9);
    }

    // Draw floating texts
    for (const t of this.texts) {
      const col = Math.round(t.x);
      const row = Math.round(t.y);
      if (t.type === 'crit') {
        grid.drawString(col - 2, row, `[ ${t.text} ]`, '#ffffff');
      } else {
        grid.drawString(col, row, t.text, '#ffffff');
      }
    }
  }
}

