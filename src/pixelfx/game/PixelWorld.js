// PixelWorld: Arcade Run & Gun Platformer World with Bouncy Loot Drops,
// Mario-style Enemy Head-Stomping, Mystery Question Blocks, and Boss Mechs!

import { createFx, createFrame, clearFrame, composite } from '../core/index.js';
import * as poisonCloudMod from '../fx/nature/poison-cloud.js';
import * as critHitMod from '../fx/impacts/crit-hit.js';
import * as barrelExplosionMod from '../fx/explosions/barrel-explosion.js';
import * as coinSpinMod from '../fx/pickups/coin-spin.js';
import * as xpOrbMod from '../fx/pickups/xp-orb.js';
import * as heartPickupMod from '../fx/pickups/heart-pickup.js';
import * as powerStarMod from '../fx/pickups/power-star.js';
import * as chestOpenMod from '../fx/pickups/chest-open.js';

export class LootDrop {
  constructor(x, y, type = 'coin', value = 10) {
    this.x = x;
    this.y = y;
    this.type = type; // 'coin', 'xp', 'heart', 'star'
    this.value = value;
    this.vx = (Math.random() - 0.5) * 120;
    this.vy = -120 - Math.random() * 80; // Bouncy pop upward
    this.life = 15.0; // Despawn after 15s
    this.isCollected = false;
  }

  update(dt, playerX, playerY, magnetRadius, world) {
    if (this.isCollected) return;
    this.life -= dt;

    // Magnet physics: accelerate towards player if within radius
    const dist = Math.hypot(playerX - this.x, playerY - this.y);
    if (dist <= magnetRadius) {
      const angle = Math.atan2(playerY - 20 - this.y, playerX - this.x);
      const magnetSpeed = Math.min(380, 200 + (magnetRadius - dist) * 4);
      this.vx = Math.cos(angle) * magnetSpeed;
      this.vy = Math.sin(angle) * magnetSpeed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    // Normal bounce physics
    this.vy += 500 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform bounce
    if (this.y >= world.groundY) {
      this.y = world.groundY;
      this.vy = -this.vy * 0.45;
      this.vx *= 0.8;
      if (Math.abs(this.vy) < 20) this.vy = 0;
    }
  }

  draw(frame, theme = 'color') {
    if (this.isCollected) return;
    const W = frame.w;
    const H = frame.h;
    const px = Math.round(this.x);
    const py = Math.round(this.y);

    let color = 0xfff0b424; // Gold coin
    let glow = 0xfff0b424;

    if (this.type === 'xp') {
      color = 0xff8cd024; // Green XP orb
      glow = 0xff8cd024;
    } else if (this.type === 'heart') {
      color = 0xffff3366; // Red heart
      glow = 0xffff3366;
    } else if (this.type === 'star') {
      color = 0xffffff00; // Yellow star
      glow = 0xffffffff;
    }

    if (theme === 'bw') {
      color = 0xffffffff;
      glow = 0xffffffff;
    } else if (theme === 'green') {
      color = 0xff20ff80;
      glow = 0xff20ff80;
    }

    // Render 3x3 glowing diamond/cross
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const sx = px + dx;
        const sy = py + dy;
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) {
          const idx = sy * W + sx;
          frame.color[idx] = color;
          frame.light[idx] = glow; // Additive shine
        }
      }
    }
  }
}

export class QuestionBlock {
  constructor(x, y, lootType = 'coin') {
    this.x = x;
    this.y = y;
    this.lootType = lootType;
    this.hit = false;
    this.bumpOffset = 0;
  }

  update(dt) {
    if (this.bumpOffset > 0) {
      this.bumpOffset = Math.max(0, this.bumpOffset - 25 * dt);
    }
  }

  bump(world) {
    if (this.hit) return;
    this.hit = true;
    this.bumpOffset = 6;

    // Shower loot upward
    for (let i = 0; i < 4; i++) {
      world.lootDrops.push(new LootDrop(this.x + (i - 1.5) * 6, this.y - 12, 'coin', 20));
    }
    world.lootDrops.push(new LootDrop(this.x, this.y - 16, 'xp', 35));
    if (Math.random() < 0.4) {
      world.lootDrops.push(new LootDrop(this.x + 8, this.y - 18, 'heart', 30));
    }
  }

  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;
    const bx = Math.round(this.x) - 7;
    const by = Math.round(this.y - this.bumpOffset) - 14;

    const blockCol = this.hit ? 0xff403848 : theme === 'bw' ? 0xffffffff : 0xffe6a817;
    const innerCol = this.hit ? 0xff201c24 : theme === 'bw' ? 0xff000000 : 0xffa07010;

    for (let dy = 0; dy < 14; dy++) {
      for (let dx = 0; dx < 14; dx++) {
        const px = bx + dx;
        const py = by + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const isBorder = dx === 0 || dx === 13 || dy === 0 || dy === 13;
          frame.color[py * W + px] = isBorder ? blockCol : innerCol;
        }
      }
    }
  }
}

export class PixelEnemy {
  constructor(x, y, type = 'slime') {
    this.x = x;
    this.y = y;
    this.type = type; // 'slime', 'mutant', 'drone', 'warlord'
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.isDead = false;
    this.hitFlashTimer = 0;
    this.poisonTimer = 0;

    if (type === 'warlord') {
      this.hp = 350;
      this.maxHp = 350;
      this.speed = 40;
      this.width = 28;
      this.height = 42;
    } else if (type === 'drone') {
      this.hp = 45;
      this.maxHp = 45;
      this.speed = 65;
      this.width = 18;
      this.height = 18;
      this.baseY = y;
    } else if (type === 'mutant') {
      this.hp = 65;
      this.maxHp = 65;
      this.speed = 52;
      this.width = 18;
      this.height = 28;
    } else {
      // Mario-style Cyber Slime / Goomba
      this.hp = 35;
      this.maxHp = 35;
      this.speed = 45;
      this.width = 16;
      this.height = 16;
    }
  }

  update(dt, playerX, playerY, world) {
    if (this.isDead) return;

    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.takeDamage(12 * dt, false);
    }

    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
    this.facing = playerX > this.x ? 1 : -1;

    if (this.type === 'drone') {
      if (distToPlayer < 240) {
        this.x += this.facing * this.speed * dt;
        this.y = this.baseY + Math.sin(performance.now() * 0.005) * 10;
      }
    } else {
      // Ground AI
      if (distToPlayer < 220) {
        this.x += this.facing * this.speed * dt;
      }
      this.vy += 700 * dt;
      this.y += this.vy * dt;
      if (this.y > world.groundY) {
        this.y = world.groundY;
        this.vy = 0;
      }
    }
  }

  takeDamage(amount, showFlash = true) {
    this.hp -= amount;
    if (showFlash) this.hitFlashTimer = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
  }

  draw(frame, theme = 'color') {
    if (this.isDead) return;

    const W = frame.w;
    const H = frame.h;
    const bx = Math.round(this.x);
    const by = Math.round(this.y);
    const flash = this.hitFlashTimer > 0;
    const poisoned = this.poisonTimer > 0;

    let baseColor = 0xff40b050; // Slime green
    if (this.type === 'mutant') baseColor = 0xffc04040;
    if (this.type === 'warlord') baseColor = 0xff7020b0;
    if (this.type === 'drone') baseColor = 0xffd0a020;

    if (poisoned) baseColor = 0xff30a030;
    if (flash) baseColor = 0xffffffff;

    if (theme === 'bw') {
      baseColor = flash ? 0xffffffff : 0xffcccccc;
    } else if (theme === 'green') {
      baseColor = flash ? 0xffffffff : 0xff30d060;
    }

    const hw = Math.floor(this.width / 2);
    const h = this.height;

    for (let dy = 0; dy < h; dy++) {
      for (let dx = -hw; dx <= hw; dx++) {
        const px = bx + dx;
        const py = by - h + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const isEdge = dx === -hw || dx === hw || dy === 0 || dy === h - 1;
          frame.color[py * W + px] = isEdge ? 0xff100c14 : baseColor;
        }
      }
    }

    // Health Bar
    const barWidth = 22;
    const barX = bx - 11;
    const barY = by - h - 5;
    const hpRatio = this.hp / this.maxHp;

    for (let x = 0; x < barWidth; x++) {
      const px = barX + x;
      if (px >= 0 && px < W && barY >= 0 && barY < H) {
        const fill = x < barWidth * hpRatio;
        frame.color[barY * W + px] = fill ? (theme === 'bw' ? 0xffffffff : 0xff20e040) : 0xff301010;
      }
    }
  }
}

export class PixelWorld {
  constructor(stageWidth = 320, stageHeight = 180) {
    this.w = stageWidth;
    this.h = stageHeight;
    this.groundY = 148;

    // Platforms
    this.platforms = [
      { x1: 0, x2: 320, y: 148, isFloor: true },
      { x1: 45, x2: 110, y: 114 },
      { x1: 135, x2: 195, y: 84 },
      { x1: 215, x2: 295, y: 114 },
      { x1: 95, x2: 165, y: 56 },
    ];

    // Mystery Question Blocks (Mario style)
    this.questionBlocks = [
      new QuestionBlock(75, 114),
      new QuestionBlock(165, 84),
      new QuestionBlock(255, 114),
      new QuestionBlock(130, 56),
    ];

    this.enemies = [
      new PixelEnemy(85, 114, 'slime'),
      new PixelEnemy(170, 84, 'drone'),
      new PixelEnemy(245, 114, 'mutant'),
      new PixelEnemy(140, 56, 'slime'),
      new PixelEnemy(285, 148, 'warlord'), // Boss Goliath Mech
    ];

    // Bouncy Loot Drops (Coins, XP Orbs, Hearts, Stars)
    this.lootDrops = [];
    this.activeFx = [];
    this.floatingTexts = [];
  }

  // Spawn loot shower when enemy dies
  spawnLoot(x, y, enemyType) {
    const coinCount = enemyType === 'warlord' ? 12 : enemyType === 'mutant' ? 4 : 2;
    const xpCount = enemyType === 'warlord' ? 8 : enemyType === 'drone' ? 4 : 2;

    for (let i = 0; i < coinCount; i++) {
      this.lootDrops.push(new LootDrop(x, y - 10, 'coin', 15));
    }
    for (let i = 0; i < xpCount; i++) {
      this.lootDrops.push(new LootDrop(x, y - 12, 'xp', 25));
    }

    // Chance for heart pickup
    if (Math.random() < 0.35 || enemyType === 'warlord') {
      this.lootDrops.push(new LootDrop(x, y - 14, 'heart', 30));
    }

    // Rare chance for Mario-style Power Star!
    if (Math.random() < 0.12 || enemyType === 'warlord') {
      this.lootDrops.push(new LootDrop(x, y - 18, 'star', 1));
    }
  }

  spawnPoisonCloud(x, y) {
    const fx = createFx(poisonCloudMod, { x, y: Math.min(y, this.groundY), spread: 0.85 });
    this.activeFx.push({
      mod: poisonCloudMod,
      inst: fx,
      x,
      y: Math.min(y, this.groundY),
      type: 'poison',
      radius: 55,
      life: 6.0,
      damageTimer: 0,
    });
  }

  spawnCrit(x, y) {
    const fx = createFx(critHitMod, { x, y });
    this.activeFx.push({ mod: critHitMod, inst: fx, x, y, type: 'crit', life: 0.6 });
  }

  spawnExplosion(x, y) {
    const fx = createFx(barrelExplosionMod, { x, y });
    this.activeFx.push({ mod: barrelExplosionMod, inst: fx, x, y, type: 'explosion', radius: 40, life: 1.0 });
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({ text, x, y, vy: -20, life: 0.9, maxLife: 0.9, color });
  }

  resolvePlayerCollision(px, py, width, height) {
    let onGround = false;
    let newX = Math.max(8, Math.min(this.w - 8, px));
    let newY = py;

    for (const plat of this.platforms) {
      if (newX >= plat.x1 && newX <= plat.x2) {
        if (py >= plat.y && py - 14 <= plat.y) {
          newY = plat.y;
          onGround = true;
          break;
        }
      }
    }

    if (newY >= this.groundY) {
      newY = this.groundY;
      onGround = true;
    }

    return { x: newX, y: newY, onGround };
  }

  update(dt, player, soundSynth) {
    // 1. Update Mystery Question Blocks
    for (const qb of this.questionBlocks) {
      qb.update(dt);
      // Mario headbutt check: player jumping upwards into block from below
      if (
        !qb.hit &&
        player.vy < 0 &&
        Math.abs(player.x - qb.x) < 14 &&
        player.y - 28 <= qb.y &&
        player.y - 28 >= qb.y - 12
      ) {
        qb.bump(this);
        player.vy = 20; // Rebound down
        if (soundSynth) soundSynth.playCoin();
        this.addFloatingText('+LUCKY LOOT!', qb.x, qb.y - 20, '#ffea00');
      }
    }

    // 2. Update Bouncy Loot Drops & Magnet Pickup
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      drop.update(dt, player.x, player.y, player.magnetRadius, this);

      // Collection check
      if (Math.hypot(player.x - drop.x, player.y - 15 - drop.y) < 14) {
        drop.isCollected = true;
        if (drop.type === 'coin') {
          player.coins += drop.value;
          player.score += drop.value * 10;
          this.addFloatingText(`+${drop.value} COINS`, player.x, player.y - 20, '#ffea00');
          if (soundSynth) soundSynth.playCoin();
        } else if (drop.type === 'xp') {
          const leveled = player.gainXP(drop.value);
          this.addFloatingText(`+${drop.value} XP`, player.x, player.y - 24, '#76ff03');
          if (leveled && soundSynth) soundSynth.playVictory();
        } else if (drop.type === 'heart') {
          player.hp = Math.min(player.maxHp, player.hp + drop.value);
          this.addFloatingText(`+${drop.value} HP`, player.x, player.y - 20, '#ff3d00');
        } else if (drop.type === 'star') {
          player.starPowerTimer = 7.0; // 7 seconds of Mario Invulnerability Star!
          this.addFloatingText('★ STAR POWER! ★', player.x, player.y - 28, '#00e5ff');
          if (soundSynth) soundSynth.playVictory();
        }
        this.lootDrops.splice(i, 1);
        continue;
      }

      if (drop.life <= 0) {
        this.lootDrops.splice(i, 1);
      }
    }

    // 3. Update Enemies & Mario-style Stomp / Star-kill
    for (const e of this.enemies) {
      e.update(dt, player.x, player.y, this);

      if (!e.isDead) {
        // Mario-style Star Power touch instakill!
        if (player.starPowerTimer > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 22) {
          e.takeDamage(150);
          this.spawnCrit(e.x, e.y);
          this.addFloatingText('STAR CRUSH! 150', e.x, e.y - 22, '#ffff00');
          if (e.isDead) {
            player.kills++;
            this.spawnLoot(e.x, e.y, e.type);
          }
          continue;
        }

        // Mario-style Head-Stomp: player falling onto enemy head!
        if (
          player.vy > 80 &&
          Math.abs(player.x - e.x) < 14 &&
          player.y >= e.y - e.height - 4 &&
          player.y <= e.y - e.height + 10
        ) {
          player.vy = -300; // Bounce high in the air!
          player.jumpsLeft = player.maxJumps;
          const stompDmg = Math.floor(45 * player.damageMultiplier);
          e.takeDamage(stompDmg);
          this.spawnCrit(e.x, e.y - e.height);
          this.addFloatingText(`STOMP! ${stompDmg}`, e.x, e.y - e.height - 12, '#00f0ff');
          if (soundSynth) soundSynth.playHit();

          if (e.isDead) {
            player.kills++;
            player.score += e.type === 'warlord' ? 1000 : 120;
            this.spawnLoot(e.x, e.y, e.type);
          }
          continue;
        }

        // Normal enemy contact damage
        if (Math.hypot(e.x - player.x, e.y - player.y) < 16) {
          const dmg = e.type === 'warlord' ? 20 : 10;
          const dealt = player.takeDamage(dmg);
          if (dealt > 0) {
            this.addFloatingText(`-${dealt}`, player.x, player.y - 20, '#ff4040');
            if (soundSynth) soundSynth.playPlayerHurt();
          }
        }
      }
    }

    // 4. Update Active PixelFX instances
    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const item = this.activeFx[i];
      item.inst.update(dt);
      item.life -= dt;

      if (item.type === 'poison') {
        item.damageTimer += dt;
        if (item.damageTimer >= 0.3) {
          item.damageTimer = 0;
          for (const e of this.enemies) {
            if (!e.isDead && Math.hypot(e.x - item.x, e.y - item.y) <= item.radius) {
              e.poisonTimer = 2.0;
              e.takeDamage(8, false);
              this.addFloatingText('POISON -8', e.x, e.y - 25, '#80ff40');
              if (e.isDead) {
                player.kills++;
                this.spawnLoot(e.x, e.y, e.type);
              }
            }
          }
        }
      }

      if (item.life <= 0 || item.inst.done()) {
        this.activeFx.splice(i, 1);
      }
    }

    // 5. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;

    const bgColor = theme === 'bw' ? 0xff080808 : theme === 'green' ? 0xff040e06 : 0xff100d18;
    frame.color.fill(bgColor);

    // Stone platforms
    const stoneCol = theme === 'bw' ? 0xff404040 : theme === 'green' ? 0xff144020 : 0xff3b334a;
    const edgeCol = theme === 'bw' ? 0xffffffff : theme === 'green' ? 0xff3cd060 : 0xff7a6e9a;

    for (const plat of this.platforms) {
      const y = Math.round(plat.y);
      const x1 = Math.max(0, Math.round(plat.x1));
      const x2 = Math.min(W - 1, Math.round(plat.x2));
      const thickness = plat.isFloor ? H - y : 6;

      for (let dy = 0; dy < thickness; dy++) {
        for (let x = x1; x <= x2; x++) {
          const py = y + dy;
          if (py < H) {
            const idx = py * W + x;
            if (dy === 0) {
              frame.color[idx] = edgeCol;
            } else {
              const brick = (dy % 4 === 0) || ((x + dy * 2) % 12 === 0);
              frame.color[idx] = brick ? 0xff100c14 : stoneCol;
            }
          }
        }
      }
    }

    // Draw Question Blocks
    for (const qb of this.questionBlocks) {
      qb.draw(frame, theme);
    }

    // Draw active PixelFX back layers
    for (const item of this.activeFx) {
      item.inst.draw(frame, 'back');
    }

    // Draw Bouncy Loot Drops
    for (const drop of this.lootDrops) {
      drop.draw(frame, theme);
    }

    // Draw Enemies
    for (const e of this.enemies) {
      e.draw(frame, theme);
    }

    // Draw active PixelFX front layers
    for (const item of this.activeFx) {
      item.inst.draw(frame, 'front');
    }
  }

  drawOverlay(ctx, scaleX = 1, scaleY = 1) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Courier New", monospace';

    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(ft.text, ft.x * scaleX, ft.y * scaleY);
    }
    ctx.restore();
  }
}
