# Tactical ASCII Tower Defense & Wave Siege

A Python ASCII-pixel tower defense & wave siege game featuring multi-character `5x3` turrets, animated projectiles (`->`, `⚡`, `***`, `*>`), dynamic structural integrity (`███ → ▓▓▓ → ▒▒▒ → ░░░`), A\* maze pathfinding with anti-block BFS verification, and an integrated **ASCII-Pixel Sprite & VFX Studio** (`[F2]` / `--studio`).

## Running the Game

Make sure your terminal window is at least `100x32` characters, then run from the repository root:

```bash
python3 python_ascii_td/main.py
```

### CLI Options

```bash
python3 python_ascii_td/main.py --studio               # Launch directly in Sprite & VFX Studio
python3 python_ascii_td/main.py --map spiral_switchback
python3 python_ascii_td/main.py --seed 123
python3 python_ascii_td/main.py --reduce-shake
python3 python_ascii_td/main.py --headless-demo        # Print deterministic battle ASCII snapshot
python3 python_ascii_td/main.py --pygame               # Optional 60 FPS window (requires pygame-ce)
```

*(Note: terminal `curses` mode works with Python 3.9+ stdlib only — zero extra packages required. If you want `--pygame`, install `pip install pygame-ce`.)*

## Arsenals & Enemies

- **Turrets & Structures (`1-5`):**
  - `[1]` **Pulse Repeater `[=|=]`** (`50g`): Fast `->` kinetic bolts, hits ground & air.
  - `[2]` **Tesla Coil `(☼)`** (`75g`): Chain lightning `⚡` jumping across enemies; `1.25x` bonus vs armor.
  - `[3]` **Siege Mortar `[███]`** (`90g`): High-arc parabolic `***` AoE shells with ground `[x]` reticle.
  - `[4]` **Cryo Emitter `<◈>`** (`65g`): Frost shards `*>` slowing ground & air units by `45%`.
  - `[5]` **Blast Barricade `[██]`** (`15g`): Destructible tactical wall showing live structural degradation `███ → ▓▓▓ → ▒▒▒ → ░░░`.
- **Targeting Modes (`T`):** Cycles `first`, `last`, `closest`, `strongest`, `weakest`.
- **Enemy Archetypes:** Swarm Runner (`>o>`), Shock Trooper (`[X]`), Shield Juggernaut (`[▓]`), Siege Sapper (`{!}`, specifically breaches barricades), Sky Wraith (`<v>`, flying), and Wave 10 Boss **Dread Colossus** (`[Ω]`) with periodic barricade-chipping EMP blasts.

## Controls

### Tactical Battle
- `Arrows` / `W A S D` / Left-Click: Move tile cursor / Click tile or Arsenal slot
- `1`–`5`: Select turret / barricade to build
- `Enter` / `Space`: Build structure on empty tile, or select existing structure
- `U`: Upgrade selected structure (Levels 1–3)
- `T`: Cycle targeting priority (`first`/`last`/`closest`/`strongest`/`weakest`)
- `R`: Repair damaged Blast Barricade
- `X` / `Backspace` / `Delete`: Sell structure (70% total invested gold refund)
- `G`: Start / Call Next Wave early (earns early-wave gold bonus)
- `F`: Cycle speed (`1x` / `2x` / `4x`)
- `V`: Toggle A\* route preview dots
- `M`: Switch between `Twin Bastion Gate` and `Spiral Switchback`
- `P` / `Esc`: Pause
- `F2`: Toggle **ASCII-Pixel Sprite & VFX Studio**

### Sprite & VFX Studio (`[F2]`)
- `Up` / `Down`: Browse asset catalog
- `Space`: Play / Pause animation
- `[` / `]` or `Left` / `Right`: Step frames
- `V`: Cycle playback speed (`0.25x`–`2.0x`)
- `-` / `+`: Drag live structural damage slider (`100%` → `0%`, `███ → ▓▓▓ → ▒▒▒ → ░░░`)
- `I` / `J` / `K` / `L`: Move 2D cell edit cursor
- `E`: Toggle **Paint Mode** (type any glyph to edit the active frame live)
- `R`: Reset catalog to defaults
- `X`: Export catalog to `studio_sprites.json`

## Running Tests

```bash
PYTHONPATH=python_ascii_td python3 -m unittest discover -s python_ascii_td/tests -v
```

