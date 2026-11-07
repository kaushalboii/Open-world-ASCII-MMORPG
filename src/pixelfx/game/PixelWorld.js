// PixelWorld: Real-time side-scrolling world manager with platforms, hazards, enemies, and PixelFX simulations
// Supports Hugo Duprez poison gas clouds, impact sparks, enemy combat, and boss battles

import { createFx, createFrame, clearFrame, composite } from '../core/index.js';
import * as poisonCloudMod from '../fx/nature/poison-cloud.js';
import * as critHitMod from '../fx/impacts/crit-hit.js';
import * as barrelExplosionMod from '../fx/explosions/barrel-explosion.js';

export class PixelEnemy {
  constructor(x, y, type = 'mutant') {
    this.x = x;
    this.y = y;
    this.type = type; // 'mutant', 'drone', 'warlord'
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.isDead = false;
    this.hitFlashTimer = 0;
    this.poisonTimer = 0;

    if (type === 'warlord') {
      this.hp = 350;
      this.maxHp = 350;
      this.speed = 45;
      this.width = 28;
      this.height = 42;
      this.attackTimer = 2.0;
    } else if (type === 'drone') {
      this.hp = 45;
      this.maxHp = 45;
      this.speed = 70;
      this.width = 18;
      this.height = 18;
      this.baseY = y;
    } else {
      // standard mutant
      this.hp = 60;
      this.maxHp = 60;
      this.speed = 50;
      this.width = 18;
      this.height = 28;
    }
  }

  update(dt, playerX, playerY, world) {
    if (this.isDead) return;

    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Handle poison DoT
    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.takeDamage(12 * dt, false);
    }

    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
    this.facing = playerX > this.x ? 1 : -1;

    if (this.type === 'drone') {
      // Hovering Drone AI
      if (distToPlayer < 240) {
        this.x += this.facing * this.speed * dt;
        this.y = this.baseY + Math.sin(performance.now() * 0.004) * 12;
      }
    } else if (this.type === 'warlord') {
      // Boss AI
      if (distToPlayer < 300) {
        this.x += this.facing * this.speed * dt;
      }
      this.vy += 700 * dt;
      this.y += this.vy * dt;
      if (this.y > 146) {
        this.y = 146;
        this.vy = 0;
      }
    } else {
      // Mutant patrol / chase AI
      if (distToPlayer < 220) {
        this.x += this.facing * this.speed * dt;
      }
      this.vy += 700 * dt;
      this.y += this.vy * dt;
      if (this.y > 146) {
        this.y = 146;
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

    let baseColor = 0xffa04040;
    if (this.type === 'warlord') baseColor = 0xff4020a0;
    if (this.type === 'drone') baseColor = 0xffa08020;

    if (poisoned) baseColor = 0xff30a030;
    if (flash) baseColor = 0xffffffff;

    if (theme === 'bw') {
      baseColor = flash ? 0xffffffff : 0xffcccccc;
    } else if (theme === 'green') {
      baseColor = flash ? 0xffffffff : 0xff30d060;
    }

    const hw = Math.floor(this.width / 2);
    const h = this.height;

    // Render body
    for (let dy = 0; dy < h; dy++) {
      for (let dx = -hw; dx <= hw; dx++) {
        const px = bx + dx;
        const py = by - h + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          // Add border / detail
          const isEdge = dx === -hw || dx === hw || dy === 0 || dy === h - 1;
          const col = isEdge ? 0xff101018 : baseColor;
          frame.color[py * W + px] = col;
        }
      }
    }

    // Health Bar
    const barWidth = 24;
    const barX = bx - 12;
    const barY = by - h - 6;
    const hpRatio = this.hp / this.maxHp;

    for (let x = 0; x < barWidth; x++) {
      const px = barX + x;
      if (px >= 0 && px < W && barY >= 0 && barY < H) {
        const fill = x < barWidth * hpRatio;
        const col = fill ? (theme === 'bw' ? 0xffffffff : 0xff20e040) : 0xff301010;
        frame.color[barY * W + px] = col;
      }
    }
  }
}

export class PixelWorld {
  constructor(stageWidth = 320, stageHeight = 180) {
    this.w = stageWidth;
    this.h = stageHeight;
    this.groundY = 148;

    // Platforms: { x1, x2, y }
    this.platforms = [
      { x1: 0, x2: 320, y: 148, isFloor: true },
      { x1: 50, x2: 120, y: 116 },
      { x1: 140, x2: 210, y: 88 },
      { x1: 220, x2: 300, y: 114 },
      { x1: 90, x2: 160, y: 62 },
    ];

    // Sludge pits: { x1, x2, y }
    this.hazards = [
      { x1: 150, x2: 185, y: 148 },
    ];

    this.enemies = [
      new PixelEnemy(90, 116, 'mutant'),
      new PixelEnemy(175, 88, 'drone'),
      new PixelEnemy(260, 114, 'mutant'),
      new PixelEnemy(120, 62, 'drone'),
      new PixelEnemy(280, 148, 'warlord'), // Goliath Boss
    ];

    // Active PixelFX visual effects in world
    this.activeFx = [];
    this.floatingTexts = [];
  }

  // Spawn Hugo Duprez poison cloud
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

  // Spawn impact critical hit flash
  spawnCrit(x, y) {
    const fx = createFx(critHitMod, { x, y });
    this.activeFx.push({
      mod: critHitMod,
      inst: fx,
      x,
      y,
      type: 'crit',
      life: 0.6,
    });
  }

  // Spawn barrel explosion
  spawnExplosion(x, y) {
    const fx = createFx(barrelExplosionMod, { x, y });
    this.activeFx.push({
      mod: barrelExplosionMod,
      inst: fx,
      x,
      y,
      type: 'explosion',
      radius: 40,
      life: 1.0,
    });
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({ text, x, y, vy: -20, life: 0.9, maxLife: 0.9, color });
  }

  resolvePlayerCollision(px, py, width, height) {
    let onGround = false;
    let newX = Math.max(8, Math.min(this.w - 8, px));
    let newY = py;

    // Check platforms
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

  update(dt, player) {
    // 1. Update enemies
    for (const e of this.enemies) {
      e.update(dt, player.x, player.y, this);

      // Check contact damage with player
      if (!e.isDead && Math.hypot(e.x - player.x, e.y - player.y) < 16) {
        const dmg = e.type === 'warlord' ? 22 : 12;
        const dealt = player.takeDamage(dmg);
        if (dealt > 0) {
          this.addFloatingText(`-${dealt}`, player.x, player.y - 20, '#ff4040');
        }
      }
    }

    // 2. Update active PixelFX instances
    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const item = this.activeFx[i];
      item.inst.update(dt);
      item.life -= dt;

      // Poison cloud damage ticking
      if (item.type === 'poison') {
        item.damageTimer += dt;
        if (item.damageTimer >= 0.3) {
          item.damageTimer = 0;
          for (const e of this.enemies) {
            if (!e.isDead && Math.hypot(e.x - item.x, e.y - item.y) <= item.radius) {
              e.poisonTimer = 2.0;
              e.takeDamage(8, false);
              this.addFloatingText('POISON -8', e.x, e.y - 25, '#80ff40');
              if (e.isDead) player.kills++;
            }
          }
        }
      }

      if (item.life <= 0 || item.inst.done()) {
        this.activeFx.splice(i, 1);
      }
    }

    // 3. Update floating damage texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Draw background platforms & environment directly into PixelFX frame
  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;

    // Background Cyber Grid / Sky
    const bgColor = theme === 'bw' ? 0xff080808 : theme === 'green' ? 0xff040e06 : 0xff100d18;
    frame.color.fill(bgColor);

    // Render stone / neon platforms
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
              // Brick mortar pattern
              const brick = (dy % 4 === 0) || ((x + dy * 2) % 12 === 0);
              frame.color[idx] = brick ? 0xff100c14 : stoneCol;
            }
          }
        }
      }
    }

    // Render hazard acid/sludge pit
    for (const haz of this.hazards) {
      const y = Math.round(haz.y);
      const x1 = Math.round(haz.x1);
      const x2 = Math.round(haz.x2);
      const acidCol = theme === 'bw' ? 0xff888888 : theme === 'green' ? 0xff20ff40 : 0xff30e030;
      for (let x = x1; x <= x2; x++) {
        for (let dy = 0; dy < 4; dy++) {
          const py = y + dy;
          if (py < H) {
            frame.color[py * W + x] = acidCol;
            frame.light[py * W + x] = acidCol; // Acid glow
          }
        }
      }
    }

    // Draw active PixelFX back layers
    for (const item of this.activeFx) {
      item.inst.draw(frame, 'back');
    }

    // Draw enemies
    for (const e of this.enemies) {
      e.draw(frame, theme);
    }

    // Draw active PixelFX front layers
    for (const item of this.activeFx) {
      item.inst.draw(frame, 'front');
    }
  }

  // Draw floating combat numbers via canvas 2D
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
