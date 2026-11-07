// PixelPlayer: Arcade Run & Gun / Hack & Slash Hero (Cyber Marino)
// Supports Weapon Evolution (Knife, Cyber Sword, Laser Blaster, Rocket Bazooka, Lightning),
// XP Leveling, Magnet Coin Collection, Mario-style Enemy Stomping, and Star Power!

import { posed, STAND, skeleton } from '../core/rig.js';
import { READY } from '../core/poses.js';
import { createAct, createFx, clearFrame, createFrame, composite } from '../core/index.js';

// Acted Moves from PixelFX
import * as daggerFlurry from '../fx/melee/dagger-flurry.js';
import * as swordCombo from '../fx/moves/sword-combo.js';
import * as pistolShots from '../fx/moves/pistol-shots.js';
import * as rocketLauncher from '../fx/moves/rocket-launcher.js';
import * as lightningCall from '../fx/moves/lightning-call.js';
import * as dashStrike from '../fx/moves/dash-strike.js';
import * as earthStomp from '../fx/moves/earth-stomp.js';
import * as poisonCloud from '../fx/nature/poison-cloud.js';

// Animation poses
const RUN_POSES = [
  { ...READY, ffx: 8, ffy: -2, fbx: -8, fby: 0, fx: -8, fy: -17, bx: 10, by: -17, lean: 5, crouch: 2 },
  { ...READY, ffx: 3, ffy: 0, fbx: -2, fby: -3, fx: 0, fy: -20, bx: 3, by: -19, lean: 3, crouch: 1 },
  { ...READY, ffx: -8, ffy: 0, fbx: 8, fby: -2, fx: 10, fy: -17, bx: -8, by: -17, lean: 5, crouch: 2 },
  { ...READY, ffx: -2, ffy: -3, fbx: 3, fby: 0, fx: 3, fy: -19, bx: 0, by: -20, lean: 3, crouch: 1 },
];

const JUMP_UP_POSE = { ...READY, ffx: 4, ffy: -7, fbx: -4, fby: -9, fx: 6, fy: -28, bx: 6, by: -28, lean: -3, crouch: 0 };
const FALL_POSE = { ...READY, ffx: 6, ffy: -2, fbx: -5, fby: -4, fx: 10, fy: -18, bx: -7, by: -18, lean: 3, crouch: 1 };

export class PixelPlayer {
  constructor(x = 60, y = 140) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1: right, -1: left
    this.onGround = true;

    // Progression & RPG Stats
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = 80;
    this.coins = 0; // Total loot collected
    this.score = 0;
    this.kills = 0;

    // Upgradable Attributes
    this.hp = 100;
    this.maxHp = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.flasks = 3;
    this.maxFlasks = 5;
    this.damageMultiplier = 1.0;
    this.magnetRadius = 55; // Pulls loot towards player
    this.moveSpeed = 150;
    this.maxJumps = 2; // Double jump default, can upgrade to triple jump!
    this.jumpsLeft = 2;

    // Weapon Inventory & Evolution
    this.unlockedWeapons = ['knife', 'sword']; // knife, sword, pistol, rocket, lightning
    this.currentWeaponIndex = 0; // Starts with fast dagger / knife!

    // Power-Up Timers
    this.starPowerTimer = 0; // Mario-style invulnerability star
    this.invulnerableTimer = 0;
    this.freezeTimer = 0; // Impact freeze stop

    // Active Move state
    this.activeAct = null;
    this.activeMoveName = null;
    this.animTime = 0;

    // Scarf nodes
    this.scarfNodes = [
      { x: this.x, y: this.y - 28 },
      { x: this.x - 4, y: this.y - 27 },
      { x: this.x - 8, y: this.y - 25 },
      { x: this.x - 12, y: this.y - 23 },
    ];
  }

  get currentWeapon() {
    return this.unlockedWeapons[this.currentWeaponIndex] || 'knife';
  }

  cycleWeapon() {
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.unlockedWeapons.length;
    return this.currentWeapon;
  }

  unlockWeapon(weaponId) {
    if (!this.unlockedWeapons.includes(weaponId)) {
      this.unlockedWeapons.push(weaponId);
      this.currentWeaponIndex = this.unlockedWeapons.indexOf(weaponId);
      return true;
    }
    return false;
  }

  gainXP(amount) {
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      this.xpNeeded = Math.floor(this.xpNeeded * 1.4);
      this.maxHp += 15;
      this.hp = this.maxHp;
      this.maxEnergy += 10;
      this.energy = this.maxEnergy;
      this.damageMultiplier += 0.15;
      leveledUp = true;

      // Auto-unlock weapons as reward milestones!
      if (this.level === 2) this.unlockWeapon('pistol');
      if (this.level === 4) this.unlockWeapon('rocket');
      if (this.level === 6) this.unlockWeapon('lightning');
    }
    return leveledUp;
  }

  // Execute equipped weapon attack or special move
  attack(onHitCallback) {
    if (this.activeAct) return false;
    const weapon = this.currentWeapon;

    let mod = null;
    let energyCost = 5;

    switch (weapon) {
      case 'knife':
        mod = daggerFlurry;
        energyCost = 6;
        break;
      case 'sword':
        mod = swordCombo;
        energyCost = 12;
        break;
      case 'pistol':
        mod = pistolShots;
        energyCost = 10;
        break;
      case 'rocket':
        mod = rocketLauncher;
        energyCost = 25;
        break;
      case 'lightning':
        mod = lightningCall;
        energyCost = 30;
        break;
      default:
        mod = daggerFlurry;
    }

    if (this.energy < energyCost) return false;
    this.energy -= energyCost;

    const flip = this.facing === -1;
    this.activeAct = createAct(mod, { x: this.x, y: this.y, flip });
    this.activeMoveName = weapon;

    if (onHitCallback) {
      this.activeAct.onHit = (hit) => onHitCallback(hit, this, weapon);
    }

    return true;
  }

  // Special abilities
  playSpecial(moveType, onHitCallback) {
    if (this.activeAct) return false;
    let mod = null;
    let energyCost = 0;

    if (moveType === 'dash') {
      mod = dashStrike;
      energyCost = 20;
      this.invulnerableTimer = 0.45;
      this.vx = this.facing * 340;
    } else if (moveType === 'stomp') {
      mod = earthStomp;
      energyCost = 18;
    }

    if (this.energy < energyCost) return false;
    this.energy -= energyCost;

    const flip = this.facing === -1;
    this.activeAct = createAct(mod, { x: this.x, y: this.y, flip });
    this.activeMoveName = moveType;

    if (onHitCallback) {
      this.activeAct.onHit = (hit) => onHitCallback(hit, this, moveType);
    }

    return true;
  }

  update(dt, input, world, onHitCallback, spawnPoisonCloud) {
    // Regenerate stamina
    this.energy = Math.min(this.maxEnergy, this.energy + 14 * dt);
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.starPowerTimer > 0) this.starPowerTimer -= dt;

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      return;
    }

    // 1. If currently executing an active move, step it
    if (this.activeAct) {
      this.activeAct.update(dt);

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

    // 2. Weapon switch / Cycle input
    if (input.wasJustPressed('KeyQ') || input.wasJustPressed('TouchWeapon')) {
      this.cycleWeapon();
    }

    // 3. Attack inputs
    if (input.isDown('punch') || input.isDown('KeyJ') || input.isDown('KeyZ')) {
      this.attack(onHitCallback);
    } else if (input.isDown('dash') || input.isDown('KeyL') || input.isDown('KeyC')) {
      this.playSpecial('dash', onHitCallback);
    } else if (input.isDown('stomp') || input.isDown('KeyU')) {
      this.playSpecial('stomp', onHitCallback);
    } else if ((input.isDown('flask') || input.isDown('KeyK') || input.isDown('KeyE')) && this.flasks > 0) {
      this.flasks--;
      if (spawnPoisonCloud) {
        spawnPoisonCloud(this.x + this.facing * 45, this.y);
      }
    }

    // 4. Movement & Running Physics
    let moving = false;
    if (input.isDown('left') || input.isDown('ArrowLeft') || input.isDown('KeyA')) {
      this.vx = -this.moveSpeed;
      this.facing = -1;
      moving = true;
    } else if (input.isDown('right') || input.isDown('ArrowRight') || input.isDown('KeyD')) {
      this.vx = this.moveSpeed;
      this.facing = 1;
      moving = true;
    } else {
      this.vx *= Math.max(0, 1 - 20 * dt);
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // 5. Jump & Double / Triple Jump
    const jumpPressed = input.isDown('jump') || input.isDown('Space') || input.isDown('KeyW') || input.isDown('ArrowUp');
    if (jumpPressed && !this.wasJumpDown) {
      if (this.onGround) {
        this.vy = -315;
        this.onGround = false;
        this.jumpsLeft = this.maxJumps - 1;
      } else if (this.jumpsLeft > 0) {
        this.vy = -285;
        this.jumpsLeft--;
      }
    }
    this.wasJumpDown = jumpPressed;

    // Gravity
    this.vy += 760 * dt;
    if (this.vy > 500) this.vy = 500;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Platform Collisions
    if (world) {
      const col = world.resolvePlayerCollision(this.x, this.y, 14, 34);
      this.x = col.x;
      this.y = col.y;
      this.onGround = col.onGround;
      if (col.onGround && this.vy > 0) {
        this.vy = 0;
        this.jumpsLeft = this.maxJumps;
      }
    }

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

  getCurrentPose() {
    if (!this.onGround) {
      return this.vy < 0 ? JUMP_UP_POSE : FALL_POSE;
    }
    if (Math.abs(this.vx) > 10) {
      const idx = Math.floor(this.animTime) % RUN_POSES.length;
      return RUN_POSES[idx];
    }
    const breath = Math.sin(this.animTime) * 1.2;
    return { ...READY, crouch: 3 + breath, lean: 0, fx: 11, fy: -21 + breath, bx: 9, by: -21 + breath };
  }

  draw(frame, theme = 'color') {
    const W = frame.w;
    const H = frame.h;

    // If active move is executing, let act render character and effects
    if (this.activeAct) {
      this.activeAct.draw(frame, { body: true, target: false });
      this.drawScarf(frame, theme);
      return;
    }

    const pose = this.getCurrentPose();
    const r = posed(pose);
    const flip = this.facing === -1;
    const bx = Math.round(this.x);
    const by = Math.round(this.y);

    // Floor Shadow
    const sy = by;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = -8; dx <= 8; dx++) {
        const px = bx + dx;
        const py = sy + dy;
        if (px >= 0 && px < W && py >= 0 && py < H) {
          frame.color[py * W + px] = 0xff100c14;
        }
      }
    }

    // Star Power flashing rainbow colors
    const isStarActive = this.starPowerTimer > 0;
    const starCycle = Math.floor(performance.now() / 80) % 5;
    const starColors = [0xffffff00, 0xffff0080, 0xff00ffff, 0xff00ff40, 0xffffffff];

    // Paint Character Pixels
    for (let i = 0; i < r.n; i++) {
      const px = flip ? bx - r.xs[i] - 1 : bx + r.xs[i];
      const py = by + r.ys[i];
      if (px >= 0 && px < W && py >= 0 && py < H) {
        const idx = py * W + px;
        if (isStarActive) {
          frame.color[idx] = starColors[starCycle];
          frame.light[idx] = starColors[starCycle];
        } else if (theme === 'bw') {
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          frame.color[idx] = lum > 80 ? 0xffffffff : 0xff121212;
        } else if (theme === 'green') {
          const lum = ((r.color[i] & 255) + ((r.color[i] >>> 8) & 255) + ((r.color[i] >>> 16) & 255)) / 3;
          frame.color[idx] = (255 << 24) | ((lum > 60 ? 240 : 40) << 8) | (lum > 80 ? 80 : 0);
        } else {
          frame.color[idx] = r.color[i];
        }
      }
    }

    // Cyber Visor Highlight
    const visorX = flip ? bx - 3 : bx + 3;
    const visorY = by - 29;
    const visorColor = isStarActive ? 0xffffffff : theme === 'bw' ? 0xffffffff : theme === 'green' ? 0xff20ff80 : 0xff00f0ff;
    for (let dx = -1; dx <= 2; dx++) {
      const vx = visorX + dx;
      if (vx >= 0 && vx < W && visorY >= 0 && visorY < H) {
        frame.color[visorY * W + vx] = visorColor;
        frame.light[visorY * W + vx] = visorColor;
      }
    }

    this.drawScarf(frame, theme);
  }

  drawScarf(frame, theme) {
    const W = frame.w;
    const H = frame.h;
    const scarfColor = this.starPowerTimer > 0 ? 0xffffff00 : theme === 'bw' ? 0xffffffff : theme === 'green' ? 0xff20ff80 : 0xfff53cd1;

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
    if (this.invulnerableTimer > 0 || this.starPowerTimer > 0) return 0;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 0.6;
    return amount;
  }
}
