"""Monochrome Classic Amber P3 Phosphor palette & strict single-cell ASCII helpers."""

from __future__ import annotations

import unicodedata
from typing import Dict, Tuple

BG_RGB: Tuple[int, int, int] = (7, 4, 1)

GRADE_GHOST = 0
GRADE_MIST = 1
GRADE_DIM = 2
GRADE_LIT = 3
GRADE_BRIGHT = 4

AMBER_RGB: Dict[int, Tuple[int, int, int]] = {
    GRADE_GHOST: (82, 50, 12),
    GRADE_MIST: (148, 91, 24),
    GRADE_DIM: (214, 139, 36),
    GRADE_LIT: (255, 181, 62),
    GRADE_BRIGHT: (255, 238, 184),
}

XTERM_AMBER: Dict[int, int] = {
    GRADE_GHOST: 58,
    GRADE_MIST: 94,
    GRADE_DIM: 136,
    GRADE_LIT: 214,
    GRADE_BRIGHT: 222,
}

GRID_COLS = 104
GRID_ROWS = 38
VIEW_TOP = 1
VIEW_ROWS = 32
VIEW_BOTTOM = VIEW_TOP + VIEW_ROWS
LOG_TOP = 34
LOG_ROWS = 3
HINT_ROW = 37


def sanitize_glyph(ch: str) -> str:
    """Guarantee a single-cell safe printable ASCII glyph (32..126)."""
    if not ch:
        return " "
    c = ch[0]
    code = ord(c)
    if 32 <= code <= 126:
        return c
    eaw = unicodedata.east_asian_width(c)
    if eaw in ("W", "F"):
        return "?"
    return "."


def fit_line(text: str, width: int) -> str:
    """Clamp or right-pad text strictly to exact column width."""
    if width <= 0:
        return ""
    cleaned = "".join(sanitize_glyph(c) for c in text)
    if len(cleaned) > width:
        if width <= 3:
            return cleaned[:width]
        return cleaned[: width - 2] + ".."
    return cleaned.ljust(width)

