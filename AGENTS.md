# Agent Guide — Open-world-ASCII-MMORPG / The Boundless Spiral

## Game-Dev Skills (`awesome-gamedev-agent-skills`)

This repository integrates the 77 game-development skills and master `router` from `awesome-gamedev-agent-skills` (Apache-2.0; notices in `.agents/THIRD_PARTY/awesome-gamedev-agent-skills/`).

- All skills live flattened under `.agents/skills/<skill-name>/SKILL.md` (with `references/`, `scripts/`, `assets/` preserved inside each skill folder).
- For any game-development request, start with `.agents/skills/router/SKILL.md` to classify the engine and task, then read only the selected `.agents/skills/<skill-name>/SKILL.md` files on demand.
- Because the skills are flattened into `.agents/skills/`, resolve catalog references like `skills/<category>/<name>/SKILL.md` directly as `.agents/skills/<name>/SKILL.md`.

## Active Project Contract (Custom JS Pixel & ASCII Engine)

The primary web project (`The Boundless Spiral: Ascension of Zero`) uses a custom vanilla ES-module engine — **keep it on this engine** (see `.agents/skills/router/references/custom-engines.md`) rather than scaffolding Godot, Unity, or Phaser unless explicitly asked to start a separate project.

- **Build & run:** `npm run dev` (Vite `^6.0.7` on port `3000`), `npm run build` (outputs `dist/`), `npm run preview`.
- **Entry & loop:** `index.html` -> `src/main.js` (`SpiralApp`, `requestAnimationFrame` delta-time loop, screen state machine).
- **Rendering pipeline:**
  - `320x180` internal pixel framebuffer (`createFrame`, `clearFrame`, `composite` in `src/pixeleffects/core/index.js`) scaled `3x` onto a `960x540` `<canvas>`, plus a 2D canvas overlay pass (`PixelWorld.drawOverlay`).
  - Procedural 3D IK character rig & shading (`src/pixeleffects/core/rig.js`, `poses.js`, `act.js`, `painter.js`).
  - `RigExplorer` (`src/pixeleffects/studio/RigExplorer.js`) renders `pixel`, `ascii` (Smooth ASCII grid), `hybrid`, and `bones` modes; `StudioManager` showcases 244 effects across 21 categories (`src/pixeleffects/fx/`).
- **Gameplay & audio:** `src/pixeleffects/game/PixelPlayer.js`, `PixelWorld.js`, `UpgradeShop.js`, `StoryCodex.js`, `src/engine/Input.js`, `src/audio/SoundSynth.js`.

## Python ASCII-Pixel Projects

When building Python ASCII games or ASCII-pixel prototypes in this workspace:
- Use `.agents/skills/pygame-core/SKILL.md` (`pygame-ce`) when targeting a graphical window with exact grid-aligned ASCII sprites/tiles, or terminal libraries (`curses`, `rich`, `textual`, `python-tcod`) for pure terminal ASCII rendering.
- Compose with `.agents/skills/roguelike/SKILL.md`, `platformer`, `rpg`, `tower-defense`, `card-game`, `puzzle`, `survival-crafting`, `procedural-gen`, `game-feel`, `game-ai`, and `save-systems` as needed.

