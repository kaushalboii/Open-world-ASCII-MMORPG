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

