# IRONCROWN: The Realm in Winter

A gritty, strictly **printable single-cell ASCII** (`32..126`) feudal war campaign, siege tactics, logistics, and house-betrayal strategy game inspired by dark medieval throne wars — rendered on the `104 x 38` **Classic Amber P3 Phosphor CRT** engine across Web Canvas and Python terminal (`curses` / optional `pygame-ce`).

**Play Live:** https://kaushalboii.github.io/Open-world-ASCII-MMORPG/

> **Note:** Previous RPG **BELLGLASS: The Drowned Province** remains untouched on disk (`src/engine/`, `bellglass/`, `tests/verify_web.mjs`, `tests/test_bellglass.py`) with its entry hooks cleanly commented (`// [BELLGLASS ARCHIVE]`) in `index.html`, `src/main.js`, and `play.py`.

---

## Core War Systems ("Like Real")

1. **Supply Lines & Winter Attrition:** Field columns eat Grain every march day. When enemy banners block roads back to your Keeps or coastal harbors, your Supply flips to `CUT OFF!!` — rations drain 1.5x faster, freezing weather causes frostbite stragglers, and starving armies desert.
2. **Seasonal Geography:** Seasons turn every 10 days (`Autumn Rain -> Early Frost -> Deep Winter -> Mud Thaw`). Deep Winter slows columns and drops foraging yields, while freezing narrow Silverflow river bends (`:`) into walkable flank shortcuts.
3. **House Politics, Ravens & Real Betrayal:** Great Houses (**Locke**, **Brack**, **Vance**, **Dray**) weigh Loyalty, Honor, Dread, treasury strength, and war balance using Utility scoring. Leave ambitious or greedy lords unchecked and they turn cloak in mid-war — hold them by coin charters (`[T]`), captured hostages, or Dread (`[C]` Small Council).
4. **Live Tactical ASCII Field Battles & Castle Sieges (`66x30`):** Command individual regiments (`1..5` or click):
   - `[@]` **Household Guard** (steadies adjacent morale; challenges rival commanders to Single Combat with `[E]`)
   - `[S]` **Shieldwall Pikes** (`[F]` halves arrow volley damage & impales charging Heavy Horse)
   - `[B]` **Ashwood Longbows** (`[B]` looses arcing volleys into unbraced lines & from behind walls)
   - `[H]` **Mail Lancers** (`[C]`/`[J]` crushes exposed flanks & triggers morale routs)
   - `[R]` **Capped Siege Ram** (`[E]` shatters Keep Gatehouses `[HH]`, or bribe a Postern Warden in `[C]` Small Council before attacking, or scale `[L]` siege ladders!)
5. **In-Place Chronicles & Live Guidance:** Framed **War Chronicle** dispatches appear on the battlefield/map for major twists, backed by a permanent **`NOW [<chapter>] ... | NEXT: ...`** command bar on Row 34 and **`[Tab]` Realm Ledger**.

---

## Controls

| Screen | Keys | Action |
|---|---|---|
| Global Bezel | `[P]` / `[V]` / `` [`] `` | Cycle Phosphor (`AMBER`/`GREEN`/`IVORY`), toggle CRT Glow, Mute Audio |
| Campaign | `W A S D` / Arrows / Click | March House Thorne across Realm roads & bridges |
| Campaign | `E` | Enter / Muster / Resupply Hold, Storm Rival Keep, or Levy Village |
| Campaign | `C` / `T` / `R` | Small Council Spies (`C`), Dispatch Raven Pact (`T`), Camp & Forage (`R`) |
| Campaign | `Space` / `Tab` / `H` | Outrider Recon Scout (`Space`), Realm Ledger (`Tab`), Manual (`H`) |
| Battle | `1..5` / Click Squad | Select Regiment (`@` Guard, `S` Spear, `B` Bows, `H` Horse, `R` Ram) |
| Battle | `W A S D` / Click Tile | Move or order squad to destination tile |
| Battle | `J` / `C` · `B` · `F` · `E` | Flank Charge (`J`/`C`), Arrow Volley (`B`), Shield Wall (`F`), Ram Gate / Ladder / Duel (`E`) |
| Battle | `Space` · `L` · `Esc` | War-Horn Morale Rally (`Space`), Tactical Pause (`L`), Order Retreat (`Esc`) |

---

## Running & Verifying Locally

```bash
# Python CLI & headless smoke test (Python 3.9+ zero external deps)
python3 play.py
python3 play.py --headless-demo
python3 play.py --pygame

# Full Automated Test Suites (IRONCROWN + archived BELLGLASS)
python3 -m unittest discover -s tests -v
node tests/verify_ironcrown_web.mjs
node tests/verify_web.mjs
```
