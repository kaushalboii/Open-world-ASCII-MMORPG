/**
 * Core deterministic simulation, FOV shadow-casting lantern, resonance combat,
 * weather particles, and 104x38 Classic Amber CRT buffer generation.
 */

import { BLADE_TIERS, LAMP_TIERS, NOTES_TEXT, buildDialogueNodes } from './narrative.js';
import {
  GRADE_BRIGHT,
  GRADE_DIM,
  GRADE_GHOST,
  GRADE_LIT,
  GRADE_MIST,
  GRID_COLS,
  GRID_ROWS,
  HINT_ROW,
  LOG_ROWS,
  LOG_TOP,
  VIEW_BOTTOM,
  VIEW_ROWS,
  VIEW_TOP,
  fitLine,
  sanitizeGlyph,
} from './palette.js';
import {
  REGION_META,
  TILE_BRIDGE,
  TILE_MUD,
  TILE_PILLAR,
  TILE_ROAD,
  TILE_SALT,
  TILE_SHOAL,
  TILE_SLAG,
  TILE_STONE,
  TILE_TIMBER,
  TILE_TREE,
  TILE_WALL,
  TILE_WATER,
  WORLD_H,
  WORLD_W,
  buildMarrenWorld,
} from './worldData.js';

export const SAVE_VERSION = 1;
const STORAGE_KEY = 'bellglass_save_v1';

class SeededRng {
  constructor(seed = 419) {
    this.state = seed >>> 0 || 1;
  }

  next() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }

  uniform(min, max) {
    return min + this.next() * (max - min);
  }
}

export class BellglassGame {
  constructor({ storageKey = STORAGE_KEY, seed = 419, sfxCallback = null } = {}) {
    this.storageKey = storageKey;
    this.rng = new SeededRng(seed);
    this.sfxCallback = sfxCallback;
    this.dialogueNodes = buildDialogueNodes();

    this.screen = 'title';
    this.clock = 0;
    this.hitStop = 0;
    this.camX = 0;
    this.camY = 0;
    this.shakeTrauma = 0;

    this.world = buildMarrenWorld();
    this.player = null;
    this.enemies = [];
    this.waves = [];
    this.sparks = [];
    this.slashes = [];
    this.floaters = [];
    this.weather = [];
    this.visited = new Set();
    this.shoalLitTimer = 0;
    this.shockwaves = [];
    this.flags = {};
    this.log = [];
    this.activeDialogue = null;
    this.activeChoices = [];
    this.selectedChoice = 0;
    this.lastBrazierPos = [24, 67];
    this.activeTargetId = null;
    this.hasExistingSave = false;
    this._helpReturnScreen = 'title';

    this._initWeather();
    this.resetNewGame(true);
    this._checkSaveExists();
  }

  _storageAvailable() {
    return typeof localStorage !== 'undefined' && this.storageKey;
  }

  _checkSaveExists() {
    if (!this._storageAvailable()) {
      this.hasExistingSave = false;
      return;
    }
    try {
      this.hasExistingSave = Boolean(localStorage.getItem(this.storageKey));
    } catch {
      this.hasExistingSave = false;
    }
  }

  emitSfx(cue) {
    if (this.sfxCallback) this.sfxCallback(cue);
  }

  _initWeather() {
    this.weather = [];
    for (let i = 0; i < 52; i++) {
      this.weather.push({
        x: this.rng.uniform(0, GRID_COLS),
        y: this.rng.uniform(VIEW_TOP, VIEW_BOTTOM),
        vx: -3.6,
        vy: 13.0,
        glyph: '/',
        kind: 'rain',
      });
    }
  }

  resetNewGame(goTitle = false) {
    this.world = buildMarrenWorld();
    this.player = {
      x: 22,
      y: 68,
      fx: 1,
      fy: 0,
      hp: 60,
      maxHp: 60,
      stamina: 100,
      maxStamina: 100,
      oil: 100,
      maxOil: 100,
      poultices: 2,
      brass: 10,
      bladeTier: 1,
      lampTier: 1,
      lampHooded: false,
      ringletEquipped: false,
      clappers: new Set(),
      parryTimer: 0,
      dodgeTimer: 0,
      attackTimer: 0,
      forkTimer: 0,
      hurtTimer: 0,
      moveCd: 0,
    };
    this.recomputePlayerStats();
    this.enemies = this.world.enemies.map((tpl) => ({
      tpl,
      x: tpl.x,
      y: tpl.y,
      hp: tpl.maxHp,
      alive: true,
      state: 'idle',
      stateTimer: 0,
      moveTimer: 0,
      revealTimer: 0,
      hurtTimer: 0,
      aimX: 0,
      aimY: 0,
      phase: 1,
      shockwaveArmed: false,
    }));
    this.waves = [];
    this.sparks = [];
    this.slashes = [];
    this.floaters = [];
    this.shockwaves = [];
    this.visited.clear();
    this.shoalLitTimer = 0;
    this.flags = {
      pulley_pulled: false,
      sluice_open: false,
      callum_quest: false,
      pip_rescued: false,
      vane_defeated: false,
      bell_orchard_rung: false,
      bell_nave_rung: false,
      bell_redwick_rung: false,
      bell_breakwater_rung: false,
      bell_foundry_rung: false,
      read_notes: [],
      shattered_salts: [],
    };
    this.lastBrazierPos = [24, 67];
    this.activeTargetId = null;
    this.activeDialogue = null;
    this.activeChoices = [];
    this.log = [
      'Tidemouth ferry pier. Thick estuary mist swallows the bell-posts.',
      'Old Hester watches from the pilings. Press [E] near her, or walk north.',
    ];
    this._snapCamera();
    this._updateVisited();
    this.screen = goTitle ? 'title' : 'play';
  }

  recomputePlayerStats() {
    this.player.maxHp = 60 + (this.player.ringletEquipped ? 15 : 0);
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.player.maxOil = LAMP_TIERS[this.player.lampTier - 1][2];
    this.player.oil = Math.min(this.player.oil, this.player.maxOil);
  }

  getPlayerBladeName() {
    return BLADE_TIERS[this.player.bladeTier - 1][1];
  }

  getPlayerDamage() {
    return BLADE_TIERS[this.player.bladeTier - 1][2];
  }

  getPlayerLampName() {
    return LAMP_TIERS[this.player.lampTier - 1][1];
  }

  _snapCamera() {
    const halfW = Math.floor(GRID_COLS / 2);
    const halfH = Math.floor(VIEW_ROWS / 2);
    this.camX = Math.max(0, Math.min(WORLD_W - GRID_COLS, this.player.x - halfW));
    this.camY = Math.max(0, Math.min(WORLD_H - VIEW_ROWS, this.player.y - halfH));
  }

  bellsRungCount() {
    let n = 0;
    for (const b of this.world.belfries) {
      if (b.rung) n++;
    }
    return n;
  }

  addLog(msg) {
    if (!msg) return;
    if (this.log.length === 0 || this.log[this.log.length - 1] !== msg) {
      this.log.push(msg);
    }
    if (this.log.length > 24) {
      this.log = this.log.slice(-24);
    }
  }

  captureSaveDict() {
    return {
      version: SAVE_VERSION,
      player: {
        x: this.player.x,
        y: this.player.y,
        fx: this.player.fx,
        fy: this.player.fy,
        hp: this.player.hp,
        oil: Math.round(this.player.oil * 100) / 100,
        poultices: this.player.poultices,
        brass: this.player.brass,
        bladeTier: this.player.bladeTier,
        lampTier: this.player.lampTier,
        lampHooded: this.player.lampHooded,
        ringletEquipped: this.player.ringletEquipped,
        clappers: Array.from(this.player.clappers).sort(),
      },
      rungBells: this.world.belfries.filter((b) => b.rung).map((b) => b.id),
      collectedPickups: this.world.pickups.filter((p) => p.collected).map((p) => p.id),
      defeatedEnemies: this.enemies.filter((e) => !e.alive).map((e) => e.tpl.id),
      lastBrazierPos: [...this.lastBrazierPos],
      shatteredSalts: [...(this.flags.shattered_salts || [])],
      flags: { ...this.flags },
    };
  }

  saveGame() {
    if (!this._storageAvailable()) return false;
    try {
      const payload = JSON.stringify(this.captureSaveDict());
      localStorage.setItem(this.storageKey, payload);
      this.hasExistingSave = true;
      return true;
    } catch {
      return false;
    }
  }

  loadGame() {
    if (!this._storageAvailable()) return false;
    try {
      const rawStr = localStorage.getItem(this.storageKey);
      if (!rawStr) return false;
      const raw = JSON.parse(rawStr);
      if (!raw || typeof raw !== 'object' || Number(raw.version || 0) > SAVE_VERSION) {
        return false;
      }
      this.applySaveDict(raw);
      return true;
    } catch {
      return false;
    }
  }

  applySaveDict(data) {
    this.resetNewGame(false);
    const p = data.player || {};
    this.player.x = Number(p.x ?? 22);
    this.player.y = Number(p.y ?? 68);
    this.player.fx = Number(p.fx ?? 1);
    this.player.fy = Number(p.fy ?? 0);
    this.player.bladeTier = Number(p.bladeTier ?? 1);
    this.player.lampTier = Number(p.lampTier ?? 1);
    this.player.ringletEquipped = Boolean(p.ringletEquipped);
    this.recomputePlayerStats();
    this.player.hp = Math.max(1, Math.min(this.player.maxHp, Number(p.hp ?? this.player.maxHp)));
    this.player.oil = Math.max(0, Math.min(this.player.maxOil, Number(p.oil ?? this.player.maxOil)));
    this.player.poultices = Number(p.poultices ?? 2);
    this.player.brass = Number(p.brass ?? 10);
    this.player.lampHooded = Boolean(p.lampHooded);
    this.player.clappers = new Set(p.clappers || []);

    if (data.flags && typeof data.flags === 'object') {
      Object.assign(this.flags, data.flags);
    }

    const rung = new Set(data.rungBells || []);
    for (const b of this.world.belfries) b.rung = rung.has(b.id);

    if (this.flags.pulley_pulled) this._openChoirBridge(true);
    if (this.flags.sluice_open || this.bellsRungCount() >= 2) this._openFoundrySluice(true);

    for (const [sx, sy] of data.shatteredSalts || []) {
      if (this.world.inBounds(sx, sy) && this.world.kinds[sy][sx] === TILE_SALT) {
        this.world.setTile(sx, sy, '.', TILE_MUD);
      }
    }
    this.flags.shattered_salts = [...(data.shatteredSalts || [])];

    const collected = new Set(data.collectedPickups || []);
    for (const item of this.world.pickups) item.collected = collected.has(item.id);

    const dead = new Set(data.defeatedEnemies || []);
    for (const e of this.enemies) {
      if (dead.has(e.tpl.id)) e.alive = false;
    }

    if (Array.isArray(data.lastBrazierPos) && data.lastBrazierPos.length === 2) {
      this.lastBrazierPos = [Number(data.lastBrazierPos[0]), Number(data.lastBrazierPos[1])];
    }

    this._snapCamera();
    this._updateVisited();
    this.addLog('Journey resumed from embers.');
  }

  _openChoirBridge(silent = false) {
    this.flags.pulley_pulled = true;
    for (const inter of this.world.interactables) {
      if (inter.id === 'pulley_choir') inter.activated = true;
    }
    for (let x = 108; x <= 116; x++) {
      for (let y = 20; y <= 22; y++) {
        this.world.setTile(x, y, '=', TILE_BRIDGE);
      }
    }
    if (!silent) {
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.45);
      this.addLog("Iron winches groan; oak planking slams across St. Jude's choir trench!");
      this.emitSfx('gate');
    }
  }

  _openFoundrySluice(silent = false) {
    this.flags.sluice_open = true;
    for (const x of [172, 173, 174]) {
      this.world.setTile(x, 35, ':', TILE_ROAD);
    }
    if (!silent) {
      this.addLog('A distant counterweight drops—the High Foundry sluice gate in Redwick is raised.');
      this.emitSfx('gate');
    }
  }

  _collectNearbyPickups() {
    for (const item of this.world.pickups) {
      if (item.collected) continue;
      if (Math.abs(item.x - this.player.x) + Math.abs(item.y - this.player.y) <= 1) {
        item.collected = true;
        if (item.kind === 'clapper') {
          this.player.clappers.add(item.id);
          this.addLog(`Found ${item.name}! Carry it to its parish belfry.`);
          this.emitSfx('pickup');
        } else if (item.kind === 'oil') {
          this.player.oil = Math.min(this.player.maxOil, this.player.oil + item.amount);
          this.addLog(`Decanted ${item.name} (+${item.amount}% oil).`);
          this.emitSfx('pickup');
        } else if (item.kind === 'poultice') {
          this.player.poultices = Math.min(4, this.player.poultices + item.amount);
          this.addLog(`Packed ${item.name} (${this.player.poultices}/4).`);
          this.emitSfx('pickup');
        } else if (item.kind === 'brass') {
          this.player.brass += item.amount;
          this.addLog(`Pocketed ${item.amount} Stamped Brass (${this.player.brass} total).`);
          this.emitSfx('pickup');
        } else if (item.kind === 'relic') {
          this.player.ringletEquipped = true;
          this.recomputePlayerStats();
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
          this.addLog("Slipped on Tide-Stealer's Ringlet (+15 Max HP)!");
          this.emitSfx('temper');
        } else if (item.kind === 'note') {
          const [title, body] = NOTES_TEXT[item.value] || [item.name, ''];
          const read = [...(this.flags.read_notes || [])];
          if (!read.includes(item.value)) {
            read.push(item.value);
            this.flags.read_notes = read;
          }
          this.addLog(`${title}: ${body}`);
          this.emitSfx('pickup');
        }
      }
    }
  }

  _updateVisited() {
    const rad = this.player.lampHooded ? 5 : 9;
    const { x: px, y: py } = this.player;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy <= rad * rad) {
          const tx = px + dx;
          const ty = py + dy;
          if (this.world.inBounds(tx, ty)) this.visited.add((ty << 10) | tx);
        }
      }
    }
  }

  handleAction(action) {
    if (this.screen === 'title') {
      if (action === 'confirm' || action === 'interact' || action === 'fork') {
        if (this.hasExistingSave && this.loadGame()) return true;
        this.resetNewGame(false);
        return true;
      }
      if (action === 'new_game') {
        this.resetNewGame(false);
        return true;
      }
      if (action === 'help') {
        this._helpReturnScreen = 'title';
        this.screen = 'help';
        return true;
      }
      return true;
    }

    if (this.screen === 'help') {
      if (action === 'confirm' || action === 'cancel' || action === 'help' || action === 'ledger' || action === 'fork') {
        this.screen = this._helpReturnScreen === 'title' || this.player.hp > 0 ? this._helpReturnScreen : 'title';
      }
      return true;
    }

    if (this.screen === 'ledger') {
      if (action === 'ledger' || action === 'cancel' || action === 'confirm' || action === 'fork') {
        this.screen = 'play';
      }
      return true;
    }

    if (this.screen === 'victory') {
      if (action === 'confirm' || action === 'cancel' || action === 'fork') {
        this.screen = 'play';
      } else if (action === 'new_game') {
        this.resetNewGame(false);
      } else if (action === 'quit') {
        this.screen = 'title';
      }
      return true;
    }

    if (this.screen === 'dead') {
      if (action === 'confirm' || action === 'interact' || action === 'fork') {
        this._reviveAtBrazier();
      }
      return true;
    }

    if (this.screen === 'dialogue') {
      return this._handleDialogueInput(action);
    }

    if (action === 'quit') {
      this.saveGame();
      this.screen = 'title';
      return true;
    }
    if (action === 'help') {
      this._helpReturnScreen = 'play';
      this.screen = 'help';
      return true;
    }
    if (action === 'ledger') {
      this.screen = 'ledger';
      return true;
    }

    const dirs = {
      move_n: [0, -1],
      move_s: [0, 1],
      move_w: [-1, 0],
      move_e: [1, 0],
    };
    if (dirs[action]) {
      const [dx, dy] = dirs[action];
      this._tryMovePlayer(dx, dy);
    } else if (action === 'strike') {
      this._performStrike();
    } else if (action === 'parry') {
      this._performParry();
    } else if (action === 'dodge') {
      this._performDodge();
    } else if (action === 'fork') {
      this._performTuningFork();
    } else if (action === 'lamp') {
      this._toggleLamp();
    } else if (action === 'poultice') {
      this._usePoultice();
    } else if (action === 'interact') {
      this._performInteract();
    }
    return true;
  }

  _reviveAtBrazier() {
    const [bx, by] = this.lastBrazierPos;
    this.player.x = bx;
    this.player.y = by;
    this.player.hp = this.player.maxHp;
    this.player.stamina = this.player.maxStamina;
    this.player.oil = Math.max(this.player.oil, this.player.maxOil * 0.75);
    this.player.poultices = Math.max(this.player.poultices, 2);
    for (const e of this.enemies) {
      if (!e.tpl.isBoss && e.alive) {
        e.x = e.tpl.x;
        e.y = e.tpl.y;
        e.state = 'idle';
        e.stateTimer = 0;
      } else if (e.tpl.isBoss && !this.flags.vane_defeated) {
        e.x = e.tpl.x;
        e.y = e.tpl.y;
        e.hp = e.tpl.maxHp;
        e.phase = 1;
        e.state = 'idle';
      }
    }
    this.screen = 'play';
    this._snapCamera();
    this.addLog('You wake beside low hearth coals, oil flask refilled.');
    this.emitSfx('brazier');
  }

  _tryMovePlayer(dx, dy) {
    this.player.fx = dx;
    this.player.fy = dy;
    if (this.player.moveCd > 0 || this.player.dodgeTimer > 0) return;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (!this.world.inBounds(nx, ny)) return;
    if (this.world.kinds[ny][nx] === TILE_SLAG) {
      this.player.x = nx;
      this.player.y = ny;
      this._damagePlayer(9, 'Molten slag scorches your boots!');
      this.player.moveCd = 0.14;
      return;
    }
    if (!this.world.isWalkable(nx, ny)) {
      if (this.world.kinds[ny][nx] === TILE_SALT) {
        this.addLog('Brittle salt crust seals this opening—strike [Space] Tuning Fork!');
      } else if (this.world.kinds[ny][nx] === 'gate') {
        this.addLog('Locked sluice iron. Pull a parish winch or wake two great bells.');
      }
      return;
    }
    if (this._enemyAt(nx, ny)) return;
    this.player.x = nx;
    this.player.y = ny;
    this.player.moveCd = 0.095;
    this.emitSfx('step');
    this._updateVisited();
    this._collectNearbyPickups();
  }

  _enemyAt(x, y) {
    return this.enemies.find((e) => e.alive && e.x === x && e.y === y) || null;
  }

  _toggleLamp() {
    if (this.player.oil <= 0.1 && this.player.lampHooded) {
      this.addLog('Wick dry—rest at a brazier or find oil before raising the beam.');
      return;
    }
    this.player.lampHooded = !this.player.lampHooded;
    this.addLog(
      `Oil lantern switched to ${this.player.lampHooded ? 'HOODED (quiet stealth beam)' : 'RAISED (wide golden beam)'}.`
    );
    this.emitSfx('lamp');
  }

  _usePoultice() {
    if (this.player.poultices <= 0) {
      this.addLog('No reed poultices left in your coat.');
      return;
    }
    if (this.player.hp >= this.player.maxHp) {
      this.addLog('Wounds already bound.');
      return;
    }
    this.player.poultices -= 1;
    const healed = 28;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + healed);
    this.addLog(`Bound bog-mint dressing (+${healed} HP).`);
    this.emitSfx('heal');
    this._spawnSparks(this.player.x, this.player.y, 6, '+', GRADE_LIT);
  }

  _performParry() {
    if (this.player.parryTimer > 0 || this.player.stamina < 10) return;
    this.player.stamina = Math.max(0, this.player.stamina - 10);
    this.player.parryTimer = 0.38;
    this.emitSfx('parry_stance');
  }

  _performDodge() {
    if (this.player.dodgeTimer > 0 || this.player.stamina < 18) return;
    this.player.stamina -= 18;
    this.player.dodgeTimer = 0.25;
    let steps = 0;
    for (let i = 0; i < 2; i++) {
      const nx = this.player.x + this.player.fx;
      const ny = this.player.y + this.player.fy;
      if (this.world.isWalkable(nx, ny) && !this._enemyAt(nx, ny)) {
        this._spawnSparks(this.player.x, this.player.y, 2, ':', GRADE_MIST);
        this.player.x = nx;
        this.player.y = ny;
        steps++;
      }
    }
    this._updateVisited();
    this._collectNearbyPickups();
    this.emitSfx('step');
    if (steps === 0) {
      this.floaters.push({ x: this.player.x, y: this.player.y - 1, text: 'SLIP', ttl: 0.35 });
    }
  }

  _performStrike() {
    if (this.player.attackTimer > 0 || this.player.stamina < 12) return;
    this.player.stamina -= 12;
    this.player.attackTimer = 0.24;
    const { fx, fy } = this.player;
    const tx = this.player.x + fx;
    const ty = this.player.y + fy;
    const sx = -fy;
    const sy = fx;
    const hitCells = [
      [tx, ty],
      [tx + sx, ty + sy],
      [tx - sx, ty - sy],
    ];
    const slashGlyph = fx !== 0 ? '-' : '|';
    hitCells.forEach(([cx, cy], idx) => {
      if (this.world.inBounds(cx, cy)) {
        const g = idx === 0 ? slashGlyph : idx === 1 ? '/' : '\\';
        this.slashes.push({ x: cx, y: cy, glyph: g, ttl: 0.16 });
      }
    });

    this.emitSfx('slash');
    let hitAny = false;
    const dmgBase = this.getPlayerDamage();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const hitCellMatch = hitCells.some(([cx, cy]) => e.x === cx && e.y === cy);
      const bossBox = e.tpl.isBoss && Math.abs(e.x - tx) <= 1 && Math.abs(e.y - ty) <= 1;
      if (hitCellMatch || bossBox) {
        hitAny = true;
        const mult = e.state === 'staggered' ? 2.4 : 1.0;
        const dmg = Math.round(dmgBase * mult);
        e.hp -= dmg;
        e.hurtTimer = 0.18;
        this.activeTargetId = e.tpl.id;
        this.floaters.push({ x: e.x, y: e.y - 1, text: mult > 1 ? `!${dmg}` : `${dmg}`, ttl: 0.55 });
        this._spawnSparks(e.x, e.y, mult > 1 ? 7 : 4, '*', GRADE_BRIGHT);
        if (e.tpl.isBoss && e.phase === 1 && e.hp <= e.tpl.maxHp * 0.55 && e.hp > 0) {
          e.phase = 2;
          e.state = 'idle';
          e.stateTimer = 0.4;
          this.addLog("Magistrate Vane slams his diving helmet shut: 'Let fog bury the rest!'");
        }
        if (e.hp <= 0) this._handleEnemyDefeat(e);
      }
    }
    if (hitAny) {
      this.hitStop = 0.045;
      this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.35);
      this.emitSfx('hit');
    }
  }

  _handleEnemyDefeat(e) {
    e.alive = false;
    this.player.brass += e.tpl.brassDrop;
    this._spawnSparks(e.x, e.y, 12, '+', GRADE_BRIGHT);
    this.addLog(`${e.tpl.name} collapses into bronze scree (+${e.tpl.brassDrop} Brass).`);
    if (e.tpl.isBoss) {
      this.flags.vane_defeated = true;
      this.player.clappers.add('clapper_foundry');
      this.addLog("The Fifth Master Clapper drops from Vane's belt! Carry it to the Dam Bell north.");
      this.emitSfx('bell');
    }
  }

  _performTuningFork() {
    if (this.player.forkTimer > 0 || this.player.stamina < 28) return;
    this.player.stamina -= 28;
    this.player.forkTimer = 0.55;
    this.waves.push({ cx: this.player.x, cy: this.player.y, radius: 0.4, maxRadius: 13.5, speed: 18.0 });
    this.shoalLitTimer = Math.max(this.shoalLitTimer, 6.5);
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.25);
    this.emitSfx('fork');

    let shattered = 0;
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (dx * dx + dy * dy <= 25) {
          const tx = this.player.x + dx;
          const ty = this.player.y + dy;
          if (this.world.inBounds(tx, ty) && this.world.kinds[ty][tx] === TILE_SALT) {
            this.world.setTile(tx, ty, '.', TILE_MUD);
            this._spawnSparks(tx, ty, 8, '%', GRADE_BRIGHT);
            shattered++;
            this.flags.shattered_salts.push([tx, ty]);
          }
        }
      }
    }
    if (shattered > 0) {
      this.addLog('Bronze harmonics shatter nearby salt seams into white powder!');
      this.emitSfx('shatter');
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist <= 12) {
        if (e.tpl.stealth) {
          e.revealTimer = 7.0;
          this.floaters.push({ x: e.x, y: e.y - 1, text: 'SEEN', ttl: 0.6 });
        }
        if (e.state === 'windup' && dist <= 8) {
          e.state = 'staggered';
          e.stateTimer = 1.65;
          this.activeTargetId = e.tpl.id;
          this.floaters.push({ x: e.x, y: e.y - 1, text: 'RING-BREAK', ttl: 0.75 });
          this.addLog(`Tuning resonance rattles ${e.tpl.name}'s helm mid-swing!`);
        }
      }
    }
  }

  _performInteract() {
    const { x: px, y: py } = this.player;
    for (const b of this.world.belfries) {
      if (Math.abs(b.x - px) + Math.abs(b.y - py) <= 2) {
        this._interactBelfry(b);
        return;
      }
    }
    for (const br of this.world.braziers) {
      if (Math.abs(br.x - px) + Math.abs(br.y - py) <= 2) {
        this._restAtBrazier(br);
        return;
      }
    }
    for (const npc of this.world.npcs) {
      if (npc.id === 'pip' && this.flags.pip_rescued && this.world.regionAt(px, py) === 'saltflats') continue;
      if (Math.abs(npc.x - px) + Math.abs(npc.y - py) <= 2) {
        this._startDialogue(npc.dialogueRoot);
        return;
      }
    }
    for (const inter of this.world.interactables) {
      if (Math.abs(inter.x - px) + Math.abs(inter.y - py) <= 2) {
        if (inter.kind === 'pulley') {
          if (!this.flags.pulley_pulled) this._openChoirBridge();
          else this.addLog('The choir bridge chain sits locked open.');
        } else if (inter.kind === 'noticeboard') {
          this.addLog("Redwick Notice: 'Two bells lift northern Foundry sluice. Watchman Callum seeks Pip south.'");
        }
        return;
      }
    }
    this.addLog('Nothing nearby answers your hand.');
  }

  _interactBelfry(b) {
    if (b.rung) {
      this.addLog(`${b.name} already tolls slow and golden across ${b.region}.`);
      return;
    }
    if (!this.player.clappers.has(b.clapperId)) {
      this.addLog(`${b.name} hangs mute and hollow—its parish clapper is missing.`);
      return;
    }
    b.rung = true;
    this.flags[`${b.id}_rung`] = true;
    if (b.id === 'bell_nave') this.flags.bell_nave_rung = true;
    else if (b.id === 'bell_redwick') this.flags.bell_redwick_rung = true;
    this.waves.push({ cx: b.x, cy: b.y, radius: 0.4, maxRadius: 28, speed: 22 });
    this.shakeTrauma = 1;
    this.emitSfx('bell');
    this._spawnSparks(b.x, b.y, 18, '*', GRADE_BRIGHT);
    this.addLog(`*** ${b.name.toUpperCase()} RINGS OUT! Fog retreats across ${b.region.toUpperCase()}! ***`);
    if (this.bellsRungCount() >= 2 && !this.flags.sluice_open) this._openFoundrySluice();
    this.saveGame();
    if (this.bellsRungCount() >= 5) this.screen = 'victory';
  }

  _restAtBrazier(br) {
    const safeY = this.world.isWalkable(br.x, br.y + 1) ? br.y + 1 : br.y;
    this.lastBrazierPos = [br.x, safeY];
    this.player.hp = this.player.maxHp;
    this.player.stamina = this.player.maxStamina;
    this.player.oil = this.player.maxOil;
    this.player.poultices = Math.max(this.player.poultices, 2);
    this._spawnSparks(br.x, br.y, 10, "'", GRADE_BRIGHT);
    const saved = this.saveGame();
    this.addLog(`Warmed boots at ${br.name}. Oil & wounds restored${saved ? ' (progress saved).' : '.'}`);
    this.emitSfx('brazier');
  }

  _startDialogue(nodeId) {
    if (nodeId === 'END' || !this.dialogueNodes[nodeId]) {
      this.activeDialogue = null;
      this.screen = 'play';
      return;
    }
    const node = this.dialogueNodes[nodeId];
    this.activeDialogue = node;
    this.activeChoices = node.choices.filter((c) => !c.cond || c.cond(this));
    this.selectedChoice = 0;
    this.screen = 'dialogue';
  }

  _handleDialogueInput(action) {
    if (action === 'cancel' || action === 'quit') {
      this.activeDialogue = null;
      this.screen = 'play';
      return true;
    }
    if ((action === 'move_n' || action === 'move_w') && this.activeChoices.length > 0) {
      this.selectedChoice = (this.selectedChoice - 1 + this.activeChoices.length) % this.activeChoices.length;
      return true;
    }
    if ((action === 'move_s' || action === 'move_e') && this.activeChoices.length > 0) {
      this.selectedChoice = (this.selectedChoice + 1) % this.activeChoices.length;
      return true;
    }
    if (action.startsWith('choice_')) {
      const idx = Number(action.split('_')[1]) - 1;
      if (idx >= 0 && idx < this.activeChoices.length) this.pickDialogueChoice(idx);
      return true;
    }
    if ((action === 'confirm' || action === 'interact' || action === 'fork') && this.activeChoices.length > 0) {
      this.pickDialogueChoice(this.selectedChoice);
    }
    return true;
  }

  pickDialogueChoice(idx) {
    const ch = this.activeChoices[idx];
    if (!ch) return;
    if (ch.effect) ch.effect(this);
    this._startDialogue(ch.to);
  }

  update(rawDt) {
    const dt = Math.max(0, Math.min(0.05, rawDt));
    this.clock += dt;
    this._updateWeather(dt);
    if (this.screen !== 'play') return;

    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }

    const p = this.player;
    p.moveCd = Math.max(0, p.moveCd - dt);
    p.parryTimer = Math.max(0, p.parryTimer - dt);
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.forkTimer = Math.max(0, p.forkTimer - dt);
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    p.stamina = Math.min(p.maxStamina, p.stamina + 30 * dt);

    const burn = p.lampHooded ? 0.14 : 0.72;
    p.oil = Math.max(0, p.oil - burn * dt);
    if (p.oil <= 0 && !p.lampHooded) {
      p.lampHooded = true;
      this.addLog('Lantern oil runs dry; wick shrinks to an ember hood.');
    }

    this.shoalLitTimer = Math.max(0, this.shoalLitTimer - dt);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - 2.4 * dt);

    this.waves = this.waves.filter((w) => {
      w.radius += w.speed * dt;
      return w.radius <= w.maxRadius;
    });

    this.sparks = this.sparks.filter((sp) => {
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.ttl -= dt;
      return sp.ttl > 0;
    });

    this.slashes = this.slashes.filter((sl) => {
      sl.ttl -= dt;
      return sl.ttl > 0;
    });

    this.floaters = this.floaters.filter((fl) => {
      fl.y -= 1.8 * dt;
      fl.ttl -= dt;
      return fl.ttl > 0;
    });

    const nextShock = [];
    for (const sw of this.shockwaves) {
      sw.x += sw.dx * 12 * dt;
      sw.y += sw.dy * 12 * dt;
      sw.ttl -= dt;
      const ix = Math.round(sw.x);
      const iy = Math.round(sw.y);
      if (!this.world.isWalkable(ix, iy) || sw.ttl <= 0) continue;
      if (ix === p.x && iy === p.y) {
        this._damagePlayer(13, 'Boss shockwave sweeps your footing!');
        continue;
      }
      nextShock.push(sw);
    }
    this.shockwaves = nextShock;

    this._updateEnemies(dt);
    this._updateCamera(dt);
  }

  _updateWeather(dt) {
    const reg = this.world.regionAt(this.player.x, this.player.y);
    const isKiln = reg === 'redwick' || reg === 'foundry';
    for (const d of this.weather) {
      if (this.screen === 'play' && isKiln && this.rng.next() < 0.04) {
        d.kind = 'ember';
        d.glyph = "'";
        d.vx = this.rng.uniform(-1.2, 1.2);
        d.vy = -this.rng.uniform(4.5, 8.0);
      } else if (d.kind === 'ember' && !isKiln) {
        d.kind = 'rain';
        d.glyph = '/';
        d.vx = -3.8;
        d.vy = 13.5;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= VIEW_BOTTOM) {
        d.y = VIEW_TOP;
        d.x = this.rng.uniform(0, GRID_COLS);
      } else if (d.y < VIEW_TOP) {
        d.y = VIEW_BOTTOM - 1;
        d.x = this.rng.uniform(0, GRID_COLS);
      }
      if (d.x < 0) d.x += GRID_COLS;
      else if (d.x >= GRID_COLS) d.x -= GRID_COLS;
    }
  }

  _updateCamera(dt) {
    const halfW = Math.floor(GRID_COLS / 2);
    const halfH = Math.floor(VIEW_ROWS / 2);
    const tx = Math.max(0, Math.min(WORLD_W - GRID_COLS, this.player.x - halfW + this.player.fx * 3));
    const ty = Math.max(0, Math.min(WORLD_H - VIEW_ROWS, this.player.y - halfH + this.player.fy * 1.5));
    const t = 1 - Math.exp(-10 * dt);
    this.camX += (tx - this.camX) * t;
    this.camY += (ty - this.camY) * t;
  }

  _updateEnemies(dt) {
    const { x: px, y: py } = this.player;
    const aggroMult = this.player.lampHooded ? 0.58 : 1.0;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.revealTimer = Math.max(0, e.revealTimer - dt);
      e.hurtTimer = Math.max(0, e.hurtTimer - dt);
      const dist = Math.abs(e.x - px) + Math.abs(e.y - py);

      if (!this.player.lampHooded && dist <= 6 && e.tpl.stealth) {
        e.revealTimer = Math.max(e.revealTimer, 0.8);
      }
      if (e.state === 'staggered' || e.state === 'recover') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) e.state = 'stalk';
        continue;
      }
      if (e.state === 'windup') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) this._resolveEnemyAttack(e);
        continue;
      }
      if (dist > e.tpl.aggroRange * aggroMult) {
        e.state = 'idle';
        continue;
      }
      this.activeTargetId = e.tpl.id;
      e.state = 'stalk';
      const reach = e.tpl.isBoss || e.tpl.kind === 'warden' ? 2 : 1;
      if (dist <= reach && (e.x === px || e.y === py || dist <= 2)) {
        e.state = 'windup';
        e.stateTimer = e.tpl.windupS * (e.tpl.isBoss && e.phase === 2 ? 0.8 : 1);
        e.aimX = px;
        e.aimY = py;
        e.shockwaveArmed = e.tpl.isBoss && this.rng.next() < (e.phase === 2 ? 0.6 : 0.35);
        continue;
      }
      e.moveTimer -= dt;
      if (e.moveTimer <= 0) {
        const speed = e.tpl.speed * (e.tpl.isBoss && e.phase === 2 ? 1.22 : 1);
        e.moveTimer = 1 / Math.max(1, speed);
        this._stepEnemyToward(e, px, py);
      }
    }
  }

  _stepEnemyToward(e, tx, ty) {
    const dx = tx === e.x ? 0 : tx > e.x ? 1 : -1;
    const dy = ty === e.y ? 0 : ty > e.y ? 1 : -1;
    const candidates = Math.abs(tx - e.x) >= Math.abs(ty - e.y) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
    for (const [mx, my] of candidates) {
      if (mx === 0 && my === 0) continue;
      const nx = e.x + mx;
      const ny = e.y + my;
      if (this.world.isWalkable(nx, ny) && !(nx === tx && ny === ty) && !this._enemyAt(nx, ny)) {
        e.x = nx;
        e.y = ny;
        return;
      }
    }
  }

  _resolveEnemyAttack(e) {
    const { x: px, y: py } = this.player;
    const reach = e.tpl.isBoss || e.tpl.kind === 'warden' ? 2 : 1;
    const inRange =
      Math.abs(e.x - px) + Math.abs(e.y - py) <= reach ||
      Math.abs(e.aimX - px) + Math.abs(e.aimY - py) <= 1;

    if (e.shockwaveArmed) {
      let dx = px === e.x ? 0 : px > e.x ? 1 : -1;
      const dy = py === e.y ? 0 : py > e.y ? 1 : -1;
      if (dx === 0 && dy === 0) dx = 1;
      this.shockwaves.push({ x: e.x + dx, y: e.y + dy, dx, dy, ttl: 0.9 });
      this.addLog('Vane slams a glowing slag-wave across the iron deck!');
      this.emitSfx('hit');
    }

    if (inRange) {
      if (this.player.parryTimer > 0) {
        e.state = 'staggered';
        e.stateTimer = 2.1;
        this.player.parryTimer = 0;
        this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 25);
        this.hitStop = 0.06;
        this.shakeTrauma = 0.6;
        this.floaters.push({ x: e.x, y: e.y - 1, text: '*PARRY*', ttl: 0.7 });
        this._spawnSparks(this.player.x, this.player.y, 10, '*', GRADE_BRIGHT);
        this.addLog(`CLANG! Parried ${e.tpl.name} cleanly—strike while staggered!`);
        this.emitSfx('parry');
        return;
      }
      this._damagePlayer(e.tpl.damage, `${e.tpl.name} catches you (${e.tpl.damage} dmg).`);
    }
    e.state = 'recover';
    e.stateTimer = e.tpl.cooldownS;
  }

  _damagePlayer(amount, logMsg) {
    if (this.player.dodgeTimer > 0) {
      this.floaters.push({ x: this.player.x, y: this.player.y - 1, text: 'EVADED', ttl: 0.45 });
      return;
    }
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.hurtTimer = 0.28;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.55);
    this._spawnSparks(this.player.x, this.player.y, 5, 'x', GRADE_BRIGHT);
    this.addLog(logMsg);
    this.emitSfx('hurt');
    if (this.player.hp <= 0) this.screen = 'dead';
  }

  _spawnSparks(x, y, count, glyph, grade) {
    for (let i = 0; i < count; i++) {
      const ang = this.rng.uniform(0, Math.PI * 2);
      const spd = this.rng.uniform(3, 9.5);
      const ttl = this.rng.uniform(0.18, 0.45);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65,
        glyph,
        grade,
        ttl,
        maxTtl: ttl,
      });
    }
  }

  _hasLos(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    while (x !== x1 || y !== y1) {
      if ((x !== x0 || y !== y0) && this.world.isOpaque(x, y)) return false;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return true;
  }

  _lampRadius() {
    if (this.player.oil <= 0.1) return 3.5;
    if (this.player.lampHooded) return 4.5;
    return 8.5 + (this.player.lampTier - 1) * 1.8;
  }

  renderBuffer() {
    const buf = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => [' ', GRADE_GHOST])
    );
    if (this.screen === 'title') this._renderTitle(buf);
    else if (this.screen === 'help') this._renderHelp(buf);
    else if (this.screen === 'ledger') this._renderLedger(buf);
    else if (this.screen === 'victory') this._renderVictory(buf);
    else if (this.screen === 'dead') {
      this._renderWorld(buf);
      this._overlayDeath(buf);
    } else {
      this._renderWorld(buf);
    }
    return buf;
  }

  _putStr(buf, col, row, text, grade) {
    if (row < 0 || row >= GRID_ROWS) return;
    for (let i = 0; i < text.length; i++) {
      const c = col + i;
      if (c >= 0 && c < GRID_COLS) {
        buf[row][c] = [sanitizeGlyph(text[i]), grade];
      }
    }
  }

  _renderTitle(buf) {
    const t = this.clock;
    for (const drop of this.weather) {
      const ix = Math.floor(drop.x);
      const iy = Math.floor(drop.y);
      if (iy >= 0 && iy < GRID_ROWS && ix >= 0 && ix < GRID_COLS) buf[iy][ix] = ['/', GRADE_GHOST];
    }

    const beamStep = Math.floor(t * 2.2) % 4;
    const beam = ['--------->', ' . - . - >', '   * * *  ', '- - - - - '][beamStep];
    const lh = [
      '      /|\\      ',
      '     /_*_\\     ',
      '     |:::|     ',
      '     |::.|     ',
      '    /|:::|\\    ',
      '   / |:::| \\   ',
      '  ===|:::|===  ',
    ];
    lh.forEach((line, idx) => this._putStr(buf, 74, 9 + idx, line, idx <= 1 ? GRADE_LIT : GRADE_DIM));
    this._putStr(buf, 84, 10, beam, beamStep === 2 ? GRADE_BRIGHT : GRADE_MIST);

    for (let r = 18; r < 25; r++) {
      let rowStr = '';
      for (let c = 0; c < GRID_COLS; c++) {
        const w = Math.sin(c * 0.25 + t * (1.2 + (r - 18) * 0.15) + r);
        rowStr += w > 0.2 ? '~' : w > -0.35 ? '-' : ' ';
      }
      this._putStr(buf, 0, r, rowStr, r < 21 ? GRADE_MIST : GRADE_GHOST);
    }

    const bob = Math.sin(t * 2.1) > 0.2 ? 1 : 0;
    this._putStr(buf, 58, 17 + bob, '   /|   ', GRADE_LIT);
    this._putStr(buf, 56, 18 + bob, ' /====\\ ', GRADE_LIT);
    this._putStr(buf, 55, 19 + bob, ' \\______/', GRADE_DIM);

    const masthead = [
      ' ____  _____ _     _     ____ _        _    ____ ____  ',
      '| __ )| ____| |   | |   / ___| |      / \\  / ___/ ___| ',
      '|  _ \\|  _| | |   | |  | |  _| |     / _ \\ \\___ \\___ \\ ',
      '| |_) | |___| |___| |__| |_| | |___ / ___ \\ ___) |__) |',
      '|____/|_____|_____|_____\\____|_____/_/   \\_\\____/____/ ',
    ];
    masthead.forEach((txt, idx) => this._putStr(buf, 6, 6 + idx, txt, idx < 2 ? GRADE_BRIGHT : GRADE_LIT));

    this._putStr(buf, 7, 12, 'T H E   D R O W N E D   P R O V I N C E', GRADE_DIM);
    this._putStr(buf, 7, 13, 'Five bells sunk beneath the estuary haze.', GRADE_MIST);

    const prompt = this.hasExistingSave ? '[Enter] Resume Journey from Embers' : '[Enter] Step onto Tidemouth Pier';
    this._putStr(buf, 8, 28, `> ${prompt}`, GRADE_BRIGHT);
    if (this.hasExistingSave) this._putStr(buf, 10, 30, '[N] Start Fresh Crossing', GRADE_DIM);
    this._putStr(buf, 10, 32, '[H] Tuning & Field Manual', GRADE_DIM);
    this._putStr(buf, 6, 36, 'P3 AMBER PHOSPHOR  |  OPEN-WORLD VALLEY OF MARREN  |  V1.0', GRADE_GHOST);
  }

  _renderHelp(buf) {
    this._putStr(buf, 4, 2, "BELLGLASS FIELD MANUAL  --  OREN WARD'S NOTES", GRADE_BRIGHT);
    this._putStr(buf, 4, 3, '-'.repeat(96), GRADE_MIST);
    const rows = [
      ['MOVEMENT & LAMP', ''],
      ['  W A S D / Arrows', 'Walk dirt dikes, docks, ruined aisles, and dry causeways.'],
      ['  F', 'Hood or Raise your Oil Lantern (hooded saves oil & halves aggro range).'],
      ['  L', 'Quick Dodge-Step two tiles along facing direction (brief evasive invulnerability).'],
      ['COMBAT & RESONANCE', ''],
      ['  J / Enter', 'Strike forward across 3 blade cells (2.4x damage on STAGGERED foes).'],
      ['  K / Shift', 'Raise Bronze Parry Guard: block incoming telegraph strikes to STAGGER foes.'],
      ['  Space', 'Strike Tuning Fork: sends concentric harmonic echo ring that:'],
      ['', '  * Shatters brittle Salt Crystals (%) blocking secret vaults & sluices'],
      ['', '  * Illuminates hidden Stepping Stones (~ -> o) & Stalkers (S)'],
      ['', '  * Interrupts armored Wardens/Bosses mid-swing (RING-BREAK!)'],
      ['WORLD & RECOVERY', ''],
      ['  E', 'Speak to townsfolk, pull winches (&), rest at Braziers (*), or toll Bells (B).'],
      ['  H', 'Bind Pressed Bog-Mint Poultice (+28 HP).'],
      ['  Tab / M', 'Open Surveyor Parchment Map & Five-Bell Ledger.'],
      ['  V  /  `', 'Toggle CRT Phosphor Scanlines & Glow   |   Mute / Unmute Sound'],
    ];
    let y = 5;
    for (const [k, desc] of rows) {
      if (!desc) this._putStr(buf, 6, y, k, GRADE_LIT);
      else {
        this._putStr(buf, 6, y, k.padEnd(22, ' '), GRADE_BRIGHT);
        this._putStr(buf, 29, y, desc, GRADE_DIM);
      }
      y++;
    }
    this._putStr(buf, 6, 35, '[Enter / Esc] Return', GRADE_LIT);
  }

  _renderLedger(buf) {
    this._putStr(buf, 4, 2, 'SURVEYOR PARCHMENT  &  PARISH CLAPPER LEDGER', GRADE_BRIGHT);
    this._putStr(buf, 4, 3, '-'.repeat(96), GRADE_MIST);
    this._putStr(buf, 4, 5, '[ VALLEY OF MARREN - SURVEY CHART ]', GRADE_LIT);
    const mapW = 60;
    const mapH = 22;
    for (let my = 0; my < mapH; my++) {
      const wy = Math.min(WORLD_H - 1, my * 4 + 1);
      for (let mx = 0; mx < mapW; mx++) {
        const wx = Math.min(WORLD_W - 1, mx * 4 + 1);
        let seen = false;
        for (let dy = -1; dy <= 1 && !seen; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (this.visited.has(((wy + dy) << 10) | (wx + dx))) {
              seen = true;
              break;
            }
          }
        }
        let ch = ' ';
        let g = GRADE_GHOST;
        if (seen) {
          const k = this.world.kinds[wy][wx];
          if (k === TILE_WATER) [ch, g] = ['~', GRADE_GHOST];
          else if (k === TILE_WALL || k === TILE_PILLAR) [ch, g] = ['#', GRADE_DIM];
          else if ([TILE_ROAD, TILE_BRIDGE, TILE_TIMBER, TILE_STONE].includes(k)) [ch, g] = ['=', GRADE_DIM];
          else [ch, g] = ['.', GRADE_MIST];
        } else {
          const h = ((mx * 73856093) ^ (my * 19349663)) & 31;
          [ch, g] = [h === 0 ? '.' : ' ', GRADE_GHOST];
        }
        buf[6 + my][4 + mx] = [ch, g];
      }
    }

    for (const b of this.world.belfries) {
      const bx = Math.max(0, Math.min(mapW - 1, Math.floor(b.x / 4)));
      const by = Math.max(0, Math.min(mapH - 1, Math.floor(b.y / 4)));
      buf[6 + by][4 + bx] = [b.rung ? 'B' : 'b', b.rung ? GRADE_BRIGHT : GRADE_LIT];
    }
    const pmx = Math.max(0, Math.min(mapW - 1, Math.floor(this.player.x / 4)));
    const pmy = Math.max(0, Math.min(mapH - 1, Math.floor(this.player.y / 4)));
    buf[6 + pmy][4 + pmx] = ['@', GRADE_BRIGHT];

    const col = 67;
    this._putStr(buf, col, 5, '[ FIVE GREAT BELLS ]', GRADE_LIT);
    this.world.belfries.forEach((b, idx) => {
      const have = this.player.clappers.has(b.clapperId);
      const status = b.rung ? 'RINGING' : have ? 'CLAPPER HELD' : 'SILENT';
      const grade = b.rung ? GRADE_BRIGHT : have ? GRADE_LIT : GRADE_MIST;
      this._putStr(buf, col, 7 + idx * 2, `${idx + 1}. ${b.name}`, grade);
      this._putStr(buf, col + 3, 8 + idx * 2, status, grade);
    });

    this._putStr(buf, col, 18, '[ EQUIPMENT ]', GRADE_LIT);
    this._putStr(buf, col, 20, `Blade : ${this.getPlayerBladeName()} (${this.getPlayerDamage()} dmg)`, GRADE_DIM);
    this._putStr(buf, col, 21, `Lamp  : ${this.getPlayerLampName()}`, GRADE_DIM);
    this._putStr(buf, col, 22, `Brass : ${this.player.brass} coins   Poultices: ${this.player.poultices}`, GRADE_DIM);
    const ring = this.player.ringletEquipped ? 'Equipped (+15 HP)' : 'Not yet recovered';
    this._putStr(buf, col, 23, `Relic : Ringlet (${ring})`, GRADE_MIST);

    this._putStr(buf, 4, 30, 'Legend: [@] You   [B] Bell Rung   [b] Unlit Belfry   [~] Estuary Water', GRADE_MIST);
    this._putStr(buf, 4, 35, '[Tab / Esc / Enter] Close Parchment', GRADE_LIT);
  }

  _renderVictory(buf) {
    this._putStr(buf, 8, 5, 'ALL FIVE PARISH BELLS ANSWER ACROSS MARREN VALLEY', GRADE_BRIGHT);
    this._putStr(buf, 8, 6, '='.repeat(52), GRADE_DIM);
    const lines = [
      'Bronze tremor clears seven winters of estuary haze.',
      'Out on Tidemouth Pier, Old Hester unfastens her river rope.',
      "In St. Jude's flooded nave, sunlight hits limestone pillars.",
      "Redwick's three chimneys stand white against the dawn.",
      "Beside the silent gantry dam, Vane's fallen brass cools.",
      '',
      'You walk back downriver with a quiet fork and half a jar of oil.',
    ];
    lines.forEach((ln, idx) => this._putStr(buf, 8, 9 + idx, ln, idx < 5 ? GRADE_LIT : GRADE_BRIGHT));
    this._putStr(buf, 8, 21, '[Enter] Keep Wandering Lit Marren   |   [N] Begin New Crossing   |   [Q] Title', GRADE_DIM);
  }

  _overlayDeath(buf) {
    this._putStr(buf, 28, 13, '+--------------------------------------------+', GRADE_LIT);
    this._putStr(buf, 28, 14, '|      YOUR LANTERN SPUTTERS INTO MUD        |', GRADE_BRIGHT);
    this._putStr(buf, 28, 15, '|  [Enter / E] Wake at Nearest Ember Brazier |', GRADE_DIM);
    this._putStr(buf, 28, 16, '+--------------------------------------------+', GRADE_LIT);
  }

  _renderDialogueChoices(buf) {
    if (!this.activeChoices.length) return;
    const maxW = GRID_COLS - 4;
    const sep = '   ';
    const rows = [];
    let currentRow = [];
    let curW = 0;
    let selRowIdx = 0;

    for (let i = 0; i < this.activeChoices.length; i++) {
      const rawTok = `[${i + 1}] ${this.activeChoices[i].label}`;
      const token = fitLine(rawTok, Math.min(rawTok.length, maxW));
      const needed = currentRow.length === 0 ? token.length : sep.length + token.length;
      if (currentRow.length > 0 && curW + needed > maxW) {
        rows.push(currentRow);
        currentRow = [];
        curW = 0;
      }
      const xOffset = currentRow.length === 0 ? 0 : curW + sep.length;
      currentRow.push({ idx: i, token, xOffset });
      curW = xOffset + token.length;
      if (i === this.selectedChoice) selRowIdx = rows.length;
    }
    if (currentRow.length > 0) rows.push(currentRow);

    const winStart = rows.length > 2 ? Math.max(0, Math.min(rows.length - 2, selRowIdx)) : 0;
    const visible = rows.slice(winStart, winStart + 2);
    for (let rIdx = 0; rIdx < visible.length; rIdx++) {
      const y = LOG_TOP + 1 + rIdx;
      for (const item of visible[rIdx]) {
        const isSel = item.idx === this.selectedChoice;
        if (isSel) this._putStr(buf, 1 + item.xOffset, y, '>', GRADE_BRIGHT);
        this._putStr(buf, 2 + item.xOffset, y, item.token, isSel ? GRADE_BRIGHT : GRADE_LIT);
      }
    }
    if (rows.length === 1) {
      const sel = this.activeChoices[this.selectedChoice];
      this._putStr(
        buf,
        2,
        LOG_TOP + 2,
        fitLine(`Selected [${this.selectedChoice + 1}]: ${sel.label}`, maxW),
        GRADE_DIM
      );
    }
  }

  _renderWorld(buf) {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTrauma > 0.01) {
      const mag = this.shakeTrauma * this.shakeTrauma;
      shakeX = Math.round(Math.sin(this.clock * 57) * 1.4 * mag);
      shakeY = Math.round(Math.cos(this.clock * 49) * 0.9 * mag);
    }
    const cx0 = Math.max(0, Math.min(WORLD_W - GRID_COLS, Math.round(this.camX) + shakeX));
    const cy0 = Math.max(0, Math.min(WORLD_H - VIEW_ROWS, Math.round(this.camY) + shakeY));

    const { x: px, y: py } = this.player;
    const lampR = this._lampRadius();
    const lampR2 = lampR * lampR;
    const curReg = this.world.regionAt(px, py);
    const cleared = new Set(this.world.belfries.filter((b) => b.rung).map((b) => b.region));
    const brazierPts = this.world.braziers.map((br) => [br.x, br.y]);
    const litBelfries = this.world.belfries.filter((b) => b.rung).map((b) => [b.x, b.y]);

    const regMeta = REGION_META.find((r) => r[0] === curReg);
    const regTitle = regMeta ? regMeta[1] : 'MARREN VALLEY';
    const haze = cleared.has(curReg) ? 'CLEAR' : this.player.lampHooded ? 'HOODED' : 'FOG DEEP';
    const bellsStr = this.world.belfries.map((b) => (b.rung ? '[o]' : '[ ]')).join('');
    const hpPips = Math.round((8 * this.player.hp) / Math.max(1, this.player.maxHp));
    const oilPips = Math.round((6 * this.player.oil) / Math.max(1, this.player.maxOil));
    const hpBar = '#'.repeat(hpPips) + '.'.repeat(8 - hpPips);
    const oilBar = '#'.repeat(oilPips) + '.'.repeat(6 - oilPips);

    let topLine =
      `${regTitle} : ${haze.padEnd(8, ' ')}   BELLS ${bellsStr}   ` +
      `HP [${hpBar}] ${String(this.player.hp).padStart(2, ' ')}/${String(this.player.maxHp).padEnd(2, ' ')}   ` +
      `OIL [${oilBar}] ${String(Math.floor(this.player.oil)).padStart(3, ' ')}%   BRASS ${String(this.player.brass).padEnd(3, ' ')}`;

    const tgt = this.enemies.find((e) => e.alive && e.tpl.id === this.activeTargetId);
    if (tgt && Math.abs(tgt.x - px) + Math.abs(tgt.y - py) <= 14) {
      const tag = `  [${tgt.tpl.name} ${tgt.hp}/${tgt.tpl.maxHp} ${tgt.state.toUpperCase()}]`;
      if (topLine.length + tag.length <= GRID_COLS) topLine += tag;
    }
    this._putStr(buf, 0, 0, fitLine(topLine, GRID_COLS), GRADE_LIT);

    const shoalOpen = this.shoalLitTimer > 0;
    const driftBase = Math.floor(this.clock * 1.2);
    for (let vr = 0; vr < VIEW_ROWS; vr++) {
      const wy = cy0 + vr;
      const rowIdx = VIEW_TOP + vr;
      for (let vc = 0; vc < GRID_COLS; vc++) {
        const wx = cx0 + vc;
        const kind = this.world.kinds[wy][wx];
        let ch = this.world.glyphs[wy][wx];
        const reg = this.world.regionIds[wy][wx];
        const dist2 = (wx - px) * (wx - px) + (wy - py) * (wy - py);

        if (kind === TILE_WATER || kind === TILE_SHOAL) {
          if (kind === TILE_SHOAL && shoalOpen) ch = 'o';
          else {
            const ph = Math.floor(this.clock * 2.5 + wx * 0.4 + wy * 0.7) % 7;
            ch = ph < 4 ? '~' : ph < 6 ? '-' : ' ';
          }
        } else if (kind === TILE_SLAG) {
          ch = Math.floor(this.clock * 5 + wx + wy) % 3 === 0 ? '*' : '=';
        }

        let litScore = 0;
        if (dist2 <= lampR2 && (dist2 <= 4 || this._hasLos(px, py, wx, wy))) {
          const dot = (wx - px) * this.player.fx + (wy - py) * this.player.fy;
          const beamBoost = !this.player.lampHooded && dot > 0 ? 1.2 : 0;
          litScore = Math.max(litScore, 1 - (Math.sqrt(dist2) / (lampR + beamBoost + 0.5)) * 0.75);
        }
        for (const [bx, by] of brazierPts) {
          const bd2 = (wx - bx) * (wx - bx) + (wy - by) * (wy - by);
          if (bd2 <= 36) litScore = Math.max(litScore, 0.9 - Math.sqrt(bd2) * 0.11);
        }
        for (const [bx, by] of litBelfries) {
          const bd2 = (wx - bx) * (wx - bx) + (wy - by) * (wy - by);
          if (bd2 <= 64) litScore = Math.max(litScore, 0.85 - Math.sqrt(bd2) * 0.08);
        }

        let waveHit = false;
        for (const w of this.waves) {
          const dw = Math.hypot(wx - w.cx, wy - w.cy);
          if (Math.abs(dw - w.radius) <= 1.25) {
            waveHit = true;
            litScore = 1.0;
            if (kind === TILE_WATER && ch === ' ') ch = wx >= w.cx ? ')' : '(';
            break;
          }
        }

        const inCleared = cleared.has(reg);
        const inMemory = this.visited.has((wy << 10) | wx);
        let grade;

        if (litScore <= 0.05) {
          if (inCleared) grade = GRADE_MIST;
          else if (inMemory) {
            if ([TILE_WALL, TILE_PILLAR, TILE_TREE, TILE_SALT, 'gate'].includes(kind)) grade = GRADE_GHOST;
            else {
              ch = kind !== TILE_WATER ? '.' : '~';
              grade = GRADE_GHOST;
            }
          } else {
            const dxDrift = wx + driftBase;
            const h = ((dxDrift * 73856093) ^ (wy * 19349663)) & 63;
            ch = h === 0 ? ',' : h === 21 ? '.' : ' ';
            grade = GRADE_GHOST;
          }
        } else if (waveHit) {
          grade = GRADE_BRIGHT;
        } else if (litScore > 0.65) {
          if (kind === TILE_SALT || kind === TILE_SLAG) grade = GRADE_BRIGHT;
          else if ([TILE_WALL, TILE_TIMBER, TILE_BRIDGE, TILE_ROAD, TILE_STONE].includes(kind)) grade = GRADE_LIT;
          else grade = GRADE_DIM;
        } else if (litScore > 0.3) {
          grade = kind !== TILE_WATER ? GRADE_DIM : GRADE_MIST;
        } else {
          grade = GRADE_MIST;
        }

        if (kind === TILE_SHOAL && shoalOpen && (litScore > 0.1 || waveHit)) {
          ch = 'o';
          grade = Math.floor(this.clock * 4 + wx) % 2 === 0 ? GRADE_BRIGHT : GRADE_LIT;
        }
        buf[rowIdx][vc] = [ch, grade];
      }
    }

    for (const drop of this.weather) {
      const ix = Math.floor(drop.x);
      const iy = Math.floor(drop.y);
      if (iy >= VIEW_TOP && iy < VIEW_BOTTOM && ix >= 0 && ix < GRID_COLS) {
        const wx = cx0 + ix;
        const wy = cy0 + (iy - VIEW_TOP);
        if (drop.kind === 'ember') buf[iy][ix] = ["'", GRADE_LIT];
        else if (Math.abs(wx - px) + Math.abs(wy - py) <= lampR + 2) {
          if (' .,'.includes(buf[iy][ix][0])) buf[iy][ix] = ['/', GRADE_MIST];
        }
      }
    }

    for (const feat of this.world.decorLines) {
      feat.lines.forEach((line, dr) => {
        const wy = feat.y + dr;
        if (wy < cy0 || wy >= cy0 + VIEW_ROWS) return;
        const vr = VIEW_TOP + (wy - cy0);
        for (let dc = 0; dc < line.length; dc++) {
          const ch = line[dc];
          if (ch === ' ') continue;
          const wx = feat.x + dc;
          if (wx >= cx0 && wx < cx0 + GRID_COLS) {
            const d2 = (wx - px) * (wx - px) + (wy - py) * (wy - py);
            if (this.visited.has((wy << 10) | wx) || cleared.has(this.world.regionAt(wx, wy)) || d2 <= 100) {
              buf[vr][wx - cx0] = [ch, d2 <= lampR2 ? GRADE_LIT : GRADE_DIM];
            }
          }
        }
      });
    }

    for (const w of this.waves) {
      const steps = Math.max(24, Math.floor(w.radius * 7));
      for (let s = 0; s < steps; s++) {
        const ang = (s / steps) * Math.PI * 2;
        const wx = Math.round(w.cx + Math.cos(ang) * w.radius);
        const wy = Math.round(w.cy + Math.sin(ang) * w.radius * 0.72);
        if (wx >= cx0 && wx < cx0 + GRID_COLS && wy >= cy0 && wy < cy0 + VIEW_ROWS) {
          const ch = s % 3 === 0 ? '~' : Math.cos(ang) < 0 ? '(' : ')';
          buf[VIEW_TOP + (wy - cy0)][wx - cx0] = [ch, GRADE_BRIGHT];
        }
      }
    }

    for (const br of this.world.braziers) {
      if (br.x >= cx0 && br.x < cx0 + GRID_COLS && br.y >= cy0 && br.y < cy0 + VIEW_ROWS) {
        const flick = Math.floor(this.clock * 7 + br.x) % 2 === 0 ? '*' : '+';
        buf[VIEW_TOP + (br.y - cy0)][br.x - cx0] = [flick, GRADE_BRIGHT];
      }
    }
    for (const inter of this.world.interactables) {
      if (inter.x >= cx0 && inter.x < cx0 + GRID_COLS && inter.y >= cy0 && inter.y < cy0 + VIEW_ROWS) {
        if (this.visited.has((inter.y << 10) | inter.x) || Math.abs(inter.x - px) + Math.abs(inter.y - py) <= lampR) {
          buf[VIEW_TOP + (inter.y - cy0)][inter.x - cx0] = [inter.glyph, GRADE_LIT];
        }
      }
    }
    for (const b of this.world.belfries) {
      if (b.x >= cx0 && b.x < cx0 + GRID_COLS && b.y >= cy0 && b.y < cy0 + VIEW_ROWS) {
        const ch = b.rung ? 'B' : this.player.clappers.has(b.clapperId) ? 'O' : 'b';
        buf[VIEW_TOP + (b.y - cy0)][b.x - cx0] = [ch, b.rung ? GRADE_BRIGHT : GRADE_LIT];
      }
    }
    for (const item of this.world.pickups) {
      if (item.collected) continue;
      if (item.x >= cx0 && item.x < cx0 + GRID_COLS && item.y >= cy0 && item.y < cy0 + VIEW_ROWS) {
        const d2 = (item.x - px) ** 2 + (item.y - py) ** 2;
        if (d2 <= lampR2 || cleared.has(this.world.regionAt(item.x, item.y))) {
          buf[VIEW_TOP + (item.y - cy0)][item.x - cx0] = [item.glyph, item.kind === 'clapper' ? GRADE_BRIGHT : GRADE_LIT];
        }
      }
    }
    for (const npc of this.world.npcs) {
      if (npc.id === 'pip' && this.flags.pip_rescued) continue;
      if (npc.x >= cx0 && npc.x < cx0 + GRID_COLS && npc.y >= cy0 && npc.y < cy0 + VIEW_ROWS) {
        const d2 = (npc.x - px) ** 2 + (npc.y - py) ** 2;
        if (d2 <= (lampR + 3) ** 2 || cleared.has(this.world.regionAt(npc.x, npc.y))) {
          buf[VIEW_TOP + (npc.y - cy0)][npc.x - cx0] = [npc.glyph, d2 <= 25 ? GRADE_BRIGHT : GRADE_LIT];
        }
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x >= cx0 && e.x < cx0 + GRID_COLS && e.y >= cy0 && e.y < cy0 + VIEW_ROWS) {
        const d2 = (e.x - px) ** 2 + (e.y - py) ** 2;
        const inLight = d2 <= lampR2 && this._hasLos(px, py, e.x, e.y);
        const revealed = !e.tpl.stealth || e.revealTimer > 0 || e.state === 'windup';
        if (!revealed && !inLight) {
          if (d2 <= (lampR + 4) ** 2) buf[VIEW_TOP + (e.y - cy0)][e.x - cx0] = [':', GRADE_GHOST];
          continue;
        }
        if (!inLight && !cleared.has(this.world.regionAt(e.x, e.y)) && d2 > 64) continue;

        const vr = VIEW_TOP + (e.y - cy0);
        const vc = e.x - cx0;
        let glyph = e.tpl.glyph;
        let grade = GRADE_LIT;
        if (e.hurtTimer > 0) {
          glyph = 'X';
          grade = GRADE_BRIGHT;
        } else if (e.state === 'staggered') {
          glyph = Math.floor(this.clock * 8) % 2 === 0 ? 'z' : e.tpl.glyph.toLowerCase();
          grade = GRADE_DIM;
        } else if (e.state === 'windup') {
          grade = Math.floor(this.clock * 14) % 2 === 0 ? GRADE_BRIGHT : GRADE_LIT;
          const txOff = px === e.x ? 0 : px > e.x ? 1 : -1;
          const tyOff = py === e.y ? 0 : py > e.y ? 1 : -1;
          const tc = vc + txOff;
          const tr = vr + tyOff;
          if (tc >= 0 && tc < GRID_COLS && tr >= VIEW_TOP && tr < VIEW_BOTTOM) {
            buf[tr][tc] = ['!', GRADE_BRIGHT];
          }
        }
        buf[vr][vc] = [glyph, grade];
      }
    }

    for (const sw of this.shockwaves) {
      const ix = Math.round(sw.x);
      const iy = Math.round(sw.y);
      if (ix >= cx0 && ix < cx0 + GRID_COLS && iy >= cy0 && iy < cy0 + VIEW_ROWS) {
        buf[VIEW_TOP + (iy - cy0)][ix - cx0] = ['>', GRADE_BRIGHT];
      }
    }

    const pvc = px - cx0;
    const pvr = VIEW_TOP + (py - cy0);
    if (pvc >= 0 && pvc < GRID_COLS && pvr >= VIEW_TOP && pvr < VIEW_BOTTOM) {
      const pl = this.player;
      if (pl.parryTimer > 0) {
        if (pvc > 0) buf[pvr][pvc - 1] = ['(', GRADE_BRIGHT];
        if (pvc + 1 < GRID_COLS) buf[pvr][pvc + 1] = [')', GRADE_BRIGHT];
      }
      buf[pvr][pvc] = [pl.hurtTimer <= 0 ? '@' : '!', GRADE_BRIGHT];
      if (!pl.lampHooded && pl.oil > 1) {
        const lx = pvc - pl.fx;
        if (lx >= 0 && lx < GRID_COLS && ' .,:'.includes(buf[pvr][lx][0])) {
          buf[pvr][lx] = ['*', Math.floor(this.clock * 6) % 2 === 0 ? GRADE_LIT : GRADE_BRIGHT];
        }
      }
    }

    for (const sl of this.slashes) {
      if (sl.x >= cx0 && sl.x < cx0 + GRID_COLS && sl.y >= cy0 && sl.y < cy0 + VIEW_ROWS) {
        buf[VIEW_TOP + (sl.y - cy0)][sl.x - cx0] = [sl.glyph, GRADE_BRIGHT];
      }
    }
    for (const sp of this.sparks) {
      const ix = Math.round(sp.x);
      const iy = Math.round(sp.y);
      if (ix >= cx0 && ix < cx0 + GRID_COLS && iy >= cy0 && iy < cy0 + VIEW_ROWS) {
        buf[VIEW_TOP + (iy - cy0)][ix - cx0] = [sp.glyph, sp.ttl > 0.15 ? sp.grade : GRADE_DIM];
      }
    }
    for (const fl of this.floaters) {
      const ix = Math.round(fl.x) - Math.floor(fl.text.length / 2);
      const iy = Math.round(fl.y);
      if (iy >= cy0 && iy < cy0 + VIEW_ROWS) {
        this._putStr(buf, Math.max(0, ix - cx0), VIEW_TOP + (iy - cy0), fl.text, GRADE_BRIGHT);
      }
    }

    this._putStr(buf, 0, VIEW_BOTTOM, '- '.repeat(GRID_COLS / 2), GRADE_MIST);

    if (this.screen === 'dialogue' && this.activeDialogue) {
      const line = this.activeDialogue.lineFn(this);
      this._putStr(buf, 1, LOG_TOP, fitLine(line, GRID_COLS - 2), GRADE_BRIGHT);
      this._renderDialogueChoices(buf);
    } else {
      const recent = this.log.slice(-LOG_ROWS);
      for (let idx = 0; idx < LOG_ROWS; idx++) {
        if (idx < recent.length) {
          const g = idx === recent.length - 1 ? GRADE_BRIGHT : idx === recent.length - 2 ? GRADE_DIM : GRADE_MIST;
          this._putStr(buf, 1, LOG_TOP + idx, fitLine(recent[idx], GRID_COLS - 2), g);
        }
      }
    }

    const hint =
      this.screen === 'dialogue'
        ? '[1-6] Choose   [W/S] Cycle   [Enter] Speak   [Esc] Step Back   (or click option)'
        : '[WASD] Walk  [J] Strike  [K] Parry  [L] Step  [Space] Fork  [F] Lamp  [E] Act  [H] Heal  [Tab] Map';
    this._putStr(buf, 1, HINT_ROW, fitLine(hint, GRID_COLS - 2), GRADE_MIST);
  }
}
