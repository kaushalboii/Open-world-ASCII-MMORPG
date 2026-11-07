// Main Entry Point: Pure Monospace ASCII 2D Action Platformer
// Features animated Cyber Ninja, straight punches, double jumping, Sprite Fusion poison VFX, and Warlord Boss

import { AsciiGrid } from './engine/AsciiGrid.js';
import { AsciiNinja } from './entities/AsciiNinja.js';
import { AsciiWorld } from './world/AsciiWorld.js';
import { AsciiEnemy } from './entities/AsciiEnemies.js';
import { AsciiProjectiles } from './vfx/AsciiPoisonVFX.js';
import { AsciiFeedback } from './combat/AsciiFeedback.js';
import { Input } from './engine/Input.js';
import { soundSynth } from './audio/SoundSynth.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Internal virtual resolution
    this.canvas.width = 960;
    this.canvas.height = 540;

    // 100 columns x 34 rows pure ASCII grid
    this.grid = new AsciiGrid(100, 34);
    this.input = new Input(this.canvas);
    this.showGuide = true; // Display interactive guide on startup!

    this.world = new AsciiWorld(100, 34);
    this.player = new AsciiNinja(10, 20);
    this.feedback = new AsciiFeedback();
    this.projectiles = new AsciiProjectiles();

    this.enemies = [];
    this.initEnemies();

    // Wire melee attack hit listener
    this.world.onMeleeHit = (hitX, hitY, radius, damage, player, damageText, particles) => {
      for (const e of this.enemies) {
        if (!e.isDead && Math.hypot(e.x - hitX, e.y - hitY) <= radius) {
          e.takeDamage(damage, damageText, particles);
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
      // Platform Mutants
      new AsciiEnemy(20, 22, 'mutant'),
      new AsciiEnemy(46, 12, 'mutant'),
      new AsciiEnemy(76, 22, 'mutant'),

      // Hover Drones
      new AsciiEnemy(38, 14, 'drone'),
      new AsciiEnemy(72, 10, 'drone'),

      // End-Platform Boss: Cyber Warlord Goliath
      new AsciiEnemy(82, 8, 'warlord')
    ];
  }

  initUI() {
    const startAudio = () => {
      soundSynth.init();
      soundSynth.startMusic();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);

    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = soundSynth.toggleMute();
        muteBtn.textContent = isMuted ? 'SFX: OFF' : 'SFX: ON (M)';
      });
    }

    const bgmBtn = document.getElementById('bgmBtn');
    if (bgmBtn) {
      bgmBtn.addEventListener('click', () => {
        const isPlaying = soundSynth.toggleMusic();
        bgmBtn.textContent = isPlaying ? 'MUSIC: ON (B)' : 'MUSIC: OFF (B)';
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

    const guideBtn = document.getElementById('guideBtn');
    if (guideBtn) {
      guideBtn.addEventListener('click', () => {
        this.showGuide = !this.showGuide;
      });
    }

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const t = this.grid.cycleTheme();
        themeBtn.textContent = `THEME: ${t.toUpperCase()} (T)`;
      });
    }

    // Keyboard shortcuts 'B' (Music), 'T' (Theme), 'H' (Guide)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyB') {
        soundSynth.toggleMusic();
      } else if (e.code === 'KeyT') {
        const t = this.grid.cycleTheme();
        if (themeBtn) themeBtn.textContent = `THEME: ${t.toUpperCase()} (T)`;
      } else if (e.code === 'KeyH') {
        this.showGuide = !this.showGuide;
      }
    });

    // Mobile Virtual Touch Buttons
    const bindTouch = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); });
      el.addEventListener('mousedown', onDown);
      el.addEventListener('mouseup', onUp);
    };

    bindTouch('btnLeft', () => { this.input.keys.left = true; }, () => { this.input.keys.left = false; });
    bindTouch('btnRight', () => { this.input.keys.right = true; }, () => { this.input.keys.right = false; });
    bindTouch('btnJump', () => { this.input.justPressed.jump = true; }, () => {});
    bindTouch('btnPunch', () => { this.input.justPressed.slash = true; }, () => {});
    bindTouch('btnFlask', () => { this.input.justPressed.dash = true; }, () => {});
  }

  restart() {
    this.player = new AsciiNinja(10, 20);
    this.feedback = new AsciiFeedback();
    this.projectiles = new AsciiProjectiles();
    this.initEnemies();
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Dismiss guide on Space, Punch, Jump, or Click
    if (this.showGuide) {
      if (this.input.justPressed.jump || this.input.justPressed.slash || this.input.justPressed.dash) {
        this.showGuide = false;
        soundSynth.init();
        soundSynth.startMusic();
      }
    }

    if (this.input.justPressed.restart && this.player.isDead) {
      this.restart();
    }

    if (this.input.justPressed.mute) {
      const isMuted = soundSynth.toggleMute();
      const muteBtn = document.getElementById('muteBtn');
      if (muteBtn) muteBtn.textContent = isMuted ? 'SFX: OFF' : 'SFX: ON (M)';
    }

    // 1. Update Game Systems (Only when guide is closed)
    if (!this.showGuide) {
      this.player.update(dt, this.input, this.world, this.projectiles, this.feedback, this.feedback);

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt, this.player, this.world, this.projectiles, this.feedback, this.feedback);
        if (e.isDead && e.type !== 'warlord') {
          this.enemies.splice(i, 1);
        }
      }

      this.projectiles.update(dt, this.world, this.player, this.enemies, this.feedback, this.feedback);
      this.feedback.update(dt);

      // Collectibles pickup
      for (let i = this.world.collectibles.length - 1; i >= 0; i--) {
        const c = this.world.collectibles[i];
        if (Math.hypot(this.player.x - c.x, this.player.y - c.y) < 3.5) {
          if (c.type === 'gold') {
            this.player.score += 50;
            this.feedback.add(c.x, c.y - 1, '+50 PTS', 'crit');
            soundSynth.playCoin();
          } else if (c.type === 'flask') {
            this.player.flasks++;
            this.feedback.add(c.x, c.y - 1, '+1 FLASK', 'crit');
            soundSynth.playClank();
          }
          this.feedback.emit(c.x, c.y, ['*', '+']);
          this.world.collectibles.splice(i, 1);
        }
      }
    }

    this.input.update();

    // 2. Clear & Render to Pure ASCII Character Grid
    this.grid.clear();

    // Render World (Platforms, hazards, neon signs)
    this.world.draw(this.grid);

    // Render Enemies
    for (const e of this.enemies) {
      e.draw(this.grid);
    }

    // Render Projectiles & Sprite Fusion Poison Clouds
    this.projectiles.draw(this.grid);

    // Render Player Character
    this.player.draw(this.grid);

    // Render Particles & Floating Damage
    this.feedback.draw(this.grid);

    // Render Top ASCII HUD
    this.renderHUD();

    // Render How To Play Guide Overlay if active
    if (this.showGuide) {
      this.renderGuideModal();
    } else if (this.player.isDead) {
      this.renderGameOver();
    }

    // 3. Output Character Matrix to Screen
    this.grid.renderToCanvas(this.ctx, this.canvas.width, this.canvas.height);

    requestAnimationFrame(this.loop);
  }

  renderGuideModal() {
    const boxW = 86;
    const boxH = 26;
    const boxX = Math.floor((100 - boxW) / 2);
    const boxY = Math.floor((34 - boxH) / 2);

    this.grid.drawBox(boxX, boxY, boxW, boxH, 'HOW TO PLAY GUIDE');

    const lines = [
      '',
      '  [ MISSION: CYBER INFILTRATION ]',
      '  You are an ASCII Cyber Ninja infiltrating the ruins of Sector 4.',
      '  Leap across platforms, avoid toxic sludge pits, and destroy the Warlord!',
      '',
      '  [ CONTROLS & COMBAT ABILITIES ]',
      '  • A / D or ◀ ▶ ARROWS : Run Left & Right',
      '  • W / SPACE            : Jump (Press again in midair to DOUBLE JUMP!)',
      '  • J or LEFT CLICK      : Straight Punch Combo (Rapid martial arts strike)',
      '  • K / E or RIGHT CLICK : Lob Sprite Fusion Toxic Poison Flask',
      '  • B / MUSIC BUTTON     : Toggle Procedural 8-Bit Cyberpunk Synth BGM',
      '  • T / THEME BUTTON     : Cycle Themes (Monochrome B&W / Matrix Green / Amber)',
      '  • H / GUIDE BUTTON     : Open / Close this Guide anytime',
      '',
      '  [ COMBAT TACTIC: SPRITE FUSION POISON VFX ]',
      '  Throwing a toxic flask (K) releases an expanding ASCII poison gas cloud',
      '  (░▒▓%&#@) that melts mutant hordes with damage-over-time (DoT)!',
      '',
      '               >>> PRESS [ SPACE ] OR CLICK TO START MISSION <<<'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('>>>')) {
        this.grid.drawString(boxX + 2, boxY + 2 + i, line, '#ffffff');
      } else if (line.includes('[')) {
        this.grid.drawString(boxX + 2, boxY + 2 + i, line, '#ffffff');
      } else {
        this.grid.drawString(boxX + 2, boxY + 2 + i, line, '#cccccc');
      }
    }
  }

  renderHUD() {
    // Top border box
    this.grid.drawBox(1, 0, 98, 3, 'TINY GLYPHS: 2D ACTION PLATFORMER');

    const hpPct = Math.max(0, this.player.hp / this.player.maxHp);
    const hpBars = Math.round(hpPct * 10);
    const hpStr = '[' + '█'.repeat(hpBars) + '░'.repeat(10 - hpBars) + `] ${Math.max(0, this.player.hp)}/100 HP`;

    const hudText = `NINJA ${hpStr}  |  FLASKS: ${'(o)'.repeat(this.player.flasks)}  |  SCORE: ${String(this.player.score).padStart(4, '0')}  |  KILLS: ${this.player.kills}  |  BGM: (B)`;
    this.grid.drawString(3, 1, hudText, '#ffffff');

    // Bottom Controls Line
    const controls = '[ A/D: RUN | W/SPACE: JUMP (DOUBLE JUMP!) | J/CLICK: STRAIGHT PUNCH | K/E: POISON FLASK | B: BGM ]';
    this.grid.drawString(Math.floor((100 - controls.length) / 2), 33, controls, '#aaaaaa');
  }

  renderGameOver() {
    const boxW = 42;
    const boxH = 9;
    const boxX = Math.floor((100 - boxW) / 2);
    const boxY = Math.floor((34 - boxH) / 2);

    this.grid.drawBox(boxX, boxY, boxW, boxH, 'SYSTEM TERMINATED');
    this.grid.drawString(boxX + 11, boxY + 2, '† HERO FELL IN COMBAT †', '#ffffff');
    this.grid.drawString(boxX + 9, boxY + 4, `ROGUES VANQUISHED: ${this.player.kills}`, '#cccccc');
    this.grid.drawString(boxX + 9, boxY + 5, `FINAL SCORE: ${this.player.score} PTS`, '#cccccc');
    this.grid.drawString(boxX + 9, boxY + 7, '[ PRESS "R" TO RESPAWN ]', '#ffffff');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}
