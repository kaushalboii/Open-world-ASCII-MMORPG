/**
 * Node.js ES-module automated verification for the Bellglass Web flagship.
 */

import assert from 'node:assert/strict';
import { BellAudio } from '../src/engine/audio.js';
import { CrtCanvasRenderer } from '../src/engine/crtRenderer.js';
import { BellglassGame } from '../src/engine/game.js';
import { GRID_COLS, GRID_ROWS } from '../src/engine/palette.js';
import {
  TILE_BRIDGE,
  TILE_GATE,
  TILE_ROAD,
  TILE_SALT,
  WALKABLE_TILES,
  buildMarrenWorld,
} from '../src/engine/worldData.js';

function bfsReachable(wm, startX, startY, allowSalt = false) {
  const key = (x, y) => (y << 10) | x;
  const visited = new Set([key(startX, startY)]);
  const queue = [[startX, startY]];
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!wm.inBounds(nx, ny)) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      const tile = wm.kinds[ny][nx];
      if (WALKABLE_TILES.has(tile) || (allowSalt && tile === TILE_SALT)) {
        visited.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}

// 1. World critical-path BFS reachability
const wm = buildMarrenWorld();
const k = (x, y) => (y << 10) | x;
const early = bfsReachable(wm, 22, 68, true);
for (const [x, y, label] of [
  [18, 29, 'Orchard Clapper'],
  [58, 34, 'Bell I Orchard'],
  [51, 62, 'Oil Shed'],
  [27, 67, 'Old Hester'],
  [92, 27, 'Prior Tomas'],
  [83, 12, 'Choir Pulley'],
  [99, 11, 'Nave Clapper'],
  [123, 76, 'Secret Shoal Ringlet'],
  [161, 50, 'Smith Marrow'],
  [175, 53, 'Watchman Callum'],
  [193, 60, 'Redwick Clapper'],
  [173, 41, 'Bell III Redwick'],
  [206, 77, 'Apprentice Pip'],
  [224, 77, 'Breakwater Clapper'],
  [220, 65, 'Bell IV Breakwater'],
]) {
  assert.ok(early.has(k(x, y)), `${label} at (${x},${y}) unreachable early`);
}
for (let x = 108; x <= 116; x++) {
  for (let y = 20; y <= 22; y++) wm.setTile(x, y, '=', TILE_BRIDGE);
}
const choirReach = bfsReachable(wm, 22, 68, true);
assert.ok(choirReach.has(k(127, 14)), 'St Jude Bell II unreachable after pulley');
assert.ok(choirReach.has(k(212, 18)), 'Vane secret vent route unreachable');

for (const x of [172, 173, 174]) wm.setTile(x, 35, ':', TILE_ROAD);
const fullReach = bfsReachable(wm, 22, 68, true);
assert.ok(fullReach.has(k(213, 9)), 'Master Dam Bell unreachable after sluice open');

// 2. Full Simulation Walkthrough + Matrix Hygiene Audit
const game = new BellglassGame({ seed: 419 });
assert.equal(game.screen, 'title');
game.handleAction('confirm');
assert.equal(game.screen, 'play');

// Salt crystal break
game.player.x = 44;
game.player.y = 62;
assert.equal(game.world.kinds[62][46], TILE_SALT);
game.handleAction('fork');
assert.equal(game.world.kinds[62][46], 'mud');
assert.ok(game.shoalLitTimer > 5);

// Parry + Critical strike
const warden = game.enemies.find((e) => e.tpl.id === 'e_warden_1');
warden.x = game.player.x + 1;
warden.y = game.player.y;
warden.state = 'windup';
warden.stateTimer = 0.04;
warden.aimX = game.player.x;
warden.aimY = game.player.y;
const hp0 = game.player.hp;
game.handleAction('parry');
game.update(0.04);
game.update(0.04);
assert.equal(game.player.hp, hp0);
assert.equal(warden.state, 'staggered');
game.player.fx = 1;
game.player.fy = 0;
const wHp0 = warden.hp;
game.handleAction('strike');
assert.equal(wHp0 - warden.hp, 24);

// Smith trade + 5-choice dialogue wrap check + Boss Vane defeat + 5 Bells -> Victory
game.player.brass = 80;
game.player.oil = 10;
game.player.x = 161;
game.player.y = 51;
game.handleAction('interact');
assert.equal(game.screen, 'dialogue');
assert.equal(game.activeChoices.length, 5);
{
  const dBuf = game.renderBuffer();
  const row35 = dBuf[35].map(([c]) => c).join('');
  const row36 = dBuf[36].map(([c]) => c).join('');
  const combined = `${row35}\n${row36}`;
  for (let i = 1; i <= 5; i++) {
    assert.ok(combined.includes(`[${i}]`), `Missing choice [${i}] in wrapped dialogue rows:\n${combined}`);
  }
  assert.ok(!combined.includes('..'), `Unexpected truncation in dialogue choices:\n${combined}`);
}
game.handleAction('fork'); // Confirm via Space ('fork')
assert.equal(game.player.bladeTier, 2);
game.handleAction('cancel');

const boss = game.enemies.find((e) => e.tpl.isBoss);
game.player.x = boss.x - 1;
game.player.y = boss.y;
game.player.fx = 1;
game.player.fy = 0;
for (let i = 0; i < 6; i++) game.update(0.05); // Recover strike cooldown
boss.hp = 10;
game.handleAction('strike');
assert.equal(boss.alive, false);
assert.ok(game.player.clappers.has('clapper_foundry'));

for (const b of game.world.belfries) {
  game.player.clappers.add(b.clapperId);
  game.player.x = b.x;
  game.player.y = b.y + 1;
  game.handleAction('interact');
}
assert.equal(game.bellsRungCount(), 5);
assert.equal(game.screen, 'victory');

// Validate all screens match 38x104 clean single-width ASCII + valid grade
for (const scr of ['title', 'help', 'play', 'ledger', 'dead', 'victory']) {
  game.screen = scr;
  const buf = game.renderBuffer();
  assert.equal(buf.length, GRID_ROWS);
  for (const row of buf) {
    assert.equal(row.length, GRID_COLS);
    for (const [ch, grade] of row) {
      assert.equal(ch.length, 1);
      const code = ch.charCodeAt(0);
      assert.ok(code >= 32 && code <= 126, `Bad char ${code}`);
      assert.ok([0, 1, 2, 3, 4].includes(grade), `Bad grade ${grade}`);
    }
  }
}

// Space ('fork') confirms title, help, ledger, dead, victory modals cleanly
const modalCheck = new BellglassGame({ seed: 419 });
assert.equal(modalCheck.screen, 'title');
modalCheck.handleAction('fork');
assert.equal(modalCheck.screen, 'play');
modalCheck.handleAction('help');
assert.equal(modalCheck.screen, 'help');
modalCheck.handleAction('fork');
assert.equal(modalCheck.screen, 'play');
modalCheck.handleAction('ledger');
assert.equal(modalCheck.screen, 'ledger');
modalCheck.handleAction('fork');
assert.equal(modalCheck.screen, 'play');
modalCheck.screen = 'dead';
modalCheck.handleAction('fork');
assert.equal(modalCheck.screen, 'play');
modalCheck.screen = 'victory';
modalCheck.handleAction('fork');
assert.equal(modalCheck.screen, 'play');

// 3. CrtCanvasRenderer (both fallback & offscreen atlas path) + BellAudio smoke verification
let fillTextCalls = 0;
let drawImageCalls = 0;
const makeMockCtx = () => ({
  fillStyle: '#000',
  shadowColor: '#000',
  shadowBlur: 0,
  font: '',
  textBaseline: 'top',
  setTransform() {},
  clearRect() {},
  createRadialGradient() {
    return { addColorStop() {} };
  },
  fillRect() {},
  drawImage() {
    drawImageCalls++;
  },
  fillText(ch) {
    assert.equal(ch.length, 1);
    fillTextCalls++;
  },
});
const mockCtx = makeMockCtx();
const mockCanvas = {
  width: 0,
  height: 0,
  getContext() {
    return mockCtx;
  },
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1144, height: 760 };
  },
};
assert.ok(wm.decorLines.length >= 40, `Expected dense regional landmarks, got ${wm.decorLines.length}`);

modalCheck.screen = 'title';
const titleBuf = modalCheck.renderBuffer();
let titleNonSpace = 0;
for (const row of titleBuf) {
  for (const [ch] of row) if (ch !== ' ') titleNonSpace++;
}
assert.ok(titleNonSpace > 1400, `Expected rich title diorama density, saw ${titleNonSpace}`);

modalCheck.handleAction('confirm');
modalCheck.player.x = 26;
modalCheck.player.y = 67;
const hesterRow33 = modalCheck.renderBuffer()[33].map(([c]) => c).join('');
assert.ok(hesterRow33.includes('--[ [E] Speak: Old Hester ]--'), `Expected tight Hester prompt on Row 33, got: ${hesterRow33}`);

const renderer = new CrtCanvasRenderer(mockCanvas);
assert.equal(renderer.getTheme().id, 'amber');
const nextTheme = renderer.cyclePhosphor();
assert.equal(nextTheme.id, 'verdigris');
assert.equal(renderer.cyclePhosphor().id, 'ivory');
assert.equal(renderer.cyclePhosphor().id, 'amber');
game.screen = 'title';
renderer.draw(game.renderBuffer());
assert.ok(fillTextCalls > 150, `Expected substantial fallback fillText draw, saw ${fillTextCalls}`);
assert.deepEqual(renderer.hitTestCell(55, 42), { col: 5, row: 2 });

// Now test Atlas fast-path when offscreen document.createElement is available
const prevDoc = globalThis.document;
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return { width: 0, height: 0, getContext: () => makeMockCtx() };
  },
};
const atlasRenderer = new CrtCanvasRenderer(mockCanvas);
assert.ok(atlasRenderer.atlas !== null, 'Expected glyph atlas to build when canvas API exists');
assert.ok(atlasRenderer.crtOverlay !== null, 'Expected pre-baked CRT overlay');
atlasRenderer.draw(game.renderBuffer());
assert.ok(drawImageCalls > 150, `Expected atlas drawImage calls, saw ${drawImageCalls}`);
globalThis.document = prevDoc;

const audio = new BellAudio();
audio.play('fork'); // Safe no-op without browser AudioContext

// Verify every world map cell is a single-cell printable ASCII string (32..126),
// catching any unresolved glyph generator passed into paintRect/paintHollowBox.
for (let y = 0; y < wm.height; y++) {
  for (let x = 0; x < wm.width; x++) {
    const ch = wm.glyphs[y][x];
    assert.equal(typeof ch, 'string', `Expected string glyph at (${x}, ${y}), got ${typeof ch}`);
    assert.equal(ch.length, 1, `Expected 1-char glyph at (${x}, ${y}), got ${JSON.stringify(ch)}`);
    const code = ch.charCodeAt(0);
    assert.ok(code >= 32 && code <= 126, `Expected printable ASCII at (${x}, ${y}), got ${code}`);
  }
}

// Multi-frame render across Tidemouth Pier, Toll Shed (50, 62), and Orchard Root-House (18, 29)
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return { width: 0, height: 0, getContext: () => makeMockCtx() };
  },
};
const safeAtlasRenderer = new CrtCanvasRenderer(mockCanvas);
const multiFrameGame = new BellglassGame();
multiFrameGame.handleAction('confirm');
for (const [px, py] of [[27, 67], [50, 62], [18, 29]]) {
  multiFrameGame.player.x = px;
  multiFrameGame.player.y = py;
  for (let frame = 0; frame < 15; frame++) {
    multiFrameGame.update(0.05);
    const frameBuf = multiFrameGame.renderBuffer();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const [ch] = frameBuf[r][c];
        assert.equal(typeof ch, 'string', `Non-string frame cell at (${px},${py}) frame=${frame} [${r},${c}]`);
        assert.equal(ch.length, 1);
      }
    }
    safeAtlasRenderer.draw(frameBuf);
    renderer.draw(frameBuf);
  }
}

// Defensive guard: non-string cell in a frame buffer must never throw inside draw()
const corruptBuf = multiFrameGame.renderBuffer();
corruptBuf[0][0] = [() => '#', 2];
safeAtlasRenderer.draw(corruptBuf);
renderer.draw(corruptBuf);
globalThis.document = prevDoc;

console.log(
  JSON.stringify({
    webReachability: 'PASS',
    simulationWalkthrough: 'PASS',
    worldGlyphsValidated: wm.width * wm.height,
    canvasFillTextCalls: fillTextCalls,
    atlasDrawImageCalls: drawImageCalls,
    gridDimensions: [GRID_COLS, GRID_ROWS],
  })
);
