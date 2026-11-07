// Interactive Grazing Sheep AI for Tiny Glyphs
// Cute ASCII sheep that graze, wander, bleat, and react to sword swings

import { soundSynth } from '../audio/SoundSynth.js';

export class Sheep {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 7;
    this.glyph = '{m}';

    this.state = 'GRAZING'; // 'GRAZING', 'WANDERING', 'FLEEING'
    this.stateTimer = 1 + Math.random() * 3;
    this.bleatTimer = 5 + Math.random() * 10;
    this.facing = Math.random() > 0.5 ? 1 : -1;
  }

  update(dt, worldMap, player, damageText, particles) {
    this.stateTimer -= dt;
    this.bleatTimer -= dt;

    // Periodic gentle bleat
    if (this.bleatTimer <= 0) {
      this.bleatTimer = 10 + Math.random() * 15;
      if (Math.hypot(player.x - this.x, player.y - this.y) < 180) {
        soundSynth.playSheepBaa();
        damageText.add(this.x, this.y - 8, 'baa~', 'bleat');
      }
    }

    // Reaction to nearby player combat
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (player.isSlashing && distToPlayer < 45) {
      // Panic and flee!
      this.state = 'FLEEING';
      this.stateTimer = 1.5;
      const angle = Math.atan2(this.y - player.y, this.x - player.x);
      this.vx = Math.cos(angle) * 70;
      this.vy = Math.sin(angle) * 70;
      particles.emitSparks(this.x, this.y, 3, ['!', '·']);
      soundSynth.playSheepBaa();
      damageText.add(this.x, this.y - 10, 'BAA!!', 'bleat');
    }

    if (this.stateTimer <= 0) {
      if (this.state === 'GRAZING') {
        // Switch to wandering
        this.state = 'WANDERING';
        this.stateTimer = 1 + Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 15;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      } else {
        // Settle down to graze
        this.state = 'GRAZING';
        this.stateTimer = 2 + Math.random() * 4;
        this.vx = 0;
        this.vy = 0;
      }
    }

    // Movement & Collision
    if (this.vx !== 0 || this.vy !== 0) {
      const nextX = this.x + this.vx * dt;
      const nextY = this.y + this.vy * dt;

      if (!worldMap.isSolid(nextX, this.y, this.radius)) {
        this.x = nextX;
      } else {
        this.vx = -this.vx * 0.5;
      }

      if (!worldMap.isSolid(this.x, nextY, this.radius)) {
        this.y = nextY;
      } else {
        this.vy = -this.vy * 0.5;
      }

      if (this.vx > 2) this.facing = 1;
      else if (this.vx < -2) this.facing = -1;
    }
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sheep fluff: clean pure white
    ctx.fillStyle = '#ffffff';
    const text = this.facing === 1 ? '{m}' : '{w}';
    ctx.fillText(text, screen.x, screen.y);

    ctx.restore();
  }
}

