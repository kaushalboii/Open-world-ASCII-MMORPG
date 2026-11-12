/**
 * Node.js ES-module automated verification suite for IRONCROWN: The Realm in Winter.
 */

import assert from 'node:assert/strict';
import { CrtCanvasRenderer } from '../src/engine/crtRenderer.js';
import { TONE_PALETTES, GRID_COLS, GRID_ROWS } from '../src/engine/palette.js';
import { computeHouseBetrayalUtility } from '../src/war/ai.js';
import { WarAudio } from '../src/war/audio.js';
import { IroncrownGame } from '../src/war/game.js';
import { computeWarObjective } from '../src/war/narrative.js';
import { HOLD_TEMPLATES, REALM_H, REALM_W, TERRAIN_META, createRealmGrid } from '../src/war/worldData.js';

function assertStrictAsciiFrame(buf, label) {
  assert.equal(buf.length, GRID_ROWS, `${label}: expected ${GRID_ROWS} rows`);
  const tones = new Set();
  for (let r = 0; r < GRID_ROWS; r++) {
    assert.equal(buf[r].length, GRID_COLS, `${label} row ${r}: expected ${GRID_COLS} cols`);
    for (let c = 0; c < GRID_COLS; c++) {
      const [ch, grade, tone] = buf[r][c];
      assert.equal(typeof ch, 'string');
      assert.equal(ch.length, 1, `${label} (${r},${c}) must be 1 char, got ${JSON.stringify(ch)}`);
      const code = ch.charCodeAt(0);
      assert.ok(code >= 32 && code <= 126, `${label} (${r},${c}) non-ASCII char ${code}`);
      assert.ok(Number.isInteger(grade) && grade >= 0 && grade <= 4, `${label} invalid grade ${grade}`);
      if (tone !== undefined) {
        assert.ok(Number.isInteger(tone) && tone >= 0 && tone < TONE_PALETTES.length, `${label} invalid tone ${tone}`);
        tones.add(tone);
      }
    }
  }
  return tones;
}

// 1. Strategic Realm BFS: Every Keep & Village must be reachable from Blackpike Keep
const { grid, villages } = createRealmGrid();
const visited = new Set();
const q = [[28, 16]];
visited.add('28,16');
while (q.length > 0) {
  const [x, y] = q.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= REALM_W || ny < 0 || ny >= REALM_H) continue;
    const ch = grid[ny][nx];
    if (!TERRAIN_META[ch]?.passable) continue;
    const key = `${nx},${ny}`;
    if (!visited.has(key)) {
      visited.add(key);
      q.push([nx, ny]);
    }
  }
}
for (const h of HOLD_TEMPLATES) {
  assert.ok(visited.has(`${h.x},${h.y}`), `Hold ${h.name} unreachable on realm grid`);
}
for (const [vx, vy] of villages) {
  assert.ok(visited.has(`${vx},${vy}`), `Village (${vx},${vy}) unreachable on realm grid`);
}

// 2. Utility AI Betrayal & Dread Shield check
const memStore = new Map();
const storage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, v),
};
const game = new IroncrownGame({ storage, seed: 717 });
assertStrictAsciiFrame(game.renderBuffer(), 'title');

// Start from minimal Title -> launches directly into Redwatch Battleground + Small Bottom Map!
game.handleAction('confirm');
assert.equal(game.screen, 'battle');
assert.equal(game.activeStory, null, 'No blocking story chronicle popup should appear');
assert.equal(game.battle.sourceHold.id, 'redwatch', 'Initial battleground starts at Redwatch Bastion');
const ram = game.playerRegiments.find((r) => r.type === 'ram');
assert.ok(ram && ram.men === 12, 'Capped Siege Ram [5] must be immediately ready');

const batBuf = game.renderBuffer();
const batTones = assertStrictAsciiFrame(batBuf, 'battle_with_small_map');
assert.ok(batTones.size >= 8, `Expected multi-color battleground (>=8 tones), got ${batTones.size}`);
const row1Txt = batBuf[1].map(([c]) => c).join('');
const row26Txt = batBuf[26].map(([c]) => c).join('');
assert.ok(row1Txt.includes('BATTLEGROUND'), 'Row 1 must display full-width Battleground frame');
assert.ok(row26Txt.includes('SMALL REALM MAP'), 'Row 26 must display Small Realm Map at the bottom');
const mapAreaTxt = batBuf.slice(27, 36).map((r) => r.map(([c]) => c).join('')).join('\n');
for (const tag of ['BLK', 'ASH', 'GRY', 'OLD', 'SLT', 'ROK', 'RED', 'KGB', 'HGC']) {
  assert.ok(mapAreaTxt.includes(tag), `Small bottom map must render Hold tag ${tag}`);
}

// Click a Keep directly on the bottom Small Map (Kingsbridge) -> switches Battleground immediately!
const kbHold = game.holds.find((h) => h.id === 'kingsbridge');
const [kbX, kbY] = game._realmToSmallMap(kbHold.x, kbHold.y);
game.handleCanvasClick(kbY, kbX);
assert.equal(game.screen, 'battle');
assert.equal(game.battle.sourceHold.id, 'kingsbridge', 'Clicking Kingsbridge on bottom map must launch Kingsbridge Siege');
assert.equal(game.battle.gateBreached, false);
assert.ok(computeWarObjective(game).now.includes('Ram [5]'), 'Objective must guide Ram toward unbroken gate');
assertStrictAsciiFrame(game.renderBuffer(), 'battle_kingsbridge_clicked');

// Verify Betrayal risk Utility AI drops when Dread rises
const vance = game.getHouse('vance');
const th = game.getHouse('thorne');
th.dread = 0;
const lowDreadRisk = computeHouseBetrayalUtility(vance, th, 80, game.holds);
th.dread = 85;
const highDreadRisk = computeHouseBetrayalUtility(vance, th, 80, game.holds);
assert.ok(highDreadRisk < lowDreadRisk, 'Dread must suppress Utility betrayal score');

// Drive Ram [5] up to Gate [HH] and smash it open on 102x23 Battleground
game.handleAction('choice_5');
const ramSq = game.battle.playerSquads.find((s) => s.type === 'ram');
ramSq.x = game.battle.map.wallX - 1;
ramSq.y = game.battle.map.gateY;
while (!game.battle.gateBreached) {
  game.handleAction('interact');
}
assert.equal(game.battle.gateBreached, true, 'Ram blows must smash Keep Gatehouse open');
assert.equal(game.battle.map.grid[game.battle.map.gateY][game.battle.map.wallX], '.');

// Test Volleys, Shield Wall, War-Horn Rally, and Hold Capture staying in Battleground + Small Map!
game.handleAction('choice_2'); // Spear
game.handleAction('parry');    // Toggle shield wall
game.handleAction('choice_3'); // Bows
game.handleAction('volley');
game.handleAction('fork');     // War-horn rally
for (const e of game.battle.enemySquads) {
  e.morale = 10;
  e.routed = true;
}
game.handleAction('confirm'); // 1 battle tick resolves rout victory -> captures Kingsbridge!
assert.equal(kbHold.owner, 'thorne', 'Breaking garrison morale must capture Keep');
assert.equal(game.screen, 'battle', 'Must remain on Battleground + Small Map view after capturing Hold');
assert.equal(game.battle.outcome, 'victory');
assertStrictAsciiFrame(game.renderBuffer(), 'battle_captured_stay');

// Press [M] -> jumps straight to next unconquered Keep (Highcrown)
const rwHold = game.holds.find((h) => h.id === 'redwatch');
game.captureHold(rwHold);
game.captureHold(game.holds.find((h) => h.id === 'oldford'));
game.captureHold(game.holds.find((h) => h.id === 'rookkeep'));
game.handleAction('ledger');
assert.equal(game.battle.sourceHold.id, 'highcrown', 'Pressing [M] after captures must advance to Highcrown Citadel');

// Verify Highcrown Citadel victory transitions to victory screen cleanly
const highcrown = game.holds.find((h) => h.id === 'highcrown');
game.captureHold(highcrown);
assert.equal(game.screen, 'victory');
assertStrictAsciiFrame(game.renderBuffer(), 'victory');

// Save/Load persistence round-trip + Help screen (loads straight into Battleground!)
game.screen = 'battle';
assert.equal(game.saveGame(), true);
const g2 = new IroncrownGame({ storage, seed: 717 });
assert.equal(g2.hasExistingSave, true);
assert.equal(g2.loadGame(), true);
assert.equal(g2.screen, 'battle');
assert.equal(g2.heldCount(), game.heldCount());
g2.handleAction('help');
assertStrictAsciiFrame(g2.renderBuffer(), 'help');
g2.handleAction('cancel');
assert.equal(g2.screen, 'battle');

// Verify Canvas Renderer + Audio headless instantiation cleanly
let atlasDraws = 0;
const makeOffscreen = (w, h) => ({
  width: w,
  height: h,
  getContext: () => ({
    setTransform() {}, clearRect() {}, fillRect() {}, fillText() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  }),
});
globalThis.document = { createElement: () => makeOffscreen(1144, 760) };
const mockCanvas = {
  width: 1144,
  height: 760,
  getContext: () => ({
    setTransform() {}, fillRect() {}, save() {}, restore() {}, fillText() {},
    drawImage() { atlasDraws++; },
    createRadialGradient: () => ({ addColorStop() {} }),
  }),
};
const renderer = new CrtCanvasRenderer(mockCanvas);
const audio = new WarAudio();
audio.play('horn');
const titleTones = assertStrictAsciiFrame(new IroncrownGame({ storage, seed: 717 }).renderBuffer(), 'title_color');
assert.ok(titleTones.size >= 8, `Expected rich multi-color title frame (>=8 tones), got ${titleTones.size}`);
assert.equal(renderer.colorEnabled, true, 'Multi-color mode should default to enabled');
renderer.draw(g2.renderBuffer());
assert.ok(atlasDraws > 200, 'CRT renderer must draw Ironcrown grid');
assert.equal(renderer.toggleColor(), false, 'toggleColor should switch to monochrome P3 CRT');
renderer.draw(g2.renderBuffer());
assert.equal(renderer.toggleColor(), true, 'toggleColor should restore full color mode');

console.log(JSON.stringify({
  ironcrownWebTests: 'PASS',
  holdsReachable: HOLD_TEMPLATES.length,
  villagesReachable: villages.length,
  siegeGateBreached: true,
  highcrownVictory: true,
  titleDistinctTones: titleTones.size,
  atlasDraws,
}));

