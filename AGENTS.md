# Agent Guide — Open-world-ASCII-MMORPG / IRONCROWN (Bellglass Preserved Intact)

## Game-Dev Skills (`awesome-gamedev-agent-skills`)

This repository integrates the game-development skills and master `router` from `awesome-gamedev-agent-skills` (Apache-2.0; notices in `.agents/THIRD_PARTY/awesome-gamedev-agent-skills/`).

- All skills live flattened under `.agents/skills/<skill-name>/SKILL.md` (with `references/`, `scripts/`, `assets/` preserved inside each skill folder).
- For any game-development request, start with `.agents/skills/router/SKILL.md` to classify the engine and task, then read only the selected `.agents/skills/<skill-name>/SKILL.md` files on demand.
- Because the skills are flattened into `.agents/skills/`, resolve catalog references like `skills/<category>/<name>/SKILL.md` directly as `.agents/skills/<name>/SKILL.md`.

## Active Project Contract (Dual Amber CRT ASCII Engine)

The project keeps **all custom games on the strict single-cell printable ASCII (`32..126`) `104x38` Dual Amber CRT engine** (see `.agents/skills/router/references/custom-engines.md`) rather than scaffolding Godot, Unity, or Phaser unless explicitly requested.

- **Active Flagship — IRONCROWN: The Realm in Winter (Feudal War, Logistics & Live Siege Tactics):**
  - Entry Web: [`index.html`](index.html) -> [`src/main.js`](src/main.js) (shared [`src/engine/crtRenderer.js`](src/engine/crtRenderer.js) & [`src/engine/palette.js`](src/engine/palette.js))
  - War Modules: `src/war/worldData.js`, `src/war/ai.js`, `src/war/narrative.js`, `src/war/audio.js`, `src/war/game.js`
  - Python CLI Parity: [`play.py`](play.py) -> `ironcrown/main.py` (`ironcrown/engine.py`, `ironcrown/world_data.py`, `ironcrown/ai.py`, `ironcrown/narrative.py`, `ironcrown/palette.py`, `ironcrown/renderer_curses.py`, `ironcrown/renderer_pygame.py`)
  - Automated Tests: `node tests/verify_ironcrown_web.mjs` and `tests/test_ironcrown.py`
- **Archived Game Preserved Intact — BELLGLASS: The Drowned Province:**
  - All Bellglass source & test files remain untouched in `src/engine/game.js`, `src/engine/worldData.js`, `src/engine/narrative.js`, `src/engine/audio.js`, `bellglass/*`, `tests/verify_web.mjs`, and `tests/test_bellglass.py`, with boot references cleanly commented (`// [BELLGLASS ARCHIVE]`) in shared entrypoints.
- **Automated Verification:**
  - Python suite (Ironcrown + Bellglass): `python3 -m unittest discover -s tests -v`
  - Ironcrown Web ES-module suite: `node tests/verify_ironcrown_web.mjs`
  - Archived Bellglass Web ES-module suite: `node tests/verify_web.mjs`
