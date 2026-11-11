/**
 * Classic 585nm Amber P3 Phosphor palette, viewport geometry, and glyph hygiene.
 */

export const BG_HEX = '#0a0602';

export const GRADE_GHOST = 0;
export const GRADE_MIST = 1;
export const GRADE_DIM = 2;
export const GRADE_LIT = 3;
export const GRADE_BRIGHT = 4;

export const AMBER_HEX = {
  [GRADE_GHOST]: '#3f2608',
  [GRADE_MIST]: '#744710',
  [GRADE_DIM]: '#bf7a1b',
  [GRADE_LIT]: '#f8aa34',
  [GRADE_BRIGHT]: '#ffe39b',
};

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
