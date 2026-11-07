// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
// Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)

export const TILE_SIZE = 16;

export const TileType = {
  WATER: 0,
  GRASS: 1,
  SAND: 2,
  CLIFF: 3,
  PATH: 4,
  BRIDGE: 5,
  WALL: 6,
  TREE: 7,
  STRUCTURE: 8
};

export class WorldMap {
  constructor(width = 110, height = 80) {
    this.width = width;
    this.height = height;
    this.worldWidth = width * TILE_SIZE;
    this.worldHeight = height * TILE_SIZE;

    this.tiles = new Uint8Array(width * height);
    this.glyphs = new Array(width * height);
    this.waterTimer = 0;
    this.waterFrame = 0;

    // List of interactive structures (doors, castles, towers)
    this.structures = [];

    this.generateIsland();
  }

  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TileType.WATER;
    return this.tiles[y * this.width + x];
  }

  setTile(x, y, type, glyph) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    this.tiles[idx] = type;
    this.glyphs[idx] = glyph;
  }

  getGlyph(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return '~';
    return this.glyphs[y * this.width + x] || ' ';
  }

  generateIsland() {
    // 1. Fill entire map with deep ocean
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        this.tiles[idx] = TileType.WATER;
        this.glyphs[idx] = (x + y) % 2 === 0 ? '~' : '≈';
      }
    }

    // Procedural Pixel Effects Engine • Created by Kaushal (kaushalboii)
    const landCenters = [
      // Main central kingdom
      { cx: 50, cy: 38, rx: 28, ry: 20 },
      // Top Castle plateau
      { cx: 34, cy: 22, rx: 20, ry: 14 },
      // Eastern village highlands
      { cx: 74, cy: 36, rx: 18, ry: 15 },
      // Southern bay & shores
      { cx: 52, cy: 56, rx: 22, ry: 12 },
      // Small south-western outpost islet
      { cx: 25, cy: 58, rx: 10, ry: 8 },
      // Small far-east secret grove
      { cx: 88, cy: 50, rx: 9, ry: 7 }
    ];

    for (let y = 2; y < this.height - 2; y++) {
      for (let x = 2; x < this.width - 2; x++) {
        let isLand = false;
        for (const center of landCenters) {
          const dx = (x - center.cx) / center.rx;
          const dy = (y - center.cy) / center.ry;
          // Add organic shoreline noise
          const noise = (Math.sin(x * 0.4) + Math.cos(y * 0.4)) * 0.12;
          if (dx * dx + dy * dy + noise < 1.0) {
            isLand = true;
            break;
          }
        }

        if (isLand) {
          this.setTile(x, y, TileType.GRASS, this.randomGrassGlyph(x, y));
        }
      }
    }

    // 3. Sandy shores & Cliff edges
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.getTile(x, y) === TileType.GRASS) {
          // Check neighbors for water
          const neighbors = [
            this.getTile(x + 1, y),
            this.getTile(x - 1, y),
            this.getTile(x, y + 1),
            this.getTile(x, y - 1)
          ];
          if (neighbors.includes(TileType.WATER)) {
            // Shoreline
            this.setTile(x, y, TileType.SAND, '.');
          }
        }
      }
    }

    // 4. Construct Castle Keep & Fortress (Top Left Plateau, cx=34, cy=20)
    this.buildCastle(24, 12, 22, 14);

    // 5. Construct Village Cottages (Eastern area, cx=68, cy=32)
    this.buildCottage(64, 28, 'Armorer');
    this.buildCottage(76, 26, 'Tavern');
    this.buildCottage(72, 42, 'Mill');
    this.buildCottage(58, 48, 'Farmhouse');

    // 6. Construct Watchtowers (Guarding chokepoints and islets)
    this.buildWatchtower(26, 54);
    this.buildWatchtower(48, 50);
    this.buildWatchtower(80, 46);

    // 7. Cobblestone Roads & Wooden Bridges
    this.buildPath(35, 26, 50, 40); // Castle to main crossroads
    this.buildPath(50, 40, 68, 34); // Crossroads to Village
    this.buildPath(50, 40, 52, 54); // Crossroads to South beach
    this.buildBridge(28, 56, 36, 56); // Bridge to southwest islet

    // 8. Forests, Rocks, and Flora
    this.scatterForests();
  }

  randomGrassGlyph(x, y) {
    const r = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    if (r > 0.88) return '"';
    if (r > 0.76) return "'";
    if (r > 0.65) return ',';
    if (r > 0.55) return '.';
    return ' ';
  }

  buildCastle(x, y, w, h) {
    // Outer stone battlements
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const tx = x + c;
        const ty = y + r;
        if (r === 0 || r === h - 1 || c === 0 || c === w - 1) {
          // Gatehouse in bottom wall center
          if (r === h - 1 && (c === Math.floor(w / 2) || c === Math.floor(w / 2) - 1)) {
            this.setTile(tx, ty, TileType.PATH, ' '); // Castle Gate Opening
          } else {
            this.setTile(tx, ty, TileType.WALL, '#');
          }
        } else {
          this.setTile(tx, ty, TileType.PATH, '·');
        }
      }
    }

    // Corner defensive bastions
    this.setTile(x, y, TileType.WALL, '╔');
    this.setTile(x + w - 1, y, TileType.WALL, '╗');
    this.setTile(x, y + h - 1, TileType.WALL, '╚');
    this.setTile(x + w - 1, y + h - 1, TileType.WALL, '╝');

    // Castle Keep (inner fortress sanctum)
    const kx = x + 4;
    const ky = y + 2;
    const kw = w - 8;
    const kh = 6;
    for (let r = 0; r < kh; r++) {
      for (let c = 0; c < kw; c++) {
        const tx = kx + c;
        const ty = ky + r;
        if (r === 0 || c === 0 || c === kw - 1) {
          this.setTile(tx, ty, TileType.WALL, '█');
        } else if (r === kh - 1 && c === Math.floor(kw / 2)) {
          this.setTile(tx, ty, TileType.PATH, '∩'); // Grand door
        } else {
          this.setTile(tx, ty, TileType.WALL, '▓');
        }
      }
    }

    this.structures.push({
      name: 'Royal Fortress Keep',
      x: (x + w / 2) * TILE_SIZE,
      y: (y + h / 2) * TILE_SIZE
    });
  }

  buildCottage(x, y, label = 'House') {
    // 4x3 cottage
    const glyphs = [
      ['/', '‾', '‾', '\\'],
      ['[', 'x', 'x', ']'],
      ['|', '[', ']', '|']
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        this.setTile(x + c, y + r, TileType.STRUCTURE, glyphs[r][c]);
      }
    }
    this.structures.push({
      name: label,
      x: (x + 2) * TILE_SIZE,
      y: (y + 1) * TILE_SIZE,
      chimneyX: (x + 3) * TILE_SIZE,
      chimneyY: (y) * TILE_SIZE
    });
  }

  buildWatchtower(x, y) {
    // 3x3 Stone Tower
    const glyphs = [
      ['[', '^', ']'],
      ['|', 'o', '|'],
      ['╚', '╦', '╝']
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        this.setTile(x + c, y + r, TileType.STRUCTURE, glyphs[r][c]);
      }
    }
    this.structures.push({
      name: 'Watchtower',
      x: (x + 1.5) * TILE_SIZE,
      y: (y + 1.5) * TILE_SIZE
    });
  }

  buildPath(x1, y1, x2, y2) {
    let cx = x1;
    let cy = y1;
    while (cx !== x2 || cy !== y2) {
      if (this.getTile(cx, cy) !== TileType.WATER) {
        this.setTile(cx, cy, TileType.PATH, '░');
      }
      if (cx < x2) cx++;
      else if (cx > x2) cx--;
      else if (cy < y2) cy++;
      else if (cy > y2) cy--;
    }
    if (this.getTile(cx, cy) !== TileType.WATER) {
      this.setTile(cx, cy, TileType.PATH, '░');
    }
  }

  buildBridge(x1, y1, x2, y2) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        this.setTile(x, y, TileType.BRIDGE, '=');
      }
    }
  }

  scatterForests() {
    for (let y = 3; y < this.height - 3; y++) {
      for (let x = 3; x < this.width - 3; x++) {
        if (this.getTile(x, y) === TileType.GRASS) {
          const rand = Math.random();
          // Pine and Oak clusters
          if (rand < 0.07) {
            const treeGlyphs = ['♣', '♠', '▲', '¥'];
            this.setTile(x, y, TileType.TREE, treeGlyphs[Math.floor(Math.random() * treeGlyphs.length)]);
          } else if (rand < 0.085) {
            // Rock
            this.setTile(x, y, TileType.STRUCTURE, 'O');
          }
        }
      }
    }
  }

  update(dt) {
    this.waterTimer += dt;
    if (this.waterTimer >= 0.45) {
      this.waterTimer = 0;
      this.waterFrame = (this.waterFrame + 1) % 3;
    }
  }

  isSolid(worldX, worldY, radius = 6) {
    // Check bounding box corners around entity
    const minTileX = Math.floor((worldX - radius) / TILE_SIZE);
    const maxTileX = Math.floor((worldX + radius) / TILE_SIZE);
    const minTileY = Math.floor((worldY - radius) / TILE_SIZE);
    const maxTileY = Math.floor((worldY + radius) / TILE_SIZE);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = this.getTile(tx, ty);
        if (tile === TileType.WATER) {
          return true; // Water blocks movement unless bridge
        }
        if (tile === TileType.WALL || tile === TileType.TREE || tile === TileType.STRUCTURE) {
          return true;
        }
      }
    }
    return false;
  }
}

