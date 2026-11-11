# BELLGLASS: The Drowned Province

An open-world **Classic Amber P3 Phosphor CRT** ASCII action-RPG set across the flooded valley of Marren — authored for both browser playback on GitHub Pages and zero-dependency Python terminal (`curses` / optional `pygame-ce`).

**Play Live:** https://kaushalboii.github.io/Open-world-ASCII-MMORPG/

---

## World & Core Mechanics

Seven autumns ago, Magistrate Vane ordered the five Parish Great Bells sunk into Marren's flood-gates, swallowing the valley in salt fog. You walk upriver as half-retired bell-tuner **Oren Ward** across seven seamless regions (`240 x 88` continuous terrain):

1. **Tidemouth Pier** — Coastal lighthouse, moored skiff, harbor brazier, and Old Hester.
2. **The Sunken Orchard** — Flooded apple rows, bog-hounds, salt-sealed Root-House, and Orchard Belfry.
3. **Bramwell Causeway** — Broken masonry seawall, Pike-Wardens, and hidden submerged stepping-stones south to the Beacon Islet.
4. **St. Jude's Flooded Nave** — Half-submerged limestone cathedral arches, Prior Tomas, and the Confessional Choir Winch.
5. **Kiln-Town of Redwick** — Glowing coke ovens, Smith Marrow's forge upgrades, Watchman Callum, and soot-choked warehouse.
6. **Low Sunder Flats** — Pale salt crust, ribs of the stranded dredger *SS Cormorant*, Apprentice Pip, and camouflaged Silt-Stalkers.
7. **The High Foundry** — Glowing molten slag spillways, secret western vent route, two-phase duel against **Magistrate Vane**, and the Master Dam Bell.

### Signature Systems
- **Raycast Oil Lantern (`F` toggle):** Wall-shadowing light cone with Hooded stealth mode (saves oil, halves enemy detection) vs. Raised wide beam (reveals invisible Stalkers).
- **Bronze Tuning Fork (`Space`):** Sends concentric acoustic wave rings that shatter brittle salt barriers (`%`), illuminate sunken causeway stones (`~ -> o`), reveal Stalkers, and stagger armored foes mid-windup (`RING-BREAK!`).
- **Telegraphed Parry Combat (`J` / `K` / `L`):** Enemies flash crisp windup telegraphs (`!`) before striking. Parry (`K`) cleanly to stagger them open (`2.4x` critical counter with `J`), or Dodge-Step (`L`) through danger.
- **Persistent Restoration:** Ringing each Parish Great Bell clears salt fog from that region, shifts NPC dialogue, and opens the Foundry sluiceway.

---

## Controls

| Key | Action |
|---|---|
| `W A S D` / `Arrow Keys` | Walk across roads, docks, shrines, and dry causeways |
| `J` / `Enter` / `Z` | Strike forward across 3 blade cells (`2.4x` on Staggered targets) |
| `K` / `Shift` / `X` | Raise Bronze Parry Guard (deflects telegraphed strikes & staggers foe) |
| `L` / `C` | Quick Dodge-Step along facing direction |
| `Space` | Strike Tuning Fork (acoustic wave, salt shatter, shoal reveal, interrupt) |
| `F` | Hood or Raise Oil Lantern |
| `E` | Talk to NPCs, pull winches (`&`), rest/save at Braziers (`*`), toll Bells (`B`) |
| `H` | Bind Bog-Mint Poultice (`+28 HP`) |
| `Tab` / `M` | Open Surveyor Parchment Map & Parish Clapper Ledger |
| `V` / `` ` `` | Web: Toggle CRT Phosphor Scanlines & Glow / Mute Sound |
| `Esc` / `Q` | Cancel / Return to Title (auto-saves progress) |

---

## Running Locally

### Python Edition (Zero Third-Party Dependencies)
Requires Python 3.9+ (`curses` terminal built in):

```bash
python3 play.py
```

Optional flags:
```bash
python3 play.py --pygame          # Optional pygame-ce 60 FPS amber window
python3 play.py --headless-demo   # Deterministic smoke run & JSON telemetry
python3 play.py --new             # Start fresh crossing
```

### Web Flagship (Vite ES Modules)
```bash
npm ci
npm run dev       # http://localhost:3000
npm run build     # Outputs static ./dist/
```

---

## Automated Verification

```bash
python3 -m unittest discover -s tests -v
node tests/verify_web.mjs
```

Tests verify `104 x 38` printable single-width ASCII framing across every screen, full BFS critical-path reachability from Tidemouth Pier to all five bells and Magistrate Vane, Tuning Fork salt-shattering, timed Parry/Critical damage, Smith Marrow tempering, atomic `.tmp`/`.bak` save recovery, and HiDPI Canvas draw parity.
