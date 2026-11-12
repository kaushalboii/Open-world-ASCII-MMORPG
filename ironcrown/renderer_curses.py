"""Curses terminal Multi-Color Medieval & Amber P3 Phosphor CRT renderer for IRONCROWN."""

from __future__ import annotations

import curses
import time
from typing import Dict, Tuple

from ironcrown.engine import IroncrownGame
from ironcrown.palette import (
    GRADE_BRIGHT,
    GRADE_DIM,
    GRADE_GHOST,
    GRADE_LIT,
    GRADE_MIST,
    GRID_COLS,
    GRID_ROWS,
    TONE_AMBER,
    TONE_CRIMSON,
    TONE_FIRE,
    TONE_FOREST,
    TONE_HORSE,
    TONE_PARCHMENT,
    TONE_RIVER,
    TONE_SKIN,
    TONE_SNOW,
    TONE_STEEL,
    TONE_STONE,
    TONE_VIOLET,
    TONE_WARHORSE,
    TONE_WOOD,
    XTERM_AMBER,
    XTERM_TONES,
    sanitize_glyph,
)


def _setup_color_pairs() -> Tuple[Dict[int, int], Dict[Tuple[int, int], int]]:
    curses.start_color()
    try:
        curses.use_default_colors()
        bg = -1
    except curses.error:
        bg = curses.COLOR_BLACK

    amber_attrs: Dict[int, int] = {}
    tone_attrs: Dict[Tuple[int, int], int] = {}
    max_colors = getattr(curses, "COLORS", 8)
    max_pairs = getattr(curses, "COLOR_PAIRS", 64)

    if max_colors >= 256 and max_pairs >= 72:
        try:
            pair_id = 1
            for tone, grade_map in XTERM_TONES.items():
                for grade in (GRADE_GHOST, GRADE_MIST, GRADE_DIM, GRADE_LIT, GRADE_BRIGHT):
                    curses.init_pair(pair_id, grade_map[grade], 232)
                    attr = curses.color_pair(pair_id) | (curses.A_BOLD if grade == GRADE_BRIGHT else 0)
                    tone_attrs[(tone, grade)] = attr
                    if tone == TONE_AMBER:
                        amber_attrs[grade] = attr
                    pair_id += 1
            return amber_attrs, tone_attrs
        except curses.error:
            amber_attrs.clear()
            tone_attrs.clear()

    if max_colors >= 256:
        try:
            for idx, grade in enumerate((GRADE_GHOST, GRADE_MIST, GRADE_DIM, GRADE_LIT, GRADE_BRIGHT), start=1):
                curses.init_pair(idx, XTERM_AMBER[grade], 232)
                amber_attrs[grade] = curses.color_pair(idx) | (curses.A_BOLD if grade == GRADE_BRIGHT else 0)
            for tone in XTERM_TONES:
                for g in range(5):
                    tone_attrs[(tone, g)] = amber_attrs[g]
            return amber_attrs, tone_attrs
        except curses.error:
            pass

    base_colors = [
        ("yellow", curses.COLOR_YELLOW),
        ("red", curses.COLOR_RED),
        ("green", curses.COLOR_GREEN),
        ("cyan", curses.COLOR_CYAN),
        ("white", curses.COLOR_WHITE),
        ("magenta", curses.COLOR_MAGENTA),
    ]
    base_pairs: Dict[str, int] = {}
    for idx, (cname, cval) in enumerate(base_colors, start=1):
        if idx >= max_pairs:
            break
        try:
            curses.init_pair(idx, cval, bg)
            base_pairs[cname] = curses.color_pair(idx)
        except curses.error:
            pass

    yb = base_pairs.get("yellow", 0)
    wb = base_pairs.get("white", yb)
    amber_attrs[GRADE_GHOST] = yb | curses.A_DIM
    amber_attrs[GRADE_MIST] = yb | curses.A_DIM
    amber_attrs[GRADE_DIM] = yb
    amber_attrs[GRADE_LIT] = yb | curses.A_BOLD
    amber_attrs[GRADE_BRIGHT] = wb | curses.A_BOLD

    tone_to_base = {
        TONE_AMBER: "yellow",
        TONE_CRIMSON: "red",
        TONE_STEEL: "cyan",
        TONE_HORSE: "yellow",
        TONE_WARHORSE: "white",
        TONE_FOREST: "green",
        TONE_RIVER: "cyan",
        TONE_SNOW: "white",
        TONE_STONE: "white",
        TONE_SKIN: "red",
        TONE_FIRE: "red",
        TONE_VIOLET: "magenta",
        TONE_PARCHMENT: "white",
        TONE_WOOD: "yellow",
    }
    for tone, cname in tone_to_base.items():
        bp = base_pairs.get(cname, yb)
        for grade in (GRADE_GHOST, GRADE_MIST, GRADE_DIM, GRADE_LIT, GRADE_BRIGHT):
            mod = curses.A_DIM if grade <= GRADE_MIST else (curses.A_BOLD if grade >= GRADE_LIT else 0)
            tone_attrs[(tone, grade)] = bp | mod
    return amber_attrs, tone_attrs


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
    if ch in (ord("o"), ord("O")):
        return "toggle_color"
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
    """Launch IRONCROWN inside a 256-color Multi-Color / Amber CRT terminal."""

    def _loop(stdscr) -> None:
        curses.curs_set(0)
        stdscr.nodelay(True)
        stdscr.keypad(True)
        amber_attrs, tone_attrs = _setup_color_pairs()
        color_enabled = True
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
                if action == "toggle_color":
                    color_enabled = not color_enabled
                elif action and not game.handle_action(action):
                    return

            game.update(dt)
            buf = game.render_buffer()
            tone_buf = getattr(game, "tone_buffer", None)
            max_y, max_x = stdscr.getmaxyx()
            stdscr.erase()

            if max_y < 16 or max_x < 50:
                msg = f"Enlarge terminal (min 50x16, recommended {GRID_COLS}x{GRID_ROWS})"
                try:
                    stdscr.addstr(0, 0, msg[: max(0, max_x - 1)], amber_attrs[GRADE_LIT])
                except curses.error:
                    pass
            else:
                draw_rows = min(GRID_ROWS, max_y)
                draw_cols = min(GRID_COLS, max_x - 1)
                off_y = max(0, (max_y - draw_rows) // 2)
                off_x = max(0, (max_x - draw_cols) // 2)
                for r in range(draw_rows):
                    row_cells = buf[r]
                    row_tones = tone_buf[r] if tone_buf is not None else None
                    col = 0
                    while col < draw_cols:
                        grade = row_cells[col][1]
                        tone = row_tones[col] if (color_enabled and row_tones is not None) else TONE_AMBER
                        run_chars = []
                        start_col = col
                        while col < draw_cols and row_cells[col][1] == grade and (
                            (row_tones[col] if (color_enabled and row_tones is not None) else TONE_AMBER) == tone
                        ):
                            run_chars.append(sanitize_glyph(row_cells[col][0]))
                            col += 1
                        attr = tone_attrs.get((tone, grade), amber_attrs.get(grade, amber_attrs[GRADE_DIM])) if color_enabled else amber_attrs.get(grade, amber_attrs[GRADE_DIM])
                        try:
                            stdscr.addstr(off_y + r, off_x + start_col, "".join(run_chars), attr)
                        except curses.error:
                            pass

            stdscr.refresh()
            sleep_for = max(0.0, (1.0 / 30.0) - (time.monotonic() - now))
            if sleep_for > 0:
                time.sleep(sleep_for)

    curses.wrapper(_loop)
    game.save_game()

