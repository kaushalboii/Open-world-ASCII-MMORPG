// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
// Movement, 360-degree Sword Slash, Shield Block, and Dash

import { SlashArc } from '../combat/SlashArc.js';
import { soundSynth } from '../audio/SoundSynth.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 8;

    this.maxHp = 100;
    this.hp = 100;
    this.gold = 0;
    this.kills = 0;

    this.speed = 115;
    this.facingAngle = 0; // Radians
    this.facing = 1; // 1 = right, -1 = left

    // Combat states
    this.isSlashing = false;
    this.slashTimer = 0;
    this.slashCooldown = 0;
    this.activeSlashArc = null;

    // Dash
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashSpeed = 270;
    this.dashVx = 0;
    this.dashVy = 0;

    // Block
    this.isBlocking = false;

    // Hurt / Invulnerability
    this.invulnTimer = 0;
    this.isDead = false;
  }

  update(dt, input, worldMap, camera, particles, damageText) {
    if (this.isDead) return;

    // Cooldown timers
    if (this.slashCooldown > 0) this.slashCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // 1. Aiming angle relative to screen center / mouse position
    const screenPos = camera.worldToScreen(this.x, this.y);
    const mouseDx = input.mouse.x - screenPos.x;
    const mouseDy = input.mouse.y - screenPos.y;
    if (Math.hypot(mouseDx, mouseDy) > 10) {
      this.facingAngle = Math.atan2(mouseDy, mouseDx);
      this.facing = mouseDx >= 0 ? 1 : -1;
    }

    // 2. Shield Block state
    this.isBlocking = input.keys.block && !this.isDashing;

    // 3. Dash / Dodge handling
    if (this.isDashing) {
      this.dashTimer -= dt;
      particles.emitDashGhost(this.x, this.y, '@');

      const nextX = this.x + this.dashVx * dt;
      const nextY = this.y + this.dashVy * dt;

      if (!worldMap.isSolid(nextX, this.y, this.radius)) this.x = nextX;
      if (!worldMap.isSolid(this.x, nextY, this.radius)) this.y = nextY;

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
      return; // Skip normal movement while dashing
    }

    // Trigger dash
    if (input.justPressed.dash && this.dashCooldown <= 0) {
      const { dx, dy } = input.getMovementVector();
      let dirX = dx;
      let dirY = dy;
      if (dirX === 0 && dirY === 0) {
        dirX = Math.cos(this.facingAngle);
        dirY = Math.sin(this.facingAngle);
      }
      this.isDashing = true;
      this.dashTimer = 0.16;
      this.dashCooldown = 0.7;
      this.dashVx = dirX * this.dashSpeed;
      this.dashVy = dirY * this.dashSpeed;
      soundSynth.playDash();
      return;
    }

    // 4. Sword Slash attack
    if (this.isSlashing) {
      this.slashTimer -= dt;
      if (this.activeSlashArc) {
        this.activeSlashArc.update(dt, this.x, this.y);
      }
      if (this.slashTimer <= 0) {
        this.isSlashing = false;
        this.activeSlashArc = null;
      }
    }

    if (input.justPressed.slash && this.slashCooldown <= 0 && !this.isBlocking) {
      this.isSlashing = true;
      this.slashTimer = 0.18;
      this.slashCooldown = 0.28;
      this.activeSlashArc = new SlashArc(this.x, this.y, this.facingAngle, 26);
      soundSynth.playSwordSlash();
    }

    // 5. Standard 8-directional movement
    const { dx, dy } = input.getMovementVector();
    let moveSpeed = this.speed;
    if (this.isBlocking) moveSpeed *= 0.4; // Slower while holding shield

    this.vx = dx * moveSpeed;
    this.vy = dy * moveSpeed;

    if (dx !== 0 && Math.hypot(mouseDx, mouseDy) <= 10) {
      this.facing = dx > 0 ? 1 : -1;
      this.facingAngle = Math.atan2(dy, dx);
    }

    // Collision with world geometry
    if (this.vx !== 0 || this.vy !== 0) {
      const nextX = this.x + this.vx * dt;
      const nextY = this.y + this.vy * dt;

      if (!worldMap.isSolid(nextX, this.y, this.radius)) {
        this.x = nextX;
      }
      if (!worldMap.isSolid(this.x, nextY, this.radius)) {
        this.y = nextY;
      }

      // Footstep particles on grass
      if (Math.random() < 0.12) {
        particles.emitSparks(this.x, this.y + 4, 1, ['·']);
      }
    }
  }

  takeDamage(amount, fromX, fromY, camera, damageText, particles) {
    if (this.isDead || this.isDashing || this.invulnTimer > 0) return;

    if (this.isBlocking) {
      // Check if facing the attack
      const toSource = Math.atan2(fromY - this.y, fromX - this.x);
      let diff = Math.abs(toSource - this.facingAngle);
      while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

      if (diff < Math.PI * 0.6) {
        // Block successful!
        soundSynth.playClank();
        damageText.add(this.x, this.y, 'BLOCKED', 'blocked');
        particles.emitSparks(this.x, this.y, 6, ['*', '+', 'x']);
        camera.addShake(2, 0.1);
        return;
      }
    }

    // Normal damage
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = 0.6;
    damageText.add(this.x, this.y, `-${amount}`, 'normal');
    soundSynth.playPlayerHurt();
    camera.addShake(8, 0.25);
    particles.emitSparks(this.x, this.y, 10, ['*', 'x', '!']);

    if (this.hp <= 0) {
      this.isDead = true;
      soundSynth.playGameOver();
    }
  }

  heal(amount, damageText) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    damageText.add(this.x, this.y, `+${amount} HP`, 'heal');
  }

  addGold(amount, damageText) {
    this.gold += amount;
    soundSynth.playCoin();
    damageText.add(this.x, this.y, `+$${amount}`, 'gold');
  }

  render(ctx, camera) {
    const screen = camera.worldToScreen(this.x, this.y);

    // Blinking effect during invulnerability
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Draw Knight Body
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffffff';

    if (this.isDead) {
      ctx.fillText('†', screen.x, screen.y);
      ctx.restore();
      return;
    }

    // Player Knight Glyph
    ctx.fillText('@', screen.x, screen.y);

    // 2. Shield (if blocking)
    if (this.isBlocking) {
      const shieldX = screen.x + Math.cos(this.facingAngle) * 9;
      const shieldY = screen.y + Math.sin(this.facingAngle) * 9;
      ctx.font = '12px monospace';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('[#]', shieldX, shieldY);
    } else {
      // 3. Held Sword indicator when idle
      const swordX = screen.x + Math.cos(this.facingAngle + 0.5) * 8;
      const swordY = screen.y + Math.sin(this.facingAngle + 0.5) * 8;
      ctx.font = '11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('/', swordX, swordY);
    }

    ctx.restore();

    // Render active slash arc if swinging
    if (this.activeSlashArc) {
      this.activeSlashArc.render(ctx, camera);
    }
  }
}

