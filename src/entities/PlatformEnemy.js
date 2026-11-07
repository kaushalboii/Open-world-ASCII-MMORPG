// 2D Side-Scrolling Action Platformer Enemies in ASCII
// Blight Mutants, Hover Drones, and Ancient Colossus Titan Boss

import { soundSynth } from '../audio/SoundSynth.js';

export class PlatformEnemy {
  constructor(x, y, type = 'mutant') {
    this.x = x;
    this.y = y;
    this.vx = type === 'mutant' ? -50 : 0;
    this.vy = 0;
    this.type = type; // 'mutant', 'drone', 'warlord'
    this.width = type === 'warlord' ? 38 : 22;
    this.height = type === 'warlord' ? 44 : 30;

    this.maxHp = type === 'warlord' ? 250 : (type === 'drone' ? 25 : 45);
    this.hp = this.maxHp;
    this.damage = type === 'warlord' ? 25 : 15;

    this.facing = -1;
    this.patrolLeft = x - 120;
    this.patrolRight = x + 120;
    this.isDead = false;

    // AI timers
    this.attackCooldown = 0;
    this.floatTimer = Math.random() * 10;
    this.baseY = y;
  }

  update(dt, player, level, particles, damageText, camera, spawnProjectile) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.type === 'drone') {
      // Hover Drone: floating sine-wave motion
      this.floatTimer += dt * 3;
      this.y = this.baseY + Math.sin(this.floatTimer) * 20;

      // Face player
      this.facing = player.x >= this.x ? 1 : -1;

      // Shoot laser bolt at player
      if (distToPlayer < 280 && this.attackCooldown <= 0 && !player.isDead) {
        this.attackCooldown = 2.2;
        soundSynth.playSwordSlash();
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        spawnProjectile(this.x, this.y, Math.cos(angle) * 260, Math.sin(angle) * 260, 'laser');
        damageText.add(this.x, this.y - 14, '!FIRE!', 'normal');
      }
    } else if (this.type === 'mutant') {
      // Ground Mutant: patrols or chases
      if (distToPlayer < 180 && Math.abs(player.y - this.y) < 60) {
        // Chase player
        this.facing = player.x >= this.x ? 1 : -1;
        this.vx = this.facing * 90;

        // Melee strike on contact
        if (distToPlayer < 24 && this.attackCooldown <= 0 && !player.isDead) {
          this.attackCooldown = 1.0;
          player.takeDamage(this.damage, camera, damageText, particles);
        }
      } else {
        // Normal patrol
        if (this.x <= this.patrolLeft) {
          this.vx = 50;
          this.facing = 1;
        } else if (this.x >= this.patrolRight) {
          this.vx = -50;
          this.facing = -1;
        }
      }

      // Physics
      this.x += this.vx * dt;
      this.vy += 1000 * dt;
      this.y += this.vy * dt;

      // Ground collision
      const feetY = this.y + this.height / 2;
      const groundY = level.getGroundHeight(this.x, feetY, this.width / 2);
      if (feetY >= groundY && this.vy >= 0) {
        this.y = groundY - this.height / 2;
        this.vy = 0;
      }
    } else if (this.type === 'warlord') {
      // Boss: Ancient Colossus Titan
      this.facing = player.x >= this.x ? 1 : -1;

      if (distToPlayer < 350) {
        if (this.attackCooldown <= 0) {
          // Choose attack: leap smash or projectile burst
          this.attackCooldown = 3.0;
          soundSynth.playBossRoar();
          camera.addShake(8, 0.3);

          if (distToPlayer < 100) {
            // Cleave
            damageText.add(this.x, this.y - 25, 'TITAN CLEAVE!!', 'crit');
            player.takeDamage(this.damage, camera, damageText, particles);
          } else {
            // Fire plasma spread
            damageText.add(this.x, this.y - 25, 'PLASMA VOLLEY!', 'crit');
            for (let a = -0.3; a <= 0.3; a += 0.3) {
              const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
              const boltAngle = baseAngle + a;
              spawnProjectile(this.x, this.y, Math.cos(boltAngle) * 220, Math.sin(boltAngle) * 220, 'laser');
            }
          }
        }
      }

      // Physics
      this.vy += 1000 * dt;
      this.y += this.vy * dt;
      const feetY = this.y + this.height / 2;
      const groundY = level.getGroundHeight(this.x, feetY, this.width / 2);
      if (feetY >= groundY && this.vy >= 0) {
        this.y = groundY - this.height / 2;
        this.vy = 0;
      }
    }
  }

  takeDamage(amount, damageText, particles, camera) {
    if (this.isDead) return;

    this.hp -= amount;
    soundSynth.playHit();

    const isCrit = amount > 25;
    if (damageText) damageText.add(this.x, this.y - 12, isCrit ? `-${amount} CRIT!` : `-${amount}`, isCrit ? 'crit' : 'normal');
    if (particles) particles.emitSparks(this.x, this.y, 8, ['*', '+', 'x']);
    if (camera) camera.addShake(4, 0.15);

    // Slight knockback
    this.x -= this.facing * 12;

    if (this.hp <= 0) {
      this.isDead = true;
      if (this.type === 'warlord') {
        soundSynth.playVictory();
        if (damageText) damageText.add(this.x, this.y - 24, 'WARLORD DESTROYED!!', 'crit');
        if (particles) particles.emitSparks(this.x, this.y, 35, ['★', '█', '*', '+', 'x']);
      } else {
        if (particles) particles.emitSparks(this.x, this.y, 16, ['*', '+', 'x', '†']);
      }
    }
  }

  render(ctx, camera) {
    if (this.isDead) return;

    const screen = camera.worldToScreen(this.x, this.y);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffffff';

    if (this.type === 'drone') {
      // Hover Drone ASCII art
      ctx.fillText('<(O)>', screen.x, screen.y);
      ctx.fillStyle = '#666666';
      ctx.fillText(' - - ', screen.x, screen.y + 10);
    } else if (this.type === 'mutant') {
      // Blight Mutant ASCII art
      const f = this.facing === 1;
      ctx.fillText(f ? ' [X] ' : ' [X] ', screen.x, screen.y - 10);
      ctx.fillText(f ? '/|▓▓|>' : '<|▓▓|\\', screen.x, screen.y);
      ctx.fillText('  / \\ ', screen.x, screen.y + 10);
    } else if (this.type === 'warlord') {
      // Boss Warlord Goliath
      ctx.font = 'bold 15px monospace';
      ctx.fillText(' [██W██] ', screen.x, screen.y - 16);
      ctx.fillText('==|▓▓▓▓|==', screen.x, screen.y);
      ctx.fillText('  / ║ ║ \\ ', screen.x, screen.y + 16);

      // Boss HP Bar above head
      const barW = 60;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#222222';
      ctx.fillRect(screen.x - barW / 2, screen.y - 32, barW, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screen.x - barW / 2, screen.y - 32, barW * pct, 4);
    }

    ctx.restore();
  }
}

