// High-Performance Black & White ASCII Monospace Renderer for Tiny Glyphs

import { TileType, TILE_SIZE } from '../world/WorldMap.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.invertTimer = 0;

    // Fixed internal resolution for retro aesthetic
    this.width = 640;
    this.height = 384;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.imageSmoothingEnabled = false;
  }

  triggerInvert(duration = 0.06) {
    this.invertTimer = duration;
  }

  render(worldMap, player, entityManager, particles, damageText, camera, dt, miniMap = null) {
    if (this.invertTimer > 0) this.invertTimer -= dt;
    const isInverted = this.invertTimer > 0;

    // 1. Clear Screen
    this.ctx.fillStyle = isInverted ? '#ffffff' : '#0a0a0a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Render Visible World Map Tiles
    const bounds = camera.getVisibleTileBounds(TILE_SIZE, worldMap.width, worldMap.height);

    this.ctx.font = '13px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let ty = bounds.startY; ty <= bounds.endY; ty++) {
      for (let tx = bounds.startX; tx <= bounds.endX; tx++) {
        const tileType = worldMap.getTile(tx, ty);
        let glyph = worldMap.getGlyph(tx, ty);

        // Water tile animation
        if (tileType === TileType.WATER) {
          const shift = (tx + ty + worldMap.waterFrame) % 3;
          glyph = shift === 0 ? '~' : (shift === 1 ? '≈' : '∿');
        }

        const wx = tx * TILE_SIZE + TILE_SIZE / 2;
        const wy = ty * TILE_SIZE + TILE_SIZE / 2;
        const screen = camera.worldToScreen(wx, wy);

        // Styling based on tile type
        if (tileType === TileType.WATER) {
          this.ctx.fillStyle = isInverted ? '#000000' : '#333333';
        } else if (tileType === TileType.SAND) {
          this.ctx.fillStyle = isInverted ? '#222222' : '#666666';
        } else if (tileType === TileType.GRASS) {
          this.ctx.fillStyle = isInverted ? '#111111' : '#555555';
        } else if (tileType === TileType.PATH || tileType === TileType.BRIDGE) {
          this.ctx.fillStyle = isInverted ? '#000000' : '#888888';
        } else if (tileType === TileType.WALL || tileType === TileType.STRUCTURE) {
          this.ctx.fillStyle = isInverted ? '#000000' : '#ffffff';
        } else if (tileType === TileType.TREE) {
          this.ctx.fillStyle = isInverted ? '#000000' : '#cccccc';
        } else {
          this.ctx.fillStyle = isInverted ? '#000000' : '#ffffff';
        }

        this.ctx.fillText(glyph, screen.x, screen.y);
      }
    }

    // 3. Render Structures & Chimney Smoke Emitters
    for (const struct of worldMap.structures) {
      if (struct.chimneyX && struct.chimneyY && Math.random() < 0.05) {
        particles.emitSmoke(struct.chimneyX, struct.chimneyY, 1);
      }
    }

    // 4. Render Entities (Sheep, Enemies, Pickups, NPCs, Destructibles)
    entityManager.render(this.ctx, camera, player);

    // 5. Render Player
    player.render(this.ctx, camera);

    // 6. Render Particles
    particles.render(this.ctx, camera);

    // 7. Render Floating Damage Text
    damageText.render(this.ctx, camera);

    // 8. Render Monochrome Retro HUD
    this.renderHUD(player, entityManager);

    // 9. Render MiniMap (if available)
    if (miniMap) {
      miniMap.render(this.ctx, this.width, player, entityManager);
    }

    // 10. Game Over Screen (if dead)
    if (player.isDead) {
      this.renderGameOver(player);
    }
  }

  renderHUD(player, entityManager) {
    this.ctx.save();
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    // HUD Top-Left: Status bar
    const barX = 14;
    const barY = 12;

    // Heart string: calculate filled and hollow hearts
    const heartsTotal = 5;
    const heartsFilled = Math.ceil((player.hp / player.maxHp) * heartsTotal);
    let heartStr = '';
    for (let i = 0; i < heartsTotal; i++) {
      heartStr += i < heartsFilled ? '♥ ' : '♡ ';
    }

    // High contrast HUD background box
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    this.ctx.fillRect(barX - 4, barY - 4, 210, 52);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX - 4, barY - 4, 210, 52);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`KNIGHT  ${heartStr}`, barX, barY);
    this.ctx.fillText(`GOLD: $${player.gold}    KILLS: ${player.kills}`, barX, barY + 16);
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText(`ENEMIES REMAINING: ${entityManager.enemies.length}`, barX, barY + 32);

    // HUD Top-Right: Equipment / Status
    this.ctx.textAlign = 'right';
    const rightX = this.width - 14;
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    this.ctx.fillRect(rightX - 170, barY - 4, 174, 52);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.strokeRect(rightX - 170, barY - 4, 174, 52);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`TINY GLYPHS`, rightX, barY);
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText(`[BLADE] Steel Sword`, rightX, barY + 16);
    this.ctx.fillText(`[SHIELD] Kite Shield`, rightX, barY + 32);

    // Bottom Controls Hint
    this.ctx.textAlign = 'center';
    this.ctx.font = '11px monospace';
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.75)';
    this.ctx.fillRect(this.width / 2 - 220, this.height - 24, 440, 20);
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText(`WASD: Move | SPACE/CLICK: Slash | SHIFT: Dash | Q/E: Block | M: Mute`, this.width / 2, this.height - 20);

    this.ctx.restore();
  }

  renderGameOver(player) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Banner Box
    const boxW = 340;
    const boxH = 170;
    const boxX = this.width / 2 - boxW / 2;
    const boxY = this.height / 2 - boxH / 2;

    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(boxX, boxY, boxW, boxH);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boxX, boxY, boxW, boxH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText('† YOU PERISHED †', this.width / 2, boxY + 36);

    this.ctx.font = '13px monospace';
    this.ctx.fillStyle = '#cccccc';
    this.ctx.fillText(`GOLD COLLECTED: $${player.gold}`, this.width / 2, boxY + 70);
    this.ctx.fillText(`ROGUES VANQUISHED: ${player.kills}`, this.width / 2, boxY + 92);

    this.ctx.font = 'bold 13px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('[ PRESS "R" TO RESPAWN ]', this.width / 2, boxY + 130);

    this.ctx.restore();
  }
}

