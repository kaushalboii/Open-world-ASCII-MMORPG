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

// Smith trade + Boss Vane defeat + 5 Bells -> Victory
game.player.brass = 80;
game.player.x = 161;
game.player.y = 51;
game.handleAction('interact');
assert.equal(game.screen, 'dialogue');
game.handleAction('choice_1');
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

// 3. CrtCanvasRenderer + BellAudio smoke verification against mock 2D Canvas
let fillTextCalls = 0;
const mockCtx = {
  fillStyle: '#000',
  shadowColor: '#000',
  shadowBlur: 0,
  font: '',
  textBaseline: 'top',
  setTransform() {},
  createRadialGradient() {
    return { addColorStop() {} };
  },
  fillRect() {},
  fillText(ch) {
    assert.equal(ch.length, 1);
    fillTextCalls++;
  },
};
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
const renderer = new CrtCanvasRenderer(mockCanvas);
game.screen = 'title';
renderer.draw(game.renderBuffer());
assert.ok(fillTextCalls > 150, `Expected substantial canvas text draw, saw ${fillTextCalls}`);
assert.deepEqual(renderer.hitTestCell(55, 42), { col: 5, row: 2 });

const audio = new BellAudio();
audio.play('fork'); // Safe no-op without browser AudioContext

console.log(
  JSON.stringify({
    webReachability: 'PASS',
    simulationWalkthrough: 'PASS',
    canvasFillTextCalls: fillTextCalls,
    gridDimensions: [GRID_COLS, GRID_ROWS],
  })
);
