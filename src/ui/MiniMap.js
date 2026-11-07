// Real-time Tactical Radar & Mini-Map for The Boundless Spiral
// Renders chamber platforms, player coordinates, enemy signals, crates, and celestial gates

import { TileType } from '../world/WorldMap.js';

export class MiniMap {
  constructor(worldMapOrStageW = 320, stageH = 180) {
    if (worldMapOrStageW && worldMapOrStageW.getTile) {
      this.worldMap = worldMapOrStageW;
      this.mapW = this.worldMap.width;
      this.mapH = this.worldMap.height;
      this.scale = 1.35;
      this.width = Math.round(this.mapW * this.scale);
      this.height = Math.round(this.mapH * this.scale);
      this.terrainCanvas = document.createElement('canvas');
      this.terrainCanvas.width = this.width;
      this.terrainCanvas.height = this.height;
      this.bakeTerrain();
    } else {
      this.worldMap = null;
      this.stageW = typeof worldMapOrStageW === 'number' ? worldMapOrStageW : 320;
      this.stageH = stageH;
      this.width = 124;
      this.height = 54;
    }
    this.visible = true;
  }

  bakeTerrain() {
    if (!this.worldMap) return;
    const ctx = this.terrainCanvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.width, this.height);

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const tile = this.worldMap.getTile(x, y);
        const px = Math.round(x * this.scale);
        const py = Math.round(y * this.scale);

        if (tile === TileType.GRASS || tile === TileType.PATH || tile === TileType.BRIDGE) {
          ctx.fillStyle = '#444444';
          ctx.fillRect(px, py, Math.ceil(this.scale), Math.ceil(this.scale));
        } else if (tile === TileType.SAND) {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(px, py, Math.ceil(this.scale), Math.ceil(this.scale));
        } else if (tile === TileType.WALL || tile === TileType.STRUCTURE) {
          ctx.fillStyle = '#888888';
          ctx.fillRect(px, py, Math.ceil(this.scale), Math.ceil(this.scale));
        }
      }
    }
  }

  render(ctx, viewWidth, player, worldOrEntityManager) {
    if (!this.visible) return;

    ctx.save();
    const margin = 16;
    const posX = viewWidth - this.width - margin;
    const posY = 64; // Below top-right HUD banner

    // Tactical Frame Border & Dark Glass
    ctx.fillStyle = 'rgba(8, 8, 14, 0.88)';
    ctx.fillRect(posX, posY, this.width, this.height);
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    ctx.strokeRect(posX, posY, this.width, this.height);

    // Header label
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('RADAR SCAN', posX + 6, posY + 10);

    // Sector Platform Mode (PixelWorld)
    if (worldOrEntityManager && worldOrEntityManager.platforms) {
      const world = worldOrEntityManager;
      const sx = this.width / (world.w || 320);
      const sy = this.height / (world.h || 180);

      // Draw Platforms as subtle lines
      ctx.strokeStyle = '#444466';
      ctx.lineWidth = 1.5;
      for (const plat of world.platforms) {
        ctx.beginPath();
        ctx.moveTo(posX + plat.x1 * sx, posY + plat.y * sy);
        ctx.lineTo(posX + plat.x2 * sx, posY + plat.y * sy);
        ctx.stroke();
      }

      // Draw Crates & Question Blocks as yellow dots
      ctx.fillStyle = '#ffea00';
      if (world.questionBlocks) {
        for (const qb of world.questionBlocks) {
          if (!qb.hit) {
            ctx.fillRect(posX + qb.x * sx - 1, posY + qb.y * sy - 1, 2, 2);
          }
        }
      }
      if (world.destructibles) {
        for (const d of world.destructibles) {
          if (!d.isBroken) {
            ctx.fillRect(posX + d.x * sx - 1, posY + d.y * sy - 1, 2, 2);
          }
        }
      }

      // Draw NPCs as green dots
      if (world.npcs) {
        ctx.fillStyle = '#00ff88';
        for (const npc of world.npcs) {
          ctx.fillRect(posX + npc.x * sx - 1, posY + npc.y * sy - 1, 3, 3);
        }
      }

      // Draw Warp Portal as pulsing cyan ring
      if (world.warpPortal) {
        ctx.strokeStyle = world.warpPortal.active ? '#00f0ff' : '#444466';
        ctx.beginPath();
        ctx.arc(posX + world.warpPortal.x * sx, posY + (world.warpPortal.y - 10) * sy, 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Enemies as red dots
      ctx.fillStyle = '#ff3344';
      if (world.enemies) {
        for (const e of world.enemies) {
          if (!e.isDead) {
            const ew = e.type === 'warlord' ? 4 : 2;
            ctx.fillRect(posX + e.x * sx - Math.floor(ew / 2), posY + (e.y - (e.height || 16) / 2) * sy - Math.floor(ew / 2), ew, ew);
          }
        }
      }

      // Draw Player (@) as bright white/cyan dot
      if (player) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('@', posX + player.x * sx, posY + (player.y - 12) * sy);
      }
    } else if (this.terrainCanvas && this.worldMap) {
      // Legacy island mode
      ctx.drawImage(this.terrainCanvas, posX, posY);
      if (worldOrEntityManager && worldOrEntityManager.enemies) {
        ctx.fillStyle = '#ff4444';
        for (const e of worldOrEntityManager.enemies) {
          if (!e.isDead) {
            const ex = posX + Math.round((e.x / this.worldMap.worldWidth) * this.width);
            const ey = posY + Math.round((e.y / this.worldMap.worldHeight) * this.height);
            ctx.fillRect(ex - 1, ey - 1, 2, 2);
          }
        }
      }
      if (player) {
        const px = posX + Math.round((player.x / this.worldMap.worldWidth) * this.width);
        const py = posY + Math.round((player.y / this.worldMap.worldHeight) * this.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('@', px, py);
      }
    }

    ctx.restore();
  }
}

