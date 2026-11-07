// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
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

      if (worldMap && typeof worldMap.isSolid === 'function') {
        if (!worldMap.isSolid(nextX, this.y, this.radius)) this.x = nextX;
        else this.vx = -this.vx * 0.5;

        if (!worldMap.isSolid(this.x, nextY, this.radius)) this.y = nextY;
        else this.vy = -this.vy * 0.5;
      } else {
        // Platform world bounds
        this.x = Math.max(16, Math.min(304, nextX));
        if (worldMap && worldMap.groundY) {
          this.y = Math.min(worldMap.groundY, nextY);
        }
      }

      if (this.vx > 2) this.facing = 1;
      else if (this.vx < -2) this.facing = -1;
    }
  }

  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;
    const bx = Math.round(this.x);
    const by = Math.round(this.y);

    const fluffCol = theme === 'bw' ? 0xffffffff : 0xffe8e8f0;
    const faceCol = theme === 'bw' ? 0xff444444 : 0xff302830;

    // 8x6 cute fluffy sheep body
    for (let dy = -5; dy <= 0; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const px = bx + dx;
        const py = by + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const isFace = (this.facing === 1 && dx >= 2 && dy <= -2) || (this.facing === -1 && dx <= -2 && dy <= -2);
          frame.color[py * W + px] = isFace ? faceCol : fluffCol;
        }
      }
    }
  }

  render(ctx, cameraOrScale) {
    let screenX = this.x;
    let screenY = this.y;

    if (cameraOrScale && typeof cameraOrScale.worldToScreen === 'function') {
      const s = cameraOrScale.worldToScreen(this.x, this.y);
      screenX = s.x;
      screenY = s.y;
    } else if (typeof cameraOrScale === 'number') {
      screenX = this.x * cameraOrScale;
      screenY = this.y * cameraOrScale;
    }

    ctx.save();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    const text = this.facing === 1 ? '{m}' : '{w}';
    ctx.fillText(text, screenX, screenY);

    ctx.restore();
  }
}

