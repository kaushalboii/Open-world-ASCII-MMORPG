/**
 * Narrative Raven Dispatches, Small Council & Diplomacy Graphs,
 * and live NOW / NEXT War Objective Guidance for IRONCROWN.
 * All returned strings stay strictly within printable ASCII (32..126).
 */

export const STORY_BEATS = {
  prologue: {
    id: 'prologue',
    title: 'CH.I: ASHES OF OLD FORD',
    lines: [
      'Archon Malcor Dray slew your elder brother under truce banner and seized Highcrown.',
      'House Thorne holds Blackpike, Ashford, and Old Ford -- but winter grain runs thin.',
      'Houses Locke, Brack, and Vance watch from their towers, weighing silver against steel.',
    ],
    now: 'Press [E] at Blackpike to muster levies/ram, or [T] Raven House Brack/Vance.',
    next: 'Capture Redwatch Bastion & Kingsbridge before storming Highcrown Citadel.',
  },
  first_siege: {
    id: 'first_siege',
    title: 'THE LAW OF STONE WALLS',
    lines: [
      'Stone gatehouses shred unsupported infantry under crossfire from high battlements.',
      'Drive a Capped Siege Ram [R] into [HH], scale breach notches [L], or bribe a gate',
      'warden in your Small Council [C] so the postern swings open at first horn.',
    ],
    now: 'In Battle: Press [5] for Ram & walk to [HH] then [E], or flank wall notch [L].',
    next: 'Break enemy morale [B Volleys + H Cavalry flank] to capture rival lords.',
  },
  betrayal_spark: {
    id: 'betrayal_spark',
    title: 'BROKEN WAX ON COLD PARCHMENT',
    lines: [
      'Outriders bring a cut raven from the marches -- a wavering House has sold its oath.',
      'High crown silver or steep losses tempt fence-sitters unless Honor or Dread holds them.',
      'Cut off the turncloak road before their columns reach Ashford Granary.',
    ],
    now: 'Check [Tab] House Relations & march to intercept hostile banners!',
    next: 'Capture their lord in battle to ransom, cage as hostage, or execute for Dread.',
  },
  deep_winter: {
    id: 'deep_winter',
    title: 'DEEP WINTER LOCKS THE FORDS',
    lines: [
      'Freezing gales sweep down from Greycrag. River bends skim with thick gray ice (:).',
      'Armies cut off from friendly Holds starve twice as fast and lose half their cohesion.',
      'Watch your Supply status in the top bar; hold Crossroads or coastal Saltport.',
    ],
    now: 'Stay along [=] Supply Roads or capture Villages [v] / Holds to feed men.',
    next: 'Use frozen winter crossings [:] to flank Kingsbridge without crossing under fire.',
  },
  highcrown_gates: {
    id: 'highcrown_gates',
    title: 'GATES OF THE IRON CROWN',
    lines: [
      'The triple basalt curtain of Highcrown Citadel rises over the burned fields of Dray.',
      'Archon Malcor Dray refuses parley; his longbows hold the ramparts three tiers deep.',
      'Shatter his outer field columns or bribe a traitor inside [C] before the final horn.',
    ],
    now: 'Approach Highcrown Citadel (#) with Siege Ram & full grain -> [E] Storm Keep.',
    next: 'Break the Iron Gate, rout Dray Guard, and claim Highcrown by steel or submission.',
  },
};

export function wrapLines(text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxWidth) cur += ` ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [''];
}

export function bearingLabel(px, py, tx, ty) {
  const dx = tx - px;
  const dy = ty - py;
  const steps = Math.abs(dx) + Math.abs(dy);
  if (steps === 0) return 'HERE!';
  const ns = dy < -1 ? 'N' : dy > 1 ? 'S' : '';
  const ew = dx < -1 ? 'W' : dx > 1 ? 'E' : '';
  const dir = ns + ew || (Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'N' : 'S') : dx < 0 ? 'W' : 'E');
  return `${dir} ${steps}`;
}

/**
 * Live contextual guidance for Row 34 HUD and Tab War Ledger.
 */
export function computeWarObjective(game) {
  if (game.screen === 'battle' && game.battle) {
    const b = game.battle;
    const foes = b.enemySquads.filter((s) => s.men > 0 && !s.routed);
    const guard = b.playerSquads.find((s) => s.type === 'guard' && s.men > 0);
    const ram = b.playerSquads.find((s) => s.type === 'ram' && s.men > 0);
    const bows = b.playerSquads.find((s) => s.type === 'bow' && s.men > 0);

    if (b.map.kind === 'siege' && !b.gateBreached) {
      const gx = b.map.wallX - 1;
      const gy = b.map.gateY;
      if (ram) {
        const br = bearingLabel(ram.x, ram.y, gx, gy);
        return {
          chapter: 'SIEGE GATE',
          target: [gx, gy],
          now:
            br === 'HERE!'
              ? 'Select Ram [5] & Press [E] to SMASH Gatehouse!'
              : `Move Ram [5] to Gate [HH] (${br}) -> [E]`,
          next: 'After breach, send Spearmen [2] & Horse [4] through',
        };
      }
      return {
        chapter: 'SCALE WALL',
        target: [b.map.wallX - 1, 7],
        now: 'No Ram: Climb breach ladder [L] at N/S wall -> [E]',
        next: 'Use [B] Volleys to thin rampart bows',
      };
    }

    if (foes.length > 0 && guard) {
      const lowMoraleFoe = foes.slice().sort((a, b2) => a.morale - b2.morale)[0];
      const br = bearingLabel(guard.x, guard.y, lowMoraleFoe.x, lowMoraleFoe.y);
      const bowHint = bows ? ' | [3]+[B] Volley' : '';
      return {
        chapter: 'TACTICAL',
        target: [lowMoraleFoe.x, lowMoraleFoe.y],
        now: `Break ${lowMoraleFoe.label} (${lowMoraleFoe.morale}% mor, ${br})${bowHint}`,
        next: '[F] ShieldWall | [4]+[C] Flank Charge | [Space] Rally',
      };
    }

    return {
      chapter: 'MOP UP',
      target: null,
      now: 'Enemy line breaking -- press [Enter] or chase stragglers!',
      next: 'Collect loot, ransom lords & garrison captured Keep',
    };
  }

  // Strategic Campaign Objective
  const { px, py, seasonIndex, supplied, grain } = game.campaign;
  const playerHouse = game.getHouse('thorne');
  const drayHold = game.holds.find((h) => h.id === 'highcrown');
  const highRiskHouse = game.houses.find(
    (h) => !h.isPlayer && h.id !== 'dray' && h.treaty !== 'war' && h.betrayalRisk >= 52
  );

  if (!supplied && grain < 70) {
    const friendly = game.holds.filter((h) => h.owner === 'thorne').sort(
      (a, b) => Math.abs(a.x - px) + Math.abs(a.y - py) - (Math.abs(b.x - px) + Math.abs(b.y - py))
    )[0];
    if (friendly) {
      const br = bearingLabel(px, py, friendly.x, friendly.y);
      return {
        chapter: 'SUPPLY CRISIS',
        target: [friendly.x, friendly.y],
        now: `Supply CUT & low grain! March to ${friendly.name} (${br})`,
        next: 'Or press [R] Forage / [C] Buy Grain before men desert',
      };
    }
  }

  const threatSiege = game.holds.find(
    (h) =>
      h.owner === 'thorne' &&
      game.armies.some((a) => !a.isPlayer && a.men > 0 && Math.abs(a.x - h.x) <= 2 && Math.abs(a.y - h.y) <= 2)
  );
  if (threatSiege) {
    const br = bearingLabel(px, py, threatSiege.x, threatSiege.y);
    return {
      chapter: 'RELIEF MARCH',
      target: [threatSiege.x, threatSiege.y],
      now: `Relieve ${threatSiege.name} under enemy threat (${br})!`,
      next: `Protect grain lines before advancing south`,
    };
  }

  const hasRam = (game.playerRegiments.find((r) => r.type === 'ram')?.men || 0) > 0;
  const standingHere = game.holdAt(px, py);
  if (!hasRam && standingHere && standingHere.owner === 'thorne' && playerHouse.treasury >= 80) {
    return {
      chapter: 'MUSTERING',
      target: [standingHere.x, standingHere.y],
      now: `Press [E] at ${standingHere.name} -> Build Capped Ram (80g)`,
      next: 'You need a Ram [R] (or Bribe) to crack Keep Gates!',
    };
  }

  if (highRiskHouse && playerHouse.treasury >= 90) {
    return {
      chapter: 'COUNCIL ALERT',
      target: [px, py],
      now: `${highRiskHouse.name} wavers (${highRiskHouse.betrayalRisk}% risk)! Press [T] Raven`,
      next: 'Bribe/Oath before they turn cloak with Archon Dray',
    };
  }

  // Main conquest critical path: Redwatch -> Kingsbridge -> Highcrown
  const targets = ['redwatch', 'kingsbridge', 'highcrown'];
  for (const tid of targets) {
    const th = game.holds.find((h) => h.id === tid);
    if (th && th.owner !== 'thorne') {
      const br = bearingLabel(px, py, th.x, th.y);
      const seasonTag = seasonIndex === 2 ? 'WINTER WAR' : 'WAR MARCH';
      const actionVerb = br === 'HERE!' ? `Press [E] NOW to storm ${th.name}!` : `March on ${th.name} (${br})`;
      const nextStep =
        tid === 'redwatch'
          ? 'Then cross Kingsbridge toward Highcrown'
          : tid === 'kingsbridge'
            ? 'Opens final supply road to Highcrown Citadel'
            : 'Take Highcrown Citadel to end Archon Dray!';
      return {
        chapter: seasonTag,
        target: [th.x, th.y],
        now: actionVerb,
        next: nextStep,
      };
    }
  }

  // Fallback any remaining hostile Hold
  const remaining = game.holds.find((h) => h.owner === 'dray' || game.getHouse(h.owner).treaty === 'war');
  if (remaining) {
    const br = bearingLabel(px, py, remaining.x, remaining.y);
    return {
      chapter: 'PACIFY REALM',
      target: [remaining.x, remaining.y],
      now: br === 'HERE!' ? `Press [E] Storm ${remaining.name}!` : `Clear final enemy Hold ${remaining.name} (${br})`,
      next: 'Crush remaining Usurper bannermen',
    };
  }

  const br = drayHold ? bearingLabel(px, py, drayHold.x, drayHold.y) : 'HERE!';
  return {
    chapter: 'CROWN VICTORY',
    target: drayHold ? [drayHold.x, drayHold.y] : null,
    now: `Consolidate realm at Highcrown (${br})`,
    next: '[Tab] Realm Survey',
  };
}

/**
 * Build interactive Council / Raven / Keep / Prisoner dialogue trees.
 */
export function openCouncilMenu(game) {
  const th = game.getHouse('thorne');
  const nextEnemyHold = game.holds.find((h) => h.owner === 'dray' || game.getHouse(h.owner).treaty === 'war');
  return {
    id: 'council_root',
    speaker: 'SMALL COUNCIL & SPYMASTER VEYN',
    lineFn: (g) => {
      const p = g.getHouse('thorne');
      return `Silver ${p.treasury}g | Grain ${g.campaign.grain} | Honor ${p.honor} | Dread ${p.dread} | Spies ready.`;
    },
    choices: [
      {
        label: () =>
          nextEnemyHold && !game.flags[`bribed_${nextEnemyHold.id}`]
            ? `Bribe Gate Warden at ${nextEnemyHold.name} (75g -> Gate open!)`
            : 'Warden already bribed / No enemy hold',
        enabled: (g) => {
          const eh = g.holds.find((h) => h.owner === 'dray' || g.getHouse(h.owner).treaty === 'war');
          return Boolean(eh && !g.flags[`bribed_${eh.id}`] && g.getHouse('thorne').treasury >= 75);
        },
        action: (g) => {
          const eh = g.holds.find((h) => h.owner === 'dray' || g.getHouse(h.owner).treaty === 'war');
          if (!eh) return null;
          g.getHouse('thorne').treasury -= 75;
          g.flags[`bribed_${eh.id}`] = true;
          g.pushLog(`Whisperers paid 75g: ${eh.name} postern warden will throw the bolt!`);
          return null;
        },
      },
      {
        label: () =>
          nextEnemyHold ? `Poison Granary at ${nextEnemyHold.name} (55g -> -25% garrison)` : 'Sabotage',
        enabled: (g) => Boolean(nextEnemyHold && g.getHouse('thorne').treasury >= 55 && nextEnemyHold.garrison > 30),
        action: (g) => {
          const eh = g.holds.find((h) => h.owner === 'dray' || g.getHouse(h.owner).treaty === 'war');
          if (!eh) return null;
          g.getHouse('thorne').treasury -= 55;
          eh.garrison = Math.max(20, Math.round(eh.garrison * 0.75));
          g.getHouse('thorne').dread = Math.min(100, g.getHouse('thorne').dread + 6);
          g.getHouse('thorne').honor = Math.max(0, g.getHouse('thorne').honor - 5);
          g.pushLog(`Saboteurs fouled cisterns at ${eh.name}; garrison fell to ${eh.garrison} men.`);
          return null;
        },
      },
      {
        label: () => 'Emergency Grain Requisition (50g -> +115 Grain)',
        enabled: (g) => g.getHouse('thorne').treasury >= 50,
        action: (g) => {
          g.getHouse('thorne').treasury -= 50;
          g.campaign.grain += 115;
          g.pushLog('Quartermaster wagons arrive: +115 Grain added to camp stores.');
          return null;
        },
      },
      {
        label: () => 'Levy Harsh War Tax (+95g Silver, -10 Honor, +8 Dread)',
        enabled: (g) => !g.flags.taxed_this_season,
        action: (g) => {
          g.flags.taxed_this_season = true;
          th.treasury += 95;
          th.honor = Math.max(0, th.honor - 10);
          th.dread = Math.min(100, th.dread + 8);
          for (const h of g.houses) {
            if (!h.isPlayer && h.id !== 'dray') h.relation = Math.max(-100, h.relation - 8);
          }
          g.pushLog('Bailiffs wrung 95g war tax from river baronies. Vassals grumble (+8 Dread).');
          return null;
        },
      },
      {
        label: () => 'Leave War Tent',
        action: (g) => {
          g.screen = 'campaign';
          return null;
        },
      },
    ],
  };
}

export function openRavenMenu(game) {
  return {
    id: 'raven_root',
    speaker: 'ROOKERY — DISPATCH WAR RAVENS',
    lineFn: (g) => {
      const th = g.getHouse('thorne');
      return `Envoys ready (${th.treasury}g). Locks: ${g.getHouse('locke').relation} | Brack: ${g.getHouse('brack').relation} | Vance: ${g.getHouse('vance').relation}`;
    },
    choices: [
      {
        label: () => {
          const b = game.getHouse('brack');
          return `Purse & Charter to Brack [${b.treaty.toUpperCase()}, Rel ${b.relation}] (85g -> +26 Rel)`;
        },
        enabled: (g) => g.getHouse('thorne').treasury >= 85 && g.getHouse('brack').treaty !== 'war',
        action: (g) => {
          const b = g.getHouse('brack');
          g.getHouse('thorne').treasury -= 85;
          b.relation = Math.min(100, b.relation + 26);
          if (b.relation >= 45) b.treaty = 'oath';
          g.playCue('seal');
          g.pushLog(`Lord Harmund Brack seals your charter (+26 Rel -> ${b.treaty.toUpperCase()}).`);
          return null;
        },
      },
      {
        label: () => {
          const v = game.getHouse('vance');
          return `Gift/Oath to Corvin Vance [${v.treaty.toUpperCase()}, Rel ${v.relation}] (90g -> +24 Rel)`;
        },
        enabled: (g) => g.getHouse('thorne').treasury >= 90 && g.getHouse('vance').treaty !== 'war',
        action: (g) => {
          const v = g.getHouse('vance');
          g.getHouse('thorne').treasury -= 90;
          v.relation = Math.min(100, v.relation + 24);
          if (v.relation >= 40) v.treaty = 'truce';
          if (v.relation >= 68) v.treaty = 'oath';
          g.playCue('seal');
          g.pushLog(`Lord Corvin Vance accepts Thorne coin (+24 Rel -> ${v.treaty.toUpperCase()}).`);
          return null;
        },
      },
      {
        label: () => 'Issue Fire-and-Steel Ultimatum to Vance (needs Dread>=45 or Rel<0)',
        enabled: (g) => g.getHouse('thorne').dread >= 45 && g.getHouse('vance').treaty === 'none',
        action: (g) => {
          const v = g.getHouse('vance');
          v.treaty = 'truce';
          v.betrayalRisk = Math.max(8, v.betrayalRisk - 25);
          g.playCue('horn');
          g.pushLog('Cowed by Thorne Dread, Lord Corvin Vance swears Truce & stands down.');
          return null;
        },
      },
      {
        label: () => 'Send Grain Tribute to Lady Ysabel Locke (45 Grain -> +18 Rel & Iron Steel)',
        enabled: (g) => g.campaign.grain >= 60 && g.getHouse('locke').treaty !== 'war',
        action: (g) => {
          const l = g.getHouse('locke');
          g.campaign.grain -= 45;
          l.relation = Math.min(100, l.relation + 18);
          l.treaty = 'oath';
          g.flags.locke_steel = true;
          g.playCue('seal');
          g.pushLog('Lady Ysabel Locke vows Greycrag ironworks (+2 Regiment Attack)! Wait no turncoat!');
          return null;
        },
      },
      {
        label: () => 'Fold Parchment',
        action: (g) => {
          g.screen = 'campaign';
          return null;
        },
      },
    ],
  };
}

export function openHoldMenu(game, hold) {
  const owner = game.getHouse(hold.owner);
  const hostile = owner.treaty === 'war' || owner.relation <= -40;

  if (hold.owner === 'thorne') {
    return {
      id: 'hold_friendly',
      speaker: `${hold.name.toUpperCase()} [HOUSE THORNE HOLD]`,
      lineFn: (g) =>
        `Wall ${hold.wallHp}/${hold.maxWall} | Garrison ${hold.garrison} | Silver ${g.getHouse('thorne').treasury}g | Grain ${g.campaign.grain}`,
      choices: [
        {
          label: () => 'Muster 20 Shieldwall Pikes [S] (40g)',
          enabled: (g) => g.getHouse('thorne').treasury >= 40,
          action: (g) => {
            g.getHouse('thorne').treasury -= 40;
            g.addPlayerMen('spear', 20);
            g.playCue('muster');
            g.pushLog(`Mustered +20 Shieldwall Pikes at ${hold.name}.`);
            return null;
          },
        },
        {
          label: () => 'Muster 18 Ashwood Longbows [B] (45g)',
          enabled: (g) => g.getHouse('thorne').treasury >= 45,
          action: (g) => {
            g.getHouse('thorne').treasury -= 45;
            g.addPlayerMen('bow', 18);
            g.playCue('muster');
            g.pushLog(`Mustering horn calls +18 Longbowmen into your column.`);
            return null;
          },
        },
        {
          label: () => 'Mount 12 Mail Lancers [H] (65g)',
          enabled: (g) => g.getHouse('thorne').treasury >= 65,
          action: (g) => {
            g.getHouse('thorne').treasury -= 65;
            g.addPlayerMen('horse', 12);
            g.playCue('muster');
            g.pushLog(`Mounted +12 Mail Lancers for flank charges.`);
            return null;
          },
        },
        {
          label: () => 'Build Capped Siege Ram [R] (80g -> Essential for Gates!)',
          enabled: (g) => g.getHouse('thorne').treasury >= 80 && (g.playerRegiments.find((r) => r.type === 'ram')?.men || 0) < 12,
          action: (g) => {
            g.getHouse('thorne').treasury -= 80;
            g.addPlayerMen('ram', 12, true);
            g.playCue('ram');
            g.pushLog(`Wright-crews lash iron-shod Siege Ram [R] to your train.`);
            return null;
          },
        },
        {
          label: () => 'Quarter & Resupply Army (Mend wounded & +45 Grain from Keep)',
          enabled: () => true,
          action: (g) => {
            g.resupplyAtHold(hold);
            g.screen = 'campaign';
            return null;
          },
        },
        {
          label: () => 'Ride Out',
          action: (g) => {
            g.screen = 'campaign';
            return null;
          },
        },
      ],
    };
  }

  return {
    id: 'hold_foreign',
    speaker: `${hold.name.toUpperCase()} [${owner.name.toUpperCase()}]`,
    lineFn: () =>
      `Garrison ${hold.garrison} | Wall ${hold.wallHp}/${hold.maxWall} | Treaty: ${owner.treaty.toUpperCase()} (${hostile ? 'HOSTILE' : 'OPEN GATE'})`,
    choices: [
      {
        label: () =>
          hostile
            ? `SOUND ASSAULT -- Storm ${hold.name} in Live Siege Battle!`
            : `BREAK TRUCE & STORM ${hold.name} (Starts War & -18 Honor!)`,
        enabled: (g) => g.totalMen(g.playerRegiments) >= 15,
        action: (g) => {
          if (!hostile) {
            owner.treaty = 'war';
            owner.relation = -90;
            g.getHouse('thorne').honor = Math.max(0, g.getHouse('thorne').honor - 18);
            g.getHouse('thorne').dread = Math.min(100, g.getHouse('thorne').dread + 12);
            g.pushLog(`Broken oath! ${owner.name} raises war banners across the valley!`);
          }
          g.startSiegeBattle(hold);
          return null;
        },
      },
      {
        label: () => 'Besiege & Starve Walls 1 Day (-22 Garrison / -25 Wall / Costs 14 Grain)',
        enabled: (g) => hostile && g.campaign.grain >= 14,
        action: (g) => {
          g.campaign.grain -= 14;
          hold.garrison = Math.max(25, hold.garrison - 22);
          hold.wallHp = Math.max(30, hold.wallHp - 25);
          g.advanceCampaignDay(true);
          g.playCue('ram');
          g.pushLog(`Siege lines tighten around ${hold.name}: garrison down to ${hold.garrison}.`);
          return null;
        },
      },
      {
        label: () => `Demand Hold Surrender (Works if Garrison <= 40 & Player >= 3x)`,
        enabled: (g) => hostile && hold.garrison <= 45 && g.totalMen(g.playerRegiments) >= hold.garrison * 2.5,
        action: (g) => {
          g.captureHold(hold);
          g.screen = 'campaign';
          return null;
        },
      },
      {
        label: () => (hostile ? 'Hold Perimeter' : 'Parley peacefully & Ride Past'),
        action: (g) => {
          g.screen = 'campaign';
          return null;
        },
      },
    ],
  };
}

export function openPrisonerMenu(game, captive) {
  const house = game.getHouse(captive.houseId);
  return {
    id: 'prisoner_judgment',
    speaker: `CAPTIVE COMMANDER: ${captive.lordName.toUpperCase()}`,
    lineFn: () =>
      `Bound in chains after ${house.name}'s rout. Decide the fate of ${captive.lordName}:`,
    choices: [
      {
        label: () => 'Accept Silver Ransom (+135g Treasury, +8 Honor)',
        action: (g) => {
          g.getHouse('thorne').treasury += 135;
          g.getHouse('thorne').honor = Math.min(100, g.getHouse('thorne').honor + 8);
          house.relation = Math.min(100, house.relation + 10);
          g.playCue('seal');
          g.pushLog(`${captive.lordName} ransomed for 135g silver.`);
          g.screen = 'campaign';
          return null;
        },
      },
      {
        label: () => 'Hold in Blackpike Chains (-30% Betrayal Risk from their House)',
        action: (g) => {
          g.flags.hostages = (g.flags.hostages || 0) + 1;
          house.betrayalRisk = Math.max(0, house.betrayalRisk - 30);
          if (house.id !== 'dray') house.treaty = 'truce';
          g.pushLog(`${captive.lordName} locked in Blackpike tower as living surety.`);
          g.screen = 'campaign';
          return null;
        },
      },
      {
        label: () => 'Take His Head Before the Lines (+22 Dread, -18 Honor, Blood Feud!)',
        action: (g) => {
          const th = g.getHouse('thorne');
          th.dread = Math.min(100, th.dread + 22);
          th.honor = Math.max(0, th.honor - 18);
          house.relation = Math.max(-100, house.relation - 45);
          g.playCue('clash');
          g.pushLog(`Steel falls. ${captive.lordName} executed in view of all banners (+22 Dread)!`);
          g.screen = 'campaign';
          return null;
        },
      },
    ],
  };
}
