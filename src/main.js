/**
 * Web flagship entry loop for IRONCROWN: The Realm in Winter.
 * // [BELLGLASS ARCHIVE] Previously booted BellglassGame via ./engine/game.js & ./engine/audio.js.
 */

// [BELLGLASS ARCHIVE] import { BellAudio } from './engine/audio.js';
import { CrtCanvasRenderer } from './engine/crtRenderer.js';
// [BELLGLASS ARCHIVE] import { BellglassGame } from './engine/game.js';

import { WarAudio } from './war/audio.js';
import { IroncrownGame } from './war/game.js';

const KEY_ACTIONS = {
  ArrowUp: 'move_n',
  KeyW: 'move_n',
  ArrowDown: 'move_s',
  KeyS: 'move_s',
  ArrowLeft: 'move_w',
  KeyA: 'move_w',
  ArrowRight: 'move_e',
  KeyD: 'move_e',
  KeyJ: 'strike',
  KeyZ: 'strike',
  KeyF: 'parry',
  KeyK: 'parry',
  ShiftLeft: 'parry',
  ShiftRight: 'parry',
  KeyB: 'volley',
  KeyX: 'volley',
  KeyL: 'pause_battle',
  Space: 'fork',
  KeyE: 'interact',
  KeyR: 'rest',
  KeyT: 'raven',
  Tab: 'ledger',
  KeyM: 'ledger',
  KeyN: 'new_game',
  Escape: 'cancel',
  KeyQ: 'quit',
  Digit1: 'choice_1',
  Digit2: 'choice_2',
  Digit3: 'choice_3',
  Digit4: 'choice_4',
  Digit5: 'choice_5',
  Digit6: 'choice_6',
};

const MOVE_CODES = new Set(['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD']);

function bootstrap() {
  const canvas = document.getElementById('crt');
  const statusTag = document.getElementById('crt-status');
  const phosphorBtn = document.getElementById('btn-phosphor');
  const crtBtn = document.getElementById('btn-crt');
  const audioBtn = document.getElementById('btn-audio');
  if (!canvas) return;

  // [BELLGLASS ARCHIVE] const audio = new BellAudio();
  // [BELLGLASS ARCHIVE] const game = new BellglassGame({ sfxCallback: (cue) => audio.play(cue) });
  const audio = new WarAudio();
  const game = new IroncrownGame({
    sfxCallback: (cue) => audio.play(cue),
  });
  const renderer = new CrtCanvasRenderer(canvas);
  const heldMoves = new Set();

  const updateMetaTag = () => {
    const theme = renderer.getTheme();
    if (phosphorBtn) {
      const shortName = theme.id === 'amber' ? 'AMBER' : theme.id === 'verdigris' ? 'GREEN' : 'IVORY';
      phosphorBtn.textContent = `[P] PHOSPHOR: ${shortName}`;
    }
    if (crtBtn) crtBtn.textContent = renderer.crtEnabled ? '[V] CRT GLOW: ON' : '[V] CRT GLOW: OFF';
    if (audioBtn) audioBtn.textContent = audio.muted ? '[`] SOUND: MUTED' : '[`] SOUND: ON';
    if (statusTag) {
      // [BELLGLASS ARCHIVE] const n = game.bellsRungCount();
      // [BELLGLASS ARCHIVE] statusTag.textContent = `${theme.label}  |  BELLS ${n}/5`;
      // [BELLGLASS ARCHIVE] audio.setMistCalmness(n);
      statusTag.textContent = `${theme.label}  |  HOLDS ${game.heldCount()}/9  |  DAY ${game.campaign.day}`;
      audio.setWarTension(game.campaign.seasonIndex, game.screen === 'battle');
    }
    if (typeof document !== 'undefined' && document.documentElement?.style) {
      document.documentElement.style.setProperty('--phosphor-mist', theme.grades[1]);
      document.documentElement.style.setProperty('--phosphor-dim', theme.grades[2]);
      document.documentElement.style.setProperty('--phosphor-lit', theme.grades[3]);
    }
  };

  window.addEventListener('resize', () => renderer.resize());

  window.addEventListener('keydown', (ev) => {
    audio.unlock();
    if (ev.code === 'KeyP') {
      renderer.cyclePhosphor();
      updateMetaTag();
      return;
    }
    if (ev.code === 'KeyV') {
      renderer.crtEnabled = !renderer.crtEnabled;
      updateMetaTag();
      return;
    }
    if (ev.code === 'Backquote') {
      audio.toggleMute();
      updateMetaTag();
      return;
    }

    if (ev.code === 'Space' || ev.code === 'Tab' || ev.code.startsWith('Arrow')) {
      ev.preventDefault();
    }

    if (MOVE_CODES.has(ev.code)) {
      heldMoves.add(ev.code);
    }

    if (ev.code === 'Enter') {
      // [BELLGLASS ARCHIVE] game.handleAction(game.screen === 'play' && !game.activeStory ? 'strike' : 'confirm');
      game.handleAction('confirm');
      updateMetaTag();
      return;
    }
    if (ev.code === 'KeyH') {
      game.handleAction('help');
      updateMetaTag();
      return;
    }
    if (ev.code === 'KeyC') {
      game.handleAction(game.screen === 'battle' ? 'strike' : 'council');
      updateMetaTag();
      return;
    }

    const action = KEY_ACTIONS[ev.code];
    if (action) {
      game.handleAction(action);
      updateMetaTag();
    }
  });

  window.addEventListener('keyup', (ev) => {
    heldMoves.delete(ev.code);
  });

  window.addEventListener('blur', () => heldMoves.clear());

  canvas.addEventListener('click', (ev) => {
    audio.unlock();
    const cell = renderer.hitTestCell(ev.clientX, ev.clientY);
    if (!cell) return;
    if (game.screen === 'title') {
      if (cell.row >= 27 && cell.row <= 29) game.handleAction('confirm');
      else if (cell.row === 30 && game.hasExistingSave) game.handleAction('new_game');
      else if (cell.row === 32) game.handleAction('help');
      else if (cell.row < 27) game.handleAction('confirm');
    } else if (game.screen === 'help' || game.screen === 'ledger' || game.screen === 'victory' || game.screen === 'dead') {
      game.handleAction('confirm');
    } else if (game.screen === 'dialogue') {
      if (cell.row === 35 || cell.row === 36) {
        const buf = game.renderBuffer();
        const rowStr = buf[cell.row].map(([ch]) => ch).join('');
        let picked = false;
        for (let c = Math.min(cell.col, rowStr.length - 3); c >= 0; c--) {
          if (rowStr[c] === '[' && rowStr[c + 2] === ']' && rowStr[c + 1] >= '1' && rowStr[c + 1] <= '6') {
            game.handleAction(`choice_${rowStr[c + 1]}`);
            picked = true;
            break;
          }
        }
        if (!picked) game.handleAction('confirm');
      } else {
        game.handleAction('cancel');
      }
    } else if (game.screen === 'campaign' || game.screen === 'battle') {
      game.handleCanvasClick(cell.row, cell.col);
    }
    updateMetaTag();
  });

  if (phosphorBtn) {
    phosphorBtn.addEventListener('click', () => {
      audio.unlock();
      renderer.cyclePhosphor();
      updateMetaTag();
    });
  }
  if (crtBtn) {
    crtBtn.addEventListener('click', () => {
      audio.unlock();
      renderer.crtEnabled = !renderer.crtEnabled;
      updateMetaTag();
    });
  }
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      audio.unlock();
      audio.toggleMute();
      updateMetaTag();
    });
  }

  document.querySelectorAll('[data-act]').forEach((btn) => {
    const trigger = (ev) => {
      ev.preventDefault();
      audio.unlock();
      const act = btn.getAttribute('data-act');
      if (act) {
        game.handleAction(act);
        updateMetaTag();
      }
    };
    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('mousedown', trigger);
  });

  updateMetaTag();
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;

    if ((game.screen === 'campaign' || game.screen === 'battle') && heldMoves.size > 0) {
      const lastCode = Array.from(heldMoves).pop();
      const moveAct = KEY_ACTIONS[lastCode];
      if (moveAct) {
        game.handleAction(moveAct);
        updateMetaTag();
      }
    }

    game.update(dt);
    renderer.draw(game.renderBuffer());
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

bootstrap();
