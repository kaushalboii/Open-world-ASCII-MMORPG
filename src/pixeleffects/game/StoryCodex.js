// StoryCodex: The Boundless Spiral — Lore of the 21 Primal Weaves & Infinite Levels
// Complete narrative of the Genesis Fracture, Endless Ascension, 244-Effect Classification, and Colossi Bestiary
// Authored by Kaushal (kaushalboii)

export class StoryCodex {
  constructor() {
    this.activeTab = 'STORY'; // 'STORY', 'ELEMENTS', 'TIERS', 'COLOSSI'
    this.scrollY = 0;

    this.elements = [
      { id: 'fire', name: 'Ignis Weave (Fire)', color: '#ff5722', count: 12, desc: 'Thermal combustion, living solar breath, flame pillars, and meteorites.' },
      { id: 'ice', name: 'Cryo Weave (Ice)', color: '#80d8ff', count: 10, desc: 'Absolute zero crystallizations, frost novas, and razor permafrost lances.' },
      { id: 'lightning', name: 'Fulgur Weave (Lightning)', color: '#ffd600', count: 11, desc: 'High-voltage atmospheric arcs, static discharges, and chain lightning.' },
      { id: 'nature', name: 'Verdant Weave (Nature)', color: '#00e676', count: 13, desc: 'Bioluminescent spore blooms, living root entanglements, and neurotoxins.' },
      { id: 'water', name: 'Abyssal Weave (Water)', color: '#29b6f6', count: 12, desc: 'Torrential downpours, rushing geysers, water jets, and whirlpools.' },
      { id: 'shadow', name: 'Umbral Weave (Shadow)', color: '#ea80fc', count: 12, desc: 'Event-horizon singularities, dark matter vortexes, and soul tendrils.' },
      { id: 'arcane', name: 'Chrono Weave (Arcane)', color: '#b388ff', count: 12, desc: 'Spatial rifts, phase-shift leylines, starfall matrices, and time distortions.' },
      { id: 'scifi', name: 'Quantum Weave (Sci-Fi)', color: '#00e5ff', count: 12, desc: 'EMP discharge grids, focused photon beams, tractor fields, and warp pads.' },
      { id: 'holy', name: 'Solar Weave (Holy)', color: '#fff9c4', count: 10, desc: 'Purging starlight halos, radiant sunbursts, and divine smite pillars.' },
      { id: 'explosions', name: 'Kinetic Weave (Explosion)', color: '#ff3d00', count: 12, desc: 'Concussive mortar barrages, powder detonations, and seismic shockwaves.' },
      { id: 'melee', name: 'Martial Weave (Melee)', color: '#ffffff', count: 12, desc: 'Straight punches, dagger flurries, crescent sword cleaves, and whirlwind strikes.' },
      { id: 'moves', name: 'Ascendant Moves (Acted)', color: '#76ff03', count: 12, desc: 'Full tactical martial moves combining windup, impact, and elemental finish.' },
      { id: 'projectiles', name: 'Ballistic Weave', color: '#ff9100', count: 13, desc: 'Photon blaster bolts, guided missiles, plasma shots, and energy waves.' },
      { id: 'impacts', name: 'Tremor Weave (Impacts)', color: '#ff5252', count: 11, desc: 'Critical strike bursts, ground shatter craters, and kinetic anime hit sparks.' },
      { id: 'spawn', name: 'Genesis Weave (Spawn)', color: '#e040fb', count: 10, desc: 'Spatial poofs, coin drops, resurrection beams, and soul dissolutions.' },
      { id: 'status', name: 'Ailment Weave (Status)', color: '#ff4081', count: 13, desc: 'Burning, freezing, poisoning, petrification, sleep, and confusion auras.' },
      { id: 'weather', name: 'Atmosphere Weave', color: '#80deea', count: 12, desc: 'Living aurora borealis, blizzards, cherry blossom drift, and thunderstorms.' },
      { id: 'ui', name: 'Glyphic Interface (UI)', color: '#00b0ff', count: 12, desc: 'Dynamic level up auras, floating damage texts, critical numbers, and toasts.' },
      { id: 'pickups', name: 'Relic Weave (Pickups)', color: '#ffd700', count: 11, desc: 'Aether Shards, treasure chest bursts, essence hearts, and surge stars.' },
      { id: 'transitions', name: 'Dimensional Wipes', color: '#651fff', count: 10, desc: 'Pixel dissolves, shatter wipes, burn-aways, and glitch dimensional iris.' },
      { id: 'critters', name: 'Sanctuary Fauna', color: '#c6ff00', count: 12, desc: 'Mountain sanctuary sheep, spectral wisps, flying skulls, and astral familiars.' },
    ];

    this.tiers = [
      {
        tier: 'TIER I: ELEMENTAL CRADLES',
        floors: 'FLOORS 1 — 10',
        element: 'Fire, Ice, Lightning, Nature, Water',
        boss: 'Floor 5: Pyroclast Titan | Floor 10: Glacial Archon',
        desc: 'The base chambers of the Boundless Spiral. Master your straight punch, unlock the Broadsword and Aether Blaster, and learn to jump between shifting platform elevations.',
      },
      {
        tier: 'TIER II: LEYLINE MATRIX',
        floors: 'FLOORS 11 — 25',
        element: 'Shadow, Arcane, Sci-Fi, Holy, Explosions',
        boss: 'Floor 15: Tempest Colossus | Floor 20: Void Wyrm | Floor 25: Chrono Overlord',
        desc: 'Advanced spatial dimensions flooded with laser grids, dark matter vortexes, and concussive artillery. Unlocks the Concussion Mortar and Tempest Wrath.',
      },
      {
        tier: 'TIER III: CELESTIAL HORIZON',
        floors: 'FLOORS 26 — 50',
        element: 'Weather, Status Mutations, Atmospheric Storms',
        boss: 'Floor 30: Quantum Titan | Floor 40: Seraph of Dawn | Floor 50: Primordial Wyrm',
        desc: 'High-altitude celestial voids where blizzards, auroras, and toxic fallout test your reflexes. Enemy resistance scales exponentially.',
      },
      {
        tier: 'TIER IV: FRACTAL CHAOS SYNTHESIS',
        floors: 'FLOORS 51 — INFINITY (∞)',
        element: 'Dual & Triple Element Synthesis (Cryo-Inferno, Void-Storm)',
        boss: 'Every 5th Floor: Infinite Scaled Colossi Trials',
        desc: 'The endless procedural depths of the cosmic lattice. Platforms, enemy density, hazards, and loot multipliers scale endlessly without any ceiling!',
      },
    ];

    this.colossi = [
      { name: 'Pyroclast Titan', floor: 'Floor 5 & 55+', elem: 'Fire / Cataclysm', desc: 'Ancient molten behemoth wielding Meteor Call, seismic ground pounds, and thermal ember storms.' },
      { name: 'Glacial Archon', floor: 'Floor 10 & 60+', elem: 'Ice / Absolute Zero', desc: 'Frozen monolith summoning sub-zero frost novas, ice wall barricades, and razor permafrost lances.' },
      { name: 'Tempest Colossus', floor: 'Floor 15 & 65+', elem: 'Lightning / High Voltage', desc: 'Ionized armor plate titan casting chain lightning bolts, electric fences, and screen-wide static storms.' },
      { name: 'Verdant Behemoth', floor: 'Floor 20 & 70+', elem: 'Nature / Neurotoxin', desc: 'Bioluminescent plant colossus bursting with toxic spore clouds, root entanglements, and acid mires.' },
      { name: 'Abyssal Leviathan', floor: 'Floor 25 & 75+', elem: 'Water / Deluge', desc: 'Deep oceanic terror unleashing torrential downpours, rushing waterjets, and violent whirlpool vortexes.' },
      { name: 'Void Wyrm', floor: 'Floor 30 & 80+', elem: 'Shadow / Singularity', desc: 'Dimensional serpent opening event-horizon black holes that pull and disintegrate all in its path.' },
      { name: 'Chrono Overlord', floor: 'Floor 35 & 85+', elem: 'Arcane / Time Dilation', desc: 'Master of temporal leylines, casting spatial time-stop fields, magic circle beams, and starfall.' },
      { name: 'Quantum Titan', floor: 'Floor 40 & 90+', elem: 'Sci-Fi / Quantum EMP', desc: 'High-frequency automaton deploying impenetrable force fields, laser sweeps, and tractor beam surges.' },
      { name: 'Seraph of Dawn', floor: 'Floor 45 & 95+', elem: 'Holy / Prismatic Light', desc: 'Ascendant celestial being raining purifying sunburst rays and heavenly pillars of righteous starlight.' },
      { name: 'Anomaly Zero', floor: 'Floor 50 & Infinite Floors', elem: 'Chaos / All 21 Weaves', desc: 'The fractured avatar of the Genesis Core, mutating between all 21 elements and challenging infinite wanderers.' },
    ];
  }

  handleClick(x, y, onStartFloor) {
    // Tabs at top (y: 80 - 112)
    if (y >= 75 && y <= 112) {
      if (x >= 40 && x <= 160) this.activeTab = 'STORY';
      else if (x >= 170 && x <= 330) this.activeTab = 'ELEMENTS';
      else if (x >= 340 && x <= 500) this.activeTab = 'TIERS';
      else if (x >= 510 && x <= 670) this.activeTab = 'COLOSSI';
    }

    // Quick Ascend Button in Tiers tab
    if (this.activeTab === 'TIERS') {
      if (y >= 445 && y <= 495 && x >= 320 && x <= 640) {
        const best = parseInt(localStorage.getItem('spiral_best_floor') || '1');
        if (onStartFloor) onStartFloor(best);
      }
    }
  }

  draw(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = '#07070d';
    ctx.fillRect(0, 0, width, height);

    // Grid backdrop
    ctx.strokeStyle = '#141420';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Header Title
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 23px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('📜 THE BOUNDLESS SPIRAL — LORE OF THE 21 PRIMAL WEAVES', 40, 44);

    ctx.fillStyle = '#ffea00';
    ctx.font = '11.5px "Courier New", monospace';
    ctx.fillText('Infinite Procedural Action RPG by Kaushal (kaushalboii) • All 244 Visual Effects Engine • Zero External Assets', 40, 64);

    // Tab Bar
    const tabs = [
      { id: 'STORY', label: '📖 THE SPIRAL SAGA' },
      { id: 'ELEMENTS', label: '🔮 21 WEAVES (244 VFX)' },
      { id: 'TIERS', label: '🗺️ INFINITE TIERS (1-∞)' },
      { id: 'COLOSSI', label: '👾 COLOSSI BESTIARY' },
    ];

    tabs.forEach((tab, i) => {
      const tabX = 40 + i * 160;
      const isActive = this.activeTab === tab.id;

      ctx.fillStyle = isActive ? '#1c1c2e' : '#101018';
      ctx.fillRect(tabX, 82, 150, 28);
      ctx.strokeStyle = isActive ? '#00f0ff' : '#333348';
      ctx.strokeRect(tabX, 82, 150, 28);

      ctx.fillStyle = isActive ? '#ffffff' : '#8888aa';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, tabX + 75, 100);
    });

    ctx.textAlign = 'left';

    if (this.activeTab === 'STORY') {
      this.drawStoryTab(ctx, width, height);
    } else if (this.activeTab === 'ELEMENTS') {
      this.drawElementsTab(ctx, width, height);
    } else if (this.activeTab === 'TIERS') {
      this.drawTiersTab(ctx, width, height);
    } else if (this.activeTab === 'COLOSSI') {
      this.drawColossiTab(ctx, width, height);
    }

    ctx.restore();
  }

  drawStoryTab(ctx, width, height) {
    const boxX = 40;
    const boxY = 124;
    const boxW = width - 80;
    const boxH = 384;

    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#222238';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const paragraphs = [
      'PROLOGUE: THE GENESIS FRACTURE',
      'At the dawn of the cosmic continuum, existence was held in equilibrium by the Genesis Core,',
      'an ancient hyper-prism that synthesized the 21 Fundamental Weaves of reality: Flame, Frost, Storm,',
      'Verdant Flora, Abyssal Oceans, Umbral Void, Arcane Chrono, Quantum Photons, and Kinetic Ordnance.',
      '',
      'THE BIRTH OF THE BOUNDLESS SPIRAL',
      'When an unknown anomaly triggered the Great Fracture, physical reality collapsed into an infinite,',
      'ascending dimensional fractal known as The Boundless Spiral. Floor upon floor, reality endlessly',
      'reconstructs itself in infinite chambers, each governed by primal elemental mutators.',
      '',
      'KAIDEN THE SPIRAL WANDERER',
      'You are Kaiden — a warrior bound to the Primal Resonance. Wearing the Fractal Visor and the Flux Ribbon Scarf,',
      'you possess the unique ability to channel and master all 244 elemental arts through martial discipline.',
      'Armed with your rapid Dusk Dagger, iconic martial straight punch, and procedural Inverse Kinematics stances,',
      'you step into the first chamber to begin an ascent with no ceiling.',
      '',
      'THE INFINITE PROGRESSION & CELESTIAL GATES',
      'There is no final floor. Every chamber challenges you to purge elemental hostiles, leap across procedurally',
      'shifting platforms, shatter relic crates, and confront colossal Boss Guardians every 5th floor. Clearing a floor',
      'aligns the Celestial Ascension Gate on the far right, propelling you into Floor 2, 3, 4, 10, 50, 100, and beyond!',
    ];

    let py = boxY + 26;
    for (const line of paragraphs) {
      if (line.includes(':') && !line.includes('http')) {
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 13px "Courier New", monospace';
      } else {
        ctx.fillStyle = '#ccccdd';
        ctx.font = '12px "Courier New", monospace';
      }
      ctx.fillText(line, boxX + 22, py);
      py += 18;
    }
  }

  drawElementsTab(ctx, width, height) {
    const startX = 40;
    const startY = 124;

    this.elements.forEach((elm, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cardX = startX + col * 295;
      const cardY = startY + row * 52;

      if (cardY + 46 > height - 16) return;

      ctx.fillStyle = '#0e0e18';
      ctx.fillRect(cardX, cardY, 286, 46);
      ctx.strokeStyle = elm.color;
      ctx.strokeRect(cardX, cardY, 286, 46);

      ctx.fillStyle = elm.color;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`◆ ${elm.name.toUpperCase()} (${elm.count})`, cardX + 10, cardY + 18);

      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(elm.desc.slice(0, 38) + '...', cardX + 10, cardY + 34);
    });
  }

  drawTiersTab(ctx, width, height) {
    const startX = 40;
    let cardY = 124;

    this.tiers.forEach((t) => {
      ctx.fillStyle = '#0e0e18';
      ctx.fillRect(startX, cardY, width - 80, 74);
      ctx.strokeStyle = '#00f0ff';
      ctx.strokeRect(startX, cardY, width - 80, 74);

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(`${t.tier} [ ${t.floors} ]`, startX + 16, cardY + 20);

      ctx.fillStyle = '#ffea00';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`ELEMENTS: ${t.element} | BOSSES: ${t.boss}`, startX + 16, cardY + 38);

      ctx.fillStyle = '#ccccdd';
      ctx.font = '10.5px "Courier New", monospace';
      ctx.fillText(t.desc, startX + 16, cardY + 58);

      cardY += 80;
    });

    // Quick Play CTA Button
    const bestFloor = parseInt(localStorage.getItem('spiral_best_floor') || '1');
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(320, 448, 320, 40);
    ctx.fillStyle = '#050508';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`▶ ASCEND FROM HIGHEST FLOOR (${bestFloor})`, 480, 473);
  }

  drawColossiTab(ctx, width, height) {
    const startX = 40;
    const startY = 124;

    this.colossi.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardX = startX + col * 445;
      const cardY = startY + row * 66;

      if (cardY + 58 > height - 16) return;

      ctx.fillStyle = '#0e0e18';
      ctx.fillRect(cardX, cardY, 430, 58);
      ctx.strokeStyle = '#ff2255';
      ctx.strokeRect(cardX, cardY, 430, 58);

      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 12.5px "Courier New", monospace';
      ctx.fillText(`⚔️ ${c.name} [${c.floor}]`, cardX + 12, cardY + 20);

      ctx.fillStyle = '#ffea00';
      ctx.font = '10.5px "Courier New", monospace';
      ctx.fillText(`ELEMENT: ${c.elem}`, cardX + 12, cardY + 35);

      ctx.fillStyle = '#bbbbcc';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(c.desc, cardX + 12, cardY + 49);
    });
  }
}
