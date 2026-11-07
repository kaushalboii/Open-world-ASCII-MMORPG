// Pure ASCII 2D Platform Level
// Multi-tier ASCII platforms, industrial pipes, neon signs, and toxic sludge pits

export class AsciiWorld {
  constructor(cols = 100, rows = 34) {
    this.cols = cols;
    this.rows = rows;

    // Platform Ledges: { x, y, width, title }
    this.platforms = [
      // Ground Floors with gap pits
      { x: 0, y: 28, width: 34 },
      { x: 42, y: 28, width: 32 },
      { x: 80, y: 28, width: 20 },

      // Elevated Street & Rooftop Ledges
      { x: 6, y: 22, width: 22, title: 'STREET 1' },
      { x: 34, y: 18, width: 26, title: 'SECTOR 4' },
      { x: 18, y: 13, width: 20, title: 'HIGH-RISE' },
      { x: 68, y: 21, width: 26, title: 'ACID LAB' },
      { x: 48, y: 11, width: 28, title: 'GIRDER 9' },
      { x: 74, y: 14, width: 22, title: 'CITADEL' }
    ];

    // Hazards (Toxic Sludge Pits)
    this.hazards = [
      { x: 34, y: 31, width: 8 },
      { x: 74, y: 31, width: 6 }
    ];

    // Collectibles: { x, y, type: 'gold'|'flask', glyph }
    this.collectibles = [
      { x: 14, y: 20, type: 'gold', glyph: '$' },
      { x: 44, y: 16, type: 'flask', glyph: '(o)' },
      { x: 26, y: 11, type: 'gold', glyph: '$' },
      { x: 60, y: 9, type: 'flask', glyph: '(o)' },
      { x: 82, y: 19, type: 'gold', glyph: '$' },
      { x: 84, y: 12, type: 'gold', glyph: '$' }
    ];

    // Neon signs in ASCII
    this.signs = [
      { x: 4, y: 4, text: '< [ NEON APOCALYPSE ] >' },
      { x: 40, y: 3, text: '[[ TOXIC INDUSTRIAL LAB ]]' },
      { x: 72, y: 5, text: '<<< WARLORD CITADEL >>>' }
    ];
  }

  getGroundY(col, feetRow) {
    let closestY = this.rows + 10;

    for (const p of this.platforms) {
      if (col >= p.x && col <= p.x + p.width) {
        if (feetRow <= p.y + 1 && p.y >= feetRow - 2) {
          if (p.y < closestY) {
            closestY = p.y;
          }
        }
      }
    }

    return closestY;
  }

  checkMeleeHit(hitX, hitY, radius, damage, player, damageText, particles) {
    if (this.onMeleeHit) {
      this.onMeleeHit(hitX, hitY, radius, damage, player, damageText, particles);
    }
  }

  draw(grid) {
    // 1. Draw Background Signs & Distant Towers in ASCII
    for (const s of this.signs) {
      grid.drawString(s.x, s.y, s.text, '#888888', 0.6);
    }

    // 2. Draw Elevated Ledges & Platforms in pure ASCII
    for (const p of this.platforms) {
      // Top platform line
      let line = '╔';
      for (let i = 0; i < p.width - 2; i++) line += '═';
      line += '╗';
      grid.drawString(p.x, p.y, line, '#ffffff');

      // Platform body
      let body = '║';
      for (let i = 0; i < p.width - 2; i++) body += '░';
      body += '║';
      grid.drawString(p.x, p.y + 1, body, '#555555');

      // Platform title badge if any
      if (p.title) {
        grid.drawString(p.x + 3, p.y, `[ ${p.title} ]`, '#ffffff');
      }
    }

    // 3. Draw Toxic Acid Sludge Hazard Pits (animated ripple)
    for (const h of this.hazards) {
      let rip = '';
      for (let i = 0; i < h.width; i++) {
        rip += (i + Math.floor(Date.now() / 250)) % 2 === 0 ? '≈' : '~';
      }
      grid.drawString(h.x, h.y, rip, '#aaaaaa');
    }

    // 4. Draw Collectibles ($ and (o))
    for (const c of this.collectibles) {
      grid.drawString(c.x, c.y, c.glyph, '#ffffff');
    }
  }
}
