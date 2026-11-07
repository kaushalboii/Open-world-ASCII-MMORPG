// Entity Manager for Tiny Glyphs
// Manages Rogue Knights, Spearmen, Grazing Sheep, and Loot Pickups

import { Enemy } from './Enemy.js';
import { Sheep } from '../world/Sheep.js';
import { NPC } from './NPC.js';
import { Destructible } from '../world/Destructibles.js';
import { Boss } from './Boss.js';
import { TileType, TILE_SIZE } from '../world/WorldMap.js';

export class EntityManager {
  constructor() {
    this.enemies = [];
    this.sheep = [];
    this.npcs = [];
    this.destructibles = [];
    this.boss = null;
    this.pickups = []; // { x, y, type: 'gold'|'heart', value, glyph, age }
    this.respawnTimer = 0;
  }

  initWorldEntities(worldMap) {
    // 1. Spawn Sheep in open grassy areas
    const sheepLocations = [
      { x: 42, y: 38 },
      { x: 46, y: 44 },
      { x: 55, y: 32 },
      { x: 58, y: 40 },
      { x: 62, y: 46 },
      { x: 70, y: 48 },
      { x: 78, y: 52 },
      { x: 84, y: 42 }
    ];

    for (const loc of sheepLocations) {
      if (worldMap.getTile(loc.x, loc.y) === TileType.GRASS) {
        this.sheep.push(new Sheep(loc.x * TILE_SIZE + 8, loc.y * TILE_SIZE + 8));
      }
    }

    // 2. Spawn Interactive NPCs
    // King in the Castle Keep
    this.npcs.push(new NPC(35 * TILE_SIZE + 8, 17 * TILE_SIZE + 8, 'King Elden', 'king', 'K'));
    // Blacksmith at the village forge
    this.npcs.push(new NPC(65 * TILE_SIZE + 8, 32 * TILE_SIZE + 8, 'Smith Brand', 'blacksmith', 'B'));
    // Shepherd in the central meadow
    this.npcs.push(new NPC(54 * TILE_SIZE + 8, 42 * TILE_SIZE + 8, 'Old Shepherd', 'shepherd', 'S'));

    // 3. Spawn Smashable Crates, Barrels, and Treasure Chests
    const destructibleSpawns = [
      // Castle Treasure
      { x: 26, y: 15, type: 'chest' },
      { x: 43, y: 15, type: 'chest' },
      { x: 27, y: 24, type: 'crate' },
      { x: 42, y: 24, type: 'barrel' },
      // Village Crates & Barrels
      { x: 63, y: 31, type: 'barrel' },
      { x: 68, y: 31, type: 'crate' },
      { x: 75, y: 29, type: 'crate' },
      { x: 78, y: 43, type: 'barrel' },
      // Secret Island Chest (Southwest islet)
      { x: 24, y: 60, type: 'chest' },
      // Eastern Grove Chest
      { x: 88, y: 52, type: 'chest' }
    ];

    for (const d of destructibleSpawns) {
      this.destructibles.push(new Destructible(d.x * TILE_SIZE + 8, d.y * TILE_SIZE + 8, d.type));
    }

    // 4. Spawn Rogue Knights & Spearmen guarding paths and outskirts
    const enemySpawns = [
      // Castle guard patrol
      { x: 30, y: 28, type: 'knight' },
      { x: 40, y: 28, type: 'spearman' },
      // Crossroads ambush
      { x: 48, y: 36, type: 'knight' },
      { x: 54, y: 44, type: 'spearman' },
      // Eastern village raiders
      { x: 66, y: 38, type: 'knight' },
      { x: 76, y: 34, type: 'knight' },
      { x: 82, y: 48, type: 'spearman' },
      // Southern shore bandits
      { x: 46, y: 58, type: 'spearman' },
      { x: 58, y: 56, type: 'knight' },
      // Southwest outpost
      { x: 26, y: 60, type: 'knight' }
    ];

    for (const sp of enemySpawns) {
      this.enemies.push(new Enemy(sp.x * TILE_SIZE + 8, sp.y * TILE_SIZE + 8, sp.type));
    }
  }

  update(dt, player, worldMap, camera, particles, damageText) {
    // 1. Update Sheep
    for (const s of this.sheep) {
      s.update(dt, worldMap, player, damageText, particles);
    }

    // 2. Update Enemies & Check Sword Collision
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, player, worldMap, camera, particles, damageText);

      // Check sword collision with player's active slash arc
      if (player.isSlashing && player.activeSlashArc && !e.isDead) {
        if (player.activeSlashArc.checkHit(e.x, e.y, e.radius)) {
          // Calculate damage with critical hit chance
          const isCrit = Math.random() < 0.25;
          const damage = isCrit ? 30 : 16;
          const knockbackAngle = Math.atan2(e.y - player.y, e.x - player.x);

          e.takeDamage(damage, knockbackAngle, camera, damageText, particles);

          if (e.isDead && !e.lootDropped) {
            e.lootDropped = true;
            player.kills++;
            // Drop loot
            this.dropLoot(e.x, e.y);
          }
        }
      }

      if (e.isDead) {
        this.enemies.splice(i, 1);
      }
    }

    // 2b. Check sword collision with destructibles (crates, barrels, chests)
    if (player.isSlashing && player.activeSlashArc) {
      for (const d of this.destructibles) {
        if (!d.isBroken && player.activeSlashArc.checkHit(d.x, d.y, d.radius)) {
          d.smash(player, this, particles, damageText, camera);
        }
      }
    }

    // 3. Update Pickups & Player Collection
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.age += dt;

      // Pickup attraction / magnetic pull
      const dist = Math.hypot(player.x - p.x, player.y - p.y);
      if (dist < 36 && !player.isDead) {
        p.x += ((player.x - p.x) / dist) * 120 * dt;
        p.y += ((player.y - p.y) / dist) * 120 * dt;
      }

      // Collect
      if (dist < 12 && !player.isDead) {
        if (p.type === 'gold') {
          player.addGold(p.value, damageText);
        } else if (p.type === 'heart') {
          player.heal(p.value, damageText);
        }
        particles.emitSparks(p.x, p.y, 6, ['*', '+']);
        this.pickups.splice(i, 1);
      }
    }

    // 4. Ambient enemy respawner to keep the world lively
    if (this.enemies.length < 5) {
      this.respawnTimer += dt;
      if (this.respawnTimer > 7) {
        this.respawnTimer = 0;
        this.spawnRandomEnemy(worldMap, player);
      }
    }
  }

  dropLoot(x, y) {
    // Always drop gold
    this.pickups.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      type: 'gold',
      value: 10 + Math.floor(Math.random() * 15),
      glyph: '$',
      age: 0
    });

    // 40% chance of health heart drop
    if (Math.random() < 0.4) {
      this.pickups.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        type: 'heart',
        value: 25,
        glyph: '♥',
        age: 0
      });
    }
  }

  spawnRandomEnemy(worldMap, player) {
    // Find grass tile off-screen from player
    for (let attempts = 0; attempts < 30; attempts++) {
      const tx = Math.floor(Math.random() * (worldMap.width - 10)) + 5;
      const ty = Math.floor(Math.random() * (worldMap.height - 10)) + 5;
      if (worldMap.getTile(tx, ty) === TileType.GRASS || worldMap.getTile(tx, ty) === TileType.PATH) {
        const wx = tx * TILE_SIZE + 8;
        const wy = ty * TILE_SIZE + 8;
        const dist = Math.hypot(player.x - wx, player.y - wy);
        if (dist > 250) {
          const type = Math.random() > 0.5 ? 'knight' : 'spearman';
          this.enemies.push(new Enemy(wx, wy, type));
          break;
        }
      }
    }
  }

  render(ctx, camera, player = null) {
    // 1. Render Destructibles (Crates, Barrels, Chests)
    for (const d of this.destructibles) {
      d.render(ctx, camera);
    }

    // 2. Render Pickups
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px monospace';

    for (const p of this.pickups) {
      const screen = camera.worldToScreen(p.x, p.y);
      // Subtle float oscillation
      const offsetY = Math.sin(p.age * 6) * 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.glyph, screen.x, screen.y + offsetY);
    }
    ctx.restore();

    // 3. Render Interactive NPCs
    for (const npc of this.npcs) {
      npc.render(ctx, camera, player);
    }

    // 4. Render Sheep
    for (const s of this.sheep) {
      s.render(ctx, camera);
    }

    // 5. Render Enemies
    for (const e of this.enemies) {
      e.render(ctx, camera);
    }
  }
}

