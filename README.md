# † TINY GLYPHS — PIXEL FX EDITION †
> **Procedural 3D Skeletal Character Rigging, Hugo Duprez Fluid VFX, Acted Moves, and 244-Effect Interactive Studio**

![Aesthetic](https://img.shields.io/badge/Aesthetic-B%26W%20Monochrome%20%2F%20Cyber%20Neon-white?style=for-the-badge)
![Engine](https://img.shields.io/badge/VFX%20Engine-PixelFX%20%26%20Sprite%20Fusion-00f0ff?style=for-the-badge)
![Deploy](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=for-the-badge)

🎮 **Play Live Now on GitHub Pages**:  
👉 **[https://kaushalboii.github.io/Open-world-ASCII-MMORPG/](https://kaushalboii.github.io/Open-world-ASCII-MMORPG/)**

---

## 🧬 What Was Built & Integrated (from `patch-gg/pixelfx`)

### 1. Procedural 3D Skeletal Rigging (`src/pixelfx/core/rig.js`)
- **Real 3D Skeleton in Pixels**: Fixed-length bones (pelvis, spine, chest, shoulders, elbows, knees) solved via 3D Inverse Kinematics (IK), shaded into flat tones with clean ink outlines like *Dead Cells*.
- **Local-to-World Character Drawing**: 24×38 pixel art character rendered deterministically from skeletal parameters (`yaw`, `lean`, `crouch`, `fx/fy`, `weaponAngle`).

### 2. Acted Moves & Hit Contact Stop (`src/pixelfx/core/act.js`)
Every move is **acted out**:
- **Wind-up (Anticipation)**: Character coils back before letting go.
- **Snap Release**: High-speed strike frame.
- **Contact Freeze (Hit-Stop)**: Animation pauses for ~0.12s on impact to give hits satisfying weight.
- **Screen Shake & Target Spring**: Camera shakes and targets rock back on springs.
- **Recovery**: Character transitions back into guard stance.

### 3. Iconic Playable Moves
- **Dash Strike (`moves/dash-strike.js`)**: Blur across the floor with glowing after-images, land a critical hit cut, and hop back.
- **Sword Combo (`moves/sword-combo.js`)**: 3-stroke combo (slash, crossing double cut, and heavy two-handed cleave into the floor).
- **Earth Stomp (`moves/earth-stomp.js`)**: Knee comes up, boot slams down, floor heaves and a stone spike rams upward.
- **Poison Flask (`nature/poison-cloud.js`)**: Hugo Duprez's authentic multi-sheet toxic gas simulation creeping out in tongues along the ground.
- **Lightning Call (`moves/lightning-call.js`)**: Reaches to the sky and summons a celestial thunderbolt with plasma flash.

### 4. Interactive VFX Studio (All 244 Effects Across 21 Categories)
- Browse, inspect, and run all 244 effects from `patch-gg/pixelfx`:
  - `moves` (12), `fire` (12), `explosions` (12), `water` (12), `ice` (10), `lightning` (11), `scifi` (12), `melee` (12), `impacts` (11), `projectiles` (13), `spawn` (10), `arcane` (12), `holy` (10), `shadow` (12), `status` (13), `nature` (13), `weather` (12), `ui` (12), `pickups` (11), `transitions` (10), `critters` (12).
- Real-time controls: Replay, Pause, Slow-mo Speed (0.25x, 0.5x, 1x, 2x), Actor Toggle, Flip Direction, Backdrop (Ground, Dark, Black, Sky).

### 5. "How Pixel Art Is Built" Interactive Rig Explorer
- Live 3D IK wireframe vs. rendered 24x38 pixel art split-view.
- Interactive sliders for 3D Yaw, Spine Lean, Hip Crouch, Hand Reach, and Weapon Angle.
- Exploded body parts breakdown (`posedParts`).

### 6. High-Contrast Black & White Monochrome Mode
- Seamless toggle between:
  - **B&W Monochrome (1-Bit Retro)**: Crisp white-on-black pixels with sharp ink outlines.
  - **Neon Cyberpunk**: Full dynamic color lighting using the PixelFX additive light buffer.
  - **Matrix Phosphor Green**: Retro green arcade CRT display.

---

## 🕹️ Controls

| Action | Desktop Keyboard | Mobile Touch Pad |
|---|---|---|
| **Move Left / Right** | `A` / `D` or `Arrow Keys` | `◀ LEFT` / `RIGHT ▶` |
| **Jump / Double Jump** | `W` / `Space` / `Arrow Up` | `JUMP` |
| **Sword Combo / Punch** | `J` / `Z` / `Left Click` | `⚔️ COMBO` |
| **Dash Strike (Invulnerable)** | `L` / `C` / `Shift` | `⚡ DASH` |
| **Poison Cloud Flask** | `K` / `E` | `🧪 FLASK` |
| **Earth Stomp** | `U` | `💥 STOMP` |
| **Lightning Call** | `O` | Top toolbar / studio |
| **Toggle Visual Theme** | `T` | `THEME` toolbar button |
| **Toggle Chiptune Music** | `B` | `MUSIC` toolbar button |
| **Toggle Sound Effects** | `M` | `SFX` toolbar button |
| **Pause / Menu** | `ESC` | `MENU` tab |

---

## 🏗️ Architecture

```
Open-world-ASCII-MMORPG/
├── index.html                   # Responsive stage, top tabs, studio controls, mobile pad
├── package.json                 # Vite configuration (base: './')
├── vite.config.js               # GitHub Pages relative build configuration
├── src/
│   ├── main.js                  # Central screen orchestrator & HUD
│   ├── engine/
│   │   ├── Input.js             # Keyboard, mouse, and touch buffering
│   │   └── AsciiGrid.js         # Monospace character matrix renderer
│   ├── pixelfx/
│   │   ├── core/                # PixelFX engine (rig.js, act.js, sim.js, painter.js, fx.js)
│   │   ├── fx/                  # All 244 procedural pixel art effects in 21 categories
│   │   ├── game/
│   │   │   ├── PixelPlayer.js   # 3D IK rigged character with active moves & scarf physics
│   │   │   └── PixelWorld.js    # Side-scrolling platforms, hazards, enemies, boss Goliath
│   │   └── studio/
│   │       ├── StudioManager.js # 244-effect live visualizer with slow-mo & backdrop picker
│   │       └── RigExplorer.js   # "How Pixel Art Is Built" interactive 3D IK visualizer
│   └── audio/
│       └── SoundSynth.js        # Procedural Web Audio API sound synth & chiptune BGM
```

---

## 📜 Credits & License
- **PixelFX**: Created by [Patch](https://patch.gg), MIT License.
- **Fluid & Particle Simulation**: Hugo Duprez ([Sprite Fusion](https://www.spritefusion.com)), MIT License.
- **Author**: [@kaushalboii](https://github.com/kaushalboii)
