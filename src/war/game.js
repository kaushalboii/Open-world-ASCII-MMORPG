/**
 * IRONCROWN: The Realm in Winter -- Dual Web/CRT Strategic & Tactical ASCII War Game.
 * Combines a 76x44 Realm Campaign (supply lines, seasons, house oaths & betrayals, sieges)
 * with live 66x30 Tactical Battles (shield walls, longbow volleys, cavalry flanks, gate rams),
 * all strictly rendered as single-cell printable ASCII (32..126) on 104x38 P3 Phosphor grids.
 */

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
  TONE_AMBER,
  TONE_CRIMSON,
  TONE_FIRE,
  TONE_FOREST,
  TONE_HORSE,
  TONE_PARCHMENT,
  TONE_RIVER,
  TONE_SNOW,
  TONE_STEEL,
  TONE_STONE,
  TONE_VIOLET,
  TONE_WARHORSE,
  VIEW_ROWS,
  VIEW_TOP,
  fitLine,
  sanitizeGlyph,
} from '../engine/palette.js';
import {
  computeHouseBetrayalUtility,
  decideTacticalAiAction,
  nextRealmStep,
  pickCampaignArmyIntent,
  stepBattleTile,
} from './ai.js';
import {
  STORY_BEATS,
  bearingLabel,
  computeWarObjective,
  openCouncilMenu,
  openHoldMenu,
  openPrisonerMenu,
  openRavenMenu,
  wrapLines,
} from './narrative.js';
import {
  BATTLE_H,
  BATTLE_W,
  HOLD_TEMPLATES,
  INITIAL_HOUSES,
  REALM_H,
  REALM_W,
  SEASONS,
  TERRAIN_META,
  UNIT_TYPES,
  buildBattleMap,
  createRealmGrid,
  makeDefaultRegiments,
} from './worldData.js';
import {
  houseToneId,
  pickPortraitForDialogue,
  renderBattleScenery,
  renderCampaignMarchVista,
  renderSteedShowcase,
  stampSprite,
} from './asciiArt.js';
import {
  getBakedBattleSprite,
  getBakedCampaignHorse,
  getBakedPortrait,
  getBakedTitleHero,
  stampCellGrid,
} from './halftoneArt.js';

export const SAVE_KEY = 'ironcrown_war_v1';

export const HOLD_SHORT_TAGS = {
  blackpike: 'BLK',
  ashford: 'ASH',
  greycrag: 'GRY',
  oldford: 'OLD',
  saltport: 'SLT',
  rookkeep: 'ROK',
  redwatch: 'RED',
  kingsbridge: 'KGB',
  highcrown: 'HGC',
};

const TARGET_KEEP_ORDER = ['redwatch', 'oldford', 'rookkeep', 'kingsbridge', 'highcrown', 'greycrag', 'ashford', 'saltport', 'blackpike'];

export class IroncrownGame {
  constructor(options = {}) {
    this.sfx = options.sfxCallback || (() => {});
    this.storage = options.storage !== undefined ? options.storage : this._defaultStorage();
    this.seed = options.seed ?? 717;
    this._rngState = this.seed >>> 0;

    this.screen = 'title';
    this.clock = 0;
    this.shake = 0;
    this.activeStory = null;
    this.activeDialogue = null;
    this.choiceCursor = 0;
    this.log = [];
    this.particles = [];
    this.projectiles = [];
    this.pulseWaves = [];
    this.flags = {};
    this.helpScroll = 0;

    this.realmBase = createRealmGrid();
    this.grid = this.realmBase.grid;
    this.villages = this.realmBase.villages;

    this._initFreshState();
    this.hasExistingSave = this._checkExistingSave();
  }

  _defaultStorage() {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  _rand() {
    this._rngState = (this._rngState * 1664525 + 1013904223) >>> 0;
    return this._rngState / 4294967296;
  }

  playCue(cue) {
    try {
      this.sfx(cue);
    } catch {
      // Ignore headless audio absence
    }
  }

  _initFreshState() {
    this.houses = INITIAL_HOUSES.map((h) => ({ ...h }));
    this.holds = HOLD_TEMPLATES.map((h) => ({ ...h }));
    this.playerRegiments = makeDefaultRegiments('THN', 1.0, true);

    this.campaign = {
      px: 27,
      py: 34,
      day: 1,
      seasonIndex: 0,
      grain: 260,
      supplied: true,
      scoutedUntilDay: 0,
      moveCooldown: 0,
      facing: 1,
      gallopTimer: 0,
      marchScroll: 0,
    };

    // Rival field banners cruising the realm
    this.armies = [
      {
        id: 'dray_van',
        houseId: 'dray',
        lordName: 'Ser Torrhen Vane',
        x: 34,
        y: 33,
        men: 145,
        regiments: makeDefaultRegiments('DRY1', 0.85, false),
        moveEvery: 2,
      },
      {
        id: 'dray_main',
        houseId: 'dray',
        lordName: 'Archon Malcor Dray',
        x: 52,
        y: 31,
        men: 205,
        regiments: makeDefaultRegiments('DRY2', 1.18, false),
        moveEvery: 2,
      },
      {
        id: 'vance_host',
        houseId: 'vance',
        lordName: 'Lord Corvin Vance',
        x: 54,
        y: 16,
        men: 155,
        regiments: makeDefaultRegiments('VNC', 0.9, false),
        moveEvery: 2,
      },
      {
        id: 'brack_host',
        houseId: 'brack',
        lordName: 'Captain Maron Brack',
        x: 15,
        y: 28,
        men: 130,
        regiments: makeDefaultRegiments('BRK', 0.78, false),
        moveEvery: 3,
      },
    ];

    this.flags = { story_seen: {} };
    this.activeStory = null;
    this.activeDialogue = null;
    this.battle = null;
    this.particles = [];
    this.projectiles = [];
    this.pulseWaves = [];
    this.stats = { battlesWon: 0, siegesWon: 0, lordsCaptured: 0, daysMarched: 0 };
    this._topSquadHitboxes = [];
    this.log = [
      'Redwatch Bastion ahead! Select [5] Ram + [E] to smash Gate, or click any Keep below.',
    ];
    this._recomputeSupply();
  }

  getSeason() {
    return SEASONS[this.campaign.seasonIndex]?.id || 'winter';
  }

  getHouse(id) {
    return this.houses.find((h) => h.id === id) || this.houses[0];
  }

  holdAt(x, y) {
    return this.holds.find((h) => h.x === x && h.y === y) || null;
  }

  totalMen(regs) {
    return (regs || []).reduce((acc, r) => acc + Math.max(0, r.men || 0), 0);
  }

  heldCount() {
    return this.holds.filter((h) => h.owner === 'thorne').length;
  }

  addPlayerMen(typeId, amount, resetIfDead = false) {
    let reg = this.playerRegiments.find((r) => r.type === typeId);
    if (!reg) {
      reg = { id: `THN_${typeId}`, type: typeId, men: 0, maxMen: amount, morale: 88 };
      this.playerRegiments.push(reg);
    }
    if (resetIfDead || reg.men <= 0) {
      reg.men = amount;
      reg.maxMen = Math.max(reg.maxMen, amount);
      reg.morale = 88;
    } else {
      reg.men += amount;
      reg.maxMen = Math.max(reg.maxMen, reg.men);
      reg.morale = Math.min(100, reg.morale + 6);
    }
  }

  pushLog(msg) {
    const clean = String(msg || '').trim();
    if (!clean) return;
    if (this.log[this.log.length - 1] !== clean) {
      this.log.push(clean);
      if (this.log.length > 48) this.log.shift();
    }
  }

  _triggerStory(beatId) {
    if (!this.flags.story_seen) this.flags.story_seen = {};
    if (this.flags.story_seen[beatId]) return false;
    const beat = STORY_BEATS[beatId];
    if (!beat) return false;
    this.flags.story_seen[beatId] = true;
    this.activeStory = beat;
    this.playCue('raven');
    return true;
  }

  _checkExistingSave() {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.version === 1 && parsed.campaign);
    } catch {
      return false;
    }
  }

  saveGame() {
    if (!this.storage) return false;
    try {
      const payload = {
        version: 1,
        houses: this.houses,
        holds: this.holds,
        playerRegiments: this.playerRegiments,
        campaign: this.campaign,
        armies: this.armies,
        flags: this.flags,
        stats: this.stats,
        log: this.log.slice(-8),
      };
      this.storage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.hasExistingSave = true;
      return true;
    } catch {
      return false;
    }
  }

  loadGame() {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !data.campaign) return false;
      this.houses = data.houses;
      this.holds = data.holds;
      this.playerRegiments = data.playerRegiments;
      this.campaign = data.campaign;
      this.armies = data.armies;
      this.flags = data.flags || { story_seen: {} };
      this.stats = data.stats || this.stats;
      this.log = data.log || this.log;
      this.activeStory = null;
      this.activeDialogue = null;
      this.battle = null;
      this._recomputeSupply();
      this.deployToNextTarget();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Supply BFS from any House Thorne Hold (or Saltport sea lane when Brack/player hold Saltport)
   * across walkable terrain without stepping next to hostile armies.
   */
  _recomputeSupply() {
    const seasonId = SEASONS[this.campaign.seasonIndex].id;
    const blocked = new Set();
    for (const a of this.armies) {
      if (a.men <= 0) continue;
      const h = this.getHouse(a.houseId);
      if (h.treaty === 'war' || h.relation <= -40) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            blocked.add(`${a.x + dx},${a.y + dy}`);
          }
        }
      }
    }

    const q = [];
    const distMap = new Map();
    for (const hold of this.holds) {
      const owner = this.getHouse(hold.owner);
      const alliedSupply = hold.owner === 'thorne' || owner.treaty === 'oath';
      if (alliedSupply) {
        const k = `${hold.x},${hold.y}`;
        q.push([hold.x, hold.y, 0]);
        distMap.set(k, 0);
      }
    }

    let head = 0;
    while (head < q.length) {
      const [cx, cy, d] = q[head++];
      if (cx === this.campaign.px && cy === this.campaign.py) {
        this.campaign.supplied = true;
        return true;
      }
      if (d >= 26) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= REALM_W || ny < 0 || ny >= REALM_H) continue;
        const ch = this.grid[ny][nx];
        let passable = TERRAIN_META[ch]?.passable ?? false;
        if (ch === ':' && seasonId === 'autumn') passable = false;
        if (!passable) continue;
        const nk = `${nx},${ny}`;
        if (blocked.has(nk) && !(nx === this.campaign.px && ny === this.campaign.py)) continue;
        if (!distMap.has(nk)) {
          distMap.set(nk, d + 1);
          q.push([nx, ny, d + 1]);
        }
      }
    }

    // Check coastal shipping supply via friendly/allied Saltport when standing near shore
    const salt = this.holds.find((h) => h.id === 'saltport');
    const brackish = this.getHouse('brack');
    const seaSupply = salt && (salt.owner === 'thorne' || brackish.treaty === 'oath');
    if (seaSupply && this.campaign.px <= 16 && this.campaign.py >= 20) {
      this.campaign.supplied = true;
      return true;
    }

    this.campaign.supplied = false;
    return false;
  }

  /**
   * Advance one strategic War Day: consume grain, update seasons, evaluate Utility AI
   * betrayals, move rival banners, and resolve tax income on seasonal marks.
   */
  advanceCampaignDay(alreadyAte = false) {
    this.campaign.day += 1;
    this.stats.daysMarched += 1;

    // Cycle season every 10 days
    const prevSeason = this.campaign.seasonIndex;
    this.campaign.seasonIndex = Math.floor((this.campaign.day - 1) / 10) % SEASONS.length;
    const season = SEASONS[this.campaign.seasonIndex];
    if (this.campaign.seasonIndex !== prevSeason) {
      this.flags.taxed_this_season = false;
      this.pushLog(`Season turns to ${season.label}. Supply and road speed shift.`);
      if (season.id === 'winter') this._triggerStory('deep_winter');
    }

    // Seasonal revenue & grain harvest every 3 days
    if (this.campaign.day % 3 === 0) {
      let silver = 0;
      let harvest = 0;
      for (const h of this.holds) {
        if (h.owner === 'thorne') {
          silver += Math.round(h.taxYield * 0.4);
          harvest += Math.round(h.grainYield * (season.id === 'winter' ? 0.35 : 0.75));
        }
      }
      this.getHouse('thorne').treasury += silver;
      this.campaign.grain += harvest;
      this.pushLog(`Bailiffs remit +${silver}g taxes and +${harvest} Grain from held Keeps.`);
    }

    // Grain consumption & Winter/Cut-Supply attrition
    this._recomputeSupply();
    if (!alreadyAte) {
      const men = this.totalMen(this.playerRegiments);
      const supplyMult = this.campaign.supplied ? 1.0 : 1.5;
      const eaten = Math.max(2, Math.round((men / 26) * season.foodMult * supplyMult));
      this.campaign.grain = Math.max(0, this.campaign.grain - eaten);
    }

    if (this.campaign.grain <= 0) {
      for (const r of this.playerRegiments) {
        if (r.men > 2 && r.type !== 'ram') r.men = Math.max(2, r.men - 3);
        r.morale = Math.max(25, r.morale - 6);
      }
      this.pushLog('STARVATION! Empty wagons cost desertions & morale. Forage [R] or return to Keep!');
    } else if (!this.campaign.supplied && season.attrition > 0) {
      for (const r of this.playerRegiments) {
        if (r.men > 4 && r.type !== 'ram') r.men = Math.max(4, r.men - season.attrition);
      }
      this.pushLog('Cut off from Supply in freezing cold: frostbite claims stragglers.');
    }

    // Evaluate House Utility Betrayal & Rival Movements
    this._stepHousesAndArmies();

    // Check total defeat
    if (this.totalMen(this.playerRegiments) <= 0 || this.heldCount() <= 0) {
      this.screen = 'dead';
      this.playCue('defeat');
      return;
    }
    this.saveGame();
  }

  _stepHousesAndArmies() {
    const th = this.getHouse('thorne');
    const pMen = this.totalMen(this.playerRegiments);

    for (const h of this.houses) {
      if (h.isPlayer || h.id === 'dray') continue;
      const risk01 = computeHouseBetrayalUtility(h, th, pMen, this.holds);
      h.betrayalRisk = Math.round(risk01 * 100);

      // Betrayal trigger if unchecked above 74%
      if (h.treaty !== 'war' && h.betrayalRisk >= 74 && !this.flags[`betrayed_${h.id}`]) {
        this.flags[`betrayed_${h.id}`] = true;
        h.treaty = 'war';
        h.relation = -85;
        this.pushLog(`TREACHERY! ${h.name} breaks faith and declares for Archon Dray!`);
        this._triggerStory('betrayal_spark');
      }
    }

    // Move active rival field armies
    for (const army of this.armies) {
      if (army.men <= 0) continue;
      if (this.campaign.day % (army.moveEvery || 2) !== 0) continue;
      const house = this.getHouse(army.houseId);
      const intent = pickCampaignArmyIntent(army, house, this);
      const step = nextRealmStep(
        this.grid,
        army.x,
        army.y,
        intent.tx,
        intent.ty,
        SEASONS[this.campaign.seasonIndex].id,
        650
      );
      if (step) {
        army.x = step[0];
        army.y = step[1];
      }

      // Engage player if colliding & hostile
      const hostile = house.treaty === 'war' || house.relation <= -40;
      if (hostile && army.x === this.campaign.px && army.y === this.campaign.py && this.screen === 'campaign') {
        this.pushLog(`${army.lordName} (${house.name}) intercepts your column!`);
        this.startFieldBattle(army);
        return;
      }

      // Besiege unguarded Thorne hold if enemy reaches it
      const holdHere = this.holdAt(army.x, army.y);
      if (hostile && holdHere && holdHere.owner === 'thorne') {
        holdHere.garrison = Math.max(0, holdHere.garrison - Math.round(army.men * 0.18));
        holdHere.wallHp = Math.max(0, holdHere.wallHp - 18);
        this.pushLog(`WARNING: ${army.lordName} assaults ${holdHere.name} (${holdHere.garrison} garrison left)!`);
        if (holdHere.garrison <= 0) {
          holdHere.owner = house.id;
          holdHere.garrison = 55;
          holdHere.wallHp = Math.round(holdHere.maxWall * 0.65);
          this.pushLog(`${holdHere.name} HAS FALLEN to ${house.name}!`);
        }
      }
    }
  }

  resupplyAtHold(hold) {
    const seasonHeal = SEASONS[this.campaign.seasonIndex].id === 'winter' ? 8 : 14;
    for (const r of this.playerRegiments) {
      r.men = Math.min(r.maxMen, r.men + seasonHeal);
      r.morale = Math.min(100, r.morale + 18);
    }
    this.campaign.grain = Math.min(450, this.campaign.grain + 45);
    hold.wallHp = Math.min(hold.maxWall, hold.wallHp + 30);
    this.playCue('muster');
    this.pushLog(`Quartered at ${hold.name}: wounded mended, morale steady, +45 Grain.`);
  }

  captureHold(hold) {
    const prevOwner = this.getHouse(hold.owner);
    hold.owner = 'thorne';
    hold.garrison = 60;
    hold.wallHp = Math.round(hold.maxWall * 0.75);
    this.getHouse('thorne').treasury += 110;
    this.campaign.grain += 55;
    this.stats.siegesWon += 1;
    this.playCue('victory');
    this.pushLog(`${hold.name.toUpperCase()} CAPTURED from ${prevOwner.name}! Click next [K] Keep below or press [M]!`);
    this._recomputeSupply();

    if (hold.id === 'highcrown') {
      this.screen = 'victory';
      return;
    }
    this.saveGame();
  }

  _enterFirstBattleground() {
    this.activeStory = null;
    this.activeDialogue = null;
    const redwatch = this.holds.find((h) => h.id === 'redwatch') || this.holds.find((h) => h.owner !== 'thorne') || this.holds[0];
    this.deployToHold(redwatch);
  }

  deployToHold(hold) {
    if (!hold) return;
    this.campaign.px = hold.x;
    this.campaign.py = hold.y;
    this._recomputeSupply();
    if (hold.owner === 'thorne') {
      this.resupplyAtHold(hold);
      const raiders = {
        id: `patrol_${hold.id}`,
        houseId: 'dray',
        lordName: `Dray Raiders at ${hold.name}`,
        x: hold.x,
        y: hold.y,
        men: 95,
        regiments: makeDefaultRegiments('RAID', 0.58, false),
      };
      this.startFieldBattle(raiders, `${hold.name.toUpperCase()} OUTSKIRTS`);
      return;
    }
    this.startSiegeBattle(hold);
  }

  deployToNextTarget() {
    for (const hid of TARGET_KEEP_ORDER) {
      const h = this.holds.find((k) => k.id === hid);
      if (h && h.owner !== 'thorne') {
        this.deployToHold(h);
        return;
      }
    }
    const liveFoe = this.armies.find((a) => a.men > 0);
    if (liveFoe) {
      this.campaign.px = liveFoe.x;
      this.campaign.py = liveFoe.y;
      this.startFieldBattle(liveFoe);
      return;
    }
    this.screen = 'victory';
  }

  // ==================== BATTLE SYSTEM ====================

  _inferBattleTerrain(x, y) {
    const ch = this.grid[y]?.[x] || '.';
    if (ch === '=' && (y === 18 || y === 19 || y === 30 || y === 31)) return 'bridge';
    if (ch === 'T') return 'forest';
    if (ch === ',') return 'mud';
    return 'plains';
  }

  startFieldBattle(army, customTitle = null) {
    this.campaign.px = army.x ?? this.campaign.px;
    this.campaign.py = army.y ?? this.campaign.py;
    const kind = this._inferBattleTerrain(this.campaign.px, this.campaign.py);
    const map = buildBattleMap({ kind });
    this._launchBattle({
      title: customTitle || `FIELD: vs ${army.lordName}`,
      map,
      sourceArmy: army,
      sourceHold: null,
      gateHp: 0,
      gateBreached: true,
    });
  }

  startSiegeBattle(hold) {
    this.campaign.px = hold.x;
    this.campaign.py = hold.y;
    const preBribed = Boolean(this.flags[`bribed_${hold.id}`]);
    const map = buildBattleMap({ kind: 'siege', hold, gateBreached: preBribed });
    const enemyHouse = this.getHouse(hold.owner);
    const scale = Math.max(0.6, hold.garrison / 115);
    const defenders = [
      { id: 'def_guard', type: 'guard', men: Math.round(28 * scale), maxMen: Math.round(28 * scale), morale: 90 },
      { id: 'def_spear', type: 'spear', men: Math.round(52 * scale), maxMen: Math.round(52 * scale), morale: 85 },
      { id: 'def_bow', type: 'bow', men: Math.round(48 * scale), maxMen: Math.round(48 * scale), morale: 84 },
    ];
    this._launchBattle({
      title: `SIEGE OF ${hold.name.toUpperCase()}`,
      map,
      sourceArmy: {
        id: `garrison_${hold.id}`,
        houseId: enemyHouse.id,
        lordName: hold.id === 'highcrown' ? 'Archon Malcor Dray' : `Castellan of ${hold.name}`,
        regiments: defenders,
      },
      sourceHold: hold,
      gateHp: preBribed ? 0 : Math.max(60, Math.round(hold.wallHp * 0.72)),
      gateBreached: preBribed,
    });
  }

  _launchBattle({ title, map, sourceArmy, sourceHold, gateHp, gateBreached }) {
    const startSlots = [
      { x: 22, y: 5 },
      { x: 18, y: 11 },
      { x: 7, y: 15 },
      { x: 23, y: 19 },
      { x: 37, y: 11 },
    ];
    const playerSquads = this.playerRegiments
      .filter((r) => r.men > 0)
      .map((r, i) => ({
        slot: i + 1,
        type: r.type,
        label: UNIT_TYPES[r.type].name,
        code: UNIT_TYPES[r.type].code,
        x: startSlots[i]?.x ?? 16,
        y: startSlots[i]?.y ?? Math.min(BATTLE_H - 3, 4 + i * 4),
        men: r.men,
        maxMen: r.maxMen,
        hp: r.men * UNIT_TYPES[r.type].hpPerMan,
        morale: r.morale,
        braced: r.type === 'spear',
        routed: false,
        cooldown: 0,
        facing: 1,
        pose: 'idle',
        poseTimer: 0,
        side: 'attacker',
        order: null,
      }));

    const isSiege = map.kind === 'siege';
    const defSlots = isSiege
      ? [
          { x: 90, y: 11 },
          { x: 76, y: 11 },
          { x: 74, y: 5 },
          { x: 79, y: 18 },
        ]
      : [
          { x: 82, y: 11 },
          { x: 72, y: 11 },
          { x: 88, y: 5 },
          { x: 76, y: 18 },
        ];
    const enemySquads = sourceArmy.regiments
      .filter((r) => r.men > 0)
      .map((r, i) => ({
        slot: i + 1,
        type: r.type,
        label: UNIT_TYPES[r.type].name,
        code: UNIT_TYPES[r.type].code.toLowerCase(),
        x: defSlots[i]?.x ?? 52,
        y: defSlots[i]?.y ?? 7 + i * 5,
        men: r.men,
        maxMen: r.maxMen,
        hp: r.men * UNIT_TYPES[r.type].hpPerMan,
        morale: r.morale,
        braced: isSiege && r.type === 'spear',
        routed: false,
        cooldown: 0,
        facing: -1,
        pose: 'idle',
        poseTimer: 0,
        side: isSiege ? 'defender' : 'enemy',
      }));

    this.battle = {
      title,
      map,
      sourceArmy,
      sourceHold,
      gateHp,
      maxGateHp: Math.max(1, gateHp),
      gateBreached,
      playerSquads,
      enemySquads,
      selectedSlot: playerSquads[0]?.slot || 1,
      paused: false,
      tickTimer: 0,
      turnCount: 0,
      outcome: null,
    };
    this.projectiles = [];
    this.particles = [];
    this.pulseWaves = [];
    this.screen = 'battle';
    this.activeStory = this.activeStory; // preserve if siege beat popped cleanly
    this.playCue('horn');
    if (gateBreached && isSiege) {
      this.pushLog('Bribed Postern Warden swings the gate open! Pour inside!');
    } else {
      this.pushLog(`${title} -- Command squads [1-5], [WASD] Move, [F] Shield, [B] Volley, [C] Charge.`);
    }
  }

  _selectedPlayerSquad() {
    if (!this.battle) return null;
    return (
      this.battle.playerSquads.find((s) => s.slot === this.battle.selectedSlot && s.men > 0) ||
      this.battle.playerSquads.find((s) => s.men > 0) ||
      null
    );
  }

  _isBattleTileOccupied(x, y, selfSquad = null) {
    if (!this.battle) return false;
    for (const s of [...this.battle.playerSquads, ...this.battle.enemySquads]) {
      if (s !== selfSquad && s.men > 0 && s.x === x && s.y === y) return true;
    }
    return false;
  }

  _applySquadDamage(attacker, target, rawDmg, moraleHit, isArrow = false) {
    if (!target || target.men <= 0) return 0;
    const tplAtt = UNIT_TYPES[attacker.type];
    const tplDef = UNIT_TYPES[target.type];
    const ironBonus = attacker.side === 'attacker' && this.flags.locke_steel ? 1.15 : 1.0;
    const tile = this.battle.map.grid[target.y]?.[target.x] || '.';
    const cover = TERRAIN_META[tile]?.cover ?? 0;

    let mult = ironBonus;
    if (target.braced && (isArrow || attacker.type === 'horse')) {
      mult *= 0.52;
    }
    if (cover > 0 && isArrow) {
      mult *= Math.max(0.45, 1 - cover / 120);
    }
    // Flanking check: cavalry or strike hitting target away from wall / behind line
    if (!isArrow && attacker.type === 'horse' && !target.braced) {
      mult *= 1.55;
      moraleHit += 12;
    }

    const armorMit = Math.max(0.5, 1 - tplDef.armor * 0.035);
    const dmg = Math.max(18, Math.round(rawDmg * mult * armorMit));
    target.hp = Math.max(0, target.hp - dmg);
    target.men = target.hp <= 0 ? 0 : Math.ceil(target.hp / tplDef.hpPerMan);
    target.morale = Math.max(0, target.morale - moraleHit);

    if (target.morale < 22 && target.men > 0 && !target.routed) {
      target.routed = true;
      target.braced = false;
      this.playCue('rout');
      this.pushLog(`${target.label} (${target.side}) MORALE BREAKS -- ROUTING!`);
    }
    this._spawnSparks(target.x, target.y, isArrow ? 3 : 6);
    return dmg;
  }

  _spawnSparks(x, y, count = 4) {
    const glyphs = ['*', '+', ':', '.'];
    for (let i = 0; i < count; i++) {
      const ang = this._rand() * Math.PI * 2;
      const spd = 2 + this._rand() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65,
        ch: glyphs[i % glyphs.length],
        life: 0.35 + this._rand() * 0.25,
      });
    }
  }

  _spawnArrowVolley(shooter, target, count = 3) {
    const dir = target.x >= shooter.x ? '>' : '<';
    for (let i = 0; i < count; i++) {
      this.projectiles.push({
        x: shooter.x,
        y: shooter.y + (i - 1) * 0.35,
        tx: target.x,
        ty: target.y,
        ch: target.x >= shooter.x ? '->' : '<-',
        chSingle: dir,
        t: 0,
        dur: 0.32 + i * 0.06,
      });
    }
  }

  _tickBattle() {
    const b = this.battle;
    if (!b || b.outcome) return;
    b.turnCount += 1;

    // 1. Player squads follow queued click/march orders + automatic adjacent melee
    for (const ps of b.playerSquads) {
      if (ps.men <= 0) continue;
      if (ps.cooldown > 0) ps.cooldown -= 1;

      if (ps.order) {
        if (ps.x === ps.order.tx && ps.y === ps.order.ty) {
          ps.order = null;
        } else {
          const [nx, ny] = stepBattleTile(b.map.grid, ps.x, ps.y, ps.order.tx, ps.order.ty, (x, y) =>
            this._isBattleTileOccupied(x, y, ps)
          );
          if (nx === ps.x && ny === ps.y) ps.order = null;
          else {
            if (nx !== ps.x) ps.facing = nx > ps.x ? 1 : -1;
            ps.x = nx;
            ps.y = ny;
          }
        }
      }

      // Auto-fight adjacent enemies cleanly
      const adjEnemy = b.enemySquads.find(
        (e) => e.men > 0 && Math.abs(e.x - ps.x) + Math.abs(e.y - ps.y) <= 1
      );
      if (adjEnemy && ps.type !== 'ram') {
        const power = UNIT_TYPES[ps.type].atk * Math.sqrt(Math.max(4, ps.men)) * 2.3;
        ps.facing = adjEnemy.x >= ps.x ? 1 : -1;
        ps.pose = 'attack';
        ps.poseTimer = 0.45;
        this._applySquadDamage(ps, adjEnemy, power, 5);
        this.playCue('clash');
      }

      // Steady morale near Guard '@'
      const guard = b.playerSquads.find((g) => g.type === 'guard' && g.men > 0);
      if (guard && Math.abs(guard.x - ps.x) + Math.abs(guard.y - ps.y) <= 4) {
        ps.morale = Math.min(100, ps.morale + 2);
      }
    }

    // 2. Enemy tactical AI
    for (const es of b.enemySquads) {
      if (es.men <= 0) continue;
      if (es.cooldown > 0) es.cooldown -= 1;
      const dec = decideTacticalAiAction(es, b, this);
      if (dec.act === 'brace') {
        es.braced = true;
      } else if (dec.act === 'move') {
        es.braced = false;
        const [nx, ny] = stepBattleTile(b.map.grid, es.x, es.y, dec.tx, dec.ty, (x, y) =>
          this._isBattleTileOccupied(x, y, es)
        );
        if (nx !== es.x) es.facing = nx > es.x ? 1 : -1;
        es.x = nx;
        es.y = ny;
        if (es.routed && es.x >= BATTLE_W - 2) {
          es.men = 0;
          es.hp = 0;
        }
      } else if (dec.act === 'volley' && dec.target) {
        es.cooldown = 2;
        es.facing = dec.target.x >= es.x ? 1 : -1;
        es.pose = 'volley';
        es.poseTimer = 0.5;
        const power = UNIT_TYPES.bow.atk * Math.sqrt(Math.max(4, es.men)) * 1.9;
        this._spawnArrowVolley(es, dec.target);
        this._applySquadDamage(es, dec.target, power, 4, true);
        this.playCue('volley');
      } else if (dec.act === 'charge' && dec.target) {
        es.cooldown = 2;
        es.pose = 'charge';
        es.poseTimer = 0.55;
        const [nx, ny] = stepBattleTile(b.map.grid, es.x, es.y, dec.target.x, dec.target.y, (x, y) =>
          this._isBattleTileOccupied(x, y, es)
        );
        if (nx !== es.x) es.facing = nx > es.x ? 1 : -1;
        es.x = nx;
        es.y = ny;
        if (Math.abs(es.x - dec.target.x) + Math.abs(es.y - dec.target.y) <= 1) {
          const bracedSpears = dec.target.type === 'spear' && dec.target.braced;
          if (bracedSpears) {
            // Spearmen impale charging horse!
            this._applySquadDamage(dec.target, es, 140, 14);
            this.playCue('shield');
            this.pushLog(`${dec.target.label} SHIELD WALL impales charging Lancers!`);
          } else {
            const dmg = UNIT_TYPES.horse.atk * Math.sqrt(Math.max(4, es.men)) * 2.8;
            this._applySquadDamage(es, dec.target, dmg, 12);
            this.shake = 0.22;
            this.playCue('clash');
          }
        }
      } else if (dec.act === 'melee' && dec.target) {
        es.facing = dec.target.x >= es.x ? 1 : -1;
        es.pose = 'attack';
        es.poseTimer = 0.45;
        const dmg = UNIT_TYPES[es.type].atk * Math.sqrt(Math.max(4, es.men)) * 2.1;
        this._applySquadDamage(es, dec.target, dmg, 5);
        this.playCue('clash');
      }
    }

    // 3. Evaluate Victory / Defeat cleanly
    const activeFoes = b.enemySquads.filter((s) => s.men > 0 && !s.routed);
    const activeUs = b.playerSquads.filter((s) => s.men > 0 && !s.routed);
    if (activeFoes.length === 0) {
      this._resolveBattleVictory();
    } else if (activeUs.length === 0) {
      this._resolveBattleDefeat();
    }
  }

  _executePlayerTactic(verb) {
    const b = this.battle;
    if (!b || b.outcome) return;
    const sq = this._selectedPlayerSquad();
    if (!sq) return;

    if (verb === 'parry') {
      sq.braced = !sq.braced;
      this.playCue('shield');
      this.pushLog(`${sq.label} ${sq.braced ? 'LOCKS SHIELD WALL (anti-arrow & anti-horse)!' : 'opens formation.'}`);
      return;
    }

    if (verb === 'fork') {
      // War-horn Rally wave
      this.playCue('horn');
      this.shake = 0.16;
      this.pulseWaves.push({ x: sq.x, y: sq.y, radius: 1, maxRadius: 11 });
      for (const s of b.playerSquads) {
        if (s.men > 0) {
          s.morale = Math.min(100, s.morale + 14);
          s.routed = false;
        }
      }
      this.pushLog('WAR-HORN RALLY! House Thorne banners steady (+14 Morale).');
      return;
    }

    const foes = b.enemySquads.filter((s) => s.men > 0);
    if (foes.length === 0) {
      this._resolveBattleVictory();
      return;
    }
    const nearest = foes.slice().sort(
      (a, b2) => Math.abs(a.x - sq.x) + Math.abs(a.y - sq.y) - (Math.abs(b2.x - sq.x) + Math.abs(b2.y - sq.y))
    )[0];
    const dist = Math.abs(nearest.x - sq.x) + Math.abs(nearest.y - sq.y);

    if (verb === 'volley') {
      const shooter = b.playerSquads.find((s) => s.type === 'bow' && s.men > 0) || sq;
      const bowTarget = foes.slice().sort(
        (a, c) =>
          Math.abs(a.x - shooter.x) + Math.abs(a.y - shooter.y) -
          (Math.abs(c.x - shooter.x) + Math.abs(c.y - shooter.y))
      )[0];
      const bd = Math.abs(bowTarget.x - shooter.x) + Math.abs(bowTarget.y - shooter.y);
      if (bd > 26) {
        this.pushLog(`Longbows out of range (${bd} tiles > 26). Move [3] Bows closer!`);
        return;
      }
      const mult = shooter.type === 'bow' ? 2.5 : 1.1;
      shooter.facing = bowTarget.x >= shooter.x ? 1 : -1;
      shooter.pose = 'volley';
      shooter.poseTimer = 0.55;
      this._spawnArrowVolley(shooter, bowTarget, 4);
      const dmg = UNIT_TYPES[shooter.type].atk * Math.sqrt(Math.max(4, shooter.men)) * mult;
      this._applySquadDamage(shooter, bowTarget, dmg, 7, true);
      this.playCue('volley');
      this.pushLog(`Arrow volley shreds ${bowTarget.label} (-${dmg} HP, ${bowTarget.morale}% morale)!`);
      this._tickBattle();
      return;
    }

    if (verb === 'strike' || verb === 'dodge') {
      // Tactical Charge / Strike with selected unit (moves 1-2 tiles toward foe if close & strikes!)
      sq.facing = nearest.x >= sq.x ? 1 : -1;
      sq.pose = sq.type === 'horse' ? 'charge' : 'attack';
      sq.poseTimer = 0.55;
      if (dist > 1) {
        const steps = sq.type === 'horse' || verb === 'dodge' ? 2 : 1;
        for (let k = 0; k < steps; k++) {
          const [nx, ny] = stepBattleTile(b.map.grid, sq.x, sq.y, nearest.x, nearest.y, (x, y) =>
            this._isBattleTileOccupied(x, y, sq)
          );
          if (nx !== sq.x) sq.facing = nx > sq.x ? 1 : -1;
          sq.x = nx;
          sq.y = ny;
        }
      }
      const nd = Math.abs(nearest.x - sq.x) + Math.abs(nearest.y - sq.y);
      if (nd <= 2) {
        sq.braced = false;
        const flankBonus = sq.type === 'horse' ? 3.2 : 2.5;
        const dmg = UNIT_TYPES[sq.type].atk * Math.sqrt(Math.max(4, sq.men)) * flankBonus;
        this._applySquadDamage(sq, nearest, dmg, sq.type === 'horse' ? 14 : 7);
        this.shake = 0.24;
        this.playCue('clash');
        this.pushLog(`${sq.label} crashes into ${nearest.label} (${nearest.men} left)!`);
      } else {
        this.pushLog(`${sq.label} closes toward ${nearest.label}.`);
      }
      this._tickBattle();
      return;
    }

    if (verb === 'interact') {
      // 1) Ram / Breach Gate [HH]
      if (b.map.kind === 'siege' && !b.gateBreached) {
        const nearGate = Math.abs(sq.x - (b.map.wallX - 1)) <= 2 && Math.abs(sq.y - b.map.gateY) <= 2;
        if (nearGate) {
          sq.facing = 1;
          sq.pose = 'attack';
          sq.poseTimer = 0.55;
          const blow = sq.type === 'ram' ? 48 : 18;
          b.gateHp = Math.max(0, b.gateHp - blow);
          this.shake = 0.34;
          this.playCue('ram');
          this._spawnSparks(b.map.wallX, b.map.gateY, 8);
          if (b.gateHp <= 0) {
            b.gateBreached = true;
            for (let gy = b.map.gateY - 1; gy <= b.map.gateY + 1; gy++) {
              b.map.grid[gy][b.map.wallX] = '.';
              b.map.grid[gy][b.map.wallX + 1] = '.';
            }
            this.pushLog('IRON GATEHOUSE SHATTERS! Storm into the Keep Courtyard!');
          } else {
            this.pushLog(`Battering blow cracks Gatehouse (${b.gateHp}/${b.maxGateHp} HP left)!`);
          }
          this._tickBattle();
          return;
        }
        // 2) Ladder Wall Breach Notch [L] at rows 7 or 15 -> step cleanly across wall!
        if (Math.abs(sq.x - (b.map.wallX - 1)) <= 1 && (Math.abs(sq.y - 7) <= 1 || Math.abs(sq.y - 15) <= 1)) {
          const destX = b.map.wallX + 2;
          if (!this._isBattleTileOccupied(destX, sq.y)) {
            sq.x = destX;
            this.playCue('step');
            this.pushLog(`${sq.label} swarms up Siege Ladders onto the inner bailey!`);
            this._tickBattle();
            return;
          }
        }
      }

      // 3) Single Combat Challenge vs Enemy Guard Commander
      const enemyBoss = b.enemySquads.find(
        (s) => s.men > 0 && s.type === 'guard' && Math.abs(s.x - sq.x) + Math.abs(s.y - sq.y) <= 2
      );
      if (enemyBoss) {
        this.shake = 0.28;
        this.playCue('clash');
        this._applySquadDamage(sq, enemyBoss, 150, 26);
        this.pushLog(`SINGLE COMBAT! Steel sparks against ${b.sourceArmy.lordName} (-26 Enemy Morale)!`);
        this._tickBattle();
        return;
      }

      this.pushLog('Move beside Gate [HH] (with Ram [5]), Ladder [L], or Enemy Lord for [E].');
    }
  }

  _resolveBattleVictory() {
    const b = this.battle;
    if (!b || b.outcome) return;
    b.outcome = 'victory';
    this.stats.battlesWon += 1;
    // Sync surviving regiments & heal light battlefield spoils so campaign stays kinetic
    for (const r of this.playerRegiments) {
      const sq = b.playerSquads.find((s) => s.type === r.type);
      if (sq) {
        r.men = Math.min(r.maxMen, Math.max(0, sq.men) + (r.type === 'ram' ? 2 : 8));
        r.morale = Math.min(100, Math.max(55, sq.morale + 10));
        sq.men = r.men;
        sq.morale = r.morale;
      }
    }

    const th = this.getHouse('thorne');
    th.treasury += 85;
    this.campaign.grain += 30;
    this.playCue('victory');

    if (b.sourceHold) {
      const wonHold = b.sourceHold;
      this.captureHold(wonHold);
      return;
    }

    // Field army defeated -> remove enemy field column & stay on Battleground + Small Map!
    const defeatedArmy = b.sourceArmy;
    defeatedArmy.men = 0;
    this.stats.lordsCaptured += 1;
    this.pushLog(`VICTORY vs ${defeatedArmy.lordName}! Click [K] Hold or [X] Army below (or [Enter])!`);
    this.saveGame();
  }

  _resolveBattleDefeat(retreated = false) {
    const b = this.battle;
    if (!b) return;
    for (const r of this.playerRegiments) {
      const sq = b.playerSquads.find((s) => s.type === r.type);
      if (sq) {
        r.men = retreated ? Math.max(10, Math.round(sq.men * 0.78)) : Math.max(0, sq.men);
        r.morale = 58;
      }
    }
    if (!retreated && this.totalMen(this.playerRegiments) <= 0) {
      this.battle = null;
      this.screen = 'dead';
      this.playCue('defeat');
      this.saveGame();
      return;
    }
    this.playCue('rout');
    const blackpike = this.holds.find((h) => h.owner === 'thorne') || this.holds[0];
    this.pushLog(
      retreated
        ? `Retreated cleanly! Regrouping at ${blackpike.name} -- click any Keep below to strike!`
        : `Line broken! Rallying reserves at ${blackpike.name} -- click any Keep below!`
    );
    this.deployToHold(blackpike);
    this.saveGame();
  }

  // ==================== INPUT & UPDATE LOOP ====================

  handleAction(act) {
    if (!act) return;

    if (this.screen === 'title') {
      if (act === 'confirm') {
        if (this.hasExistingSave && this.loadGame()) {
          this.pushLog('War banner raised from saved battlefield.');
        } else {
          this._initFreshState();
          this._enterFirstBattleground();
        }
      } else if (act === 'new_game') {
        this._initFreshState();
        this._enterFirstBattleground();
      } else if (act === 'help') {
        this.screen = 'help';
      }
      return;
    }

    if (this.screen === 'steed' || this.screen === 'help' || this.screen === 'ledger') {
      if (act === 'confirm' || act === 'cancel' || act === 'ledger' || act === 'help' || act === 'steed') {
        if (!this.battle) this._enterFirstBattleground();
        else this.screen = 'battle';
      }
      return;
    }

    if (this.screen === 'victory' || this.screen === 'dead') {
      if (act === 'confirm' || act === 'new_game') {
        this._initFreshState();
        this._enterFirstBattleground();
      } else if (act === 'cancel') {
        this.screen = 'title';
      }
      return;
    }

    if (this.screen === 'dialogue') {
      this._handleDialogueInput(act);
      return;
    }

    if (this.activeStory) {
      this.activeStory = null;
      if (act === 'confirm' || act === 'cancel') return;
    }

    if (this.screen === 'battle') {
      this._handleBattleInput(act);
      return;
    }

    if (this.screen === 'campaign') {
      this._enterFirstBattleground();
    }
  }

  _handleDialogueInput(act) {
    const dlg = this.activeDialogue;
    if (!dlg) {
      this.screen = 'campaign';
      return;
    }
    const choices = dlg.choices || [];
    if (act === 'cancel') {
      this.activeDialogue = null;
      this.screen = this.battle ? 'battle' : 'campaign';
      return;
    }
    if (act === 'move_n') {
      this.choiceCursor = (this.choiceCursor + choices.length - 1) % choices.length;
      return;
    }
    if (act === 'move_s') {
      this.choiceCursor = (this.choiceCursor + 1) % choices.length;
      return;
    }
    let idx = -1;
    if (act.startsWith('choice_')) {
      idx = Number(act.split('_')[1]) - 1;
    } else if (act === 'confirm') {
      idx = this.choiceCursor;
    }
    if (idx >= 0 && idx < choices.length) {
      const c = choices[idx];
      if (c.enabled && !c.enabled(this)) {
        this.pushLog('Requirements not met (check Silver, Grain, or Treaty).');
        return;
      }
      const next = c.action ? c.action(this) : null;
      if (next) {
        this.activeDialogue = next;
        this.choiceCursor = 0;
      } else if (this.screen === 'dialogue') {
        // Re-evaluate line / close if screen wasn't shifted by action
        this.choiceCursor = Math.min(this.choiceCursor, choices.length - 1);
      }
    }
  }

  _handleCampaignInput(act) {
    if (act === 'ledger') {
      this.screen = 'ledger';
      return;
    }
    if (act === 'help') {
      this.screen = 'help';
      return;
    }
    if (act === 'steed') {
      this._prevScreen = 'campaign';
      this.screen = 'steed';
      return;
    }
    if (act === 'council') {
      this.activeDialogue = openCouncilMenu(this);
      this.choiceCursor = 0;
      this.screen = 'dialogue';
      return;
    }
    if (act === 'raven') {
      this.activeDialogue = openRavenMenu(this);
      this.choiceCursor = 0;
      this.screen = 'dialogue';
      return;
    }
    if (act === 'fork') {
      // Outrider Recon Scout Pulse across fog of war
      this.campaign.scoutedUntilDay = this.campaign.day + 4;
      this.pulseWaves.push({ x: this.campaign.px, y: this.campaign.py, radius: 1, maxRadius: 20 });
      this.playCue('scout');
      this.pushLog('Outriders ride wide: hostile banners & road strength revealed for 4 Days!');
      return;
    }
    if (act === 'rest') {
      // Forage & Camp 1 day
      const tile = this.grid[this.campaign.py][this.campaign.px];
      const baseForage = TERRAIN_META[tile]?.forage ?? 2;
      const winterPenalty = SEASONS[this.campaign.seasonIndex].id === 'winter' ? 0.5 : 1.0;
      const gain = Math.round((10 + baseForage * 5) * winterPenalty);
      this.campaign.grain = Math.min(450, this.campaign.grain + gain);
      for (const r of this.playerRegiments) {
        r.men = Math.min(r.maxMen, r.men + 4);
        r.morale = Math.min(100, r.morale + 5);
      }
      this.advanceCampaignDay(true);
      this.playCue('muster');
      this.pushLog(`Camp & Forage (+${gain} Grain, +4 wounded restored, Day ${this.campaign.day}).`);
      return;
    }
    if (act === 'interact') {
      const holdHere = this.holdAt(this.campaign.px, this.campaign.py);
      if (holdHere) {
        this.activeDialogue = openHoldMenu(this, holdHere);
        this.choiceCursor = 0;
        this.screen = 'dialogue';
        return;
      }
      const adjEnemy = this.armies.find(
        (a) => a.men > 0 && Math.abs(a.x - this.campaign.px) + Math.abs(a.y - this.campaign.py) <= 1
      );
      if (adjEnemy) {
        this.startFieldBattle(adjEnemy);
        return;
      }
      if (this.grid[this.campaign.py][this.campaign.px] === 'v') {
        const levyCost = 35;
        if (this.getHouse('thorne').treasury >= levyCost) {
          this.getHouse('thorne').treasury -= levyCost;
          this.addPlayerMen('spear', 14);
          this.campaign.grain += 22;
          this.playCue('muster');
          this.pushLog('Croft peasants take spear & bring +22 Grain (-35g silver).');
        } else {
          this.campaign.grain += 16;
          this.pushLog('Villagers share +16 Grain from root cellars.');
        }
        return;
      }
      this.pushLog('Stand on any Keep [#] or Village [v] for [E], or open Council [C] / Raven [T].');
      return;
    }

    const dirs = { move_n: [0, -1], move_s: [0, 1], move_w: [-1, 0], move_e: [1, 0] };
    const delta = dirs[act];
    if (!delta) return;
    if (this.campaign.moveCooldown > 0) return;

    const nx = this.campaign.px + delta[0];
    const ny = this.campaign.py + delta[1];
    if (nx < 0 || nx >= REALM_W || ny < 0 || ny >= REALM_H) return;
    const tile = this.grid[ny][nx];
    const seasonId = SEASONS[this.campaign.seasonIndex].id;
    let passable = TERRAIN_META[tile]?.passable ?? false;
    if (tile === ':' && seasonId === 'autumn') passable = false;
    if (!passable) {
      this.pushLog(tile === '~' ? 'Deep river blocks passage -- cross at [=] Bridges!' : 'High crags bar the way.');
      return;
    }

    this.campaign.px = nx;
    this.campaign.py = ny;
    if (delta[0] !== 0) this.campaign.facing = delta[0] > 0 ? 1 : -1;
    this.campaign.gallopTimer = 0.65;
    this.campaign.marchScroll = (this.campaign.marchScroll || 0) + 1;
    this.campaign.moveCooldown = 0.085;
    this.playCue('step');

    // Check enemy banner clash
    const enemyHere = this.armies.find((a) => {
      if (a.men <= 0 || a.x !== nx || a.y !== ny) return false;
      const h = this.getHouse(a.houseId);
      return h.treaty === 'war' || h.relation <= -40;
    });
    if (enemyHere) {
      this.startFieldBattle(enemyHere);
      return;
    }

    this.advanceCampaignDay(false);
    const hHere = this.holdAt(nx, ny);
    if (hHere && hHere.id === 'highcrown') this._triggerStory('highcrown_gates');
  }

  _handleBattleInput(act) {
    if (act === 'ledger') {
      this.deployToNextTarget();
      return;
    }
    if (act === 'rest') {
      const b = this.battle;
      if (!b) return;
      for (const r of this.playerRegiments) {
        r.men = Math.min(r.maxMen, r.men + (r.type === 'ram' ? 1 : 6));
        r.morale = Math.min(100, r.morale + 10);
        const sq = b.playerSquads.find((s) => s.type === r.type);
        if (sq) {
          sq.men = r.men;
          sq.hp = r.men * UNIT_TYPES[r.type].hpPerMan;
          sq.morale = r.morale;
          sq.routed = false;
        }
      }
      this.campaign.grain = Math.min(450, this.campaign.grain + 30);
      this.playCue('muster');
      this.pushLog('Reserves & wounded mended across all squads (+30 Grain).');
      return;
    }
    if (act === 'help') {
      this.screen = 'help';
      return;
    }
    if (act === 'cancel' || act === 'quit') {
      if (this.battle?.outcome === 'victory') {
        this.deployToNextTarget();
      } else {
        this._resolveBattleDefeat(true);
      }
      return;
    }
    if (act === 'pause_battle') {
      this.battle.paused = !this.battle.paused;
      this.pushLog(this.battle.paused ? 'TACTICAL PAUSE -- Issue orders freely, press [L] to resume.' : 'BATTLE LIVE!');
      return;
    }
    if (act.startsWith('choice_')) {
      const slot = Number(act.split('_')[1]);
      const found = this.battle.playerSquads.find((s) => s.slot === slot && s.men > 0);
      if (found) {
        this.battle.selectedSlot = slot;
        this.pushLog(`Commanding [${slot}] ${found.label} (${found.men} men, ${found.morale}% morale).`);
      }
      return;
    }
    if (['parry', 'fork', 'volley', 'strike', 'dodge', 'interact', 'confirm'].includes(act)) {
      if (act === 'confirm') {
        if (this.battle.outcome === 'victory') {
          this.deployToNextTarget();
        } else {
          this._tickBattle();
        }
        return;
      }
      this._executePlayerTactic(act);
      return;
    }

    const dirs = { move_n: [0, -1], move_s: [0, 1], move_w: [-1, 0], move_e: [1, 0] };
    const delta = dirs[act];
    if (!delta) return;
    const sq = this._selectedPlayerSquad();
    if (!sq) return;
    const nx = sq.x + delta[0];
    const ny = sq.y + delta[1];
    if (nx < 0 || nx >= BATTLE_W || ny < 0 || ny >= BATTLE_H) return;
    const tile = this.battle.map.grid[ny][nx];
    if (tile === '#' || tile === 'H' || tile === '~') {
      if (tile === 'H') this.pushLog('Iron Gatehouse [HH] blocks entry -- bring Ram [5] + [E]!');
      else if (tile === '#') this.pushLog('Stone wall! Use breach ladder [L] or Gatehouse [HH].');
      return;
    }
    const enemy = this.battle.enemySquads.find((e) => e.men > 0 && e.x === nx && e.y === ny);
    if (enemy) {
      this._executePlayerTactic('strike');
      return;
    }
    if (!this._isBattleTileOccupied(nx, ny, sq)) {
      if (delta[0] !== 0) sq.facing = delta[0] > 0 ? 1 : -1;
      sq.x = nx;
      sq.y = ny;
      sq.order = null;
      this.playCue('step');
    }
  }

  _realmToSmallMap(rx, ry) {
    const mx = Math.min(99, Math.max(0, Math.floor((rx * 100) / REALM_W)));
    const my = Math.min(8, Math.max(0, Math.floor((ry * 9) / REALM_H)));
    return [2 + mx, 27 + my];
  }

  /**
   * Handle mouse click on 104x38 canvas cells: Top HUD squads, 102x23 Battleground, or Bottom Small Map.
   */
  handleCanvasClick(row, col) {
    if (this.activeStory) {
      this.activeStory = null;
      return;
    }
    if (this.screen === 'help' || this.screen === 'steed' || this.screen === 'ledger') {
      this.screen = 'battle';
      return;
    }
    if (this.screen !== 'battle' || !this.battle) return;

    // 1) Row 0 squad badge bar click -> switch active squad [1..5]
    if (row === 0 && this._topSquadHitboxes) {
      const hit = this._topSquadHitboxes.find((b) => col >= b.x0 && col <= b.x1);
      if (hit) {
        this.handleAction(`choice_${hit.slot}`);
        return;
      }
    }

    // 2) Rows 2..24, Cols 1..102 -> Full 102x23 Battleground click
    if (row >= 2 && row <= 24 && col >= 1 && col <= BATTLE_W) {
      const bx = col - 1;
      const by = row - 2;
      const clickedFriendly = this.battle.playerSquads.find(
        (s) => s.men > 0 && Math.abs(s.x - bx) <= 4 && Math.abs(s.y - by) <= 2
      );
      if (clickedFriendly) {
        this.battle.selectedSlot = clickedFriendly.slot;
        this.pushLog(`Selected [${clickedFriendly.slot}] ${clickedFriendly.label}. Click battlefield to march!`);
        return;
      }
      const sq = this._selectedPlayerSquad();
      if (sq) {
        sq.order = { tx: bx, ty: by };
        this.pushLog(`[${sq.slot}] ${sq.label} marching to (${bx},${by}).`);
      }
      return;
    }

    // 3) Rows 27..35, Cols 2..101 -> Bottom Small Realm Map click (jump straight to Keep / Army!)
    if (row >= 27 && row <= 35 && col >= 2 && col <= 101) {
      let bestHold = null;
      let bestScore = 999;
      for (const h of this.holds) {
        const [hx, hy] = this._realmToSmallMap(h.x, h.y);
        const dy = Math.abs(row - hy);
        const dx = Math.max(0, hx - col, col - (hx + 3));
        if (dy <= 1 && col >= hx - 1 && col <= hx + 4) {
          const sc = dy * 6 + dx;
          if (sc < bestScore) {
            bestScore = sc;
            bestHold = h;
          }
        }
      }
      if (bestHold) {
        this.deployToHold(bestHold);
        return;
      }

      const hitArmy = this.armies.find((a) => {
        if (a.men <= 0) return false;
        const [ax, ay] = this._realmToSmallMap(a.x, a.y);
        return Math.abs(row - ay) <= 1 && Math.abs(col - ax) <= 2;
      });
      if (hitArmy) {
        this.startFieldBattle(hitArmy);
        return;
      }

      const rx = Math.min(REALM_W - 1, Math.floor(((col - 2) * REALM_W) / 100));
      const ry = Math.min(REALM_H - 1, Math.floor(((row - 27) * REALM_H) / 9));
      this.startFieldBattle({
        id: `skirmish_${rx}_${ry}`,
        houseId: 'dray',
        lordName: 'Dray Outriders',
        x: rx,
        y: ry,
        men: 105,
        regiments: makeDefaultRegiments('SKR', 0.62, false),
      });
    }
  }

  update(dt) {
    this.clock += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.campaign.moveCooldown > 0) this.campaign.moveCooldown = Math.max(0, this.campaign.moveCooldown - dt);
    if (this.campaign.gallopTimer > 0) {
      this.campaign.gallopTimer = Math.max(0, this.campaign.gallopTimer - dt);
      this.campaign.marchScroll = (this.campaign.marchScroll || 0) + dt * 4.5;
    }
    if (this.battle) {
      for (const s of [...this.battle.playerSquads, ...this.battle.enemySquads]) {
        if (s.poseTimer > 0) s.poseTimer = Math.max(0, s.poseTimer - dt);
      }
    }

    // Update pulsing waves (scouts & war-horn)
    for (const w of this.pulseWaves) {
      w.radius += dt * 16;
    }
    this.pulseWaves = this.pulseWaves.filter((w) => w.radius < w.maxRadius);

    // Update arrow projectiles & battle dust
    for (const p of this.projectiles) p.t += dt;
    this.projectiles = this.projectiles.filter((p) => p.t < p.dur);

    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    // Real-time battle cadence (every 0.72s when not paused)
    if (this.screen === 'battle' && this.battle && !this.battle.paused && !this.battle.outcome) {
      this.battle.tickTimer += dt;
      if (this.battle.tickTimer >= 0.72) {
        this.battle.tickTimer = 0;
        this._tickBattle();
      }
    }
  }

  // ==================== 104x38 STRICT PRINTABLE ASCII RENDERING ====================

  _blankBuffer() {
    return Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => [' ', GRADE_GHOST, TONE_PARCHMENT])
    );
  }

  _putStr(buf, x, y, text, grade = GRADE_LIT, tone = TONE_PARCHMENT) {
    if (y < 0 || y >= GRID_ROWS) return;
    for (let i = 0; i < text.length; i++) {
      const c = x + i;
      if (c >= 0 && c < GRID_COLS) buf[y][c] = [sanitizeGlyph(text[i]), grade, tone];
    }
  }

  _drawFrame(buf, x, y, w, h, title = '', borderGrade = GRADE_DIM, titleGrade = GRADE_BRIGHT, borderTone = TONE_STONE, titleTone = TONE_AMBER) {
    for (let cx = x + 1; cx < x + w - 1; cx++) {
      buf[y][cx] = ['-', borderGrade, borderTone];
      buf[y + h - 1][cx] = ['-', borderGrade, borderTone];
    }
    for (let ry = y + 1; ry < y + h - 1; ry++) {
      buf[ry][x] = ['|', borderGrade, borderTone];
      buf[ry][x + w - 1] = ['|', borderGrade, borderTone];
    }
    buf[y][x] = ['+', borderGrade, borderTone];
    buf[y][x + w - 1] = ['+', borderGrade, borderTone];
    buf[y + h - 1][x] = ['+', borderGrade, borderTone];
    buf[y + h - 1][x + w - 1] = ['+', borderGrade, borderTone];
    if (title) {
      const t = `[ ${title} ]`;
      const tx = x + Math.max(2, Math.floor((w - t.length) / 2));
      this._putStr(buf, tx, y, t, titleGrade, titleTone);
    }
  }

  renderBuffer() {
    const buf = this._blankBuffer();
    if (this.screen === 'title') this._renderTitle(buf);
    else if (this.screen === 'steed') this._renderSteed(buf);
    else if (this.screen === 'ledger') this._renderLedger(buf);
    else if (this.screen === 'help') this._renderHelp(buf);
    else if (this.screen === 'victory' || this.screen === 'dead') this._renderOutcome(buf);
    else if (this.screen === 'battle') this._renderBattle(buf);
    else this._renderCampaign(buf);

    // Subtle battle-impact CRT shake jitter on frame cols/rows
    if (this.shake > 0 && this.screen === 'battle') {
      const sx = Math.round(Math.sin(this.clock * 55) * (this.shake > 0.2 ? 1 : 0));
      if (sx !== 0) {
        for (let r = VIEW_TOP; r < VIEW_TOP + VIEW_ROWS; r++) {
          if (sx > 0) buf[r] = [[' ', GRADE_GHOST, TONE_PARCHMENT], ...buf[r].slice(0, GRID_COLS - 1)];
          else buf[r] = [...buf[r].slice(1), [' ', GRADE_GHOST, TONE_PARCHMENT]];
        }
      }
    }
    return buf;
  }

  _renderSteed(buf) {
    this._drawFrame(buf, 1, 1, GRID_COLS - 2, VIEW_ROWS, 'WARHORSE & ROYAL DESTRIER GALLERY', GRADE_DIM, GRADE_BRIGHT, TONE_STONE, TONE_AMBER);
    renderSteedShowcase(buf, this.clock, { x0: 2, y0: 2, x1: GRID_COLS - 3, y1: VIEW_TOP + VIEW_ROWS - 2 }, this.getSeason());
    this._putStr(
      buf,
      4,
      31,
      fitLine('THORNE HEAVY DESTRIER -- 3D HALFTONE RELIEF  |  Press [4] + [J/C] in Battle to Charge!', 96),
      GRADE_LIT,
      TONE_PARCHMENT
    );
    this._renderBottomHud(buf);
    this._putStr(buf, 1, HINT_ROW, fitLine('[Enter / Esc / Z / Click] Return to Command', GRID_COLS - 2), GRADE_BRIGHT, TONE_AMBER);
  }

  _renderTitle(buf) {
    const heroBounds = { x0: 2, y0: 2, x1: 65, y1: 31 };

    // Left Animated Warhorse & Knight Backdrop (x=1, y=1, w=66, h=32 -> inner 64x30)
    this._drawFrame(buf, 1, 1, 66, 32, 'HIGHCROWN WAR -- WINTER 298', GRADE_DIM, GRADE_LIT, TONE_STONE, TONE_SNOW);
    stampCellGrid(buf, 2, 2, getBakedTitleHero(this.clock), heroBounds, 0);

    // Minimal Title Start Card (x=68, y=1, w=35, h=32 -> cols 68..102)
    for (let r = 2; r <= 31; r++) this._putStr(buf, 69, r, ' '.repeat(33), GRADE_GHOST, TONE_STONE);
    this._drawFrame(buf, 68, 1, 35, 32, 'IRONCROWN', GRADE_LIT, GRADE_BRIGHT, TONE_CRIMSON, TONE_AMBER);
    const masthead = [
      ' ___ ____   ___  _   _ ',
      '|_ _|  _ \\ / _ \\| \\ | |',
      ' | || |_) | | | |  \\| |',
      ' | ||  _ <| |_| | |\\  |',
      '|___|_| \\_\\\\___/|_| \\_|',
      '       C R O W N       ',
    ];
    masthead.forEach((ln, idx) =>
      this._putStr(buf, 74, 5 + idx, ln, GRADE_BRIGHT, idx === 5 ? TONE_AMBER : TONE_STEEL)
    );
    this._putStr(buf, 73, 13, 'THE REALM IN WINTER', GRADE_LIT, TONE_CRIMSON);
    this._putStr(buf, 70, 16, '------------------------------', GRADE_GHOST, TONE_STONE);

    const resume = this.hasExistingSave;
    this._putStr(buf, 71, 20, resume ? '[Enter] Continue War' : '[Enter] Enter Battleground', GRADE_BRIGHT, TONE_AMBER);
    if (resume) this._putStr(buf, 71, 22, '[N] New War', GRADE_LIT, TONE_PARCHMENT);
    this._putStr(buf, 71, 25, '[O] Color / CRT Mono', GRADE_LIT, TONE_STEEL);
    this._putStr(buf, 71, 27, '[H] Controls', GRADE_DIM, TONE_PARCHMENT);

    this._putStr(
      buf,
      1,
      HINT_ROW,
      fitLine('[Enter / Click] Start Battleground   |   [H] Controls   |   [O] Color / Mono   |   [P] Tint', GRID_COLS - 2),
      GRADE_DIM,
      TONE_STONE
    );
  }

  _renderCampaign(buf) {
    if (!this.battle) this._enterFirstBattleground();
    this._renderBattle(buf);
  }

  _renderDialogueChamber(buf) {
    const dlg = this.activeDialogue;
    if (!dlg) return;
    const { crest, houseId, tone } = pickPortraitForDialogue(dlg);
    const house = this.getHouse(houseId);
    const box = { x: 4, y: 2, w: 96, h: 19 };
    const bounds = { x0: box.x + 1, y0: box.y + 1, x1: box.x + box.w - 2, y1: box.y + box.h - 2 };
    for (let r = box.y + 1; r < box.y + box.h - 1; r++) {
      this._putStr(buf, box.x + 1, r, ' '.repeat(box.w - 2), GRADE_GHOST, TONE_STONE);
    }
    this._drawFrame(buf, box.x, box.y, box.w, box.h, `PARLEY CHAMBER -- ${dlg.speaker}`, GRADE_LIT, GRADE_BRIGHT, TONE_STONE, TONE_AMBER);

    // Left 28x14 3D Halftone Chiaroscuro Noble Portrait inside chamber
    this._drawFrame(buf, box.x + 2, box.y + 1, 30, 16, house.name.toUpperCase(), GRADE_DIM, GRADE_LIT, TONE_STONE, tone);
    const spLow = (dlg.speaker || '').toLowerCase();
    const pKey =
      houseId === 'thorne' && (dlg.id === 'council_root' || spLow.includes('halden') || spLow.includes('spymaster'))
        ? 'council'
        : houseId;
    stampCellGrid(buf, box.x + 3, box.y + 2, getBakedPortrait(pKey), bounds, 0);

    // Flickering Chamber Torches & House Sigil Crest on right
    const flame = Math.floor(this.clock * 7) % 2 === 0 ? '(*)' : '(^)';
    this._putStr(buf, box.x + 35, box.y + 2, flame, GRADE_BRIGHT, TONE_FIRE);
    this._putStr(buf, box.x + 90, box.y + 2, flame, GRADE_BRIGHT, TONE_FIRE);
    stampSprite(buf, box.x + 79, box.y + 3, crest, {
      baseGrade: GRADE_LIT,
      highlightChars: new Set(['O', '*']),
      tone,
      highlightTone: TONE_AMBER,
      bounds,
    });

    this._putStr(buf, box.x + 40, box.y + 2, fitLine(dlg.speaker, 36), GRADE_BRIGHT, tone);
    this._putStr(buf, box.x + 35, box.y + 4, fitLine(`${house.lord} | ${house.treaty.toUpperCase()} | Rel ${house.relation}`, 42), GRADE_DIM, TONE_PARCHMENT);
    if (!house.isPlayer) {
      const risk = Math.max(0, Math.min(100, house.betrayalRisk || 0));
      const filled = Math.round(risk / 10);
      const bar = `[${'#'.repeat(filled)}${'.'.repeat(10 - filled)}] ${risk}%`;
      this._putStr(buf, box.x + 35, box.y + 6, fitLine(`Betrayal Risk: ${bar}`, 42), risk >= 50 ? GRADE_BRIGHT : GRADE_LIT, risk >= 50 ? TONE_CRIMSON : TONE_AMBER);
    } else {
      this._putStr(buf, box.x + 35, box.y + 6, fitLine(`Honor: ${house.honor}  |  Dread: ${house.dread}  |  Silver: ${house.treasury}g`, 42), GRADE_LIT, TONE_AMBER);
    }

    const lineText = dlg.lineFn ? dlg.lineFn(this) : '';
    wrapLines(lineText, 54).slice(0, 5).forEach((ln, i) => {
      this._putStr(buf, box.x + 35, box.y + 9 + i, ln, GRADE_LIT, TONE_PARCHMENT);
    });
    this._putStr(buf, box.x + 35, box.y + 16, fitLine('Pick [1..5] below or [W/S + Enter]  |  [Esc] Close', 56), GRADE_DIM, TONE_STONE);
  }

  _renderBattle(buf) {
    const b = this.battle;
    const ourMen = this.totalMen(b.playerSquads);
    const foeMen = this.totalMen(b.enemySquads);
    const foeHouseId = b.sourceArmy?.houseId || 'dray';
    const foeTone = houseToneId(foeHouseId);
    const sel = this._selectedPlayerSquad();

    // Row 0: Compact 1-line Header + Clickable Squad Selector Bar
    const gateTxt = b.map.kind === 'siege' ? ` | G:${b.gateBreached ? 'OPEN' : b.gateHp}` : '';
    const shortTitle = b.title.replace(/^SIEGE OF /, '').replace(/^FIELD: vs /, 'vs ');
    const leftHud = b.outcome === 'victory'
      ? `VICTORY! ${shortTitle} | THN ${ourMen}`
      : `${shortTitle}${gateTxt} | US:${ourMen} FOE:${foeMen}`;
    this._putStr(buf, 1, 0, fitLine(leftHud, 48).trimEnd(), GRADE_BRIGHT, b.outcome === 'victory' ? TONE_FOREST : TONE_AMBER);

    this._topSquadHitboxes = [];
    let sxCur = 50;
    for (const sq of b.playerSquads) {
      const isSel = sel && sel.slot === sq.slot;
      const chip = isSel ? `*[${sq.slot}]${sq.code}${sq.men}` : `[${sq.slot}]${sq.code}${sq.men}`;
      const endX = sxCur + chip.length - 1;
      if (endX <= GRID_COLS - 7) {
        const g = sq.men <= 0 ? GRADE_GHOST : isSel ? GRADE_BRIGHT : GRADE_LIT;
        const tn = sq.men <= 0 ? TONE_STONE : isSel ? TONE_AMBER : sq.routed ? TONE_CRIMSON : TONE_PARCHMENT;
        this._putStr(buf, sxCur, 0, chip, g, tn);
        this._topSquadHitboxes.push({ slot: sq.slot, x0: sxCur, x1: endX });
        sxCur = endX + 2;
      }
    }
    this._putStr(buf, GRID_COLS - 6, 0, `K:${this.heldCount()}/9`, GRADE_LIT, TONE_AMBER);

    // 1. Rows 1..25 (Full 104-col frame -> inner 102x23): THE BATTLE GROUND ONLY
    const frameTitle =
      b.outcome === 'victory'
        ? 'HOLD SECURED -- CLICK ANY [K/*] ON SMALL MAP BELOW OR PRESS [Enter]/[M]'
        : b.paused
          ? 'BATTLEGROUND PAUSED -- [L] RESUME'
          : b.map.kind === 'siege'
            ? 'SIEGE BATTLEGROUND -- [5]+[E] RAM GATE | [L] CLIMB LADDER | [J/C] CHARGE'
            : 'OPEN BATTLEGROUND -- [1-5] SQUAD | [J/C] CHARGE | [B] BOW VOLLEY | [F] SHIELD WALL';
    this._drawFrame(buf, 0, 1, GRID_COLS, 25, frameTitle, GRADE_DIM, b.outcome === 'victory' ? GRADE_BRIGHT : GRADE_LIT, TONE_STONE, b.outcome === 'victory' ? TONE_FOREST : TONE_AMBER);
    renderBattleScenery(buf, b, this.clock, this.pulseWaves, 1, 2);

    const bounds = { x0: 1, y0: 2, x1: BATTLE_W, y1: 1 + BATTLE_H };
    const foeRemap = { [TONE_CRIMSON]: foeTone, [TONE_HORSE]: TONE_WARHORSE };

    // 2. Living Multi-Color Animated Units sorted back-to-front by Y
    const allUnits = [
      ...b.playerSquads.filter((s) => s.men > 0).map((s) => ({ sq: s, isPlayer: true })),
      ...b.enemySquads.filter((s) => s.men > 0).map((s) => ({ sq: s, isPlayer: false })),
    ].sort((a, c) => a.sq.y - c.sq.y);

    for (const { sq, isPlayer } of allUnits) {
      const pose = sq.poseTimer > 0 ? sq.pose : 'idle';
      const spr = getBakedBattleSprite(sq, this.clock, pose);
      const sx = 1 + sq.x - spr.halfW;
      const sy = 2 + sq.y - spr.halfH;
      const isSelected = isPlayer && sel && sel.slot === sq.slot;
      const gradeBoost = isSelected ? 1 : isPlayer ? 0 : sq.routed ? -2 : -1;
      stampCellGrid(buf, sx, sy, spr.grid, bounds, gradeBoost, isPlayer ? null : foeRemap);

      const badge = isPlayer
        ? isSelected
          ? `*[${sq.slot}]${sq.code}:${sq.men}*`
          : `[${sq.slot}]${sq.code}:${sq.men}`
        : `(${sq.code})${sq.men}`;
      const bx = Math.max(1, Math.min(BATTLE_W + 1 - badge.length, 1 + sq.x - Math.floor(badge.length / 2)));
      const by = Math.min(24, Math.max(2, sy + spr.grid.length));
      this._putStr(buf, bx, by, badge, isSelected ? GRADE_BRIGHT : isPlayer ? GRADE_LIT : GRADE_DIM, isSelected ? TONE_AMBER : isPlayer ? TONE_PARCHMENT : foeTone);
    }

    // 3. Parabolic Arrows & Sparks
    for (const p of this.projectiles) {
      const u = Math.min(1, p.t / p.dur);
      const ax = Math.round(p.x + (p.tx - p.x) * u);
      const ay = Math.round(p.y + (p.ty - p.y) * u - Math.sin(u * Math.PI) * 1.8);
      if (ax >= 0 && ax < BATTLE_W && ay >= 0 && ay < BATTLE_H) {
        const tailX = ax + (p.tx >= p.x ? -1 : 1);
        if (tailX >= 0 && tailX < BATTLE_W) buf[2 + ay][1 + tailX] = ['=', GRADE_LIT, TONE_FIRE];
        buf[2 + ay][1 + ax] = [p.tx >= p.x ? '>' : '<', GRADE_BRIGHT, TONE_STEEL];
      }
    }
    for (const pt of this.particles) {
      const px = Math.round(pt.x);
      const py = Math.round(pt.y);
      if (px >= 0 && px < BATTLE_W && py >= 0 && py < BATTLE_H) {
        buf[2 + py][1 + px] = [pt.ch, GRADE_BRIGHT, pt.ch === '*' ? TONE_FIRE : TONE_CRIMSON];
      }
    }

    // Embed concise live combat log cleanly along row 25 border
    const lastLog = this.log[this.log.length - 1] || '';
    if (lastLog) {
      const tag = `[ ${fitLine(lastLog, 90).trimEnd()} ]`;
      this._putStr(buf, Math.max(2, Math.floor((GRID_COLS - tag.length) / 2)), 25, tag, GRADE_LIT, TONE_PARCHMENT);
    }

    // 4. Rows 26..36 (100x9 centered): THE SMALL REALM MAP AT THE BOTTOM
    this._renderSmallRealmMap(buf);

    // 5. Row 37: Clean 1-line Battle Controls Hint
    const hint = b.outcome === 'victory'
      ? '[Enter / M / Click Map] Deploy to Next Keep  |  [R] Mend Wounded  |  [H] Controls  |  [O] Color'
      : '[1-5] Squad  [WASD] Move  [J/C] Charge  [B] Bow  [F] Shield  [E] Ram/Duel  [M] Next Keep  [O] Color';
    this._putStr(buf, 1, HINT_ROW, fitLine(hint, GRID_COLS - 2).trimEnd(), GRADE_DIM, TONE_STONE);
  }

  _renderSmallRealmMap(buf) {
    const title = `SMALL REALM MAP (${this.heldCount()}/9 KEEPS) -- [@] HERE  [*] YOURS  [K] ENEMY  CLICK TO FIGHT`;
    this._drawFrame(buf, 0, 26, GRID_COLS, 11, title, GRADE_DIM, GRADE_LIT, TONE_STONE, TONE_AMBER);

    const mapW = 100;
    const mapH = 9;
    const season = SEASONS[this.campaign.seasonIndex];
    for (let r = 0; r < mapH; r++) {
      const ry = Math.min(REALM_H - 1, Math.floor((r * REALM_H) / mapH));
      for (let c = 0; c < mapW; c++) {
        const rx = Math.min(REALM_W - 1, Math.floor((c * REALM_W) / mapW));
        let ch = this.grid[ry][rx];
        let g = GRADE_GHOST;
        let tn = TONE_FOREST;
        if (ch === '~') {
          ch = ((c + r + Math.floor(this.clock * 2)) % 4 === 0) ? '-' : '~';
          g = GRADE_MIST;
          tn = TONE_RIVER;
        } else if (ch === ':') {
          g = season.id === 'winter' ? GRADE_LIT : GRADE_MIST;
          tn = season.id === 'winter' ? TONE_SNOW : TONE_RIVER;
        } else if (ch === '=') {
          g = GRADE_DIM;
          tn = TONE_PARCHMENT;
        } else if (ch === '^') {
          g = GRADE_DIM;
          tn = TONE_SNOW;
        } else if (ch === 'T') {
          g = GRADE_DIM;
          tn = TONE_FOREST;
        } else if (ch === '#') {
          ch = '+';
          g = GRADE_DIM;
          tn = TONE_STONE;
        } else {
          ch = ((c * 7 + r * 13) % 6 === 0) ? '.' : ' ';
          g = GRADE_GHOST;
          tn = season.id === 'winter' ? TONE_SNOW : TONE_FOREST;
        }
        buf[27 + r][2 + c] = [ch, g, tn];
      }
    }

    // Rival field armies ('X'), kept clear of Keep symbol+3-char tag spans
    const holdCoords = this.holds.map((h) => this._realmToSmallMap(h.x, h.y));
    for (const a of this.armies) {
      if (a.men <= 0) continue;
      const [ax, ay] = this._realmToSmallMap(a.x, a.y);
      const nearKeep = holdCoords.some(([hx, hy]) => hy === ay && ax >= hx && ax <= hx + 4);
      if (!nearKeep) buf[ay][ax] = ['X', GRADE_BRIGHT, houseToneId(a.houseId)];
    }

    // All 9 Keeps (* / K + 3-letter tag)
    for (let i = 0; i < this.holds.length; i++) {
      const h = this.holds[i];
      const [hx, hy] = holdCoords[i];
      const isOwned = h.owner === 'thorne';
      const isCurrent = this.battle?.sourceHold?.id === h.id || (this.campaign.px === h.x && this.campaign.py === h.y);
      const sym = isOwned ? '*' : 'K';
      const hTone = isOwned ? TONE_AMBER : houseToneId(h.owner);
      buf[hy][hx] = [sym, GRADE_BRIGHT, hTone];
      const tag = HOLD_SHORT_TAGS[h.id] || h.name.slice(0, 3).toUpperCase();
      this._putStr(buf, Math.min(102 - tag.length, hx + 1), hy, tag, isCurrent ? GRADE_BRIGHT : GRADE_LIT, isCurrent ? TONE_AMBER : hTone);
    }

    // Active Battleground '@' marker (blinks gently over Keep glyph when occupying a Hold)
    const [pxm, pym] = this._realmToSmallMap(this.campaign.px, this.campaign.py);
    if (!this.holdAt(this.campaign.px, this.campaign.py) || Math.floor(this.clock * 2.5) % 2 === 0) {
      buf[pym][pxm] = ['@', GRADE_BRIGHT, TONE_AMBER];
    }

    const obj = computeWarObjective(this);
    const botObj = `[ NOW: ${fitLine(obj.now, 72).trimEnd()} | DAY ${this.campaign.day} ${season.label} ]`;
    this._putStr(buf, Math.max(2, Math.floor((GRID_COLS - botObj.length) / 2)), 36, botObj, GRADE_DIM, TONE_PARCHMENT);
  }

  _renderBottomHud(buf) {
    if (this.screen === 'dialogue' && this.activeDialogue) {
      const dlg = this.activeDialogue;
      this._putStr(buf, 1, LOG_TOP, fitLine(`${dlg.speaker}: ${dlg.lineFn(this)}`, GRID_COLS - 2), GRADE_BRIGHT, TONE_AMBER);
      const choices = dlg.choices || [];
      for (let i = 0; i < 2; i++) {
        const idxA = i * 2;
        const idxB = i * 2 + 1;
        const fmt = (idx) => {
          const c = choices[idx];
          if (!c) return '';
          const mark = idx === this.choiceCursor ? '>' : ' ';
          return `${mark}[${idx + 1}] ${c.label(this)}`;
        };
        const rowTxt = choices[idxB] ? `${fmt(idxA).slice(0, 48).padEnd(50)} ${fmt(idxB).slice(0, 50)}` : fmt(idxA);
        this._putStr(buf, 1, LOG_TOP + 1 + i, fitLine(rowTxt, GRID_COLS - 2), GRADE_LIT, TONE_PARCHMENT);
      }
      // Show choice 5-6 hint cleanly if present
      const extraHint =
        choices.length > 4
          ? `[1-${choices.length}] Pick Choice (5: ${choices[4].label(this).slice(0, 26)})  [W/S] Move  [Enter] Act  [Esc] Close`
          : '[1-4] Pick Choice  [W/S] Cycle  [Enter] Confirm  [Esc] Step Back';
      this._putStr(buf, 1, HINT_ROW, fitLine(extraHint, GRID_COLS - 2), GRADE_DIM, TONE_STONE);
      return;
    }

    const obj = computeWarObjective(this);
    const guide = fitLine(`NOW [${obj.chapter}] ${obj.now} | NEXT: ${obj.next}`, GRID_COLS - 2);
    this._putStr(buf, 1, LOG_TOP, guide, GRADE_BRIGHT, TONE_AMBER);

    const recent = this.log.slice(-(LOG_ROWS - 1));
    for (let i = 0; i < LOG_ROWS - 1; i++) {
      if (recent[i]) {
        const ln = recent[i];
        const lower = ln.toLowerCase();
        const logTone =
          lower.includes('breach') || lower.includes('smash') || lower.includes('blood') || lower.includes('cut off') || lower.includes('betray')
            ? TONE_CRIMSON
            : lower.includes('capture') || lower.includes('forage') || lower.includes('victory') || lower.includes('allied')
              ? TONE_FOREST
              : TONE_PARCHMENT;
        this._putStr(buf, 1, LOG_TOP + 1 + i, fitLine(ln, GRID_COLS - 2), i === recent.length - 1 ? GRADE_LIT : GRADE_DIM, logTone);
      }
    }

    const hint =
      this.activeStory
        ? '[Enter / Esc / WASD / Click] Dismiss Chronicle & Continue  |  [Tab] War Ledger'
        : this.screen === 'battle'
          ? '[1-5] Squad  [WASD] Move  [J/C] Charge  [B] Volley  [F] Shield  [E] Ram/Duel  [Space] Horn  [O] Color'
          : '[WASD] March  [E] Hold/Siege  [C] Council/Spies  [T] Raven  [R] Forage  [Space] Scout  [Z] Steed  [O] Color';
    this._putStr(buf, 1, HINT_ROW, fitLine(hint, GRID_COLS - 2), GRADE_DIM, TONE_STONE);
  }

  _renderStoryDispatch(buf, cursorRow) {
    const story = this.activeStory;
    if (!story) return;
    const w = 102;
    const h = 10;
    const left = 1;
    const top = cursorRow <= 19 ? 21 : 2;
    for (let r = top; r < top + h; r++) this._putStr(buf, left, r, ' '.repeat(w), GRADE_GHOST, TONE_STONE);
    this._drawFrame(buf, left, top, w, h, `WAR CHRONICLE: ${story.title}`, GRADE_DIM, GRADE_BRIGHT, TONE_CRIMSON, TONE_AMBER);
    story.lines.slice(0, 3).forEach((ln, idx) => this._putStr(buf, left + 3, top + 1 + idx, fitLine(ln, w - 6), GRADE_LIT, TONE_PARCHMENT));
    this._putStr(buf, left + 3, top + 5, fitLine(`NOW : ${story.now}`, w - 6), GRADE_BRIGHT, TONE_AMBER);
    this._putStr(buf, left + 3, top + 6, fitLine(`NEXT: ${story.next}`, w - 6), GRADE_DIM, TONE_STEEL);
    this._putStr(buf, left + 3, top + 8, fitLine('[WASD / Enter / Space / Click] Dismiss & Command  |  [Tab] Full Ledger', w - 6), GRADE_BRIGHT, TONE_PARCHMENT);
  }

  _renderLedger(buf) {
    this._drawFrame(buf, 1, 1, GRID_COLS - 2, GRID_ROWS - 3, 'REALM WAR LEDGER, HOUSES & OBJECTIVES', GRADE_DIM, GRADE_BRIGHT, TONE_STONE, TONE_AMBER);
    const mapW = 58;
    const mapH = 22;
    for (let r = 0; r < mapH; r++) {
      for (let c = 0; c < mapW; c++) {
        const wx = Math.min(REALM_W - 1, Math.floor((c * REALM_W) / mapW));
        const wy = Math.min(REALM_H - 1, Math.floor((r * REALM_H) / mapH));
        const ch = this.grid[wy][wx];
        const m = ch === '~' ? '~' : ch === '^' ? '^' : ch === '=' ? '=' : ch === '#' ? '+' : ' ';
        const t = ch === '~' ? TONE_RIVER : ch === '=' ? TONE_PARCHMENT : TONE_STONE;
        buf[4 + r][3 + c] = [m, m === '=' ? GRADE_DIM : GRADE_MIST, t];
      }
    }
    const obj = computeWarObjective(this);
    if (obj.target) {
      const tx = Math.min(mapW - 1, Math.floor((obj.target[0] * mapW) / REALM_W));
      const ty = Math.min(mapH - 1, Math.floor((obj.target[1] * mapH) / REALM_H));
      buf[4 + ty][3 + tx] = ['?', GRADE_BRIGHT, TONE_FIRE];
    }
    for (const h of this.holds) {
      const hx = Math.min(mapW - 1, Math.floor((h.x * mapW) / REALM_W));
      const hy = Math.min(mapH - 1, Math.floor((h.y * mapH) / REALM_H));
      buf[4 + hy][3 + hx] = [h.owner === 'thorne' ? '*' : 'K', GRADE_BRIGHT, h.owner === 'thorne' ? TONE_AMBER : houseToneId(h.owner)];
    }
    const pxm = Math.min(mapW - 1, Math.floor((this.campaign.px * mapW) / REALM_W));
    const pym = Math.min(mapH - 1, Math.floor((this.campaign.py * mapH) / REALM_H));
    buf[4 + pym][3 + pxm] = ['@', GRADE_BRIGHT, TONE_AMBER];

    this._putStr(buf, 4, 27, 'Map Key: [@] You   [*] Thorne Keep   [K] Rival Hold   [?] Current Target', GRADE_DIM, TONE_STONE);

    const col = 63;
    this._putStr(buf, col, 3, '[ REALM HOLDS & CONTROL ]', GRADE_LIT, TONE_AMBER);
    this.holds.forEach((h, i) => {
      const ownerTag = this.getHouse(h.owner).tag;
      this._putStr(
        buf,
        col,
        5 + i,
        fitLine(`${h.name.slice(0, 17).padEnd(17)} [${ownerTag}] G:${String(h.garrison).padStart(3)}`, 38),
        h.owner === 'thorne' ? GRADE_BRIGHT : GRADE_LIT,
        h.owner === 'thorne' ? TONE_AMBER : houseToneId(h.owner)
      );
    });

    this._putStr(buf, col, 15, '[ HOUSE RELATIONS & TREACHERY ]', GRADE_LIT, TONE_AMBER);
    this.houses.filter((h) => !h.isPlayer).forEach((h, i) => {
      this._putStr(
        buf,
        col,
        17 + i,
        fitLine(`${h.name.padEnd(13)} ${h.treaty.toUpperCase().padEnd(6)} Rel:${String(h.relation).padStart(4)} Risk:${h.betrayalRisk}%`, 38),
        h.treaty === 'war' ? GRADE_BRIGHT : GRADE_LIT,
        h.treaty === 'war' ? TONE_CRIMSON : houseToneId(h.id)
      );
    });

    this._putStr(buf, col, 23, `[ GOAL: ${obj.chapter} ]`, GRADE_BRIGHT, TONE_AMBER);
    wrapLines(`NOW : ${obj.now}`, 38).slice(0, 3).forEach((ln, i) => this._putStr(buf, col, 24 + i, ln, GRADE_LIT, TONE_PARCHMENT));
    wrapLines(`NEXT: ${obj.next}`, 38).slice(0, 3).forEach((ln, i) => this._putStr(buf, col, 28 + i, ln, GRADE_DIM, TONE_STEEL));

    this._putStr(buf, 1, HINT_ROW, fitLine('[Tab / Esc / Enter / Click] Return to Command', GRID_COLS - 2), GRADE_DIM, TONE_STONE);
  }

  _renderHelp(buf) {
    this._drawFrame(buf, 3, 1, GRID_COLS - 6, GRID_ROWS - 3, 'IRONCROWN -- BATTLEGROUND & SMALL MAP CONTROLS', GRADE_DIM, GRADE_BRIGHT, TONE_STONE, TONE_AMBER);
    const lines = [
      '1. LIVE BATTLEGROUND COMMAND (TOP ARENA)',
      '   - Select squads [1..5] or click them: [1] Guard, [2] Shieldwall, [3] Bows, [4] Lancers, [5] Ram.',
      '   - Move with [WASD] / Arrows or click any battlefield cell to march.',
      '2. COMBAT & SIEGE ACTIONS',
      '   - [J] / [C] Cavalry Charge or Melee Strike   |   [B] Longbow Volley',
      '   - [F] Toggle Shield Wall (blocks arrows/horse) |   [Space] War-Horn Rally (+Morale)',
      '   - [E] Smash Iron Gatehouse [HH] with Ram [5], Climb Wall Ladder [L], or Duel Enemy Lord',
      '3. SMALL REALM MAP (BOTTOM STRIP)',
      '   - Click any Keep [*] / [K] or Enemy Banner [X] on the bottom map to fight there immediately!',
      '   - Press [M] or [Tab] (or [Enter] after winning) to deploy to the next unconquered Keep.',
      '   - Press [R] to mend wounded squads (+grain)   |   Press [O] to toggle Full Color vs P3 Amber.',
    ];
    lines.forEach((ln, i) => this._putStr(buf, 6, 4 + i * 2, fitLine(ln, 92), i % 3 === 0 ? GRADE_BRIGHT : GRADE_LIT, i % 3 === 0 ? TONE_AMBER : TONE_PARCHMENT));
    this._putStr(buf, 1, HINT_ROW, fitLine('[Enter / Esc / H / Click] Return to Battleground', GRID_COLS - 2), GRADE_DIM, TONE_STONE);
  }

  _renderOutcome(buf) {
    const won = this.screen === 'victory';
    const title = won ? 'THE IRON CROWN RECLAIMED -- VICTORY' : 'THE HOUSE OF THORNE FALLS -- DEFEAT';
    this._drawFrame(buf, 6, 2, GRID_COLS - 12, 30, title, GRADE_DIM, GRADE_BRIGHT, won ? TONE_AMBER : TONE_CRIMSON, won ? TONE_AMBER : TONE_CRIMSON);
    if (won) {
      const vicHorse = getBakedCampaignHorse(this.clock, true, true);
      stampCellGrid(buf, 29, 6, vicHorse, { x0: 7, y0: 3, x1: GRID_COLS - 8, y1: 21 }, 0);
      this._putStr(buf, 22, 22, 'HIGHCROWN FLIES THE WOLF AND AMBER PIKE OF HOUSE THORNE!', GRADE_BRIGHT, TONE_AMBER);
    } else {
      const lostArt = [
        '                       . . .  +  . . .                         ',
        '                          /   |   \\                            ',
        '                     BANNERS BROKEN IN SNOW                    ',
        '  Your columns starved or broke before Highcrown walls fell.   ',
      ];
      lostArt.forEach((ln, i) => this._putStr(buf, 20, 9 + i, ln, GRADE_LIT, TONE_CRIMSON));
    }
    const th = this.getHouse('thorne');
    const summary = `Days: ${this.campaign.day}  |  Battles Won: ${this.stats.battlesWon}  |  Sieges Won: ${this.stats.siegesWon}  |  Holds: ${this.heldCount()}  |  Honor ${th.honor}  Dread ${th.dread}`;
    this._putStr(buf, 16, 25, fitLine(summary, 72), GRADE_LIT, TONE_PARCHMENT);
    this._putStr(buf, 26, 28, '[Enter / N] Begin New War   |   [Esc] Return to Title', GRADE_BRIGHT, TONE_AMBER);
    this._putStr(buf, 1, HINT_ROW, fitLine('[Enter] New War  |  [Esc] Title Screen', GRID_COLS - 2), GRADE_DIM, TONE_STONE);
  }
}
