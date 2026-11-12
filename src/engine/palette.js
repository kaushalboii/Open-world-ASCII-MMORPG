/**
 * Classic 585nm Amber P3 Phosphor palette, viewport geometry, and glyph hygiene.
 */

export const BG_HEX = '#070401';

export const GRADE_GHOST = 0;
export const GRADE_MIST = 1;
export const GRADE_DIM = 2;
export const GRADE_LIT = 3;
export const GRADE_BRIGHT = 4;

export const AMBER_HEX = {
  [GRADE_GHOST]: '#52320c',
  [GRADE_MIST]: '#945b18',
  [GRADE_DIM]: '#d68b24',
  [GRADE_LIT]: '#ffb53e',
  [GRADE_BRIGHT]: '#ffeeb8',
};

export const PHOSPHOR_THEMES = [
  {
    id: 'amber',
    label: 'P3 AMBER 585nm',
    bg: '#070401',
    glowRgba: 'rgba(255, 194, 84, 0.75)',
    haloCore: 'rgba(255, 182, 64, 0.16)',
    haloMid: 'rgba(255, 145, 32, 0.06)',
    grades: AMBER_HEX,
  },
  {
    id: 'verdigris',
    label: 'P1 VERDIGRIS 525nm',
    bg: '#030805',
    glowRgba: 'rgba(128, 255, 178, 0.72)',
    haloCore: 'rgba(92, 240, 152, 0.15)',
    haloMid: 'rgba(42, 185, 108, 0.06)',
    grades: {
      [GRADE_GHOST]: '#143c24',
      [GRADE_MIST]: '#296e46',
      [GRADE_DIM]: '#46ad72',
      [GRADE_LIT]: '#7ce6a4',
      [GRADE_BRIGHT]: '#d8ffea',
    },
  },
  {
    id: 'ivory',
    label: 'P4 PARCHMENT BONE',
    bg: '#080706',
    glowRgba: 'rgba(255, 244, 214, 0.70)',
    haloCore: 'rgba(255, 240, 204, 0.15)',
    haloMid: 'rgba(218, 198, 158, 0.05)',
    grades: {
      [GRADE_GHOST]: '#3c372d',
      [GRADE_MIST]: '#726956',
      [GRADE_DIM]: '#aea187',
      [GRADE_LIT]: '#e4d5b6',
      [GRADE_BRIGHT]: '#fff9ec',
    },
  },
];

export const TONE_AMBER = 0;
export const TONE_CRIMSON = 1;
export const TONE_STEEL = 2;
export const TONE_HORSE = 3;
export const TONE_WARHORSE = 4;
export const TONE_FOREST = 5;
export const TONE_RIVER = 6;
export const TONE_SNOW = 7;
export const TONE_STONE = 8;
export const TONE_SKIN = 9;
export const TONE_FIRE = 10;
export const TONE_VIOLET = 11;
export const TONE_PARCHMENT = 12;
export const TONE_WOOD = 13;

export const FULL_COLOR_BG = '#06070a';

export const TONE_PALETTES = [
  {
    id: 'amber',
    glowRgba: 'rgba(255, 194, 84, 0.75)',
    haloCore: 'rgba(255, 182, 64, 0.16)',
    haloMid: 'rgba(255, 145, 32, 0.06)',
    grades: AMBER_HEX,
  },
  {
    id: 'crimson',
    glowRgba: 'rgba(255, 92, 88, 0.72)',
    haloCore: 'rgba(242, 64, 60, 0.16)',
    haloMid: 'rgba(180, 28, 32, 0.06)',
    grades: {
      [GRADE_GHOST]: '#4d1317',
      [GRADE_MIST]: '#8d2228',
      [GRADE_DIM]: '#cc3b3b',
      [GRADE_LIT]: '#f25f58',
      [GRADE_BRIGHT]: '#ffbab0',
    },
  },
  {
    id: 'steel',
    glowRgba: 'rgba(195, 222, 255, 0.72)',
    haloCore: 'rgba(176, 208, 248, 0.15)',
    haloMid: 'rgba(110, 148, 196, 0.06)',
    grades: {
      [GRADE_GHOST]: '#2c3644',
      [GRADE_MIST]: '#556780',
      [GRADE_DIM]: '#879cb6',
      [GRADE_LIT]: '#c2d0e2',
      [GRADE_BRIGHT]: '#f0f6ff',
    },
  },
  {
    id: 'horse',
    glowRgba: 'rgba(235, 148, 86, 0.70)',
    haloCore: 'rgba(218, 130, 70, 0.14)',
    haloMid: 'rgba(164, 90, 42, 0.05)',
    grades: {
      [GRADE_GHOST]: '#402210',
      [GRADE_MIST]: '#743f1f',
      [GRADE_DIM]: '#aa5f2e',
      [GRADE_LIT]: '#dc884c',
      [GRADE_BRIGHT]: '#ffd3a4',
    },
  },
  {
    id: 'warhorse',
    glowRgba: 'rgba(172, 188, 218, 0.65)',
    haloCore: 'rgba(148, 166, 198, 0.13)',
    haloMid: 'rgba(96, 110, 138, 0.05)',
    grades: {
      [GRADE_GHOST]: '#2a2e38',
      [GRADE_MIST]: '#4a5262',
      [GRADE_DIM]: '#737f94',
      [GRADE_LIT]: '#a8b5cc',
      [GRADE_BRIGHT]: '#dfe8f8',
    },
  },
  {
    id: 'forest',
    glowRgba: 'rgba(110, 232, 132, 0.70)',
    haloCore: 'rgba(84, 210, 110, 0.14)',
    haloMid: 'rgba(46, 148, 72, 0.05)',
    grades: {
      [GRADE_GHOST]: '#163c22',
      [GRADE_MIST]: '#296c3c',
      [GRADE_DIM]: '#429e5a',
      [GRADE_LIT]: '#6ed280',
      [GRADE_BRIGHT]: '#bef8c8',
    },
  },
  {
    id: 'river',
    glowRgba: 'rgba(112, 198, 255, 0.72)',
    haloCore: 'rgba(92, 178, 246, 0.15)',
    haloMid: 'rgba(46, 122, 196, 0.06)',
    grades: {
      [GRADE_GHOST]: '#173256',
      [GRADE_MIST]: '#285c94',
      [GRADE_DIM]: '#428ac8',
      [GRADE_LIT]: '#72bef6',
      [GRADE_BRIGHT]: '#cceeff',
    },
  },
  {
    id: 'snow',
    glowRgba: 'rgba(220, 240, 255, 0.76)',
    haloCore: 'rgba(210, 234, 255, 0.16)',
    haloMid: 'rgba(155, 192, 224, 0.06)',
    grades: {
      [GRADE_GHOST]: '#3b4856',
      [GRADE_MIST]: '#65788e',
      [GRADE_DIM]: '#98acc2',
      [GRADE_LIT]: '#d0e2f4',
      [GRADE_BRIGHT]: '#f6fbff',
    },
  },
  {
    id: 'stone',
    glowRgba: 'rgba(208, 196, 180, 0.65)',
    haloCore: 'rgba(186, 174, 158, 0.14)',
    haloMid: 'rgba(130, 120, 108, 0.05)',
    grades: {
      [GRADE_GHOST]: '#35312c',
      [GRADE_MIST]: '#5e574f',
      [GRADE_DIM]: '#8c8276',
      [GRADE_LIT]: '#bcb0a2',
      [GRADE_BRIGHT]: '#ece2d4',
    },
  },
  {
    id: 'skin',
    glowRgba: 'rgba(248, 184, 146, 0.68)',
    haloCore: 'rgba(228, 160, 122, 0.14)',
    haloMid: 'rgba(176, 114, 82, 0.05)',
    grades: {
      [GRADE_GHOST]: '#4a2c1d',
      [GRADE_MIST]: '#804e36',
      [GRADE_DIM]: '#b87654',
      [GRADE_LIT]: '#e4a07d',
      [GRADE_BRIGHT]: '#ffdcc4',
    },
  },
  {
    id: 'fire',
    glowRgba: 'rgba(255, 144, 52, 0.80)',
    haloCore: 'rgba(255, 128, 36, 0.18)',
    haloMid: 'rgba(232, 80, 16, 0.07)',
    grades: {
      [GRADE_GHOST]: '#5e1c06',
      [GRADE_MIST]: '#ac380c',
      [GRADE_DIM]: '#ee6216',
      [GRADE_LIT]: '#ffa434',
      [GRADE_BRIGHT]: '#fff09e',
    },
  },
  {
    id: 'violet',
    glowRgba: 'rgba(206, 134, 248, 0.72)',
    haloCore: 'rgba(188, 114, 232, 0.15)',
    haloMid: 'rgba(136, 70, 182, 0.06)',
    grades: {
      [GRADE_GHOST]: '#391e50',
      [GRADE_MIST]: '#68368e',
      [GRADE_DIM]: '#9a54c4',
      [GRADE_LIT]: '#c982f0',
      [GRADE_BRIGHT]: '#f2ceff',
    },
  },
  {
    id: 'parchment',
    glowRgba: 'rgba(244, 224, 182, 0.68)',
    haloCore: 'rgba(226, 204, 160, 0.14)',
    haloMid: 'rgba(176, 152, 114, 0.05)',
    grades: {
      [GRADE_GHOST]: '#463c2a',
      [GRADE_MIST]: '#7c6c50',
      [GRADE_DIM]: '#b49e78',
      [GRADE_LIT]: '#e2cca2',
      [GRADE_BRIGHT]: '#fff6e0',
    },
  },
  {
    id: 'wood',
    glowRgba: 'rgba(226, 158, 88, 0.68)',
    haloCore: 'rgba(206, 138, 70, 0.14)',
    haloMid: 'rgba(154, 96, 40, 0.05)',
    grades: {
      [GRADE_GHOST]: '#3e240d',
      [GRADE_MIST]: '#704319',
      [GRADE_DIM]: '#a2642a',
      [GRADE_LIT]: '#d28e4a',
      [GRADE_BRIGHT]: '#f8c88c',
    },
  },
];

export const GRID_COLS = 104;
export const GRID_ROWS = 38;
export const VIEW_TOP = 1;
export const VIEW_ROWS = 32;
export const VIEW_BOTTOM = VIEW_TOP + VIEW_ROWS;
export const LOG_TOP = 34;
export const LOG_ROWS = 3;
export const HINT_ROW = 37;

export function sanitizeGlyph(ch) {
  if (!ch) return ' ';
  const code = ch.charCodeAt(0);
  return code >= 32 && code <= 126 ? ch[0] : '.';
}

export function fitLine(text, width) {
  if (width <= 0) return '';
  let cleaned = '';
  for (let i = 0; i < text.length; i++) {
    cleaned += sanitizeGlyph(text[i]);
  }
  if (cleaned.length > width) {
    if (width <= 3) return cleaned.slice(0, width);
    return `${cleaned.slice(0, width - 2)}..`;
  }
  return cleaned.padEnd(width, ' ');
}

