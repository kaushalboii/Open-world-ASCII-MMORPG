// 2D Side-Scrolling Platform Level in ASCII
// Platforms, Girders, Rooftops, Toxic Sludge Pits, and Parallax Background

export class PlatformLevel {
  constructor(width = 3200, height = 600) {
    this.width = width;
    this.height = height;

    // Platform Ledges: { x, y, width, height, type: 'solid'|'oneway' }
    this.platforms = [];
    this.hazards = []; // Toxic pools: { x, y, width, height }
    this.scenery = []; // Background pipes, neon signs, pillars
    this.collectibles = []; // { x, y, type: 'gold'|'flask'|'heart', glyph }

    this.generateLevel();
  }

  generateLevel() {
    // 1. Base Ground Floors with pit gaps
    let curX = 0;
    while (curX < this.width) {
      const segWidth = 300 + Math.random() * 400;
      this.platforms.push({
        x: curX,
        y: 520,
        width: segWidth,
        height: 80,
        type: 'solid',
        glyph: '═'
      });

      // Gap with toxic sludge hazard
      const gapWidth = 100 + Math.random() * 80;
      this.hazards.push({
        x: curX + segWidth,
        y: 570,
        width: gapWidth,
        height: 30,
        glyph: '≈'
      });

      curX += segWidth + gapWidth;
    }

    // 2. Multi-tier Industrial Platforms & Rooftops
    const platformConfigs = [
      // Zone 1: Entry Street & Rooftops
      { x: 120, y: 440, width: 180 },
      { x: 360, y: 370, width: 220 },
      { x: 220, y: 300, width: 160 },
      { x: 500, y: 240, width: 200 },
      { x: 740, y: 340, width: 180 },

      // Zone 2: Industrial Girders & Toxic Pipes
      { x: 980, y: 420, width: 240 },
      { x: 1260, y: 350, width: 200 },
      { x: 1100, y: 270, width: 180 },
      { x: 1360, y: 210, width: 260 },
      { x: 1680, y: 320, width: 220 },

      // Zone 3: High-Rise Ruins & Scaffoldings
      { x: 1950, y: 430, width: 200 },
      { x: 2200, y: 360, width: 240 },
      { x: 2050, y: 280, width: 180 },
      { x: 2350, y: 220, width: 260 },
      { x: 2650, y: 340, width: 300 },

      // Boss Arena Plateau
      { x: 2850, y: 480, width: 340 }
    ];

    for (const p of platformConfigs) {
      this.platforms.push({
        x: p.x,
        y: p.y,
        width: p.width,
        height: 18,
        type: 'solid',
        glyph: '═'
      });

      // Spawn pickups on elevated platforms
      if (Math.random() < 0.6) {
        this.collectibles.push({
          x: p.x + p.width / 2,
          y: p.y - 16,
          type: Math.random() < 0.7 ? 'gold' : 'flask',
          glyph: Math.random() < 0.7 ? '$' : '●'
        });
      }
    }

    // 3. Cyberpunk Scenery (Signs, Towers, Pipes)
    this.scenery.push(
      { x: 200, y: 260, text: '[ NEON APOCALYPSE ]', color: '#aaaaaa' },
      { x: 800, y: 180, text: '< SECTOR 7 - INDUSTRIAL >', color: '#888888' },
      { x: 1400, y: 150, text: '[ ACID HAZARD ZONE ]', color: '#aaaaaa' },
      { x: 2400, y: 160, text: '<<< WARLORD CITADEL >>>', color: '#cccccc' }
    );
  }

  getGroundHeight(x, feetY, halfWidth = 10) {
    let closestY = this.height + 200; // Default off bottom

    for (const p of this.platforms) {
      // Check if player's X overlaps the platform
      if (x + halfWidth >= p.x && x - halfWidth <= p.x + p.width) {
        // Only land if player's feet are at or above the platform surface
        if (feetY <= p.y + 14 && p.y >= feetY - 24) {
          if (p.y < closestY) {
            closestY = p.y;
          }
        }
      }
    }

    return closestY;
  }

  isSolid(x, y) {
    return false; // Platforms are solid from top
  }

  checkPlayerAttack(hitX, hitY, radius, damage, player, damageText, particles, camera) {
    // Defined in EntityManager / Game loop for enemies
  }

  render(ctx, camera) {
    ctx.save();

    // 1. Render Background Parallax Buildings & Skyline
    this.renderParallaxSkyline(ctx, camera);

    // 2. Render Scenery Neon Signs & Girders
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (const s of this.scenery) {
      const screen = camera.worldToScreen(s.x, s.y);
      ctx.fillStyle = s.color || '#888888';
      ctx.fillText(s.text, screen.x, screen.y);
    }

    // 3. Render Solid Platforms in ASCII
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (const p of this.platforms) {
      const screen = camera.worldToScreen(p.x, p.y);

      // Frustum culling check
      if (screen.x + p.width < -20 || screen.x > camera.viewportWidth + 20) continue;

      const numChars = Math.floor(p.width / 8);
      let topBar = '╔';
      for (let i = 0; i < numChars - 2; i++) topBar += '═';
      topBar += '╗';

      ctx.fillStyle = '#ffffff';
      ctx.fillText(topBar, screen.x, screen.y);

      // Support pillars / grid texture
      if (p.height > 20) {
        let bodyBar = '║';
        for (let i = 0; i < numChars - 2; i++) bodyBar += '░';
        bodyBar += '║';
        ctx.fillStyle = '#555555';
        ctx.fillText(bodyBar, screen.x, screen.y + 12);
      }
    }

    // 4. Render Toxic Acid Sludge Hazard Pits (Sprite Fusion green/white ripple effect)
    for (const h of this.hazards) {
      const screen = camera.worldToScreen(h.x, h.y);
      if (screen.x + h.width < -20 || screen.x > camera.viewportWidth + 20) continue;

      const numChars = Math.floor(h.width / 9);
      let ripple = '';
      for (let i = 0; i < numChars; i++) {
        ripple += (i + Math.floor(Date.now() / 200)) % 2 === 0 ? '≈' : '~';
      }

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(ripple, screen.x, screen.y);
    }

    // 5. Render Collectibles ($ and Flasks)
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const screen = camera.worldToScreen(c.x, c.y + Math.sin(Date.now() * 0.005 + i) * 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(c.glyph, screen.x, screen.y);
    }

    ctx.restore();
  }

  renderParallaxSkyline(ctx, camera) {
    // Parallax background factor 0.25 (distant city silhouette)
    const bgOffset = camera.x * 0.25;

    ctx.font = '12px monospace';
    ctx.fillStyle = '#222222';
    ctx.textAlign = 'left';

    const towerWidth = 70;
    const startIdx = Math.floor(bgOffset / towerWidth) - 1;
    const endIdx = startIdx + Math.ceil(camera.viewportWidth / towerWidth) + 2;

    for (let i = startIdx; i <= endIdx; i++) {
      const towerHeight = 120 + ((i * 37) % 180);
      const towerX = i * towerWidth - bgOffset;
      const towerY = camera.viewportHeight - towerHeight - 30;

      // Draw ASCII building column
      const numLines = Math.floor(towerHeight / 14);
      for (let line = 0; line < numLines; line++) {
        const charPattern = line === 0 ? '/‾‾‾‾‾‾\\' : '| [][][] |';
        ctx.fillText(charPattern, towerX, towerY + line * 14);
      }
    }
  }
}

