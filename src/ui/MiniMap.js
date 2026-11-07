// Real-time Mini-Map Radar for Tiny Glyphs
// Shows the entire island silhouette, player position, enemies, and castle

import { TileType } from '../world/WorldMap.js';

export class MiniMap {
  constructor(worldMap) {
    this.worldMap = worldMap;
    this.mapW = worldMap.width;
    this.mapH = worldMap.height;
    this.scale = 1.35; // 1 pixel per tile * scale
    this.width = Math.round(this.mapW * this.scale);
    this.height = Math.round(this.mapH * this.scale);
    this.visible = true;

    // Pre-bake static island terrain into an offscreen canvas
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = this.width;
    this.terrainCanvas.height = this.height;
    this.bakeTerrain();
  }

  bakeTerrain() {
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

  render(ctx, viewWidth, player, entityManager) {
    if (!this.visible) return;

    ctx.save();
    const margin = 14;
    const posX = viewWidth - this.width - margin;
    const posY = 72; // Below top-right HUD banner

    // Border & Background
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.fillRect(posX - 2, posY - 2, this.width + 4, this.height + 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(posX - 2, posY - 2, this.width + 4, this.height + 4);

    // Draw pre-baked island terrain
    ctx.drawImage(this.terrainCanvas, posX, posY);

    // Draw Enemies as gray dots
    ctx.fillStyle = '#aaaaaa';
    for (const e of entityManager.enemies) {
      if (!e.isDead) {
        const ex = posX + Math.round((e.x / this.worldMap.worldWidth) * this.width);
        const ey = posY + Math.round((e.y / this.worldMap.worldHeight) * this.height);
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
      }
    }

    // Draw Castle Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const castleX = posX + Math.round((34 / this.mapW) * this.width);
    const castleY = posY + Math.round((20 / this.mapH) * this.height);
    ctx.fillText('⌂', castleX, castleY);

    // Draw Player (@) with pulsing glow
    const px = posX + Math.round((player.x / this.worldMap.worldWidth) * this.width);
    const py = posY + Math.round((player.y / this.worldMap.worldHeight) * this.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('@', px, py);

    ctx.restore();
  }
}
