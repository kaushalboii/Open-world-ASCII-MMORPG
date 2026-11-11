/**
 * Realm cartography, Great Houses, military levies, and terrain-matched
 * tactical siege/field battle map generators for IRONCROWN.
 * All rendered glyphs are strictly single-cell printable ASCII (32..126).
 */

export const REALM_W = 76;
export const REALM_H = 44;

export const BATTLE_W = 66;
export const BATTLE_H = 30;

export const SEASONS = [
  { id: 'autumn', label: 'AUTUMN RAIN', foodMult: 1.0, moveDelay: 1.0, attrition: 0 },
  { id: 'frost', label: 'EARLY FROST', foodMult: 1.25, moveDelay: 1.15, attrition: 1 },
  { id: 'winter', label: 'DEEP WINTER', foodMult: 1.65, moveDelay: 1.35, attrition: 3 },
  { id: 'thaw', label: 'MUD THAW', foodMult: 1.1, moveDelay: 1.2, attrition: 0 },
];

export const TERRAIN_META = {
  '.': { name: 'Scrub Plain', passable: true, cost: 1.0, cover: 0, forage: 2 },
  '=': { name: 'King Road / Span', passable: true, cost: 0.72, cover: 0, forage: 1 },
  ',': { name: 'Bog / Mud Flat', passable: true, cost: 1.65, cover: 0, forage: 1 },
  'T': { name: 'Briar Wood', passable: true, cost: 1.35, cover: 30, forage: 3 },
  'n': { name: 'Hill Ridge', passable: true, cost: 1.25, cover: 20, forage: 1 },
  '#': { name: 'Hold Bastion', passable: true, cost: 0.9, cover: 55, forage: 2 },
  'v': { name: 'Croft Village', passable: true, cost: 0.85, cover: 15, forage: 4 },
  '^': { name: 'High Crag', passable: false, cost: 99, cover: 40, forage: 0 },
  '~': { name: 'Deep River / Sea', passable: false, cost: 99, cover: 0, forage: 0 },
  ':': { name: 'Frozen Ford', passable: true, cost: 1.3, cover: 0, forage: 0 },
};

export const INITIAL_HOUSES = [
  {
    id: 'thorne',
    name: 'House Thorne',
    tag: 'THN',
    lord: 'Lord Garret Thorne',
    seat: 'blackpike',
    isPlayer: true,
    relation: 100,
    honor: 62,
    dread: 25,
    treasury: 320,
    grain: 240,
    attitude: 'player',
    treaty: 'liege',
    betrayalRisk: 0,
    personality: 'lawful',
  },
  {
    id: 'locke',
    name: 'House Locke',
    tag: 'LCK',
    lord: 'Lady Ysabel Locke',
    seat: 'greycrag',
    isPlayer: false,
    relation: 58,
    honor: 74,
    dread: 18,
    treasury: 260,
    grain: 190,
    attitude: 'allied',
    treaty: 'oath',
    betrayalRisk: 14,
    personality: 'honor',
  },
  {
    id: 'brack',
    name: 'House Brack',
    tag: 'BRK',
    lord: 'Lord Harmund Brack',
    seat: 'saltport',
    isPlayer: false,
    relation: 16,
    honor: 28,
    dread: 32,
    treasury: 410,
    grain: 230,
    attitude: 'neutral',
    treaty: 'truce',
    betrayalRisk: 52,
    personality: 'mercantile',
  },
  {
    id: 'vance',
    name: 'House Vance',
    tag: 'VNC',
    lord: 'Lord Corvin Vance',
    seat: 'rookkeep',
    isPlayer: false,
    relation: -22,
    honor: 36,
    dread: 48,
    treasury: 350,
    grain: 210,
    attitude: 'wary',
    treaty: 'none',
    betrayalRisk: 64,
    personality: 'ambitious',
  },
  {
    id: 'dray',
    name: 'Archon Dray',
    tag: 'DRY',
    lord: 'Archon Malcor Dray',
    seat: 'highcrown',
    isPlayer: false,
    relation: -95,
    honor: 18,
    dread: 85,
    treasury: 680,
    grain: 420,
    attitude: 'war',
    treaty: 'war',
    betrayalRisk: 0,
    personality: 'ruthless',
  },
];

export const HOLD_TEMPLATES = [
  {
    id: 'blackpike',
    name: 'Blackpike Keep',
    region: 'Twin-River',
    x: 28,
    y: 16,
    owner: 'thorne',
    wallHp: 180,
    maxWall: 180,
    garrison: 85,
    taxYield: 38,
    grainYield: 26,
    hasIron: false,
    hasPort: false,
    isCapital: true,
    note: 'Twin-towered river keep straddling the northern road.',
  },
  {
    id: 'ashford',
    name: 'Ashford Granary',
    region: 'Greenvale',
    x: 19,
    y: 23,
    owner: 'thorne',
    wallHp: 90,
    maxWall: 90,
    garrison: 45,
    taxYield: 24,
    grainYield: 44,
    hasIron: false,
    hasPort: false,
    isCapital: false,
    note: 'Walled granary barony feeding the northern levies.',
  },
  {
    id: 'greycrag',
    name: 'Greycrag Hold',
    region: 'Northfells',
    x: 24,
    y: 6,
    owner: 'locke',
    wallHp: 170,
    maxWall: 170,
    garrison: 95,
    taxYield: 34,
    grainYield: 18,
    hasIron: true,
    hasPort: false,
    isCapital: false,
    note: 'Mountain ironworks under Lady Ysabel Locke.',
  },
  {
    id: 'oldford',
    name: 'Old Ford Toll',
    region: 'Riverford',
    x: 43,
    y: 17,
    owner: 'thorne',
    wallHp: 115,
    maxWall: 115,
    garrison: 60,
    taxYield: 32,
    grainYield: 22,
    hasIron: false,
    hasPort: false,
    isCapital: false,
    note: 'Gatehouse guarding the main stone span across the Silverflow.',
  },
  {
    id: 'saltport',
    name: 'Saltport Quays',
    region: 'Westreach',
    x: 12,
    y: 29,
    owner: 'brack',
    wallHp: 145,
    maxWall: 145,
    garrison: 105,
    taxYield: 56,
    grainYield: 24,
    hasIron: false,
    hasPort: true,
    isCapital: false,
    note: 'Mercantile harbor fleet; House Brack sells steel to the highest purse.',
  },
  {
    id: 'rookkeep',
    name: "Rook's Keep",
    region: 'Ashmarch',
    x: 57,
    y: 13,
    owner: 'vance',
    wallHp: 165,
    maxWall: 165,
    garrison: 120,
    taxYield: 42,
    grainYield: 28,
    hasIron: true,
    hasPort: false,
    isCapital: false,
    note: 'Basalt watchtower of Lord Corvin Vance overlooking eastern fords.',
  },
  {
    id: 'redwatch',
    name: 'Redwatch Bastion',
    region: 'Red March',
    x: 27,
    y: 34,
    owner: 'dray',
    wallHp: 160,
    maxWall: 160,
    garrison: 110,
    taxYield: 30,
    grainYield: 20,
    hasIron: false,
    hasPort: false,
    isCapital: false,
    note: 'Crimson hilltop fort guarding Archon Dray western flank.',
  },
  {
    id: 'kingsbridge',
    name: 'Kingsbridge Camp',
    region: 'Crownwash',
    x: 48,
    y: 29,
    owner: 'dray',
    wallHp: 130,
    maxWall: 130,
    garrison: 125,
    taxYield: 36,
    grainYield: 30,
    hasIron: false,
    hasPort: false,
    isCapital: false,
    note: 'Usurper forward supply crossing on the Kingsrush.',
  },
  {
    id: 'highcrown',
    name: 'Highcrown Citadel',
    region: 'Crownlands',
    x: 61,
    y: 36,
    owner: 'dray',
    wallHp: 240,
    maxWall: 240,
    garrison: 175,
    taxYield: 68,
    grainYield: 38,
    hasIron: true,
    hasPort: true,
    isCapital: true,
    note: 'Triple-walled seat of the Iron Crown. Only broken gates or broken oaths take it.',
  },
];

export const UNIT_TYPES = {
  guard: {
    id: 'guard',
    code: '@',
    name: 'Household Guard',
    hpPerMan: 16,
    atk: 13,
    armor: 7,
    range: 1,
    speed: 1.0,
    costGold: 60,
    grainUpkeep: 2,
    role: 'Heavy sworn infantry that steadies nearby morale.',
  },
  spear: {
    id: 'spear',
    code: 'S',
    name: 'Shieldwall Pikes',
    hpPerMan: 13,
    atk: 9,
    armor: 6,
    range: 1,
    speed: 0.9,
    costGold: 35,
    grainUpkeep: 1,
    role: 'Brace [F] in shield wall to halve arrows and wreck charging horse.',
  },
  bow: {
    id: 'bow',
    code: 'B',
    name: 'Ashwood Longbows',
    hpPerMan: 9,
    atk: 11,
    armor: 2,
    range: 13,
    speed: 1.0,
    costGold: 45,
    grainUpkeep: 1,
    role: 'Loose [B] arching volleys; devastating into unbraced flanks.',
  },
  horse: {
    id: 'horse',
    code: 'H',
    name: 'Mail Lancers',
    hpPerMan: 17,
    atk: 15,
    armor: 6,
    range: 1,
    speed: 1.55,
    costGold: 75,
    grainUpkeep: 3,
    role: 'Fast flankers; smash side/rear [C] to trigger mass morale routs.',
  },
  ram: {
    id: 'ram',
    code: 'R',
    name: 'Capped Siege Ram',
    hpPerMan: 32,
    atk: 42,
    armor: 10,
    range: 1,
    speed: 0.55,
    costGold: 80,
    grainUpkeep: 1,
    role: 'Timber-roofed iron ram [E] required to breach Keep Gatehouses.',
  },
};

export function createRealmGrid() {
  const g = Array.from({ length: REALM_H }, () => Array(REALM_W).fill('.'));

  const setTile = (x, y, ch) => {
    if (x >= 0 && x < REALM_W && y >= 0 && y < REALM_H) g[y][x] = ch;
  };
  const rect = (x0, y0, x1, y1, ch) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) setTile(x, y, ch);
    }
  };
  const roadLine = (x0, y0, x1, y1, ch = '=') => {
    let x = x0;
    let y = y0;
    setTile(x, y, ch);
    while (x !== x1 || y !== y1) {
      if (Math.abs(x1 - x) >= Math.abs(y1 - y)) {
        x += x < x1 ? 1 : -1;
      } else {
        y += y < y1 ? 1 : -1;
      }
      setTile(x, y, ch);
    }
  };

  // Western Sea coast
  for (let y = 0; y < REALM_H; y++) {
    const coastX = y < 14 ? 4 + Math.floor(Math.sin(y * 0.4) * 2)
      : y < 26 ? 7 + Math.floor((y - 14) * 0.25)
      : 9 + Math.floor(Math.sin(y * 0.35) * 2);
    for (let x = 0; x <= coastX; x++) setTile(x, y, '~');
  }
  // Southern Crown Sea corner
  for (let y = 39; y < REALM_H; y++) {
    for (let x = 0; x < REALM_W; x++) {
      if (x < 50 || y >= 41) setTile(x, y, '~');
    }
  }

  // Northern Crag mountains (with two clear valley passes)
  rect(5, 0, REALM_W - 1, 3, '^');
  rect(10, 4, 17, 9, '^');
  rect(31, 4, 38, 10, '^');
  rect(50, 4, 56, 8, '^');
  rect(67, 4, REALM_W - 1, 16, '^');

  // Eastern ridge overlooking Highcrown
  rect(70, 17, REALM_W - 1, 40, '^');

  // Hill ridges & deep Briar Woods + Mud Flats
  rect(39, 10, 47, 13, 'n');
  rect(14, 12, 20, 15, 'T');
  rect(34, 21, 41, 25, 'T');
  rect(51, 18, 60, 23, 'T');
  rect(16, 28, 22, 33, ',');
  rect(35, 32, 41, 36, ',');
  rect(54, 25, 62, 28, 'n');

  // Silverflow River (across y = 18..19)
  for (let x = 8; x < 70; x++) {
    const ry = 18 + Math.round(Math.sin(x * 0.14) * 1);
    setTile(x, ry, '~');
    setTile(x, ry + 1, '~');
  }
  // Shallow bend in winter / stone bridges at Blackpike & Old Ford & Vance crossing
  setTile(14, 18, ':');
  setTile(14, 19, ':');
  setTile(28, 17, '=');
  setTile(28, 18, '=');
  setTile(28, 19, '=');
  setTile(43, 18, '=');
  setTile(43, 19, '=');
  setTile(58, 17, '=');
  setTile(58, 18, '=');
  setTile(58, 19, '=');

  // Kingsrush River (across y = 30..31)
  for (let x = 10; x < 70; x++) {
    const ry = 30 + (x > 46 ? 1 : 0);
    setTile(x, ry, '~');
    setTile(x, ry + 1, '~');
  }
  setTile(27, 30, '=');
  setTile(27, 31, '=');
  setTile(48, 30, '=');
  setTile(48, 31, '=');
  setTile(48, 32, '=');

  // Strategic King Roads connecting every Hold seamlessly
  roadLine(24, 6, 28, 16, '=');   // Greycrag -> Blackpike
  roadLine(28, 16, 43, 17, '=');  // Blackpike -> Old Ford
  roadLine(43, 17, 57, 13, '=');  // Old Ford -> Rook's Keep
  roadLine(28, 16, 19, 23, '=');  // Blackpike -> Ashford
  roadLine(19, 23, 12, 29, '=');  // Ashford -> Saltport
  roadLine(19, 23, 27, 34, '=');  // Ashford -> Redwatch
  roadLine(43, 17, 48, 29, '=');  // Old Ford -> Kingsbridge
  roadLine(57, 13, 58, 24, '=');  // Rook's Keep south road
  roadLine(58, 24, 48, 29, '=');  // Rook south -> Kingsbridge
  roadLine(27, 34, 48, 29, '=');  // Redwatch -> Kingsbridge
  roadLine(48, 29, 61, 36, '=');  // Kingsbridge -> Highcrown

  // Croft Villages (recruitment & grain foraging)
  const villages = [
    [22, 11],
    [16, 21],
    [35, 16],
    [51, 14],
    [35, 27],
    [20, 35],
    [56, 31],
  ];
  for (const [vx, vy] of villages) setTile(vx, vy, 'v');

  // Ensure Hold tiles and immediate aprons are clear & stamped '#'
  for (const h of HOLD_TEMPLATES) {
    setTile(h.x, h.y, '#');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = h.x + dx;
      const ny = h.y + dy;
      if (g[ny]?.[nx] === '^' || g[ny]?.[nx] === '~') setTile(nx, ny, '.');
    }
  }

  return { grid: g, villages };
}

/**
 * Generates a tactical 66x30 battlefield matched to campaign terrain or siege hold.
 */
export function buildBattleMap({ kind = 'plains', hold = null, gateBreached = false }) {
  const g = Array.from({ length: BATTLE_H }, () => Array(BATTLE_W).fill('.'));
  const setTile = (x, y, ch) => {
    if (x >= 0 && x < BATTLE_W && y >= 0 && y < BATTLE_H) g[y][x] = ch;
  };

  if (kind === 'siege' && hold) {
    // Attacker starts on West (x=3..18), Defender holds Stone Curtain Wall at x=44
    const wallX = 44;
    for (let y = 2; y < BATTLE_H - 2; y++) {
      setTile(wallX, y, '#');
      setTile(wallX + 1, y, '#');
    }
    // Outer stone ditch / moat with timber ramp on gate lane (y = 12..16)
    for (let y = 3; y < BATTLE_H - 3; y++) {
      if (y < 12 || y > 16) setTile(wallX - 3, y, '~');
    }
    // Gatehouse at y = 13..15 (breachable from 'H' to '.')
    for (let y = 13; y <= 15; y++) {
      setTile(wallX, y, gateBreached ? '.' : 'H');
      setTile(wallX + 1, y, gateBreached ? '.' : 'H');
    }
    // North & South scaling breach notches / ladder ledges ('L')
    setTile(wallX, 6, 'L');
    setTile(wallX + 1, 6, 'L');
    setTile(wallX, 23, 'L');
    setTile(wallX + 1, 23, 'L');

    // Courtyard keep pillars behind wall
    for (let y = 8; y <= 21; y += 6) {
      setTile(54, y, '#');
      setTile(55, y, '#');
    }
    // Timber siege mantelets for approaching troops
    for (const [mx, my] of [[24, 9], [28, 14], [24, 20], [34, 11], [34, 18]]) {
      setTile(mx, my, 'T');
    }
    return { grid: g, wallX, gateY: 14, kind: 'siege' };
  }

  if (kind === 'bridge') {
    // North-south river cutting center x=31..34 with wide stone span at y=11..17 and icy bend y=4..5
    for (let y = 0; y < BATTLE_H; y++) {
      for (let x = 31; x <= 34; x++) setTile(x, y, '~');
    }
    for (let y = 12; y <= 17; y++) {
      for (let x = 30; x <= 35; x++) setTile(x, y, '=');
    }
    for (let y = 4; y <= 5; y++) {
      for (let x = 31; x <= 34; x++) setTile(x, y, ':');
    }
    for (const [fx, fy] of [[21, 6], [22, 7], [20, 22], [44, 7], [46, 21]]) {
      setTile(fx, fy, 'T');
      setTile(fx + 1, fy, 'T');
    }
    return { grid: g, wallX: null, gateY: null, kind: 'bridge' };
  }

  if (kind === 'forest' || kind === 'mud') {
    const ch = kind === 'forest' ? 'T' : ',';
    const clusters = [
      [20, 6], [21, 7], [26, 13], [27, 14], [22, 22],
      [38, 8], [40, 16], [42, 23], [33, 5], [34, 24],
    ];
    for (const [cx, cy] of clusters) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= 2) setTile(cx + dx, cy + dy, ch);
        }
      }
    }
    return { grid: g, wallX: null, gateY: null, kind };
  }

  // Open plains with subtle ridge cover
  for (const [rx, ry] of [[28, 7], [29, 7], [37, 21], [38, 21], [33, 14]]) {
    setTile(rx, ry, 'n');
  }
  return { grid: g, wallX: null, gateY: null, kind: 'plains' };
}

export function makeDefaultRegiments(ownerTag, scale = 1.0, includeRam = false) {
  const list = [
    { id: `${ownerTag}_guard`, type: 'guard', men: Math.round(35 * scale), maxMen: Math.round(35 * scale), morale: 92 },
    { id: `${ownerTag}_spear`, type: 'spear', men: Math.round(60 * scale), maxMen: Math.round(60 * scale), morale: 84 },
    { id: `${ownerTag}_bow`, type: 'bow', men: Math.round(45 * scale), maxMen: Math.round(45 * scale), morale: 80 },
    { id: `${ownerTag}_horse`, type: 'horse', men: Math.round(28 * scale), maxMen: Math.round(28 * scale), morale: 86 },
  ];
  if (includeRam) {
    list.push({ id: `${ownerTag}_ram`, type: 'ram', men: 12, maxMen: 12, morale: 90 });
  }
  return list;
}
