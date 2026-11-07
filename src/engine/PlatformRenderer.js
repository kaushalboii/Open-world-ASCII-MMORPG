// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)

export class PlatformRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 640;
    this.height = 384;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  render(level, player, enemies, projectiles, particles, damageText, camera, dt) {
    // 1. Clear Screen
    this.ctx.fillStyle = '#080808';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Render Level (Parallax skyline, platforms, neon signs, hazards)
    level.render(this.ctx, camera);

    // 3. Render Enemies
    for (const e of enemies) {
      e.render(this.ctx, camera);
    }

    // 4. Render Projectiles & Poison Clouds
    projectiles.render(this.ctx, camera);

    // 5. Render Player Character
    player.render(this.ctx, camera);

    // 6. Render Particles & Floating Damage
    particles.render(this.ctx, camera);
    damageText.render(this.ctx, camera);

    // 7. Render Modern Retro HUD
    this.renderHUD(player, enemies);

    // 8. Game Over Screen
    if (player.isDead) {
      this.renderGameOver(player);
    }
  }

  renderHUD(player, enemies) {
    this.ctx.save();
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const barX = 14;
    const barY = 12;

    // HUD Container
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    this.ctx.fillRect(barX - 4, barY - 4, 230, 50);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX - 4, barY - 4, 230, 50);

    // HP Bar
    const hpPct = Math.max(0, player.hp / player.maxHp);
    const hpBarW = 110;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`CYBER NINJA`, barX, barY);
    this.ctx.fillStyle = '#222222';
    this.ctx.fillRect(barX + 90, barY + 2, hpBarW, 8);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(barX + 90, barY + 2, hpBarW * hpPct, 8);

    // Poison Flasks & Kills
    this.ctx.fillText(`FLASKS: ${'(o) '.repeat(player.flasks)}`, barX, barY + 16);
    this.ctx.fillText(`ROGUES VANQUISHED: ${player.kills}`, barX, barY + 30);

    // Top-Right Title
    this.ctx.textAlign = 'right';
    const rightX = this.width - 14;
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    this.ctx.fillRect(rightX - 160, barY - 4, 164, 40);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.strokeRect(rightX - 160, barY - 4, 164, 40);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`TINY GLYPHS`, rightX, barY);
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText(`2D ASCII ACTION`, rightX, barY + 16);

    // Bottom Controls Reminder
    this.ctx.textAlign = 'center';
    this.ctx.font = '11px monospace';
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.75)';
    this.ctx.fillRect(this.width / 2 - 250, this.height - 24, 500, 20);
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText(`A / D: Run | W / SPACE: Jump (Double Jump!) | J / CLICK: Punch | K: Poison Flask | M: Mute`, this.width / 2, this.height - 20);

    this.ctx.restore();
  }

  renderGameOver(player) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const boxW = 340;
    const boxH = 160;
    const boxX = this.width / 2 - boxW / 2;
    const boxY = this.height / 2 - boxH / 2;

    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(boxX, boxY, boxW, boxH);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boxX, boxY, boxW, boxH);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText('† SYSTEM TERMINATED †', this.width / 2, boxY + 34);

    this.ctx.font = '13px monospace';
    this.ctx.fillStyle = '#cccccc';
    this.ctx.fillText(`ENEMIES DEFEATED: ${player.kills}`, this.width / 2, boxY + 70);

    this.ctx.font = 'bold 13px monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('[ PRESS "R" TO RESTART ]', this.width / 2, boxY + 115);

    this.ctx.restore();
  }
}

