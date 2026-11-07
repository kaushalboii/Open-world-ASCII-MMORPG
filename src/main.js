// Main Entry Point for Tiny Glyphs
// Black & White Open-World ASCII Action Adventure

import { Input } from './engine/Input.js';
import { Camera } from './engine/Camera.js';
import { Renderer } from './engine/Renderer.js';
import { WorldMap, TILE_SIZE } from './world/WorldMap.js';
import { Player } from './entities/Player.js';
import { EntityManager } from './entities/EntityManager.js';
import { ParticleEngine } from './vfx/ParticleEngine.js';
import { DamageTextManager } from './combat/DamageText.js';
import { MiniMap } from './ui/MiniMap.js';
import { soundSynth } from './audio/SoundSynth.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.camera = new Camera(this.renderer.width, this.renderer.height);
    this.input = new Input(this.canvas);

    this.particles = new ParticleEngine();
    this.damageText = new DamageTextManager();
    this.worldMap = new WorldMap(110, 80);
    this.miniMap = new MiniMap(this.worldMap);

    // Spawn player in the central courtyard near the road
    this.spawnPlayerX = 50 * TILE_SIZE;
    this.spawnPlayerY = 40 * TILE_SIZE;
    this.player = new Player(this.spawnPlayerX, this.spawnPlayerY);

    this.entityManager = new EntityManager();
    this.entityManager.initWorldEntities(this.worldMap);

    this.lastTime = performance.now();
    this.isRunning = true;

    this.initUI();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initUI() {
    // Audio un-mute on initial user click
    const startAudio = () => {
      soundSynth.init();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);

    // UI Mute Button
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = soundSynth.toggleMute();
        muteBtn.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
      });
    }

    // CRT Scanline Toggle
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
    this.player = new Player(this.spawnPlayerX, this.spawnPlayerY);
    this.entityManager = new EntityManager();
    this.entityManager.initWorldEntities(this.worldMap);
    this.particles = new ParticleEngine();
    this.damageText = new DamageTextManager();
    this.camera.x = this.spawnPlayerX - this.renderer.width / 2;
    this.camera.y = this.spawnPlayerY - this.renderer.height / 2;
    this.renderer.triggerInvert(0.12);
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Handle restart
    if (this.input.justPressed.restart && this.player.isDead) {
      this.restart();
    }

    // Handle mute shortcut
    if (this.input.justPressed.mute) {
      const isMuted = soundSynth.toggleMute();
      const muteBtn = document.getElementById('muteBtn');
      if (muteBtn) muteBtn.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
    }

    // Update Game Systems
    this.worldMap.update(dt);
    this.player.update(dt, this.input, this.worldMap, this.camera, this.particles, this.damageText);
    this.entityManager.update(dt, this.player, this.worldMap, this.camera, this.particles, this.damageText);
    this.particles.update(dt);
    this.damageText.update(dt);

    // Camera follow player & clamp
    this.camera.follow(this.player.x, this.player.y, dt);
    this.camera.clamp(this.worldMap.worldWidth, this.worldMap.worldHeight);

    // Clear input single-press edge triggers
    this.input.update();

    // Render Frame
    this.renderer.render(
      this.worldMap,
      this.player,
      this.entityManager,
      this.particles,
      this.damageText,
      this.camera,
      dt,
      this.miniMap
    );

    requestAnimationFrame(this.loop);
  }
}

// Start Game on DOM Load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}

