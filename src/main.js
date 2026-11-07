// 2D Side-Scrolling ASCII Action Platformer
// Features animated Cyber Ninja, straight punches, double jump, Sprite Fusion poison VFX, and Warlord Boss

import { Input } from './engine/Input.js';
import { Camera } from './engine/Camera.js';
import { PlatformRenderer } from './engine/PlatformRenderer.js';
import { PlatformLevel } from './world/PlatformLevel.js';
import { PlatformPlayer } from './entities/PlatformPlayer.js';
import { PlatformEnemy } from './entities/PlatformEnemy.js';
import { ProjectileManager } from './vfx/PlatformVFX.js';
import { ParticleEngine } from './vfx/ParticleEngine.js';
import { DamageTextManager } from './combat/DamageText.js';
import { soundSynth } from './audio/SoundSynth.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new PlatformRenderer(this.canvas);
    this.camera = new Camera(this.renderer.width, this.renderer.height);
    this.input = new Input(this.canvas);

    this.particles = new ParticleEngine();
    this.damageText = new DamageTextManager();
    this.projectiles = new ProjectileManager();

    this.level = new PlatformLevel(3200, 600);
    this.player = new PlatformPlayer(100, 480);

    this.enemies = [];
    this.initEnemies();

    // Wire attack check in level to damage enemies
    this.level.checkPlayerAttack = (hitX, hitY, radius, damage, player, damageText, particles, camera) => {
      for (const e of this.enemies) {
        if (!e.isDead && Math.hypot(e.x - hitX, e.y - hitY) <= radius + e.width / 2) {
          e.takeDamage(damage, damageText, particles, camera);
          if (e.isDead) player.kills++;
        }
      }
    };

    this.lastTime = performance.now();
    this.initUI();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initEnemies() {
    this.enemies = [
      // Street & Lower Platform Mutants
      new PlatformEnemy(420, 500, 'mutant'),
      new PlatformEnemy(700, 500, 'mutant'),
      new PlatformEnemy(440, 350, 'drone'),
      new PlatformEnemy(600, 220, 'mutant'),

      // Industrial Zone
      new PlatformEnemy(1100, 500, 'mutant'),
      new PlatformEnemy(1300, 330, 'drone'),
      new PlatformEnemy(1500, 190, 'drone'),
      new PlatformEnemy(1720, 300, 'mutant'),

      // High-Rise Ruins
      new PlatformEnemy(2100, 410, 'mutant'),
      new PlatformEnemy(2300, 340, 'drone'),
      new PlatformEnemy(2450, 200, 'drone'),
      new PlatformEnemy(2700, 320, 'mutant'),

      // End-Stage Boss: Cyber Warlord Goliath
      new PlatformEnemy(2980, 460, 'warlord')
    ];
  }

  initUI() {
    const startAudio = () => {
      soundSynth.init();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);

    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = soundSynth.toggleMute();
        muteBtn.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
      });
    }

    const crtBtn = document.getElementById('crtBtn');
    const container = document.getElementById('gameContainer');
    if (crtBtn && container) {
      crtBtn.addEventListener('click', () => {
        container.classList.toggle('crt');
        crtBtn.textContent = container.classList.contains('crt') ? 'CRT EFFECT: ON' : 'CRT EFFECT: OFF';
      });
    }
  }

  restart() {
    this.player = new PlatformPlayer(100, 480);
    this.projectiles = new ProjectileManager();
    this.particles = new ParticleEngine();
    this.damageText = new DamageTextManager();
    this.initEnemies();
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.input.justPressed.restart && this.player.isDead) {
      this.restart();
    }

    if (this.input.justPressed.mute) {
      const isMuted = soundSynth.toggleMute();
      const muteBtn = document.getElementById('muteBtn');
      if (muteBtn) muteBtn.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
    }

    const spawnProj = (x, y, vx, vy, type) => {
      this.projectiles.spawn(x, y, vx, vy, type);
    };

    // 1. Update Player
    this.player.update(dt, this.input, this.level, this.particles, this.damageText, this.camera, spawnProj);

    // 2. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.level, this.particles, this.damageText, this.camera, spawnProj);
      if (e.isDead && e.type !== 'warlord') {
        this.enemies.splice(i, 1);
      }
    }

    // 3. Update Projectiles & Poison Clouds
    this.projectiles.update(dt, this.level, this.player, this.enemies, this.damageText, this.particles, this.camera);

    // 4. Update Particle & Combat Text
    this.particles.update(dt);
    this.damageText.update(dt);

    // 5. Update Camera (Smooth Horizontal Follow with Vertical Lookahead)
    const targetCamX = this.player.x;
    const targetCamY = Math.min(this.player.y, 400);
    this.camera.follow(targetCamX, targetCamY, dt, 5.0);
    this.camera.clamp(this.level.width, this.level.height);

    // 6. Check Pickup Collection
    for (let i = this.level.collectibles.length - 1; i >= 0; i--) {
      const c = this.level.collectibles[i];
      if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < 24) {
        if (c.type === 'gold') {
          this.player.score += 50;
          this.damageText.add(c.x, c.y, '+50 PTS', 'gold');
          soundSynth.playCoin();
        } else if (c.type === 'flask') {
          this.player.flasks++;
          this.damageText.add(c.x, c.y, '+1 FLASK', 'crit');
          soundSynth.playClank();
        }
        this.particles.emitSparks(c.x, c.y, 8, ['*', '+']);
        this.level.collectibles.splice(i, 1);
      }
    }

    this.input.update();

    // 7. Render Everything
    this.renderer.render(
      this.level,
      this.player,
      this.enemies,
      this.projectiles,
      this.particles,
      this.damageText,
      this.camera,
      dt
    );

    requestAnimationFrame(this.loop);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}
