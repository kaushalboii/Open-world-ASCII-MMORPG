"""Curses terminal Amber P3 Phosphor CRT renderer & input loop for IRONCROWN."""

from __future__ import annotations

import curses
import time
from typing import Dict

from ironcrown.engine import IroncrownGame
from ironcrown.palette import (
    GRADE_BRIGHT,
    GRADE_DIM,
    GRADE_GHOST,
    GRADE_LIT,
    GRADE_MIST,
    GRID_COLS,
    GRID_ROWS,
    XTERM_AMBER,
    sanitize_glyph,
)


def _setup_amber_pairs() -> Dict[int, int]:
    curses.start_color()
    try:
        curses.use_default_colors()
        bg = -1
    except curses.error:
        bg = curses.COLOR_BLACK

    attrs: Dict[int, int] = {}
    if getattr(curses, "COLORS", 8) >= 256:
        try:
            for idx, grade in enumerate((GRADE_GHOST, GRADE_MIST, GRADE_DIM, GRADE_LIT, GRADE_BRIGHT), start=1):
                curses.init_pair(idx, XTERM_AMBER[grade], 232)
                attrs[grade] = curses.color_pair(idx) | (curses.A_BOLD if grade == GRADE_BRIGHT else 0)
            return attrs
        except curses.error:
            pass

    curses.init_pair(1, curses.COLOR_YELLOW, bg)
    curses.init_pair(2, curses.COLOR_WHITE, bg)
    base = curses.color_pair(1)
    attrs[GRADE_GHOST] = base | curses.A_DIM
    attrs[GRADE_MIST] = base | curses.A_DIM
    attrs[GRADE_DIM] = base
    attrs[GRADE_LIT] = base | curses.A_BOLD
    attrs[GRADE_BRIGHT] = curses.color_pair(2) | curses.A_BOLD
    return attrs


def _map_key(ch: int, screen: str) -> str:
    if ch in (curses.KEY_UP, ord("w"), ord("W")):
        return "move_n"
    if ch in (curses.KEY_DOWN, ord("s"), ord("S")):
        return "move_s"
    if ch in (curses.KEY_LEFT, ord("a"), ord("A")):
        return "move_w"
    if ch in (curses.KEY_RIGHT, ord("d"), ord("D")):
        return "move_e"
    if ch in (10, 13, curses.KEY_ENTER):
        return "confirm"
    if ch in (ord("j"), ord("J")):
        return "strike"
    if ch in (ord("z"), ord("Z")):
        return "strike" if screen == "battle" else "steed"
    if ch in (ord("c"), ord("C")):
        return "strike" if screen == "battle" else "council"
    if ch in (ord("f"), ord("F"), ord("k"), ord("K")):
        return "parry"
    if ch in (ord("b"), ord("B"), ord("x"), ord("X")):
        return "volley"
    if ch in (ord("l"), ord("L")):
        return "pause_battle"
    if ch == ord(" "):
        return "fork"
    if ch in (ord("e"), ord("E")):
        return "interact"
    if ch in (ord("r"), ord("R")):
        return "rest"
    if ch in (ord("t"), ord("T")):
        return "raven"
    if ch in (ord("h"), ord("H"), ord("?")):
        return "help"
    if ch in (9, ord("m"), ord("M")):
        return "ledger"
    if ch in (ord("n"), ord("N")):
        return "new_game"
    if ch == 27:
        return "cancel"
    if ch in (ord("q"), ord("Q")):
        return "quit"
    if ord("1") <= ch <= ord("6"):
        return f"choice_{chr(ch)}"
    return ""


def run_curses(game: IroncrownGame) -> None:
    """Launch IRONCROWN inside a 256-color Amber CRT terminal."""

    def _loop(stdscr) -> None:
        curses.curs_set(0)
        stdscr.nodelay(True)
        stdscr.keypad(True)
        attrs = _setup_amber_pairs()
        last = time.monotonic()

        while True:
            now = time.monotonic()
            dt = min(0.05, now - last)
            last = now

            while True:
                ch = stdscr.getch()
                if ch == -1:
                    break
                action = _map_key(ch, game.screen)
                if action and not game.handle_action(action):
                    return

            game.update(dt)
            buf = game.render_buffer()
            max_y, max_x = stdscr.getmaxyx()
            stdscr.erase()

            if max_y < 16 or max_x < 50:
                msg = f"Enlarge terminal (min 50x16, recommended {GRID_COLS}x{GRID_ROWS})"
                try:
                    stdscr.addstr(0, 0, msg[: max(0, max_x - 1)], attrs[GRADE_LIT])
                except curses.error:
                    pass
            else:
                draw_rows = min(GRID_ROWS, max_y)
                draw_cols = min(GRID_COLS, max_x - 1)
                off_y = max(0, (max_y - draw_rows) // 2)
                off_x = max(0, (max_x - draw_cols) // 2)
                for r in range(draw_rows):
                    row_cells = buf[r]
                    col = 0
                    while col < draw_cols:
                        grade = row_cells[col][1]
                        run_chars = []
                        start_col = col
                        while col < draw_cols and row_cells[col][1] == grade:
                            run_chars.append(sanitize_glyph(row_cells[col][0]))
                            col += 1
                        try:
                            stdscr.addstr(off_y + r, off_x + start_col, "".join(run_chars), attrs.get(grade, attrs[GRADE_DIM]))
                        except curses.error:
                            pass

            stdscr.refresh()
            sleep_for = max(0.0, (1.0 / 30.0) - (time.monotonic() - now))
            if sleep_for > 0:
                time.sleep(sleep_for)

    curses.wrapper(_loop)
    game.save_game()

