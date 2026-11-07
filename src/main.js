// Main Orchestrator for Cyber Marino: Run & Gun Hunter
// Features Weapon Evolution (Knife -> Sword -> Blaster Gun -> Rocket Launcher -> Lightning),
// Mario-style Enemy Stomping & Star Power, Bouncy Loot Drops, Upgrade Shop, and 244-effect VFX Studio!

import { PixelPlayer } from './pixelfx/game/PixelPlayer.js';
import { PixelWorld } from './pixelfx/game/PixelWorld.js';
import { UpgradeShop } from './pixelfx/game/UpgradeShop.js';
import { StudioManager } from './pixelfx/studio/StudioManager.js';
import { RigExplorer } from './pixelfx/studio/RigExplorer.js';
import { Input } from './engine/Input.js';
import { soundSynth } from './audio/SoundSynth.js';
import { createFrame, clearFrame, composite } from './pixelfx/core/index.js';

class CyberMarinoApp {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.canvas.width = 960;
    this.canvas.height = 540;

    this.input = new Input(this.canvas);

    // Screen States: 'MENU', 'PLAYING', 'UPGRADE_SHOP', 'VFX_STUDIO', 'PIXEL_RIG', 'GUIDE', 'SETTINGS', 'PAUSED', 'VICTORY', 'GAMEOVER'
    this.screen = 'MENU';
    this.theme = 'bw'; // 'bw' (Monochrome B&W), 'color' (Cyber Neon), 'green' (Phosphor Matrix)
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

    // Handle clicks inside canvas (e.g. for Upgrade Shop)
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      if (this.screen === 'UPGRADE_SHOP') {
        this.shop.handleClick(mouseX, mouseY, this.player, soundSynth);
      }
    });

    requestAnimationFrame((t) => this.loop(t));
  }

  setScreen(newScreen) {
    this.screen = newScreen;

    const tabMap = {
      MENU: 'tabMenu',
      PLAYING: 'tabPlay',
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
      metaDesc.innerHTML = `<strong>${fx.name}</strong> [${fx.cat}] &bull; Duration: ${m.duration}s &bull; FPS: ${m.fps} &bull; Size: ${m.size[0]}x${m.size[1]}<br>${m.desc || 'Procedural pixel effect from patch-gg/pixelfx library.'}<br><span style="color:#00ff88">Author/Engine: Hugo Duprez (Sprite Fusion) &bull; Patch &bull; Zero External Assets</span>`;
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
    bindSlider('sliderHandX', 'fx');
    bindSlider('sliderWeaponAngle', 'weaponAngle', true);

    const spinBtn = document.getElementById('rigSpinBtn');
    spinBtn.addEventListener('click', () => {
      rig.autoSpin = !rig.autoSpin;
      spinBtn.textContent = `AUTO-SPIN: ${rig.autoSpin ? 'ON' : 'OFF'}`;
    });

    const weaponBtn = document.getElementById('rigWeaponBtn');
    weaponBtn.addEventListener('click', () => {
      const weapons = ['sword', 'staff', 'none'];
      const next = (weapons.indexOf(rig.weapon) + 1) % weapons.length;
      rig.weapon = weapons[next];
      weaponBtn.textContent = `WEAPON: ${rig.weapon.toUpperCase()}`;
    });

    document.getElementById('rigResetBtn').addEventListener('click', () => {
      rig.yaw = 0;
      rig.lean = 0;
      rig.crouch = 2;
      rig.fx = 11;
      rig.weaponAngle = 0.4;
      document.getElementById('sliderYaw').value = 0;
      document.getElementById('sliderLean').value = 0;
      document.getElementById('sliderCrouch').value = 2;
      document.getElementById('sliderHandX').value = 11;
      document.getElementById('sliderWeaponAngle').value = 0.4;
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
      soundSynth.playHit();
      let hitRadius = 32;
      let hitDmg = 28;

      if (weaponType === 'knife') {
        hitRadius = 24;
        hitDmg = 18;
      } else if (weaponType === 'sword') {
        hitRadius = 36;
        hitDmg = 35;
      } else if (weaponType === 'pistol') {
        hitRadius = 160; // Long-range projectile line!
        hitDmg = 25;
      } else if (weaponType === 'rocket') {
        hitRadius = 180; // Rocket flight
        hitDmg = 65;
        this.world.spawnExplosion(player.x + player.facing * 80, player.y - 10);
      } else if (weaponType === 'lightning') {
        hitRadius = 140;
        hitDmg = 75;
      }

      hitDmg = Math.floor(hitDmg * player.damageMultiplier);

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
              setTimeout(() => this.setScreen('VICTORY'), 1400);
            }
          }
        }
      }
    };

    const spawnPoison = (x, y) => {
      this.world.spawnPoisonCloud(x, y);
    };

    this.player.update(dt, this.input, this.world, onMeleeHit, spawnPoison);
    this.world.update(dt, this.player, soundSynth);

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

    this.world.drawOverlay(this.ctx, 3, 3);
    this.renderHUD();
  }

  renderHUD() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 12px "Courier New", monospace';

    // Top HUD Bar Background
    ctx.fillStyle = 'rgba(10, 10, 16, 0.88)';
    ctx.fillRect(16, 10, 928, 44);
    ctx.strokeStyle = '#333348';
    ctx.strokeRect(16, 10, 928, 44);

    // HP Bar
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HP:', 28, 36);
    const hpRatio = this.player.hp / this.player.maxHp;
    ctx.fillStyle = '#221111';
    ctx.fillRect(55, 22, 130, 18);
    ctx.fillStyle = this.theme === 'bw' ? '#ffffff' : '#ff3344';
    ctx.fillRect(55, 22, 130 * hpRatio, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`, 90, 36);

    // Energy Bar
    ctx.fillText('NRG:', 198, 36);
    const nrgRatio = this.player.energy / this.player.maxEnergy;
    ctx.fillStyle = '#112222';
    ctx.fillRect(235, 22, 100, 18);
    ctx.fillStyle = this.theme === 'bw' ? '#cccccc' : '#00f0ff';
    ctx.fillRect(235, 22, 100 * nrgRatio, 18);

    // Level & XP
    ctx.fillStyle = '#76ff03';
    ctx.fillText(`LVL ${this.player.level} (${this.player.xp}/${this.player.xpNeeded} XP)`, 350, 36);

    // Coins / Rewards
    ctx.fillStyle = '#ffea00';
    ctx.fillText(`🪙 ${this.player.coins}`, 510, 36);

    // Active Weapon Badge
    const weaponIcons = { knife: '🗡️ KNIFE', sword: '⚔️ SWORD', pistol: '🔫 BLASTER', rocket: '🚀 ROCKET', lightning: '⚡ LIGHTNING' };
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`[ ${weaponIcons[this.player.currentWeapon] || 'WEAPON'} ] (Q)`, 610, 36);

    // Flasks
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`FLASKS: ${'🧪'.repeat(this.player.flasks)}`, 800, 36);

    // Star Power Banner if active
    if (this.player.starPowerTimer > 0) {
      ctx.fillStyle = '#ffff00';
      ctx.fillText(`★ STAR POWER (${this.player.starPowerTimer.toFixed(1)}s) ★`, 400, 78);
    }

    // Boss Bar if Goliath is alive
    const boss = this.world.enemies.find((e) => e.type === 'warlord');
    if (boss && !boss.isDead) {
      ctx.fillStyle = 'rgba(20, 10, 20, 0.9)';
      ctx.fillRect(280, 485, 400, 32);
      ctx.strokeStyle = '#ff3366';
      ctx.strokeRect(280, 485, 400, 32);

      const bossRatio = boss.hp / boss.maxHp;
      ctx.fillStyle = this.theme === 'bw' ? '#ffffff' : '#ff2255';
      ctx.fillRect(284, 489, 392 * bossRatio, 24);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`CYBER WARLORD MECH — ${Math.ceil(boss.hp)} HP`, 480, 506);
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
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.fillText('CYBER MARINO: RUN & GUN HUNTER', 480, 130);

    ctx.fillStyle = '#ffea00';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('ARCADE RUN & GUN • WEAPON EVOLUTION • ENEMY LOOT DROPS', 480, 165);
    ctx.fillStyle = '#8888aa';
    ctx.fillText('Powered by patch-gg/pixelfx • Hugo Duprez (Sprite Fusion) • Web Audio', 480, 190);

    const options = [
      { text: '▶  [1] PLAY GAME MISSION', screen: 'PLAYING' },
      { text: '⚡  [2] UPGRADE ARSENAL & PERKS', screen: 'UPGRADE_SHOP' },
      { text: '🧪  [3] VFX STUDIO (244 EFFECTS)', screen: 'VFX_STUDIO' },
      { text: '🧬  [4] HOW PIXEL ART IS BUILT', screen: 'PIXEL_RIG' },
      { text: '📖  [5] HOW TO PLAY & GUIDE', screen: 'GUIDE' },
      { text: '⚙️  [6] SETTINGS & THEMES', screen: 'SETTINGS' },
    ];

    options.forEach((opt, i) => {
      const y = 240 + i * 44;
      ctx.fillStyle = '#12121c';
      ctx.fillRect(280, y - 20, 400, 32);
      ctx.strokeStyle = '#333348';
      ctx.strokeRect(280, y - 20, 400, 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(opt.text, 480, y);
    });

    ctx.fillStyle = '#777788';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('Press [SPACE] to Play • [Q] Switch Weapon • [U] Arsenal Shop • [T] Theme', 480, 510);

    if (this.input.wasJustPressed('jump') || this.input.wasJustPressed('punch')) {
      this.setScreen('PLAYING');
    }

    ctx.restore();
  }

  renderGuide() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('📖 CYBER MARINO: GAMEPLAY & UPGRADE GUIDE', 40, 45);

    ctx.fillStyle = '#cccccc';
    ctx.font = '12px "Courier New", monospace';
    let y = 80;
    const lines = [
      'MARIO & SHOOTING GAMEPLAY:',
      '  • Run & Jump: Use [A / D] to run and [W / Space] to jump.',
      '  • Enemy Head Stomp: Fall onto enemies from above to crush them and bounce high!',
      '  • Mystery Blocks: Jump into floating [ ? ] blocks from below to shower lucky coins & loot!',
      '  • Power Star Mode: Rare stars give Mario-style rainbow invulnerability to smash foes on touch!',
      '',
      'ENEMY LOOT DROPS & REWARDS:',
      '  • Defeated enemies drop bouncy Gold Coins (🪙), XP Orbs (⚡), Heart Medkits (❤️), and Stars!',
      '  • Walk near drops to pull them in (upgrade your Magnet Radius to suck up loot from far away).',
      '  • Gaining XP levels you up, increasing Max HP, Max Energy, and Base Damage.',
      '',
      'WEAPON EVOLUTION & ARSENAL SHOP ([U] or [TAB]):',
      '  • Combat Dagger / Knife   : Rapid 6-hit flurry stabs with spark bursts (ultra-fast).',
      '  • Cyber Katana / Sword    : 3-stroke heavy blade combo with wide cleaving arcs.',
      '  • Laser Blaster / Pistol  : Aimed 3-shot laser projectiles crossing the screen.',
      '  • Rocket Bazooka          : Fires devastating area-of-effect explosive missiles.',
      '  • Celestial Lightning     : Summons screen-clearing lightning storm.',
      '  • Press [Q] to switch equipped weapons anytime in battle!',
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
      y += 22;
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
      `1. VISUAL THEME       : ${this.theme.toUpperCase()} (Press [T] to cycle B&W Mono / Neon Cyber / Matrix Green)`,
      `2. CRT SCANLINES      : ${this.crt ? 'ENABLED' : 'DISABLED'} (Toggle in toolbar)`,
      `3. CHIPTUNE MUSIC     : ${soundSynth.musicPlaying ? 'PLAYING' : 'MUTED'} (Press [B])`,
      `4. SOUND EFFECTS      : ${soundSynth.muted ? 'MUTED' : 'ENABLED'} (Press [M])`,
      `5. PIXELFX ARCHIVE    : 244 effects across 21 categories (Fully accessible in Studio tab)`,
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
    ctx.fillStyle = 'rgba(5, 15, 10, 0.85)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillText('MISSION COMPLETE!', 480, 210);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`CYBER WARLORD MECH DESTROYED!`, 480, 255);
    ctx.fillText(
      `Score: ${this.player.score} | Coins: ${this.player.coins} | Kills: ${this.player.kills} | Level: ${this.player.level}`,
      480,
      290
    );

    ctx.fillStyle = '#00f0ff';
    ctx.fillText('Press [SPACE] to Play Again or Open Upgrade Arsenal', 480, 340);

    if (this.input.wasJustPressed('jump') || this.input.wasJustPressed('punch')) {
      this.restartMission();
      this.setScreen('PLAYING');
    }
    ctx.restore();
  }

  renderGameOver() {
    this.renderGame();
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(20, 5, 5, 0.85)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillText('GAME OVER', 480, 220);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('Press [SPACE] or Click to Respawn with your Upgrades', 480, 270);

    if (this.input.wasJustPressed('jump') || this.input.wasJustPressed('punch')) {
      this.player.hp = this.player.maxHp;
      this.player.energy = this.player.maxEnergy;
      this.setScreen('PLAYING');
    }
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CyberMarinoApp();
});
