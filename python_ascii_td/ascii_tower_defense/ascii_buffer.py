"""Exact character-cell ASCII framebuffer for terminal and pygame-ce renderers."""

from __future__ import annotations

import unicodedata
from typing import Dict, Iterable, List, Optional, Tuple

Color = Tuple[int, int, int]

DEFAULT_FG: Color = (225, 232, 240)
DEFAULT_BG: Color = (10, 12, 18)


def is_wide_glyph(ch: str) -> bool:
    """Return True if a single character occupies two columns in standard terminals."""
    if not ch:
        return False
    return unicodedata.east_asian_width(ch[0]) in ("W", "F")


class AsciiBuffer:
    """2D character-pixel buffer storing discrete glyphs, foreground colors, and background colors."""

    def __init__(self, cols: int = 100, rows: int = 32) -> None:
        self.cols = cols
        self.rows = rows
        self.chars: List[List[str]] = []
        self.fg: List[List[Color]] = []
        self.bg: List[List[Color]] = []
        self.clear()

    def clear(
        self,
        ch: str = " ",
        fg: Color = DEFAULT_FG,
        bg: Color = DEFAULT_BG,
    ) -> None:
        """Reset all cells in the buffer."""
        self.chars = [[ch for _ in range(self.cols)] for _ in range(self.rows)]
        self.fg = [[fg for _ in range(self.cols)] for _ in range(self.rows)]
        self.bg = [[bg for _ in range(self.cols)] for _ in range(self.rows)]

    def set_cell(
        self,
        col: int,
        row: int,
        ch: str,
        fg: Optional[Color] = None,
        bg: Optional[Color] = None,
        transparent_space: bool = False,
    ) -> None:
        """Write one ASCII pixel cell with bounds clipping."""
        if col < 0 or col >= self.cols or row < 0 or row >= self.rows:
            return
        if not ch:
            return
        glyph = ch[0]
        if transparent_space and glyph == " ":
            return
        self.chars[row][col] = glyph
        if fg is not None:
            self.fg[row][col] = fg
        if bg is not None:
            self.bg[row][col] = bg

    def fill_rect(
        self,
        col: int,
        row: int,
        w: int,
        h: int,
        ch: str = " ",
        fg: Optional[Color] = None,
        bg: Optional[Color] = None,
    ) -> None:
        """Fill a rectangular cell region."""
        for r in range(row, row + h):
            for c in range(col, col + w):
                self.set_cell(c, r, ch, fg=fg, bg=bg)

    def draw_text(
        self,
        col: int,
        row: int,
        text: str,
        fg: Optional[Color] = None,
        bg: Optional[Color] = None,
        transparent_space: bool = False,
    ) -> None:
        """Draw a single-line string horizontally across cells."""
        if row < 0 or row >= self.rows:
            return
        cursor = col
        for ch in text:
            if ch == "\n":
                break
            self.set_cell(cursor, row, ch, fg=fg, bg=bg, transparent_space=transparent_space)
            cursor += 1

    def draw_sprite(
        self,
        col: int,
        row: int,
        lines: Iterable[str],
        palette: Optional[Dict[str, Color]] = None,
        default_fg: Color = DEFAULT_FG,
        bg: Optional[Color] = None,
        override_fg: Optional[Color] = None,
        transparent_space: bool = True,
    ) -> None:
        """Blit a multi-line ASCII sprite matrix with per-character coloring."""
        for dy, line in enumerate(lines):
            r = row + dy
            if r < 0 or r >= self.rows:
                continue
            for dx, ch in enumerate(line):
                c = col + dx
                if c < 0 or c >= self.cols:
                    continue
                if transparent_space and ch == " ":
                    continue
                cell_fg = override_fg or (palette.get(ch, default_fg) if palette else default_fg)
                self.set_cell(c, r, ch, fg=cell_fg, bg=bg, transparent_space=False)

    def draw_box(
        self,
        col: int,
        row: int,
        w: int,
        h: int,
        title: str = "",
        border_fg: Color = (90, 120, 155),
        title_fg: Color = (0, 240, 255),
        fill_bg: Optional[Color] = None,
    ) -> None:
        """Draw a double-line Unicode box border with optional centered/left title."""
        if w < 2 or h < 2:
            return
        if fill_bg is not None:
            self.fill_rect(col + 1, row + 1, w - 2, h - 2, " ", bg=fill_bg)

        self.set_cell(col, row, "╔", fg=border_fg, bg=fill_bg)
        self.set_cell(col + w - 1, row, "╗", fg=border_fg, bg=fill_bg)
        self.set_cell(col, row + h - 1, "╚", fg=border_fg, bg=fill_bg)
        self.set_cell(col + w - 1, row + h - 1, "╝", fg=border_fg, bg=fill_bg)

        for dx in range(1, w - 1):
            self.set_cell(col + dx, row, "═", fg=border_fg, bg=fill_bg)
            self.set_cell(col + dx, row + h - 1, "═", fg=border_fg, bg=fill_bg)

        for dy in range(1, h - 1):
            self.set_cell(col, row + dy, "║", fg=border_fg, bg=fill_bg)
            self.set_cell(col + w - 1, row + dy, "║", fg=border_fg, bg=fill_bg)

        if title and w > 6:
            label = f"[ {title[: w - 6]} ]"
            self.draw_text(col + 2, row, label, fg=title_fg, bg=fill_bg)

    def draw_bar(
        self,
        col: int,
        row: int,
        width: int,
        ratio: float,
        fill_char: str = "█",
        empty_char: str = "░",
        fg: Color = (80, 240, 150),
        empty_fg: Color = (60, 70, 88),
        bg: Optional[Color] = None,
    ) -> None:
        """Draw a discrete block progress bar."""
        clamped = max(0.0, min(1.0, ratio))
        filled = int(round(clamped * width))
        for i in range(width):
            ch = fill_char if i < filled else empty_char
            color = fg if i < filled else empty_fg
            self.set_cell(col + i, row, ch, fg=color, bg=bg)

    def to_plain_text(self) -> str:
        """Export the buffer as newline-separated ASCII text (for tests and snapshot inspection)."""
        return "\n".join("".join(row) for row in self.chars)

