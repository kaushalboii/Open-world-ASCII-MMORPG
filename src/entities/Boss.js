// Epic Boss Encounter: Lord Malakor the Warlord
// Features Ground Stomp Shockwaves, Massive Cleave, and Boss Health Bar

import { soundSynth } from '../audio/SoundSynth.js';

export class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 16;
    this.glyph = '[W]';

    this.maxHp = 220;
    this.hp = this.maxHp;
    this.speed = 52;
    this.damage = 25;

    this.state = 'PATROL'; // 'PATROL', 'CHASE', 'WINDUP', 'STOMP', 'CLEAVE', 'DEAD'
    this.stateTimer = 2;
    this.attackCooldown = 0;
    this.stompCooldown = 5;
    this.sightRange = 220;

    this.facing = 1;
    this.facingAngle = 0;
    this.isDead = false;
    this.hasRoared = false;

    // Shockwave particles emitted during stomp
    this.shockwaves = []; // { x, y, radius, maxRadius, speed, dealtDamage }
  }

  update(dt, player, worldMap, camera, particles, damageText) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.stompCooldown > 0) this.stompCooldown -= dt;

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    const toPlayerAngle = Math.atan2(player.y - this.y, player.x - this.x);

    // Roar when first sighting player
    if (!this.hasRoared && distToPlayer < this.sightRange) {
      this.hasRoared = true;
      soundSynth.playBossRoar();
      camera.addShake(10, 0.4);
      damageText.add(this.x, this.y - 16, 'WARLORD AWAKENS!', 'crit');
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;

      // Check player collision with expanding shockwave ring
      const distFromCenter = Math.hypot(player.x - sw.x, player.y - sw.y);
      if (!sw.dealtDamage && Math.abs(distFromCenter - sw.radius) < 14) {
        if (!player.isDashing) {
          sw.dealtDamage = true;
          player.takeDamage(18, sw.x, sw.y, camera, damageText, particles);
        }
      }

      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // AI Decision Making
    if (!player.isDead && distToPlayer < this.sightRange) {
      this.facingAngle = toPlayerAngle;
      this.facing = player.x >= this.x ? 1 : -1;

      // Special Ability: Ground Stomp Shockwave
      if (this.stompCooldown <= 0 && distToPlayer < 120) {
        this.executeStomp(camera, particles, damageText);
        return;
      }

      // Normal Melee Cleave
      if (distToPlayer <= 32 && this.attackCooldown <= 0) {
        this.state = 'WINDUP';
        this.stateTimer = 0.4;
        this.vx = 0;
        this.vy = 0;
      } else if (this.state !== 'WINDUP') {
        this.state = 'CHASE';
        this.vx = Math.cos(toPlayerAngle) * this.speed;
        this.vy = Math.sin(toPlayerAngle) * this.speed;
      }
    } else {
      this.state = 'PATROL';
    }

    // Windup & Strike
    if (this.state === 'WINDUP') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'CHASE';
        this.attackCooldown = 1.4;
        soundSynth.playSwordSlash();
        camera.addShake(5, 0.2);

        if (distToPlayer <= 38 && !player.isDead) {
          player.takeDamage(this.damage, this.x, this.y, camera, damageText, particles);
        }
      }
    }

    // Movement & Collision
    if (this.vx !== 0 || this.vy !== 0) {
      const nextX = this.x + this.vx * dt;
      const nextY = this.y + this.vy * dt;

      if (!worldMap.isSolid(nextX, this.y, this.radius)) this.x = nextX;
      if (!worldMap.isSolid(this.x, nextY, this.radius)) this.y = nextY;
    }
  }

  executeStomp(camera, particles, damageText) {
    this.stompCooldown = 7.0;
    this.attackCooldown = 1.0;
    this.vx = 0;
    this.vy = 0;

    soundSynth.playBossRoar();
    camera.addShake(12, 0.5);
    damageText.add(this.x, this.y - 18, 'GROUND STOMP!!', 'crit');
    particles.emitSparks(this.x, this.y, 24, ['≈', '░', '*', '+', 'x']);

    this.shockwaves.push({
      x: this.x,
      y: this.y,
      radius: 12,
      maxRadius: 110,
      speed: 130,
      dealtDamage: false
    });
  }

  takeDamage(amount, knockbackAngle, camera, damageText, particles) {
    if (this.isDead) return;

    this.hp -= amount;
    soundSynth.playHit();
    damageText.add(this.x, this.y, `-${amount}`, amount > 25 ? 'crit' : 'normal');

    // Boss has heavy poise (minimal knockback)
    this.x += Math.cos(knockbackAngle) * 4;
    this.y += Math.sin(knockbackAngle) * 4;

    particles.emitSparks(this.x, this.y, 10, ['*', '+', 'x']);
    camera.addShake(6, 0.2);

    if (this.hp <= 0) {
      this.die(damageText, particles);
    }
  }

  die(damageText, particles) {
    this.isDead = true;
    soundSynth.playVictory();
    damageText.add(this.x, this.y, 'WARLORD DEFEATED!!', 'crit');
    particles.emitSparks(this.x, this.y, 35, ['*', '+', 'x', '†', '★', '█']);
  }

  render(ctx, camera) {
    if (this.isDead) return;

    // 1. Render Shockwave Rings
    for (const sw of this.shockwaves) {
      const screen = camera.worldToScreen(sw.x, sw.y);
      const alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Shockwave glyph ring
      ctx.font = '10px monospace';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillText('≈', screen.x + Math.cos(a) * sw.radius, screen.y + Math.sin(a) * sw.radius);
      }
      ctx.restore();
    }

    const screen = camera.worldToScreen(this.x, this.y);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 2. Boss Body: Bold & Massive
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.glyph, screen.x, screen.y);

    // 3. Held Greatsword
    const swordX = screen.x + (this.facing === 1 ? 14 : -14);
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('═|>', swordX, screen.y - 2);

    // 4. Attack Telegraph
    if (this.state === 'WINDUP') {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('[!]', screen.x, screen.y - 22);
    }

    ctx.restore();
  }

  renderBossBar(ctx, viewWidth) {
    if (this.isDead || !this.hasRoared) return;

    ctx.save();
    const barW = 320;
    const barH = 16;
    const barX = (viewWidth - barW) / 2;
    const barY = 24;

    // Background container
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(barX - 4, barY - 18, barW + 8, barH + 26);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 4, barY - 18, barW + 8, barH + 26);

    // Title
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('† LORD MALAKOR THE WARLORD †', viewWidth / 2, barY - 6);

    // Fill Bar
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#222222';
    ctx.fillRect(barX, barY + 2, barW, barH - 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX, barY + 2, barW * pct, barH - 4);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${Math.max(0, this.hp)} / ${this.maxHp} HP`, viewWidth / 2, barY + 9);

    ctx.restore();
  }
}

