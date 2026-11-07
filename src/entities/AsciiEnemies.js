// Multi-Line Animated ASCII Enemies
// Cyber Mutants, Hover Drones, and the Cyber Warlord Goliath Boss

import { soundSynth } from '../audio/SoundSynth.js';

export class AsciiEnemy {
  constructor(x, y, type = 'mutant') {
    this.x = x;
    this.y = y;
    this.vx = type === 'mutant' ? -6 : 0;
    this.vy = 0;
    this.type = type; // 'mutant', 'drone', 'warlord'
    this.facing = -1;

    this.maxHp = type === 'warlord' ? 220 : (type === 'drone' ? 25 : 45);
    this.hp = this.maxHp;
    this.damage = type === 'warlord' ? 25 : 15;

    this.patrolLeft = x - 14;
    this.patrolRight = x + 14;
    this.isDead = false;

    this.attackCooldown = 0;
    this.animTimer = 0;
    this.animFrame = 0;
    this.floatTimer = Math.random() * 10;
    this.baseY = y;
  }

  update(dt, player, world, projectiles, particles, damageText) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.type === 'drone') {
      // Hover Drone: floating sine wave
      this.floatTimer += dt * 3;
      this.y = this.baseY + Math.sin(this.floatTimer) * 1.5;
      this.facing = player.x >= this.x ? 1 : -1;

      // Shoot laser bolt
      if (distToPlayer < 35 && this.attackCooldown <= 0 && !player.isDead) {
        this.attackCooldown = 2.4;
        soundSynth.playSwordSlash();
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        projectiles.spawn(this.x + 3, this.y + 1, Math.cos(angle) * 35, Math.sin(angle) * 20, 'laser');
        damageText.add(this.x, this.y - 1, '!LASER!', 'normal');
      }
    } else if (this.type === 'mutant') {
      // Ground Mutant
      if (distToPlayer < 24 && Math.abs(player.y - this.y) < 5) {
        // Chase player
        this.facing = player.x >= this.x ? 1 : -1;
        this.vx = this.facing * 10;

        // Melee hit on contact
        if (distToPlayer < 5 && this.attackCooldown <= 0 && !player.isDead) {
          this.attackCooldown = 1.0;
          player.takeDamage(this.damage, damageText, particles);
        }
      } else {
        // Normal patrol
        if (this.x <= this.patrolLeft) {
          this.vx = 6;
          this.facing = 1;
        } else if (this.x >= this.patrolRight) {
          this.vx = -6;
          this.facing = -1;
        }
      }

      // Physics
      this.x += this.vx * dt;
      this.vy += 45 * dt;
      this.y += this.vy * dt;

      const feetY = this.y + 5;
      const groundY = world.getGroundY(this.x + 3, feetY);
      if (feetY >= groundY && this.vy >= 0) {
        this.y = groundY - 5;
        this.vy = 0;
      }
    } else if (this.type === 'warlord') {
      // Boss Cyber Warlord
      this.facing = player.x >= this.x ? 1 : -1;

      if (distToPlayer < 45) {
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 3.2;
          soundSynth.playBossRoar();

          if (distToPlayer < 12) {
            damageText.add(this.x, this.y - 2, 'TITAN CLEAVE!!', 'crit');
            player.takeDamage(this.damage, damageText, particles);
          } else {
            damageText.add(this.x, this.y - 2, 'PLASMA BURST!', 'crit');
            for (let a = -0.3; a <= 0.3; a += 0.3) {
              const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
              const boltAngle = baseAngle + a;
              projectiles.spawn(this.x + 4, this.y + 2, Math.cos(boltAngle) * 30, Math.sin(boltAngle) * 16, 'laser');
            }
          }
        }
      }
    }
  }

  takeDamage(amount, damageText, particles) {
    if (this.isDead) return;

    this.hp -= amount;
    soundSynth.playHit();

    const isCrit = amount > 25;
    if (damageText) damageText.add(this.x, this.y - 1, isCrit ? `-${amount} CRIT!` : `-${amount}`, isCrit ? 'crit' : 'normal');
    if (particles) particles.emit(this.x, this.y, ['*', '+', 'x']);

    if (this.hp <= 0) {
      this.isDead = true;
      if (this.type === 'warlord') {
        soundSynth.playVictory();
        if (damageText) damageText.add(this.x, this.y - 3, 'WARLORD DESTROYED!!', 'crit');
        if (particles) particles.emit(this.x, this.y, ['★', '█', '*', '+', 'x']);
      } else {
        if (particles) particles.emit(this.x, this.y, ['*', '+', 'x', '†']);
      }
    }
  }

  draw(grid) {
    if (this.isDead) return;

    const col = Math.round(this.x);
    const row = Math.round(this.y);
    const isFlipped = this.facing === -1;

    if (this.type === 'drone') {
      const droneFrames = [
        '  /‾‾‾‾‾\\  ',
        ' <-( O )-> ',
        '  \\_____/  ',
        '   - - -   '
      ];
      grid.drawSprite(col, row, droneFrames, isFlipped, '#ffffff');
    } else if (this.type === 'mutant') {
      const mutantFrames = [
        '   .---.   ',
        '  <[X X]>  ',
        '   /███\\   ',
        '  / ▓▓▓ \\  ',
        '   /   \\   ',
        '  /_   _\\  '
      ];
      grid.drawSprite(col, row, mutantFrames, isFlipped, '#ffffff');

      // Health bar above mutant head
      if (this.hp < this.maxHp) {
        const pct = Math.max(0, this.hp / this.maxHp);
        const barChars = Math.round(pct * 6);
        const bar = '[' + '='.repeat(barChars) + ' '.repeat(6 - barChars) + ']';
        grid.drawString(col, row - 1, bar, '#aaaaaa');
      }
    } else if (this.type === 'warlord') {
      // Boss Goliath
      const warlordFrames = [
        '   .-------.   ',
        '  |[ ██W██ ]|  ',
        ' ==| ▓▓▓▓▓ |==>',
        '  /| █████ |\\  ',
        '   / ║   ║ \\   ',
        '  /__║   ║__\\  '
      ];
      grid.drawSprite(col, row, warlordFrames, isFlipped, '#ffffff');

      // Boss Health Bar
      const pct = Math.max(0, this.hp / this.maxHp);
      const barLen = 14;
      const filled = Math.round(pct * barLen);
      const bar = '╔' + '█'.repeat(filled) + '░'.repeat(barLen - filled) + '╗';
      grid.drawString(col - 1, row - 2, 'WARLORD GOLIATH', '#ffffff');
      grid.drawString(col - 1, row - 1, bar, '#ffffff');
    }
  }
}

