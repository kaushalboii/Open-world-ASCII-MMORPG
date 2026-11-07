// PixelPlayer: Interactive character powered by PixelFX procedural rigging & acted moves
// Uses 3D skeletal rig (rig.js / posed) and acted moves (dash-strike, sword-combo, earth-stomp, poison-cloud, lightning-call)

import { posed, STAND, skeleton } from '../core/rig.js';
import { READY } from '../core/poses.js';
import { createAct, createFx, clearFrame, createFrame, composite } from '../core/index.js';
import * as swordCombo from '../fx/moves/sword-combo.js';
import * as dashStrike from '../fx/moves/dash-strike.js';
import * as earthStomp from '../fx/moves/earth-stomp.js';
import * as lightningCall from '../fx/moves/lightning-call.js';
import * as poisonCloud from '../fx/nature/poison-cloud.js';
import * as slashFx from '../fx/melee/sword-slash.js';

// Pre-defined procedural animation poses for smooth movement
const RUN_POSES = [
  { ...READY, ffx: 8, ffy: -2, fbx: -8, fby: 0, fx: -8, fy: -17, bx: 10, by: -17, lean: 5, crouch: 2 },
  { ...READY, ffx: 3, ffy: 0, fbx: -2, fby: -3, fx: 0, fy: -20, bx: 3, by: -19, lean: 3, crouch: 1 },
  { ...READY, ffx: -8, ffy: 0, fbx: 8, fby: -2, fx: 10, fy: -17, bx: -8, by: -17, lean: 5, crouch: 2 },
  { ...READY, ffx: -2, ffy: -3, fbx: 3, fby: 0, fx: 3, fy: -19, bx: 0, by: -20, lean: 3, crouch: 1 },
];

const JUMP_UP_POSE = { ...READY, ffx: 4, ffy: -7, fbx: -4, fby: -9, fx: 6, fy: -28, bx: 6, by: -28, lean: -3, crouch: 0 };
const FALL_POSE = { ...READY, ffx: 6, ffy: -2, fbx: -5, fby: -4, fx: 10, fy: -18, bx: -7, by: -18, lean: 3, crouch: 1 };
const LAND_POSE = { ...READY, ffx: 7, ffy: 0, fbx: -7, fby: 0, fx: 12, fy: -14, bx: 6, by: -14, lean: 6, crouch: 6 };

export class PixelPlayer {
  constructor(x = 60, y = 140) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1: right, -1: left
    this.onGround = true;
    this.doubleJumpAvailable = true;

    // Combat Stats
    this.hp = 100;
    this.maxHp = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.flasks = 3;
    this.maxFlasks = 5;
    this.score = 0;
    this.kills = 0;

    // Animation & Move State
    this.animTime = 0;
    this.activeAct = null; // Currently executing PixelFX move
    this.activeMoveName = null;
    this.invulnerableTimer = 0;
    this.freezeTimer = 0; // Impact freeze

    // Scarf physics simulation
    this.scarfNodes = [
      { x: this.x, y: this.y - 28 },
      { x: this.x - 4, y: this.y - 27 },
      { x: this.x - 8, y: this.y - 25 },
      { x: this.x - 12, y: this.y - 23 },
    ];
  }

  // Execute a PixelFX Move
  playMove(moveType, onHitCallback) {
    if (this.activeAct) return false;

    let mod = null;
    let energyCost = 0;

    switch (moveType) {
      case 'combo':
      case 'punch':
        mod = swordCombo;
        energyCost = 10;
        break;
      case 'dash':
        mod = dashStrike;
        energyCost = 25;
        this.invulnerableTimer = 0.45;
        break;
      case 'stomp':
        mod = earthStomp;
        energyCost = 20;
        break;
      case 'lightning':
        mod = lightningCall;
        energyCost = 35;
        break;
      case 'slash':
        mod = slashFx;
        energyCost = 8;
        break;
      default:
        return false;
    }

    if (this.energy < energyCost) return false;
    this.energy -= energyCost;

    const flip = this.facing === -1;
    this.activeAct = createAct(mod, { x: this.x, y: this.y, flip });
    this.activeMoveName = moveType;

    if (onHitCallback) {
      this.activeAct.onHit = (hit) => onHitCallback(hit, this);
    }

    // Dash burst physics
    if (moveType === 'dash') {
      this.vx = this.facing * 320;
    }

    return true;
  }

  update(dt, input, world, onHitCallback, spawnPoisonCloud) {
    // Regenerate stamina slowly
    this.energy = Math.min(this.maxEnergy, this.energy + 12 * dt);
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    // If frozen in hit-stop, pause animation updates
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    // 1. If currently executing an Acted Move, step it
    if (this.activeAct) {
      this.activeAct.update(dt);

      // Dash translation
      if (this.activeMoveName === 'dash') {
        this.x += this.vx * dt;
        this.vx *= Math.max(0, 1 - 6 * dt);
      }

      if (this.activeAct.frozen) {
        this.freezeTimer = 0.08;
      }

      if (this.activeAct.done() || this.activeAct.t >= (this.activeAct.meta?.duration || 1.2)) {
        this.activeAct = null;
        this.activeMoveName = null;
      }
      this.updateScarf(dt);
      return;
    }

    // 2. Handle Player Abilities & Inputs
    if (input.isDown('punch') || input.isDown('KeyJ') || input.isDown('KeyZ')) {
      this.playMove('combo', onHitCallback);
    } else if (input.isDown('dash') || input.isDown('KeyL') || input.isDown('KeyC')) {
      this.playMove('dash', onHitCallback);
    } else if (input.isDown('stomp') || input.isDown('KeyU')) {
      this.playMove('stomp', onHitCallback);
    } else if (input.isDown('lightning') || input.isDown('KeyO')) {
      this.playMove('lightning', onHitCallback);
    } else if ((input.isDown('flask') || input.isDown('KeyK') || input.isDown('KeyE')) && this.flasks > 0) {
      this.flasks--;
      if (spawnPoisonCloud) {
        spawnPoisonCloud(this.x + this.facing * 40, this.y);
      }
    }

    // 3. Movement & Horizontal Physics
    const speed = 140;
    let moving = false;

    if (input.isDown('left') || input.isDown('ArrowLeft') || input.isDown('KeyA')) {
      this.vx = -speed;
      this.facing = -1;
      moving = true;
    } else if (input.isDown('right') || input.isDown('ArrowRight') || input.isDown('KeyD')) {
      this.vx = speed;
      this.facing = 1;
      moving = true;
    } else {
      this.vx *= Math.max(0, 1 - 18 * dt);
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // 4. Jump & Gravity
    const jumpPressed = input.isDown('jump') || input.isDown('Space') || input.isDown('KeyW') || input.isDown('ArrowUp');
    if (jumpPressed && !this.wasJumpDown) {
      if (this.onGround) {
        this.vy = -310;
        this.onGround = false;
        this.doubleJumpAvailable = true;
      } else if (this.doubleJumpAvailable) {
        this.vy = -280;
        this.doubleJumpAvailable = false;
      }
    }
    this.wasJumpDown = jumpPressed;

    // Apply gravity
    this.vy += 760 * dt;
    if (this.vy > 480) this.vy = 480;

    // Apply movement
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 5. World Floor & Platform Collisions
    if (world) {
      const col = world.resolvePlayerCollision(this.x, this.y, 14, 34);
      this.x = col.x;
      this.y = col.y;
      this.onGround = col.onGround;
      if (col.onGround && this.vy > 0) {
        this.vy = 0;
      }
    }

    // Update animation timer
    if (moving && this.onGround) {
      this.animTime += dt * 10;
    } else {
      this.animTime += dt * 3;
    }

    this.updateScarf(dt);
  }

  updateScarf(dt) {
    const headX = this.x - this.facing * 4;
    const headY = this.y - 28;
    this.scarfNodes[0] = { x: headX, y: headY };

    for (let i = 1; i < this.scarfNodes.length; i++) {
      const prev = this.scarfNodes[i - 1];
      const curr = this.scarfNodes[i];
      const targetX = prev.x - this.facing * 4 + Math.sin(this.animTime * 2 + i) * 1.5;
      const targetY = prev.y + 1.2 + Math.cos(this.animTime * 2 + i) * 1.2;

      curr.x += (targetX - curr.x) * Math.min(1, 16 * dt);
      curr.y += (targetY - curr.y) * Math.min(1, 16 * dt);
    }
  }

  // Get current skeletal pose based on state
  getCurrentPose() {
    if (!this.onGround) {
      return this.vy < 0 ? JUMP_UP_POSE : FALL_POSE;
    }
    if (Math.abs(this.vx) > 10) {
      const idx = Math.floor(this.animTime) % RUN_POSES.length;
      return RUN_POSES[idx];
    }
    // Idle breathing
    const breath = Math.sin(this.animTime) * 1.2;
    return { ...READY, crouch: 3 + breath, lean: 0, fx: 11, fy: -21 + breath, bx: 9, by: -21 + breath };
  }

  // Draw Player directly onto PixelFX frame
  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;

    // If an act is playing, let the act render the character and its effects
    if (this.activeAct) {
      this.activeAct.draw(frame, { body: true, target: false });
      this.drawScarf(frame, theme);
      return;
    }

    // Otherwise, render procedural posed character from rig.js
    const pose = this.getCurrentPose();
    const r = posed(pose);
    const flip = this.facing === -1;
    const bx = Math.round(this.x);
    const by = Math.round(this.y);

    // Draw shadow under feet
    const sy = by;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const px = bx + dx;
        const py = sy + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const idx = py * W + px;
          frame.color[idx] = 0xff100c14; // dark shadow
        }
      }
    }

    // Paint character pixels
    for (let i = 0; i < r.n; i++) {
      const px = flip ? bx - r.xs[i] - 1 : bx + r.xs[i];
      const py = by + r.ys[i];
      if (px >= 0 && px < W && py >= 0 && py < H) {
        const idx = py * W + px;
        if (theme === 'bw') {
          // High-contrast monochrome black & white
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          frame.color[idx] = lum > 80 ? 0xffffffff : 0xff101010;
        } else if (theme === 'green') {
          // Phosphor matrix terminal
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          frame.color[idx] = (255 << 24) | ((lum > 60 ? 240 : 40) << 8) | (lum > 80 ? 80 : 0);
        } else {
          // Full 32-bit color
          frame.color[idx] = r.color[i];
        }
      }
    }

    // Draw cyber visor highlight
    const visorX = flip ? bx - 3 : bx + 3;
    const visorY = by - 29;
    const visorColor = theme === 'bw' ? 0xffffffff : theme === 'green' ? 0xff20ff80 : 0xff3cd1f5;
    for (let dx = -1; dx <= 2; dx++) {
      const vx = visorX + dx;
      if (vx >= 0 && vx < W && visorY >= 0 && visorY < H) {
        frame.color[visorY * W + vx] = visorColor;
        frame.light[visorY * W + vx] = visorColor; // Visor additive glow
      }
    }

    this.drawScarf(frame, theme);
  }

  // Draw flowing scarf
  drawScarf(frame, theme) {
    const W = frame.w;
    const H = frame.h;
    const scarfColor = theme === 'bw' ? 0xffffffff : theme === 'green' ? 0xff20ff80 : 0xfff53cd1;

    for (let i = 0; i < this.scarfNodes.length; i++) {
      const node = this.scarfNodes[i];
      const px = Math.round(node.x);
      const py = Math.round(node.y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const sx = px + dx;
          const sy = py + dy;
          if (sx >= 0 && sx < W && sy >= 0 && sy < H) {
            frame.color[sy * W + sx] = scarfColor;
          }
        }
      }
    }
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return 0;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 0.6;
    return amount;
  }
}
