"""Monochrome Classic Amber P3 Phosphor palette & glyph safety helpers."""

from __future__ import annotations

import unicodedata
from typing import Dict, Tuple

# Classic 585nm Amber P3 Phosphor luminance ramp on warm obsidian bed
BG_RGB: Tuple[int, int, int] = (7, 4, 1)

GRADE_GHOST = 0   # Unlit twilight silhouette / distant fog
GRADE_MIST = 1    # Fogged reeds / surf margins / ruins
GRADE_DIM = 2     # Midground masonry, trees, narrative prose
GRADE_LIT = 3     # Warm lantern light, blades, hero, key structures
GRADE_BRIGHT = 4  # Sparks, lightning crest, parries, bell flash, beacon

AMBER_RGB: Dict[int, Tuple[int, int, int]] = {
    GRADE_GHOST: (82, 50, 12),
    GRADE_MIST: (148, 91, 24),
    GRADE_DIM: (214, 139, 36),
    GRADE_LIT: (255, 181, 62),
    GRADE_BRIGHT: (255, 238, 184),
}

AMBER_HEX: Dict[int, str] = {
    grade: f"#{r:02x}{g:02x}{b:02x}"
    for grade, (r, g, b) in AMBER_RGB.items()
}

# 256-color xterm approximations from warm dark brown -> bright cream-amber
XTERM_AMBER: Dict[int, int] = {
    GRADE_GHOST: 58,
    GRADE_MIST: 94,
    GRADE_DIM: 136,
    GRADE_LIT: 214,
    GRADE_BRIGHT: 222,
}

# Master viewport dimensions shared identically between Python CRT and Web Canvas
GRID_COLS = 104
GRID_ROWS = 38
VIEW_TOP = 1
VIEW_ROWS = 32
VIEW_BOTTOM = VIEW_TOP + VIEW_ROWS  # 33
LOG_TOP = 34
LOG_ROWS = 3
HINT_ROW = 37


def sanitize_glyph(ch: str) -> str:
    """Guarantee a single-cell safe printable ASCII glyph (no width-2 jitter)."""
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
    """Clamp or right-pad prose cleanly to exact column width."""
    if width <= 0:
        return ""
    cleaned = "".join(sanitize_glyph(c) for c in text)
    if len(cleaned) > width:
        if width <= 3:
            return cleaned[:width]
        return cleaned[: width - 2] + ".."
    return cleaned.ljust(width)
