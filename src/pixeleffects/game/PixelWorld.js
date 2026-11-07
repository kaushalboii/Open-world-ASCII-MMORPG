// PixelWorld: Infinite Procedural Ascension Engine for The Boundless Spiral
// Features UNLIMITED LEVELS (Floors 1 to ∞), 10 Elemental Biomes, Procedurally Seeded Platforms,
// 21-Category Real VFX Spells & Weather, Colossus Boss Trials every 5 floors,
// Celestial Ascension Gates, Lucky Relic Blocks [ ? ], Destructibles, Sanctuary Sheep, and Dynamic Radar!
// Authored by Kaushal (kaushalboii)

import { createFx, createFrame, clearFrame, composite } from '../core/index.js';
import * as poisonCloudMod from '../fx/nature/poison-cloud.js';
import * as critHitMod from '../fx/impacts/crit-hit.js';
import * as barrelExplosionMod from '../fx/explosions/barrel-explosion.js';
import * as fireballMod from '../fx/fire/fireball.js';
import * as sparkArcMod from '../fx/lightning/spark-arc.js';
import * as frostNovaMod from '../fx/ice/frost-nova.js';
import * as darkExplosionMod from '../fx/shadow/dark-explosion.js';

import { NPC } from '../../entities/NPC.js';
import { Destructible } from '../../world/Destructibles.js';
import { Sheep } from '../../world/Sheep.js';
import { DamageTextManager } from '../../combat/DamageText.js';
import { SlashArc } from '../../combat/SlashArc.js';
import { ParticleEngine } from '../../vfx/ParticleEngine.js';
import { DialogueBox } from '../../ui/DialogueBox.js';
import { MiniMap } from '../../ui/MiniMap.js';

export const ELEMENTAL_BIOMES = [
  {
    id: 'fire',
    name: 'THE IGNIS FORGE',
    category: 'fire',
    desc: 'Thermal flares, molten catwalks, and pyro automata',
    skyCol: 0xff14080a,
    platCol: 0xff381814,
    edgeCol: 0xffff4500,
    hazardCol: 0xffff2200,
    hazardName: 'LAVA',
    particleChars: ['*', '·', '^'],
    particleColors: ['#ff4500', '#ff8800', '#ffcc00'],
    bossName: 'PYROCLAST TITAN',
    enemyTypes: ['pyro', 'drone', 'slime'],
  },
  {
    id: 'ice',
    name: 'THE GLACIAL LABYRINTH',
    category: 'ice',
    desc: 'Sub-zero cryo spires, freezing mist, and frost nova crystals',
    skyCol: 0xff060c18,
    platCol: 0xff142238,
    edgeCol: 0xff00f0ff,
    hazardCol: 0xff00d4ff,
    hazardName: 'PERMAFROST',
    particleChars: ['*', '°', '·'],
    particleColors: ['#00f0ff', '#e0f7fa', '#80deea'],
    bossName: 'GLACIAL ARCHON',
    enemyTypes: ['cryo', 'drone', 'mutant'],
  },
  {
    id: 'lightning',
    name: 'THE FULGUR BASTION',
    category: 'lightning',
    desc: 'High-voltage storm conduits, ion arcs, and spark drones',
    skyCol: 0xff10100a,
    platCol: 0xff282814,
    edgeCol: 0xffffd700,
    hazardCol: 0xffffea00,
    hazardName: 'VOLTAGE',
    particleChars: ['⚡', '+', '·'],
    particleColors: ['#ffff00', '#ffe600', '#ffffff'],
    bossName: 'TEMPEST COLOSSUS',
    enemyTypes: ['storm', 'drone', 'slime'],
  },
  {
    id: 'nature',
    name: 'THE VERDANT CRADLE',
    category: 'nature',
    desc: 'Bioluminescent spore canopy, living roots, and toxic mires',
    skyCol: 0xff061208,
    platCol: 0xff142816,
    edgeCol: 0xff00ff66,
    hazardCol: 0xff22dd44,
    hazardName: 'ACID MIRE',
    particleChars: ['~', '°', '·'],
    particleColors: ['#00ff66', '#76ff03', '#b2ff59'],
    bossName: 'VERDANT BEHEMOTH',
    enemyTypes: ['toxic', 'slime', 'mutant'],
  },
  {
    id: 'water',
    name: 'THE ABYSSAL CISTERN',
    category: 'water',
    desc: 'Cascading cataracts, deep waterjets, and aquatic stalkers',
    skyCol: 0xff060818,
    platCol: 0xff121c38,
    edgeCol: 0xff1e90ff,
    hazardCol: 0xff00bfff,
    hazardName: 'WHIRLPOOL',
    particleChars: ['|', '°', '·'],
    particleColors: ['#1e90ff', '#00bfff', '#87cefa'],
    bossName: 'ABYSSAL LEVIATHAN',
    enemyTypes: ['abyssal', 'slime', 'drone'],
  },
  {
    id: 'shadow',
    name: 'THE UMBRAL VAULT',
    category: 'shadow',
    desc: 'Event horizons, dark matter vortexes, and void specters',
    skyCol: 0xff0c0614,
    platCol: 0xff241234,
    edgeCol: 0xffda70d6,
    hazardCol: 0xffba55d3,
    hazardName: 'VOID RIFT',
    particleChars: ['x', '·', '•'],
    particleColors: ['#da70d6', '#ba55d3', '#9932cc'],
    bossName: 'VOID WYRM',
    enemyTypes: ['void', 'mutant', 'drone'],
  },
  {
    id: 'arcane',
    name: 'THE CHRONO SANCTUARY',
    category: 'arcane',
    desc: 'Phase-shift leylines, spatial runes, and starfall matrices',
    skyCol: 0xff0d0618,
    platCol: 0xff221438,
    edgeCol: 0xff9966ff,
    hazardCol: 0xff8844ee,
    hazardName: 'WARP ANOMALY',
    particleChars: ['*', '+', '·'],
    particleColors: ['#b388ff', '#9966ff', '#ffffff'],
    bossName: 'CHRONO OVERLORD',
    enemyTypes: ['arcane', 'drone', 'slime'],
  },
  {
    id: 'scifi',
    name: 'THE QUANTUM FORGE',
    category: 'scifi',
    desc: 'EMP discharge grids, tractor beams, and photon sentinels',
    skyCol: 0xff040e14,
    platCol: 0xff0f2430,
    edgeCol: 0xff00ffff,
    hazardCol: 0xff00cccc,
    hazardName: 'LASER GRID',
    particleChars: ['-', '|', '+'],
    particleColors: ['#00ffff', '#00e5ff', '#ffffff'],
    bossName: 'QUANTUM TITAN',
    enemyTypes: ['quantum', 'drone', 'mutant'],
  },
  {
    id: 'holy',
    name: 'THE SOLAR ZENITH',
    category: 'holy',
    desc: 'Purging starlight halos, radiant sunbursts, and seraphim wards',
    skyCol: 0xff14120a,
    platCol: 0xff302c1c,
    edgeCol: 0xffffff99,
    hazardCol: 0xffffff55,
    hazardName: 'SOLAR RADIATION',
    particleChars: ['*', '♦', '·'],
    particleColors: ['#ffff99', '#ffffff', '#ffd700'],
    bossName: 'SERAPH OF DAWN',
    enemyTypes: ['arcane', 'drone', 'slime'],
  },
  {
    id: 'chaos',
    name: 'FRACTAL CHAOS SYNTHESIS',
    category: 'chaos',
    desc: 'Multi-element synthesized rift with hyper-dimensional mutators',
    skyCol: 0xff120816,
    platCol: 0xff2c1638,
    edgeCol: 0xffff0088,
    hazardCol: 0xffff0055,
    hazardName: 'CHAOS FLUX',
    particleChars: ['*', '!', '+', 'x'],
    particleColors: ['#ff0088', '#00f0ff', '#ffea00', '#ffffff'],
    bossName: 'ANOMALY ZERO (PRIMAL WYRM)',
    enemyTypes: ['pyro', 'cryo', 'storm', 'void'],
  },
];

export class LootDrop {
  constructor(x, y, type = 'coin', value = 15) {
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

    let color = 0xfff0b424; // Gold Aether Shard
    let glow = 0xfff0b424;

    if (this.type === 'xp') {
      color = 0xff8cd024; // Green XP orb
      glow = 0xff8cd024;
    } else if (this.type === 'heart') {
      color = 0xffff3366; // Red heart
      glow = 0xffff3366;
    } else if (this.type === 'star') {
      color = 0xffffff00; // Invulnerability Star
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
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.hit = false;
    this.bumpY = 0;
  }

  update(dt) {
    if (this.bumpY < 0) {
      this.bumpY += 40 * dt;
      if (this.bumpY > 0) this.bumpY = 0;
    }
  }

  onHit(player, world) {
    if (this.hit) return;
    this.hit = true;
    this.bumpY = -6;

    const roll = Math.random();
    if (roll < 0.25) {
      world.lootDrops.push(new LootDrop(this.x, this.y - 12, 'star', 0));
      world.addFloatingText('★ AETHER SURGE STAR! ★', this.x, this.y - 20, '#ffff00');
    } else if (roll < 0.6) {
      world.lootDrops.push(new LootDrop(this.x, this.y - 12, 'heart', 30));
      world.addFloatingText('+30 LIFE DEW', this.x, this.y - 20, '#ff3366');
    } else {
      for (let i = 0; i < 4; i++) {
        world.lootDrops.push(new LootDrop(this.x, this.y - 12, 'coin', 20));
      }
      world.addFloatingText('+80 SHARDS!', this.x, this.y - 20, '#00ff88');
    }
  }

  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;
    const bx = Math.round(this.x - this.w / 2);
    const by = Math.round(this.y + this.bumpY - this.h);

    const fillCol = this.hit ? 0xff403830 : 0xffd09820;
    const qCol = this.hit ? 0xff605850 : 0xffffffff;

    for (let dy = 0; dy < this.h; dy++) {
      for (let dx = 0; dx < this.w; dx++) {
        const px = bx + dx;
        const py = by + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const isBorder = dx === 0 || dx === this.w - 1 || dy === 0 || dy === this.h - 1;
          frame.color[py * W + px] = isBorder ? 0xff100c14 : fillCol;
        }
      }
    }

    if (!this.hit) {
      const qx = Math.round(this.x);
      const qy = Math.round(this.y + this.bumpY - this.h / 2);
      if (qx >= 0 && qx < W && qy >= 0 && qy < H) {
        frame.color[qy * W + qx] = qCol;
        frame.light[qy * W + qx] = qCol;
      }
    }
  }
}

export class PixelEnemy {
  constructor(x, y, type = 'slime', element = 'fire', customHp = null) {
    this.x = x;
    this.y = y;
    this.type = type; // 'slime', 'mutant', 'drone', 'warlord', 'pyro', 'cryo', 'storm', 'void', 'toxic', 'abyssal', 'quantum', 'arcane'
    this.element = element;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.isDead = false;
    this.hitFlashTimer = 0;
    this.poisonTimer = 0;
    this.attackCooldown = 2.0;

    if (type === 'warlord' || type === 'boss') {
      this.hp = customHp || 450;
      this.maxHp = this.hp;
      this.speed = 44;
      this.width = 30;
      this.height = 44;
    } else if (type === 'drone' || type === 'storm') {
      this.hp = customHp || 45;
      this.maxHp = this.hp;
      this.speed = 65;
      this.width = 18;
      this.height = 18;
      this.baseY = y;
    } else if (type === 'mutant' || type === 'void') {
      this.hp = customHp || 75;
      this.maxHp = this.hp;
      this.speed = 52;
      this.width = 22;
      this.height = 30;
    } else {
      this.hp = customHp || 40;
      this.maxHp = this.hp;
      this.speed = 46;
      this.width = 18;
      this.height = 18;
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

    // Boss Elemental Attack Barrage
    if (this.type === 'warlord' || this.type === 'boss') {
      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 3.0;
        world.spawnExplosion(playerX, world.groundY);
        world.addFloatingText('TITAN BARRAGE!', this.x, this.y - 48, '#ff0055');
      }
    }

    if (this.type === 'drone' || this.type === 'storm') {
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

    // Element-specific base coloring
    let baseColor = 0xff40b050; // Slime emerald
    if (this.type === 'warlord' || this.type === 'boss') baseColor = 0xff8020b0;
    else if (this.element === 'fire' || this.type === 'pyro') baseColor = 0xff2050ff;
    else if (this.element === 'ice' || this.type === 'cryo') baseColor = 0xffffd000;
    else if (this.element === 'lightning' || this.type === 'storm') baseColor = 0xff00e6ff;
    else if (this.element === 'shadow' || this.type === 'void') baseColor = 0xffb040c0;
    else if (this.type === 'drone') baseColor = 0xffd0a020;
    else if (this.type === 'mutant') baseColor = 0xffc04040;

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
    const barWidth = 24;
    const barX = bx - 12;
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

    // Boundless Spiral Infinite Floor Engine
    this.currentFloor = 1;
    this.currentSector = 1; // backwards-compatible
    this.sectorName = '';
    this.objective = '';
    this.activeBiome = ELEMENTAL_BIOMES[0];
    this.isBossFloor = false;

    // Celestial Ascension Portal (far right)
    this.warpPortal = { x: 295, y: 148, active: false };

    this.platforms = [];
    this.questionBlocks = [];
    this.enemies = [];
    this.hazards = [];
    this.lootDrops = [];
    this.activeFx = [];
    this.floatingTexts = [];

    // Narrative & interactive systems
    this.npcs = [];
    this.destructibles = [];
    this.sheep = [];
    this.slashArcs = [];
    this.particleEngine = new ParticleEngine();
    this.damageTexts = new DamageTextManager();
    this.dialogueBox = new DialogueBox();
    this.miniMap = new MiniMap(this.w, this.h);

    this.loadFloor(1);
  }

  get bestFloor() {
    return parseInt(localStorage.getItem('spiral_best_floor') || '1');
  }

  // Load any floor from 1 to Infinity!
  loadFloor(floorNumber) {
    this.currentFloor = Math.max(1, floorNumber);
    this.currentSector = this.currentFloor;
    this.warpPortal.active = false;
    this.lootDrops = [];
    this.activeFx = [];
    this.slashArcs = [];

    const biomeIdx = (this.currentFloor - 1) % ELEMENTAL_BIOMES.length;
    this.activeBiome = ELEMENTAL_BIOMES[biomeIdx];
    this.isBossFloor = (this.currentFloor % 5 === 0);

    if (this.isBossFloor) {
      this.sectorName = `FLOOR ${this.currentFloor}: ★ BOSS TRIAL — ${this.activeBiome.bossName}`;
      this.objective = `BOSS TRIAL ${this.currentFloor}: SLAY ${this.activeBiome.bossName} • CLAIM PRIMAL WEAPON UNLOCK!`;
    } else {
      this.sectorName = `FLOOR ${this.currentFloor}: ${this.activeBiome.name}`;
      this.objective = `FLOOR ${this.currentFloor}: PURGE ${this.activeBiome.category.toUpperCase()} HOSTILES • ACTIVATE ASCENSION GATE`;
    }

    // Procedural platforms seeded deterministically by floorNumber
    const seed = this.currentFloor;
    const pShift1 = Math.round(Math.sin(seed * 1.3) * 16);
    const pShift2 = Math.round(Math.cos(seed * 2.1) * 16);
    const pShift3 = Math.round(Math.sin(seed * 3.7) * 16);

    this.platforms = [
      { x1: 0, x2: 320, y: 148, isFloor: true },
      { x1: 35 + pShift1, x2: 110 + pShift1, y: 116 },
      { x1: 125 + pShift2, x2: 200 + pShift2, y: 84 },
      { x1: 215 + pShift3, x2: 290 + pShift3, y: 116 },
      { x1: 85 - pShift2, x2: 170 - pShift2, y: 56 },
    ];

    // Hazards (acid, lava, permafrost, voltage, void)
    this.hazards = [];
    if (this.currentFloor > 1 && !this.isBossFloor) {
      const hx1 = Math.max(50, Math.min(210, 120 + pShift1));
      this.hazards.push({
        x1: hx1,
        x2: hx1 + 60,
        y: 148,
        name: this.activeBiome.hazardName,
      });
    }

    // Question Blocks
    this.questionBlocks = [
      new QuestionBlock(70 + pShift1, 116),
      new QuestionBlock(160 + pShift2, 84),
      new QuestionBlock(250 + pShift3, 116),
    ];

    // Destructibles (crates, barrels, chests)
    this.destructibles = [
      new Destructible(95 + pShift1, 116, 'crate'),
      new Destructible(180 + pShift2, 84, this.currentFloor % 2 === 0 ? 'barrel' : 'crate'),
      new Destructible(135 - pShift2, 56, 'chest'),
      new Destructible(275 + pShift3, 116, 'chest'),
    ];

    // Enemies
    this.enemies = [];
    if (this.isBossFloor) {
      const bossHp = 420 + this.currentFloor * 90;
      const boss = new PixelEnemy(240, 148, 'warlord', this.activeBiome.category, bossHp);
      boss.name = this.activeBiome.bossName;
      this.enemies.push(boss);
      this.enemies.push(new PixelEnemy(160 + pShift2, 84, 'drone', this.activeBiome.category));
    } else {
      const enemyCount = Math.min(7, 3 + Math.floor(this.currentFloor * 0.35));
      const types = this.activeBiome.enemyTypes;
      const spawnSpots = [
        { x: 70 + pShift1, y: 116 },
        { x: 160 + pShift2, y: 84 },
        { x: 250 + pShift3, y: 116 },
        { x: 120 - pShift2, y: 56 },
        { x: 200, y: 148 },
        { x: 90, y: 148 },
        { x: 280, y: 148 },
      ];
      for (let i = 0; i < enemyCount; i++) {
        const spot = spawnSpots[i % spawnSpots.length];
        const t = types[i % types.length];
        const hpScale = Math.floor(1 + this.currentFloor * 0.08);
        this.enemies.push(new PixelEnemy(spot.x, spot.y, t, this.activeBiome.category, 35 * hpScale));
      }
    }

    // NPCs & Sanctuary Sheep
    this.npcs = [];
    this.sheep = [];
    if (this.currentFloor === 1 || this.currentFloor % 6 === 0) {
      this.npcs.push(new NPC(30, 148, 'Aria the Chronicler', 'chronicler', 'Ω'));
    }
    if (this.activeBiome.category === 'nature' || this.currentFloor % 4 === 0) {
      this.sheep.push(new Sheep(85 + pShift1, 148));
      this.sheep.push(new Sheep(220 + pShift3, 148));
    }

    // Celestial Ascension Portal (starts locked at far right)
    this.warpPortal = { x: 295, y: 148, active: false };
  }

  // Alias for backwards compatibility
  loadSector(num) {
    this.loadFloor(num);
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
  }

  spawnPoisonCloud(x, y) {
    const fx = createFx(poisonCloudMod, { x, y });
    this.activeFx.push({
      mod: poisonCloudMod,
      inst: fx,
      x,
      y,
      type: 'poison',
      radius: 48,
      life: 3.5,
    });
  }

  spawnCrit(x, y) {
    const fx = createFx(critHitMod, { x, y });
    this.activeFx.push({ mod: critHitMod, inst: fx, x, y, type: 'crit', life: 0.6 });
  }

  spawnExplosion(x, y) {
    const fx = createFx(barrelExplosionMod, { x, y });
    this.activeFx.push({ mod: barrelExplosionMod, inst: fx, x, y, type: 'explosion', radius: 42, life: 1.0 });
  }

  addSlashArc(x, y, facing) {
    this.slashArcs.push(new SlashArc(x, y, facing));
  }

  addFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({ text, x, y, color, life: 1.0, maxLife: 1.0 });
  }

  resolvePlayerCollision(px, py, pw, ph) {
    let newX = px;
    let newY = py;
    let onGround = false;

    // Bound in stage
    if (newX < pw / 2) newX = pw / 2;
    if (newX > this.w - pw / 2) newX = this.w - pw / 2;

    // Platform one-way collision
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
      const wantsInteract = input.wasJustPressed('flask') || input.wasJustPressed('Space') || input.wasJustPressed('KeyE');
      if (wantsInteract) {
        for (const npc of this.npcs) {
          if (Math.hypot(player.x - npc.x, player.y - npc.y) <= npc.promptDistance) {
            npc.interact(player, this.dialogueBox, this.damageTexts, this);
            if (soundSynth) soundSynth.playCoin();
            break;
          }
        }
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

    // 2. Ambient weather & particles
    if (Math.random() < 0.4) {
      this.particleEngine.emitSparks(
        Math.random() * this.w,
        Math.random() * 140,
        1,
        this.activeBiome.particleChars
      );
    }

    // 3. Update NPCs & Sheep
    for (const s of this.sheep) {
      s.update(dt, this, player, this.damageTexts, this.particleEngine);
    }

    // 4. Update Slash Arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.update(dt, player.x, player.y);
      if (arc.isFinished) {
        this.slashArcs.splice(i, 1);
        continue;
      }
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

    // 5. Update Particle Engine & Combat Texts
    this.particleEngine.update(dt);
    this.damageTexts.update(dt);

    // 6. Check if all floor hostiles are cleared
    const aliveEnemies = this.enemies.filter((e) => !e.isDead);
    if (aliveEnemies.length === 0 && !this.warpPortal.active) {
      this.warpPortal.active = true;
      this.addFloatingText('★ ASCENSION GATE OPEN! ★', this.warpPortal.x, this.warpPortal.y - 25, '#00f0ff');
      if (soundSynth) soundSynth.playVictory();
    }

    // 7. Step into Celestial Ascension Gate to ascend to Floor N + 1
    if (this.warpPortal.active && Math.hypot(player.x - this.warpPortal.x, player.y - this.warpPortal.y) < 18) {
      const nextFloor = this.currentFloor + 1;
      this.loadFloor(nextFloor);
      player.x = 40;
      player.y = 140;

      // Milestone weapon unlocks!
      if (nextFloor === 2) player.unlockWeapon('sword');
      if (nextFloor === 4) player.unlockWeapon('pistol');
      if (nextFloor === 7) player.unlockWeapon('rocket');
      if (nextFloor === 10) player.unlockWeapon('lightning');

      // Shard bonus
      const bonus = nextFloor * 30;
      player.coins = (player.coins || 0) + bonus;
      this.addFloatingText(`ASCENDED TO FLOOR ${nextFloor}! (+${bonus} SHARDS)`, 160, 60, '#00ff88');
      if (soundSynth) soundSynth.playVictory();

      // Persist highest floor reached in localStorage
      const best = Math.max(nextFloor, parseInt(localStorage.getItem('spiral_best_floor') || '1'));
      localStorage.setItem('spiral_best_floor', best.toString());
      return;
    }

    // 8. Hazard Checks
    for (const haz of this.hazards) {
      if (player.x >= haz.x1 && player.x <= haz.x2 && player.y >= haz.y - 4) {
        const hazDmg = 16 * dt;
        player.takeDamage(hazDmg);
        if (Math.random() < 0.15) {
          this.addFloatingText(`-${haz.name || 'HAZARD'}!`, player.x, player.y - 15, '#ff3030');
          this.particleEngine.emitSparks(player.x, player.y, 2, ['~', '°']);
        }
      }
    }

    // 9. Update Question Blocks
    for (const qb of this.questionBlocks) {
      qb.update(dt);
      if (!qb.hit && Math.abs(player.x - qb.x) < 12) {
        if (player.y - 32 <= qb.y && player.y - 32 >= qb.y - 12 && player.vy < 0) {
          qb.onHit(player, this);
          player.vy = 80;
          if (soundSynth) soundSynth.playCoin();
        }
      }
    }

    // 10. Update Destructibles
    for (const d of this.destructibles) {
      d.update(dt, player, this.damageTexts, this.particleEngine);
    }

    // 11. Aerocast Mario Stomping onto Enemies
    for (const e of this.enemies) {
      if (!e.isDead) {
        const dx = Math.abs(player.x - e.x);
        const feetY = player.y;
        const enemyTopY = e.y - e.height;

        if (dx < e.width / 2 + 5 && feetY >= enemyTopY && feetY <= enemyTopY + 12 && player.vy > 0) {
          const stompDamage = Math.floor(45 * player.damageMultiplier);
          e.takeDamage(stompDamage);
          this.spawnCrit(e.x, enemyTopY);
          this.addFloatingText(`STOMP! -${stompDamage}`, e.x, enemyTopY - 10, '#ffff00');

          player.vy = -310;
          player.onGround = false;
          if (soundSynth) soundSynth.playDash();

          if (e.isDead) {
            player.kills++;
            player.score += e.type === 'warlord' ? 1500 : 150;
            this.spawnLoot(e.x, e.y, e.type);
          }
          break;
        }

        // Enemy collision against player
        if (dx < e.width / 2 + 6 && Math.abs(player.y - 15 - (e.y - e.height / 2)) < e.height / 2 + 10) {
          if (player.starPowerTimer > 0) {
            e.takeDamage(999);
            this.spawnExplosion(e.x, e.y - 10);
            this.addFloatingText('VAPORIZED!', e.x, e.y - 15, '#ffff00');
            if (e.isDead) {
              player.kills++;
              this.spawnLoot(e.x, e.y, e.type);
            }
          } else {
            const hitDmg = e.type === 'warlord' ? 24 : 12;
            player.takeDamage(hitDmg);
            player.vx = (player.x > e.x ? 1 : -1) * 140;
            player.vy = -120;
            this.addFloatingText(`-${hitDmg}`, player.x, player.y - 20, '#ff3344');
          }
        }
      }
    }

    // 12. Update Enemies
    for (const e of this.enemies) {
      e.update(dt, player.x, player.y, this);
    }

    // 13. Update Active Pixel FX
    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const item = this.activeFx[i];
      item.inst.step(dt);
      item.life -= dt;

      if (item.type === 'poison') {
        for (const e of this.enemies) {
          if (!e.isDead && Math.hypot(e.x - item.x, e.y - 10 - item.y) <= item.radius) {
            e.poisonTimer = 2.0;
          }
        }
      }

      if (item.type === 'explosion' && item.life > 0.85) {
        for (const e of this.enemies) {
          if (!e.isDead && Math.hypot(e.x - item.x, e.y - 10 - item.y) <= item.radius) {
            e.takeDamage(55);
            this.addFloatingText('-55', e.x, e.y - 20, '#ff9900');
          }
        }
      }

      if (item.life <= 0) {
        this.activeFx.splice(i, 1);
      }
    }

    // 14. Update Loot Drops
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      drop.update(dt, player.x, player.y, player.magnetRadius, this);

      if (Math.hypot(player.x - drop.x, player.y - 15 - drop.y) < 14) {
        drop.isCollected = true;
        if (drop.type === 'coin') {
          player.coins = (player.coins || 0) + drop.value;
          player.score += drop.value * 10;
          this.addFloatingText(`+${drop.value} SHARDS`, drop.x, drop.y - 10, '#ffea00');
          if (soundSynth) soundSynth.playCoin();
        } else if (drop.type === 'xp') {
          player.gainXP(drop.value);
          this.addFloatingText(`+${drop.value} XP`, drop.x, drop.y - 10, '#76ff03');
          if (soundSynth) soundSynth.playCoin();
        } else if (drop.type === 'heart') {
          player.hp = Math.min(player.maxHp, player.hp + drop.value);
          this.addFloatingText(`+${drop.value} HP`, drop.x, drop.y - 10, '#ff3366');
          if (soundSynth) soundSynth.playHeal();
        } else if (drop.type === 'star') {
          player.starPowerTimer = 8.0;
          this.addFloatingText('★ AETHER SURGE! ★', drop.x, drop.y - 10, '#ffff00');
          if (soundSynth) soundSynth.playVictory();
        }
        this.lootDrops.splice(i, 1);
        continue;
      }

      if (drop.life <= 0) {
        this.lootDrops.splice(i, 1);
      }
    }

    // 15. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 18 * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;

    // Background sky color based on active elemental biome
    const skyCol = theme === 'bw' ? 0xff080808 : theme === 'green' ? 0xff041008 : this.activeBiome.skyCol;
    for (let i = 0; i < W * H; i++) {
      frame.color[i] = skyCol;
    }

    // Draw Platforms styled by elemental biome
    const platCol = theme === 'bw' ? 0xffaaaaaa : this.activeBiome.platCol;
    const edgeCol = theme === 'bw' ? 0xffffffff : this.activeBiome.edgeCol;

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

    // Elemental Hazards (Lava, Permafrost, Voltage, Acid, Void)
    for (const haz of this.hazards) {
      const y = Math.round(haz.y);
      const x1 = Math.round(haz.x1);
      const x2 = Math.round(haz.x2);
      const hazCol = theme === 'bw' ? 0xff888888 : this.activeBiome.hazardCol;
      for (let x = x1; x <= x2; x++) {
        for (let dy = 0; dy < 4; dy++) {
          const py = y + dy;
          if (py < H) {
            frame.color[py * W + x] = hazCol;
            frame.light[py * W + x] = hazCol;
          }
        }
      }
    }

    // Draw Celestial Ascension Gate
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

    // Draw Sanctuary Sheep
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

  // Draw 2D canvas overlay (MiniMap, damage numbers, dialogs, slash arcs)
  drawOverlay(ctx, scaleX = 3, scaleY = 3, viewWidth = 960, viewHeight = 540, player = null) {
    ctx.save();

    // 1. Slash Arcs
    for (const arc of this.slashArcs) {
      arc.draw(ctx, scaleX, scaleY);
    }

    // 2. Destructibles 2D Overlay
    for (const d of this.destructibles) {
      d.drawOverlay(ctx, scaleX, scaleY);
    }

    // 3. Floating Combat Texts
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(ft.text, ft.x * scaleX, ft.y * scaleY);
    }
    ctx.globalAlpha = 1.0;

    // 4. DamageTextManager
    this.damageTexts.draw(ctx, scaleX, scaleY);

    // 5. ParticleEngine (ambient weather / sparks)
    this.particleEngine.draw(ctx, scaleX, scaleY);

    // 6. Tactical Radar MiniMap
    if (this.miniMap && player) {
      this.miniMap.render(ctx, viewWidth, player, this);
    }

    // 7. Dialogue Box
    if (this.dialogueBox && this.dialogueBox.isOpen) {
      this.dialogueBox.draw(ctx, viewWidth, viewHeight);
    }

    ctx.restore();
  }
}
