/**
 * Grounded Strategic Utility AI (house politics, betrayal, supply raiding) and
 * Tactical Battlefield Squad AI (flanking cavalry, shield-wall bracing, A* routing).
 */

import { BATTLE_H, BATTLE_W, REALM_H, REALM_W, TERRAIN_META } from './worldData.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Bounded A-star and BFS pathfinder returning next [x, y] step toward goal on the realm map.
 */
export function nextRealmStep(grid, sx, sy, gx, gy, seasonId, maxVisited = 900) {
  if (sx === gx && sy === gy) return null;
  const key = (x, y) => y * REALM_W + x;
  const startK = key(sx, sy);
  const goalK = key(gx, gy);
  const frontier = [[sx, sy, 0]];
  const cameFrom = new Map([[startK, -1]]);
  const costSoFar = new Map([[startK, 0]]);
  let visited = 0;

  while (frontier.length > 0 && visited < maxVisited) {
    frontier.sort((a, b) => a[2] - b[2]);
    const [cx, cy] = frontier.shift();
    const ck = key(cx, cy);
    if (ck === goalK) break;
    visited += 1;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= REALM_W || ny < 0 || ny >= REALM_H) continue;
      const ch = grid[ny][nx];
      let passable = TERRAIN_META[ch]?.passable ?? false;
      if (ch === ':' && seasonId === 'autumn') passable = false;
      if (!passable) continue;
      const stepCost = TERRAIN_META[ch]?.cost ?? 1.0;
      const nk = key(nx, ny);
      const newCost = costSoFar.get(ck) + stepCost;
      if (!costSoFar.has(nk) || newCost < costSoFar.get(nk)) {
        costSoFar.set(nk, newCost);
        cameFrom.set(nk, ck);
        const h = Math.abs(gx - nx) + Math.abs(gy - ny);
        frontier.push([nx, ny, newCost + h * 0.72]);
      }
    }
  }

  if (!cameFrom.has(goalK)) {
    // Fallback greedy step toward goal if beyond cap
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort((a, b) => {
      const da = Math.abs(gx - (sx + a[0])) + Math.abs(gy - (sy + a[1]));
      const db = Math.abs(gx - (sx + b[0])) + Math.abs(gy - (sy + b[1]));
      return da - db;
    });
    for (const [dx, dy] of dirs) {
      const nx = sx + dx;
      const ny = sy + dy;
      const ch = grid[ny]?.[nx];
      if (ch && TERRAIN_META[ch]?.passable) return [nx, ny];
    }
    return null;
  }

  let cur = goalK;
  while (cameFrom.get(cur) !== startK && cameFrom.get(cur) !== -1) {
    cur = cameFrom.get(cur);
  }
  return [cur % REALM_W, Math.floor(cur / REALM_W)];
}

/**
 * Evaluate Utility AI betrayal pressure (0..1) for a non-Dray house.
 * High honor or high player dread deters treachery; low relation or weak player army tempts it.
 */
export function computeHouseBetrayalUtility(house, playerHouse, playerMen, holds) {
  if (house.isPlayer || house.id === 'dray' || house.treaty === 'war') return 0;
  const relationDanger = clamp01((35 - house.relation) / 90);
  const lowHonor = clamp01((75 - house.honor) / 75);
  const weakPlayer = clamp01((140 - playerMen) / 110);
  const poorCrown = clamp01((90 - playerHouse.treasury) / 90) * 0.6;
  const fearShield = clamp01(playerHouse.dread / 85);

  const playerHolds = holds.filter((h) => h.owner === 'thorne').length;
  const overextended = playerHolds >= 5 && house.personality === 'ambitious' ? 0.25 : 0;

  const raw = relationDanger * 0.44 + lowHonor * 0.24 + weakPlayer * 0.2 + poorCrown * 0.12 + overextended;
  return clamp01(raw * (1 - fearShield * 0.58));
}

/**
 * Pick strategic destination [tx, ty, intentLabel] for an active rival field army.
 */
export function pickCampaignArmyIntent(army, house, game) {
  const playerX = game.campaign.px;
  const playerY = game.campaign.py;
  const distToPlayer = Math.abs(army.x - playerX) + Math.abs(army.y - playerY);
  const playerStrength = game.totalMen(game.playerRegiments);
  const myStrength = game.totalMen(army.regiments);

  const hostile = house.treaty === 'war' || house.relation <= -40;
  if (!hostile) {
    // Neutral / allied houses patrol near their own seat or reinforce their threatened keeps
    const owned = game.holds.filter((h) => h.owner === house.id);
    if (house.treaty === 'oath' && owned.length > 0 && distToPlayer > 8) {
      // Allied Lockes occasionally shadow near northern pass / Ashford to guard against Dray raiders
      const guardHold = game.holds.find((h) => h.id === 'ashford') || owned[0];
      return { tx: guardHold.x, ty: guardHold.y, mode: 'guard_pass' };
    }
    const home = owned[0] || game.holds[0];
    return { tx: home.x, ty: home.y, mode: 'patrol' };
  }

  // Hostile army Utility scoring across targets: intercept player, raid granary, take weakly held Hold
  let bestTarget = { tx: playerX, ty: playerY, mode: 'hunt', score: -1 };

  const engageScore =
    clamp01(myStrength / Math.max(40, playerStrength)) * 0.65 +
    clamp01((18 - distToPlayer) / 18) * 0.45;
  if (engageScore > bestTarget.score && myStrength >= playerStrength * 0.72) {
    bestTarget = { tx: playerX, ty: playerY, mode: 'intercept', score: engageScore };
  }

  for (const h of game.holds) {
    if (h.owner === house.id) continue;
    if (h.owner !== 'thorne' && house.id !== 'dray') continue;
    const dist = Math.abs(army.x - h.x) + Math.abs(army.y - h.y);
    const weakGarrison = clamp01((130 - h.garrison) / 130);
    const prox = clamp01((32 - dist) / 32);
    const grainBonus = h.grainYield >= 35 ? 0.18 : 0;
    const sc = weakGarrison * 0.45 + prox * 0.45 + grainBonus;
    if (sc > bestTarget.score) {
      bestTarget = { tx: h.x, ty: h.y, mode: 'besiege', holdId: h.id, score: sc };
    }
  }

  return bestTarget;
}

/**
 * Tactical step function for an enemy regiment during live ASCII battle.
 * Uses role behaviors: Shieldwall Spear, Volley Bow, Flanking Horse, Gate Ram, Commander Guard.
 */
export function decideTacticalAiAction(squad, battle, helper) {
  if (squad.men <= 0) return { act: 'none' };

  // Morale collapse -> Rout toward East edge
  if (squad.morale < 22 || squad.routed) {
    squad.routed = true;
    squad.braced = false;
    return { act: 'move', tx: BATTLE_W - 1, ty: squad.y, mode: 'rout' };
  }

  const foes = battle.playerSquads.filter((s) => s.men > 0 && !s.routed);
  if (foes.length === 0) return { act: 'hold' };

  const nearestFoe = foes.slice().sort(
    (a, b) => Math.abs(a.x - squad.x) + Math.abs(a.y - squad.y) - (Math.abs(b.x - squad.x) + Math.abs(b.y - squad.y))
  )[0];
  const distNearest = Math.abs(nearestFoe.x - squad.x) + Math.abs(nearestFoe.y - squad.y);

  // Archers keep distance (behind walls in siege) & loose volleys at unbraced foes first
  if (squad.type === 'bow') {
    const inMeleeDanger = distNearest <= 2 && battle.map.kind !== 'siege';
    if (inMeleeDanger) {
      return { act: 'move', tx: Math.min(BATTLE_W - 2, squad.x + 3), ty: squad.y, mode: 'skirmish_back' };
    }
    const volleyTargets = foes
      .filter((f) => Math.abs(f.x - squad.x) + Math.abs(f.y - squad.y) <= 22)
      .sort((a, b) => (a.braced ? 1 : 0) - (b.braced ? 1 : 0) || a.hp - b.hp);
    if (volleyTargets.length > 0 && squad.cooldown <= 0) {
      return { act: 'volley', target: volleyTargets[0] };
    }
    if (battle.map.kind === 'siege' && squad.side === 'defender') {
      // Defenders hold ramparts near x = 72..76
      return { act: 'hold' };
    }
    return { act: 'move', tx: Math.min(BATTLE_W - 2, nearestFoe.x + 10), ty: nearestFoe.y, mode: 'bow_range' };
  }

  // Heavy Cavalry looks for open flanks (especially enemy archers) & charges on cooldown
  if (squad.type === 'horse') {
    const softTarget =
      foes.find((f) => f.type === 'bow' && !f.braced) ||
      foes.find((f) => !f.braced) ||
      nearestFoe;
    const d = Math.abs(softTarget.x - squad.x) + Math.abs(softTarget.y - squad.y);
    if (d <= 2) {
      return { act: 'charge', target: softTarget };
    }
    // Approach along northern or southern wing if opponent center is braced spearmen
    const flankY = softTarget.y < BATTLE_H / 2 ? Math.max(2, softTarget.y - 2) : Math.min(BATTLE_H - 3, softTarget.y + 2);
    const goalX = d > 6 ? Math.max(2, softTarget.x - 1) : softTarget.x;
    const goalY = d > 4 ? flankY : softTarget.y;
    return { act: 'move', tx: goalX, ty: goalY, mode: 'flank' };
  }

  // Defenders in siege guard the gatehouse breach or scaling ladders instead of blindly charging outside walls
  if (battle.map.kind === 'siege' && squad.side === 'defender') {
    const breachers = foes.filter((f) => f.x >= battle.map.wallX - 2);
    if (breachers.length > 0) {
      const target = breachers[0];
      const d = Math.abs(target.x - squad.x) + Math.abs(target.y - squad.y);
      if (d <= 1) return { act: 'melee', target };
      return { act: 'move', tx: target.x, ty: target.y, mode: 'seal_breach' };
    }
    if (squad.type === 'spear' && !squad.braced) {
      return { act: 'brace' };
    }
    return { act: 'move', tx: battle.map.wallX + 3, ty: battle.map.gateY, mode: 'hold_gate' };
  }

  // Infantry (Spear / Guard): Brace if facing nearby Horse or Volleys, otherwise close and strike
  const enemyHorseNear = foes.some((f) => f.type === 'horse' && Math.abs(f.x - squad.x) + Math.abs(f.y - squad.y) <= 5);
  if (squad.type === 'spear' && enemyHorseNear && distNearest > 1) {
    return { act: 'brace' };
  }
  if (distNearest <= 1) {
    squad.braced = false;
    return { act: 'melee', target: nearestFoe };
  }
  return { act: 'move', tx: nearestFoe.x, ty: nearestFoe.y, mode: 'advance' };
}

/**
 * Single-step tactical movement helper honoring walls, unbroken gatehouses, and deep water.
 */
export function stepBattleTile(grid, sx, sy, tx, ty, occupiedFn) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]].sort((a, b) => {
    const da = Math.abs(tx - (sx + a[0])) + Math.abs(ty - (sy + a[1]));
    const db = Math.abs(tx - (sx + b[0])) + Math.abs(ty - (sy + b[1]));
    return da - db;
  });
  for (const [dx, dy] of dirs) {
    if (dx === 0 && dy === 0) continue;
    const nx = sx + dx;
    const ny = sy + dy;
    if (nx < 0 || nx >= BATTLE_W || ny < 0 || ny >= BATTLE_H) continue;
    const ch = grid[ny][nx];
    if (ch === '#' || ch === 'H' || ch === '~') continue;
    if (occupiedFn && occupiedFn(nx, ny)) continue;
    return [nx, ny];
  }
  return [sx, sy];
}
