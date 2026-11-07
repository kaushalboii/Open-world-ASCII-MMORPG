// Sprite Fusion Inspired Pixel & ASCII VFX Engine
// Poison Gas Clouds, Bubbling Toxic Puddles, Poison Status Pulses, and Laser Projectiles

import { soundSynth } from '../audio/SoundSynth.js';

export class PoisonCloud {
  constructor(x, y, radius = 40, duration = 4.5) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.duration = duration;
    this.age = 0;
    this.isFinished = false;
    this.tickTimer = 0;

    // Cluster particles inside the cloud
    this.puffs = [];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (this.radius * 0.7);
      this.puffs.push({
        xOffset: Math.cos(angle) * r,
        yOffset: Math.sin(angle) * r,
        glyph: ['░', '▒', '▓', '%', '&', 'o'][Math.floor(Math.random() * 6)],
        driftSpeed: 5 + Math.random() * 10
      });
    }
  }

  update(dt, enemies, damageText, particles) {
    this.age += dt;
    this.tickTimer += dt;

    // Swirling drift
    for (const puff of this.puffs) {
      puff.yOffset -= dt * puff.driftSpeed;
      if (puff.yOffset < -this.radius) puff.yOffset = this.radius * 0.5;
    }

    // Damage over time (DoT) tick every 0.5s to any enemy inside
    if (this.tickTimer >= 0.5) {
      this.tickTimer = 0;
      for (const e of enemies) {
        if (!e.isDead && Math.hypot(e.x - this.x, e.y - this.y) <= this.radius + e.width / 2) {
          e.takeDamage(7, damageText, particles);
          damageText.add(e.x, e.y - 10, '-7 POISON', 'normal');
        }
      }
    }

    if (this.age >= this.duration) {
      this.isFinished = true;
    }
  }

  render(ctx, camera) {
    if (this.isFinished) return;

    const screen = camera.worldToScreen(this.x, this.y);
    const progress = this.age / this.duration;
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;

    for (const puff of this.puffs) {
      ctx.fillText(puff.glyph, screen.x + puff.xOffset, screen.y + puff.yOffset);
    }

    ctx.restore();
  }
}

export class ProjectileManager {
  constructor() {
    this.projectiles = [];
    this.poisonClouds = [];
  }

  spawn(x, y, vx, vy, type = 'poison_flask') {
    this.projectiles.push({
      x,
      y,
      vx,
      vy,
      type, // 'poison_flask', 'laser'
      age: 0,
      lifetime: 3.0,
      gravity: type === 'poison_flask' ? 800 : 0
    });
  }

  update(dt, level, player, enemies, damageText, particles, camera) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Poison flask trailing smoke
      if (p.type === 'poison_flask' && Math.random() < 0.3) {
        particles.emitSparks(p.x, p.y, 1, ['~', '·', 'o']);
      }

      // Check ground/platform collision
      const groundY = level.getGroundHeight(p.x, p.y + 4, 4);
      const hitGround = p.y >= groundY;

      // Check entity collision
      if (p.type === 'poison_flask') {
        let hitEnemy = false;
        for (const e of enemies) {
          if (!e.isDead && Math.hypot(e.x - p.x, e.y - p.y) < 20) {
            hitEnemy = true;
            break;
          }
        }

        if (hitGround || hitEnemy) {
          // Shatter flask & spawn lingering poison cloud!
          soundSynth.playHit();
          camera.addShake(5, 0.2);
          particles.emitSparks(p.x, p.y, 16, ['░', '▒', '▓', '%', '&', '*']);
          this.poisonClouds.push(new PoisonCloud(p.x, p.y - 15, 45, 5.0));
          this.projectiles.splice(i, 1);
          continue;
        }
      } else if (p.type === 'laser') {
        // Laser hits player
        if (!player.isDead && Math.hypot(player.x - p.x, player.y - p.y) < 18) {
          player.takeDamage(15, camera, damageText, particles);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.age >= p.lifetime) {
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Poison Clouds
    for (let i = this.poisonClouds.length - 1; i >= 0; i--) {
      const cloud = this.poisonClouds[i];
      cloud.update(dt, enemies, damageText, particles);
      if (cloud.isFinished) {
        this.poisonClouds.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    // 1. Render Poison Clouds
    for (const cloud of this.poisonClouds) {
      cloud.render(ctx, camera);
    }

    // 2. Render Projectiles
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of this.projectiles) {
      const screen = camera.worldToScreen(p.x, p.y);
      if (p.type === 'poison_flask') {
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('(o)', screen.x, screen.y);
      } else if (p.type === 'laser') {
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('───*', screen.x, screen.y);
      }
    }

    ctx.restore();
  }
}
