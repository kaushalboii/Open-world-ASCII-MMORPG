/**
 * Literary branching dialogue, shop tempering definitions, and parish lore notes.
 */

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
