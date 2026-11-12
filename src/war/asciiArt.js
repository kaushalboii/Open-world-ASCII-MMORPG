/**
 * Animated Multi-Line Shaded ASCII War Art & Parallax Horizon Engine for IRONCROWN.
 * Combines contour anatomical ASCII sprites (warhorses, armored riders, shield walls,
 * longbowmen, iron battering rams) with halftone shaded portraits, castles, and peaks
 * (density ramp: " .:-=+*#%@") strictly within printable single-cell ASCII (32..126).
 */

import {
  GRADE_BRIGHT,
  GRADE_DIM,
  GRADE_GHOST,
  GRADE_LIT,
  GRADE_MIST,
  sanitizeGlyph,
} from '../engine/palette.js';
import {
  ensureHalftoneCache,
  getBakedCampaignHorse,
  getBakedSteedPanorama,
  stampCellGrid,
} from './halftoneArt.js';

const MIRROR_MAP = {
  '/': '\\',
  '\\': '/',
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '`': "'",
  "'": '`',
  d: 'b',
  b: 'd',
  p: 'q',
  q: 'p',
};

export function mirrorAsciiLine(line) {
  let out = '';
  for (let i = line.length - 1; i >= 0; i--) {
    const ch = sanitizeGlyph(line[i]);
    out += MIRROR_MAP[ch] ?? ch;
  }
  return out;
}

export function mirrorAsciiLines(lines) {
  const maxW = lines.reduce((m, l) => Math.max(m, l.length), 0);
  return lines.map((l) => mirrorAsciiLine(l.padEnd(maxW, ' ')));
}

export function gradeForArtGlyph(ch, baseGrade = GRADE_LIT, highlightChars = null) {
  if (highlightChars && highlightChars.has(ch)) return GRADE_BRIGHT;
  if (ch === '@' || ch === '%' || ch === '#') return baseGrade;
  if (ch === '*' || ch === '+') return Math.max(GRADE_MIST, baseGrade - 1);
  if (ch === '=' || ch === '-' || ch === ':' || ch === '.') {
    return baseGrade >= GRADE_LIT ? GRADE_DIM : GRADE_MIST;
  }
  if (ch === '>' || ch === '<' || ch === 'O') return GRADE_BRIGHT;
  return baseGrade;
}

export function stampSprite(buf, x, y, lines, options = {}) {
  const {
    baseGrade = GRADE_LIT,
    highlightChars = null,
    bounds = null,
    mirror = false,
    rowGrades = null,
    tintOverride = null,
  } = options;
  const rows = buf.length;
  const cols = rows > 0 ? buf[0].length : 0;
  const x0 = bounds ? bounds.x0 : 0;
  const y0 = bounds ? bounds.y0 : 0;
  const x1 = bounds ? bounds.x1 : cols - 1;
  const y1 = bounds ? bounds.y1 : rows - 1;

  const prepared = mirror ? mirrorAsciiLines(lines) : lines;
  for (let r = 0; r < prepared.length; r++) {
    const ty = y + r;
    if (ty < y0 || ty > y1) continue;
    const rowStr = prepared[r];
    const rGrade = rowGrades && rowGrades[r] != null ? rowGrades[r] : baseGrade;
    for (let c = 0; c < rowStr.length; c++) {
      const tx = x + c;
      if (tx < x0 || tx > x1) continue;
      const ch = sanitizeGlyph(rowStr[c]);
      if (ch === ' ') continue;
      let g = tintOverride != null ? tintOverride : gradeForArtGlyph(ch, rGrade, highlightChars);
      g = Math.max(GRADE_GHOST, Math.min(GRADE_BRIGHT, g));
      buf[ty][tx] = [ch, g];
    }
  }
}

// ============================================================================
// 1. HERO TITLE WARHORSE & KNIGHT (48 cols x 17 rows, 4-frame full gallop!)
// ============================================================================
const TITLE_RIDER_TORSO = [
  '                 ,_o  /|__                      ',
  '               /`((\'>/ .::::.-._                ',
  '       ~~~=== / /|| / .:::.-"  \'\\\\_             ',
  '     ~~===== [###]==/ :::/  -._  (O\\            ',
  '    ~====== /__/|| /%%%%/  .-" \'-. d\\|          ',
  '          /| / ||/%%%%%####\\  `.  (__/||        ',
  '         / |/  ||/%%%%%#####%%%%\\_ \\/\\/|        ',
  '        `  |   |%%%%%#####%#####%%%\\            ',
  '           |===|%%%#######%######%%%\\==========>',
  '          /    |%%%%%#######%#####%%/           ',
  '         /     \\#####%######%####%%/            ',
  '                \\___..------.___.-/             ',
];

const TITLE_HORSE_LEGS = [
  // Frame 0: Extended fore-reach, hind drive
  [
    '                 // /       \\ \\\\                ',
    '                // /         \\  \\\\              ',
    '               // /           \\   \\\\__          ',
    '              ^  ^             \\__   `>         ',
    '            .  .  .               `             ',
  ],
  // Frame 1: Airborne suspension — hooves tucked beneath barrel
  [
    '                 \\ \\\\        // /               ',
    '                  \\ \\\\_    _// /                ',
    '                   `>  \\  /  <`                 ',
    '                 .  .   ^^   .                  ',
    '                                                ',
  ],
  // Frame 2: Rear push & mid-ground gather
  [
    '                 \\ \\        / //                ',
    '                  \\ \\      / //                 ',
    '                 _/ /__   / /`>                 ',
    '                ^    `>  ^                      ',
    '                   .   .   .                    ',
  ],
  // Frame 3: Fore-plant strike & tail whip
  [
    '                  | |      /  \\                 ',
    '                  | |     / /\\ \\                ',
    '                 / /`>   / /  \\ \\               ',
    '                ^       ^      `>               ',
    '             * .  .                             ',
  ],
];

export const TITLE_HORSE_FRAMES = TITLE_HORSE_LEGS.map((legs, idx) => {
  const top = [...TITLE_RIDER_TORSO];
  // Subtle vertical gallop crest / tail / cloak wave per frame
  if (idx === 1) {
    top[2] = '      ~~~~=== / /|| / .:::.-"  \'\\\\_             ';
    top[3] = '    ~~~===== [###]==/ :::/  -._  (O\\            ';
    top[4] = '   ~~====== /__/|| /%%%%/  .-" \'-. d\\|          ';
  } else if (idx === 2) {
    top[2] = '       ~~==== / /|| / .:::.-"  \'\\\\_             ';
    top[3] = '      ~===== [###]==/ :::/  -._  (O\\            ';
    top[4] = '     ====== /__/|| /%%%%/  .-" \'-. d\\|          ';
  } else if (idx === 3) {
    top[2] = '        ~==== / /|| / .:::.-"  \'\\\\_             ';
    top[3] = '       ======[###]==/ :::/  -._  (O\\            ';
    top[4] = '      ===== /__/|| /%%%%/  .-" \'-. d\\|          ';
  }
  return [...top, ...legs];
});

// High-detail close-up Destrier Head inspired directly by traditional shaded ASCII horse art (46x18)
export const DESTRIER_CLOSEUP_ART = [
  '                           ___________ _      ',
  '                      __/   .::::.-"-(/-/)    ',
  '                    _/:  .::::.-" .-"\\/\\_`    ',
  '                   /:  .::::./   -._-.  d\\|   ',
  '                    /: (""""/    \'.  (__/||   ',
  '                     \\::).-"  -._  \\/ \\/\\/|   ',
  '             __ _ .-"`) /  "-". . ". |  (i_O  ',
  '         .-"      \\       -"      "\\|         ',
  '    _ _./      .-"|       ".  (    \\\\         ',
  ' .-"   :      "_  \\         "-"\\  /|/         ',
  '/      )\\_      "- )_________.-|_/^\\          ',
  '(   .-"   )-._-:  /        \\(/\\"-._ `.        ',
  ' (   )  _//_/|:  /          `\\()   `\\_\\       ',
  '  ( (   \\()^_/)_/             )/      \\\\      ',
  '   )     \\\\ \\(_)             //        )\\     ',
  '         _o\\ \\\\\\            (o_       |__\\    ',
  '         \\ /  \\\\\\__          )_\\              ',
  '               ^)__\\                          ',
];

export function renderShadedSkyAndPeaks(buf, x0, y0, width, height, scrollX, clock, seasonId = 'winter') {
  for (let r = 0; r < height; r++) {
    const sy = y0 + r;
    if (sy < 0 || sy >= buf.length) continue;
    for (let c = 0; c < width; c++) {
      const sx = x0 + c;
      if (sx < 0 || sx >= buf[0].length) continue;
      const wx = c + scrollX;
      // Clean upper-horizon mountain crests so foreground horses pop sharply against black CRT sky
      const ridgeH = 2.0 + Math.sin(wx * 0.09) * 1.4 + Math.cos(wx * 0.22) * 0.6;
      const lowerSlope = ridgeH + 1.8;
      if (r >= Math.floor(ridgeH) && r <= Math.min(height - 1, Math.floor(lowerSlope))) {
        const isCrest = r === Math.floor(ridgeH);
        const ch = isCrest ? '^' : (wx + r) % 4 === 0 ? '+' : (wx % 2 === 0 ? '=' : ':');
        buf[sy][sx] = [ch, isCrest ? GRADE_DIM : GRADE_GHOST];
      } else {
        const cloud = Math.sin(wx * 0.11 - clock * 0.35) + Math.cos(r * 1.5 + wx * 0.04);
        if (cloud > 1.55) {
          buf[sy][sx] = ['.', GRADE_GHOST];
        } else if (seasonId === 'winter' && ((c * 17 + Math.floor(clock * 6 + r * 5)) % 67 === 0)) {
          buf[sy][sx] = ['*', GRADE_DIM];
        } else if (seasonId === 'autumn' && ((c * 13 + Math.floor(clock * 9 + r * 7)) % 71 === 0)) {
          buf[sy][sx] = ['/', GRADE_GHOST];
        }
      }
    }
  }
}

// ============================================================================
// 2. CAMPAIGN LIVE MARCH WARHORSE (26 cols x 8 rows, 4 gallop + 1 idle)
// ============================================================================
const CAMPAIGN_HORSE_TOP = [
  '               ,_         ',
  '         ,_o  /  `\\_      ',
  '   ~~~~==//\\\\//%%(O `.    ',
  ' ~~====[###]/%%%%%\\___)   ',
  '    /__/||/######%###/==> ',
  '        \\\\`---...___/     ',
];

const CAMPAIGN_HORSE_LEGS = [
  [
    '        // /      \\ \\\\    ',
    '       ^  `        `  `>  ',
  ],
  [
    '         \\\\\\     // /     ',
    '          `> \\__/ <`      ',
  ],
  [
    '         \\\\ \\   / //      ',
    '        _/ /   / /`>      ',
  ],
  [
    '          | |   \\ \\       ',
    '         / /`>   `>       ',
  ],
];

const CAMPAIGN_HORSE_IDLE = [
  '               ,_         ',
  '         ,_o  /  `\\_      ',
  '    ~== //\\\\//%%(O `.     ',
  '  ~===[###]/%%%%%\\___)    ',
  '    /__/||/######%###/    ',
  '        \\\\`---...__|      ',
  '         ||  ||   ||      ',
  '         ^^ ^ `   ^^      ',
];

export const CAMPAIGN_HORSE_FRAMES = CAMPAIGN_HORSE_LEGS.map((legs, idx) => {
  const top = [...CAMPAIGN_HORSE_TOP];
  if (idx === 1 || idx === 3) {
    top[2] = '  ~~~~~==//\\\\//%%(O `.    ';
    top[3] = '~~~====[###]/%%%%%\\___)   ';
  }
  return [...top, ...legs];
});

export function getCampaignHorseFrame(clock, isGalloping) {
  if (!isGalloping) {
    const bob = Math.floor(clock * 2.2) % 4 === 0;
    if (!bob) return CAMPAIGN_HORSE_IDLE;
    const nod = [...CAMPAIGN_HORSE_IDLE];
    nod[0] = '                ,_        ';
    nod[1] = '         ,_o   /  `\\_     ';
    nod[2] = '    ~== //\\\\_//%%(O `.    ';
    return nod;
  }
  const idx = Math.floor(clock * 11) % CAMPAIGN_HORSE_FRAMES.length;
  return CAMPAIGN_HORSE_FRAMES[idx];
}

const RETINUE_WALK = [
  [
    '   |\\    o    ',
    '   ||  /[#]\\  ',
    '   ||  | | |  ',
    '   ||  / \\    ',
    '   || `   `   ',
  ],
  [
    '   |\\    o    ',
    '   ||  /[#]\\  ',
    '   ||  | | |  ',
    '   ||  |\\|    ',
    '   || `   \\   ',
  ],
];

export function renderCampaignMarchVista(buf, game, opts = {}) {
  const { x0 = 1, y0 = 19, width = 66, height = 13 } = opts;
  const bounds = { x0, y0, x1: x0 + width - 1, y1: y0 + height - 1 };
  const t = game.clock;
  const gallop = (game.campaign.gallopTimer || 0) > 0;
  const facingRight = (game.campaign.facing ?? 1) >= 0;
  const scroll = Math.floor((game.campaign.marchScroll || 0) * 3);
  const season = game.getSeason ? game.getSeason() : 'winter';

  // 1. Quiet upper sky & drifting snow/stars (leaving horse helm & upper torso unobstructed!)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < width; c++) {
      const n = (c * 17 + scroll + r * 31) % 73;
      if (r < 3 && season === 'winter' && n === 0) buf[y0 + r][x0 + c] = ['*', GRADE_DIM];
      else if (r < 2 && n % 19 === 0) buf[y0 + r][x0 + c] = ['.', GRADE_GHOST];
    }
  }
  // Distant mountain crags strictly tucked on left/right flanks away from centerpiece rider
  for (let c = 0; c < width; c++) {
    if (c > 12 && c < width - 14) continue;
    const h = 1 + Math.floor(Math.sin((c + scroll * 0.25) * 0.28) * 1.1 + 1.0);
    for (let k = 0; k < h; k++) {
      const py2 = y0 + 5 - k;
      if (py2 >= bounds.y0 && py2 <= bounds.y1) {
        buf[py2][x0 + c] = [k === h - 1 ? '^' : ':', GRADE_GHOST];
      }
    }
  }

  // 2. Terrain-matched distant midground silhouettes (behind hero)
  const px = game.campaign.px;
  const py = game.campaign.py;
  const tile = game.grid?.[py]?.[px] ?? '.';
  const nearHold = game.holdAt ? game.holdAt(px, py) : null;
  const nearAnyHold = (game.holds || []).find((h) => Math.abs(h.x - px) + Math.abs(h.y - py) <= 4);

  if (nearHold || nearAnyHold) {
    const castle = [
      '  |_|_|_   _|_|_  ',
      '  |##+##|=|##*##| ',
      '__|##[=]###[=]##|_',
      '##################',
    ];
    const cx = x0 + (facingRight ? width - 19 : 1);
    stampSprite(buf, cx, y0 + height - 5, castle, { baseGrade: GRADE_GHOST, highlightChars: new Set(['*']), bounds });
  } else if (tile === 'T') {
    for (let tx = 0; tx < width; tx += 19) {
      const rx = ((tx - (scroll % 19) + width) % width) + x0;
      const pine = ['  /\\  ', ' /%%\\ ', '/%%%%\\', '  ||  '];
      stampSprite(buf, rx, y0 + height - 5, pine, { baseGrade: GRADE_GHOST, bounds });
    }
  }

  // 3. Road & frosted verge along bottom row AFTER mountains/trees, BEFORE hooves!
  const vergeRow = y0 + height - 2;
  const roadRow = y0 + height - 1;
  for (let c = 0; c < width; c++) {
    const gx = x0 + c;
    buf[vergeRow][gx] = [((c + scroll) % 4 === 0) ? '.' : ' ', GRADE_GHOST];
    if (tile === '=') {
      buf[roadRow][gx] = [((c + scroll) % 4 === 0) ? '#' : '=', GRADE_DIM];
    } else {
      buf[roadRow][gx] = [((c + scroll) % 5 === 0) ? '=' : '-', GRADE_GHOST];
    }
  }

  // 4. Trailing Halftone Infantry Retinue + Full 46x13 3D Halftone Animated Horse & Knight!
  const cache = ensureHalftoneCache();
  const retFrameIdx = gallop ? Math.floor(t * 7) % 2 : 0;
  const retGrid = (facingRight ? cache.battleUnitsR.spear : cache.battleUnitsL.spear)[retFrameIdx];
  const horseGrid = getBakedCampaignHorse(t, gallop, facingRight);
  const horseX = facingRight ? x0 + 18 : x0 + 2;
  const retinueX = facingRight ? horseX - 16 : horseX + 46;
  stampCellGrid(buf, retinueX, y0 + height - 7, retGrid, bounds, -1);

  const horseY = y0 + height - horseGrid.length;
  stampCellGrid(buf, horseX, horseY, horseGrid, bounds, 0);

  // 5. Hoof snow/dust kick sparks right above road row when galloping
  if (gallop) {
    const dustX = facingRight ? horseX + 5 : horseX + 39;
    const puff = Math.floor(t * 14) % 2 === 0 ? '*.:' : '.:*';
    for (let i = 0; i < puff.length; i++) {
      const px2 = dustX + (facingRight ? -i : i);
      if (px2 >= bounds.x0 && px2 <= bounds.x1) {
        buf[vergeRow][px2] = [puff[i], GRADE_DIM];
      }
    }
  }
}

// ============================================================================
// 3. TACTICAL BATTLEFIELD MULTI-LINE ANIMATED SPRITES (facing Right; mirror L)
// ============================================================================
const BATTLE_HORSE_GALLOP = [
  [
    '           ,_     ',
    '     ,_o  / `\\_   ',
    ' ~==//\\\\//%(O  `> ',
    '~~=[###]/%%####/  ',
    '   /__// `---_/   ',
    '     // /   \\ \\\\  ',
    '    ^  `     `  `>',
  ],
  [
    '           ,_     ',
    '     ,_o  / `\\_   ',
    '~== //\\\\//%(O  `> ',
    '~==[###]/%%####/  ',
    '   /__// `---_/   ',
    '     \\\\\\    // /  ',
    '      `>\\__/ <`   ',
  ],
  [
    '           ,_     ',
    '     ,_o  / `\\_   ',
    ' ~==//\\\\//%(O  `> ',
    '~~=[###]/%%####/  ',
    '   /__// `---_/   ',
    '     \\\\\\   / //   ',
    '    _/ /  / /`>   ',
  ],
  [
    '           ,_     ',
    '     ,_o  / `\\_   ',
    ' ~==//\\\\//%(O  `> ',
    '~~=[###]/%%####/  ',
    '   /__// `---_/   ',
    '      | |  \\ \\    ',
    '     / /`>  `>    ',
  ],
];

const BATTLE_HORSE_CHARGE = [
  '           ,_     ',
  '     ,_o  / `\\_   ',
  '~===//\\\\//%(O  `> ',
  '~~=[###]/%%###====>',
  '   /__// `---_/   ',
  '    // /    \\ \\\\  ',
  '   ^  `      `  `>',
];

const BATTLE_GUARD_FRAMES = [
  [
    '  o  o   /',
    ' /[#][#]/ ',
    '  ||  ||  ',
    ' / \\ / \\  ',
  ],
  [
    '  o/ o/   ',
    ' /[#][#]==',
    '  ||  ||  ',
    ' / \\ / \\  ',
  ],
];

const BATTLE_SPEAR_OPEN = [
  '  o   o   /',
  ' /[#]/[#]/ ',
  '  ||  ||   ',
  ' / \\ / \\   ',
];

const BATTLE_SPEAR_WALL = [
  '  o  o  // ',
  ' [|#][|#]==',
  ' [|#][|#]==',
  ' /\\ /\\     ',
];

const BATTLE_BOW_FRAMES = [
  [
    '  o)  o)  ',
    ' /|)> /|)>',
    '  ||   || ',
    ' / \\  / \\ ',
  ],
  [
    '  o\\  o\\  ',
    ' /|}=>/|}=',
    '  ||   || ',
    ' / \\  / \\ ',
  ],
];

const BATTLE_RAM_FRAMES = [
  [
    '   /==========\\  ',
    '  /|##%%%%%%##|\\ ',
    '==|==[######]==|>',
    '  (O)--------(O) ',
  ],
  [
    '    /==========\\ ',
    '   /|##%%%%%%##|\\',
    '===|==[######]==>',
    '   (O)--------(O)',
  ],
];

const BATTLE_ROUT_SPRITE = [
  '   o!   o!',
  '  ~|\\  ~|\\',
  '   ||   ||',
  '  //   // ',
];

export function getBattleUnitSprite(squad, clock, actionPose = 'idle') {
  if (squad.routed) {
    return { lines: BATTLE_ROUT_SPRITE, halfW: 5, halfH: 2 };
  }
  const f4 = Math.floor(clock * 8 + squad.slot) % 4;
  const f2 = Math.floor(clock * 5 + squad.slot) % 2;
  if (squad.type === 'horse') {
    if (actionPose === 'charge') {
      return { lines: BATTLE_HORSE_CHARGE, halfW: 9, halfH: 3 };
    }
    return { lines: BATTLE_HORSE_GALLOP[f4], halfW: 9, halfH: 3 };
  }
  if (squad.type === 'ram') {
    const idx = actionPose === 'attack' ? 1 : 0;
    return { lines: BATTLE_RAM_FRAMES[idx], halfW: 8, halfH: 2 };
  }
  if (squad.type === 'spear') {
    return { lines: squad.braced ? BATTLE_SPEAR_WALL : BATTLE_SPEAR_OPEN, halfW: 5, halfH: 2 };
  }
  if (squad.type === 'bow') {
    const idx = actionPose === 'volley' || f2 === 1 ? 1 : 0;
    return { lines: BATTLE_BOW_FRAMES[idx], halfW: 5, halfH: 2 };
  }
  const idx = actionPose === 'attack' || actionPose === 'charge' ? 1 : f2;
  return { lines: BATTLE_GUARD_FRAMES[idx], halfW: 5, halfH: 2 };
}

// ============================================================================
// 4. SIEGE CASTLE CURTAIN WALL, TOWERS & OAK GATEHOUSE (66x30 Arena!)
// ============================================================================
export function renderBattleScenery(buf, battle, clock, pulseWaves, originX = 1, originY = 2) {
  const bMap = battle.map;
  const rows = bMap.grid.length;
  const cols = bMap.grid[0].length;
  const bounds = { x0: originX, y0: originY, x1: originX + cols - 1, y1: originY + rows - 1 };

  // 1. Subtle sky & ridge crest on top 2 rows + organic sparse field turf (clean negative space!)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let ch = bMap.grid[y][x];
      let g = GRADE_GHOST;
      if (y <= 1 && ch === '.') {
        const ridge = Math.sin(x * 0.24) + Math.cos(x * 0.11);
        if (ridge > 0.7) {
          ch = '^';
          g = GRADE_MIST;
        } else if (ridge > 0.1) {
          ch = ':';
          g = GRADE_GHOST;
        } else {
          ch = ' ';
        }
      } else if (ch === '.') {
        const speck = (x * 13 + y * 29) % 17;
        ch = speck === 0 ? '.' : speck === 1 ? ',' : ' ';
        g = GRADE_GHOST;
      } else if (ch === 'n') {
        ch = (x + y) % 2 === 0 ? '%' : '^';
        g = GRADE_MIST;
      } else if (ch === '=') {
        g = GRADE_DIM;
      } else if (ch === '~') {
        ch = (x + y + Math.floor(clock * 3)) % 3 === 0 ? '-' : '~';
        g = GRADE_GHOST;
      } else if (ch === 'T') {
        ch = ' ';
        g = GRADE_DIM;
      } else if (ch === 'L') {
        ch = 'L';
        g = GRADE_LIT;
      } else if (ch === '#' || ch === 'H') {
        g = ch === 'H' ? GRADE_BRIGHT : GRADE_LIT;
      }

      for (const pw of pulseWaves) {
        if (Math.abs(Math.hypot(x - pw.x, y - pw.y) - pw.radius) < 1.1) {
          ch = 'o';
          g = GRADE_BRIGHT;
        }
      }
      buf[originY + y][originX + x] = [ch, g];
    }
  }

  // 2. Render lush 3x2 pine silhouettes on sparse 'T' markers for real woodland silhouette
  for (let y = 2; y < rows - 2; y += 2) {
    for (let x = 2; x < cols - 4; x += 3) {
      if (bMap.grid[y][x] === 'T') {
        stampSprite(buf, originX + x - 1, originY + y - 1, [' /\\ ', '/%%\\', ' || '], {
          baseGrade: GRADE_DIM,
          bounds,
        });
      }
    }
  }

  // 3. In Sieges, draw towering Shaded Stone Citadel Keep, Drum Towers, Torches & Studded Gatehouse!
  if (bMap.kind === 'siege') {
    const wx = bMap.wallX;
    const gy = bMap.gateY;
    const torch = Math.floor(clock * 6) % 2 === 0 ? '(*)' : '(^)';

    // Courtyard interior masonry & inner flags behind the curtain wall
    for (let y = 2; y < rows - 2; y++) {
      for (let x = wx + 2; x < cols - 1; x++) {
        if ((x + y * 2) % 3 === 0) buf[originY + y][originX + x] = ['.', GRADE_GHOST];
      }
    }

    // North & South flanking Drum Towers + Parapet Merlons
    const towerArt = [
      ' _|_|_|_|_ ',
      '|%%%###%%%|',
      '|##[#][#]#|',
      '|#########===',
      '|%%#####%%|',
      '|_________|',
    ];
    stampSprite(buf, originX + wx - 1, originY + 1, towerArt, { baseGrade: GRADE_LIT, bounds });
    stampSprite(buf, originX + wx - 1, originY + rows - 7, towerArt, { baseGrade: GRADE_LIT, bounds });

    // Parapet vertical stone blocks with climbing notch gaps ('L') respected cleanly!
    for (let y = 0; y < rows; y++) {
      const tile = bMap.grid[y][wx];
      if (tile === 'L') {
        buf[originY + y][originX + wx - 1] = ['|', GRADE_LIT];
        buf[originY + y][originX + wx] = ['=', GRADE_BRIGHT];
        buf[originY + y][originX + wx + 1] = ['|', GRADE_LIT];
      } else if (tile === '#') {
        buf[originY + y][originX + wx] = ['#', GRADE_LIT];
        if (wx + 1 < cols) buf[originY + y][originX + wx + 1] = ['%', GRADE_DIM];
      }
    }

    // Braziers blazing atop watchtowers
    stampSprite(buf, originX + wx + 2, originY + 2, [torch], { baseGrade: GRADE_BRIGHT, highlightChars: new Set(['(', ')', '*', '^']), bounds });
    stampSprite(buf, originX + wx + 2, originY + rows - 5, [torch], { baseGrade: GRADE_BRIGHT, highlightChars: new Set(['(', ')', '*', '^']), bounds });

    // Gatehouse Arch & Studded Doors (or Splintered Breach when open!)
    if (!battle.gateBreached) {
      const gateClosed = [
        ' /=====\\ ',
        '|[#|||#]|',
        '|[#|||#]|',
        '|[#|||#]|',
        ' \\=====/ ',
      ];
      stampSprite(buf, originX + wx - 2, originY + gy - 2, gateClosed, {
        baseGrade: GRADE_BRIGHT,
        highlightChars: new Set(['|', '[', ']']),
        bounds,
      });
    } else {
      const gateBroken = [
        ' /.. ..\\ ',
        '|\\  =  /|',
        '   ===   ',
        '|/  =  \\|',
        ' \\.. ../ ',
      ];
      stampSprite(buf, originX + wx - 2, originY + gy - 2, gateBroken, {
        baseGrade: GRADE_DIM,
        highlightChars: new Set(['=']),
        bounds,
      });
    }
  }
}

// ============================================================================
// 5. GREAT HOUSE SHADED LORD PORTRAITS (26 cols x 14 rows) & HOUSE CRESTS
// ============================================================================
export const PORTRAITS = {
  thorne: [
    '        .:::::::::.       ',
    '     .-"%%%#####%%%`-.    ',
    '    /%%#####@@@@#####%\\   ',
    '   |%%###/  ---  \\###%%|  ',
    '   |##%#|  (O) (O)|#%##|  ',
    '   |###%|    /_\\  |%###|  ',
    '   |%%%%\\   /===\\ /%%%%|  ',
    '    \\%%%%|  \\###/ |%%%/   ',
    '     `\\%%#%\\     /%#%/    ',
    '    _.-\\####%%%%%####/-._ ',
    '  /##%%%%\\===[+]===%%%%##\\',
    ' |###%%%%%|  |||  |%%%%###|',
    ' |########|=======|#######|',
    '  `=======`-------`======= ',
  ],
  locke: [
    '        .===*===.         ',
    '     .-"%%%%%%%%%`-.      ',
    '    /%%%/#######\\%%%\\     ',
    '   |%%%/  .   .  \\%%%|    ',
    '   |%%%| (O) (O) |%%%|    ',
    '   |%%%|    _    |%%%|    ',
    '   |%%%|  `---`  |%%%|    ',
    '    \\%%%\\       /%%%/     ',
    '     \\###\\_____/###/      ',
    '    /%%%/==[*]===\\%%%\\    ',
    '   |%%%|  /###\\  |%%%|    ',
    '   |###| |#####| |###|    ',
    '    `==`  `---`  `==`     ',
    '   --- NORTHERN FUR ---   ',
  ],
  brack: [
    '       _.=========._      ',
    '    .-"%%%#######%%%`-.   ',
    '   /%%###/       \\###%%\\  ',
    '   |##%|  (o) (o) |%##|   ',
    '   |##%|    /_    |%##|   ',
    '   |#%#\\  ~~~~~~~ /#%#|   ',
    '   |%%%%\\ ~~~~~~~ /%%%|   ',
    '    \\%%%%\\~~~~~~~/%%%/    ',
    '     `\\%%#%~~~~~%#%%`     ',
    '   _.-`\\##%%===%%##/`-._  ',
    '  /%%###|  [===]  |###%%\\ ',
    ' |%%%%##|===| |===|##%%%%|',
    '  `=====`---` `---`======`',
    '  --- ADMIRALTY SEAL ---  ',
  ],
  vance: [
    '         /\\_____/\\        ',
    '       ./%%#####%%\\.      ',
    '      /##/  \\ /  \\##\\     ',
    '     |##|  (O) (O)|##|    ',
    '     |##|    |    |##|    ',
    '      \\#\\   ---   /#/     ',
    '       \\#\\_______/#/      ',
    '      .-`\\#######/`-.     ',
    '    /%%##|  [V]  |##%%\\   ',
    '   |%%###|===#===|###%%|  ',
    '   |#####|  |||  |#####|  ',
    '    `====`-------`====`   ',
    '   --- STEEL BARONY ---   ',
    '                          ',
  ],
  dray: [
    '   |\\     /\\   /\\     /|  ',
    '   | \\   /%%\\ /%%\\   / |  ',
    '    \\ \\_/####V####\\_/ /   ',
    '     |###/  \\ /  \\###|    ',
    '     |##|  (>) (<)|##|    ',
    '     |##|    ^    |##|    ',
    '      \\##\\ `===\\` /##/     ',
    '       \\###\\   /###/      ',
    '     _.-\\###%%%###/-._    ',
    '   /@@@@%\\==[*]===%@@@@\\  ',
    '  |@@@@%%%| /###\\ |%%@@@@| ',
    '  |#######|/#####\\|######| ',
    '   `======`-------`======` ',
    '  --- ARCHON MALCOR ---   ',
  ],
  council: [
    '         .-------.        ',
    '       ./%%%%%%%%%\\.      ',
    '      /%%/  .....  \\%%\\   ',
    '     |%%/  .:::::.  \\%%|  ',
    '     |%%|  (o) (o)  |%%|  ',
    '     |%%|     |     |%%|  ',
    '     |%%|   `---`   |%%|  ',
    '      \\%\\           /%/   ',
    '    _.-\\%%\\_______/%%/-._ ',
    '   /%%%%\\  [RAVEN] /%%%%\\ ',
    '  |%%%%%%|  `---` |%%%%%%|',
    '  |######|=========|#####|',
    '   `=====`---------`=====`',
    '  -- SPYMASTER VEYN --    ',
  ],
};

export const HOUSE_CRESTS = {
  thorne: [
    '  /\\    /\\  ',
    ' /##\\__/##\\ ',
    '|  O    O  |',
    '|    /\\    |',
    ' \\  `==`  / ',
    '  `\\____/`  ',
  ],
  locke: [
    '  .------.  ',
    ' | | | | | |',
    ' |###**###| ',
    '  \\######/  ',
    '   |====|   ',
    '   `----`   ',
  ],
  brack: [
    '   .-""-.   ',
    '  / (OO) \\  ',
    ' |  \\__/  | ',
    ' /\\ /||\\ /\\ ',
    '/ / |  | \\ \\',
    '` ` `  ` ` `',
  ],
  vance: [
    '  /\\    /\\  ',
    ' / /\\  /\\ \\ ',
    '| /##\\/##\\ |',
    ' \\\\  /\\  // ',
    '   \\/**\\/   ',
    '     \\/     ',
  ],
  dray: [
    ' /\\ /||\\ /\\ ',
    '|##\\\\||//##|',
    ' \\##\\##/##/ ',
    '   |####|   ',
    '  / /  \\ \\  ',
    ' ` `    ` ` ',
  ],
};

export function pickPortraitForDialogue(dialogue) {
  if (!dialogue) return { portrait: PORTRAITS.council, crest: HOUSE_CRESTS.thorne, houseId: 'thorne' };
  const id = String(dialogue.id || '').toLowerCase();
  const sp = String(dialogue.speaker || '').toLowerCase();
  if (id.includes('dray') || sp.includes('dray') || sp.includes('highcrown')) {
    return { portrait: PORTRAITS.dray, crest: HOUSE_CRESTS.dray, houseId: 'dray' };
  }
  if (sp.includes('brack') || sp.includes('saltport') || id.includes('brack')) {
    return { portrait: PORTRAITS.brack, crest: HOUSE_CRESTS.brack, houseId: 'brack' };
  }
  if (sp.includes('vance') || sp.includes('rook') || id.includes('vance')) {
    return { portrait: PORTRAITS.vance, crest: HOUSE_CRESTS.vance, houseId: 'vance' };
  }
  if (sp.includes('locke') || sp.includes('greycrag') || id.includes('locke')) {
    return { portrait: PORTRAITS.locke, crest: HOUSE_CRESTS.locke, houseId: 'locke' };
  }
  if (id.includes('council') || sp.includes('spymaster') || sp.includes('rookery')) {
    return { portrait: PORTRAITS.council, crest: HOUSE_CRESTS.thorne, houseId: 'thorne' };
  }
  return { portrait: PORTRAITS.thorne, crest: HOUSE_CRESTS.thorne, houseId: 'thorne' };
}

export function renderSteedShowcase(buf, clock, bounds, seasonId = 'winter') {
  const xStart = bounds.x0;
  const yStart = bounds.y0;
  const width = bounds.x1 - bounds.x0 + 1;
  const height = bounds.y1 - bounds.y0 + 1;
  const pano = getBakedSteedPanorama(clock, seasonId);
  const px = xStart + Math.max(0, Math.floor((width - pano[0].length) / 2));
  const py = yStart + Math.max(0, Math.floor((height - pano.length) / 2));
  stampCellGrid(buf, px, py, pano, bounds, 0);
}
