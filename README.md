# VALEN: CHRONICLES OF AETHERIA
> **An Original Martial Action Adventure featuring the 21 Primal Seals, procedural 3D Inverse Kinematics pixel art, dynamic weapon evolution, and narrative NPC dialogues.**

![Creator](https://img.shields.io/badge/Creator-Kaushal%20(@kaushalboii)-00f0ff?style=for-the-badge)
![Aesthetic](https://img.shields.io/badge/Aesthetic-High--Contrast%20Mono%20%2F%20Vibrant%20Aether-white?style=for-the-badge)
![Genre](https://img.shields.io/badge/Genre-Martial%20Action%20Adventure-ffea00?style=for-the-badge)
![Deploy](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=for-the-badge)

🎮 **Play Live in Browser**:  
👉 **[https://kaushalboii.github.io/Open-world-ASCII-MMORPG/](https://kaushalboii.github.io/Open-world-ASCII-MMORPG/)**

---

## 📖 The Story & World Lore

> *"For ten thousand cycles, the suspended continent of Aetheria thrived in celestial grace, held in perpetual harmony by the **21 Primal Seals** — elemental foundations governing Flame, Frost, Tempest, Verdant Flora, Radiant Light, and Umbral Void.*
>
> *Deep beneath the crust, **Lord Malakor, the Dread Automaton**, awoke from ancient dormancy. Driven by cold mechanical doctrine, Malakor locked away the 21 Primal Seals within clockwork monoliths and unleashed scouting automata and toxic blight-crushers.*
>
> *You are **Valen the Glyphwarden** — master of procedural Inverse Kinematics martial stances and keeper of the Flowing Scarf. Armed with your ancestral Dusk Dagger and fluid particle core, you must ascend the Three Terraces, commune with the Outpost Watch, shatter Malakor’s siege caches, evolve your weapons into devastating broadswords and celestial thunder, and liberate Aetheria forever."*

---

## 🌟 Key Highlights & Gameplay Systems

### 1. Aerocast Plunge (Martial Dropkick Stomp)
- **High-Altitude Stomp**: Fall onto hostile automata or crates from above to crush them for **45+ kinetic damage**, rebound high into the sky, and reset your air-jump counter.
- **Primal Glyphic Caches (`[ ? ]`)**: Strike suspended ancient caches from underneath to shower Aether Shards, essence orbs, and restorative healing dew.
- **Primal Aether Surge**: Rare golden star relics cloak Valen in a luminous prismatic aura, granting temporary **absolute invulnerability** to vaporize automata on contact!

### 2. Shard Drops & Magnet Pull
- Destroyed automata burst into bouncy **Aether Shards** (`🪙`), **Essence Orbs** (`⚡`), **Healing Dew** (`❤️`), and **Surge Stars**.
- Drops bounce naturally across terrain with simulated gravity and platform collision.
- **Shard Magnet**: Approach drops (or upgrade magnet radius in the forge) to draw all surrounding loot automatically into your inventory.

### 3. Weapon Evolution & The Arsenal Forge (`U` or `TAB` or `⚡ FORGE`)
Spend earned Aether Shards to evolve your weapons and purchase power perks:

| Weapon | Type | Attack Description | Stamina |
|---|---|---|---|
| **Dusk Dagger** | Fast Piercing | 6-hit rapid flurry stabs with spark bursts (starter weapon) | 6 |
| **Valen’s Broadsword** | Heavy Slashing | Wide 3-stroke cleaving combo with sweeping crescent slash arcs | 12 |
| **Aether Blaster** | Focused Ranged | Aimed photon projectile beams that fly across the entire screen | 10 |
| **Concussion Mortar** | Heavy Ordnance | Shoulder launcher firing explosive kinetic shells with massive AoE blast | 25 |
| **Tempest Wrath** | Screen Clear | Calls down a celestial lightning storm that chain-zaps all foes on screen | 30 |

*Press **`Q`** at any time during gameplay to cycle through your unlocked weapons!*

### 4. Interactive Narrative NPCs & Sanctuary Companions
- **Commander Roland (`Ω`)**: Leader of the Azure Skyline Watch. Provides tactical orders, quest objectives, and awards Aether Shard bounties for vanguard kills.
- **Alchemist Lyra (`Ψ`)**: Master apothecary residing on the Cistern catwalks. Brews corrosive poison flasks to dissolve heavy automaton armor.
- **High Seer Elyon (`Φ`)**: Ancient oracle guarding the Dread Citadel Core. Bestows full life restoration and awakens Valen's latent Tempest Wrath.
- **Sanctuary Sheep (`{m}`)**: Roaming mountain fauna in the safe outpost. Pet them (`[E]`) to receive gentle bleats and `+25 XP` harmony rewards!
- **Smashable Siege Crates (`[x]`) & Relic Chests (`[=]`)**: Break with weapons or stomp from above to extract hidden loot.

### 5. Upgradable Power Perks
- **Damage Overcharge**: +30% attack damage to all weapons.
- **Shard Magnet**: Increases pickup pull radius by +40px.
- **Vitality Vessel**: +30 Max HP and immediate health restoration.
- **Aether Core**: +25 Max Energy for sustained combos and abilities.
- **Hermes Boots**: Grants extra mid-air jumps and +20% movement speed.
- **Poison Flasks Refill**: Restocks corrosive toxic gas flasks.

---

## 🕹️ Controls

| Action | Desktop Keyboard | Mobile Virtual Pad |
|---|---|---|
| **Run Left / Right** | `A` / `D` or `Arrow Keys` | `◀ LEFT` / `RIGHT ▶` |
| **Jump / Dropkick Stomp** | `W` / `Space` / `Arrow Up` | `JUMP / STOMP` |
| **Attack / Shoot** | `J` / `Z` / `Left Click` | `⚔️ ATTACK/SHOOT` |
| **Commune / Talk / Pet** | `E` or `Space` near NPCs/Sheep | `E / TALK` |
| **Switch Weapon** | `Q` | `🔄 WEAPON` |
| **Open Arsenal Forge** | `U` or `Tab` | `🛒 FORGE` |
| **Dash Strike (Invulnerable)** | `L` / `C` / `Shift` | `⚡ DASH` |
| **Corrosive Poison Flask** | `K` | `🧪 FLASK` |
| **Toggle Visual Theme** | `T` | `THEME` toolbar button |
| **Toggle Chiptune Music** | `B` | `MUSIC` toolbar button |
| **Toggle Sound Effects** | `M` | `SFX` toolbar button |
| **Pause / Resume** | `ESC` | `MENU` tab |

---

## 🧬 Engine & Architecture

This game runs entirely in the browser with **zero external image or audio assets** — every character pose, particle effect, and sound is synthesized in real time via code.

```
Open-world-ASCII-MMORPG/
├── index.html                   # Stage canvas, top navigation, studio controls, mobile virtual pad
├── package.json                 # Project configuration (Vite, pure ES modules)
├── vite.config.js               # GitHub Pages relative build configuration
├── src/
│   ├── main.js                  # Central game loop, screen state machine & HUD
│   ├── engine/
│   │   ├── GameRegistry.js      # Central export registry linking all systems
│   │   ├── Input.js             # Keyboard, mouse, and mobile virtual touch buffering
│   │   ├── Camera.js            # Screen shake and coordinate transformations
│   │   ├── Renderer.js          # Canvas rendering pipelines
│   │   └── AsciiGrid.js         # Glyph matrix overlay
│   ├── audio/
│   │   └── SoundSynth.js        # Procedural Web Audio API synthesizer & chiptune BGM
│   ├── combat/
│   │   ├── DamageText.js        # Floating combat numbers and critical indicators
│   │   ├── SlashArc.js          # Animated crescent blade trails
│   │   └── AsciiFeedback.js     # Hit sparks and impact feedback
│   ├── entities/
│   │   ├── NPC.js               # Interactive story quest givers (Roland, Lyra, Elyon)
│   │   ├── Boss.js              # Multi-phase titan boss AI
│   │   ├── PlatformEnemy.js     # Automata behaviors
│   │   └── EntityManager.js     # Entity tracking and collision
│   ├── ui/
│   │   ├── DialogueBox.js       # Retro typewriter narrative dialog system
│   │   └── MiniMap.js           # Real-time tactical radar scanner
│   ├── world/
│   │   ├── Destructibles.js     # Smashable siege crates, barrels, and relic chests
│   │   ├── Sheep.js             # Mountain sanctuary sheep AI
│   │   └── WorldMap.js          # World and terrace representations
│   ├── vfx/
│   │   ├── ParticleEngine.js    # Spark, debris, and smoke emitters
│   │   └── PlatformVFX.js       # Poison mist clouds and projectile trajectories
│   └── pixeleffects/
│       ├── core/                # Procedural 3D skeletal rig & particle simulation engine
│       │   ├── rig.js           # 3D Inverse Kinematics (IK) solver to 24x38 pixel art
│       │   ├── act.js           # Acted-out moves with anticipation, hit-stop, & camera shake
│       │   └── sim.js           # 120Hz fluid particle simulation engine
│       ├── fx/                  # 244 procedural pixel art effects across 21 categories
│       ├── game/
│       │   ├── PixelPlayer.js   # Valen the Glyphwarden with weapon inventory & XP leveling
│       │   ├── PixelWorld.js    # Terraces, loot drops, automata AI & titan boss battle
│       │   ├── UpgradeShop.js   # In-game interactive arsenal forge & power-up perks
│       │   └── StoryCodex.js    # The 21 Primal Seals chronicles & interactive bestiary
│       └── studio/
│           ├── StudioManager.js # 244-effect studio with slow-mo & backdrop picker
│           └── RigExplorer.js   # "How Pixel Art Is Built" interactive 3D IK visualizer
```

---

## 📜 Author & License
- **Lead Creator & Developer**: [Kaushal](https://github.com/kaushalboii) (`@kaushalboii`)
- **License**: [MIT](LICENSE)
