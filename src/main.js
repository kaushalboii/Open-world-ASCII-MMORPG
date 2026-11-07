// Main Orchestrator for The Boundless Spiral: Ascension of Zero
// Features Infinite Ascension (Floors 1 to ∞), 21 Primal Weaves (244 effects),
// 10 Elemental Biomes, Colossi Boss Trials, Weapon Evolution (Martial Arts -> Broadsword -> Blaster -> Mortar -> Lightning),
// Aerocast Dropkick Stomps, Aether Surge, Destructibles & Sanctuary Sheep, Primal Forge, 3D IK Rig, and 244-effect VFX Studio!
// Authored by Kaushal (kaushalboii)

import { PixelPlayer } from './pixeleffects/game/PixelPlayer.js';
import { PixelWorld } from './pixeleffects/game/PixelWorld.js';
import { UpgradeShop } from './pixeleffects/game/UpgradeShop.js';
import { StoryCodex } from './pixeleffects/game/StoryCodex.js';
import { StudioManager } from './pixeleffects/studio/StudioManager.js';
import { RigExplorer } from './pixeleffects/studio/RigExplorer.js';
import { Input } from './engine/Input.js';
import { soundSynth } from './audio/SoundSynth.js';
import { createFrame, clearFrame, composite } from './pixeleffects/core/index.js';

class SpiralApp {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.canvas.width = 960;
    this.canvas.height = 540;

    this.input = new Input(this.canvas);

    // Screen States: 'MENU', 'PLAYING', 'STORY_CODEX', 'UPGRADE_SHOP', 'VFX_STUDIO', 'PIXEL_RIG', 'GUIDE', 'SETTINGS', 'PAUSED', 'VICTORY', 'GAMEOVER'
    this.screen = 'MENU';
    this.theme = 'bw'; // 'bw' (Monochrome), 'color' (Vibrant Aether), 'green' (Verdant Matrix)
    this.crt = false;

    // Game Core
    this.stageW = 320;
    this.stageH = 180;
    this.gameFrame = createFrame(this.stageW, this.stageH);
    this.gameImgData = this.ctx.createImageData(this.stageW, this.stageH);
    this.gameOffscreen = document.createElement('canvas');
    this.gameOffscreen.width = this.stageW;
    this.gameOffscreen.height = this.stageH;
    this.gameOffscreenCtx = this.gameOffscreen.getContext('2d');

    this.player = new PixelPlayer(60, 148);
    this.world = new PixelWorld(this.stageW, this.stageH);
    this.shop = new UpgradeShop();
    this.codex = new StoryCodex();

    // Studio & Rig Modules
    this.studioOffscreen = document.createElement('canvas');
    this.studio = new StudioManager(this.studioOffscreen);

    this.rigOffscreen = document.createElement('canvas');
    this.rigExplorer = new RigExplorer(this.rigOffscreen);

    this.lastTime = performance.now();
    this.missionTime = 0;

    this.initUI();
    this.initTouchControls();
    this.initStudioDOM();
    this.initRigDOM();

    // Handle clicks inside canvas (e.g. for Upgrade Shop & Codex)
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      if (this.screen === 'UPGRADE_SHOP') {
        this.shop.handleClick(mouseX, mouseY, this.player, soundSynth);
      } else if (this.screen === 'STORY_CODEX') {
        this.codex.handleClick(mouseX, mouseY, (chapter) => {
          this.world.loadSector(chapter);
          this.setScreen('PLAYING');
        });
      } else if (this.screen === 'PIXEL_RIG') {
        this.rigExplorer.handleClick(mouseX, mouseY, this.canvas.width, this.canvas.height);
        if (this.syncRigUI) this.syncRigUI();
      }
    });

    requestAnimationFrame((t) => this.loop(t));
  }

  setScreen(newScreen) {
    this.screen = newScreen;

    const tabMap = {
      MENU: 'tabMenu',
      PLAYING: 'tabPlay',
      STORY_CODEX: 'tabStory',
      UPGRADE_SHOP: 'tabShop',
      VFX_STUDIO: 'tabVfx',
      PIXEL_RIG: 'tabRig',
      GUIDE: 'tabGuide',
      SETTINGS: 'tabSettings',
    };

    document.querySelectorAll('.nav-tab').forEach((tab) => tab.classList.remove('active'));
    const activeTab = document.getElementById(tabMap[newScreen]);
    if (activeTab) activeTab.classList.add('active');

    const studioControls = document.getElementById('studioControls');
    const rigControls = document.getElementById('rigControls');

    if (studioControls) studioControls.style.display = newScreen === 'VFX_STUDIO' ? 'flex' : 'none';
    if (rigControls) rigControls.style.display = newScreen === 'PIXEL_RIG' ? 'flex' : 'none';

    if (newScreen === 'PLAYING') {
      soundSynth.startMusic();
    }
  }

  initUI() {
    document.getElementById('tabMenu').addEventListener('click', () => this.setScreen('MENU'));
    document.getElementById('tabPlay').addEventListener('click', () => {
      if (this.player.hp <= 0) this.restartMission();
      this.setScreen('PLAYING');
    });
    const tabStory = document.getElementById('tabStory');
    if (tabStory) tabStory.addEventListener('click', () => this.setScreen('STORY_CODEX'));
    document.getElementById('tabShop').addEventListener('click', () => this.setScreen('UPGRADE_SHOP'));
    document.getElementById('tabVfx').addEventListener('click', () => this.setScreen('VFX_STUDIO'));
    document.getElementById('tabRig').addEventListener('click', () => this.setScreen('PIXEL_RIG'));
    document.getElementById('tabGuide').addEventListener('click', () => this.setScreen('GUIDE'));
    document.getElementById('tabSettings').addEventListener('click', () => this.setScreen('SETTINGS'));

    const themeBtn = document.getElementById('themeBtn');
    themeBtn.addEventListener('click', () => {
      const themes = ['bw', 'color', 'green'];
      const nextIdx = (themes.indexOf(this.theme) + 1) % themes.length;
      this.theme = themes[nextIdx];
      const names = { bw: 'THEME: B&W MONO (T)', color: 'THEME: NEON CYBER (T)', green: 'THEME: MATRIX GREEN (T)' };
      themeBtn.textContent = names[this.theme];
      this.studio.theme = this.theme;
      this.rigExplorer.theme = this.theme;
    });

    const bgmBtn = document.getElementById('bgmBtn');
    bgmBtn.addEventListener('click', () => {
      const playing = soundSynth.toggleMusic();
      bgmBtn.textContent = `MUSIC: ${playing ? 'ON' : 'OFF'} (B)`;
    });

    const muteBtn = document.getElementById('muteBtn');
    muteBtn.addEventListener('click', () => {
      const muted = soundSynth.toggleMute();
      muteBtn.textContent = `SFX: ${muted ? 'OFF' : 'ON'} (M)`;
    });

    const crtBtn = document.getElementById('crtBtn');
    crtBtn.addEventListener('click', () => {
      this.crt = !this.crt;
      document.getElementById('gameContainer').classList.toggle('crt', this.crt);
      crtBtn.textContent = `CRT: ${this.crt ? 'ON' : 'OFF'}`;
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT') themeBtn.click();
      if (e.code === 'KeyB') bgmBtn.click();
      if (e.code === 'KeyM') muteBtn.click();
      if (e.code === 'KeyU' || e.code === 'Tab') {
        e.preventDefault();
        if (this.screen === 'UPGRADE_SHOP') this.setScreen('PLAYING');
        else this.setScreen('UPGRADE_SHOP');
      }
      if (e.code === 'Escape') {
        if (this.screen === 'UPGRADE_SHOP') this.setScreen('PLAYING');
        else if (this.screen === 'PLAYING') this.setScreen('PAUSED');
        else if (this.screen === 'PAUSED') this.setScreen('PLAYING');
        else this.setScreen('MENU');
      }
    });
  }

  initTouchControls() {
    const bindBtn = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.setTouch(key, true);
      });
      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.input.setTouch(key, false);
      });
      el.addEventListener('pointerleave', (e) => {
        e.preventDefault();
        this.input.setTouch(key, false);
      });
    };

    bindBtn('btnLeft', 'TouchLeft');
    bindBtn('btnRight', 'TouchRight');
    bindBtn('btnJump', 'TouchJump');
    bindBtn('btnPunch', 'TouchPunch');
    bindBtn('btnDash', 'TouchDash');
    bindBtn('btnFlask', 'TouchFlask');

    const btnWeapon = document.getElementById('btnWeapon');
    if (btnWeapon) {
      btnWeapon.addEventListener('click', () => {
        this.player.cycleWeapon();
        soundSynth.playSwordSlash();
      });
    }

    const btnShop = document.getElementById('btnShop');
    if (btnShop) {
      btnShop.addEventListener('click', () => {
        if (this.screen === 'UPGRADE_SHOP') this.setScreen('PLAYING');
        else this.setScreen('UPGRADE_SHOP');
      });
    }
  }

  initStudioDOM() {
    const catBar = document.getElementById('catBar');
    const effectSelect = document.getElementById('effectSelect');
    const metaDesc = document.getElementById('effectMetaDesc');

    this.studio.categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = `cat-btn ${cat.id === this.studio.activeCategory ? 'active' : ''}`;
      btn.textContent = cat.name.toUpperCase();
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.studio.setCategory(cat.id);
        this.refreshStudioSelect();
      });
      catBar.appendChild(btn);
    });

    this.refreshStudioSelect = () => {
      effectSelect.innerHTML = '';
      const list = this.studio.filteredEffects;
      list.forEach((fx) => {
        const opt = document.createElement('option');
        opt.value = fx.id;
        opt.textContent = `${fx.name} (${fx.meta.loop ? 'loop' : fx.meta.duration + 's'})`;
        if (fx.id === this.studio.selectedEffectId) opt.selected = true;
        effectSelect.appendChild(opt);
      });
      this.updateStudioMeta();
    };

    this.updateStudioMeta = () => {
      const fx = this.studio.activeEffect;
      if (!fx) return;
      const m = fx.meta;
      metaDesc.innerHTML = `<strong>${fx.name}</strong> [${fx.cat}] &bull; Duration: ${m.duration}s &bull; FPS: ${m.fps} &bull; Size: ${m.size[0]}x${m.size[1]}<br>${m.desc || 'Procedural pixel animation module.'}<br><span style="color:#00ff88">Engine: Procedural Pixel Effects Engine &bull; Created by Kaushal &bull; Zero External Assets</span>`;
    };

    effectSelect.addEventListener('change', (e) => {
      this.studio.loadEffect(e.target.value);
      this.updateStudioMeta();
    });

    document.getElementById('studioPlayBtn').addEventListener('click', (e) => {
      this.studio.togglePlay();
      e.target.textContent = this.studio.playing ? '⏸ PAUSE' : '▶ PLAY';
    });

    document.getElementById('studioRestartBtn').addEventListener('click', () => {
      this.studio.restart();
    });

    const speedBtn = document.getElementById('studioSpeedBtn');
    speedBtn.addEventListener('click', () => {
      const speeds = [0.25, 0.5, 1.0, 2.0];
      const nextIdx = (speeds.indexOf(this.studio.speed) + 1) % speeds.length;
      this.studio.speed = speeds[nextIdx];
      speedBtn.textContent = `SPEED: ${this.studio.speed}x`;
    });

    const actorBtn = document.getElementById('studioActorBtn');
    actorBtn.addEventListener('click', () => {
      this.studio.showActor = !this.studio.showActor;
      actorBtn.textContent = `ACTOR: ${this.studio.showActor ? 'ON' : 'OFF'}`;
      this.studio.loadEffect(this.studio.selectedEffectId);
    });

    const flipBtn = document.getElementById('studioFlipBtn');
    flipBtn.addEventListener('click', () => {
      this.studio.flip = !this.studio.flip;
      flipBtn.textContent = `FLIP: ${this.studio.flip ? 'ON' : 'OFF'}`;
      this.studio.loadEffect(this.studio.selectedEffectId);
    });

    const bgBtn = document.getElementById('studioBgBtn');
    bgBtn.addEventListener('click', () => {
      const bgs = ['ground', 'dark', 'black', 'sky'];
      const nextIdx = (bgs.indexOf(this.studio.backdropType) + 1) % bgs.length;
      this.studio.setBackdrop(bgs[nextIdx]);
      bgBtn.textContent = `BG: ${bgs[nextIdx].toUpperCase()}`;
    });

    this.refreshStudioSelect();
  }

  initRigDOM() {
    const rig = this.rigExplorer;

    // Animation State buttons
    const setAnimBtnActive = (state) => {
      ['animBtnRun', 'animBtnIdle', 'animBtnJump', 'animBtnAttack'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.borderColor = '#333348';
          btn.style.color = '#cccccc';
          btn.style.background = '#101016';
        }
      });
      const activeMap = {
        RUN: 'animBtnRun',
        IDLE: 'animBtnIdle',
        JUMP: 'animBtnJump',
        ATTACK: 'animBtnAttack',
      };
      const activeEl = document.getElementById(activeMap[state]);
      if (activeEl) {
        activeEl.style.borderColor = '#00f0ff';
        activeEl.style.color = '#00f0ff';
        activeEl.style.background = '#1b2438';
      }
      const input = document.getElementById('animMotionInput');
      if (input) input.value = rig.motionPrompt;
    };

    document.getElementById('animBtnRun')?.addEventListener('click', () => {
      rig.setAnimState('RUN');
      setAnimBtnActive('RUN');
    });
    document.getElementById('animBtnIdle')?.addEventListener('click', () => {
      rig.setAnimState('IDLE');
      setAnimBtnActive('IDLE');
    });
    document.getElementById('animBtnJump')?.addEventListener('click', () => {
      rig.setAnimState('JUMP');
      setAnimBtnActive('JUMP');
    });
    document.getElementById('animBtnAttack')?.addEventListener('click', () => {
      rig.setAnimState('ATTACK');
      setAnimBtnActive('ATTACK');
    });

    // View mode buttons
    const setViewModeActive = (mode) => {
      ['animBtnPixel', 'animBtnAscii', 'animBtnHybrid', 'animBtnBones'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.borderColor = '#333348';
          btn.style.color = '#cccccc';
        }
      });
      const map = { pixel: 'animBtnPixel', ascii: 'animBtnAscii', hybrid: 'animBtnHybrid', bones: 'animBtnBones' };
      const el = document.getElementById(map[mode]);
      if (el) {
        el.style.borderColor = '#ff2a85';
        el.style.color = '#ffffff';
      }
    };

    document.getElementById('animBtnPixel')?.addEventListener('click', () => { rig.viewMode = 'pixel'; setViewModeActive('pixel'); });
    document.getElementById('animBtnAscii')?.addEventListener('click', () => { rig.viewMode = 'ascii'; setViewModeActive('ascii'); });
    document.getElementById('animBtnHybrid')?.addEventListener('click', () => { rig.viewMode = 'hybrid'; setViewModeActive('hybrid'); });
    document.getElementById('animBtnBones')?.addEventListener('click', () => { rig.viewMode = 'bones'; setViewModeActive('bones'); });

    // Motion Prompt input
    const motionInput = document.getElementById('animMotionInput');
    const submitPrompt = () => {
      if (motionInput && motionInput.value.trim()) {
        rig.setMotionPrompt(motionInput.value.trim());
        setAnimBtnActive(rig.animState);
      }
    };
    document.getElementById('animSubmitBtn')?.addEventListener('click', submitPrompt);
    motionInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitPrompt();
    });

    // Play/Pause, Speed, Flip
    const animPlayBtn = document.getElementById('animPlayBtn');
    animPlayBtn?.addEventListener('click', () => {
      rig.playing = !rig.playing;
      animPlayBtn.textContent = rig.playing ? '⏸ PAUSE' : '▶ PLAY';
    });

    const animSpeedBtn = document.getElementById('animSpeedBtn');
    animSpeedBtn?.addEventListener('click', () => {
      const speeds = [0.25, 0.5, 1.0, 2.0];
      const nextIdx = (speeds.indexOf(rig.speed) + 1) % speeds.length;
      rig.speed = speeds[nextIdx];
      animSpeedBtn.textContent = `SPEED: ${rig.speed}x`;
    });

    const animFlipBtn = document.getElementById('animFlipBtn');
    animFlipBtn?.addEventListener('click', () => {
      rig.flip = !rig.flip;
      animFlipBtn.textContent = `FLIP: ${rig.flip ? 'ON' : 'OFF'}`;
    });

    this.syncRigUI = () => {
      setAnimBtnActive(rig.animState);
      setViewModeActive(rig.viewMode);
    };

    // Sliders
    const bindSlider = (id, prop, isRad = false) => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.addEventListener('input', (e) => {
        rig[prop] = parseFloat(e.target.value);
      });
    };

    bindSlider('sliderYaw', 'yaw', true);
    bindSlider('sliderLean', 'lean');
    bindSlider('sliderCrouch', 'crouch');

    const spinBtn = document.getElementById('rigSpinBtn');
    spinBtn?.addEventListener('click', () => {
      rig.autoSpin = !rig.autoSpin;
      spinBtn.textContent = `AUTO-SPIN: ${rig.autoSpin ? 'ON' : 'OFF'}`;
    });

    document.getElementById('rigResetBtn')?.addEventListener('click', () => {
      rig.yaw = 0;
      rig.lean = 0;
      rig.crouch = 2;
      const sYaw = document.getElementById('sliderYaw');
      if (sYaw) sYaw.value = 0;
      const sLean = document.getElementById('sliderLean');
      if (sLean) sLean.value = 0;
      const sCrouch = document.getElementById('sliderCrouch');
      if (sCrouch) sCrouch.value = 2;
      rig.setAnimState('ATTACK');
      this.syncRigUI();
    });
  }

  restartMission() {
    this.player = new PixelPlayer(60, 148);
    this.world = new PixelWorld(this.stageW, this.stageH);
    this.missionTime = 0;
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    switch (this.screen) {
      case 'MENU':
        this.renderMenu(dt);
        break;
      case 'PLAYING':
        this.updateGame(dt);
        this.renderGame();
        break;
      case 'STORY_CODEX':
        this.codex.draw(this.ctx, this.canvas.width, this.canvas.height);
        if (this.input.wasJustPressed('jump') || this.input.wasJustPressed('Space')) {
          this.setScreen('PLAYING');
        }
        break;
      case 'UPGRADE_SHOP':
        this.shop.draw(this.ctx, this.canvas.width, this.canvas.height, this.player);
        break;
      case 'VFX_STUDIO':
        this.studio.step(dt);
        this.studio.draw(this.ctx, this.canvas.width, this.canvas.height);
        break;
      case 'PIXEL_RIG':
        this.rigExplorer.update(dt);
        this.rigExplorer.draw(this.ctx, this.canvas.width, this.canvas.height);
        break;
      case 'GUIDE':
        this.renderGuide();
        break;
      case 'SETTINGS':
        this.renderSettings();
        break;
      case 'PAUSED':
        this.renderPaused();
        break;
      case 'VICTORY':
        this.renderVictory();
        break;
      case 'GAMEOVER':
        this.renderGameOver();
        break;
    }

    this.input.update();
    requestAnimationFrame((t) => this.loop(t));
  }

  updateGame(dt) {
    this.missionTime += dt;

    // Hit reaction handler for player attacks
    const onMeleeHit = (hit, player, weaponType) => {
      let hitRadius = 32;
      let hitDmg = 28;

      if (weaponType === 'knife') {
        hitRadius = 24;
        hitDmg = 18;
        soundSynth.playDaggerSwish();
      } else if (weaponType === 'sword') {
        hitRadius = 38;
        hitDmg = 35;
        soundSynth.playSwordSlash();
        this.world.spawnSlashArc(player.x, player.y, player.facing);
      } else if (weaponType === 'pistol') {
        hitRadius = 160; // Long-range laser projectile line!
        hitDmg = 25;
        soundSynth.playLaserPistol();
      } else if (weaponType === 'rocket') {
        hitRadius = 180; // Rocket flight
        hitDmg = 65;
        soundSynth.playRocketBlast();
        this.world.spawnExplosion(player.x + player.facing * 80, player.y - 10);
      } else if (weaponType === 'lightning') {
        hitRadius = 140;
        hitDmg = 75;
        soundSynth.playLightningThunder();
      } else {
        soundSynth.playHit();
      }

      hitDmg = Math.floor(hitDmg * player.damageMultiplier);

      // Hit enemies
      for (const e of this.world.enemies) {
        if (!e.isDead && Math.hypot(e.x - player.x, e.y - player.y) <= hitRadius) {
          e.takeDamage(hitDmg);
          this.world.addFloatingText(`-${hitDmg}`, e.x, e.y - 20, '#ffffff');
          this.world.spawnCrit(e.x, e.y - 12);

          if (e.isDead) {
            player.kills++;
            player.score += e.type === 'warlord' ? 1500 : 150;
            this.world.spawnLoot(e.x, e.y, e.type);

            if (e.type === 'warlord') {
              soundSynth.playVictory();
              this.world.addFloatingText(`★ ${e.name || 'COLOSSUS'} PURGED! ★`, e.x, e.y - 30, '#00ff88');
              setTimeout(() => this.setScreen('VICTORY'), 1200);
            }
          }
        }
      }

      // Hit destructible crates, barrels, chests
      for (const d of this.world.destructibles) {
        if (!d.isBroken && Math.hypot(d.x - player.x, d.y - player.y) <= hitRadius) {
          d.smash(player, this.world, this.world.particleEngine, this.world.damageTexts);
        }
      }
    };

    const spawnPoison = (x, y) => {
      this.world.spawnPoisonCloud(x, y);
    };

    this.player.update(dt, this.input, this.world, onMeleeHit, spawnPoison);
    this.world.update(dt, this.player, this.input, soundSynth);

    if (this.player.hp <= 0) {
      soundSynth.playGameOver();
      this.setScreen('GAMEOVER');
    }
  }

  renderGame() {
    clearFrame(this.gameFrame);

    this.world.draw(this.gameFrame, this.theme);
    this.player.draw(this.gameFrame, this.theme);

    composite(this.gameFrame, this.gameImgData.data, null);
    this.gameOffscreenCtx.putImageData(this.gameImgData, 0, 0);

    let sx = 0;
    let sy = 0;
    if (this.player.activeAct) {
      [sx, sy] = this.player.activeAct.shake || [0, 0];
    }

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    if (this.theme === 'bw') {
      this.ctx.filter = 'grayscale(100%) contrast(140%)';
    } else if (this.theme === 'green') {
      this.ctx.filter = 'sepia(100%) hue-rotate(90deg) saturate(300%)';
    }

    this.ctx.drawImage(this.gameOffscreen, sx * 3, sy * 3, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    this.world.drawOverlay(this.ctx, 3, 3, this.canvas.width, this.canvas.height, this.player);
    this.renderHUD();
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 12px "Courier New", monospace';

    // Top HUD Bar Background
    ctx.fillStyle = 'rgba(10, 10, 16, 0.92)';
    ctx.fillRect(16, 10, 928, 44);
    ctx.strokeStyle = '#333348';
    ctx.strokeRect(16, 10, 928, 44);

    // HP Bar
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HP:', 28, 36);
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    ctx.fillStyle = '#221111';
    ctx.fillRect(52, 22, 110, 18);
    ctx.fillStyle = this.theme === 'bw' ? '#ffffff' : '#ff3344';
    ctx.fillRect(52, 22, 110 * hpRatio, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`, 76, 36);

    // Energy Bar
    ctx.fillText('NRG:', 172, 36);
    const nrgRatio = Math.max(0, this.player.energy / this.player.maxEnergy);
    ctx.fillStyle = '#112222';
    ctx.fillRect(206, 22, 75, 18);
    ctx.fillStyle = this.theme === 'bw' ? '#cccccc' : '#00f0ff';
    ctx.fillRect(206, 22, 75 * nrgRatio, 18);

    // Floor Badge & Best Floor
    ctx.fillStyle = '#ff007f';
    ctx.fillText(`FL ${this.world.currentFloor}`, 296, 36);
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`(BEST: FL ${this.world.bestFloor})`, 338, 36);
    ctx.font = 'bold 12px "Courier New", monospace';

    // Level & XP
    ctx.fillStyle = '#76ff03';
    ctx.fillText(`LVL ${this.player.level}`, 465, 36);

    // Aether Shards / Coins
    ctx.fillStyle = '#ffea00';
    ctx.fillText(`🪙 ${this.player.coins}`, 530, 36);

    // Active Weapon Badge
    const weaponIcons = { knife: '👊 PUNCH/🗡️', sword: '⚔️ SWORD', pistol: '🔫 BLASTER', rocket: '🚀 MORTAR', lightning: '⚡ TEMPEST' };
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`[ ${weaponIcons[this.player.currentWeapon] || 'WEAPON'} ] (Q)`, 615, 36);

    // Hostiles remaining
    const aliveCount = this.world.enemies.filter((e) => !e.isDead).length;
    ctx.fillStyle = aliveCount === 0 ? '#00ff88' : '#ff4466';
    ctx.fillText(`FOES: ${aliveCount}`, 780, 36);

    // Flasks
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`🧪 ${this.player.flasks}`, 870, 36);

    // Objective Banner below top HUD bar
    ctx.fillStyle = 'rgba(8, 8, 14, 0.90)';
    ctx.fillRect(16, 58, 680, 24);
    ctx.strokeStyle = '#222238';
    ctx.strokeRect(16, 58, 680, 24);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`[ ${this.world.sectorName} ] ${this.world.objective || 'ASCEND THROUGH THE BOUNDLESS SPIRAL'}`, 24, 74);

    // Star Power Banner if active
    if (this.player.starPowerTimer > 0) {
      ctx.fillStyle = '#ffff00';
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(`★ AETHER SURGE INVULNERABILITY (${this.player.starPowerTimer.toFixed(1)}s) ★`, 480, 100);
    }

    // Boss Bar if Colossus is alive
    const boss = this.world.enemies.find((e) => e.type === 'warlord');
    if (boss && !boss.isDead) {
      ctx.fillStyle = 'rgba(20, 10, 20, 0.92)';
      ctx.fillRect(260, 485, 440, 32);
      ctx.strokeStyle = '#ff007f';
      ctx.strokeRect(260, 485, 440, 32);

      const bossRatio = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = this.theme === 'bw' ? '#ffffff' : '#ff0055';
      ctx.fillRect(264, 489, 432 * bossRatio, 24);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`★ ${boss.name || 'ANCIENT COLOSSUS'} — ${Math.ceil(boss.hp)} HP ★`, 480, 506);
    }

    ctx.restore();
  }

  renderMenu(dt) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.strokeStyle = '#181824';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('THE BOUNDLESS SPIRAL: ASCENSION OF ZERO', 480, 115);

    ctx.fillStyle = '#ff007f';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('21 PRIMAL WEAVES • 244 VISUAL EFFECTS • INFINITE ASCENSION (FLOORS 1 - ∞)', 480, 148);
    ctx.fillStyle = '#8888aa';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText('Original Action RPG Created by Kaushal (kaushalboii) • Procedural Engine • Web Audio', 480, 172);

    const options = [
      { text: '▶  [1] ASCEND THE SPIRAL (FLOORS 1 - ∞)', screen: 'PLAYING' },
      { text: '📜  [2] STORY CODEX (21 PRIMAL WEAVES)', screen: 'STORY_CODEX' },
      { text: '⚡  [3] PRIMAL FORGE & TALENTS', screen: 'UPGRADE_SHOP' },
      { text: '🧪  [4] VFX STUDIO (244 EFFECTS)', screen: 'VFX_STUDIO' },
      { text: '🧬  [5] SPRITE ANIMATOR & 3D RIG', screen: 'PIXEL_RIG' },
      { text: '📖  [6] SURVIVAL CODEX & CONTROLS', screen: 'GUIDE' },
      { text: '⚙️  [7] SETTINGS & THEMES', screen: 'SETTINGS' },
    ];

    options.forEach((opt, i) => {
      const y = 210 + i * 38;
      ctx.fillStyle = '#12121c';
      ctx.fillRect(280, y - 18, 400, 30);
      ctx.strokeStyle = '#333348';
      ctx.strokeRect(280, y - 18, 400, 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(opt.text, 480, y);
    });

    ctx.fillStyle = '#777788';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText('Press [SPACE] to Play • [Q] Switch Weapon • [U] Primal Forge • [T] Theme', 480, 508);

    if (this.input.wasJustPressed('Digit1') || this.input.wasJustPressed('jump') || this.input.wasJustPressed('punch')) this.setScreen('PLAYING');
    if (this.input.wasJustPressed('Digit2')) this.setScreen('STORY_CODEX');
    if (this.input.wasJustPressed('Digit3')) this.setScreen('UPGRADE_SHOP');
    if (this.input.wasJustPressed('Digit4')) this.setScreen('VFX_STUDIO');
    if (this.input.wasJustPressed('Digit5')) this.setScreen('PIXEL_RIG');
    if (this.input.wasJustPressed('Digit6')) this.setScreen('GUIDE');
    if (this.input.wasJustPressed('Digit7')) this.setScreen('SETTINGS');

    ctx.restore();
  }

  renderGuide() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('📖 THE BOUNDLESS SPIRAL: ASCENSION GUIDE', 40, 42);

    ctx.fillStyle = '#cccccc';
    ctx.font = '11.5px "Courier New", monospace';
    let y = 72;
    const lines = [
      'THE GENESIS FRACTURE & INFINITE ASCENSION:',
      '  • Reality collapsed into The Boundless Spiral—an infinite dimensional labyrinth of ascending chambers.',
      '  • Kaiden the Spiral Wanderer harnesses the 21 Primal Weaves (244 procedural visual effects) to ascend.',
      '  • UNLIMITED LEVELS (Floors 1 to ∞): Every chamber features procedurally seeded platforms and elemental enemies.',
      '  • 10 Elemental Biomes cycle continuously: Ignis Forge, Glacial Labyrinth, Fulgur Bastion, Verdant Cradle, and more.',
      '  • Colossi Boss Trials: Every 5th floor unleashes an Ancient Colossus (Pyroclast, Glacial, Tempest, Void, etc.).',
      '',
      'MARTIAL MOVES, AEROCAST PLUNGE & CACHES:',
      '  • Straight Punch & Cyan Blast: Rapid flurry martial arts with kinetic cyan energy shockwaves.',
      '  • Dropkick Stomp: Fall onto automata or crates from above to crush them and rebound high!',
      '  • Lucky Relic Blocks [ ? ]: Strike from underneath to release Aether Shards, XP, and healing Life Dew.',
      '  • Smashable Supply Crates [x] & Relic Chests [=]: Hit with weapons or stomp to plunder scrap.',
      '  • Sanctuary Sheep {m}: Roaming pasture fauna. Bleats gently and awards +25 XP when petted [E].',
      '  • Aether Surge Star: Rare celestial star granting radiant invulnerability to vaporize hostiles on contact.',
      '',
      'WEAPON EVOLUTION ([Q] TO SWITCH EQUIPPED WEAPON):',
      '  • Martial Arts & Cyan Blast   : Rapid kinetic flurry with cyan shockwave impacts.',
      '  • Dusk Dagger (Melee)         : 6-hit rapid flurry piercing stabs with spark bursts.',
      '  • Broadsword (Floor 2 Unlock) : 3-stroke heavy blade combo with sweeping crescent slash arcs.',
      '  • Aether Blaster (Floor 4)    : Long-range focused photon projectile beams.',
      '  • Concussion Mortar (Floor 7) : Heavy ballistic ordnance with massive kinetic detonations.',
      '  • Tempest Wrath (Floor 10)    : Screen-clearing high-voltage celestial thunderbolts.',
      '',
      'CELESTIAL ASCENSION GATES:',
      '  • Clear all hostiles on any floor to awaken the Celestial Ascension Gate at the far right.',
      '  • Step into the portal to ascend into the next chamber, claim floor bonuses, and unlock milestone weapons!',
      '',
      'Press [ESC] or click MENU to return.',
    ];

    for (const line of lines) {
      if (line.includes(':')) {
        ctx.fillStyle = '#00f0ff';
      } else {
        ctx.fillStyle = '#bbbbcc';
      }
      ctx.fillText(line, 40, y);
      y += 19;
    }

    ctx.restore();
  }

  renderSettings() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('⚙️ GAME SETTINGS', 40, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Courier New", monospace';
    let y = 100;
    const settings = [
      `1. VISUAL THEME       : ${this.theme.toUpperCase()} (Press [T] to cycle Mono B&W / Vibrant Aether / Verdant Matrix)`,
      `2. CRT SCANLINES      : ${this.crt ? 'ENABLED' : 'DISABLED'} (Toggle in toolbar)`,
      `3. CHIPTUNE MUSIC     : ${soundSynth.musicPlaying ? 'PLAYING' : 'MUTED'} (Press [B])`,
      `4. SOUND EFFECTS      : ${soundSynth.muted ? 'MUTED' : 'ENABLED'} (Press [M])`,
      `5. PIXEL EFFECTS ARCHIVE : 244 effects across 21 categories (Fully accessible in Studio tab)`,
    ];

    settings.forEach((s) => {
      ctx.fillText(s, 40, y);
      y += 36;
    });

    ctx.fillStyle = '#8888aa';
    ctx.fillText('Click any toolbar button below to change settings.', 40, y + 20);
    ctx.restore();
  }

  renderPaused() {
    this.renderGame();
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 10, 0.75)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('GAME PAUSED', 480, 240);

    ctx.fillStyle = '#00f0ff';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('Press [ESC] or Space to Resume Mission', 480, 280);
    ctx.restore();
  }

  renderVictory() {
    this.renderGame();
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 15, 10, 0.88)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.fillText('★ DIMENSIONAL COLOSSUS PURGED! ★', 480, 200);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`FLOOR ${this.world.currentFloor} CLEARED • CELESTIAL ASCENSION GATE UNLOCKED`, 480, 245);
    ctx.fillText(
      `Score: ${this.player.score} | Aether Shards: ${this.player.coins} | Kills: ${this.player.kills} | Best Record: Floor ${this.world.bestFloor}`,
      480,
      280
    );

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText(`Press [SPACE] or Click to Ascend to Floor ${this.world.currentFloor + 1}!`, 480, 335);

    if (this.input.wasJustPressed('jump') || this.input.wasJustPressed('punch') || this.input.wasJustPressed('Space')) {
      const nextFloor = this.world.currentFloor + 1;
      this.world.loadFloor(nextFloor);
      this.player.x = 40;
      this.player.y = 140;
      this.setScreen('PLAYING');
    }
    ctx.restore();
  }

  renderGameOver() {
    this.renderGame();
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(20, 5, 5, 0.88)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.fillText('SPIRAL RESONANCE SHATTERED', 480, 210);

    ctx.fillStyle = '#ffffff';
    ctx.font = '15px "Courier New", monospace';
    ctx.fillText(`CHAMBER DEFEAT AT FLOOR ${this.world.currentFloor} • ALL-TIME RECORD: FLOOR ${this.world.bestFloor}`, 480, 255);
    ctx.fillText(
      `Aether Shards Collected: ${this.player.coins} | Hostiles Purged: ${this.player.kills} | Level: ${this.player.level}`,
      480,
      285
    );

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('Press [SPACE] or Click to Revive with your Upgrades!', 480, 335);

    if (this.input.wasJustPressed('jump') || this.input.wasJustPressed('punch') || this.input.wasJustPressed('Space')) {
      this.player.hp = this.player.maxHp;
      this.player.energy = this.player.maxEnergy;
      this.setScreen('PLAYING');
    }
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SpiralApp();
});
