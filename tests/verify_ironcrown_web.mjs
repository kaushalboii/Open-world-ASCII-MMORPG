/**
 * Node.js ES-module automated verification suite for IRONCROWN: The Realm in Winter.
 */

import assert from 'node:assert/strict';
import { CrtCanvasRenderer } from '../src/engine/crtRenderer.js';
import { GRID_COLS, GRID_ROWS } from '../src/engine/palette.js';
import { computeHouseBetrayalUtility } from '../src/war/ai.js';
import { WarAudio } from '../src/war/audio.js';
import { IroncrownGame } from '../src/war/game.js';
import { computeWarObjective } from '../src/war/narrative.js';
import { HOLD_TEMPLATES, REALM_H, REALM_W, TERRAIN_META, createRealmGrid } from '../src/war/worldData.js';

function assertStrictAsciiFrame(buf, label) {
  assert.equal(buf.length, GRID_ROWS, `${label}: expected ${GRID_ROWS} rows`);
  for (let r = 0; r < GRID_ROWS; r++) {
    assert.equal(buf[r].length, GRID_COLS, `${label} row ${r}: expected ${GRID_COLS} cols`);
    for (let c = 0; c < GRID_COLS; c++) {
      const [ch, grade] = buf[r][c];
      assert.equal(typeof ch, 'string');
      assert.equal(ch.length, 1, `${label} (${r},${c}) must be 1 char, got ${JSON.stringify(ch)}`);
      const code = ch.charCodeAt(0);
      assert.ok(code >= 32 && code <= 126, `${label} (${r},${c}) non-ASCII char ${code}`);
      assert.ok(Number.isInteger(grade) && grade >= 0 && grade <= 4, `${label} invalid grade ${grade}`);
    }
  }
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

// Start fresh campaign -> Prologue Chronicle pops inside viewport
game.handleAction('confirm');
assert.equal(game.screen, 'campaign');
assert.ok(game.activeStory && game.activeStory.id === 'prologue', 'Prologue Chronicle must appear in-place');
const storyBuf = game.renderBuffer();
assertStrictAsciiFrame(storyBuf, 'campaign_with_prologue');
assert.ok(storyBuf.map((r) => r.map(([c]) => c).join('')).join('\n').includes('WAR CHRONICLE:'));
assert.ok(storyBuf[34].map(([c]) => c).join('').includes('NOW ['), 'Row 34 must render live objective bar');

// Dismiss Chronicle via Enter without unintended move
game.handleAction('confirm');
assert.equal(game.activeStory, null);
assert.equal(game.campaign.px, 28);

// Muster Capped Ram at Blackpike
game.handleAction('interact');
assert.equal(game.screen, 'dialogue');
game.handleAction('choice_4'); // Build Capped Ram (80g)
const ram = game.playerRegiments.find((r) => r.type === 'ram');
assert.ok(ram && ram.men === 12, 'Muster should add Capped Siege Ram');
game.handleAction('cancel');
assert.equal(game.screen, 'campaign');

// Open Small Council -> Bribe Gate Warden at Redwatch
game.handleAction('council');
assert.equal(game.screen, 'dialogue');
game.handleAction('choice_1');
assert.equal(game.flags.bribed_redwatch, true, 'Bribe Warden should set pre-bribed gate flag');
game.handleAction('cancel');

// Open Raven menu -> Send Charter to House Brack to stabilize alliance
const prevBrackRel = game.getHouse('brack').relation;
game.handleAction('raven');
game.handleAction('choice_1');
assert.ok(game.getHouse('brack').relation > prevBrackRel, 'Raven Charter must raise Brack relation');
game.handleAction('cancel');

// Verify Betrayal risk Utility AI drops when Dread rises
const vance = game.getHouse('vance');
const th = game.getHouse('thorne');
th.dread = 0;
const lowDreadRisk = computeHouseBetrayalUtility(vance, th, 80, game.holds);
th.dread = 85;
const highDreadRisk = computeHouseBetrayalUtility(vance, th, 80, game.holds);
assert.ok(highDreadRisk < lowDreadRisk, 'Dread must suppress Utility betrayal score');

// Test Siege Battle with Gatehouse Ram smashing (unbribed Kingsbridge!)
const kingsbridge = game.holds.find((h) => h.id === 'kingsbridge');
game.startSiegeBattle(kingsbridge);
assert.equal(game.screen, 'battle');
assert.equal(game.battle.gateBreached, false);
assert.ok(computeWarObjective(game).now.includes('Ram [5]'), 'Objective must guide Ram toward unbroken gate');
assertStrictAsciiFrame(game.renderBuffer(), 'battle_siege');

// Drive Ram [5] up to Gate [HH] and smash it open
game.handleAction('choice_5');
const ramSq = game.battle.playerSquads.find((s) => s.type === 'ram');
ramSq.x = game.battle.map.wallX - 1;
ramSq.y = game.battle.map.gateY;
while (!game.battle.gateBreached) {
  game.handleAction('interact');
}
assert.equal(game.battle.gateBreached, true, 'Ram blows must smash Keep Gatehouse open');
assert.equal(game.battle.map.grid[game.battle.map.gateY][game.battle.map.wallX], '.');

// Test Volleys, Shield Wall, War-Horn Rally, and Flanking Victory
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
assert.equal(kingsbridge.owner, 'thorne', 'Breaking garrison morale must capture Keep');
assert.equal(game.activeStory.id, 'highcrown_gates', 'Capturing Kingsbridge triggers Highcrown final beat');

// Verify Highcrown Citadel victory transitions to victory screen cleanly
const highcrown = game.holds.find((h) => h.id === 'highcrown');
game.captureHold(highcrown);
assert.equal(game.screen, 'victory');
assertStrictAsciiFrame(game.renderBuffer(), 'victory');

// Save/Load persistence round-trip + Ledger/Help screens
game.screen = 'campaign';
assert.equal(game.saveGame(), true);
const g2 = new IroncrownGame({ storage, seed: 717 });
assert.equal(g2.hasExistingSave, true);
assert.equal(g2.loadGame(), true);
assert.equal(g2.heldCount(), game.heldCount());
g2.handleAction('ledger');
assertStrictAsciiFrame(g2.renderBuffer(), 'ledger');
g2.handleAction('cancel');
g2.handleAction('help');
assertStrictAsciiFrame(g2.renderBuffer(), 'help');

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
renderer.draw(g2.renderBuffer());
assert.ok(atlasDraws > 200, 'CRT renderer must draw Ironcrown grid');

console.log(JSON.stringify({
  ironcrownWebTests: 'PASS',
  holdsReachable: HOLD_TEMPLATES.length,
  villagesReachable: villages.length,
  siegeGateBreached: true,
  highcrownVictory: true,
  atlasDraws,
}));

