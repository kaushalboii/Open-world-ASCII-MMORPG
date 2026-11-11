// Tactical ASCII Tower Defense & Wave Siege — Browser Edition + Sprite Studio

const COLS = 100;
const ROWS = 32;
const MAP_COLS = 15;
const MAP_ROWS = 8;
const TILE_W = 5;
const TILE_H = 3;

const TARGET_MODES = ['first', 'last', 'closest', 'strongest', 'weakest'];
const BUILD_ORDER = ['pulse', 'tesla', 'mortar', 'cryo', 'barricade'];

const C = {
  CYAN: '#00f0ff',
  SKY: '#78dcff',
  YELLOW: '#ffea00',
  AMBER: '#ffa528',
  RED: '#ff4655',
  CRIMSON: '#b4283c',
  GREEN: '#50fa8c',
  MAGENTA: '#ff50aa',
  WHITE: '#f5f8ff',
  SILVER: '#b4c0d2',
  DIM: '#58647a',
  DARK_SLATE: '#262e40',
  BG: '#0a0c12',
  TILE_BG: '#0f121b',
  PATH_BG: '#141926',
  WALL_BG: '#1c202e',
};

const DAMAGE_TIERS = [
  [0.75, '███', 'INTACT', C.CYAN],
  [0.50, '▓▓▓', 'CHIPPED', C.YELLOW],
  [0.25, '▒▒▒', 'CRACKED', C.AMBER],
  [0.00, '░░░', 'CRITICAL', C.RED],
];

export function structuralDamageVisual(ratio) {
  const r = Math.max(0, Math.min(1, ratio));
  for (const [thresh, blocks, label, col] of DAMAGE_TIERS) {
    if (r > thresh) return [blocks, label, col];
  }
  return ['░░░', 'CRITICAL', C.RED];
}

const TOWER_PALETTE = {
  '[': C.SILVER, ']': C.SILVER, '(': C.YELLOW, ')': C.YELLOW,
  '<': C.SKY, '>': C.SKY, '╔': C.CYAN, '╗': C.CYAN,
  '╚': C.DIM, '╝': C.DIM, '═': C.DIM, '╩': C.DIM,
  '▼': C.SKY, '▲': C.WHITE, '=': C.CYAN, '|': C.WHITE,
  '^': C.WHITE, 'v': C.WHITE, '-': C.CYAN, '.': C.DIM,
  '☼': C.YELLOW, '◈': C.CYAN, 'O': C.AMBER, '/': C.SILVER,
  '\\': C.SILVER, '*': C.YELLOW, '█': C.AMBER, '▓': C.YELLOW,
  '▒': C.AMBER, '░': C.RED, '⚡': C.YELLOW, '│': C.CYAN,
};

export const TOWER_DEFS = {
  pulse: {
    kind: 'pulse', hotkey: '1', name: 'Pulse Repeater', badge: '[=|=]',
    cost: 50, range: 3.3, minRange: 0, fireInterval: 0.46, damage: 16,
    splash: 0, chain: 1, slow: 0, slowDur: 0, hitAir: true, barricade: false,
    maxHp: 120, glyph: '->', desc: 'Rapid (->) Gnd + Air',
  },
  tesla: {
    kind: 'tesla', hotkey: '2', name: 'Tesla Coil', badge: '(☼)',
    cost: 75, range: 2.9, minRange: 0, fireInterval: 1.15, damage: 28,
    splash: 0, chain: 2, slow: 0, slowDur: 0, hitAir: true, barricade: false,
    maxHp: 120, glyph: '⚡', desc: 'Chain (⚡) +25% Armor',
  },
  mortar: {
    kind: 'mortar', hotkey: '3', name: 'Siege Mortar', badge: '[███]',
    cost: 90, range: 4.8, minRange: 1.2, fireInterval: 2.10, damage: 50,
    splash: 1.35, chain: 1, slow: 0, slowDur: 0, hitAir: false, barricade: false,
    maxHp: 150, glyph: '***', desc: 'Arc (***) Ground AoE',
  },
  cryo: {
    kind: 'cryo', hotkey: '4', name: 'Cryo Emitter', badge: '<◈>',
    cost: 65, range: 2.8, minRange: 0, fireInterval: 0.90, damage: 10,
    splash: 0, chain: 1, slow: 0.45, slowDur: 2.4, hitAir: true, barricade: false,
    maxHp: 115, glyph: '*>', desc: 'Frost (*>) 45% Slow',
  },
  barricade: {
    kind: 'barricade', hotkey: '5', name: 'Blast Barricade', badge: '[██]',
    cost: 15, range: 0, minRange: 0, fireInterval: 0, damage: 0,
    splash: 0, chain: 0, slow: 0, slowDur: 0, hitAir: false, barricade: true,
    maxHp: 160, glyph: '█', desc: 'Wall ███→▓▓▓→▒▒▒→░░░',
  },
};

export const ENEMY_DEFS = {
  scout:  { kind: 'scout',  name: 'Swarm Runner',      glyph: '>o>', hp: 44,  armor: 0,   speed: 2.65, bounty: 7,  coreDmg: 8,  barDps: 16, flying: false, boss: false },
  grunt:  { kind: 'grunt',  name: 'Shock Trooper',     glyph: '[X]', hp: 96,  armor: 0,   speed: 1.55, bounty: 11, coreDmg: 12, barDps: 24, flying: false, boss: false },
  tank:   { kind: 'tank',   name: 'Shield Juggernaut', glyph: '[▓]', hp: 185, armor: 115, speed: 1.02, bounty: 20, coreDmg: 18, barDps: 34, flying: false, boss: false },
  sapper: { kind: 'sapper', name: 'Siege Sapper',      glyph: '{!}', hp: 115, armor: 35,  speed: 1.65, bounty: 16, coreDmg: 14, barDps: 52, flying: false, boss: false },
  drone:  { kind: 'drone',  name: 'Sky Wraith',        glyph: '<v>', hp: 80,  armor: 0,   speed: 2.20, bounty: 13, coreDmg: 10, barDps: 0,  flying: true,  boss: false },
  boss:   { kind: 'boss',   name: 'Dread Colossus',    glyph: '[Ω]', hp: 760, armor: 280, speed: 0.76, bounty: 85, coreDmg: 45, barDps: 80, flying: false, boss: true, empInt: 3.4, empDmg: 24 },
};

const WAVE_DEFS = [
  { num: 1,  title: 'First Probe',     mult: 1.00, groups: [['grunt', 7, 1.05, 0]] },
  { num: 2,  title: 'Skirmish Rush',   mult: 1.10, groups: [['scout', 8, 0.55, 0], ['grunt', 5, 0.95, 1.2]] },
  { num: 3,  title: 'Iron Vanguard',   mult: 1.22, groups: [['grunt', 6, 0.90, 0], ['tank', 3, 1.65, 0.8]] },
  { num: 4,  title: 'Wall Breakers',   mult: 1.34, groups: [['scout', 6, 0.50, 0], ['sapper', 4, 1.10, 0.7], ['grunt', 4, 0.90, 0.5]] },
  { num: 5,  title: 'Sky Raid',        mult: 1.48, groups: [['grunt', 6, 0.85, 0], ['drone', 6, 0.80, 0.9]] },
  { num: 6,  title: 'Armored Convoy',  mult: 1.65, groups: [['tank', 5, 1.35, 0], ['sapper', 4, 0.95, 0.6], ['scout', 6, 0.45, 0.6]] },
  { num: 7,  title: 'Combined Arms',   mult: 1.85, groups: [['scout', 8, 0.42, 0], ['tank', 4, 1.30, 0.7], ['drone', 5, 0.75, 0.6], ['sapper', 4, 0.95, 0.5]] },
  { num: 8,  title: 'Swarm Stampede',  mult: 2.05, groups: [['scout', 16, 0.34, 0], ['drone', 6, 0.65, 0.8], ['tank', 4, 1.15, 0.6]] },
  { num: 9,  title: 'Bastion Breaker', mult: 2.28, groups: [['tank', 6, 1.10, 0], ['sapper', 6, 0.80, 0.5], ['drone', 6, 0.65, 0.5], ['grunt', 6, 0.75, 0.4]] },
  { num: 10, title: 'DREAD COLOSSUS',  mult: 2.50, groups: [['boss', 1, 2.0, 0], ['tank', 5, 1.10, 0.8], ['sapper', 5, 0.85, 0.6], ['drone', 6, 0.65, 0.5]] },
];

export const MAP_PRESETS = [
  {
    id: 'twin_bastion', name: 'Twin Bastion Gate', gold: 165, coreHp: 100,
    desc: 'Two western portals merge through twin obsidian archways.',
    rows: [
      '###.........###',
      'S==.........==#',
      '#....##.##....#',
      '#............=G',
      '#....##.##....#',
      '#.............#',
      'S==.........==#',
      '###.........###',
    ],
  },
  {
    id: 'spiral_switchback', name: 'Spiral Switchback', gold: 175, coreHp: 100,
    desc: 'Tiered canyon bridges reward maze-lengthening killboxes.',
    rows: [
      'S==.....#.....#',
      '###.###.#.###.#',
      '#...=.....=..=#',
      '#.###.###.###.#',
      '#.............#',
      '#.###.#####.#.#',
      '#.............#',
      '#########...==G',
    ],
  },
];

function getWaveSpec(waveNum) {
  if (waveNum <= WAVE_DEFS.length) return WAVE_DEFS[waveNum - 1];
  const extra = waveNum - WAVE_DEFS.length;
  const groups = [
    ['tank', 4 + Math.floor(extra / 2), Math.max(0.65, 1.15 - extra * 0.03), 0],
    ['sapper', 4 + Math.floor(extra / 2), 0.80, 0.5],
    ['drone', 5 + Math.floor(extra / 2), 0.60, 0.5],
    ['scout', 8 + extra, 0.35, 0.4],
  ];
  if (waveNum % 5 === 0) groups.unshift(['boss', 1 + Math.floor(extra / 10), 2.0, 0]);
  return { num: waveNum, title: `Endless Siege ${waveNum}`, mult: +(2.5 * (1.16 ** extra)).toFixed(2), groups };
}

function waveSummary(spec) {
  const counts = {};
  for (const [k, qty] of spec.groups) counts[k] = (counts[k] || 0) + qty;
  return Object.entries(counts).map(([k, q]) => `${q}x${ENEMY_DEFS[k].glyph}`).join(' ');
}

const keyOf = (c, r) => `${c},${r}`;

// --- Pathfinding (A* & Anti-Block BFS) ---
function bfsDistances(blockedSet, goal) {
  const dist = new Map();
  const gk = keyOf(goal[0], goal[1]);
  if (blockedSet.has(gk)) return dist;
  dist.set(gk, 0);
  const queue = [goal];
  let head = 0;
  while (head < queue.length) {
    const [c, r] = queue[head++];
    const bd = dist.get(keyOf(c, r));
    for (const [nc, nr] of [[c + 1, r], [c, r + 1], [c - 1, r], [c, r - 1]]) {
      if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) continue;
      const k = keyOf(nc, nr);
      if (blockedSet.has(k) || dist.has(k)) continue;
      dist.set(k, bd + 1);
      queue.push([nc, nr]);
    }
  }
  return dist;
}

function findAStarPath(blockedSet, tileCosts, start, goal) {
  const sk = keyOf(start[0], start[1]);
  const gk = keyOf(goal[0], goal[1]);
  if (blockedSet.has(gk)) return [];
  const frontier = [{ pos: start, k: sk, prio: 0 }];
  const cameFrom = new Map([[sk, null]]);
  const costSoFar = new Map([[sk, 0]]);
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.prio - b.prio);
    const cur = frontier.shift();
    if (cur.k === gk) {
      const out = [];
      let trace = gk;
      while (trace !== null) {
        const [cc, rr] = trace.split(',').map(Number);
        out.push([cc, rr]);
        trace = cameFrom.get(trace) ?? null;
      }
      out.reverse();
      return out;
    }
    const [c, r] = cur.pos;
    for (const [nc, nr] of [[c + 1, r], [c, r + 1], [c - 1, r], [c, r - 1]]) {
      if (nc < 0 || nc >= MAP_COLS || nr < 0 || nr >= MAP_ROWS) continue;
      const nk = keyOf(nc, nr);
      if (blockedSet.has(nk)) continue;
      const newCost = costSoFar.get(cur.k) + (tileCosts.get(nk) ?? 1);
      if (!costSoFar.has(nk) || newCost < costSoFar.get(nk)) {
        costSoFar.set(nk, newCost);
        const h = Math.abs(goal[0] - nc) + Math.abs(goal[1] - nr);
        frontier.push({ pos: [nc, nr], k: nk, prio: newCost + h });
        cameFrom.set(nk, cur.k);
      }
    }
  }
  return [];
}

// --- WebAudio Retro Synth ---
class SfxSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  unlock() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  tone(freq, dur, type = 'square', vol = 0.06, slideTo = null) {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch (_) {}
  }
  build() { this.tone(420, 0.09, 'triangle', 0.08, 680); }
  shoot() { this.tone(760, 0.05, 'square', 0.03, 340); }
  zap() { this.tone(920, 0.10, 'sawtooth', 0.04, 280); }
  blast() { this.tone(160, 0.22, 'sawtooth', 0.08, 45); }
  breach() { this.tone(110, 0.26, 'square', 0.09, 38); }
  wave() { this.tone(330, 0.14, 'triangle', 0.07, 520); }
}

// --- Sprite Generators + Studio Sync ---
function defaultTurretLines(kind, level = 1, firing = false, aim = 'R', tick = 0) {
  if (kind === 'pulse') {
    if (firing) {
      const muzzle = { R: '[*|->', L: '<-|*]', U: '[*^*]', D: '[*v*]' }[aim] || '[*|*]';
      const top = aim === 'U' ? ' *^* ' : (level >= 2 ? ' ╔═╗ ' : ' .=. ');
      const bot = level === 1 ? '/═══\\' : '╠═══╣';
      return [top, muzzle, bot];
    }
    let barrel = { R: '[=|=]', L: '[=|=]', U: '[=^=]', D: '[=v=]' }[aim] || '[=|=]';
    let top = ' .=. ', bot = '/═══\\';
    if (level >= 3) {
      top = ' ╔═╗ ';
      barrel = (aim === 'R' || aim === 'L') ? '{=|=}' : `{=${aim}=}`;
      bot = '╚═╩═╝';
    } else if (level === 2) {
      top = ' ╔.╗ ';
      bot = '╠═══╣';
    }
    return [top, barrel, bot];
  }
  if (kind === 'tesla') {
    const spark = tick % 2 === 0 ? '/|\\' : '\\|/';
    if (firing) return [' *│* ', '(*☼*)', '╚═╩═╝'];
    const core = level === 1 ? ' (☼) ' : (level >= 3 ? '(☼☼☼)' : '(☼·☼)');
    return [` ${spark} `, core, '╚═╩═╝'];
  }
  if (kind === 'mortar') {
    if (firing) return ['\\ * /', '[▓▓▓]', '╚═══╝'];
    const crown = level === 1 ? ' /O\\ ' : (level === 2 ? ' /╬\\ ' : '╔═O═╗');
    const body = level < 3 ? '[███]' : '{███}';
    return [crown, body, '╚═══╝'];
  }
  if (kind === 'cryo') {
    if (firing) return [' *▲* ', '<◈*◈>', '╚═▼═╝'];
    const core = level === 1 ? ' <◈> ' : (level === 2 ? '<◈·◈>' : '<◈◈◈>');
    return [' .▲. ', core, '╚═▼═╝'];
  }
  return ['╔═══╗', '║███║', '╚═══╝'];
}

function barricadeSprite(ratio) {
  const [blocks, , col] = structuralDamageVisual(ratio);
  if (ratio <= 0) return [[' . . ', ' ... ', ' . . '], { '.': C.DIM }];
  const bc = ratio <= 0.5 ? col : C.SILVER;
  return [['╔═══╗', `║${blocks}║`, '╚═══╝'], { '╔': bc, '╗': bc, '╚': bc, '╝': bc, '═': bc, '║': bc, '█': col, '▓': col, '▒': col, '░': col }];
}

function coreSprite(ratio, tick = 0) {
  const [blocks, , col] = structuralDamageVisual(ratio);
  const g = tick % 4 < 2 ? 'Ω' : '◈';
  return [[`╔${blocks}╗`, `║ ${g} ║`, `╚${blocks}╝`], { '╔': col, '╗': col, '╚': col, '╝': col, '║': col, 'Ω': ratio > 0.25 ? C.WHITE : C.RED, '◈': ratio > 0.25 ? C.CYAN : C.AMBER, '█': col, '▓': col, '▒': col, '░': col }];
}

function enemySprite(kind, hpRatio, armorRatio, tick, chilled) {
  const step = tick % 2;
  const ct = chilled ? C.SKY : null;
  if (kind === 'scout') {
    const fg = ct || C.GREEN;
    return [['  .  ', step ? ' ~R> ' : ' ~r> ', ' / \\ '], { '~': C.DIM, r: fg, R: C.WHITE, '>': C.YELLOW, '.': fg, '/': fg, '\\': fg }];
  }
  if (kind === 'grunt') {
    const fg = ct || C.AMBER;
    return [[' .-. ', step ? '<[O]>' : '<[o]>', ' d b '], { '<': C.DIM, '>': C.DIM, '[': C.SILVER, ']': C.SILVER, o: fg, O: C.WHITE, '.': fg, '-': fg, d: fg, b: fg }];
  }
  if (kind === 'tank') {
    const [blocks, , sc] = structuralDamageVisual(armorRatio > 0 ? armorRatio : hpRatio);
    const fg = ct || sc;
    return [[`╔${blocks}╗`, `[${blocks}]`, 'o═o═o'], { '╔': C.SILVER, '╗': C.SILVER, '[': C.WHITE, ']': C.WHITE, o: C.DIM, '═': C.DIM, '█': fg, '▓': fg, '▒': fg, '░': fg }];
  }
  if (kind === 'sapper') {
    const fg = ct || C.RED;
    return [[' /!\\ ', step ? '{██*}' : '{██+}', ' ^ ^ '], { '/': C.YELLOW, '\\': C.YELLOW, '!': C.WHITE, '{': fg, '}': fg, '█': C.AMBER, '*': C.YELLOW, '+': C.RED, '^': C.SILVER }];
  }
  if (kind === 'drone') {
    const fg = ct || '#78dcff';
    return [[step ? '-~^~-' : ' ~^~ ', ' <v> ', '     '], { '-': C.DIM, '~': fg, '^': C.WHITE, '<': fg, '>': fg, v: C.CYAN }];
  }
  const [blocks, , bc] = structuralDamageVisual(armorRatio > 0 ? armorRatio : hpRatio);
  const bfg = ct || bc;
  return [[`{${blocks}}`, `║Ω♦Ω║`, '╩═╩═╩'], { '{': C.MAGENTA, '}': C.MAGENTA, 'Ω': C.YELLOW, '♦': C.CYAN, '║': C.RED, '╩': C.SILVER, '═': C.SILVER, '█': bfg, '▓': bfg, '▒': bfg, '░': bfg }];
}

function buildStudioCatalog() {
  return [
    { id: 'turret_pulse', cat: 'Turrets', name: 'Pulse Repeater [=|=]', desc: 'Dual-barrel kinetic sentry firing (->) bolts.', fps: 3, frames: [defaultTurretLines('pulse', 1, false), defaultTurretLines('pulse', 1, true), defaultTurretLines('pulse', 2, false), defaultTurretLines('pulse', 3, true)], palette: TOWER_PALETTE },
    { id: 'turret_tesla', cat: 'Turrets', name: 'Tesla Spire (☼)', desc: 'Chain lightning (⚡) spire with armor bonus.', fps: 4, frames: [defaultTurretLines('tesla', 1, false, 'R', 0), defaultTurretLines('tesla', 1, false, 'R', 1), defaultTurretLines('tesla', 2, true, 'R', 0), defaultTurretLines('tesla', 3, true, 'R', 1)], palette: TOWER_PALETTE },
    { id: 'turret_mortar', cat: 'Turrets', name: 'Siege Mortar ***', desc: 'Parabolic artillery launching arcing (***) shells.', fps: 2.5, frames: [defaultTurretLines('mortar', 1, false), defaultTurretLines('mortar', 1, true), defaultTurretLines('mortar', 2, false), defaultTurretLines('mortar', 3, true)], palette: TOWER_PALETTE },
    { id: 'turret_cryo', cat: 'Turrets', name: 'Cryo Prism <◈>', desc: 'Cryo crystal firing frost shards (*>) to slow foes.', fps: 3, frames: [defaultTurretLines('cryo', 1, false), defaultTurretLines('cryo', 1, true), defaultTurretLines('cryo', 2, false), defaultTurretLines('cryo', 3, true)], palette: TOWER_PALETTE },
    { id: 'damage_barricade', cat: 'Structural', name: 'Barricade (███ -> ░░░)', desc: 'Structural wear across intact to critical tiers.', fps: 1.5, frames: [barricadeSprite(1)[0], barricadeSprite(0.65)[0], barricadeSprite(0.35)[0], barricadeSprite(0.15)[0]], palette: { '╔': C.CYAN, '╗': C.CYAN, '╚': C.CYAN, '╝': C.CYAN, '═': C.CYAN, '║': C.CYAN, '█': C.CYAN, '▓': C.YELLOW, '▒': C.AMBER, '░': C.RED } },
    { id: 'damage_core', cat: 'Structural', name: 'Citadel Core [Ω]', desc: 'Bastion Core showing structural damage degradation.', fps: 2, frames: [coreSprite(1, 0)[0], coreSprite(0.65, 2)[0], coreSprite(0.35, 0)[0], coreSprite(0.15, 2)[0]], palette: { '╔': C.CYAN, '╗': C.CYAN, '╚': C.CYAN, '╝': C.CYAN, '║': C.CYAN, 'Ω': C.WHITE, '◈': C.CYAN, '█': C.CYAN, '▓': C.YELLOW, '▒': C.AMBER, '░': C.RED } },
    { id: 'vfx_projectiles', cat: 'VFX', name: 'Projectiles (->, ⚡, ***)', desc: 'Pulse bolt, chain lightning arc, and mortar shell.', fps: 4, frames: [['  ->  ', ' .    ', '      '], ['   -> ', '  .   ', '      '], [' ⚡~⚡ ', '  *⚡  ', '      '], ['  *** ', ' +*+  ', ' ·*·  ']], palette: { '-': C.CYAN, '>': C.WHITE, '.': C.DIM, '⚡': C.YELLOW, '~': C.SKY, '*': C.AMBER, '+': C.YELLOW, '·': C.RED } },
    { id: 'enemy_tank', cat: 'Enemies', name: 'Shield Tank [███]', desc: 'Armored juggernaut losing plates per hit.', fps: 2, frames: [enemySprite('tank', 1, 1, 0)[0], enemySprite('tank', 0.7, 0.65, 1)[0], enemySprite('tank', 0.4, 0.35, 0)[0], enemySprite('tank', 0.2, 0.15, 1)[0]], palette: { '╔': C.SILVER, '╗': C.SILVER, '[': C.WHITE, ']': C.WHITE, o: C.DIM, '═': C.DIM, '█': C.CYAN, '▓': C.YELLOW, '▒': C.AMBER, '░': C.RED } },
    { id: 'enemy_boss', cat: 'Enemies', name: 'Dread Colossus {Ω}', desc: 'Wave 10 Siege Boss triggering EMP shockwaves.', fps: 2, frames: [enemySprite('boss', 1, 1, 0)[0], enemySprite('boss', 0.65, 0.65, 1)[0], enemySprite('boss', 0.35, 0.35, 0)[0], enemySprite('boss', 0.15, 0.15, 1)[0]], palette: { '{': C.MAGENTA, '}': C.MAGENTA, 'Ω': C.YELLOW, '♦': C.CYAN, '║': C.RED, '╩': C.SILVER, '═': C.SILVER, '█': C.CYAN, '▓': C.YELLOW, '▒': C.AMBER, '░': C.RED } },
  ];
}

// --- 100x32 Character Buffer ---
class AsciiBuffer {
  constructor() {
    this.chars = Array.from({ length: ROWS }, () => Array(COLS).fill(' '));
    this.fg = Array.from({ length: ROWS }, () => Array(COLS).fill(C.SILVER));
    this.bg = Array.from({ length: ROWS }, () => Array(COLS).fill(C.BG));
  }
  clear(bg = C.BG) {
    for (let r = 0; r < ROWS; r++) {
      this.chars[r].fill(' ');
      this.fg[r].fill(C.SILVER);
      this.bg[r].fill(bg);
    }
  }
  setCell(c, r, ch, fg = null, bg = null) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    this.chars[r][c] = ch[0] || ' ';
    if (fg) this.fg[r][c] = fg;
    if (bg) this.bg[r][c] = bg;
  }
  fillRect(c, r, w, h, ch = ' ', fg = null, bg = null) {
    for (let rr = r; rr < r + h; rr++) {
      for (let cc = c; cc < c + w; cc++) this.setCell(cc, rr, ch, fg, bg);
    }
  }
  drawText(c, r, text, fg = C.WHITE, bg = null) {
    for (let i = 0; i < text.length; i++) this.setCell(c + i, r, text[i], fg, bg);
  }
  drawSprite(c, r, lines, palette = null, defaultFg = C.WHITE, overrideFg = null, transparent = true) {
    for (let dr = 0; dr < lines.length; dr++) {
      const line = lines[dr];
      for (let dc = 0; dc < line.length; dc++) {
        const ch = line[dc];
        if (transparent && ch === ' ') continue;
        const fg = overrideFg || (palette && palette[ch]) || defaultFg;
        this.setCell(c + dc, r + dr, ch, fg, null);
      }
    }
  }
  drawBox(c, r, w, h, title = '', borderFg = '#41628a', titleFg = C.CYAN, fillBg = null) {
    if (fillBg) this.fillRect(c, r, w, h, ' ', null, fillBg);
    this.setCell(c, r, '╔', borderFg);
    this.setCell(c + w - 1, r, '╗', borderFg);
    this.setCell(c, r + h - 1, '╚', borderFg);
    this.setCell(c + w - 1, r + h - 1, '╝', borderFg);
    for (let x = c + 1; x < c + w - 1; x++) {
      this.setCell(x, r, '═', borderFg);
      this.setCell(x, r + h - 1, '═', borderFg);
    }
    for (let y = r + 1; y < r + h - 1; y++) {
      this.setCell(c, y, '║', borderFg);
      this.setCell(c + w - 1, y, '║', borderFg);
    }
    if (title) this.drawText(c + 2, r, `═[ ${title} ]`.slice(0, w - 4), titleFg);
  }
  drawBar(c, r, w, ratio, fg = C.GREEN, emptyFg = C.DARK_SLATE) {
    const filled = Math.round(Math.max(0, Math.min(1, ratio)) * w);
    for (let i = 0; i < w; i++) this.setCell(c + i, r, i < filled ? '█' : '░', i < filled ? fg : emptyFg);
  }
}

// --- Simulation Engine ---
class Simulation {
  constructor(presetIdx, sfx) {
    this.preset = MAP_PRESETS[presetIdx % MAP_PRESETS.length];
    this.sfx = sfx;
    this.spawns = [];
    this.goal = [14, 3];
    this.cliffs = new Set();
    this.roads = new Set();
    this.preset.rows.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        const ch = line[c], k = keyOf(c, r);
        if (ch === 'S') this.spawns.push([c, r]);
        else if (ch === 'G') this.goal = [c, r];
        else if (ch === '#') this.cliffs.add(k);
        else if (ch === '=') this.roads.add(k);
      }
    });
    this.gold = this.preset.gold;
    this.coreHp = this.preset.coreHp;
    this.maxCoreHp = this.preset.coreHp;
    this.score = 0;
    this.kills = 0;
    this.waveNum = 0;
    this.totalWaves = 10;
    this.waveActive = false;
    this.prepTimer = 0;
    this.spawnQueue = [];
    this.waveElapsed = 0;
    this.waveSpec = getWaveSpec(1);
    this.victory = false;
    this.gameOver = false;
    this.towers = new Map();
    this.enemies = [];
    this.projectiles = [];
    this.arcs = [];
    this.blasts = [];
    this.popups = [];
    this.cursor = [7, 4];
    this.selectedBuild = 'pulse';
    this.selectedTileKey = null;
    this.simTime = 0;
    this.animTick = 0;
    this.speedMult = 1;
    this.trauma = 0;
    this.reduceShake = false;
    this.uidSeq = 1;
    this.log = [`Map: ${this.preset.name}`, 'Select turret [1-5], click tile to build, click [Send Wave] / [G].'];
    this.spawnPaths = [];
    this.recomputePaths();
  }

  emit(msg) {
    this.log.push(msg);
    if (this.log.length > 20) this.log = this.log.slice(-20);
  }
  terrain(c, r) {
    const k = keyOf(c, r);
    if (this.spawns.some(([sc, sr]) => sc === c && sr === r)) return 'spawn';
    if (c === this.goal[0] && r === this.goal[1]) return 'goal';
    if (this.cliffs.has(k)) return 'cliff';
    if (this.roads.has(k)) return 'road';
    return 'open';
  }
  hardBlocked() {
    const s = new Set(this.cliffs);
    for (const [k, t] of this.towers) if (!t.def.barricade) s.add(k);
    return s;
  }
  recomputePaths() {
    const hb = this.hardBlocked();
    const normalCost = new Map(), sapperCost = new Map();
    for (const [k, t] of this.towers) if (t.def.barricade) { normalCost.set(k, 14); sapperCost.set(k, 3); }
    this.spawnPaths = this.spawns.map((sp) => findAStarPath(hb, normalCost, sp, this.goal));
    for (const e of this.enemies) {
      if (!e.alive || e.flying) continue;
      const costs = e.kind === 'sapper' ? sapperCost : normalCost;
      const start = [Math.round(e.x), Math.round(e.y)];
      const p = findAStarPath(hb, costs, hb.has(keyOf(start[0], start[1])) ? this.spawns[0] : start, this.goal);
      if (p.length > 0) {
        e.path = p;
        e.wpIdx = p.length > 1 ? 1 : 0;
        if (e.breachKey && !this.towers.has(e.breachKey)) e.breachKey = null;
      }
    }
  }
  canBuildAt(c, r, kind) {
    if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return [false, 'Out of bounds.'];
    const tdef = TOWER_DEFS[kind];
    if (this.gold < tdef.cost) return [false, `Need ${tdef.cost}g (have ${this.gold}g).`];
    const ter = this.terrain(c, r);
    if (ter === 'spawn' || ter === 'goal' || ter === 'cliff') return [false, `Cannot build on ${ter}.`];
    if (ter === 'road' && !tdef.barricade) return [false, 'Road allows Barricades [5] only.'];
    const k = keyOf(c, r);
    if (this.towers.has(k)) return [false, 'Tile occupied.'];
    if (this.enemies.some((e) => e.alive && !e.flying && Math.round(e.x) === c && Math.round(e.y) === r)) return [false, 'Enemy stands on tile.'];
    if (!tdef.barricade) {
      const hb = this.hardBlocked();
      hb.add(k);
      const dist = bfsDistances(hb, this.goal);
      for (const [sc, sr] of this.spawns) if (!dist.has(keyOf(sc, sr))) return [false, 'Blocked! Must keep Core path open.'];
      for (const e of this.enemies) if (e.alive && !e.flying && !dist.has(keyOf(Math.round(e.x), Math.round(e.y)))) return [false, 'Would trap living enemy.'];
    }
    return [true, 'OK'];
  }
  place(c, r, kind = this.selectedBuild) {
    const [ok, msg] = this.canBuildAt(c, r, kind);
    if (!ok) { this.emit(msg); return false; }
    const def = TOWER_DEFS[kind];
    const k = keyOf(c, r);
    this.gold -= def.cost;
    this.towers.set(k, {
      uid: this.uidSeq++, kind, def, c, r, k, level: 1, mode: 'first',
      cooldown: 0, aim: 'R', flash: 0, invested: def.cost, dmgDone: 0, kills: 0,
      hp: def.maxHp, maxHp: def.maxHp,
    });
    this.selectedTileKey = k;
    this.recomputePaths();
    this.sfx.build();
    this.emit(`Built ${def.name} ${def.badge} (-${def.cost}g).`);
    return true;
  }
  activeTower() {
    return this.towers.get(keyOf(this.cursor[0], this.cursor[1])) || (this.selectedTileKey ? this.towers.get(this.selectedTileKey) : null);
  }
  upgradeCost(t) { return t.level >= 3 ? null : Math.max(10, Math.round(t.def.cost * (t.level === 1 ? 0.85 : 1.45))); }
  upgrade() {
    const t = this.activeTower();
    if (!t) return;
    const cost = this.upgradeCost(t);
    if (!cost || this.gold < cost) { this.emit(cost ? `Upgrade needs ${cost}g.` : 'Already L3 MAX.'); return; }
    this.gold -= cost; t.level += 1; t.invested += cost;
    if (t.def.barricade) { t.maxHp = [160, 270, 420][t.level - 1]; t.hp = t.maxHp; }
    this.sfx.build();
    this.emit(`Upgraded ${t.def.name} to L${t.level} (-${cost}g).`);
  }
  repair() {
    const t = this.activeTower();
    if (!t || t.hp >= t.maxHp - 0.5) return;
    const cost = Math.max(2, Math.round((t.maxHp - t.hp) * 0.12));
    if (this.gold < cost) { this.emit(`Repair needs ${cost}g.`); return; }
    this.gold -= cost; t.hp = t.maxHp; this.sfx.build();
    this.emit(`Repaired ${t.def.name} (-${cost}g).`);
  }
  sell() {
    const t = this.activeTower();
    if (!t) return;
    const ref = Math.round(t.invested * 0.70);
    this.towers.delete(t.k);
    if (this.selectedTileKey === t.k) this.selectedTileKey = null;
    this.gold += ref;
    this.recomputePaths();
    this.emit(`Sold ${t.def.name} (+${ref}g).`);
  }
  cycleTarget() {
    const t = this.activeTower();
    if (!t || t.def.barricade) return;
    t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
    this.emit(`${t.def.name} target -> ${t.mode.toUpperCase()}`);
  }
  startNextWave(bonus = true) {
    if (this.gameOver || this.victory || this.waveActive) return;
    let b = 0;
    if (bonus && this.waveNum > 0 && this.prepTimer > 0.5) {
      b = 10 + Math.round(this.prepTimer * 1.5);
      this.gold += b;
    }
    this.waveNum += 1;
    this.waveSpec = getWaveSpec(this.waveNum);
    this.waveActive = true;
    this.waveElapsed = 0;
    this.prepTimer = 0;
    this.spawnQueue = [];
    let t = 0, sc = 0;
    for (const [kind, count, interval, delay] of this.waveSpec.groups) {
      t += delay;
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push([t, kind, this.spawns[sc % this.spawns.length]]);
        sc += 1;
        t += interval;
      }
    }
    this.spawnQueue.sort((a, b) => a[0] - b[0]);
    this.sfx.wave();
    this.emit(`Wave ${this.waveNum}: ${this.waveSpec.title}${b > 0 ? ` (+${b}g bonus!)` : ''}`);
  }
  step(dt) {
    if (this.gameOver || this.victory) return;
    const sdt = Math.min(dt, 0.1) * this.speedMult;
    this.simTime += sdt;
    this.animTick = Math.floor(this.simTime * 12);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    if (!this.waveActive) {
      if (this.waveNum > 0 && this.prepTimer > 0) {
        this.prepTimer -= sdt;
        if (this.prepTimer <= 0) this.startNextWave(false);
      }
      this.updateVfx(sdt);
      return;
    }
    this.waveElapsed += sdt;
    while (this.spawnQueue.length && this.spawnQueue[0][0] <= this.waveElapsed) {
      const [, kind, sp] = this.spawnQueue.shift();
      this.spawnEnemy(kind, sp);
    }
    this.updateEnemies(sdt);
    this.updateTowers(sdt);
    this.updateProjectiles(sdt);
    this.updateVfx(sdt);
    this.enemies = this.enemies.filter((e) => e.alive);

    if (this.coreHp <= 0) {
      this.coreHp = 0; this.gameOver = true; this.waveActive = false;
      this.emit('CITADEL CORE BREACHED! Defenses fallen.');
      return;
    }
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.waveActive) {
      this.waveActive = false;
      const rew = 22 + this.waveNum * 4;
      this.gold += rew;
      this.score += 100 + this.waveNum * 25;
      if (this.waveNum >= this.totalWaves) {
        this.victory = true;
        this.emit(`VICTORY! Repelled all 10 waves! Score: ${this.score}`);
      } else {
        this.prepTimer = 14.0;
        this.emit(`Wave ${this.waveNum} cleared! +${rew}g. [G] Call Wave ${this.waveNum + 1}.`);
      }
    }
  }
  spawnEnemy(kind, sp) {
    const ed = ENEMY_DEFS[kind], mult = this.waveSpec.mult;
    const hb = this.hardBlocked();
    const costs = new Map();
    for (const [k, t] of this.towers) if (t.def.barricade) costs.set(k, kind === 'sapper' ? 3 : 14);
    const path = ed.flying ? [sp, this.goal] : findAStarPath(hb, costs, sp, this.goal);
    const hp = +(ed.hp * mult).toFixed(1), armor = +(ed.armor * mult).toFixed(1);
    const enemy = {
      uid: this.uidSeq++, kind, x: sp[0], y: sp[1], hp, maxHp: hp, armor, maxArmor: armor,
      speed: ed.speed, bounty: ed.bounty, coreDmg: ed.coreDmg, barDps: ed.barDps,
      flying: ed.flying, boss: ed.boss, path: path.length ? path : [sp, this.goal],
      wpIdx: 1, prog: 0, chillTimer: 0, chillFactor: 0, flash: 0, breachKey: null,
      empTimer: ed.empInt || 0, alive: true,
    };
    this.enemies.push(enemy);
    if (ed.boss) { this.addTrauma(0.35); this.emit('WARNING: DREAD COLOSSUS [Ω] INCOMING!'); }
  }
  addTrauma(a) { if (!this.reduceShake) this.trauma = Math.min(1, this.trauma + a); }
  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
      if (e.chillTimer > 0) { e.chillTimer = Math.max(0, e.chillTimer - dt); if (!e.chillTimer) e.chillFactor = 0; }
      if (e.boss) {
        e.empTimer -= dt;
        if (e.empTimer <= 0) {
          e.empTimer = ENEMY_DEFS.boss.empInt;
          this.blasts.push({ x: e.x, y: e.y, r: 2.4, t: 0.45, dur: 0.45, kind: 'emp' });
          this.addTrauma(0.28);
          for (const [, t] of this.towers) if (t.def.barricade && Math.hypot(t.c - e.x, t.r - e.y) <= 2.4) this.damageBarricade(t, ENEMY_DEFS.boss.empDmg);
        }
      }
      const effSpeed = e.chillTimer > 0 ? e.speed * Math.max(0.25, 1 - e.chillFactor) : e.speed;
      if (e.flying) {
        const d = Math.hypot(this.goal[0] - e.x, this.goal[1] - e.y), st = effSpeed * dt;
        if (d <= Math.max(0.15, st)) this.leakEnemy(e);
        else { e.x += ((this.goal[0] - e.x) / d) * st; e.y += ((this.goal[1] - e.y) / d) * st; }
      } else if (e.breachKey) {
        const bar = this.towers.get(e.breachKey);
        if (!bar || !bar.def.barricade) e.breachKey = null;
        else this.damageBarricade(bar, e.barDps * dt);
      } else {
        let budget = effSpeed * dt;
        while (budget > 1e-5 && e.wpIdx < e.path.length) {
          const [tc, tr] = e.path[e.wpIdx], bk = keyOf(tc, tr), bar = this.towers.get(bk);
          if (bar && bar.def.barricade) { e.breachKey = bk; break; }
          const d = Math.hypot(tc - e.x, tr - e.y);
          if (d <= budget) { e.x = tc; e.y = tr; budget -= d; e.wpIdx++; }
          else { e.x += ((tc - e.x) / d) * budget; e.y += ((tr - e.y) / d) * budget; budget = 0; }
        }
        if (e.wpIdx >= e.path.length) this.leakEnemy(e);
      }
      if (e.alive) e.prog = 1000 - Math.hypot(this.goal[0] - e.x, this.goal[1] - e.y) - (e.flying ? 0 : Math.max(0, e.path.length - e.wpIdx) * 0.4);
    }
  }
  damageBarricade(t, dmg) {
    const prev = t.hp / t.maxHp;
    t.hp -= dmg;
    const cur = t.hp / t.maxHp;
    for (const [th, lbl] of [[0.75, 'CHIPPED'], [0.5, 'CRACKED'], [0.25, 'CRITICAL']]) {
      if (prev >= th && cur < th) this.popups.push({ x: t.c, y: t.r - 0.3, text: lbl, col: C.AMBER, t: 0.75 });
    }
    if (t.hp <= 0) {
      this.towers.delete(t.k);
      if (this.selectedTileKey === t.k) this.selectedTileKey = null;
      this.blasts.push({ x: t.c, y: t.r, r: 1, t: 0.35, dur: 0.35, kind: 'breach' });
      this.popups.push({ x: t.c, y: t.r, text: 'SHATTERED!', col: C.RED, t: 0.9 });
      this.addTrauma(0.24); this.sfx.breach();
      this.recomputePaths();
      this.emit(`Barricade at (${t.c},${t.r}) collapsed!`);
    }
  }
  leakEnemy(e) {
    e.alive = false;
    this.coreHp = Math.max(0, this.coreHp - e.coreDmg);
    this.blasts.push({ x: this.goal[0], y: this.goal[1], r: 1.4, t: 0.45, dur: 0.45, kind: 'core' });
    this.popups.push({ x: this.goal[0], y: this.goal[1] - 0.2, text: `-${e.coreDmg} CORE`, col: C.RED, t: 1.0 });
    this.addTrauma(Math.min(0.85, 0.28 + e.coreDmg * 0.012));
    this.sfx.breach();
    this.emit(`${ENEMY_DEFS[e.kind].name} hit Core! (-${e.coreDmg} HP)`);
  }
  updateTowers(dt) {
    for (const [, t] of this.towers) {
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt);
      if (t.def.barricade) continue;
      t.cooldown = Math.max(0, t.cooldown - dt);
      if (t.cooldown > 0) continue;
      const rng = t.def.range + 0.35 * (t.level - 1);
      const cands = [];
      for (const e of this.enemies) {
        if (!e.alive || (e.flying && !t.def.hitAir)) continue;
        const d = Math.hypot(e.x - t.c, e.y - t.r);
        if (d >= t.def.minRange && d <= rng) cands.push([d, e]);
      }
      if (!cands.length) continue;
      cands.sort((a, b) => {
        if (t.mode === 'first') return b[1].prog - a[1].prog;
        if (t.mode === 'last') return a[1].prog - b[1].prog;
        if (t.mode === 'closest') return a[0] - b[0];
        if (t.mode === 'strongest') return (b[1].hp + b[1].armor) - (a[1].hp + a[1].armor);
        return (a[1].hp + a[1].armor) - (b[1].hp + b[1].armor);
      });
      const target = cands[0][1];
      const dx = target.x - t.c, dy = target.y - t.r;
      t.aim = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'R' : 'L') : (dy >= 0 ? 'D' : 'U');
      t.cooldown = t.def.fireInterval * (0.86 ** (t.level - 1));
      t.flash = 0.18;
      const dmg = t.def.damage * (1 + 0.42 * (t.level - 1));
      if (t.kind === 'tesla') {
        this.fireTesla(t, target, dmg);
      } else {
        this.sfx.shoot();
        this.projectiles.push({
          kind: t.kind, glyph: t.def.glyph, tid: t.uid, sx: t.c, sy: t.r, x: t.c, y: t.r,
          tx: target.x, ty: target.y, targetId: t.kind === 'mortar' ? null : target.uid,
          speed: t.kind === 'mortar' ? 4.8 : (t.kind === 'cryo' ? 11 : 15),
          dmg, splash: t.def.splash, slow: t.def.slow, slowDur: t.def.slowDur,
          prog: 0, arc: t.kind === 'mortar' ? 1.7 : 0, trail: [],
        });
      }
    }
  }
  fireTesla(t, first, baseDmg) {
    this.sfx.zap();
    const chains = t.def.chain + (t.level - 1);
    const hit = new Set(), segs = [];
    let px = t.c, py = t.r, cur = first, hdmg = baseDmg;
    for (let i = 0; i < chains && cur && cur.alive; i++) {
      segs.push([px, py, cur.x, cur.y]);
      hit.add(cur.uid);
      this.applyDamage(cur, hdmg * (cur.armor > 0 ? 1.25 : 1), t);
      px = cur.x; py = cur.y; hdmg *= 0.8;
      let best = null, bd = 2.35;
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e.uid)) continue;
        const d = Math.hypot(e.x - px, e.y - py);
        if (d <= bd) { bd = d; best = e; }
      }
      cur = best;
    }
    if (segs.length) { this.arcs.push({ segs, t: 0.26 }); if (segs.length >= 2) this.addTrauma(0.08); }
  }
  updateProjectiles(dt) {
    const alive = [];
    for (const p of this.projectiles) {
      p.trail.push([p.x, p.y]);
      if (p.trail.length > 4) p.trail.shift();
      if (p.targetId) {
        const tgt = this.enemies.find((e) => e.alive && e.uid === p.targetId);
        if (tgt) { p.tx = tgt.x; p.ty = tgt.y; }
      }
      const dist = Math.max(0.2, Math.hypot(p.tx - p.sx, p.ty - p.sy));
      p.prog = Math.min(1, p.prog + (p.speed * dt) / dist);
      p.x = p.sx + (p.tx - p.sx) * p.prog;
      p.y = p.sy + (p.ty - p.sy) * p.prog - (p.arc ? p.arc * 4 * p.prog * (1 - p.prog) : 0);
      if (p.prog >= 1) {
        const srcTower = [...this.towers.values()].find((tw) => tw.uid === p.tid);
        if (p.kind === 'mortar') {
          this.blasts.push({ x: p.tx, y: p.ty, r: p.splash, t: 0.42, dur: 0.42, kind: 'mortar' });
          this.addTrauma(0.20); this.sfx.blast();
          for (const e of this.enemies) {
            if (!e.alive || e.flying) continue;
            const d = Math.hypot(e.x - p.tx, e.y - p.ty);
            if (d <= p.splash) this.applyDamage(e, p.dmg * (d <= p.splash * 0.55 ? 1 : Math.max(0.55, 1 - 0.45 * (d / p.splash))), srcTower);
          }
        } else {
          const tgt = this.enemies.find((e) => e.alive && (e.uid === p.targetId || Math.hypot(e.x - p.tx, e.y - p.ty) < 0.75));
          if (tgt) {
            this.applyDamage(tgt, p.dmg, srcTower);
            if (p.slow > 0 && tgt.alive) { tgt.chillFactor = Math.max(tgt.chillFactor, p.slow); tgt.chillTimer = Math.max(tgt.chillTimer, p.slowDur); }
          }
        }
      } else {
        alive.push(p);
      }
    }
    this.projectiles = alive;
  }
  applyDamage(e, dmg, srcTower) {
    if (!e.alive || dmg <= 0) return;
    let rem = dmg;
    if (e.armor > 0) { const ab = Math.min(e.armor, rem); e.armor -= ab; rem -= ab; }
    if (rem > 0) e.hp -= rem;
    e.flash = 0.14;
    if (srcTower) srcTower.dmgDone += dmg;
    if (e.hp <= 0) {
      e.hp = 0; e.alive = false; this.gold += e.bounty; this.kills += 1; this.score += e.bounty * 10;
      if (srcTower) srcTower.kills += 1;
      this.popups.push({ x: e.x, y: e.y - 0.25, text: `+${e.bounty}g`, col: C.YELLOW, t: 0.75 });
      if (e.boss) { this.addTrauma(0.55); this.sfx.blast(); this.emit(`DREAD COLOSSUS DESTROYED! +${e.bounty}g`); }
    } else if (dmg >= 26) {
      this.popups.push({ x: e.x, y: e.y - 0.2, text: `-${Math.round(dmg)}`, col: C.AMBER, t: 0.55 });
    }
  }
  updateVfx(dt) {
    this.arcs.forEach((a) => (a.t -= dt)); this.arcs = this.arcs.filter((a) => a.t > 0);
    this.blasts.forEach((b) => (b.t -= dt)); this.blasts = this.blasts.filter((b) => b.t > 0);
    this.popups.forEach((p) => { p.t -= dt; p.y -= dt * 0.45; }); this.popups = this.popups.filter((p) => p.t > 0);
  }
}

// --- Top-Level Web App Controller ---
export class WebTowerDefenseApp {
  constructor(canvas, onStateChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStateChange = onStateChange;
    this.buf = new AsciiBuffer();
    this.sfx = new SfxSynth();
    this.mapIdx = 0;
    this.sim = new Simulation(0, this.sfx);
    this.screen = 'MENU';
    this.menuFocus = 0;
    this.showPaths = true;
    this.crt = false;

    this.catalog = buildStudioCatalog();
    this.studioIdx = 0;
    this.studioFrame = 0;
    this.studioPlaying = true;
    this.studioSpeed = 1.0;
    this.studioAccum = 0;
    this.studioDmgRatio = 1.0;
    this.studioPaint = false;
    this.studioCurCol = 0;
    this.studioCurRow = 0;
    this.studioMsg = 'Studio ready: [Up/Dn] Browse, [E] Paint mode, [-/+] Damage slider.';
  }

  turretSprite(kind, level, firing, aim, tick) {
    const mapId = { pulse: 'turret_pulse', tesla: 'turret_tesla', mortar: 'turret_mortar', cryo: 'turret_cryo' }[kind];
    if (level === 1 && !firing && (aim === 'R' || aim === 'L') && mapId) {
      const asset = this.catalog.find((a) => a.id === mapId);
      const defLines = defaultTurretLines(kind, 1, false, 'R', 0);
      if (asset && JSON.stringify(asset.frames[0]) !== JSON.stringify(defLines)) {
        return asset.frames[0];
      }
    }
    return defaultTurretLines(kind, level, firing, aim, tick);
  }

  startNewGame(idx = this.mapIdx) {
    this.mapIdx = ((idx % MAP_PRESETS.length) + MAP_PRESETS.length) % MAP_PRESETS.length;
    this.sim = new Simulation(this.mapIdx, this.sfx);
    this.screen = 'PLAYING';
    this.onStateChange();
  }

  toggleStudio() {
    this.screen = this.screen === 'STUDIO' ? 'PLAYING' : 'STUDIO';
    this.studioPaint = false;
    this.onStateChange();
  }

  exportStudioJson() {
    const blob = new Blob([JSON.stringify(this.catalog, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'studio_sprites.json';
    a.click();
    this.studioMsg = 'Downloaded studio_sprites.json';
  }

  paintCell(ch) {
    const asset = this.catalog[this.studioIdx];
    const fi = this.studioFrame % asset.frames.length;
    const frame = [...asset.frames[fi]];
    while (frame.length <= this.studioCurRow) frame.push('     ');
    const line = frame[this.studioCurRow].padEnd(this.studioCurCol + 1, ' ');
    frame[this.studioCurRow] = line.slice(0, this.studioCurCol) + ch + line.slice(this.studioCurCol + 1);
    asset.frames[fi] = frame;
    this.studioMsg = `Painted (${this.studioCurCol},${this.studioCurRow})='${ch}' on ${asset.name} (live synced!)`;
  }

  handleCellClick(col, row) {
    this.sfx.unlock();
    if (this.screen === 'MENU') {
      const x0 = Math.floor((COLS - 62) / 2), y0 = Math.floor((ROWS - 18) / 2);
      for (let i = 0; i < 4; i++) {
        if (col >= x0 + 4 && col <= x0 + 58 && row === y0 + 6 + i * 2) {
          this.menuFocus = i;
          this.handleKey('Enter', 'Enter');
          return;
        }
      }
      return;
    }
    if (this.screen === 'STUDIO') {
      if (col >= 1 && col <= 28 && row >= 4 && row <= 24) {
        const picked = row - 4;
        if (picked < this.catalog.length) { this.studioIdx = picked; this.studioFrame = 0; }
      }
      return;
    }
    if (this.screen !== 'PLAYING') return;
    if (col >= 0 && col < 75 && row >= 3 && row < 27) {
      const tc = Math.floor(col / TILE_W), tr = Math.floor((row - 3) / TILE_H);
      this.sim.cursor = [tc, tr];
      const tk = keyOf(tc, tr);
      if (this.sim.towers.has(tk)) this.sim.selectedTileKey = tk;
      else this.sim.place(tc, tr);
      this.onStateChange();
      return;
    }
    if (col >= 76 && col <= 98 && row >= 4 && row < 4 + BUILD_ORDER.length) {
      this.sim.selectedBuild = BUILD_ORDER[row - 4];
      this.onStateChange();
    }
  }

  handleKey(raw, code) {
    this.sfx.unlock();
    const low = raw.length === 1 ? raw.toLowerCase() : code;
    if (code === 'F2') { this.toggleStudio(); return; }

    if (this.screen === 'MENU') {
      if (low === 'ArrowUp' || low === 'w') this.menuFocus = (this.menuFocus + 3) % 4;
      else if (low === 'ArrowDown' || low === 's') this.menuFocus = (this.menuFocus + 1) % 4;
      else if (low === 'ArrowLeft' || low === 'a') this.mapIdx = (this.mapIdx + 1) % MAP_PRESETS.length;
      else if (low === 'ArrowRight' || low === 'd') this.mapIdx = (this.mapIdx + 1) % MAP_PRESETS.length;
      else if (code === 'Enter' || code === 'Space') {
        if (this.menuFocus === 0) this.startNewGame(this.mapIdx);
        else if (this.menuFocus === 1) { this.mapIdx = (this.mapIdx + 1) % MAP_PRESETS.length; this.sim = new Simulation(this.mapIdx, this.sfx); }
        else if (this.menuFocus === 2) this.toggleStudio();
        else if (this.menuFocus === 3) this.startNewGame(this.mapIdx);
      }
    } else if (this.screen === 'STUDIO') {
      if (this.studioPaint) {
        if (code === 'Escape' || low === 'e') this.studioPaint = false;
        else if (code === 'ArrowUp') this.studioCurRow = Math.max(0, this.studioCurRow - 1);
        else if (code === 'ArrowDown') this.studioCurRow = Math.min(2, this.studioCurRow + 1);
        else if (code === 'ArrowLeft') this.studioCurCol = Math.max(0, this.studioCurCol - 1);
        else if (code === 'ArrowRight') this.studioCurCol = Math.min(4, this.studioCurCol + 1);
        else if (code === 'Backspace' || code === 'Delete') this.paintCell(' ');
        else if (raw.length === 1) this.paintCell(raw);
      } else {
        if (code === 'Escape') this.toggleStudio();
        else if (low === 'e') { this.studioPaint = true; this.studioPlaying = false; }
        else if (code === 'ArrowUp') { this.studioIdx = (this.studioIdx + this.catalog.length - 1) % this.catalog.length; this.studioFrame = 0; }
        else if (code === 'ArrowDown') { this.studioIdx = (this.studioIdx + 1) % this.catalog.length; this.studioFrame = 0; }
        else if (code === 'ArrowLeft' || raw === '[') { this.studioPlaying = false; this.studioFrame = (this.studioFrame + this.catalog[this.studioIdx].frames.length - 1) % this.catalog[this.studioIdx].frames.length; }
        else if (code === 'ArrowRight' || raw === ']') { this.studioPlaying = false; this.studioFrame = (this.studioFrame + 1) % this.catalog[this.studioIdx].frames.length; }
        else if (code === 'Space') this.studioPlaying = !this.studioPlaying;
        else if (raw === '-' || raw === '_') this.studioDmgRatio = Math.max(0, +(this.studioDmgRatio - 0.15).toFixed(2));
        else if (raw === '=' || raw === '+') this.studioDmgRatio = Math.min(1, +(this.studioDmgRatio + 0.15).toFixed(2));
        else if (low === 'x') this.exportStudioJson();
        else if (low === 'r') { this.catalog = buildStudioCatalog(); this.studioMsg = 'Catalog reset.'; }
      }
    } else if (this.screen === 'PLAYING') {
      if (low === 'ArrowUp' || low === 'w') this.sim.cursor[1] = Math.max(0, this.sim.cursor[1] - 1);
      else if (low === 'ArrowDown' || low === 's') this.sim.cursor[1] = Math.min(MAP_ROWS - 1, this.sim.cursor[1] + 1);
      else if (low === 'ArrowLeft' || low === 'a') this.sim.cursor[0] = Math.max(0, this.sim.cursor[0] - 1);
      else if (low === 'ArrowRight' || low === 'd') this.sim.cursor[0] = Math.min(MAP_COLS - 1, this.sim.cursor[0] + 1);
      else if ('12345'.includes(raw)) this.sim.selectedBuild = BUILD_ORDER[Number(raw) - 1];
      else if (code === 'Enter' || code === 'Space') {
        const tk = keyOf(this.sim.cursor[0], this.sim.cursor[1]);
        if (this.sim.towers.has(tk)) this.sim.selectedTileKey = tk;
        else this.sim.place(this.sim.cursor[0], this.sim.cursor[1]);
      } else if (low === 'u') this.sim.upgrade();
      else if (low === 't') this.sim.cycleTarget();
      else if (low === 'r') this.sim.repair();
      else if (low === 'x' || code === 'Backspace' || code === 'Delete') this.sim.sell();
      else if (low === 'g') this.sim.startNextWave(true);
      else if (low === 'f') this.sim.speedMult = this.sim.speedMult === 1 ? 2 : (this.sim.speedMult === 2 ? 4 : 1);
      else if (low === 'v') this.showPaths = !this.showPaths;
      else if (low === 'm') this.startNewGame(this.mapIdx + 1);
      else if (low === 'p' || code === 'Escape') this.screen = 'PAUSED';
    } else if (this.screen === 'PAUSED') {
      if (low === 'p' || code === 'Escape' || code === 'Enter') this.screen = 'PLAYING';
      else if (low === 'n') this.startNewGame(this.mapIdx);
      else if (low === 'm') this.screen = 'MENU';
    } else {
      if (code === 'Enter' || low === 'n') this.startNewGame(this.mapIdx);
      else if (low === 'm') this.screen = 'MENU';
    }
    this.onStateChange();
  }

  update(dt) {
    if (this.screen === 'PLAYING') {
      this.sim.step(dt);
      if (this.sim.victory) { this.screen = 'VICTORY'; this.onStateChange(); }
      else if (this.sim.gameOver) { this.screen = 'GAMEOVER'; this.onStateChange(); }
    } else if (this.screen === 'STUDIO' && this.studioPlaying) {
      const a = this.catalog[this.studioIdx];
      this.studioAccum += dt * a.fps * this.studioSpeed;
      while (this.studioAccum >= 1) { this.studioAccum -= 1; this.studioFrame = (this.studioFrame + 1) % a.frames.length; }
    }
  }

  render() {
    if (this.screen === 'STUDIO') this.renderStudio();
    else this.renderBattle();
    this.flushToCanvas();
  }

  renderStudio() {
    const b = this.buf;
    b.clear('#0a0d14');
    b.drawBox(0, 0, COLS, 3, 'ASCII-PIXEL SPRITE & VFX STUDIO', C.CYAN, C.WHITE, '#0e1420');
    const a = this.catalog[this.studioIdx];
    b.drawText(2, 1, `Asset ${this.studioIdx + 1}/${this.catalog.length}: ${a.name.slice(0, 24)}`, C.WHITE);
    b.drawText(44, 1, this.studioPaint ? '[PAINT  ]' : (this.studioPlaying ? '[PLAYING]' : '[PAUSED ]'), this.studioPaint ? C.YELLOW : C.GREEN);
    const [blk, tier, dcol] = structuralDamageVisual(this.studioDmgRatio);
    b.drawText(64, 1, `Integrity ${Math.round(this.studioDmgRatio * 100)}% ${blk} ${tier}`, dcol);

    b.drawBox(0, 3, 30, 24, 'ASSET CATALOG [Click]', '#466487', C.CYAN, '#0c0f18');
    this.catalog.forEach((item, idx) => {
      const sel = idx === this.studioIdx;
      b.drawText(1, 4 + idx, `${sel ? '>' : ' '}[${item.cat.slice(0, 3).toUpperCase()}] ${item.name}`.slice(0, 27).padEnd(27), sel ? C.WHITE : C.SILVER, sel ? '#1c3452' : '#0c0f18');
    });

    b.drawBox(30, 3, 40, 24, 'PIXEL GRID INSPECTOR', '#466487', C.CYAN, '#0b0e16');
    const frame = a.frames[this.studioFrame % a.frames.length];
    const pal = { ...TOWER_PALETTE, ...a.palette };
    for (let c = 0; c < 6; c++) b.drawText(36 + c * 3, 5, String(c), C.DIM);
    frame.forEach((line, r) => {
      const ry = 6 + r * 2;
      b.drawText(34, ry, `${r}:`, C.DIM);
      for (let c = 0; c < Math.max(5, line.length); c++) {
        const ch = line[c] || ' ';
        const cur = c === this.studioCurCol && r === this.studioCurRow;
        const cbg = cur ? '#375f87' : '#121824';
        b.drawText(35 + c * 3, ry, cur ? '[' : ' ', C.CYAN, cbg);
        b.drawText(36 + c * 3, ry, ch === ' ' ? '·' : ch, pal[ch] || C.WHITE, cbg);
        b.drawText(37 + c * 3, ry, cur ? ']' : ' ', C.CYAN, cbg);
      }
    });
    b.drawBox(33, 19, 17, 7, '1:1 IN-GAME', C.YELLOW, C.YELLOW, '#10141e');
    b.drawSprite(39, 21, frame, pal, C.WHITE, null, false);
    b.drawText(52, 20, `Frame ${(this.studioFrame % a.frames.length) + 1}/${a.frames.length}`, C.WHITE);
    b.drawText(52, 22, '[F2/Esc] Back to Siege', C.CYAN);

    b.drawBox(70, 3, 30, 24, 'STRUCTURAL DAMAGE LAB', '#466487', C.AMBER, '#0c0f18');
    b.drawText(72, 4, a.desc.slice(0, 26), C.WHITE);
    b.drawText(72, 7, '███ → ▓▓▓ → ▒▒▒ → ░░░', C.SILVER);
    b.drawText(72, 8, `Slider: ${Math.round(this.studioDmgRatio * 100)}% (${tier})`, dcol);
    b.drawBar(72, 9, 25, this.studioDmgRatio, dcol);
    const [blines, bpal] = barricadeSprite(this.studioDmgRatio);
    b.drawSprite(79, 12, blines, bpal, C.WHITE, null, false);
    const [clines, cpal] = coreSprite(this.studioDmgRatio, this.studioFrame);
    b.drawSprite(79, 17, clines, cpal, C.WHITE, null, false);
    b.drawText(72, 22, '[Space] Play/Pause [E] Paint', C.SILVER);
    b.drawText(72, 23, '[-/+] Damage Slider', C.SILVER);
    b.drawText(72, 24, '[X] Export JSON [R] Reset', C.SILVER);

    b.drawBox(0, 27, COLS, 5, 'STUDIO TELEMETRY', '#466487', C.CYAN, '#0a0c13');
    b.drawText(2, 28, this.studioMsg.slice(0, 95), C.GREEN);
    b.drawText(2, 30, 'Edits to Turret L1 frames sync directly to your live battlefield!', C.CYAN);
  }

  renderBattle() {
    const b = this.buf, s = this.sim;
    b.clear(C.BG);
    b.drawBox(0, 0, COLS, 3, '', '#41628a', C.CYAN, '#0d121c');
    b.drawText(2, 1, s.preset.name.slice(0, 18), C.WHITE);
    b.drawText(22, 1, `WAVE ${s.waveNum}/${s.totalWaves}`, s.waveActive ? C.YELLOW : C.CYAN);
    b.drawText(35, 1, `GOLD:${String(s.gold).padStart(4)}g`, C.YELLOW);
    const [cblk, , ccol] = structuralDamageVisual(s.coreHp / s.maxCoreHp);
    b.drawText(48, 1, `CORE:${String(Math.round(s.coreHp)).padStart(3)}/${s.maxCoreHp} ${cblk}`, ccol);
    const badge = s.waveActive ? `ACTIVE ${s.speedMult}x` : (s.prepTimer > 0 ? `NEXT ${Math.ceil(s.prepTimer)}s` : `PREP ${s.speedMult}x`);
    b.drawText(69, 1, badge, s.waveActive ? C.AMBER : C.GREEN);
    b.drawText(84, 1, '[F2] Studio [P]', C.SILVER);

    const pathSet = new Set();
    if (this.showPaths) for (const p of s.spawnPaths) for (const [pc, pr] of p) pathSet.add(keyOf(pc, pr));
    const hov = s.towers.get(keyOf(s.cursor[0], s.cursor[1]));
    const pvCenter = (hov && !hov.def.barricade) ? [hov.c, hov.r] : (!hov && !TOWER_DEFS[s.selectedBuild].barricade && s.terrain(s.cursor[0], s.cursor[1]) === 'open' ? s.cursor : null);
    const pvMax = hov ? hov.def.range + 0.35 * (hov.level - 1) : TOWER_DEFS[s.selectedBuild].range;
    const pvMin = hov ? hov.def.minRange : TOWER_DEFS[s.selectedBuild].minRange;

    for (let tr = 0; tr < MAP_ROWS; tr++) {
      for (let tc = 0; tc < MAP_COLS; tc++) {
        const x0 = tc * TILE_W, y0 = 3 + tr * TILE_H, ter = s.terrain(tc, tr);
        const inRng = pvCenter ? (() => { const d = Math.hypot(tc - pvCenter[0], tr - pvCenter[1]); return d >= pvMin && d <= pvMax; })() : false;
        if (ter === 'cliff') {
          b.fillRect(x0, y0, TILE_W, TILE_H, '▓', '#343e52', C.WALL_BG);
          b.drawText(x0, y0, '▄█▓█▄', '#48546c', C.WALL_BG);
          b.drawText(x0, y0 + 2, '▀▓█▓▀', '#3c465c', C.WALL_BG);
        } else if (ter === 'spawn') {
          const p = (s.animTick >> 2) % 2 === 0 ? C.SKY : C.CYAN;
          b.fillRect(x0, y0, TILE_W, TILE_H, ' ', p, '#142030');
          b.drawSprite(x0, y0, ['╔═══╗', '║>>>║', '╚═══╝'], null, p, null, false);
        } else if (ter === 'goal') {
          const [cl, cp] = coreSprite(s.coreHp / s.maxCoreHp, s.animTick);
          b.fillRect(x0, y0, TILE_W, TILE_H, ' ', C.CYAN, '#121c2c');
          b.drawSprite(x0, y0, cl, cp, C.CYAN, null, false);
        } else if (ter === 'road') {
          const bg = inRng ? '#1a2e40' : C.PATH_BG;
          b.fillRect(x0, y0, TILE_W, TILE_H, ' ', '#4b5a76', bg);
          b.drawText(x0, y0 + 1, '══·══', '#4e607e', bg);
        } else {
          const bg = inRng ? '#162a3c' : C.TILE_BG;
          b.fillRect(x0, y0, TILE_W, TILE_H, ' ', C.DIM, bg);
          const onPath = pathSet.has(keyOf(tc, tr));
          b.drawText(x0 + 2, y0 + 1, onPath ? '·' : '.', onPath ? '#5880a0' : '#2e384a', bg);
        }
      }
    }
    for (const [, t] of s.towers) {
      const x0 = t.c * TILE_W, y0 = 3 + t.r * TILE_H;
      if (t.def.barricade) {
        const [bl, bp] = barricadeSprite(t.hp / t.maxHp);
        b.drawSprite(x0, y0, bl, bp);
      } else {
        b.drawSprite(x0, y0, this.turretSprite(t.kind, t.level, t.flash > 0, t.aim, s.animTick), TOWER_PALETTE, C.WHITE, t.flash > 0 ? C.WHITE : null);
      }
    }
    for (const p of s.projectiles) {
      if (p.kind === 'mortar') b.drawText(Math.round(p.tx * TILE_W) + 1, 3 + Math.round(p.ty * TILE_H) + 1, '[x]', s.animTick % 4 < 2 ? C.RED : C.AMBER);
    }
    for (const e of s.enemies) {
      const x0 = Math.max(0, Math.min(70, Math.round(e.x * TILE_W)));
      const y0 = Math.max(3, Math.min(24, 3 + Math.round(e.y * TILE_H)));
      const [el, ep] = enemySprite(e.kind, e.hp / e.maxHp, e.maxArmor > 0 ? e.armor / e.maxArmor : 0, s.animTick, e.chillTimer > 0);
      b.drawSprite(x0, y0, el, ep, C.WHITE, e.flash > 0 ? C.WHITE : null);
    }
    for (const p of s.projectiles) {
      p.trail.forEach(([tx, ty], i) => b.setCell(Math.round(tx * TILE_W) + 2, 3 + Math.round(ty * TILE_H) + 1, i < 2 ? '·' : '•', p.kind === 'mortar' ? C.AMBER : C.YELLOW));
      const px = Math.round(p.x * TILE_W) + 1, py = 3 + Math.round(p.y * TILE_H) + 1;
      if (px >= 0 && px < 74 && py >= 3 && py < 27) {
        if (p.kind === 'pulse') b.drawText(px, py, (p.tx - p.sx) < 0 ? '<-' : '->', C.CYAN);
        else if (p.kind === 'mortar') b.drawText(px, py, '***', s.animTick % 2 ? C.YELLOW : C.AMBER);
        else b.drawText(px, py, '*>', C.SKY);
      }
    }
    for (const a of s.arcs) {
      for (const [sx, sy, ex, ey] of a.segs) {
        const c0 = Math.round(sx * TILE_W) + 2, r0 = 3 + Math.round(sy * TILE_H) + 1;
        const c1 = Math.round(ex * TILE_W) + 2, r1 = 3 + Math.round(ey * TILE_H) + 1;
        const steps = Math.max(2, Math.abs(c1 - c0), Math.abs(r1 - r0));
        for (let i = 1; i < steps; i++) b.setCell(Math.round(c0 + (c1 - c0) * (i / steps)), Math.round(r0 + (r1 - r0) * (i / steps)), i === Math.floor(steps / 2) ? '⚡' : '~', i % 2 ? C.YELLOW : C.CYAN);
        b.setCell(c1, r1, '⚡', C.YELLOW);
      }
    }
    for (const bl of s.blasts) {
      const ratio = 1 - bl.t / bl.dur, g = ratio < 0.35 ? '***' : (ratio < 0.7 ? '+*+' : '·*·');
      const cx = Math.round(bl.x * TILE_W) + 2, cy = 3 + Math.round(bl.y * TILE_H) + 1, col = bl.kind === 'emp' ? C.MAGENTA : C.AMBER;
      [[-2, 0, g[0]], [0, 0, g[1]], [2, 0, g[2]], [0, -1, '*'], [0, 1, '*']].forEach(([ox, oy, ch]) => {
        if (cx + ox >= 0 && cx + ox < 75 && cy + oy >= 3 && cy + oy < 27) b.setCell(cx + ox, cy + oy, ch, col);
      });
    }
    for (const pop of s.popups) {
      const px = Math.max(0, Math.min(74 - pop.text.length, Math.round(pop.x * TILE_W)));
      const py = Math.max(3, Math.min(26, 3 + Math.round(pop.y * TILE_H)));
      b.drawText(px, py, pop.text, pop.col);
    }

    const cx0 = s.cursor[0] * TILE_W, cy0 = 3 + s.cursor[1] * TILE_H;
    const [candOk] = s.canBuildAt(s.cursor[0], s.cursor[1], s.selectedBuild);
    const curCol = s.towers.has(keyOf(s.cursor[0], s.cursor[1])) ? C.YELLOW : (candOk ? C.GREEN : C.RED);
    b.setCell(cx0, cy0, '┏', curCol); b.setCell(cx0 + 4, cy0, '┓', curCol);
    b.setCell(cx0, cy0 + 2, '┗', curCol); b.setCell(cx0 + 4, cy0 + 2, '┛', curCol);

    // Right Sidebar
    b.drawBox(75, 3, 25, 10, 'ARSENAL [1-5]', '#41628a', C.CYAN, '#0c1019');
    BUILD_ORDER.forEach((kind, i) => {
      const d = TOWER_DEFS[kind], sel = s.selectedBuild === kind, aff = s.gold >= d.cost;
      b.drawText(76, 4 + i, `${sel ? '>' : ' '}[${d.hotkey}]${d.badge.padEnd(5)} ${String(d.cost).padStart(3)}g`.slice(0, 23).padEnd(23), sel ? C.WHITE : (aff ? C.GREEN : C.CRIMSON), sel ? '#1c3452' : '#0c1019');
    });
    const adef = TOWER_DEFS[s.selectedBuild];
    b.drawText(76, 10, adef.name.slice(0, 23), C.CYAN);
    b.drawText(76, 11, adef.desc.slice(0, 23), C.SILVER);

    b.drawBox(75, 13, 25, 14, 'INSPECTOR', '#41628a', C.AMBER, '#0c1019');
    const act = s.activeTower();
    if (act) {
      b.drawText(76, 14, `${act.def.name.slice(0, 16)} L${act.level}`, C.WHITE);
      if (act.def.barricade) {
        const [blk, tr, bc] = structuralDamageVisual(act.hp / act.maxHp);
        b.drawText(76, 15, `HP: ${Math.round(act.hp)}/${act.maxHp}`, C.SILVER);
        b.drawText(76, 16, `Wall: ${blk} ${tr}`, bc);
        b.drawBar(76, 17, 22, act.hp / act.maxHp, bc);
      } else {
        const dmg = Math.round(act.def.damage * (1 + 0.42 * (act.level - 1)));
        const rng = (act.def.range + 0.35 * (act.level - 1)).toFixed(1);
        b.drawText(76, 15, `DMG:${String(dmg).padStart(4)} RNG:${rng}`, C.SILVER);
        b.drawText(76, 16, `KILLS:${act.kills} DMG:${Math.round(act.dmgDone)}`, C.SILVER);
        b.drawText(76, 17, `[T] Aim: ${act.mode.toUpperCase()}`, C.CYAN);
      }
      const uc = s.upgradeCost(act);
      b.drawText(76, 20, uc ? `[U] Upgr (${uc}g)` : '[U] MAX LEVEL (L3)', uc ? C.YELLOW : C.GREEN);
      b.drawText(76, 21, `[X] Sell (+${Math.round(act.invested * 0.7)}g)`, C.AMBER);
    } else {
      const [ok, msg] = s.canBuildAt(s.cursor[0], s.cursor[1], s.selectedBuild);
      b.drawText(76, 14, `Tile (${s.cursor[0]},${s.cursor[1]})`, C.WHITE);
      b.drawText(76, 15, ok ? 'READY TO BUILD' : 'BUILD BLOCKED', ok ? C.GREEN : C.RED);
      b.drawText(76, 16, msg.slice(0, 23), C.SILVER);
      const nw = getWaveSpec(s.waveNum + 1);
      b.drawText(76, 18, 'Next Wave Forecast:', C.YELLOW);
      b.drawText(76, 19, `W${nw.num}: ${nw.title}`.slice(0, 23), C.CYAN);
      b.drawText(76, 20, waveSummary(nw).slice(0, 23), C.WHITE);
    }
    b.drawText(76, 23, '[G] Start/Call Wave', C.GREEN);
    b.drawText(76, 24, '[F] Speed  [M] Map', C.SILVER);
    b.drawText(76, 25, '[V] Paths  [F2] Studio', C.SILVER);

    b.drawBox(0, 27, COLS, 5, 'COMBAT LOG & STRUCTURAL TELEMETRY', '#41628a', C.CYAN, '#0a0c13');
    b.drawText(2, 28, `> ${(s.log[s.log.length - 1] || '')}`.slice(0, 95), C.WHITE);
    b.drawText(2, 29, `  ${(s.log[s.log.length - 2] || '')}`.slice(0, 95), C.DIM);
    b.drawText(2, 30, '[Click/WASD] Move/Build [1-5] Unit [U] Upgr [T] Aim [R] Repair [G] Wave [F2] Studio', C.CYAN);

    if (this.screen === 'MENU') {
      const x0 = 19, y0 = 7;
      b.drawBox(x0, y0, 62, 18, 'TACTICAL ASCII TOWER DEFENSE & WAVE SIEGE', C.CYAN, C.YELLOW, '#0e131e');
      b.drawText(x0 + 3, y0 + 2, 'Turrets: [=|=] Pulse  (☼) Tesla  [███] Mortar  <◈> Cryo', C.WHITE);
      b.drawText(x0 + 3, y0 + 3, 'VFX: -> Bolts | ⚡ Chain Arcs | *** Shells | ███→▓▓▓→▒▒▒→░░░', C.SKY);
      [`Launch Siege (${MAP_PRESETS[this.mapIdx].name})`, `Switch Map: < ${MAP_PRESETS[this.mapIdx].name} >`, 'Open ASCII-Pixel Sprite & VFX Studio [F2]', 'Start Immediately'].forEach((lbl, idx) => {
        const sel = idx === this.menuFocus;
        b.drawText(x0 + 6, y0 + 6 + idx * 2, `${sel ? '▶ ' : '  '}${lbl}`.padEnd(50), sel ? C.YELLOW : C.SILVER, sel ? '#1e3e60' : '#0e131e');
      });
      b.drawText(x0 + 3, y0 + 15, MAP_PRESETS[this.mapIdx].desc.slice(0, 56), C.DIM);
      b.drawText(x0 + 3, y0 + 16, 'Click an option or press [Enter] to play!', C.CYAN);
    } else if (this.screen === 'PAUSED' || this.screen === 'VICTORY' || this.screen === 'GAMEOVER') {
      const title = this.screen === 'PAUSED' ? 'SIEGE PAUSED' : (this.screen === 'VICTORY' ? 'CITADEL VICTORIOUS!' : 'CITADEL CORE BREACHED');
      const col = this.screen === 'PAUSED' ? C.AMBER : (this.screen === 'VICTORY' ? C.GREEN : C.RED);
      b.drawBox(23, 10, 54, 11, title, col, C.WHITE, '#101420');
      b.drawText(26, 12, `Map: ${s.preset.name} | Wave ${s.waveNum}/${s.totalWaves} | Score: ${s.score}`, C.WHITE);
      b.drawText(26, 14, `Core Integrity: ${Math.round(s.coreHp)}/${s.maxCoreHp} | Kills: ${s.kills}`, C.SILVER);
      b.drawText(26, 17, '[Enter] Continue / Retry   [M] Main Menu   [F2] Studio', C.CYAN);
    }
  }

  flushToCanvas() {
    const ctx = this.ctx;
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const cellW = 11, cellH = 21;
    const logW = COLS * cellW, logH = ROWS * cellH;
    if (this.canvas.width !== logW * dpr || this.canvas.height !== logH * dpr) {
      this.canvas.width = logW * dpr;
      this.canvas.height = logH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, logW, logH);

    let sx = 0, sy = 0;
    if (!this.sim.reduceShake && this.screen === 'PLAYING' && this.sim.trauma > 0.01) {
      const m = (this.sim.trauma ** 2) * 10;
      sx = Math.round(m * Math.sin(this.sim.simTime * 47));
      sy = Math.round(m * Math.cos(this.sim.simTime * 53));
    }

    ctx.font = 'bold 16px Menlo, "JetBrains Mono", Consolas, "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const inField = this.screen === 'PLAYING' && c < 75 && r >= 3 && r < 27;
        const x = c * cellW + (inField ? sx : 0);
        const y = r * cellH + (inField ? sy : 0);
        ctx.fillStyle = this.buf.bg[r][c];
        ctx.fillRect(x, y, cellW + 0.4, cellH + 0.4);
        const ch = this.buf.chars[r][c];
        if (ch !== ' ') {
          ctx.fillStyle = this.buf.fg[r][c];
          ctx.fillText(ch, x + cellW * 0.5, y + cellH * 0.54);
        }
      }
    }
    if (this.crt) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < logH; y += 3) ctx.fillRect(0, y, logW, 1);
    }
  }
}

export function mountWebApp() {
  const canvas = document.getElementById('tdCanvas');
  const statusHint = document.getElementById('tdStatusHint');
  const syncUi = () => {
    const s = app.sim;
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('btnWave', s.waveActive ? `⏳ WAVE ${s.waveNum}/10` : `▶ SEND WAVE ${Math.min(10, s.waveNum + 1)} [G]`);
    set('btnSpeed', `⏩ SPEED: ${s.speedMult}x [F]`);
    set('btnMap', `🗺️ MAP: ${s.preset.id === 'twin_bastion' ? 'TWIN' : 'SPIRAL'} [M]`);
    set('btnStudio', app.screen === 'STUDIO' ? '🏰 BACK TO SIEGE [F2]' : '🎨 SPRITE STUDIO [F2]');
    set('btnSfx', `🔊 SFX: ${app.sfx.enabled ? 'ON' : 'OFF'}`);
    set('btnCrt', `📺 CRT: ${app.crt ? 'ON' : 'OFF'}`);
    document.querySelectorAll('[data-build]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-build') === s.selectedBuild);
    });
    if (statusHint) statusHint.textContent = app.screen === 'STUDIO' ? app.studioMsg : (s.log[s.log.length - 1] || '');
  };

  const app = new WebTowerDefenseApp(canvas, syncUi);

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    app.handleCellClick(col, row);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (app.screen !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    if (col >= 0 && col < 75 && row >= 3 && row < 27) {
      app.sim.cursor = [Math.floor(col / TILE_W), Math.floor((row - 3) / TILE_H)];
    }
  });

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    app.handleKey(e.key, e.code);
  });

  document.querySelectorAll('[data-build]').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.sfx.unlock();
      app.sim.selectedBuild = btn.getAttribute('data-build');
      if (app.screen === 'MENU') app.startNewGame(app.mapIdx);
      syncUi();
    });
  });

  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', () => { app.sfx.unlock(); fn(); syncUi(); }); };
  bind('btnWave', () => { if (app.screen === 'MENU') app.startNewGame(app.mapIdx); app.sim.startNextWave(true); });
  bind('btnUpgrade', () => app.sim.upgrade());
  bind('btnTarget', () => app.sim.cycleTarget());
  bind('btnRepair', () => app.sim.repair());
  bind('btnSell', () => app.sim.sell());
  bind('btnSpeed', () => app.handleKey('f', 'KeyF'));
  bind('btnMap', () => app.startNewGame(app.mapIdx + 1));
  bind('btnStudio', () => app.toggleStudio());
  bind('btnPaint', () => { if (app.screen !== 'STUDIO') app.toggleStudio(); app.studioPaint = !app.studioPaint; });
  bind('btnDmgDown', () => { if (app.screen !== 'STUDIO') app.toggleStudio(); app.studioDmgRatio = Math.max(0, +(app.studioDmgRatio - 0.2).toFixed(2)); });
  bind('btnDmgUp', () => { if (app.screen !== 'STUDIO') app.toggleStudio(); app.studioDmgRatio = Math.min(1, +(app.studioDmgRatio + 0.2).toFixed(2)); });
  bind('btnExport', () => app.exportStudioJson());
  bind('btnSfx', () => { app.sfx.enabled = !app.sfx.enabled; });
  bind('btnCrt', () => { app.crt = !app.crt; });

  syncUi();
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    app.update(dt);
    app.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (typeof document !== 'undefined' && document.getElementById('tdCanvas')) {
  mountWebApp();
}
