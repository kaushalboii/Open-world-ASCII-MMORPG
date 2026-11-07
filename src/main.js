// Main Game Flow & Screen Navigation for Tiny Glyphs
// Structured screen flow: MENU -> PLAYING -> GUIDE -> VFX_ARCHIVE -> SETTINGS -> PAUSED -> VICTORY -> GAMEOVER

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

    this.canvas.width = 960;
    this.canvas.height = 540;

    // 100 cols x 34 rows pure ASCII grid
    this.grid = new AsciiGrid(100, 34);
    this.input = new Input(this.canvas);

    // Screen State Machine: 'MENU', 'PLAYING', 'GUIDE', 'VFX_ARCHIVE', 'SETTINGS', 'PAUSED', 'VICTORY', 'GAMEOVER'
    this.currentScreen = 'MENU';
    this.menuSelection = 0; // 0: Start, 1: Guide, 2: VFX Archive, 3: Settings

    // Game Systems
    this.world = new AsciiWorld(100, 34);
    this.player = new AsciiNinja(10, 20);
    this.feedback = new AsciiFeedback();
    this.projectiles = new AsciiProjectiles();
    this.enemies = [];
    this.initEnemies();

    this.bossDefeated = false;
    this.missionTime = 0;

    // Wire melee attack hit listener
    this.world.onMeleeHit = (hitX, hitY, radius, damage, player, damageText, particles) => {
      for (const e of this.enemies) {
        if (!e.isDead && Math.hypot(e.x - hitX, e.y - hitY) <= radius) {
          e.takeDamage(damage, damageText, particles);
          if (e.isDead) {
            player.kills++;
            if (e.type === 'warlord') {
              this.bossDefeated = true;
              setTimeout(() => {
                this.currentScreen = 'VICTORY';
              }, 1200);
            }
          }
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
      new AsciiEnemy(20, 22, 'mutant'),
      new AsciiEnemy(46, 12, 'mutant'),
      new AsciiEnemy(76, 22, 'mutant'),
      new AsciiEnemy(38, 14, 'drone'),
      new AsciiEnemy(72, 10, 'drone'),
      new AsciiEnemy(82, 8, 'warlord')
    ];
  }

  startMission() {
    this.currentScreen = 'PLAYING';
    soundSynth.init();
    soundSynth.startMusic();
  }

  restartMission() {
    this.player = new AsciiNinja(10, 20);
    this.feedback = new AsciiFeedback();
    this.projectiles = new AsciiProjectiles();
    this.bossDefeated = false;
    this.missionTime = 0;
    this.initEnemies();
    this.currentScreen = 'PLAYING';
  }

  initUI() {
    // Navigation Bar Tab Buttons
    const tabPlay = document.getElementById('tabPlay');
    const tabMenu = document.getElementById('tabMenu');
    const tabGuide = document.getElementById('tabGuide');
    const tabVfx = document.getElementById('tabVfx');
    const tabSettings = document.getElementById('tabSettings');

    if (tabPlay) tabPlay.addEventListener('click', () => { this.startMission(); });
    if (tabMenu) tabMenu.addEventListener('click', () => { this.currentScreen = 'MENU'; });
    if (tabGuide) tabGuide.addEventListener('click', () => { this.currentScreen = 'GUIDE'; });
    if (tabVfx) tabVfx.addEventListener('click', () => { this.currentScreen = 'VFX_ARCHIVE'; });
    if (tabSettings) tabSettings.addEventListener('click', () => { this.currentScreen = 'SETTINGS'; });

    // Toolbar Controls
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const t = this.grid.cycleTheme();
        themeBtn.textContent = `THEME: ${t.toUpperCase()}`;
      });
    }

    const bgmBtn = document.getElementById('bgmBtn');
    if (bgmBtn) {
      bgmBtn.addEventListener('click', () => {
        const isPlaying = soundSynth.toggleMusic();
        bgmBtn.textContent = isPlaying ? 'MUSIC: ON' : 'MUSIC: OFF';
      });
    }

    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = soundSynth.toggleMute();
        muteBtn.textContent = isMuted ? 'SFX: OFF' : 'SFX: ON';
      });
    }

    const crtBtn = document.getElementById('crtBtn');
    const container = document.getElementById('gameContainer');
    if (crtBtn && container) {
      crtBtn.addEventListener('click', () => {
        container.classList.toggle('crt');
        crtBtn.textContent = container.classList.contains('crt') ? 'CRT: ON' : 'CRT: OFF';
      });
    }

    // Keyboard Navigation Listener
    window.addEventListener('keydown', (e) => {
      // Global navigation keys
      if (e.code === 'KeyM') {
        soundSynth.toggleMute();
      } else if (e.code === 'KeyB') {
        soundSynth.toggleMusic();
      } else if (e.code === 'KeyT') {
        const t = this.grid.cycleTheme();
        if (themeBtn) themeBtn.textContent = `THEME: ${t.toUpperCase()}`;
      } else if (e.code === 'Escape') {
        if (this.currentScreen === 'PLAYING') {
          this.currentScreen = 'PAUSED';
        } else if (this.currentScreen === 'PAUSED') {
          this.currentScreen = 'PLAYING';
        } else {
          this.currentScreen = 'MENU';
        }
      }

      // Menu specific keys
      if (this.currentScreen === 'MENU') {
        if (e.code === 'Digit1') this.startMission();
        else if (e.code === 'Digit2') this.currentScreen = 'GUIDE';
        else if (e.code === 'Digit3') this.currentScreen = 'VFX_ARCHIVE';
        else if (e.code === 'Digit4') this.currentScreen = 'SETTINGS';
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

    // Canvas Click Listener for Screen Navigation
    this.canvas.addEventListener('click', () => {
      if (this.currentScreen === 'MENU') {
        this.startMission();
      } else if (this.currentScreen === 'GUIDE' || this.currentScreen === 'VFX_ARCHIVE' || this.currentScreen === 'SETTINGS') {
        this.startMission();
      } else if (this.currentScreen === 'GAMEOVER' || this.currentScreen === 'VICTORY') {
        this.restartMission();
      }
    });
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // 1. Process Screen States
    if (this.currentScreen === 'PLAYING') {
      this.missionTime += dt;
      this.updateGameplay(dt);
    }

    // 2. Clear Screen Grid
    this.grid.clear();

    // 3. Render Respective Screen Page
    switch (this.currentScreen) {
      case 'MENU':
        this.renderMenuScreen();
        break;
      case 'PLAYING':
        this.renderGameScreen();
        break;
      case 'GUIDE':
        this.renderGuideScreen();
        break;
      case 'VFX_ARCHIVE':
        this.renderVfxArchiveScreen();
        break;
      case 'SETTINGS':
        this.renderSettingsScreen();
        break;
      case 'PAUSED':
        this.renderPauseScreen();
        break;
      case 'VICTORY':
        this.renderVictoryScreen();
        break;
      case 'GAMEOVER':
        this.renderGameOverScreen();
        break;
    }

    this.input.update();

    // 4. Output Character Matrix to Screen
    this.grid.renderToCanvas(this.ctx, this.canvas.width, this.canvas.height);

    requestAnimationFrame(this.loop);
  }

  updateGameplay(dt) {
    if (this.player.isDead) {
      this.currentScreen = 'GAMEOVER';
      return;
    }

    // Update Player
    this.player.update(dt, this.input, this.world, this.projectiles, this.feedback, this.feedback);

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.world, this.projectiles, this.feedback, this.feedback);
      if (e.isDead && e.type !== 'warlord') {
        this.enemies.splice(i, 1);
      }
    }

    // Update Projectiles & Poison Clouds
    this.projectiles.update(dt, this.world, this.player, this.enemies, this.feedback, this.feedback);
    this.feedback.update(dt);

    // Collectibles
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

  // ==========================================
  // PAGE 1: TITLE SCREEN / MAIN MENU
  // ==========================================
  renderMenuScreen() {
    this.grid.drawBox(2, 1, 96, 32, 'CYBERNETIC TERMINAL // VERSION 2.0');

    // Grand ASCII Logo
    const logo = [
      ' _______ _____ _   ___   __    _____ _  __   ______  _    _  _____ ',
      '|__   __|_   _| \ | \ \ / /   / ____| | \ \ / /  _ \| |  | |/ ____|',
      '   | |    | | |  \| |\ V /   | |  __| |  \ V /| |_) | |__| | (___  ',
      '   | |    | | | . ` | > <    | | |_ | |   > < |  __/|  __  |\___ \ ',
      '   | |   _| |_| |\  |/ . \   | |__| | |__/ . \| |   | |  | |____) |',
      '   |_|  |_____|_| \_/_/ \_\   \_____|____/_/ \_\_|   |_|  |_|_____/ '
    ];

    for (let i = 0; i < logo.length; i++) {
      this.grid.drawString(16, 4 + i, logo[i], '#ffffff');
    }

    this.grid.drawString(22, 12, 'PURE MONOSPACE ASCII 2D ACTION PLATFORMER', '#888888');

    // Menu Navigation Options
    this.grid.drawString(16, 16, '╔═════════════════════════════════════════════════════════════════╗', '#ffffff');
    this.grid.drawString(16, 17, '║   SELECT PAGE (PRESS 1-4 OR CLICK ANYWHERE TO START):           ║', '#ffffff');
    this.grid.drawString(16, 18, '║                                                                 ║', '#ffffff');
    this.grid.drawString(16, 19, '║   ▶ [ 1 ] START MISSION               (Infiltrate Sector 4)     ║', '#ffffff');
    this.grid.drawString(16, 20, '║     [ 2 ] HOW TO PLAY & COMBAT GUIDE  (Controls & Mechanics)    ║', '#ffffff');
    this.grid.drawString(16, 21, '║     [ 3 ] SPRITE FUSION VFX ARCHIVE   (Poison VFX & Animations) ║', '#ffffff');
    this.grid.drawString(16, 22, '║     [ 4 ] SETTINGS & THEMES           (B&W / Green / Amber)     ║', '#ffffff');
    this.grid.drawString(16, 23, '║                                                                 ║', '#ffffff');
    this.grid.drawString(16, 24, '╚═════════════════════════════════════════════════════════════════╝', '#ffffff');

    this.grid.drawString(20, 28, '>>> PRESS [ SPACE ], [ 1 ], OR CLICK TO LAUNCH GAME <<<', '#ffffff');
    this.grid.drawString(24, 30, '[ TIP: USE THE TOP TABS OR NUMBER KEYS TO NAVIGATE ]', '#666666');
  }

  // ==========================================
  // PAGE 2: HOW TO PLAY & COMBAT GUIDE
  // ==========================================
  renderGuideScreen() {
    this.grid.drawBox(2, 1, 96, 32, 'PAGE 2 // HOW TO PLAY & COMBAT GUIDE');

    const lines = [
      '╔════════════════════════════════════════════════════════════════════════════════════════╗',
      '║  [ 1. MISSION BRIEFING ]                                                               ║',
      '║  You are a rogue Cyber Ninja infiltrating the dystopian ruins of Sector 4.             ║',
      '║  Leap across industrial ledges, evade toxic sludge pits, and destroy Warlord Goliath!  ║',
      '║                                                                                        ║',
      '║  [ 2. CONTROLS & COMBAT ABILITIES ]                                                    ║',
      '║  • A / D or ◀ ▶ ARROWS : Run Left & Right                                              ║',
      '║  • W / SPACE           : Jump  (Press again in mid-air to DOUBLE JUMP!)                ║',
      '║  • J or LEFT CLICK     : Straight Punch Strike (Martial arts punch combo)              ║',
      '║  • K / E or RIGHT CLICK: Lob Sprite Fusion Toxic Poison Flask                          ║',
      '║  • B / MUSIC BUTTON    : Toggle Procedural 8-Bit Cyberpunk Synth BGM                   ║',
      '║  • T / THEME BUTTON    : Cycle Colors (Monochrome B&W / Matrix Green / Amber)          ║',
      '║  • ESC / BACK BUTTON   : Pause / Return to Main Menu                                   ║',
      '║                                                                                        ║',
      '║  [ 3. COMBAT TACTIC: SPRITE FUSION POISON VFX ]                                        ║',
      '║  Throwing a toxic flask (K) releases an expanding ASCII poison gas cloud (░▒▓%&#@)     ║',
      '║  that melts mutant hordes with continuous damage-over-time (DoT)!                      ║',
      '╚════════════════════════════════════════════════════════════════════════════════════════╝'
    ];

    for (let i = 0; i < lines.length; i++) {
      this.grid.drawString(5, 3 + i, lines[i], '#ffffff');
    }

    this.grid.drawString(18, 26, '>>> PRESS [ SPACE ] TO START MISSION  |  [ ESC ]: BACK TO MENU <<<', '#ffffff');
  }

  // ==========================================
  // PAGE 3: SPRITE FUSION VFX & ARSENAL ARCHIVE
  // ==========================================
  renderVfxArchiveScreen() {
    this.grid.drawBox(2, 1, 96, 32, 'PAGE 3 // SPRITE FUSION VFX & CHARACTER ARCHIVE');

    this.grid.drawString(6, 3, '[ HERO SPRITE: CYBER NINJA ]', '#ffffff');
    const ninjaSprite = [
      '   .---.       ',
      '  |[===]|======(O)*  <-- Visor Slit & Straight Punch Strike!',
      '  |/███\\|            <-- Dark Bodysuit & Trailing Scarf ~ ≈',
      '   \\▓▓▓/             <-- Combat Sash',
      '   /   \\             <-- Athletic Stance',
      '  /_   _\\            <-- Combat Boots'
    ];
    for (let i = 0; i < ninjaSprite.length; i++) {
      this.grid.drawString(6, 5 + i, ninjaSprite[i], '#ffffff');
    }

    this.grid.drawString(6, 13, '[ SPRITE FUSION POISON GAS CLOUD VFX ]', '#ffffff');
    const cloudVfx = [
      '        .  :  *  %  &  %  *  :  .        ',
      '      :  %  &  #  @  #  &  %  :      <-- Expanding toxic fumes lingering on floor',
      '     *  &  #  @  @  @  #  &  *       <-- Ticks -6 Damage-Over-Time to mutants',
      '    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    <-- Floor acid puddle'
    ];
    for (let i = 0; i < cloudVfx.length; i++) {
      this.grid.drawString(6, 15 + i, cloudVfx[i], '#ffffff');
    }

    this.grid.drawString(6, 21, '[ ENEMY ROSTER ]', '#ffffff');
    this.grid.drawString(6, 23, '• CYBER MUTANT <[X X]> : Ground swarmer with claw slash', '#cccccc');
    this.grid.drawString(6, 24, '• HOVER DRONE  <-(O)-> : Flying sentry firing laser beams (───*)', '#cccccc');
    this.grid.drawString(6, 25, '• WARLORD GOLIATH [██W██] : Sector Boss with titan cleaves & plasma bursts', '#cccccc');

    this.grid.drawString(18, 29, '>>> PRESS [ SPACE ] TO START MISSION  |  [ ESC ]: BACK TO MENU <<<', '#ffffff');
  }

  // ==========================================
  // PAGE 4: SETTINGS & THEMES
  // ==========================================
  renderSettingsScreen() {
    this.grid.drawBox(2, 1, 96, 32, 'PAGE 4 // SETTINGS & TERMINAL THEMES');

    this.grid.drawString(8, 5, 'SELECT TERMINAL THEME:', '#ffffff');
    this.grid.drawString(8, 7, `[ 1 ] MONOCHROME B&W       ${this.grid.theme === 'bw' ? '◀ ACTIVE' : ''}`, '#ffffff');
    this.grid.drawString(8, 9, `[ 2 ] MATRIX PHOSPHOR GREEN ${this.grid.theme === 'green' ? '◀ ACTIVE' : ''}`, '#ffffff');
    this.grid.drawString(8, 11, `[ 3 ] VINTAGE AMBER TERMINAL ${this.grid.theme === 'amber' ? '◀ ACTIVE' : ''}`, '#ffffff');

    this.grid.drawString(8, 15, 'AUDIO CONTROLS:', '#ffffff');
    this.grid.drawString(8, 17, `• BACKGROUND MUSIC : ${soundSynth.musicPlaying ? 'ENABLED (PRESS B)' : 'DISABLED (PRESS B)'}`, '#cccccc');
    this.grid.drawString(8, 19, `• SOUND EFFECTS    : ${soundSynth.muted ? 'MUTED (PRESS M)' : 'ENABLED (PRESS M)'}`, '#cccccc');

    this.grid.drawString(8, 23, '[ CLICK THE TOP TOOLBAR BUTTONS TO TOGGLE THEMES & AUDIO INSTANTLY ]', '#888888');
    this.grid.drawString(18, 28, '>>> PRESS [ ESC ] TO RETURN TO MENU  |  [ SPACE ]: PLAY GAME <<<', '#ffffff');
  }

  // ==========================================
  // PAGE 5: ACTIVE GAMEPLAY SCREEN
  // ==========================================
  renderGameScreen() {
    // 1. Draw World Platforms & Hazards
    this.world.draw(this.grid);

    // 2. Draw Enemies
    for (const e of this.enemies) {
      e.draw(this.grid);
    }

    // 3. Draw Projectiles & Poison Clouds
    this.projectiles.draw(this.grid);

    // 4. Draw Player Character
    this.player.draw(this.grid);

    // 5. Draw Particles & Damage
    this.feedback.draw(this.grid);

    // 6. Top Clean HUD (Completely clear, no overlapping text!)
    this.grid.drawBox(1, 0, 98, 3, 'SECTOR 4: CITADEL INFILTRATION');

    const hpPct = Math.max(0, this.player.hp / this.player.maxHp);
    const hpBars = Math.round(hpPct * 10);
    const hpStr = '[' + '█'.repeat(hpBars) + '░'.repeat(10 - hpBars) + `] ${Math.max(0, this.player.hp)}/100 HP`;

    const hudText = `NINJA ${hpStr}  |  FLASKS: ${'(o)'.repeat(this.player.flasks)}  |  SCORE: ${String(this.player.score).padStart(4, '0')}  |  KILLS: ${this.player.kills}  |  [ESC: MENU]`;
    this.grid.drawString(3, 1, hudText, '#ffffff');

    // Bottom Clean Bar
    const bottomPrompt = '[ A/D: RUN | SPACE: JUMP & DOUBLE JUMP | J: PUNCH | K: POISON FLASK | ESC: PAUSE ]';
    this.grid.drawString(Math.floor((100 - bottomPrompt.length) / 2), 33, bottomPrompt, '#888888');
  }

  // ==========================================
  // PAGE 6: PAUSE MENU
  // ==========================================
  renderPauseScreen() {
    // Draw dimmed game underneath
    this.renderGameScreen();

    const boxW = 50;
    const boxH = 12;
    const boxX = Math.floor((100 - boxW) / 2);
    const boxY = Math.floor((34 - boxH) / 2);

    this.grid.drawBox(boxX, boxY, boxW, boxH, 'MISSION PAUSED');
    this.grid.drawString(boxX + 16, boxY + 2, '† PAUSED †', '#ffffff');
    this.grid.drawString(boxX + 8, boxY + 4, '[ ESC / SPACE ]: RESUME MISSION', '#cccccc');
    this.grid.drawString(boxX + 8, boxY + 6, '[ R ]          : RESTART MISSION', '#cccccc');
    this.grid.drawString(boxX + 8, boxY + 8, '[ CLICK MENU ] : QUIT TO MAIN MENU', '#cccccc');
  }

  // ==========================================
  // PAGE 7: VICTORY SCREEN
  // ==========================================
  renderVictoryScreen() {
    this.grid.drawBox(10, 4, 80, 24, 'MISSION COMPLETE');

    this.grid.drawString(28, 8, '★ ★ ★ CITADEL LIBERATED ★ ★ ★', '#ffffff');
    this.grid.drawString(22, 11, 'WARLORD GOLIATH HAS BEEN VANQUISHED!', '#cccccc');

    this.grid.drawString(26, 14, `• FINAL SCORE      : ${this.player.score} PTS`, '#ffffff');
    this.grid.drawString(26, 16, `• ROGUES DESTROYED : ${this.player.kills} ENEMIES`, '#ffffff');
    this.grid.drawString(26, 18, `• COMBAT RANK      : S-CLASS OPERATIVE`, '#ffffff');

    this.grid.drawString(20, 22, '>>> PRESS [ R ] OR CLICK TO REPLAY MISSION <<<', '#ffffff');
    this.grid.drawString(26, 24, '[ PRESS ESC TO RETURN TO MAIN MENU ]', '#888888');
  }

  // ==========================================
  // PAGE 8: GAME OVER SCREEN
  // ==========================================
  renderGameOverScreen() {
    const boxW = 54;
    const boxH = 14;
    const boxX = Math.floor((100 - boxW) / 2);
    const boxY = Math.floor((34 - boxH) / 2);

    this.grid.drawBox(boxX, boxY, boxW, boxH, 'SYSTEM TERMINATED');
    this.grid.drawString(boxX + 16, boxY + 3, '† OPERATIVE TERMINATED †', '#ffffff');
    this.grid.drawString(boxX + 12, boxY + 5, `ROGUES VANQUISHED: ${this.player.kills}`, '#cccccc');
    this.grid.drawString(boxX + 12, boxY + 7, `FINAL SCORE: ${this.player.score} PTS`, '#cccccc');

    this.grid.drawString(boxX + 10, boxY + 10, '>>> PRESS [ R ] TO RESPAWN <<<', '#ffffff');
    this.grid.drawString(boxX + 12, boxY + 11, '[ PRESS ESC FOR MAIN MENU ]', '#888888');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
}
