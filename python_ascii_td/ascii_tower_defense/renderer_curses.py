"""Zero-dependency stdlib curses renderer for Tactical ASCII Tower Defense."""

from __future__ import annotations

import curses
import os
import time
from typing import Dict, List, Optional, Tuple

from .ascii_buffer import DEFAULT_BG, DEFAULT_FG, AsciiBuffer, Color, is_wide_glyph
from .ui_screens import AppState, render_app


def _rgb_to_ansi8(r: int, g: int, b: int) -> int:
    bright_r = 1 if r >= 110 else 0
    bright_g = 1 if g >= 110 else 0
    bright_b = 1 if b >= 110 else 0
    code = (bright_b << 2) | (bright_g << 1) | bright_r
    return code


def _rgb_to_xterm256(r: int, g: int, b: int) -> int:
    def _step(val: int) -> int:
        if val < 48:
            return 0
        if val < 115:
            return 1
        return min(5, (val - 35) // 40)

    r6 = _step(r)
    g6 = _step(g)
    b6 = _step(b)
    return 16 + 36 * r6 + 6 * g6 + b6


class _ColorRegistry:
    """Cache RGB -> curses color pair indices safely within terminal limits."""

    def __init__(self) -> None:
        self.has_color = False
        self.max_colors = 8
        self.max_pairs = 64
        self._pairs: Dict[Tuple[int, int], int] = {}
        self._next_pair = 1

    def setup(self) -> None:
        if not curses.has_colors():
            return
        try:
            curses.start_color()
            curses.use_default_colors()
            self.has_color = True
            self.max_colors = curses.COLORS
            self.max_pairs = curses.COLOR_PAIRS
        except curses.error:
            self.has_color = False

    def _quantize(self, rgb: Color) -> int:
        r, g, b = rgb
        if self.max_colors >= 256:
            return _rgb_to_xterm256(r, g, b)
        return _rgb_to_ansi8(r, g, b)

    def attr_for(self, fg: Color, bg: Color) -> int:
        if not self.has_color:
            return curses.A_BOLD if (sum(fg) > 540) else curses.A_NORMAL

        fg_idx = self._quantize(fg)
        bg_idx = self._quantize(bg) if self.max_colors >= 256 else _rgb_to_ansi8(*DEFAULT_BG)
        key = (fg_idx, bg_idx)
        pair_id = self._pairs.get(key)
        if pair_id is None:
            if self._next_pair < self.max_pairs:
                pair_id = self._next_pair
                try:
                    curses.init_pair(pair_id, fg_idx, bg_idx)
                    self._pairs[key] = pair_id
                    self._next_pair += 1
                except curses.error:
                    pair_id = 0
            else:
                pair_id = 0
        attr = curses.color_pair(pair_id)
        if max(fg) >= 220:
            attr |= curses.A_BOLD
        return attr


def curses_glyph_for_cell(chars_row: List[str], col: int) -> Tuple[str, bool]:
    """
    Resolve single-cell or width-2 glyph cleanly so wide Unicode chars (e.g. ⚡)
    never misalign right-hand borders in terminal emulators.

    Returns (glyph_to_draw, skip_next_col).
    """
    ch = chars_row[col]
    if not ch:
        return " ", False
    if is_wide_glyph(ch):
        if col + 1 < len(chars_row) and chars_row[col + 1] == " ":
            return ch, True
        return "ϟ", False
    return ch, False


def _normalize_key(code: int) -> Optional[str]:
    if code == -1:
        return None
    if code == curses.KEY_UP:
        return "up"
    if code == curses.KEY_DOWN:
        return "down"
    if code == curses.KEY_LEFT:
        return "left"
    if code == curses.KEY_RIGHT:
        return "right"
    if code in (10, 13, curses.KEY_ENTER):
        return "enter"
    if code == 32:
        return "space"
    if code == 27:
        return "esc"
    if code == curses.KEY_F2:
        return "f2"
    if code in (curses.KEY_BACKSPACE, 127, 8):
        return "backspace"
    if code == curses.KEY_DC:
        return "delete"
    if 33 <= code < 127:
        return chr(code)
    return None


def _draw_buffer_to_curses(
    stdscr: "curses._CursesWindow",
    buf: AsciiBuffer,
    registry: _ColorRegistry,
    shake_c: int,
    shake_r: int,
) -> None:
    term_h, term_w = stdscr.getmaxyx()
    if term_h < buf.rows or term_w < buf.cols:
        stdscr.erase()
        msg1 = f"Terminal {term_w}x{term_h} < required {buf.cols}x{buf.rows}."
        msg2 = "Please resize terminal or run with: python3 main.py --pygame"
        try:
            if term_h >= 2:
                stdscr.addnstr(max(0, term_h // 2 - 1), max(0, (term_w - len(msg1)) // 2), msg1, max(1, term_w - 1))
                stdscr.addnstr(max(0, term_h // 2), max(0, (term_w - len(msg2)) // 2), msg2, max(1, term_w - 1))
        except curses.error:
            pass
        stdscr.refresh()
        return

    off_x = (term_w - buf.cols) // 2
    off_y = (term_h - buf.rows) // 2

    stdscr.erase()
    for r in range(buf.rows):
        row_chars = buf.chars[r]
        skip_next = False
        for c in range(buf.cols):
            if skip_next:
                skip_next = False
                continue

            src_c, src_r = c, r
            # Apply camera shake strictly inside battlefield (cols 0..74, rows 3..26)
            if 0 <= c < 75 and 3 <= r < 27 and (shake_c != 0 or shake_r != 0):
                sc = c - shake_c
                sr = r - shake_r
                if 0 <= sc < 75 and 3 <= sr < 27:
                    src_c, src_r = sc, sr
                else:
                    ch, fg, bg = " ", DEFAULT_FG, DEFAULT_BG
                    skip = False
                    src_c = -1
            if src_c >= 0:
                ch, skip = curses_glyph_for_cell(buf.chars[src_r], src_c)
                fg = buf.fg[src_r][src_c]
                bg = buf.bg[src_r][src_c]

            skip_next = skip
            sy = off_y + r
            sx = off_x + c
            if sy == term_h - 1 and sx >= term_w - 1:
                continue
            attr = registry.attr_for(fg, bg)
            try:
                stdscr.addstr(sy, sx, ch, attr)
            except curses.error:
                pass
    stdscr.refresh()


def _curses_main(stdscr: "curses._CursesWindow", app: AppState) -> None:
    try:
        curses.curs_set(0)
    except curses.error:
        pass
    stdscr.nodelay(True)
    stdscr.keypad(True)
    try:
        curses.mousemask(curses.ALL_MOUSE_EVENTS)
    except curses.error:
        pass

    registry = _ColorRegistry()
    registry.setup()
    buf = AsciiBuffer(cols=100, rows=32)

    last_t = time.monotonic()
    while not app.should_quit:
        now = time.monotonic()
        dt = min(now - last_t, 0.05)
        last_t = now

        # Drain queued input events per frame
        while True:
            try:
                ch = stdscr.getch()
            except curses.error:
                break
            if ch == -1:
                break
            if ch == curses.KEY_MOUSE:
                try:
                    _mid, mx, my, _mz, bstate = curses.getmouse()
                    if bstate & (curses.BUTTON1_CLICKED | curses.BUTTON1_PRESSED | curses.BUTTON1_DOUBLE_CLICKED):
                        term_h, term_w = stdscr.getmaxyx()
                        off_x = max(0, (term_w - buf.cols) // 2)
                        off_y = max(0, (term_h - buf.rows) // 2)
                        app.handle_cell_click(mx - off_x, my - off_y)
                except curses.error:
                    pass
                continue
            key_name = _normalize_key(ch)
            if key_name:
                app.handle_key(key_name)

        app.update(dt)
        render_app(buf, app)
        ox, oy = app.visual_shake_offset()
        _draw_buffer_to_curses(stdscr, buf, registry, int(round(ox)), int(round(oy)))
        time.sleep(0.025)


def run_curses_app(app: AppState) -> None:
    """Launch the interactive terminal curses loop."""
    os.environ.setdefault("ESCDELAY", "25")
    curses.wrapper(_curses_main, app)

