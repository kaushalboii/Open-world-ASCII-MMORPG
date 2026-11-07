// Sprite Fusion Poison VFX & Projectiles in Pure ASCII Character Matrix

import { soundSynth } from '../audio/SoundSynth.js';

export class AsciiPoisonCloud {
  constructor(x, y, radius = 6, duration = 4.5) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.duration = duration;
    this.age = 0;
    this.tickTimer = 0;
    this.isFinished = false;

    // Pattern of swirling ASCII gas glyphs
    this.gasPattern = [
      '    . : * % & % * : .    ',
      '  : % & # @ # & % :  ',
      ' * & # @ @ @ # & * ',
      '  : % & # @ # & % :  ',
      '    . : * % & % * : .    '
    ];
  }

  update(dt, enemies, damageText, particles) {
    this.age += dt;
    this.tickTimer += dt;

    // Periodic poison tick
    if (this.tickTimer >= 0.5) {
      this.tickTimer = 0;
      for (const e of enemies) {
        if (!e.isDead && Math.hypot(e.x - this.x, e.y - this.y) <= this.radius + 2) {
          e.takeDamage(6, damageText, particles);
          damageText.add(e.x, e.y - 1, '-6 POISON', 'normal');
        }
      }
    }

    if (this.age >= this.duration) {
      this.isFinished = true;
    }
  }

  draw(grid) {
    if (this.isFinished) return;

    const startX = Math.round(this.x - 10);
    const startY = Math.round(this.y - 2);

    for (let r = 0; r < this.gasPattern.length; r++) {
      const line = this.gasPattern[r];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch !== ' ') {
          // Slight animation pulse
          const pulse = (c + r + Math.floor(this.age * 8)) % 2 === 0;
          if (pulse) {
            grid.setChar(startX + c, startY + r, ch, '#ffffff', 0.85);
          }
        }
      }
    }
  }
}

export class AsciiProjectiles {
  constructor() {
    this.projectiles = [];
    this.clouds = [];
  }

  spawn(x, y, vx, vy, type = 'poison_flask') {
    this.projectiles.push({
      x,
      y,
      vx,
      vy,
      type,
      age: 0,
      gravity: type === 'poison_flask' ? 45 : 0
    });
  }

  update(dt, world, player, enemies, damageText, particles) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Platform collision
      const groundY = world.getGroundY(p.x, p.y + 1);
      const hitGround = p.y >= groundY;

      if (p.type === 'poison_flask') {
        let hitEnemy = false;
        for (const e of enemies) {
          if (!e.isDead && Math.hypot(e.x - p.x, e.y - p.y) < 5) {
            hitEnemy = true;
            break;
          }
        }

        if (hitGround || hitEnemy) {
          soundSynth.playHit();
          particles.emit(p.x, p.y, ['░', '▒', '▓', '%', '&', '*']);
          this.clouds.push(new AsciiPoisonCloud(p.x, p.y - 1, 6, 5.0));
          this.projectiles.splice(i, 1);
          continue;
        }
      } else if (p.type === 'laser') {
        if (!player.isDead && Math.hypot(player.x - p.x, player.y - p.y) < 3) {
          player.takeDamage(15, damageText, particles);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.age > 4.0 || p.x < 0 || p.x > world.cols) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Poison Clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.update(dt, enemies, damageText, particles);
      if (c.isFinished) {
        this.clouds.splice(i, 1);
      }
    }
  }

  draw(grid) {
    for (const c of this.clouds) {
      c.draw(grid);
    }

    for (const p of this.projectiles) {
      const col = Math.round(p.x);
      const row = Math.round(p.y);
      if (p.type === 'poison_flask') {
        grid.drawString(col, row, '(o)', '#ffffff');
      } else if (p.type === 'laser') {
        grid.drawString(col, row, '───*', '#ffffff');
      }
    }
  }
}
