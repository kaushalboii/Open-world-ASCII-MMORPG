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
    this.playerRegiments = makeDefaultRegiments('THN', 1.0, false);

    this.campaign = {
      px: 28,
      py: 16,
      day: 1,
      seasonIndex: 0,
      grain: 230,
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
    this.log = [
      'Blackpike Keep holds against winter sleet. Archon Dray holds Highcrown in the south.',
      'Press [E] at Blackpike to muster, [C] for Small Council Spies, or march East to Old Ford.',
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
      this.screen = 'campaign';
      this.activeStory = null;
      this.activeDialogue = null;
      this.battle = null;
      this._recomputeSupply();
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
    this.pushLog(`${hold.name.toUpperCase()} CAPTURED from ${prevOwner.name}! (+110g loot, +55 Grain)`);
    this._recomputeSupply();

    if (hold.id === 'highcrown') {
      this.screen = 'victory';
      return;
    }
    if (hold.id === 'kingsbridge') {
      this._triggerStory('highcrown_gates');
    }
    this.saveGame();
  }

  // ==================== BATTLE SYSTEM ====================

  _inferBattleTerrain(x, y) {
    const ch = this.grid[y]?.[x] || '.';
    if (ch === '=' && (y === 18 || y === 19 || y === 30 || y === 31)) return 'bridge';
    if (ch === 'T') return 'forest';
    if (ch === ',') return 'mud';
    return 'plains';
  }

  startFieldBattle(army) {
    const kind = this._inferBattleTerrain(this.campaign.px, this.campaign.py);
    const map = buildBattleMap({ kind });
    this._launchBattle({
      title: `FIELD CLASH: vs ${army.lordName}`,
      map,
      sourceArmy: army,
      sourceHold: null,
      gateHp: 0,
      gateBreached: true,
    });
  }

  startSiegeBattle(hold) {
    const preBribed = Boolean(this.flags[`bribed_${hold.id}`]);
    const map = buildBattleMap({ kind: 'siege', hold, gateBreached: preBribed });
    const enemyHouse = this.getHouse(hold.owner);
    const scale = Math.max(0.6, hold.garrison / 115);
    const defenders = [
      { id: 'def_guard', type: 'guard', men: Math.round(28 * scale), maxMen: Math.round(28 * scale), morale: 90 },
      { id: 'def_spear', type: 'spear', men: Math.round(52 * scale), maxMen: Math.round(52 * scale), morale: 85 },
      { id: 'def_bow', type: 'bow', men: Math.round(48 * scale), maxMen: Math.round(48 * scale), morale: 84 },
    ];
    this._triggerStory('first_siege');
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
      { x: 16, y: 6 },
      { x: 20, y: 12 },
      { x: 10, y: 18 },
      { x: 17, y: 24 },
      { x: 24, y: 14 },
    ];
    const playerSquads = this.playerRegiments
      .filter((r) => r.men > 0)
      .map((r, i) => ({
        slot: i + 1,
        type: r.type,
        label: UNIT_TYPES[r.type].name,
        code: UNIT_TYPES[r.type].code,
        x: startSlots[i]?.x ?? 10,
        y: startSlots[i]?.y ?? 6 + i * 5,
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
          { x: 57, y: 15 },
          { x: 38, y: 14 },
          { x: 54, y: 10 },
          { x: 39, y: 22 },
        ]
      : [
          { x: 52, y: 12 },
          { x: 46, y: 17 },
          { x: 55, y: 24 },
          { x: 50, y: 6 },
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
      if (bd > 15) {
        this.pushLog(`Longbows out of range (${bd} tiles > 15). Move [3] Bows closer!`);
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
            for (let gy = 13; gy <= 15; gy++) {
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
        // 2) Ladder Wall Breach Notch [L] at rows 6 or 23 -> step cleanly across wall!
        if (Math.abs(sq.x - (b.map.wallX - 1)) <= 1 && (Math.abs(sq.y - 6) <= 1 || Math.abs(sq.y - 23) <= 1)) {
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
    // Sync surviving player regiment counts cleanly back to campaign
    for (const r of this.playerRegiments) {
      const sq = b.playerSquads.find((s) => s.type === r.type);
      if (sq) {
        r.men = Math.max(0, sq.men);
        r.morale = Math.max(45, sq.morale);
      }
    }

    const th = this.getHouse('thorne');
    th.treasury += 85;
    this.campaign.grain += 30;
    this.playCue('victory');

    if (b.sourceHold) {
      const wonHold = b.sourceHold;
      this.battle = null;
      this.captureHold(wonHold);
      return;
    }

    // Field army defeated -> remove enemy field column & chance to judge captured Commander!
    const defeatedArmy = b.sourceArmy;
    defeatedArmy.men = 0;
    this.stats.lordsCaptured += 1;
    this.battle = null;
    this.pushLog(`FIELD VICTORY over ${defeatedArmy.lordName}! (+85g spoils, +30 Grain)`);
    this.activeDialogue = openPrisonerMenu(this, defeatedArmy);
    this.choiceCursor = 0;
    this.screen = 'dialogue';
    this.saveGame();
  }

  _resolveBattleDefeat(retreated = false) {
    const b = this.battle;
    if (!b) return;
    for (const r of this.playerRegiments) {
      const sq = b.playerSquads.find((s) => s.type === r.type);
      if (sq) {
        r.men = retreated ? Math.max(8, Math.round(sq.men * 0.72)) : Math.max(0, sq.men);
        r.morale = 52;
      }
    }
    this.battle = null;
    // Fall back toward Blackpike Keep cleanly
    this.campaign.px = 28;
    this.campaign.py = 16;
    this.screen = 'campaign';
    if (retreated) {
      this.getHouse('thorne').honor = Math.max(0, this.getHouse('thorne').honor - 5);
      this.playCue('rout');
      this.pushLog('Controlled retreat sounded! Surviving regiments regroup at Blackpike (-5 Honor).');
    } else if (this.totalMen(this.playerRegiments) <= 0) {
      this.screen = 'dead';
      this.playCue('defeat');
    } else {
      this.playCue('rout');
      this.pushLog('Battle lost! Broken banners straggle back to Blackpike Keep.');
    }
    this.saveGame();
  }

  // ==================== INPUT & UPDATE LOOP ====================

  handleAction(act) {
    if (!act) return;

    if (this.screen === 'title') {
      if (act === 'confirm') {
        if (this.hasExistingSave && this.loadGame()) {
          this.pushLog('Campaign resumed from Blackpike war ledger.');
        } else {
          this._initFreshState();
          this.screen = 'campaign';
          this._triggerStory('prologue');
        }
      } else if (act === 'new_game') {
        this._initFreshState();
        this.screen = 'campaign';
        this._triggerStory('prologue');
      } else if (act === 'help') {
        this.screen = 'help';
      } else if (act === 'steed') {
        this._prevScreen = 'title';
        this.screen = 'steed';
      }
      return;
    }

    if (this.screen === 'steed') {
      if (act === 'confirm' || act === 'cancel' || act === 'steed' || act === 'help') {
        this.screen = this._prevScreen || (this.battle ? 'battle' : 'campaign');
      }
      return;
    }

    if (this.screen === 'help' || this.screen === 'ledger') {
      if (act === 'confirm' || act === 'cancel' || act === 'ledger' || act === 'help') {
        this.screen = this.battle ? 'battle' : 'campaign';
      }
      return;
    }

    if (this.screen === 'victory' || this.screen === 'dead') {
      if (act === 'confirm' || act === 'new_game') {
        this._initFreshState();
        this.screen = 'campaign';
        this._triggerStory('prologue');
      } else if (act === 'cancel') {
        this.screen = 'title';
      }
      return;
    }

    if (this.screen === 'dialogue') {
      this._handleDialogueInput(act);
      return;
    }

    // Dismiss active Story Dispatch card cleanly on confirm/cancel without eating actions
    if ((this.screen === 'campaign' || this.screen === 'battle') && this.activeStory) {
      this.activeStory = null;
      if (act === 'confirm' || act === 'cancel') return;
    }

    if (this.screen === 'battle') {
      this._handleBattleInput(act);
      return;
    }

    if (this.screen === 'campaign') {
      this._handleCampaignInput(act);
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
    if (act === 'cancel' || act === 'quit') {
      this._resolveBattleDefeat(true);
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
        this._tickBattle();
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

  /**
   * Handle mouse click on 104x38 canvas cells inside Campaign / Battle for natural tactical play.
   */
  handleCanvasClick(row, col) {
    if (this.screen === 'steed') {
      this.screen = this._prevScreen || 'campaign';
      return;
    }
    if ((this.screen === 'campaign' || this.screen === 'battle') && this.activeStory) {
      this.activeStory = null;
      return;
    }
    if (this.screen === 'campaign' && row >= 2 && row <= 16 && col >= 1 && col <= 66) {
      const camX = Math.max(0, Math.min(REALM_W - 66, this.campaign.px - 33));
      const camY = Math.max(0, Math.min(REALM_H - 15, this.campaign.py - 7));
      const wx = camX + (col - 1);
      const wy = camY + (row - 2);
      const dx = wx - this.campaign.px;
      const dy = wy - this.campaign.py;
      if (dx === 0 && dy === 0) {
        this.handleAction('interact');
        return;
      }
      const stepAct = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'move_e' : 'move_w') : dy > 0 ? 'move_s' : 'move_n';
      this.handleAction(stepAct);
      return;
    }
    if (this.screen === 'campaign' && row >= 19 && row <= 31 && col >= 1 && col <= 66) {
      if (col < 23) this.handleAction('move_w');
      else if (col > 46) this.handleAction('move_e');
      else this.handleAction('steed');
      return;
    }
    if (this.screen === 'battle' && this.battle && row >= 2 && row <= 31 && col >= 1 && col <= 66) {
      const bx = col - 1;
      const by = row - 2;
      const clickedFriendly = this.battle.playerSquads.find((s) => s.men > 0 && Math.abs(s.x - bx) <= 4 && Math.abs(s.y - by) <= 2);
      if (clickedFriendly) {
        this.battle.selectedSlot = clickedFriendly.slot;
        this.pushLog(`Selected [${clickedFriendly.slot}] ${clickedFriendly.label}. Click tile to march!`);
        return;
      }
      const sq = this._selectedPlayerSquad();
      if (sq) {
        sq.order = { tx: bx, ty: by };
        this.pushLog(`[${sq.slot}] ${sq.label} ordered to (${bx},${by}).`);
      }
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
      Array.from({ length: GRID_COLS }, () => [' ', GRADE_GHOST])
    );
  }

  _putStr(buf, x, y, text, grade = GRADE_LIT) {
    if (y < 0 || y >= GRID_ROWS) return;
    for (let i = 0; i < text.length; i++) {
      const c = x + i;
      if (c >= 0 && c < GRID_COLS) buf[y][c] = [sanitizeGlyph(text[i]), grade];
    }
  }

  _drawFrame(buf, x, y, w, h, title = '', borderGrade = GRADE_DIM, titleGrade = GRADE_BRIGHT) {
    for (let cx = x + 1; cx < x + w - 1; cx++) {
      buf[y][cx] = ['-', borderGrade];
      buf[y + h - 1][cx] = ['-', borderGrade];
    }
    for (let ry = y + 1; ry < y + h - 1; ry++) {
      buf[ry][x] = ['|', borderGrade];
      buf[ry][x + w - 1] = ['|', borderGrade];
    }
    buf[y][x] = ['+', borderGrade];
    buf[y][x + w - 1] = ['+', borderGrade];
    buf[y + h - 1][x] = ['+', borderGrade];
    buf[y + h - 1][x + w - 1] = ['+', borderGrade];
    if (title) {
      const t = `[ ${title} ]`;
      const tx = x + Math.max(2, Math.floor((w - t.length) / 2));
      this._putStr(buf, tx, y, t, titleGrade);
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
          if (sx > 0) buf[r] = [[' ', GRADE_GHOST], ...buf[r].slice(0, GRID_COLS - 1)];
          else buf[r] = [...buf[r].slice(1), [' ', GRADE_GHOST]];
        }
      }
    }
    return buf;
  }

  _renderSteed(buf) {
    this._drawFrame(buf, 1, 1, GRID_COLS - 2, VIEW_ROWS, 'WARHORSE & ROYAL DESTRIER GALLERY', GRADE_DIM, GRADE_BRIGHT);
    renderSteedShowcase(buf, this.clock, { x0: 2, y0: 2, x1: GRID_COLS - 3, y1: VIEW_TOP + VIEW_ROWS - 2 }, this.getSeason());
    this._putStr(
      buf,
      4,
      31,
      fitLine('THORNE HEAVY DESTRIER -- 3D HALFTONE RELIEF  |  Press [4] + [J/C] in Battle to Charge!', 96),
      GRADE_LIT
    );
    this._renderBottomHud(buf);
    this._putStr(buf, 1, HINT_ROW, fitLine('[Enter / Esc / Z / Click] Return to Command', GRID_COLS - 2), GRADE_BRIGHT);
  }

  _renderTitle(buf) {
    const heroBounds = { x0: 2, y0: 2, x1: 65, y1: 31 };

    // Left Heroic 3D Halftone Panorama Frame (x=1, y=1, w=66, h=32 -> inner 64x30)
    this._drawFrame(buf, 1, 1, 66, 32, 'HIGHCROWN MARCH -- WINTER 298', GRADE_DIM, GRADE_LIT);
    stampCellGrid(buf, 2, 2, getBakedTitleHero(this.clock), heroBounds, 0);
    this._putStr(
      buf,
      4,
      31,
      fitLine('War is won by full granaries, loyal spears & steel cavalry.', 60),
      GRADE_DIM
    );

    // Right Command & Title Crest Plaque (x=68, y=1, w=35, h=32 -> cols 68..102)
    for (let r = 2; r <= 31; r++) this._putStr(buf, 69, r, ' '.repeat(33), GRADE_GHOST);
    this._drawFrame(buf, 68, 1, 35, 32, 'IRONCROWN', GRADE_LIT, GRADE_BRIGHT);
    const masthead = [
      ' ___ ____   ___  _   _ ',
      '|_ _|  _ \\ / _ \\| \\ | |',
      ' | || |_) | | | |  \\| |',
      ' | ||  _ <| |_| | |\\  |',
      '|___|_| \\_\\\\___/|_| \\_|',
      '       C R O W N       ',
    ];
    masthead.forEach((ln, idx) => this._putStr(buf, 74, 3 + idx, ln, idx < 2 ? GRADE_BRIGHT : GRADE_LIT));
    this._putStr(buf, 71, 10, 'THE REALM IN WINTER -- GOT WAR', GRADE_BRIGHT);
    this._putStr(buf, 70, 12, '------------------------------', GRADE_GHOST);
    this._putStr(buf, 70, 13, 'Real Feudal War & Sieges:', GRADE_LIT);
    this._putStr(buf, 70, 14, '* Supply Lines & Starvation', GRADE_DIM);
    this._putStr(buf, 70, 15, '* House Oaths & Betrayals', GRADE_DIM);
    this._putStr(buf, 70, 16, '* Animated Horses, Bows & Rams', GRADE_DIM);
    this._putStr(buf, 70, 17, '* Frozen River Winter Strikes', GRADE_DIM);
    this._putStr(buf, 70, 19, '------------------------------', GRADE_GHOST);

    const resume = this.hasExistingSave;
    this._putStr(buf, 70, 21, resume ? '[Enter] Resume Saved War' : '[Enter] Muster & Ride Out', GRADE_BRIGHT);
    if (resume) this._putStr(buf, 70, 23, '[N] Tear Old Charter (New)', GRADE_LIT);
    this._putStr(buf, 70, 25, '[Z] Inspect War Destrier', GRADE_LIT);
    this._putStr(buf, 70, 27, '[H] War Manual & Controls', GRADE_DIM);
    this._putStr(buf, 70, 29, '[P] Phosphor  |  [V] CRT Glow', GRADE_MIST);

    this._putStr(
      buf,
      1,
      LOG_TOP,
      fitLine('Archon Malcor Dray murdered your brother under truce banner and seized Highcrown Citadel.', GRID_COLS - 2),
      GRADE_LIT
    );
    this._putStr(
      buf,
      1,
      LOG_TOP + 1,
      fitLine('Command animated cavalry, pikemen, longbows & siege rams across Marren Valley to claim the crown.', GRID_COLS - 2),
      GRADE_DIM
    );
    this._putStr(
      buf,
      1,
      HINT_ROW,
      fitLine('[Enter] Begin Campaign | [Z] Full-Screen Destrier | [H] Manual | [P] Phosphor | [V] CRT Glow', GRID_COLS - 2),
      GRADE_MIST
    );
  }

  _renderCampaign(buf) {
    const th = this.getHouse('thorne');
    const season = SEASONS[this.campaign.seasonIndex];
    const supTag = this.campaign.supplied ? 'SUPPLY OK' : 'CUT OFF!!';
    const header =
      `DAY ${this.campaign.day} ${season.label} | ${th.treasury}g | GRAIN ${this.campaign.grain} [${supTag}] | MEN ${this.totalMen(
        this.playerRegiments
      )} | HOLDS ${this.heldCount()}/${this.holds.length} | HON ${th.honor} DRD ${th.dread}`;
    this._putStr(buf, 1, 0, fitLine(header, GRID_COLS - 2), this.campaign.supplied ? GRADE_BRIGHT : GRADE_LIT);

    // 1. Upper-Left Realm Campaign Map (x=0, y=1, w=68, h=17 -> inner 66x15)
    this._drawFrame(buf, 0, VIEW_TOP, 68, 17, 'REALM CAMPAIGN MAP', GRADE_DIM, GRADE_LIT);
    const camX = Math.max(0, Math.min(REALM_W - 66, this.campaign.px - 33));
    const camY = Math.max(0, Math.min(REALM_H - 15, this.campaign.py - 7));
    const scouted = this.campaign.day <= this.campaign.scoutedUntilDay;

    for (let r = 0; r < 15; r++) {
      const wy = camY + r;
      for (let c = 0; c < 66; c++) {
        const wx = camX + c;
        let ch = this.grid[wy]?.[wx] ?? ' ';
        let g = GRADE_DIM;
        if (ch === '~') {
          ch = ((wx + wy + Math.floor(this.clock * 2.5)) % 4 === 0) ? '-' : '~';
          g = GRADE_GHOST;
        } else if (ch === '.') {
          g = GRADE_GHOST;
        } else if (ch === '^') {
          g = GRADE_MIST;
        } else if (ch === '=') {
          g = GRADE_DIM;
        } else if (ch === 'T' || ch === 'v') {
          g = GRADE_LIT;
        } else if (ch === ':') {
          g = season.id === 'winter' ? GRADE_BRIGHT : GRADE_GHOST;
        } else if (ch === '#') {
          g = GRADE_LIT;
        }

        for (const pw of this.pulseWaves) {
          const dist = Math.hypot(wx - pw.x, wy - pw.y);
          if (Math.abs(dist - pw.radius) < 1.2) {
            ch = 'o';
            g = GRADE_BRIGHT;
          }
        }
        buf[VIEW_TOP + 1 + r][1 + c] = [ch, g];
      }
    }

    for (const h of this.holds) {
      const sx = h.x - camX + 1;
      const sy = h.y - camY + VIEW_TOP + 1;
      if (sx >= 1 && sx <= 66 && sy >= VIEW_TOP + 1 && sy <= VIEW_TOP + 15) {
        const owner = this.getHouse(h.owner);
        const sym = h.owner === 'thorne' ? '*' : owner.treaty === 'war' ? '!' : '+';
        buf[sy][sx] = [sym, h.owner === 'thorne' ? GRADE_BRIGHT : GRADE_LIT];
        if (sx + 4 <= 66) {
          this._putStr(buf, sx + 1, sy, h.name.slice(0, 6).toUpperCase(), h.owner === 'thorne' ? GRADE_BRIGHT : GRADE_DIM);
        }
      }
    }

    for (const a of this.armies) {
      if (a.men <= 0) continue;
      const sx = a.x - camX + 1;
      const sy = a.y - camY + VIEW_TOP + 1;
      if (sx >= 1 && sx <= 66 && sy >= VIEW_TOP + 1 && sy <= VIEW_TOP + 15) {
        const d = Math.abs(a.x - this.campaign.px) + Math.abs(a.y - this.campaign.py);
        const visible = scouted || d <= 14;
        const h = this.getHouse(a.houseId);
        const glyph = visible ? (h.treaty === 'war' ? 'X' : h.tag[0]) : '?';
        buf[sy][sx] = [glyph, visible && h.treaty === 'war' ? GRADE_BRIGHT : GRADE_LIT];
      }
    }

    const psx = this.campaign.px - camX + 1;
    const psy = this.campaign.py - camY + VIEW_TOP + 1;
    buf[psy][psx] = ['@', GRADE_BRIGHT];

    // 2. Lower-Left Live March Vista (x=0, y=18, w=68, h=15 -> inner 66x13 fits full 46x13 Halftone Warhorse!)
    const curHold = this.holdAt(this.campaign.px, this.campaign.py);
    const tileHere = this.grid[this.campaign.py][this.campaign.px];
    const hereLabel = curHold ? `${curHold.name} [${this.getHouse(curHold.owner).tag}]` : TERRAIN_META[tileHere]?.name || 'Wilds';
    const ridingTag = (this.campaign.gallopTimer || 0) > 0 ? 'GALLOPING' : 'HALTED';
    this._drawFrame(buf, 0, 18, 68, 15, `KING'S ROAD: ${hereLabel.slice(0, 22).toUpperCase()} (${ridingTag})`, GRADE_DIM, GRADE_BRIGHT);
    renderCampaignMarchVista(buf, this, { x0: 1, y0: 19, width: 66, height: 13 });

    // 3. Right War Command Sidebar (x=68, y=1, w=36, h=32 -> inner width 32)
    this._drawFrame(buf, 68, VIEW_TOP, 36, VIEW_ROWS, 'WAR COLUMN & HOUSES', GRADE_DIM, GRADE_LIT);
    this._putStr(buf, 70, 2, fitLine(`LOC: ${hereLabel}`, 32), GRADE_BRIGHT);
    this._putStr(buf, 70, 4, '[ THORNE REGIMENTS ]', GRADE_LIT);
    this.playerRegiments.forEach((r, idx) => {
      const tpl = UNIT_TYPES[r.type];
      const line = `[${tpl.code}] ${tpl.name.slice(0, 15).padEnd(15)} ${String(r.men).padStart(3)} ${r.morale}%`;
      this._putStr(buf, 70, 5 + idx, line, r.men > 0 ? GRADE_DIM : GRADE_GHOST);
    });

    this._putStr(buf, 70, 11, '[ GREAT HOUSES & OATHS ]', GRADE_LIT);
    this.houses.filter((h) => !h.isPlayer).forEach((h, idx) => {
      const risk = h.betrayalRisk > 0 && h.treaty !== 'war' ? ` R${h.betrayalRisk}%` : '';
      const ln = `${h.tag} ${h.treaty.toUpperCase().padEnd(5)} ${String(h.relation).padStart(4)}${risk}`;
      const g = h.treaty === 'war' ? GRADE_BRIGHT : h.betrayalRisk >= 52 ? GRADE_LIT : GRADE_DIM;
      this._putStr(buf, 70, 12 + idx, fitLine(ln, 32), g);
    });

    this._putStr(buf, 70, 17, '[ NEAREST FOE BANNERS ]', GRADE_LIT);
    const hostiles = this.armies
      .filter((a) => a.men > 0)
      .sort((a, b) => Math.abs(a.x - this.campaign.px) + Math.abs(a.y - this.campaign.py) - (Math.abs(b.x - this.campaign.px) + Math.abs(b.y - this.campaign.py)))
      .slice(0, 3);
    hostiles.forEach((a, idx) => {
      const br = bearingLabel(this.campaign.px, this.campaign.py, a.x, a.y);
      const menStr = scouted || Math.abs(a.x - this.campaign.px) + Math.abs(a.y - this.campaign.py) <= 14 ? `${a.men}m` : '?m';
      this._putStr(buf, 70, 18 + idx, fitLine(`${a.lordName.slice(0, 16)} ${menStr} ${br}`, 32), GRADE_DIM);
    });

    this._putStr(buf, 70, 22, '[ COMMAND ACTIONS ]', GRADE_LIT);
    const cmds = [
      '[E] Keep / Siege / Village',
      '[C] Small Council & Spies',
      '[T] Dispatch Raven Pact',
      '[R] Camp & Forage 1 Day',
      '[Space] Outrider Scout',
      '[Z] Full-Screen Destrier',
      '[Tab] Map & Full Ledger',
      '[H] Field Manual / Help',
    ];
    cmds.forEach((c, idx) => this._putStr(buf, 70, 23 + idx, fitLine(c, 32), GRADE_MIST));

    if (this.screen === 'dialogue' && this.activeDialogue) {
      this._renderDialogueChamber(buf);
    }

    if (this.activeStory) {
      this._renderStoryDispatch(buf, psy);
    }

    this._renderBottomHud(buf);
  }

  _renderDialogueChamber(buf) {
    const dlg = this.activeDialogue;
    if (!dlg) return;
    const { crest, houseId } = pickPortraitForDialogue(dlg);
    const house = this.getHouse(houseId);
    const box = { x: 4, y: 2, w: 96, h: 19 };
    const bounds = { x0: box.x + 1, y0: box.y + 1, x1: box.x + box.w - 2, y1: box.y + box.h - 2 };
    for (let r = box.y + 1; r < box.y + box.h - 1; r++) {
      this._putStr(buf, box.x + 1, r, ' '.repeat(box.w - 2), GRADE_GHOST);
    }
    this._drawFrame(buf, box.x, box.y, box.w, box.h, `PARLEY CHAMBER -- ${dlg.speaker}`, GRADE_LIT, GRADE_BRIGHT);

    // Left 28x14 3D Halftone Chiaroscuro Noble Portrait inside chamber
    this._drawFrame(buf, box.x + 2, box.y + 1, 30, 16, house.name.toUpperCase(), GRADE_DIM, GRADE_LIT);
    const spLow = (dlg.speaker || '').toLowerCase();
    const pKey =
      houseId === 'thorne' && (dlg.id === 'council_root' || spLow.includes('halden') || spLow.includes('spymaster'))
        ? 'council'
        : houseId;
    stampCellGrid(buf, box.x + 3, box.y + 2, getBakedPortrait(pKey), bounds, 0);

    // Flickering Chamber Torches & House Sigil Crest on right
    const flame = Math.floor(this.clock * 7) % 2 === 0 ? '(*)' : '(^)';
    this._putStr(buf, box.x + 35, box.y + 2, flame, GRADE_BRIGHT);
    this._putStr(buf, box.x + 90, box.y + 2, flame, GRADE_BRIGHT);
    stampSprite(buf, box.x + 79, box.y + 3, crest, {
      baseGrade: GRADE_DIM,
      highlightChars: new Set(['O', '*']),
      bounds,
    });

    this._putStr(buf, box.x + 40, box.y + 2, fitLine(dlg.speaker, 36), GRADE_BRIGHT);
    this._putStr(buf, box.x + 35, box.y + 4, fitLine(`${house.lord} | ${house.treaty.toUpperCase()} | Rel ${house.relation}`, 42), GRADE_DIM);
    if (!house.isPlayer) {
      const risk = Math.max(0, Math.min(100, house.betrayalRisk || 0));
      const filled = Math.round(risk / 10);
      const bar = `[${'#'.repeat(filled)}${'.'.repeat(10 - filled)}] ${risk}%`;
      this._putStr(buf, box.x + 35, box.y + 6, fitLine(`Betrayal Risk: ${bar}`, 42), risk >= 50 ? GRADE_BRIGHT : GRADE_LIT);
    } else {
      this._putStr(buf, box.x + 35, box.y + 6, fitLine(`Honor: ${house.honor}  |  Dread: ${house.dread}  |  Silver: ${house.treasury}g`, 42), GRADE_LIT);
    }

    const lineText = dlg.lineFn ? dlg.lineFn(this) : '';
    wrapLines(lineText, 54).slice(0, 5).forEach((ln, i) => {
      this._putStr(buf, box.x + 35, box.y + 9 + i, ln, GRADE_LIT);
    });
    this._putStr(buf, box.x + 35, box.y + 16, fitLine('Pick [1..5] below or [W/S + Enter]  |  [Esc] Close', 56), GRADE_MIST);
  }

  _renderBattle(buf) {
    const b = this.battle;
    const ourMen = this.totalMen(b.playerSquads);
    const foeMen = this.totalMen(b.enemySquads);
    const gateTxt = b.map.kind === 'siege' ? ` | GATE ${b.gateBreached ? 'OPEN' : `${b.gateHp}/${b.maxGateHp}`}` : '';
    const hdr = `${b.title}${gateTxt} | THORNE ${ourMen} | FOE ${foeMen} | ${b.paused ? 'PAUSED' : 'LIVE'}`;
    this._putStr(buf, 1, 0, fitLine(hdr, GRID_COLS - 2), GRADE_BRIGHT);

    // 1. Render Shaded Battlefield, Pines, Stone Curtain Wall & Keep Towers
    this._drawFrame(buf, 0, VIEW_TOP, 68, VIEW_ROWS, b.map.kind === 'siege' ? 'SIEGE FIELD (LIVE ANIMATED UNITS)' : 'BATTLEFIELD (LIVE ANIMATED UNITS)', GRADE_DIM, GRADE_LIT);
    renderBattleScenery(buf, b, this.clock, this.pulseWaves, 1, VIEW_TOP + 1);

    const bounds = { x0: 1, y0: VIEW_TOP + 1, x1: 66, y1: VIEW_TOP + 30 };

    // 2. Render Living Multi-Line Regiments sorted back-to-front by Y
    const sel = this._selectedPlayerSquad();
    const allUnits = [
      ...b.playerSquads.filter((s) => s.men > 0).map((s) => ({ sq: s, isPlayer: true })),
      ...b.enemySquads.filter((s) => s.men > 0).map((s) => ({ sq: s, isPlayer: false })),
    ].sort((a, c) => a.sq.y - c.sq.y);

    for (const { sq, isPlayer } of allUnits) {
      const pose = sq.poseTimer > 0 ? sq.pose : 'idle';
      const spr = getBakedBattleSprite(sq, this.clock, pose);
      const sx = 1 + sq.x - spr.halfW;
      const sy = VIEW_TOP + 1 + sq.y - spr.halfH;
      const isSelected = isPlayer && sel && sel.slot === sq.slot;
      const gradeBoost = isSelected ? 1 : isPlayer ? 0 : sq.routed ? -2 : -1;
      stampCellGrid(buf, sx, sy, spr.grid, bounds, gradeBoost);

      // Compact unit strength badge cleanly anchored near bottom of sprite
      const badge = isPlayer
        ? isSelected
          ? `*[${sq.slot}]${sq.code}:${sq.men}*`
          : `[${sq.slot}]${sq.code}:${sq.men}`
        : `(${sq.code})${sq.men}`;
      const bx = Math.max(1, Math.min(67 - badge.length, 1 + sq.x - Math.floor(badge.length / 2)));
      const by = Math.min(VIEW_TOP + 30, Math.max(VIEW_TOP + 1, sy + spr.grid.length));
      this._putStr(buf, bx, by, badge, isSelected ? GRADE_BRIGHT : isPlayer ? GRADE_LIT : GRADE_DIM);
    }

    // 3. Parabolic Arrows & Sparks on top
    for (const p of this.projectiles) {
      const u = Math.min(1, p.t / p.dur);
      const ax = Math.round(p.x + (p.tx - p.x) * u);
      const ay = Math.round(p.y + (p.ty - p.y) * u - Math.sin(u * Math.PI) * 1.8);
      if (ax >= 0 && ax < BATTLE_W && ay >= 0 && ay < BATTLE_H) {
        const tailX = ax + (p.tx >= p.x ? -1 : 1);
        if (tailX >= 0 && tailX < BATTLE_W) buf[VIEW_TOP + 1 + ay][1 + tailX] = ['=', GRADE_LIT];
        buf[VIEW_TOP + 1 + ay][1 + ax] = [p.tx >= p.x ? '>' : '<', GRADE_BRIGHT];
      }
    }
    for (const pt of this.particles) {
      const px = Math.round(pt.x);
      const py = Math.round(pt.y);
      if (px >= 0 && px < BATTLE_W && py >= 0 && py < BATTLE_H) {
        buf[VIEW_TOP + 1 + py][1 + px] = [pt.ch, GRADE_BRIGHT];
      }
    }

    // 4. Battle Right Command Panel (cols 68..103)
    this._drawFrame(buf, 68, VIEW_TOP, 36, VIEW_ROWS, 'BATTLE ORDERS', GRADE_DIM, GRADE_LIT);
    if (sel) {
      this._putStr(buf, 70, 2, fitLine(`SEL [${sel.slot}] ${sel.label}`, 32), GRADE_BRIGHT);
      this._putStr(buf, 70, 3, fitLine(`Men ${sel.men} | Morale ${sel.morale}% | ${sel.braced ? 'SHIELD WALL' : 'OPEN'}`, 32), GRADE_LIT);
    }

    this._putStr(buf, 70, 5, '[ THORNE LINE (Keys 1..5) ]', GRADE_LIT);
    b.playerSquads.forEach((s, i) => {
      const mark = sel && sel.slot === s.slot ? '>' : ' ';
      const st = s.men <= 0 ? 'LOST' : s.routed ? 'ROUT' : s.braced ? 'SHLD' : 'OK  ';
      this._putStr(
        buf,
        70,
        6 + i,
        fitLine(`${mark}[${s.slot}]${s.code} ${String(s.men).padStart(3)}m ${String(s.morale).padStart(3)}% ${st}`, 32),
        s.men > 0 ? GRADE_DIM : GRADE_GHOST
      );
    });

    this._putStr(buf, 70, 12, fitLine(`[ FOE: ${b.sourceArmy.lordName.slice(0, 23)} ]`, 32), GRADE_LIT);
    b.enemySquads.forEach((s, i) => {
      const st = s.men <= 0 ? 'DOWN' : s.routed ? 'ROUT' : s.braced ? 'SHLD' : 'LINE';
      this._putStr(
        buf,
        70,
        13 + i,
        fitLine(` (${s.code}) ${s.label.slice(0, 12).padEnd(12)} ${String(s.men).padStart(3)}m ${String(s.morale).padStart(3)}% ${st}`, 32),
        s.routed ? GRADE_MIST : GRADE_DIM
      );
    });

    this._putStr(buf, 70, 19, '[ TACTICAL CONTROLS ]', GRADE_LIT);
    const batHelp = [
      '[1..5] / Click : Pick Regiment',
      '[WASD] / Click : March / Flank',
      '[J] / [C]      : Charge & Strike',
      '[B]            : Arrow Volley',
      '[F]            : Shield Wall',
      '[E]            : Ram / Wall / Duel',
      '[Space]        : War-Horn Rally',
      '[L]            : Pause Battle',
      '[Esc]          : Order Retreat',
    ];
    batHelp.forEach((ln, i) => this._putStr(buf, 70, 20 + i, ln, GRADE_MIST));

    if (this.activeStory) {
      this._renderStoryDispatch(buf, sel ? sel.y + 2 : 16);
    }

    this._renderBottomHud(buf);
  }

  _renderBottomHud(buf) {
    if (this.screen === 'dialogue' && this.activeDialogue) {
      const dlg = this.activeDialogue;
      this._putStr(buf, 1, LOG_TOP, fitLine(`${dlg.speaker}: ${dlg.lineFn(this)}`, GRID_COLS - 2), GRADE_BRIGHT);
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
        this._putStr(buf, 1, LOG_TOP + 1 + i, fitLine(rowTxt, GRID_COLS - 2), GRADE_LIT);
      }
      // Show choice 5-6 hint cleanly if present
      const extraHint =
        choices.length > 4
          ? `[1-${choices.length}] Pick Choice (5: ${choices[4].label(this).slice(0, 26)})  [W/S] Move  [Enter] Act  [Esc] Close`
          : '[1-4] Pick Choice  [W/S] Cycle  [Enter] Confirm  [Esc] Step Back';
      this._putStr(buf, 1, HINT_ROW, fitLine(extraHint, GRID_COLS - 2), GRADE_MIST);
      return;
    }

    const obj = computeWarObjective(this);
    const guide = fitLine(`NOW [${obj.chapter}] ${obj.now} | NEXT: ${obj.next}`, GRID_COLS - 2);
    this._putStr(buf, 1, LOG_TOP, guide, GRADE_BRIGHT);

    const recent = this.log.slice(-(LOG_ROWS - 1));
    for (let i = 0; i < LOG_ROWS - 1; i++) {
      if (recent[i]) {
        this._putStr(buf, 1, LOG_TOP + 1 + i, fitLine(recent[i], GRID_COLS - 2), i === recent.length - 1 ? GRADE_LIT : GRADE_DIM);
      }
    }

    const hint =
      this.activeStory
        ? '[Enter / Esc / WASD / Click] Dismiss Chronicle & Continue  |  [Tab] War Ledger'
        : this.screen === 'battle'
          ? '[1-5] Squad  [WASD] Move  [J/C] Charge  [B] Volley  [F] Shield  [E] Ram/Duel  [Space] Horn  [L] Pause'
          : '[WASD] March  [E] Hold/Siege  [C] Council/Spies  [T] Raven  [R] Forage  [Space] Scout  [Z] Steed';
    this._putStr(buf, 1, HINT_ROW, fitLine(hint, GRID_COLS - 2), GRADE_MIST);
  }

  _renderStoryDispatch(buf, cursorRow) {
    const story = this.activeStory;
    if (!story) return;
    const w = 102;
    const h = 10;
    const left = 1;
    const top = cursorRow <= 19 ? 21 : 2;
    for (let r = top; r < top + h; r++) this._putStr(buf, left, r, ' '.repeat(w), GRADE_GHOST);
    this._drawFrame(buf, left, top, w, h, `WAR CHRONICLE: ${story.title}`, GRADE_DIM, GRADE_BRIGHT);
    story.lines.slice(0, 3).forEach((ln, idx) => this._putStr(buf, left + 3, top + 1 + idx, fitLine(ln, w - 6), GRADE_LIT));
    this._putStr(buf, left + 3, top + 5, fitLine(`NOW : ${story.now}`, w - 6), GRADE_BRIGHT);
    this._putStr(buf, left + 3, top + 6, fitLine(`NEXT: ${story.next}`, w - 6), GRADE_DIM);
    this._putStr(buf, left + 3, top + 8, fitLine('[WASD / Enter / Space / Click] Dismiss & Command  |  [Tab] Full Ledger', w - 6), GRADE_BRIGHT);
  }

  _renderLedger(buf) {
    this._drawFrame(buf, 1, 1, GRID_COLS - 2, GRID_ROWS - 3, 'REALM WAR LEDGER, HOUSES & OBJECTIVES', GRADE_DIM, GRADE_BRIGHT);
    const mapW = 58;
    const mapH = 22;
    for (let r = 0; r < mapH; r++) {
      for (let c = 0; c < mapW; c++) {
        const wx = Math.min(REALM_W - 1, Math.floor((c * REALM_W) / mapW));
        const wy = Math.min(REALM_H - 1, Math.floor((r * REALM_H) / mapH));
        const ch = this.grid[wy][wx];
        const m = ch === '~' ? '~' : ch === '^' ? '^' : ch === '=' ? '=' : ch === '#' ? '+' : ' ';
        buf[4 + r][3 + c] = [m, m === '=' ? GRADE_DIM : GRADE_GHOST];
      }
    }
    const obj = computeWarObjective(this);
    if (obj.target) {
      const tx = Math.min(mapW - 1, Math.floor((obj.target[0] * mapW) / REALM_W));
      const ty = Math.min(mapH - 1, Math.floor((obj.target[1] * mapH) / REALM_H));
      buf[4 + ty][3 + tx] = ['?', GRADE_BRIGHT];
    }
    for (const h of this.holds) {
      const hx = Math.min(mapW - 1, Math.floor((h.x * mapW) / REALM_W));
      const hy = Math.min(mapH - 1, Math.floor((h.y * mapH) / REALM_H));
      buf[4 + hy][3 + hx] = [h.owner === 'thorne' ? '*' : 'K', h.owner === 'thorne' ? GRADE_BRIGHT : GRADE_LIT];
    }
    const pxm = Math.min(mapW - 1, Math.floor((this.campaign.px * mapW) / REALM_W));
    const pym = Math.min(mapH - 1, Math.floor((this.campaign.py * mapH) / REALM_H));
    buf[4 + pym][3 + pxm] = ['@', GRADE_BRIGHT];

    this._putStr(buf, 4, 27, 'Map Key: [@] You   [*] Thorne Keep   [K] Rival Hold   [?] Current Target', GRADE_MIST);

    const col = 63;
    this._putStr(buf, col, 3, '[ REALM HOLDS & CONTROL ]', GRADE_LIT);
    this.holds.forEach((h, i) => {
      const ownerTag = this.getHouse(h.owner).tag;
      this._putStr(
        buf,
        col,
        5 + i,
        fitLine(`${h.name.slice(0, 17).padEnd(17)} [${ownerTag}] G:${String(h.garrison).padStart(3)}`, 38),
        h.owner === 'thorne' ? GRADE_BRIGHT : GRADE_DIM
      );
    });

    this._putStr(buf, col, 15, '[ HOUSE RELATIONS & TREACHERY ]', GRADE_LIT);
    this.houses.filter((h) => !h.isPlayer).forEach((h, i) => {
      this._putStr(
        buf,
        col,
        17 + i,
        fitLine(`${h.name.padEnd(13)} ${h.treaty.toUpperCase().padEnd(6)} Rel:${String(h.relation).padStart(4)} Risk:${h.betrayalRisk}%`, 38),
        h.treaty === 'war' ? GRADE_BRIGHT : GRADE_LIT
      );
    });

    this._putStr(buf, col, 23, `[ GOAL: ${obj.chapter} ]`, GRADE_BRIGHT);
    wrapLines(`NOW : ${obj.now}`, 38).slice(0, 3).forEach((ln, i) => this._putStr(buf, col, 24 + i, ln, GRADE_LIT));
    wrapLines(`NEXT: ${obj.next}`, 38).slice(0, 3).forEach((ln, i) => this._putStr(buf, col, 28 + i, ln, GRADE_DIM));

    this._putStr(buf, 1, HINT_ROW, fitLine('[Tab / Esc / Enter / Click] Return to Command', GRID_COLS - 2), GRADE_MIST);
  }

  _renderHelp(buf) {
    this._drawFrame(buf, 3, 1, GRID_COLS - 6, GRID_ROWS - 3, 'IRONCROWN -- REAL WAR FIELD MANUAL', GRADE_DIM, GRADE_BRIGHT);
    const lines = [
      '1. CAMPAIGN LOGISTICS & LIVE MARCH VISTA',
      '   - Ride with [WASD] or click map tiles: your warhorse gallops in the vista & armies eat Grain.',
      '   - Press [Z] anytime on Title/Campaign to inspect the Full-Screen Animated Royal Destrier!',
      '2. HOUSE POLITICS, RAVENS & REAL BETRAYAL',
      '   - Locke (Honor), Brack (Coin/Quays), and Vance (Ambition) track Loyalty, Dread, and Risk.',
      '   - Open [T] Dispatch Raven to seal pacts or press [C] Small Council to bribe Gate Wardens.',
      '3. LIVE TACTICAL SIEGES & ANIMATED REGIMENTS',
      '   - Select animated squads [1..5] or click them: [1] Guard, [2] Shieldwall [F], [3] Bows [B],',
      '     [4] Galloping Knight Lancers [J/C Charge], and [5] Wheeled Iron Siege Ram [E].',
      '   - Keeps have multi-tier Stone Walls & Oak Gatehouses [HH]; smash the gate or scale [L]!',
      '4. WINNING THE CROWN',
      '   - Capture Redwatch -> Kingsbridge -> Highcrown Citadel to overthrow Archon Malcor Dray.',
    ];
    lines.forEach((ln, i) => this._putStr(buf, 6, 4 + i * 2, fitLine(ln, 92), i % 3 === 0 ? GRADE_BRIGHT : GRADE_DIM));
    this._putStr(buf, 1, HINT_ROW, fitLine('[Enter / Esc / H / Click] Return', GRID_COLS - 2), GRADE_MIST);
  }

  _renderOutcome(buf) {
    const won = this.screen === 'victory';
    const title = won ? 'THE IRON CROWN RECLAIMED -- VICTORY' : 'THE HOUSE OF THORNE FALLS -- DEFEAT';
    this._drawFrame(buf, 6, 2, GRID_COLS - 12, 30, title, GRADE_DIM, GRADE_BRIGHT);
    if (won) {
      const vicHorse = getBakedCampaignHorse(this.clock, true, true);
      stampCellGrid(buf, 29, 6, vicHorse, { x0: 7, y0: 3, x1: GRID_COLS - 8, y1: 21 }, 0);
      this._putStr(buf, 22, 22, 'HIGHCROWN FLIES THE WOLF AND AMBER PIKE OF HOUSE THORNE!', GRADE_BRIGHT);
    } else {
      const lostArt = [
        '                       . . .  +  . . .                         ',
        '                          /   |   \\                            ',
        '                     BANNERS BROKEN IN SNOW                    ',
        '  Your columns starved or broke before Highcrown walls fell.   ',
      ];
      lostArt.forEach((ln, i) => this._putStr(buf, 20, 9 + i, ln, GRADE_LIT));
    }
    const th = this.getHouse('thorne');
    const summary = `Days: ${this.campaign.day}  |  Battles Won: ${this.stats.battlesWon}  |  Sieges Won: ${this.stats.siegesWon}  |  Holds: ${this.heldCount()}  |  Honor ${th.honor}  Dread ${th.dread}`;
    this._putStr(buf, 16, 25, fitLine(summary, 72), GRADE_LIT);
    this._putStr(buf, 26, 28, '[Enter / N] Begin New War   |   [Esc] Return to Title', GRADE_BRIGHT);
    this._putStr(buf, 1, HINT_ROW, fitLine('[Enter] New War  |  [Esc] Title Screen', GRID_COLS - 2), GRADE_MIST);
  }
}
