"""Monochrome Classic Amber P3 Phosphor palette & strict single-cell ASCII helpers."""

from __future__ import annotations

import unicodedata
from typing import Dict, Tuple

BG_RGB: Tuple[int, int, int] = (7, 4, 1)
FULL_COLOR_BG_RGB: Tuple[int, int, int] = (6, 7, 10)

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

TONE_AMBER = 0
TONE_CRIMSON = 1
TONE_STEEL = 2
TONE_HORSE = 3
TONE_WARHORSE = 4
TONE_FOREST = 5
TONE_RIVER = 6
TONE_SNOW = 7
TONE_STONE = 8
TONE_SKIN = 9
TONE_FIRE = 10
TONE_VIOLET = 11
TONE_PARCHMENT = 12
TONE_WOOD = 13

TONE_RGB: Dict[int, Dict[int, Tuple[int, int, int]]] = {
    TONE_AMBER: AMBER_RGB,
    TONE_CRIMSON: {
        GRADE_GHOST: (77, 19, 23),
        GRADE_MIST: (141, 34, 40),
        GRADE_DIM: (204, 59, 59),
        GRADE_LIT: (242, 95, 88),
        GRADE_BRIGHT: (255, 186, 176),
    },
    TONE_STEEL: {
        GRADE_GHOST: (44, 54, 68),
        GRADE_MIST: (85, 103, 128),
        GRADE_DIM: (135, 156, 182),
        GRADE_LIT: (194, 208, 226),
        GRADE_BRIGHT: (240, 246, 255),
    },
    TONE_HORSE: {
        GRADE_GHOST: (64, 34, 16),
        GRADE_MIST: (116, 63, 31),
        GRADE_DIM: (170, 95, 46),
        GRADE_LIT: (220, 136, 76),
        GRADE_BRIGHT: (255, 211, 164),
    },
    TONE_WARHORSE: {
        GRADE_GHOST: (42, 46, 56),
        GRADE_MIST: (74, 82, 98),
        GRADE_DIM: (115, 127, 148),
        GRADE_LIT: (168, 181, 204),
        GRADE_BRIGHT: (223, 232, 248),
    },
    TONE_FOREST: {
        GRADE_GHOST: (22, 60, 34),
        GRADE_MIST: (41, 108, 60),
        GRADE_DIM: (66, 158, 90),
        GRADE_LIT: (110, 210, 128),
        GRADE_BRIGHT: (190, 248, 200),
    },
    TONE_RIVER: {
        GRADE_GHOST: (23, 50, 86),
        GRADE_MIST: (40, 92, 148),
        GRADE_DIM: (66, 138, 200),
        GRADE_LIT: (114, 190, 246),
        GRADE_BRIGHT: (204, 238, 255),
    },
    TONE_SNOW: {
        GRADE_GHOST: (59, 72, 86),
        GRADE_MIST: (101, 120, 142),
        GRADE_DIM: (152, 172, 194),
        GRADE_LIT: (208, 226, 244),
        GRADE_BRIGHT: (246, 251, 255),
    },
    TONE_STONE: {
        GRADE_GHOST: (53, 49, 44),
        GRADE_MIST: (94, 87, 79),
        GRADE_DIM: (140, 130, 118),
        GRADE_LIT: (188, 176, 162),
        GRADE_BRIGHT: (236, 226, 212),
    },
    TONE_SKIN: {
        GRADE_GHOST: (74, 44, 29),
        GRADE_MIST: (128, 78, 54),
        GRADE_DIM: (184, 118, 84),
        GRADE_LIT: (228, 160, 125),
        GRADE_BRIGHT: (255, 220, 196),
    },
    TONE_FIRE: {
        GRADE_GHOST: (94, 28, 6),
        GRADE_MIST: (172, 56, 12),
        GRADE_DIM: (238, 98, 22),
        GRADE_LIT: (255, 164, 52),
        GRADE_BRIGHT: (255, 240, 158),
    },
    TONE_VIOLET: {
        GRADE_GHOST: (57, 30, 80),
        GRADE_MIST: (104, 54, 142),
        GRADE_DIM: (154, 84, 196),
        GRADE_LIT: (201, 130, 240),
        GRADE_BRIGHT: (242, 206, 255),
    },
    TONE_PARCHMENT: {
        GRADE_GHOST: (70, 60, 42),
        GRADE_MIST: (124, 108, 80),
        GRADE_DIM: (180, 158, 120),
        GRADE_LIT: (226, 204, 162),
        GRADE_BRIGHT: (255, 246, 224),
    },
    TONE_WOOD: {
        GRADE_GHOST: (62, 36, 13),
        GRADE_MIST: (112, 67, 25),
        GRADE_DIM: (162, 100, 42),
        GRADE_LIT: (210, 142, 74),
        GRADE_BRIGHT: (248, 200, 140),
    },
}

XTERM_TONES: Dict[int, Dict[int, int]] = {
    TONE_AMBER: XTERM_AMBER,
    TONE_CRIMSON: {GRADE_GHOST: 52, GRADE_MIST: 88, GRADE_DIM: 160, GRADE_LIT: 203, GRADE_BRIGHT: 217},
    TONE_STEEL: {GRADE_GHOST: 237, GRADE_MIST: 60, GRADE_DIM: 103, GRADE_LIT: 152, GRADE_BRIGHT: 195},
    TONE_HORSE: {GRADE_GHOST: 52, GRADE_MIST: 94, GRADE_DIM: 130, GRADE_LIT: 173, GRADE_BRIGHT: 223},
    TONE_WARHORSE: {GRADE_GHOST: 236, GRADE_MIST: 59, GRADE_DIM: 102, GRADE_LIT: 146, GRADE_BRIGHT: 189},
    TONE_FOREST: {GRADE_GHOST: 22, GRADE_MIST: 28, GRADE_DIM: 71, GRADE_LIT: 78, GRADE_BRIGHT: 157},
    TONE_RIVER: {GRADE_GHOST: 17, GRADE_MIST: 25, GRADE_DIM: 68, GRADE_LIT: 75, GRADE_BRIGHT: 159},
    TONE_SNOW: {GRADE_GHOST: 238, GRADE_MIST: 60, GRADE_DIM: 145, GRADE_LIT: 189, GRADE_BRIGHT: 231},
    TONE_STONE: {GRADE_GHOST: 236, GRADE_MIST: 240, GRADE_DIM: 101, GRADE_LIT: 144, GRADE_BRIGHT: 254},
    TONE_SKIN: {GRADE_GHOST: 52, GRADE_MIST: 95, GRADE_DIM: 137, GRADE_LIT: 174, GRADE_BRIGHT: 224},
    TONE_FIRE: {GRADE_GHOST: 52, GRADE_MIST: 130, GRADE_DIM: 202, GRADE_LIT: 214, GRADE_BRIGHT: 229},
    TONE_VIOLET: {GRADE_GHOST: 53, GRADE_MIST: 90, GRADE_DIM: 134, GRADE_LIT: 177, GRADE_BRIGHT: 225},
    TONE_PARCHMENT: {GRADE_GHOST: 58, GRADE_MIST: 101, GRADE_DIM: 144, GRADE_LIT: 187, GRADE_BRIGHT: 230},
    TONE_WOOD: {GRADE_GHOST: 52, GRADE_MIST: 94, GRADE_DIM: 130, GRADE_LIT: 173, GRADE_BRIGHT: 222},
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

