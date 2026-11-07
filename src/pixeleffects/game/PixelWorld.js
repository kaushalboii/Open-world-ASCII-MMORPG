// PixelWorld: Arcade Run & Gun Platformer World with Multi-Sector Progression (Sectors 1, 2, 3),
// Narrative NPC Dialogues, Interactive Cyber Sheep, Smashable Destructibles,
// 21-Category Procedural VFX Integration, Mario Stomping & Lucky Blocks, and Goliath Prime Boss Mech!

import { createFx, createFrame, clearFrame, composite } from '../core/index.js';
import * as poisonCloudMod from '../fx/nature/poison-cloud.js';
import * as critHitMod from '../fx/impacts/crit-hit.js';
import * as barrelExplosionMod from '../fx/explosions/barrel-explosion.js';

import { NPC } from '../../entities/NPC.js';
import { Destructible } from '../../world/Destructibles.js';
import { Sheep } from '../../world/Sheep.js';
import { DamageTextManager } from '../../combat/DamageText.js';
import { SlashArc } from '../../combat/SlashArc.js';
import { ParticleEngine } from '../../vfx/ParticleEngine.js';
import { DialogueBox } from '../../ui/DialogueBox.js';
import { MiniMap } from '../../ui/MiniMap.js';

export class LootDrop {
  constructor(x, y, type = 'coin', value = 10) {
    this.x = x;
    this.y = y;
    this.type = type; // 'coin', 'xp', 'heart', 'star'
    this.value = value;
    this.vx = (Math.random() - 0.5) * 120;
    this.vy = -120 - Math.random() * 80;
    this.life = 16.0;
    this.isCollected = false;
  }

  update(dt, playerX, playerY, magnetRadius, world) {
    if (this.isCollected) return;
    this.life -= dt;

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

    this.vy += 500 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

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

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const sx = px + dx;
        const sy = py + dy;
        if (sx >= 0 && sx < W && sy >= 0 && sy < H) {
          const idx = sy * W + sx;
          frame.color[idx] = color;
          frame.light[idx] = glow;
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

    for (let i = 0; i < 4; i++) {
      world.lootDrops.push(new LootDrop(this.x + (i - 1.5) * 6, this.y - 12, 'coin', 20));
    }
    world.lootDrops.push(new LootDrop(this.x, this.y - 16, 'xp', 35));
    if (Math.random() < 0.45) {
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
    this.attackCooldown = 2.0;

    if (type === 'warlord') {
      this.hp = 450;
      this.maxHp = 450;
      this.speed = 44;
      this.width = 30;
      this.height = 44;
    } else if (type === 'drone') {
      this.hp = 45;
      this.maxHp = 45;
      this.speed = 65;
      this.width = 18;
      this.height = 18;
      this.baseY = y;
    } else if (type === 'mutant') {
      this.hp = 70;
      this.maxHp = 70;
      this.speed = 52;
      this.width = 20;
      this.height = 30;
    } else {
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

    // Boss Goliath ranged missile attack
    if (this.type === 'warlord') {
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 3.2;
        world.spawnExplosion(playerX, world.groundY);
        world.addFloatingText('BARRAGE!', this.x, this.y - 48, '#ff0055');
      }
    }

    if (this.type === 'drone') {
      if (distToPlayer < 240) {
        this.x += this.facing * this.speed * dt;
        this.y = this.baseY + Math.sin(performance.now() * 0.005) * 10;
      }
    } else {
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

    this.currentSector = 1;
    this.sectorName = 'TERRACE I: AZURE SKYLINE';
    this.objective = '';

    // Warp Portal at end of sector
    this.warpPortal = { x: 295, y: 148, active: false };

    this.platforms = [];
    this.questionBlocks = [];
    this.enemies = [];
    this.hazards = [];
    this.lootDrops = [];
    this.activeFx = [];
    this.floatingTexts = [];

    // Integrated narrative systems
    this.npcs = [];
    this.destructibles = [];
    this.sheep = [];
    this.slashArcs = [];
    this.particleEngine = new ParticleEngine();
    this.damageTexts = new DamageTextManager();
    this.dialogueBox = new DialogueBox();
    this.miniMap = new MiniMap(this.w, this.h);

    this.loadSector(1);
  }

  loadSector(num) {
    this.currentSector = num;
    this.warpPortal.active = false;
    this.lootDrops = [];
    this.activeFx = [];
    this.slashArcs = [];

    if (num === 1) {
      this.sectorName = 'TERRACE I: AZURE SKYLINE';
      this.objective = 'MISSION 1: COMMUNE WITH ROLAND [E] • SMASH SIEGE CRATES • PURGE VANGUARD';
      this.platforms = [
        { x1: 0, x2: 320, y: 148, isFloor: true },
        { x1: 45, x2: 110, y: 114 },
        { x1: 135, x2: 195, y: 84 },
        { x1: 215, x2: 295, y: 114 },
        { x1: 95, x2: 165, y: 56 },
      ];
      this.hazards = [];
      this.questionBlocks = [
        new QuestionBlock(75, 114),
        new QuestionBlock(165, 84),
        new QuestionBlock(255, 114),
      ];
      this.enemies = [
        new PixelEnemy(80, 114, 'slime'),
        new PixelEnemy(160, 84, 'drone'),
        new PixelEnemy(240, 114, 'slime'),
        new PixelEnemy(130, 56, 'slime'),
      ];
      this.npcs = [
        new NPC(32, 148, 'Commander Roland', 'roland', 'Ω'),
      ];
      this.sheep = [
        new Sheep(85, 148),
        new Sheep(210, 148),
      ];
      this.destructibles = [
        new Destructible(105, 114, 'crate'),
        new Destructible(180, 84, 'crate'),
        new Destructible(145, 56, 'chest'),
      ];
    } else if (num === 2) {
      this.sectorName = 'TERRACE II: SUNKEN CISTERN';
      this.objective = 'MISSION 2: CROSS ACID CATWALKS • APOTHECARY LYRA [E] • DISSOLVE AUTOMATA';
      this.platforms = [
        { x1: 0, x2: 120, y: 148, isFloor: true },
        { x1: 190, x2: 320, y: 148, isFloor: true },
        { x1: 115, x2: 195, y: 118 }, // Catwalk bridge
        { x1: 40, x2: 95, y: 80 },
        { x1: 220, x2: 285, y: 80 },
      ];
      this.hazards = [
        { x1: 120, x2: 190, y: 148 }, // Acid pool
      ];
      this.questionBlocks = [
        new QuestionBlock(65, 80),
        new QuestionBlock(155, 118),
        new QuestionBlock(250, 80),
      ];
      this.enemies = [
        new PixelEnemy(60, 80, 'slime'),
        new PixelEnemy(155, 118, 'mutant'),
        new PixelEnemy(250, 80, 'mutant'),
        new PixelEnemy(150, 50, 'drone'),
      ];
      this.npcs = [
        new NPC(25, 148, 'Alchemist Lyra', 'lyra', 'Ψ'),
      ];
      this.sheep = [];
      this.destructibles = [
        new Destructible(85, 80, 'barrel'),
        new Destructible(175, 118, 'barrel'),
        new Destructible(275, 80, 'chest'),
      ];
    } else {
      this.sectorName = 'TERRACE III: DREAD CITADEL';
      this.objective = 'FINAL CLIMAX: HIGH SEER ELYON [E] • PURGE LORD MALAKOR • RESTORE 21 SEALS';
      this.platforms = [
        { x1: 0, x2: 320, y: 148, isFloor: true },
        { x1: 30, x2: 85, y: 105 },
        { x1: 235, x2: 290, y: 105 },
        { x1: 120, x2: 200, y: 72 },
      ];
      this.hazards = [];
      this.questionBlocks = [
        new QuestionBlock(55, 105),
        new QuestionBlock(160, 72),
        new QuestionBlock(260, 105),
      ];
      this.enemies = [
        new PixelEnemy(160, 72, 'drone'),
        new PixelEnemy(265, 148, 'warlord'), // Final Boss Lord Malakor!
      ];
      this.npcs = [
        new NPC(22, 148, 'High Seer Elyon', 'elyon', 'Φ'),
      ];
      this.sheep = [];
      this.destructibles = [
        new Destructible(70, 105, 'crate'),
        new Destructible(245, 105, 'crate'),
        new Destructible(160, 72, 'chest'),
      ];
    }
  }

  spawnLoot(x, y, enemyType) {
    const coinCount = enemyType === 'warlord' ? 14 : enemyType === 'mutant' ? 5 : 2;
    const xpCount = enemyType === 'warlord' ? 10 : enemyType === 'drone' ? 4 : 2;

    for (let i = 0; i < coinCount; i++) {
      this.lootDrops.push(new LootDrop(x, y - 10, 'coin', 15));
    }
    for (let i = 0; i < xpCount; i++) {
      this.lootDrops.push(new LootDrop(x, y - 12, 'xp', 25));
    }

    if (Math.random() < 0.35 || enemyType === 'warlord') {
      this.lootDrops.push(new LootDrop(x, y - 14, 'heart', 30));
    }

    if (Math.random() < 0.15 || enemyType === 'warlord') {
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
    this.activeFx.push({ mod: barrelExplosionMod, inst: fx, x, y, type: 'explosion', radius: 42, life: 1.0 });
    this.particleEngine.emitSparks(x, y, 16, ['*', '#', '✦', '▲', '●']);
  }

  spawnSlashArc(x, y, facing = 1) {
    const angle = facing > 0 ? 0 : Math.PI;
    const arc = new SlashArc(x + facing * 8, y - 10, angle, 32);
    this.slashArcs.push(arc);
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({ text, x, y, vy: -20, life: 0.9, maxLife: 0.9, color });
    if (this.damageTexts) {
      this.damageTexts.add(x, y, text, color === '#ffea00' ? 'crit' : 'normal');
    }
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

  update(dt, player, input, soundSynth) {
    // 1. Dialogue Box update
    if (this.dialogueBox.isOpen) {
      this.dialogueBox.update(dt, input);
    } else if (input) {
      // NPC Interaction Check (Press E or Space near NPC)
      const wantsInteract = input.wasJustPressed('flask') || input.wasJustPressed('Space') || input.wasJustPressed('KeyE');
      if (wantsInteract) {
        for (const npc of this.npcs) {
          if (Math.hypot(player.x - npc.x, player.y - npc.y) <= npc.promptDistance) {
            npc.interact(player, this.dialogueBox, this.damageTexts, this);
            if (soundSynth) soundSynth.playCoin();
            break;
          }
        }
        // Petting Cyber Sheep
        for (const s of this.sheep) {
          if (Math.hypot(player.x - s.x, player.y - s.y) <= 24) {
            if (soundSynth) soundSynth.playSheepBaa();
            this.damageTexts.add(s.x, s.y - 12, 'baa~ ❤️ +25 XP', 'bleat');
            player.gainXP(25);
            break;
          }
        }
      }
    }

    // 2. Update NPCs & Sheep
    for (const s of this.sheep) {
      s.update(dt, this, player, this.damageTexts, this.particleEngine);
    }

    // 3. Update Slash Arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.update(dt, player.x, player.y);
      if (arc.isFinished) {
        this.slashArcs.splice(i, 1);
        continue;
      }
      // Check hit on enemies
      for (const e of this.enemies) {
        if (!e.isDead && arc.checkHit(e.x, e.y - 10, e.width / 2)) {
          const dmg = Math.floor(35 * player.damageMultiplier);
          e.takeDamage(dmg);
          this.spawnCrit(e.x, e.y - 10);
          this.addFloatingText(`-${dmg}`, e.x, e.y - 20, '#ffffff');
          if (e.isDead) {
            player.kills++;
            player.score += e.type === 'warlord' ? 1500 : 150;
            this.spawnLoot(e.x, e.y, e.type);
          }
        }
      }
    }

    // 4. Update Particle Engine & Combat Texts
    this.particleEngine.update(dt);
    this.damageTexts.update(dt);

    // 5. Check if all sector enemies are cleared to unlock Warp Portal
    const aliveEnemies = this.enemies.filter((e) => !e.isDead);
    if (aliveEnemies.length === 0 && !this.warpPortal.active && this.currentSector < 3) {
      this.warpPortal.active = true;
      this.addFloatingText('★ PORTAL ACTIVATED! ★', this.warpPortal.x, this.warpPortal.y - 25, '#00f0ff');
      if (soundSynth) soundSynth.playVictory();
    }

    // Check Warp Portal activation
    if (this.warpPortal.active && Math.hypot(player.x - this.warpPortal.x, player.y - this.warpPortal.y) < 18) {
      if (this.currentSector < 3) {
        this.loadSector(this.currentSector + 1);
        player.x = 40;
        player.y = 140;
        this.addFloatingText(`WARPED TO ${this.sectorName}!`, 160, 60, '#00ff88');
        if (soundSynth) soundSynth.playVictory();
        return;
      }
    }

    // 6. Hazard Check (Acid Pools)
    for (const haz of this.hazards) {
      if (player.x >= haz.x1 && player.x <= haz.x2 && player.y >= haz.y - 4) {
        const acidDmg = 16 * dt;
        player.takeDamage(acidDmg);
        if (Math.random() < 0.15) {
          this.addFloatingText('-ACID!', player.x, player.y - 15, '#30ff30');
          this.particleEngine.emitSparks(player.x, player.y, 2, ['~', '°']);
        }
      }
    }

    // 7. Update Question Blocks
    for (const qb of this.questionBlocks) {
      qb.update(dt);
      if (
        !qb.hit &&
        player.vy < 0 &&
        Math.abs(player.x - qb.x) < 14 &&
        player.y - 28 <= qb.y &&
        player.y - 28 >= qb.y - 12
      ) {
        qb.bump(this);
        player.vy = 20;
        if (soundSynth) soundSynth.playCoin();
        this.addFloatingText('+LUCKY LOOT!', qb.x, qb.y - 20, '#ffea00');
      }
    }

    // 8. Stomp on Destructibles
    for (const d of this.destructibles) {
      if (
        !d.isBroken &&
        player.vy > 60 &&
        Math.abs(player.x - d.x) < 14 &&
        player.y >= d.y - 16 &&
        player.y <= d.y + 4
      ) {
        player.vy = -260; // Rebound stomp!
        d.smash(player, this, this.particleEngine, this.damageTexts);
      }
    }

    // 9. Update Bouncy Loot Drops
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      drop.update(dt, player.x, player.y, player.magnetRadius, this);

      if (Math.hypot(player.x - drop.x, player.y - 15 - drop.y) < 14) {
        drop.isCollected = true;
        if (drop.type === 'coin') {
          player.coins += drop.value;
          player.score += drop.value * 10;
          this.addFloatingText(`+${drop.value} COINS`, player.x, player.y - 20, '#ffea00');
          if (soundSynth) soundSynth.playCoin();
        } else if (drop.type === 'xp') {
          const leveled = player.gainXP(drop.value);
          this.addFloatingText(`+${drop.value} XP`, player.x, player.y - 22, '#00ff88');
          if (leveled) {
            this.addFloatingText('★ LEVEL UP! ★', player.x, player.y - 32, '#ffff00');
            if (soundSynth) soundSynth.playVictory();
          } else {
            if (soundSynth) soundSynth.playCoin();
          }
        } else if (drop.type === 'heart') {
          player.hp = Math.min(player.maxHp, player.hp + drop.value);
          this.addFloatingText(`+${drop.value} HP`, player.x, player.y - 20, '#ff3d00');
        } else if (drop.type === 'star') {
          player.starPowerTimer = 7.0;
          this.addFloatingText('★ STAR POWER! ★', player.x, player.y - 28, '#00e5ff');
          if (soundSynth) soundSynth.playVictory();
        }
        this.lootDrops.splice(i, 1);
      } else if (drop.life <= 0) {
        this.lootDrops.splice(i, 1);
      }
    }

    // 10. Update Enemies & Stomp
    for (const e of this.enemies) {
      e.update(dt, player.x, player.y, this);

      if (!e.isDead) {
        // Mario Star Power instakill
        if (player.starPowerTimer > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 22) {
          e.takeDamage(150);
          this.spawnCrit(e.x, e.y);
          this.addFloatingText('★ STAR SMASH! ★', e.x, e.y - 20, '#ffff00');
          if (e.isDead) {
            player.kills++;
            player.score += e.type === 'warlord' ? 1500 : 150;
            this.spawnLoot(e.x, e.y, e.type);
          }
          continue;
        }

        // Mario head stomp
        if (
          player.vy > 80 &&
          Math.abs(player.x - e.x) < 14 &&
          player.y >= e.y - e.height - 4 &&
          player.y <= e.y - e.height + 10
        ) {
          player.vy = -300;
          player.jumpsLeft = player.maxJumps;
          const stompDmg = Math.floor(45 * player.damageMultiplier);
          e.takeDamage(stompDmg);
          this.spawnCrit(e.x, e.y - e.height);
          this.addFloatingText(`STOMP! ${stompDmg}`, e.x, e.y - e.height - 12, '#00f0ff');
          if (soundSynth) soundSynth.playStompSquish();

          if (e.isDead) {
            player.kills++;
            player.score += e.type === 'warlord' ? 1500 : 120;
            this.spawnLoot(e.x, e.y, e.type);
          }
          continue;
        }

        // Enemy contact damage
        if (Math.hypot(e.x - player.x, e.y - player.y) < 16) {
          const dmg = e.type === 'warlord' ? 22 : 10;
          const dealt = player.takeDamage(dmg);
          if (dealt > 0) {
            this.addFloatingText(`-${dealt}`, player.x, player.y - 20, '#ff4040');
            if (soundSynth) soundSynth.playPlayerHurt();
          }
        }
      }
    }

    // 11. Update Active Pixel Effects
    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const item = this.activeFx[i];
      item.inst.update(dt);
      item.life -= dt;

      // Poison AoE DoT
      if (item.type === 'poison') {
        item.damageTimer += dt;
        if (item.damageTimer >= 0.5) {
          item.damageTimer = 0;
          for (const e of this.enemies) {
            if (!e.isDead && Math.hypot(e.x - item.x, e.y - item.y) <= item.radius) {
              const pDmg = Math.floor(10 * player.damageMultiplier);
              e.takeDamage(pDmg);
              e.poisonTimer = 3.0;
              this.addFloatingText(`-${pDmg} PSN`, e.x, e.y - 12, '#30ff30');
            }
          }
        }
      }

      if (item.life <= 0) {
        this.activeFx.splice(i, 1);
      }
    }

    // 12. Update Floating Texts
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

    // Background gradient / horizon
    const skyCol = theme === 'bw' ? 0xff080808 : theme === 'green' ? 0xff041008 : 0xff080812;
    for (let i = 0; i < W * H; i++) {
      frame.color[i] = skyCol;
    }

    // Draw Platforms
    const platCol = theme === 'bw' ? 0xffaaaaaa : 0xff252538;
    const edgeCol = theme === 'bw' ? 0xffffffff : 0xff00e5ff;

    for (const plat of this.platforms) {
      const y = Math.round(plat.y);
      const x1 = Math.round(plat.x1);
      const x2 = Math.round(plat.x2);

      for (let x = x1; x <= x2; x++) {
        if (x >= 0 && x < W && y >= 0 && y < H) {
          frame.color[y * W + x] = edgeCol;
          for (let dy = 1; dy <= 4; dy++) {
            const py = y + dy;
            if (py < H) frame.color[py * W + x] = platCol;
          }
        }
      }
    }

    // Hazard acid pools
    for (const haz of this.hazards) {
      const y = Math.round(haz.y);
      const x1 = Math.round(haz.x1);
      const x2 = Math.round(haz.x2);
      const acidCol = theme === 'bw' ? 0xff888888 : 0xff30e030;
      for (let x = x1; x <= x2; x++) {
        for (let dy = 0; dy < 4; dy++) {
          const py = y + dy;
          if (py < H) {
            frame.color[py * W + x] = acidCol;
            frame.light[py * W + x] = acidCol;
          }
        }
      }
    }

    // Draw Warp Portal if active
    if (this.warpPortal.active) {
      const wx = Math.round(this.warpPortal.x);
      const wy = Math.round(this.warpPortal.y);
      const portalCol = theme === 'bw' ? 0xffffffff : 0xff00f0ff;
      const pulse = Math.sin(performance.now() * 0.008) * 4;

      for (let r = 8; r <= 14 + pulse; r += 2) {
        for (let a = 0; a < Math.PI * 2; a += 0.4) {
          const px = Math.round(wx + Math.cos(a) * (r * 0.5));
          const py = Math.round(wy - r + Math.sin(a) * (r * 0.8));
          if (px >= 0 && px < W && py >= 0 && py < H) {
            frame.color[py * W + px] = portalCol;
            frame.light[py * W + px] = portalCol;
          }
        }
      }
    }

    // Draw Destructibles (crates, barrels, chests)
    for (const d of this.destructibles) {
      d.draw(frame, theme);
    }

    // Draw Cyber Sheep
    for (const s of this.sheep) {
      s.draw(frame, theme);
    }

    // Draw Question Blocks
    for (const qb of this.questionBlocks) {
      qb.draw(frame, theme);
    }

    // Draw active Pixel Effects back layers
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

    // Draw active Pixel Effects front layers
    for (const item of this.activeFx) {
      item.inst.draw(frame, 'front');
    }
  }

  drawOverlay(ctx, scaleX = 3, scaleY = 3, viewWidth = 960, viewHeight = 540, player = null) {
    // 1. Particle Engine & Slash Arcs
    this.particleEngine.render(ctx, scaleX);
    for (const arc of this.slashArcs) {
      arc.render(ctx, scaleX);
    }

    // 2. NPCs (Nameplate, glyph & Talk prompt)
    for (const npc of this.npcs) {
      npc.render(ctx, scaleX, player);
    }

    // 3. Destructibles & Sheep ASCII Labels
    for (const d of this.destructibles) {
      d.render(ctx, scaleX);
    }

    // 4. Combat Damage Numbers
    this.damageTexts.render(ctx, scaleX);

    // 5. MiniMap Radar Scan in top-right
    this.miniMap.render(ctx, viewWidth, player, this);

    // 6. Interactive Narrative Dialogue Box
    if (this.dialogueBox.isOpen) {
      this.dialogueBox.render(ctx, viewWidth, viewHeight);
    }

    // 7. Floating Texts
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
