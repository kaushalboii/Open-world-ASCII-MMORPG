// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
// Rogue Knights and Spearmen patrolling the island

import { soundSynth } from '../audio/SoundSynth.js';

export class Enemy {
  constructor(x, y, type = 'knight') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.type = type; // 'knight' or 'spearman'
    this.radius = 8;

    this.maxHp = type === 'knight' ? 35 : 25;
    this.hp = this.maxHp;
    this.speed = type === 'knight' ? 65 : 75;
    this.damage = type === 'knight' ? 15 : 12;

    this.state = 'PATROL'; // 'PATROL', 'CHASE', 'WINDUP', 'ATTACK', 'HURT', 'DEAD'
    this.stateTimer = 1 + Math.random() * 2;
    this.attackCooldown = 0;
    this.sightRange = 140;
    this.attackRange = type === 'knight' ? 22 : 32;

    this.facing = 1;
    this.facingAngle = 0;
    this.isDead = false;
    this.lootDropped = false;

    // Visual telegraphing
    this.windupTimer = 0;
  }

  update(dt, player, worldMap, camera, particles, damageText) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    const toPlayerAngle = Math.atan2(player.y - this.y, player.x - this.x);

    // Check line of sight & state transitions
    if (!player.isDead && distToPlayer < this.sightRange) {
      if (distToPlayer <= this.attackRange && this.attackCooldown <= 0) {
        // Begin attack windup
        this.state = 'WINDUP';
        this.windupTimer = 0.35;
        this.vx = 0;
        this.vy = 0;
        this.facingAngle = toPlayerAngle;
      } else if (this.state !== 'WINDUP') {
        this.state = 'CHASE';
        this.facingAngle = toPlayerAngle;
        this.facing = player.x >= this.x ? 1 : -1;
      }
    } else if (this.state === 'CHASE') {
      this.state = 'PATROL';
      this.stateTimer = 1.5;
    }

    // State Execution
    if (this.state === 'WINDUP') {
      this.windupTimer -= dt;
      if (this.windupTimer <= 0) {
        // Execute attack!
        this.state = 'CHASE';
        this.attackCooldown = 1.1;
        soundSynth.playSwordSlash();

        // Check if player is within strike zone
        if (distToPlayer <= this.attackRange + 8 && !player.isDead) {
          player.takeDamage(this.damage, this.x, this.y, camera, damageText, particles);
        }
      }
    } else if (this.state === 'CHASE') {
      // Approach player
      this.vx = Math.cos(toPlayerAngle) * this.speed;
      this.vy = Math.sin(toPlayerAngle) * this.speed;
    } else if (this.state === 'PATROL') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.stateTimer = 2 + Math.random() * 3;
        if (Math.random() < 0.6) {
          const randAngle = Math.random() * Math.PI * 2;
          this.vx = Math.cos(randAngle) * (this.speed * 0.45);
          this.vy = Math.sin(randAngle) * (this.speed * 0.45);
        } else {
          this.vx = 0;
          this.vy = 0;
        }
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

  takeDamage(amount, knockbackAngle, camera, damageText, particles) {
    if (this.isDead) return;

    this.hp -= amount;
    soundSynth.playHit();

    // Floating combat text
    const isCrit = amount > 20;
    damageText.add(this.x, this.y, isCrit ? `-${amount} CRIT!` : `-${amount}`, isCrit ? 'crit' : 'normal');

    // Knockback
    this.x += Math.cos(knockbackAngle) * 14;
    this.y += Math.sin(knockbackAngle) * 14;

    // Sparks
    particles.emitSparks(this.x, this.y, 8, ['*', '+', 'x']);
    camera.addShake(4, 0.15);

    if (this.hp <= 0) {
      this.die(damageText, particles);
    }
  }

  die(damageText, particles) {
    this.isDead = true;
    particles.emitSparks(this.x, this.y, 18, ['*', '+', 'x', '†', '░']);
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screen = camera.worldToScreen(this.x, this.y);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1. Attack Windup Telegraph exclamation mark
    if (this.state === 'WINDUP') {
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('!', screen.x, screen.y - 14);
    }

    // 2. Enemy Body Glyph
    ctx.font = 'bold 15px monospace';
    // Rogue Knight: 'k', Spearman: 'p'
    const glyph = this.type === 'knight' ? 'k' : 'p';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(glyph, screen.x, screen.y);

    // 3. Held weapon
    const weaponX = screen.x + (this.facing === 1 ? 6 : -6);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(this.type === 'knight' ? '/' : '—', weaponX, screen.y - 1);

    // 4. Mini Health bar above head (shows when damaged)
    if (this.hp < this.maxHp) {
      const barW = 16;
      const barH = 3;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#333333';
      ctx.fillRect(screen.x - barW / 2, screen.y - 11, barW, barH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screen.x - barW / 2, screen.y - 11, barW * pct, barH);
    }

    ctx.restore();
  }
}

