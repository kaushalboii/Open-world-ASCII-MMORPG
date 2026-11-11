# Agent Guide — Open-world-ASCII-MMORPG / Bellglass: The Drowned Province

## Game-Dev Skills (`awesome-gamedev-agent-skills`)

This repository integrates the game-development skills and master `router` from `awesome-gamedev-agent-skills` (Apache-2.0; notices in `.agents/THIRD_PARTY/awesome-gamedev-agent-skills/`).

- All skills live flattened under `.agents/skills/<skill-name>/SKILL.md` (with `references/`, `scripts/`, `assets/` preserved inside each skill folder).
- For any game-development request, start with `.agents/skills/router/SKILL.md` to classify the engine and task, then read only the selected `.agents/skills/<skill-name>/SKILL.md` files on demand.
- Because the skills are flattened into `.agents/skills/`, resolve catalog references like `skills/<category>/<name>/SKILL.md` directly as `.agents/skills/<name>/SKILL.md`.

## Active Project Contract (Bellglass Dual Amber CRT Engine)

The project implements **BELLGLASS: The Drowned Province** across both a pure-vanilla Web ES-module engine and a parity Python 3.9+ package — **keep it on this custom ASCII CRT engine** (see `.agents/skills/router/references/custom-engines.md`) rather than scaffolding Godot, Unity, or Phaser unless explicitly requested.

- **Web Flagship (GitHub Pages root):**
  - `index.html` -> [`src/main.js`](src/main.js) (`requestAnimationFrame` delta-time loop, capped at `0.05s`)
  - Simulation, wall-shadow FOV lantern raycast, Tuning Fork wave acoustics, weather particles, and parry/stagger combat: [`src/engine/game.js`](src/engine/game.js), [`src/engine/worldData.js`](src/engine/worldData.js), [`src/engine/narrative.js`](src/engine/narrative.js), [`src/engine/palette.js`](src/engine/palette.js)
  - Rendering & WebAudio: `104x38` HiDPI `<canvas>` 5-grade P3 Amber CRT rasterizer in [`src/engine/crtRenderer.js`](src/engine/crtRenderer.js) + procedural WebAudio synth in [`src/engine/audio.js`](src/engine/audio.js)
  - Build: `npm run dev` (Vite `^6.0.7`, port `3000`), `npm run build` (`dist/`, `base: './'`), deployed to GitHub Pages via `.github/workflows/deploy.yml`.
- **Python ASCII Edition:**
  - Entry & CLI: [`play.py`](play.py) -> `bellglass/main.py` (`python3 play.py` for zero-dependency `curses`, `--pygame` for optional `pygame-ce` window, `--headless-demo` for smoke simulation)
  - Core modules: `bellglass/engine.py`, `bellglass/world_data.py`, `bellglass/narrative.py`, `bellglass/palette.py`, `bellglass/renderer_curses.py`, `bellglass/renderer_pygame.py`
  - Glyph invariant: strictly single-cell printable ASCII (`32..126`) across all `104x38` frames so both terminal `curses` and `<canvas>` grids never suffer East-Asian width drift.
- **Automated Verification:**
  - Python suite: `python3 -m unittest discover -s tests -v`
  - Web ES-module suite: `node tests/verify_web.mjs`
