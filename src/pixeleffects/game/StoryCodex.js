// StoryCodex: Chronicles of Aetheria & The 21 Primal Seals
// Original Narrative, Bestiary, Chapter Progression, and 244-Effect Archive
// Created by Kaushal (kaushalboii)

export class StoryCodex {
  constructor() {
    this.activeTab = 'STORY'; // 'STORY', 'ELEMENTS', 'CHAPTERS', 'BESTIARY'
    this.scrollY = 0;

    this.elements = [
      { id: 'arcane', name: 'Arcane Runic Matrix', color: '#b388ff', count: 22, desc: 'Phase-shift leylines, spatial rifts, and telekinetic ward barriers.' },
      { id: 'fire', name: 'Primal Flame', color: '#ff5722', count: 26, desc: 'Living solar ignition, thermal flares, and supernova shockwaves.' },
      { id: 'ice', name: 'Glacial Cryo', color: '#80d8ff', count: 18, desc: 'Absolute zero crystallizations, permafrost lances, and blizzards.' },
      { id: 'lightning', name: 'Tempest Voltage', color: '#ffd600', count: 24, desc: 'Celestial thunderbolts, chain ionization arcs, and atmospheric charge.' },
      { id: 'nature', name: 'Verdant Essence', color: '#00e676', count: 16, desc: 'Neurotoxic spores, thorny living briars, and fungal blooms.' },
      { id: 'holy', name: 'Radiant Luminance', color: '#fff9c4', count: 15, desc: 'Sacred aether pillars, prismatic halos, and purging starlight.' },
      { id: 'shadow', name: 'Umbral Void', color: '#ea80fc', count: 20, desc: 'Abyssal gravity wells, shadowy tendrils, and void rifts.' },
      { id: 'scifi', name: 'Aetheric Photon', color: '#00e5ff', count: 24, desc: 'High-density focused energy beams, plasma bursts, and light vectors.' },
      { id: 'melee', name: 'Forged Steel', color: '#e0e0e0', count: 34, desc: 'Martial crescent sweeps, dagger flurries, and broadsword cleaves.' },
      { id: 'explosions', name: 'Kinetic Ordnance', color: '#ff3d00', count: 20, desc: 'Concussive mortar blasts, powder detonations, and shock tremors.' },
      { id: 'pickups', name: 'Aetherial Relics', color: '#ffea00', count: 28, desc: 'Gleaming Aether Shards, green essence orbs, dew hearts, and surge stars.' },
      { id: 'critters', name: 'Sanctuary Fauna', color: '#ffffff', count: 12, desc: 'Fluffy mountain sheep, spiritual wisps, and airborne familiars.' },
      { id: 'weather', name: 'Terrace Atmosphere', color: '#80deea', count: 15, desc: 'Caustic rainfall, volcanic fallout ash, and high-altitude mist.' },
    ];

    this.chapters = [
      {
        num: 1,
        title: 'TERRACE I: AZURE SKYLINE',
        location: 'High Warden Sanctuary',
        ally: 'Commander Roland (Ω)',
        threat: 'Clockwork Recon Drones & Sludge Creepers',
        desc: 'Valen awakens at the sacred wind-swept sanctuary. Commander Roland charges Valen with repelling the clockwork vanguard, smashing Malakor’s siege crates for Aether Shards, and unlocking the Leyline Gate.',
      },
      {
        num: 2,
        title: 'TERRACE II: SUNKEN CISTERN',
        location: 'Subterranean Aqueduct Network',
        ally: 'Alchemist Lyra (Ψ)',
        threat: 'Blight Crushers & Corrosive Acid Pits',
        desc: 'Deep below the crystalline peaks, caustic industrial runoff floods the aqueducts. Alchemist Lyra equips Valen with corrosive poison flasks to dissolve heavy armored automata while leaping across pipelines.',
      },
      {
        num: 3,
        title: 'TERRACE III: DREAD CITADEL',
        location: 'Heart of the Clockwork Throne',
        ally: 'High Seer Elyon (Φ)',
        threat: 'Lord Malakor (The Dread Automaton Titan)',
        desc: 'The monolithic forge where Malakor siphons the 21 Primal Seals. High Seer Elyon awakens Valen’s ultimate Tempest Wrath so he can conquer Malakor and restore eternal equilibrium to Aetheria!',
      },
    ];
  }

  handleClick(x, y, onStartChapter) {
    // Tabs at top (y: 80 - 110)
    if (y >= 75 && y <= 110) {
      if (x >= 40 && x <= 160) this.activeTab = 'STORY';
      else if (x >= 170 && x <= 310) this.activeTab = 'ELEMENTS';
      else if (x >= 320 && x <= 460) this.activeTab = 'CHAPTERS';
      else if (x >= 470 && x <= 610) this.activeTab = 'BESTIARY';
    }

    // Play Mission button
    if (this.activeTab === 'CHAPTERS') {
      if (y >= 450 && y <= 490 && x >= 340 && x <= 620) {
        if (onStartChapter) onStartChapter(1);
      }
    }
  }

  draw(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = '#07070d';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
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
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('📜 VALEN: CHRONICLES OF AETHERIA — THE 21 PRIMAL SEALS', 40, 44);

    ctx.fillStyle = '#ffea00';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('Original Action Adventure by Kaushal (kaushalboii) • Procedural Fluid Engine • Zero External Assets', 40, 64);

    // Tab Bar
    const tabs = [
      { id: 'STORY', label: '📖 THE CHRONICLES' },
      { id: 'ELEMENTS', label: '🔮 21 PRIMAL SEALS (244 VFX)' },
      { id: 'CHAPTERS', label: '🗺️ ASCENSION TERRACES' },
      { id: 'BESTIARY', label: '👾 ALLIES & AUTOMATA' },
    ];

    tabs.forEach((tab, i) => {
      const tabX = 40 + i * 150;
      const isActive = this.activeTab === tab.id;

      ctx.fillStyle = isActive ? '#1c1c2e' : '#101018';
      ctx.fillRect(tabX, 82, 140, 28);
      ctx.strokeStyle = isActive ? '#00f0ff' : '#333348';
      ctx.strokeRect(tabX, 82, 140, 28);

      ctx.fillStyle = isActive ? '#ffffff' : '#8888aa';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, tabX + 70, 100);
    });

    ctx.textAlign = 'left';

    if (this.activeTab === 'STORY') {
      this.drawStoryTab(ctx, width, height);
    } else if (this.activeTab === 'ELEMENTS') {
      this.drawElementsTab(ctx, width, height);
    } else if (this.activeTab === 'CHAPTERS') {
      this.drawChaptersTab(ctx, width, height);
    } else if (this.activeTab === 'BESTIARY') {
      this.drawBestiaryTab(ctx, width, height);
    }

    ctx.restore();
  }

  drawStoryTab(ctx, width, height) {
    const boxX = 40;
    const boxY = 126;
    const boxW = width - 80;
    const boxH = 380;

    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#222238';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const paragraphs = [
      'PROLOGUE: THE BALANCE OF AETHERIA',
      'For ten thousand cycles, the suspended continent of Aetheria floated in serene celestial grace,',
      'held in perpetual harmony by the 21 Primal Seals — primordial resonances governing Flame, Frost,',
      'Tempest, Verdant Flora, Radiant Light, and Umbral Void. Every soul lived in procedural equilibrium.',
      '',
      'THE AWAKENING OF LORD MALAKOR',
      'Deep beneath the crust, an ancient mechanical titan known as Lord Malakor, the Dread Automaton, awoke.',
      'Driven by an uncompromising doctrine of cold mechanical perfection, Malakor captured the 21 Primal Seals,',
      'locking them within clockwork monoliths and unleashing armies of scouting drones and toxic blight-crushers.',
      '',
      'VALEN THE GLYPHWARDEN',
      'You are Valen — the last surviving Glyphwarden, master of procedural Inverse Kinematics martial stances',
      'and keeper of the sacred Flowing Scarf. Armed with your ancestral Dusk Dagger and fluid particle catalyst,',
      'you must ascend through the Three Terraces: Azure Skyline, Sunken Cistern, and the Dread Citadel Core.',
      '',
      'RESTORING THE 21 SEALS',
      'Commune with the surviving elders (Commander Roland, Alchemist Lyra, High Seer Elyon), gently tend to the',
      'sanctuary sheep, shatter Malakor’s supply crates, and evolve your weapons into devastating broadswords,',
      'aether blasters, concussion mortars, and celestial tempest thunderbolts to liberate Aetheria forever!',
    ];

    let py = boxY + 28;
    for (const line of paragraphs) {
      if (line.includes(':') && !line.includes('http')) {
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 13px "Courier New", monospace';
      } else {
        ctx.fillStyle = '#ccccdd';
        ctx.font = '12px "Courier New", monospace';
      }
      ctx.fillText(line, boxX + 24, py);
      py += 18;
    }
  }

  drawElementsTab(ctx, width, height) {
    const startX = 40;
    const startY = 126;

    this.elements.forEach((elm, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardX = startX + col * 445;
      const cardY = startY + row * 54;

      if (cardY + 48 > height - 16) return;

      ctx.fillStyle = '#0e0e18';
      ctx.fillRect(cardX, cardY, 430, 48);
      ctx.strokeStyle = elm.color;
      ctx.strokeRect(cardX, cardY, 430, 48);

      // Icon & Name
      ctx.fillStyle = elm.color;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(`◆ ${elm.name.toUpperCase()} (${elm.count} Effects)`, cardX + 12, cardY + 20);

      // Description
      ctx.fillStyle = '#aaaabb';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(elm.desc, cardX + 12, cardY + 38);
    });
  }

  drawChaptersTab(ctx, width, height) {
    const startX = 40;
    let cardY = 126;

    this.chapters.forEach((ch) => {
      ctx.fillStyle = '#0e0e18';
      ctx.fillRect(startX, cardY, width - 80, 94);
      ctx.strokeStyle = '#00f0ff';
      ctx.strokeRect(startX, cardY, width - 80, 94);

      // Header
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText(`${ch.title} — ${ch.location}`, startX + 16, cardY + 24);

      // Ally & Threat
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`SANCTUM ALLY: ${ch.ally}`, startX + 16, cardY + 44);

      ctx.fillStyle = '#ff3366';
      ctx.fillText(`COLOSSAL THREAT: ${ch.threat}`, startX + 340, cardY + 44);

      // Story Description
      ctx.fillStyle = '#ccccdd';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(ch.desc, startX + 16, cardY + 70);

      cardY += 104;
    });

    // Play Mission CTA Button
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(340, 448, 280, 40);
    ctx.fillStyle = '#050508';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▶ ASCEND TERRACES (SPACE)', 480, 473);
  }

  drawBestiaryTab(ctx, width, height) {
    const startX = 40;
    const startY = 126;

    const entries = [
      { name: 'Commander Roland (Ω)', type: 'Ally / Outpost Guardian', desc: 'Commander of the Azure Skyline watch. Coordinates tactical defense and awards Aether Shard bounties.' },
      { name: 'Alchemist Lyra (Ψ)', type: 'Ally / Master Apothecary', desc: 'Resides on the high cistern catwalks. Brews corrosive poison flasks to disintegrate heavily fortified armor.' },
      { name: 'High Seer Elyon (Φ)', type: 'Ally / Aetherial Oracle', desc: 'Guardian of the Citadel Core. Awakens Valen’s latent Tempest Wrath and fully restores vitality and energy.' },
      { name: 'Sanctuary Sheep {m}', type: 'Fauna / Gentle Herd', desc: 'Fluffy mountain creatures of peace. Bleats "baa~" and bestows +25 XP when communes with [E].' },
      { name: 'Clockwork Drones', type: 'Enemy / Flying Automata', desc: 'High-speed aerial patrol scouts with laser fire. Yields Aether Shards and essence orbs when struck.' },
      { name: 'Blight Crushers', type: 'Enemy / Heavy Automata', desc: 'Dense mechanical ground bruisers roaming the Cistern. Weak against poison mist and aerocast dropkick stomps.' },
      { name: 'Lord Malakor Titan', type: 'Final Boss / Dread Automaton', desc: 'The 450-HP ancient colossus wielding mortar barrages and shockwave stomps. Defeat him to restore the 21 Seals!' },
    ];

    entries.forEach((e, i) => {
      const y = startY + i * 50;
      if (y + 44 > height - 16) return;

      ctx.fillStyle = '#0e0e18';
      ctx.fillRect(startX, y, width - 80, 44);
      ctx.strokeStyle = e.type.includes('Ally') ? '#00ff88' : (e.type.includes('Boss') ? '#ff2255' : '#333348');
      ctx.strokeRect(startX, y, width - 80, 44);

      ctx.fillStyle = e.type.includes('Ally') ? '#00ff88' : (e.type.includes('Boss') ? '#ff2255' : '#00f0ff');
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`${e.name} [${e.type}]`, startX + 14, y + 18);

      ctx.fillStyle = '#bbbbcc';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(e.desc, startX + 14, y + 34);
    });
  }
}
