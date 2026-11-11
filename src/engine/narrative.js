/**
 * Literary branching dialogue, shop tempering definitions, and parish lore notes.
 */

export const STORY_BEATS = {
  prologue: {
    id: 'prologue',
    title: 'PROLOGUE: SEVEN WINTERS OF FOG',
    lines: [
      "Magistrate Vane drowned Marren Valley's five parish bells under Sealed Order No. 14,",
      'leaving every flooded hamlet blinded in perpetual salt mist. You land as Oren',
      'with a whale-oil lantern and a bronze tuning fork tuned to wake metal through silt.',
    ],
    now: 'Speak to Old Hester (H) [E] beside you, then walk North to Sunken Orchard.',
    next: 'Find 5 stolen Clappers (!) and ring each silent Belfry (b) to scatter the fog.',
    chronicle: 'Seven winters since Vane sank the 5 bells. Speak w/ Hester [E] -> Orchard North.',
  },
  region_orchard: {
    id: 'region_orchard',
    title: 'CHAPTER I: THE SUNKEN ORCHARD',
    lines: [
      'Flooded apple rows rot without noon bell-wind to scatter estuary damp. Salt veins',
      'crust the western root-house where Orchard keepers hid the first parish clapper.',
    ],
    now: 'Search Root-House NW (18,29) for 1st Clapper (!); crack salt (%) w/ [Space] Fork.',
    next: 'Carry it East to Orchard Belfry (58,34) and toll [E] to lift Orchard mist.',
    chronicle: 'Entered Sunken Orchard: seek 1st Clapper (!) in NW Root-House.',
  },
  region_nave: {
    id: 'region_nave',
    title: "CHAPTER II: ST. JUDE'S FLOODED NAVE",
    lines: [
      'Rain spears through shattered limestone arches. Prior Tomas keeps vigil beside the',
      'choir chasm where Vane chained up the oak plank bridge from the northwest loft.',
    ],
    now: 'Speak w/ Prior Tomas [E], climb NW loft, pull Choir Winch (&) [E] at (83,12).',
    next: 'Cross fallen plank East, fell Halberdier, take Clapper (!) -> ring Tenor Bell.',
    chronicle: "Entered St. Jude's Nave: pull NW loft winch (&) [E] to drop choir bridge.",
  },
  region_causeway: {
    id: 'region_causeway',
    title: 'CHAPTER III: BRAMWELL CAUSEWAY',
    lines: [
      'A battered limestone dike spans black marshes toward the Kiln-Town of Redwick.',
      'Legend says sunken shoal-stones (~) south of the parapet hide an old sailor relic.',
    ],
    now: 'Walk East along dike to Redwick (or strike [Space] Fork south to reveal shoals).',
    next: 'Toll any 2 Parish Bells to lift the northern High Foundry Sluice Gate.',
    chronicle: 'Entered Bramwell Causeway: head East to Redwick, or [Space] Fork south waves.',
  },
  region_redwick: {
    id: 'region_redwick',
    title: 'CHAPTER IV: KILN-TOWN OF REDWICK',
    lines: [
      'Beehive coke ovens hiss against salt drizzle. Smith Marrow hammers brass at the',
      'square anvil while Watchman Callum guards the heavy northern Foundry sluice gate.',
    ],
    now: 'Crack SE Soot-Warehouse (%) w/ [Space] for Clapper (!); temper gear w/ Marrow [E].',
    next: 'Ring Redwick Bell (b), aid Pip south in Salt Flats, or pass Foundry Gate north.',
    chronicle: 'Entered Kiln-Town Redwick: Marrow tempers gear [E]; 3rd Clapper lies SE.',
  },
  region_saltflats: {
    id: 'region_saltflats',
    title: 'CHAPTER V: WRECK OF THE CORMORANT',
    lines: [
      'Bleached salt flats ring the split timber ribs of the harbor dredger Cormorant.',
      'Translucent Stalkers (S) vanish in brine haze unless held in beam light or [Space].',
    ],
    now: 'Rescue Apprentice Pip [E] by the wreck; take Aft Clapper (!) east [Keep Lamp Lit].',
    next: 'Carry Clapper North to Breakwater Crane Bell (220,65) -> Toll [E].',
    chronicle: 'Entered Low Sunder Flats: aid Apprentice Pip [E] & keep lamp lit for Stalkers.',
  },
  region_foundry: {
    id: 'region_foundry',
    title: 'FINALE: THE HIGH FOUNDRY DAM',
    lines: [
      'Riveted gantry cranes hang above molten slag channels. Magistrate Vane waits by the',
      'dam crest in riveted diving brass, gripping the Fifth Master Clapper at his belt.',
    ],
    now: 'Avoid glowing slag (=/*), bronze-parry [K] Vane windups (!), defeat Vane (V)!',
    next: 'Claim Fifth Clapper (!) from Vane -> Toll Master Dam Bell north for Estuary Dawn.',
    chronicle: 'Entered High Foundry Dam: defeat Magistrate Vane (V) to claim 5th Clapper.',
  },
  milestone_sluice: {
    id: 'milestone_sluice',
    title: 'THE FOUNDRY SLUICE RISES',
    lines: [
      'Twin parish bells echo upriver in harmony. Far up in Redwick square, iron dam',
      'counterweights thunder downward--lifting the locked sluice gate to High Foundry!',
    ],
    now: 'Pass North through Redwick gate (173,35) into Foundry, or sweep Salt Flats south.',
    next: 'Gather remaining Clappers (!) and settle Magistrate Vane above the slag vats.',
    chronicle: 'Two bells awakened the northern Foundry Sluice Gate in Redwick!',
  },
  milestone_vane: {
    id: 'milestone_vane',
    title: 'THE FIFTH CLAPPER FALLS',
    lines: [
      "Magistrate Vane's brass diving helm cracks beside the cooling gantry rails. From his",
      'belt drops the Fifth Master Clapper--the last silent tongue holding Marren in fog.',
    ],
    now: 'Carry Fifth Master Clapper north to Master Dam Bell (213,9) and press [E]!',
    next: 'All five parish bells singing together will sweep seven winters of fog to sea.',
    chronicle: 'Magistrate Vane felled! Carry 5th Clapper north to Master Dam Bell [E].',
  },
};

function bearingLabel(px, py, tx, ty) {
  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.abs(dx) + Math.abs(dy);
  if (dist <= 2) return 'HERE!';
  let ns = '';
  let ew = '';
  if (dy < -2 && Math.abs(dy) * 2 >= Math.abs(dx)) ns = 'N';
  else if (dy > 2 && Math.abs(dy) * 2 >= Math.abs(dx)) ns = 'S';
  if (dx > 2 && Math.abs(dx) * 2 >= Math.abs(dy)) ew = 'E';
  else if (dx < -2 && Math.abs(dx) * 2 >= Math.abs(dy)) ew = 'W';
  const dir = `${ns}${ew}` || (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'));
  return `${dir} ${dist}`;
}

export function wrapLines(text, maxWidth) {
  if (!text || maxWidth <= 0) return [];
  const words = text.split(/\s+/);
  const out = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= maxWidth) cur += ` ${w}`;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function computeCurrentObjective(game) {
  const { x: px, y: py } = game.player;
  const belfries = game.world.belfries;
  const bellsRung = game.bellsRungCount();
  const curReg = game.world.regionAt(px, py);

  if (bellsRung >= 5) {
    return {
      chapter: 'DAWN',
      target: null,
      now: 'All 5 Parish Bells sing across Marren Valley!',
      next: 'Explore lit parishes or [Tab] Chart',
    };
  }

  // Priority 1: Player is already carrying an un-rung clapper -> deliver & ring it!
  const carried = belfries
    .filter((b) => !b.rung && game.player.clappers.has(b.clapperId))
    .sort((a, b) => (a.region === curReg ? -1 : b.region === curReg ? 1 : a.index - b.index));
  if (carried.length > 0) {
    const targetBell = carried[0];
    const br = bearingLabel(px, py, targetBell.x, targetBell.y);
    const nextHint =
      bellsRung === 1 && !game.flags.sluice_open
        ? 'Lifts Redwick Sluice Gate'
        : bellsRung === 4
          ? '5th bell clears valley fog!'
          : bellsRung === 0
            ? "St. Jude's Nave NE"
            : '[Tab] Chart next bell';
    return {
      chapter: `BELL ${bellsRung + 1}/5`,
      target: [targetBell.x, targetBell.y],
      now:
        br === 'HERE!'
          ? `Press [E] NOW to toll ${targetBell.name}!`
          : `Toll ${targetBell.name} [E] (${br})`,
      next: nextHint,
    };
  }

  // Helper building chapter goals cleanly by region
  const boss = game.enemies.find((e) => e.tpl.isBoss);
  const vaneAlive = boss ? boss.alive : !game.flags.vane_defeated;
  const bellById = Object.fromEntries(belfries.map((b) => [b.id, b]));

  const regionChapter = (reg) => {
    if (reg === 'orchard' && !bellById.bell_orchard.rung) {
      const br = bearingLabel(px, py, 18, 29);
      return {
        chapter: 'CH.I ORCHARD',
        target: [18, 29],
        now: `Root-House Clapper (!) (${br}) [Space] %`,
        next: 'Orchard Belfry (58,34) -> [E]',
      };
    }
    if (reg === 'nave' && !bellById.bell_nave.rung) {
      if (!game.flags.pulley_pulled) {
        const br = bearingLabel(px, py, 83, 12);
        return {
          chapter: 'CH.II ST.JUDE',
          target: [83, 12],
          now: `Choir Winch (&) [E] NW loft (${br})`,
          next: 'Cross plank E -> Nave Clapper (!)',
        };
      }
      const br = bearingLabel(px, py, 99, 11);
      return {
        chapter: 'CH.II ST.JUDE',
        target: [99, 11],
        now: `Nave Clapper (!) E of plank (${br})`,
        next: 'Toll Tenor -> Opens Foundry Sluice',
      };
    }
    if (reg === 'redwick' && !bellById.bell_redwick.rung) {
      const br = bearingLabel(px, py, 193, 60);
      return {
        chapter: 'CH.IV REDWICK',
        target: [193, 60],
        now: `SE Warehouse (%) [Space] Clapper (${br})`,
        next: 'Ring Redwick Bell & Marrow [E]',
      };
    }
    if (reg === 'saltflats' && !bellById.bell_breakwater.rung) {
      if (!game.flags.pip_rescued) {
        const br = bearingLabel(px, py, 206, 77);
        return {
          chapter: 'CH.V FLATS',
          target: [206, 77],
          now: `Rescue Pip [E] at wreck (${br}) [Lamp Lit]`,
          next: 'Aft Clapper (!) E -> Crane Bell',
        };
      }
      const br = bearingLabel(px, py, 224, 77);
      return {
        chapter: 'CH.V FLATS',
        target: [224, 77],
        now: `Breakwater Clapper (!) E (${br}) [Space] S`,
        next: 'Toll Crane Bell (220,65) -> [E]',
      };
    }
    if (reg === 'foundry' && !bellById.bell_foundry.rung && vaneAlive) {
      const bx = boss ? boss.x : 212;
      const by = boss ? boss.y : 16;
      const br = bearingLabel(px, py, bx, by);
      return {
        chapter: 'FINALE',
        target: [bx, by],
        now: `Parry [K] & fell Magistrate Vane (${br})`,
        next: '5th Clapper -> Toll Dam Bell (213,9)',
      };
    }
    return null;
  };

  if (curReg === 'tidemouth' && !game.flags.met_hester && game.stats.steps < 6) {
    const br = bearingLabel(px, py, 27, 67);
    return {
      chapter: 'PROLOGUE',
      target: [27, 67],
      now: `Speak Old Hester (H) [E] (${br})`,
      next: 'Find 1st Clapper (!) in Orchard NW',
    };
  }

  // Prefer active goal in current region if player already ventured there cleanly
  const localObj = regionChapter(curReg);
  if (localObj) return localObj;

  // Otherwise follow canonical progression chain
  for (const r of ['orchard', 'nave', 'redwick', 'saltflats', 'foundry']) {
    if (r === 'foundry' && !game.flags.sluice_open && bellsRung < 2) continue;
    const step = regionChapter(r);
    if (step) return step;
  }

  return regionChapter('foundry') || {
    chapter: 'MARREN',
    target: [58, 34],
    now: 'Seek silent Parish Belfries (b) on [Tab] Parchment',
    next: 'Ring all 5 bells to break Sealed Order No. 14',
  };
}

export const NOTES_TEXT = {
  note_pier: [
    'TIDEMOUTH MILESTONE (CHISELED)',
    'Seven miles upriver to Redwick kilns. Keep oil hooded past dusk; salt-hounds hunt lamp-grease.',
  ],
  note_shoal: [
    'DROWNED TIDE TABLE (OILCLOTH)',
    'Magistrate Vane sank the five parish tongues at low neap. Only forked bronze rings true through silt.',
  ],
  note_foundry: [
    'SEALED ORDER NO. 14',
    'All bells in Marren Valley forfeit to Dam Custody. Whoso raises brass above roof-level forfeits his breath.',
  ],
};

export const BLADE_TIERS = [
  [1, 'Pitted Iron Fork', 10, 0],
  [2, 'Burnished Bronze Edge', 15, 35],
  [3, 'Bell-Metal Sabre', 22, 70],
];

export const LAMP_TIERS = [
  [1, 'Tin Hurricane Lamp', 100, 0],
  [2, 'Double-Wick Copper Lamp', 135, 30],
  [3, 'Beacon Fresnel Core', 175, 65],
];

function temperBlade(g) {
  const tier = g.player.bladeTier;
  if (tier >= BLADE_TIERS.length) return;
  const [, name, , cost] = BLADE_TIERS[tier];
  if (g.player.brass >= cost) {
    g.player.brass -= cost;
    g.player.bladeTier += 1;
    g.recomputePlayerStats();
    g.addLog(`Marrow folds bronze sparks into your grip -> ${name}.`);
    g.emitSfx('temper');
  }
}

function upgradeLamp(g) {
  const tier = g.player.lampTier;
  if (tier >= LAMP_TIERS.length) return;
  const [, name, , cost] = LAMP_TIERS[tier];
  if (g.player.brass >= cost) {
    g.player.brass -= cost;
    g.player.lampTier += 1;
    g.recomputePlayerStats();
    g.player.oil = g.player.maxOil;
    g.addLog(`Copper reflector fitted -> ${name} (oil topped off).`);
    g.emitSfx('temper');
  }
}

function buyOil(g) {
  if (g.player.brass >= 12 && (g.player.oil < g.player.maxOil || g.player.poultices < 4)) {
    g.player.brass -= 12;
    g.player.oil = g.player.maxOil;
    g.player.poultices = Math.min(4, g.player.poultices + 1);
    g.addLog('Flasks topped with filtered whale-oil and a fresh reed poultice.');
    g.emitSfx('heal');
  }
}

function rescuePip(g) {
  if (!g.flags.pip_rescued) {
    g.flags.pip_rescued = true;
    g.player.brass += 45;
    g.player.oil = Math.min(g.player.maxOil, g.player.oil + 25);
    g.addLog('Pip slips 45 Brass & spare oil into your coat before slipping north toward Redwick.');
  }
}

export function buildDialogueNodes() {
  return {
    hester_root: {
      id: 'hester_root',
      speaker: 'Old Hester',
      onEnter: (g) => {
        if (!g.flags.met_hester) {
          g.flags.met_hester = true;
          g.addLog("Hester: 'Walk North to Orchard Root-House for the 1st Clapper (!), Oren.'");
        }
      },
      lineFn: (g) => {
        const n = g.bellsRungCount();
        if (n === 0) return 'Old Hester: Seven winters since bronze sang here. Keep your fork dry, Oren.';
        if (n < 5) return `Old Hester: I heard bell-wind roll downriver (${n}/5 lit). My boat planks stopped groaning.`;
        return 'Old Hester: All five tongues awake. Look at the water—even the mist remembers which way is sea.';
      },
      choices: [
        { label: 'Five parish clappers', to: 'hester_clappers' },
        { label: 'Breaking salt crystals', to: 'hester_fork' },
        { label: 'Step back to pier', to: 'END' },
      ],
    },
    hester_clappers: {
      id: 'hester_clappers',
      speaker: 'Old Hester',
      lineFn: () => "Old Hester: First lies north in the Orchard root-house. Rest wait in Jude's choir, Redwick warehouse, Cormorant wreck, and Vane's dam.",
      choices: [{ label: 'Understood.', to: 'hester_root' }],
    },
    hester_fork: {
      id: 'hester_fork',
      speaker: 'Old Hester',
      lineFn: () => "Old Hester: Salt veins ring hollow (%). Strike your tuning fork [Space] close to crack 'em, or rattle hooded wardens off balance.",
      choices: [{ label: "I'll test it near the shed.", to: 'hester_root' }],
    },
    tomas_root: {
      id: 'tomas_root',
      speaker: 'Prior Tomas',
      lineFn: (g) => {
        if (g.flags.bell_nave_rung) return 'Prior Tomas: Hear how the vault answers cleanly? Silence was never mercy—it was hiding.';
        if (g.flags.pulley_pulled) return 'Prior Tomas: The oak plank fell across the choir trench. Only the Vestry Halberdier keeps the tongue.';
        return 'Prior Tomas: Vane chained the nave bridge from the northwest confessional loft. Mud swallowed our hymnals.';
      },
      choices: [
        { label: 'Why sink the bells?', to: 'tomas_why' },
        { label: 'Secret dike shoal', to: 'tomas_shoal' },
        { label: 'Leave altar', to: 'END' },
      ],
    },
    tomas_why: {
      id: 'tomas_why',
      speaker: 'Prior Tomas',
      lineFn: () => 'Prior Tomas: A bell tells sailors and townsfolk the same hour. Fog makes every hamlet fend alone. That was his fear.',
      choices: [{ label: 'Wait by the candle', to: 'tomas_root' }],
    },
    tomas_shoal: {
      id: 'tomas_shoal',
      speaker: 'Prior Tomas',
      lineFn: () => 'Prior Tomas: Below Bramwell Causeway lie sunken causeway-stones beneath black surf. Strike your fork at the southern parapet to see them gleam.',
      choices: [{ label: 'Thank you, Prior.', to: 'tomas_root' }],
    },
    marrow_root: {
      id: 'marrow_root',
      speaker: 'Smith Marrow',
      lineFn: (g) => {
        const b = g.player.brass;
        if (g.flags.bell_redwick_rung) {
          return `Smith Marrow: All three coke chimneys draw air again! Got ${b} stamped brass—want your edge dressed?`;
        }
        return `Smith Marrow: Damp kills good steel faster than bone. Bring salvaged brass (${b} in pouch) and I'll fold it.`;
      },
      choices: [
        {
          label: 'Temper Blade (35B)',
          to: 'marrow_root',
          cond: (g) => g.player.bladeTier === 1 && g.player.brass >= 35,
          effect: temperBlade,
        },
        {
          label: 'Bell Sabre (70B)',
          to: 'marrow_root',
          cond: (g) => g.player.bladeTier === 2 && g.player.brass >= 70,
          effect: temperBlade,
        },
        {
          label: 'Copper Lamp (30B)',
          to: 'marrow_root',
          cond: (g) => g.player.lampTier === 1 && g.player.brass >= 30,
          effect: upgradeLamp,
        },
        {
          label: 'Fresnel Lamp (65B)',
          to: 'marrow_root',
          cond: (g) => g.player.lampTier === 2 && g.player.brass >= 65,
          effect: upgradeLamp,
        },
        {
          label: 'Oil+Poultice (12B)',
          to: 'marrow_root',
          cond: (g) => g.player.brass >= 12 && (g.player.oil < g.player.maxOil || g.player.poultices < 4),
          effect: buyOil,
        },
        { label: 'Foundry path', to: 'marrow_foundry' },
        { label: 'Leave anvil', to: 'END' },
      ],
    },
    marrow_foundry: {
      id: 'marrow_foundry',
      speaker: 'Smith Marrow',
      lineFn: () => "Smith Marrow: Ring two parish bells to lift Callum's sluice gate north—or cross Jude's east bridge and crack the old vent salt wall.",
      choices: [{ label: 'Back to the anvil', to: 'marrow_root' }],
    },
    callum_root: {
      id: 'callum_root',
      speaker: 'Watchman Callum',
      lineFn: (g) => {
        if (g.flags.pip_rescued) return 'Watchman Callum: Pip limped in smelling of bilge salt. Redwick owes you clear passage.';
        if (g.flags.callum_quest) return 'Watchman Callum: My apprentice Pip went south to the wrecked Cormorant at dawn. Sluice gate opens once two bells ring.';
        return 'Watchman Callum: Two parish bells rung wakes the Foundry sluice gate. Till then, even iron rusts shut.';
      },
      choices: [
        {
          label: 'Where is Apprentice Pip?',
          to: 'callum_pip',
          effect: (g) => { g.flags.callum_quest = true; },
        },
        { label: 'Redwick clapper location', to: 'callum_clapper' },
        { label: 'Move along', to: 'END' },
      ],
    },
    callum_pip: {
      id: 'callum_pip',
      speaker: 'Watchman Callum',
      lineFn: () => 'Watchman Callum: South past the jetty stairs where the dredger Cormorant broke her spine. Things out there fade into fog.',
      choices: [{ label: "I'll find him.", to: 'callum_root' }],
    },
    callum_clapper: {
      id: 'callum_clapper',
      speaker: 'Watchman Callum',
      lineFn: () => 'Watchman Callum: Locked in the east soot-warehouse when Cinder-Crawlers nested the coal bins. Spire stairs wait north of square.',
      choices: [{ label: 'Noted.', to: 'callum_root' }],
    },
    pip_root: {
      id: 'pip_root',
      speaker: 'Apprentice Pip',
      lineFn: (g) => {
        if (g.flags.pip_rescued) return 'Apprentice Pip: Stay beside the hull if Stalkers draw near—a raised lamp shows their spears before they strike.';
        return "Apprentice Pip: Don't lower your lantern! Things stand invisible in salt-haze till light or bell-ring hits them.";
      },
      choices: [
        {
          label: 'Send Pip north to Redwick (+45B)',
          to: 'pip_saved',
          cond: (g) => !g.flags.pip_rescued,
          effect: rescuePip,
        },
        { label: 'Leave wreck cove', to: 'END' },
      ],
    },
    pip_saved: {
      id: 'pip_saved',
      speaker: 'Apprentice Pip',
      lineFn: () => "Apprentice Pip: Thank heaven someone still carries true bronze. Take this brass—I saw the fourth clapper sealed inside Cormorant's aft hold!",
      choices: [{ label: 'Go safely, Pip.', to: 'END' }],
    },
  };
}
