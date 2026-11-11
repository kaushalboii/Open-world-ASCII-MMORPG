/**
 * Hand-authored 240x88 open-world map of Marren Valley for Bellglass: The Drowned Province.
 * Parity-matched with the Python simulation world topology.
 */

export const WORLD_W = 240;
export const WORLD_H = 88;

export const TILE_WATER = 'water';
export const TILE_SHOAL = 'shoal';
export const TILE_MUD = 'mud';
export const TILE_ROAD = 'road';
export const TILE_STONE = 'stone';
export const TILE_TIMBER = 'timber';
export const TILE_WALL = 'wall';
export const TILE_TREE = 'tree';
export const TILE_SALT = 'salt';
export const TILE_GATE = 'gate';
export const TILE_BRIDGE = 'bridge';
export const TILE_SLAG = 'slag';
export const TILE_PILLAR = 'pillar';

export const WALKABLE_TILES = new Set([TILE_SHOAL, TILE_MUD, TILE_ROAD, TILE_STONE, TILE_TIMBER, TILE_BRIDGE]);
export const OPAQUE_TILES = new Set([TILE_WALL, TILE_TREE, TILE_SALT, TILE_GATE, TILE_PILLAR]);

export const REGION_META = [
  ['tidemouth', 'TIDEMOUTH PIER', 'Driftwood jetty beneath a weeping estuary lighthouse.', [0, 56, 70, 88]],
  ['orchard', 'THE SUNKEN ORCHARD', 'Apple rows half-swallowed by fog-choked silt.', [0, 20, 76, 56]],
  ['nave', "ST. JUDE'S NAVE", 'Rain drills diagonally through broken limestone arches.', [72, 4, 146, 44]],
  ['causeway', 'BRAMWELL CAUSEWAY', 'A battered stone dike spanning dark tidal marshes.', [70, 44, 146, 86]],
  ['redwick', 'KILN-TOWN OF REDWICK', 'Beehive coke ovens steaming into cold salt drizzle.', [146, 36, 206, 68]],
  ['saltflats', 'LOW SUNDER FLATS', 'Pale salt crust and the bleached ribs of wrecked dredgers.', [146, 68, 238, 87]],
  ['foundry', 'THE HIGH FOUNDRY', 'Riveted gantry cranes suspended over glowing slag channels.', [146, 4, 238, 36]],
];

function paintRect(wm, x0, y0, x1, y1, glyphFn, kind) {
  const maxY = Math.min(wm.height, y1 + 1);
  const maxX = Math.min(wm.width, x1 + 1);
  for (let y = Math.max(0, y0); y < maxY; y++) {
    for (let x = Math.max(0, x0); x < maxX; x++) {
      const g = typeof glyphFn === 'function' ? glyphFn(x, y) : glyphFn;
      wm.setTile(x, y, g, kind);
    }
  }
}

function paintHollowBox(wm, x0, y0, x1, y1, wallGlyph = '#', floorGlyph = '.', floorKind = TILE_STONE) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x === x0 || x === x1 || y === y0 || y === y1) {
        wm.setTile(x, y, wallGlyph, TILE_WALL);
      } else {
        wm.setTile(x, y, floorGlyph, floorKind);
      }
    }
  }
}

function earthGlyph(x, y) {
  const h = (x * 37 + y * 91) % 13;
  if (h === 0) return ',';
  if (h === 1 || h === 2) return '`';
  if (h === 3 || h === 4) return "'";
  return '.';
}

function saltSandGlyph(x, y) {
  const h = (x * 53 + y * 19) % 11;
  if (h < 2) return "'";
  if (h < 4) return ',';
  if (h === 5) return '`';
  return '.';
}

function waterGlyph(x, y) {
  return (x + y * 3) % 4 !== 0 ? '~' : '-';
}

export function buildMarrenWorld() {
  const glyphs = Array.from({ length: WORLD_H }, (_, y) =>
    Array.from({ length: WORLD_W }, (__, x) => waterGlyph(x, y))
  );
  const kinds = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(TILE_WATER));
  const regionIds = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill('tidemouth'));

  for (const [rid, _t, _d, [rx0, ry0, rx1, ry1]] of REGION_META) {
    for (let y = Math.max(0, ry0); y < Math.min(WORLD_H, ry1); y++) {
      for (let x = Math.max(0, rx0); x < Math.min(WORLD_W, rx1); x++) {
        regionIds[y][x] = rid;
      }
    }
  }

  const wm = {
    width: WORLD_W,
    height: WORLD_H,
    glyphs,
    kinds,
    regionIds,
    inBounds(x, y) {
      return x >= 0 && x < this.width && y >= 0 && y < this.height;
    },
    isWalkable(x, y) {
      return this.inBounds(x, y) && WALKABLE_TILES.has(this.kinds[y][x]);
    },
    isOpaque(x, y) {
      return !this.inBounds(x, y) || OPAQUE_TILES.has(this.kinds[y][x]);
    },
    setTile(x, y, glyph, kind) {
      if (this.inBounds(x, y)) {
        this.glyphs[y][x] = glyph;
        this.kinds[y][x] = kind;
      }
    },
    regionAt(x, y) {
      return this.inBounds(x, y) ? this.regionIds[y][x] : 'tidemouth';
    },
    belfries: [],
    npcs: [],
    enemies: [],
    pickups: [],
    braziers: [],
    interactables: [],
    decorLines: [],
  };

  // Outer perimeter cliffs
  paintRect(wm, 0, 0, WORLD_W - 1, 3, '^', TILE_WALL);
  paintRect(wm, 0, WORLD_H - 2, WORLD_W - 1, WORLD_H - 1, '^', TILE_WALL);
  paintRect(wm, 0, 0, 3, WORLD_H - 1, '^', TILE_WALL);
  paintRect(wm, WORLD_W - 4, 0, WORLD_W - 1, WORLD_H - 1, '^', TILE_WALL);

  // 1. TIDEMOUTH PIER
  paintRect(wm, 16, 56, 62, 74, earthGlyph, TILE_MUD);
  paintRect(wm, 8, 66, 26, 71, '=', TILE_TIMBER);
  paintHollowBox(wm, 10, 58, 18, 65, '#', ':', TILE_STONE);
  wm.setTile(14, 65, '.', TILE_STONE);
  paintHollowBox(wm, 46, 59, 55, 65, '#', '.', TILE_STONE);
  wm.setTile(46, 62, '%', TILE_SALT);
  paintRect(wm, 20, 62, 45, 63, ':', TILE_ROAD);
  paintRect(wm, 32, 52, 37, 63, ':', TILE_ROAD);
  paintRect(wm, 50, 65, 76, 67, ':', TILE_ROAD);

  // 2. THE SUNKEN ORCHARD
  paintRect(wm, 8, 22, 74, 56, earthGlyph, TILE_MUD);
  paintRect(wm, 12, 42, 24, 51, waterGlyph, TILE_WATER);
  paintRect(wm, 44, 24, 56, 29, waterGlyph, TILE_WATER);
  paintRect(wm, 32, 29, 37, 56, ':', TILE_ROAD);
  paintRect(wm, 22, 34, 78, 37, ':', TILE_ROAD);
  paintRect(wm, 55, 37, 60, 54, ':', TILE_ROAD);
  for (const [tx, ty] of [
    [14, 24], [20, 24], [28, 25], [41, 26], [62, 25], [69, 27],
    [13, 39], [26, 40], [42, 39], [48, 41], [66, 42], [70, 48],
    [29, 47], [45, 50], [14, 53], [64, 52],
  ]) {
    wm.setTile(tx, ty, 'Y', TILE_TREE);
  }
  paintHollowBox(wm, 12, 25, 24, 33, '#', '.', TILE_STONE);
  wm.setTile(24, 29, '%', TILE_SALT);
  paintRect(wm, 25, 29, 32, 30, ':', TILE_ROAD);
  paintRect(wm, 54, 31, 61, 37, '=', TILE_STONE);
  wm.setTile(55, 32, '+', TILE_PILLAR);
  wm.setTile(60, 32, '+', TILE_PILLAR);

  // 3. BRAMWELL CAUSEWAY
  paintRect(wm, 70, 52, 82, 68, earthGlyph, TILE_MUD);
  paintRect(wm, 80, 54, 148, 58, '=', TILE_STONE);
  for (let px = 82; px < 144; px += 6) {
    if (px !== 106 && px !== 112) {
      wm.setTile(px, 53, '#', TILE_WALL);
      wm.setTile(px + 1, 53, '#', TILE_WALL);
      wm.setTile(px, 59, '#', TILE_WALL);
    }
  }
  paintRect(wm, 108, 51, 112, 53, '#', TILE_WALL);
  paintRect(wm, 108, 59, 112, 61, '#', TILE_WALL);

  // Submerged stepping stones South -> Beacon Islet (orthogonal 4-way path)
  let sx = 96;
  let sy = 59;
  while (sy < 76) {
    wm.setTile(sx, sy, '~', TILE_SHOAL);
    wm.setTile(sx + 1, sy, '~', TILE_SHOAL);
    sy += 1;
    if (sy % 2 === 0) {
      wm.setTile(sx, sy, '~', TILE_SHOAL);
      sx += 1;
    }
  }
  while (sx <= 117) {
    wm.setTile(sx, 76, '~', TILE_SHOAL);
    sx += 1;
  }
  paintRect(wm, 117, 73, 129, 80, earthGlyph, TILE_MUD);
  wm.setTile(123, 74, '+', TILE_PILLAR);

  // 4. ST. JUDE'S FLOODED NAVE
  paintRect(wm, 74, 34, 86, 44, earthGlyph, TILE_MUD);
  paintHollowBox(wm, 78, 7, 138, 41, '#', '.', TILE_STONE);
  wm.setTile(78, 35, '.', TILE_STONE);
  wm.setTile(78, 36, '.', TILE_STONE);
  wm.setTile(94, 41, '.', TILE_STONE);
  wm.setTile(95, 41, '.', TILE_STONE);
  paintRect(wm, 93, 42, 97, 54, ':', TILE_ROAD);
  paintRect(wm, 108, 8, 116, 40, waterGlyph, TILE_WATER);
  for (const py of [22, 25, 31, 34]) {
    paintRect(wm, 86, py, 91, py, '=', TILE_WALL);
  }
  wm.setTile(82, 20, '+', TILE_PILLAR);
  wm.setTile(82, 30, '+', TILE_PILLAR);
  wm.setTile(102, 20, '+', TILE_PILLAR);
  wm.setTile(102, 30, '+', TILE_PILLAR);
  paintHollowBox(wm, 78, 7, 106, 17, '#', '.', TILE_STONE);
  wm.setTile(92, 17, '.', TILE_STONE);
  wm.setTile(93, 17, '.', TILE_STONE);
  wm.setTile(108, 20, '+', TILE_GATE);
  wm.setTile(108, 21, '+', TILE_GATE);
  wm.setTile(108, 22, '+', TILE_GATE);
  paintRect(wm, 117, 9, 136, 39, '.', TILE_STONE);
  wm.setTile(125, 12, '+', TILE_PILLAR);
  wm.setTile(129, 12, '+', TILE_PILLAR);
  wm.setTile(138, 27, '.', TILE_STONE);
  wm.setTile(138, 28, '.', TILE_STONE);
  paintRect(wm, 139, 27, 151, 28, '=', TILE_TIMBER);

  // 5. KILN-TOWN OF REDWICK
  paintRect(wm, 146, 38, 202, 67, earthGlyph, TILE_MUD);
  paintRect(wm, 148, 54, 178, 57, ':', TILE_ROAD);
  paintRect(wm, 171, 34, 175, 69, ':', TILE_ROAD);
  for (const [kx, ky] of [[154, 42], [185, 42], [191, 49]]) {
    paintHollowBox(wm, kx, ky, kx + 5, ky + 4, '#', '*', TILE_WALL);
  }
  paintRect(wm, 157, 46, 166, 47, '#', TILE_WALL);
  paintRect(wm, 158, 48, 165, 52, '=', TILE_STONE);
  paintRect(wm, 170, 39, 176, 44, '=', TILE_STONE);
  wm.setTile(171, 40, '+', TILE_PILLAR);
  wm.setTile(175, 40, '+', TILE_PILLAR);
  paintHollowBox(wm, 180, 54, 198, 65, '#', '.', TILE_STONE);
  wm.setTile(180, 59, '.', TILE_STONE);
  wm.setTile(180, 60, '.', TILE_STONE);
  paintRect(wm, 175, 59, 180, 60, ':', TILE_ROAD);

  // 6. LOW SUNDER FLATS & WRECK BEACH
  paintRect(wm, 148, 69, 234, 84, saltSandGlyph, TILE_MUD);
  paintRect(wm, 169, 68, 175, 76, ':', TILE_ROAD);
  paintRect(wm, 174, 74, 224, 76, saltSandGlyph, TILE_ROAD);
  paintHollowBox(wm, 196, 72, 228, 82, '#', '=', TILE_TIMBER);
  wm.setTile(196, 76, '.', TILE_TIMBER);
  wm.setTile(196, 77, '.', TILE_TIMBER);
  wm.setTile(216, 72, '.', TILE_TIMBER);
  wm.setTile(217, 72, '.', TILE_TIMBER);
  paintRect(wm, 219, 73, 219, 81, '#', TILE_WALL);
  wm.setTile(219, 77, '%', TILE_SALT);
  paintRect(wm, 214, 62, 226, 71, '=', TILE_STONE);
  paintRect(wm, 200, 63, 214, 65, '=', TILE_TIMBER);

  // 7. THE HIGH FOUNDRY
  paintRect(wm, 148, 6, 234, 34, '.', TILE_STONE);
  paintRect(wm, 147, 35, 235, 36, '#', TILE_WALL);
  wm.setTile(172, 35, '+', TILE_GATE);
  wm.setTile(173, 35, '+', TILE_GATE);
  wm.setTile(174, 35, '+', TILE_GATE);
  wm.setTile(172, 36, ':', TILE_ROAD);
  wm.setTile(173, 36, ':', TILE_ROAD);
  wm.setTile(174, 36, ':', TILE_ROAD);
  paintRect(wm, 147, 25, 148, 34, '#', TILE_WALL);
  wm.setTile(148, 27, '%', TILE_SALT);
  wm.setTile(148, 28, '%', TILE_SALT);
  wm.setTile(147, 27, '=', TILE_TIMBER);
  wm.setTile(147, 28, '=', TILE_TIMBER);
  paintRect(wm, 158, 12, 182, 14, '*', TILE_SLAG);
  paintRect(wm, 166, 12, 169, 14, '=', TILE_TIMBER);
  paintRect(wm, 188, 26, 226, 28, '*', TILE_SLAG);
  paintRect(wm, 198, 26, 202, 28, '=', TILE_TIMBER);
  wm.setTile(192, 12, '+', TILE_PILLAR);
  wm.setTile(226, 12, '+', TILE_PILLAR);
  wm.setTile(192, 23, '+', TILE_PILLAR);
  wm.setTile(226, 23, '+', TILE_PILLAR);
  paintRect(wm, 208, 7, 218, 12, '=', TILE_STONE);

  wm.belfries = [
    { id: 'bell_orchard', index: 0, name: 'Orchard Belfry', region: 'orchard', x: 58, y: 34, clapperId: 'clapper_orchard', rung: false },
    { id: 'bell_nave', index: 1, name: "St. Jude's Tenor", region: 'nave', x: 127, y: 14, clapperId: 'clapper_nave', rung: false },
    { id: 'bell_redwick', index: 2, name: 'Redwick Kiln-Spire', region: 'redwick', x: 173, y: 41, clapperId: 'clapper_redwick', rung: false },
    { id: 'bell_breakwater', index: 3, name: 'Breakwater Crane', region: 'saltflats', x: 220, y: 65, clapperId: 'clapper_breakwater', rung: false },
    { id: 'bell_foundry', index: 4, name: 'Master Dam Bell', region: 'foundry', x: 213, y: 9, clapperId: 'clapper_foundry', rung: false },
  ];

  wm.braziers = [
    { id: 'braz_pier', name: 'Tidemouth Pier Brazier', region: 'tidemouth', x: 24, y: 66 },
    { id: 'braz_orchard', name: 'Orchard Wall Brazier', region: 'orchard', x: 40, y: 46 },
    { id: 'braz_nave', name: 'St. Jude Altar Candle-Pit', region: 'nave', x: 88, y: 28 },
    { id: 'braz_redwick', name: 'Redwick Square Furnace', region: 'redwick', x: 168, y: 52 },
    { id: 'braz_foundry', name: 'Foundry Gate Brazier', region: 'foundry', x: 168, y: 22 },
  ];

  wm.npcs = [
    { id: 'hester', name: 'Old Hester', glyph: 'H', x: 27, y: 67, region: 'tidemouth', dialogueRoot: 'hester_root' },
    { id: 'tomas', name: 'Prior Tomas', glyph: 'T', x: 92, y: 27, region: 'nave', dialogueRoot: 'tomas_root' },
    { id: 'marrow', name: 'Smith Marrow', glyph: 'M', x: 161, y: 50, region: 'redwick', dialogueRoot: 'marrow_root' },
    { id: 'callum', name: 'Watchman Callum', glyph: 'C', x: 175, y: 53, region: 'redwick', dialogueRoot: 'callum_root' },
    { id: 'pip', name: 'Apprentice Pip', glyph: 'P', x: 206, y: 77, region: 'saltflats', dialogueRoot: 'pip_root' },
  ];

  wm.interactables = [
    { id: 'pulley_choir', kind: 'pulley', name: 'Confessional Choir Winch', glyph: '&', x: 83, y: 12, activated: false },
    { id: 'board_redwick', kind: 'noticeboard', name: 'Redwick Parish Board', glyph: 'N', x: 177, y: 52, activated: false },
  ];

  wm.pickups = [
    { id: 'clapper_orchard', kind: 'clapper', name: 'Orchard Clapper', glyph: '!', x: 18, y: 29, value: 'bell_orchard', amount: 1, collected: false },
    { id: 'clapper_nave', kind: 'clapper', name: 'Nave Tenor Clapper', glyph: '!', x: 99, y: 11, value: 'bell_nave', amount: 1, collected: false },
    { id: 'clapper_redwick', kind: 'clapper', name: 'Redwick Chime Clapper', glyph: '!', x: 193, y: 60, value: 'bell_redwick', amount: 1, collected: false },
    { id: 'clapper_breakwater', kind: 'clapper', name: 'Breakwater Anchor Clapper', glyph: '!', x: 224, y: 77, value: 'bell_breakwater', amount: 1, collected: false },
    { id: 'oil_shed', kind: 'oil', name: 'Amber Whale-Oil Jar', glyph: 'o', x: 51, y: 62, value: '', amount: 35, collected: false },
    { id: 'brass_shed', kind: 'brass', name: 'Stamped Toll-Coins', glyph: '$', x: 52, y: 61, value: '', amount: 18, collected: false },
    { id: 'note_pier', kind: 'note', name: 'Tidemouth Milestone', glyph: '?', x: 31, y: 61, value: 'note_pier', amount: 1, collected: false },
    { id: 'poultice_orchard', kind: 'poultice', name: 'Pressed Bog-Mint', glyph: '+', x: 16, y: 48, value: '', amount: 1, collected: false },
    { id: 'brass_causeway_west', kind: 'brass', name: 'Fallen Helm Buckle', glyph: '$', x: 76, y: 61, value: '', amount: 20, collected: false },
    { id: 'relic_ringlet', kind: 'relic', name: "Tide-Stealer's Ringlet", glyph: '*', x: 123, y: 76, value: 'ringlet', amount: 1, collected: false },
    { id: 'note_shoal', kind: 'note', name: 'Drowned Tide Table', glyph: '?', x: 125, y: 77, value: 'note_shoal', amount: 1, collected: false },
    { id: 'oil_vestry', kind: 'oil', name: 'Choir Tallows', glyph: 'o', x: 82, y: 9, value: '', amount: 35, collected: false },
    { id: 'poultice_redwick', kind: 'poultice', name: 'Kiln-Bandage Roll', glyph: '+', x: 191, y: 56, value: '', amount: 2, collected: false },
    { id: 'brass_flats', kind: 'brass', name: 'Cormorant Logbox', glyph: '$', x: 199, y: 79, value: '', amount: 35, collected: false },
    { id: 'note_foundry', kind: 'note', name: "Magistrate's Sealing Order", glyph: '?', x: 180, y: 20, value: 'note_foundry', amount: 1, collected: false },
  ];

  wm.enemies = [
    { id: 'e_hound_1', kind: 'hound', name: 'Bog-Hound', glyph: 'd', x: 36, y: 44, region: 'orchard', maxHp: 18, damage: 8, speed: 5.4, windupS: 0.55, cooldownS: 1.3, aggroRange: 11, brassDrop: 10, stealth: false, isBoss: false },
    { id: 'e_hound_2', kind: 'hound', name: 'Bog-Hound', glyph: 'd', x: 28, y: 31, region: 'orchard', maxHp: 18, damage: 8, speed: 5.4, windupS: 0.55, cooldownS: 1.3, aggroRange: 11, brassDrop: 10, stealth: false, isBoss: false },
    { id: 'e_picker_1', kind: 'picker', name: 'Mire-Picker', glyph: 'p', x: 50, y: 41, region: 'orchard', maxHp: 26, damage: 10, speed: 3.6, windupS: 0.65, cooldownS: 1.5, aggroRange: 12, brassDrop: 14, stealth: false, isBoss: false },
    { id: 'e_warden_1', kind: 'warden', name: 'Pike-Warden', glyph: 'W', x: 94, y: 56, region: 'causeway', maxHp: 38, damage: 14, speed: 2.7, windupS: 0.72, cooldownS: 1.8, aggroRange: 12, brassDrop: 22, stealth: false, isBoss: false },
    { id: 'e_picker_2', kind: 'picker', name: 'Bridge Lurker', glyph: 'p', x: 118, y: 56, region: 'causeway', maxHp: 28, damage: 11, speed: 3.8, windupS: 0.62, cooldownS: 1.4, aggroRange: 12, brassDrop: 15, stealth: false, isBoss: false },
    { id: 'e_warden_2', kind: 'warden', name: 'Causeway Warden', glyph: 'W', x: 136, y: 56, region: 'causeway', maxHp: 42, damage: 15, speed: 2.7, windupS: 0.72, cooldownS: 1.8, aggroRange: 12, brassDrop: 24, stealth: false, isBoss: false },
    { id: 'e_hound_3', kind: 'hound', name: 'Choir Curs', glyph: 'd', x: 94, y: 22, region: 'nave', maxHp: 20, damage: 9, speed: 5.5, windupS: 0.52, cooldownS: 1.2, aggroRange: 11, brassDrop: 12, stealth: false, isBoss: false },
    { id: 'e_warden_3', kind: 'warden', name: 'Vestry Halberdier', glyph: 'W', x: 95, y: 12, region: 'nave', maxHp: 44, damage: 15, speed: 2.6, windupS: 0.70, cooldownS: 1.8, aggroRange: 11, brassDrop: 25, stealth: false, isBoss: false },
    { id: 'e_picker_3', kind: 'picker', name: 'Belfry Watch', glyph: 'p', x: 126, y: 28, region: 'nave', maxHp: 30, damage: 11, speed: 3.9, windupS: 0.60, cooldownS: 1.4, aggroRange: 12, brassDrop: 16, stealth: false, isBoss: false },
    { id: 'e_crawler_1', kind: 'crawler', name: 'Cinder-Crawler', glyph: 'c', x: 186, y: 58, region: 'redwick', maxHp: 28, damage: 12, speed: 4.6, windupS: 0.50, cooldownS: 1.2, aggroRange: 12, brassDrop: 18, stealth: false, isBoss: false },
    { id: 'e_crawler_2', kind: 'crawler', name: 'Soot-Hound', glyph: 'c', x: 191, y: 62, region: 'redwick', maxHp: 30, damage: 12, speed: 4.8, windupS: 0.50, cooldownS: 1.2, aggroRange: 12, brassDrop: 18, stealth: false, isBoss: false },
    { id: 'e_stalker_1', kind: 'stalker', name: 'Silt-Stalker', glyph: 'S', x: 186, y: 76, region: 'saltflats', maxHp: 36, damage: 14, speed: 4.2, windupS: 0.58, cooldownS: 1.4, aggroRange: 13, brassDrop: 24, stealth: true, isBoss: false },
    { id: 'e_stalker_2', kind: 'stalker', name: 'Dredger-Ghost', glyph: 'S', x: 204, y: 78, region: 'saltflats', maxHp: 38, damage: 15, speed: 4.3, windupS: 0.58, cooldownS: 1.4, aggroRange: 13, brassDrop: 26, stealth: true, isBoss: false },
    { id: 'e_warden_4', kind: 'warden', name: 'Breakwater Sentinel', glyph: 'W', x: 220, y: 68, region: 'saltflats', maxHp: 48, damage: 16, speed: 2.8, windupS: 0.68, cooldownS: 1.7, aggroRange: 12, brassDrop: 28, stealth: false, isBoss: false },
    { id: 'e_crawler_3', kind: 'crawler', name: 'Slag-Hound', glyph: 'c', x: 162, y: 26, region: 'foundry', maxHp: 34, damage: 13, speed: 4.7, windupS: 0.48, cooldownS: 1.1, aggroRange: 12, brassDrop: 20, stealth: false, isBoss: false },
    { id: 'e_warden_5', kind: 'warden', name: 'Foundry Guard', glyph: 'W', x: 177, y: 19, region: 'foundry', maxHp: 50, damage: 16, speed: 2.8, windupS: 0.66, cooldownS: 1.6, aggroRange: 12, brassDrop: 30, stealth: false, isBoss: false },
    { id: 'boss_vane', kind: 'vane', name: 'Magistrate Vane', glyph: 'V', x: 212, y: 18, region: 'foundry', maxHp: 155, damage: 20, speed: 3.5, windupS: 0.68, cooldownS: 1.55, aggroRange: 15, brassDrop: 100, stealth: false, isBoss: true },
  ];

  wm.decorLines = [
    { x: 11, y: 56, lines: ['  /|\\  ', ' /_*_\\ ', ' |:::| '] },
    { x: 5, y: 72, lines: ['   /|  ', ' /===\\ ', ' \\___/ '] },
    { x: 55, y: 31, lines: [' /^B^\\ ', ' |   | '] },
    { x: 124, y: 11, lines: [' /^B^\\ ', ' | | | '] },
    { x: 170, y: 38, lines: [' /^B^\\ ', ' |   | '] },
    { x: 217, y: 64, lines: [' /_B_\\ ', ' /   \\ '] },
    { x: 209, y: 6, lines: ['  /__B__\\ ', ' /|     |\\'] },
    { x: 198, y: 72, lines: ['   /|   /|   /|   ', '__/_|__/_|__/_|___'] },
  ];

  return wm;
}
