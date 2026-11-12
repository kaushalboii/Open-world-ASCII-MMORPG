"""
Analytical 3D Relief Heightfield Halftone ASCII Engine & Siege Scenery for IRONCROWN (Python CLI/Pygame).
Mirrors src/war/halftoneArt.js & src/war/asciiArt.js in exact printable single-cell ASCII (32..126)
with 11x20 pixel-aspect compensation onto the 104x38 Dual Amber CRT grid.
"""

import math
from typing import Dict, List, Optional, Sequence, Tuple

from .palette import (
    GRADE_BRIGHT,
    GRADE_DIM,
    GRADE_GHOST,
    GRADE_LIT,
    GRADE_MIST,
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
    sanitize_glyph,
)
from .world_data import BATTLE_H, BATTLE_W

RAMP = " .,:;-=+*#%@"
BODY_RAMP = "=+*#%@"
CHAR_ASPECT = 1.82

CellGrid = List[List[Tuple[str, int]]]
ToneCellGrid = List[List[Tuple[str, int, int]]]
ToneGrid = List[List[int]]

MIRROR_CHAR = {
    "/": "\\",
    "\\": "/",
    "(": ")",
    ")": "(",
    "<": ">",
    ">": "<",
    "[": "]",
    "]": "[",
    "{": "}",
    "}": "{",
}

HOUSE_CRESTS: Dict[str, List[str]] = {
    "thorne": [
        "   /\\    /\\   ",
        "  /##\\__/##\\  ",
        " |  O    O  | ",
        " |    /\\    | ",
        "  \\  `==`  /  ",
        "   `\\____/`   ",
    ],
    "dray": [
        "  \\  _||_  /  ",
        "  =\\/####\\/=  ",
        "   |  ><  |   ",
        "   | /\\/\\ |   ",
        "   \\======/   ",
        "    `\\||/`    ",
    ],
    "locke": [
        "  .========.  ",
        "  | []  [] |  ",
        "  |========|  ",
        "  |  [##]  |  ",
        "  |___  ___|  ",
        "     \\__/     ",
    ],
    "brack": [
        "   _.====._   ",
        "  /  /\\/\\  \\  ",
        " |  |~~~~|  | ",
        "  \\  \\__/  /  ",
        "   `======`   ",
        "    ~~  ~~    ",
    ],
    "vance": [
        "    _ /\\ _    ",
        "  //##\\/##\\\\  ",
        " ((  O  O  )) ",
        "  \\\\  \\/  //  ",
        "    `\\||/`    ",
        "      /\\      ",
    ],
}


def _clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else (hi if v > hi else v)


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _smax(a: float, b: float, k: float) -> float:
    if a < -10:
        return b
    if b < -10:
        return a
    h = _clamp(0.5 + (0.5 * (a - b)) / k, 0.0, 1.0)
    return b * (1.0 - h) + a * h + k * h * (1.0 - h)


def _seg_height(px: float, py: float, ax: float, ay: float, bx: float, by: float, ra: float, rb: float, depth_bias: float = 0.0, swell: float = 1.0) -> float:
    pax, pay = px - ax, py - ay
    bax, bay = bx - ax, by - ay
    len2 = bax * bax + bay * bay
    t = _clamp((pax * bax + pay * bay) / len2, 0.0, 1.0) if len2 > 1e-6 else 0.0
    dx, dy = px - (ax + bax * t), py - (ay + bay * t)
    dist2 = dx * dx + dy * dy
    r = _lerp(ra, rb, t)
    r2 = r * r
    if dist2 >= r2:
        return -99.0
    return depth_bias + math.sqrt(max(0.0, r2 - dist2)) * swell


def _box_height(px: float, py: float, cx: float, cy: float, hw: float, hh: float, depth_bias: float = 0.0, bevel: float = 0.08) -> float:
    dx, dy = abs(px - cx) - hw, abs(py - cy) - hh
    if dx > 0 or dy > 0:
        return -99.0
    edge = min(-dx, -dy)
    return depth_bias + min(bevel, edge * 0.9 + 0.02)


def _add_seg(cur: float, px: float, py: float, ax: float, ay: float, bx: float, by: float, ra: float, rb: float, k: float = 0.04, depth_bias: float = 0.0, swell: float = 1.0) -> float:
    z = _seg_height(px, py, ax, ay, bx, by, ra, rb, depth_bias, swell)
    if z < -10:
        return cur
    if cur < -10:
        return z
    return _smax(cur, z, k)


def _eval_horse_relief(px: float, py: float, phase: float, charging: bool = True, include_rider: bool = True, pad: float = 0.0, min_r: float = 0.055) -> Tuple[float, int, bool, int]:
    p = phase * math.pi * 2.0
    bounce = math.sin(p) * 0.032
    pitch = math.cos(p) * 0.04
    head_nod = math.sin(p + 0.5) * 0.03
    y = py - bounce

    z_back = -99.0
    back_tone = TONE_WARHORSE
    z_horse = -99.0
    z_armor = -99.0
    armor_tone = TONE_STEEL
    z_steel = -99.0
    steel_tone = TONE_STEEL

    # 1. Barrel chest & haunches
    z_horse = _add_seg(z_horse, px, y, -0.60, 0.06 - pitch * 0.25, 0.34, 0.04 + pitch * 0.25, 0.26 + pad, 0.31 + pad, 0.06, 0.0, 1.18)
    z_horse = _add_seg(z_horse, px, y, 0.28, -0.02 + pitch * 0.25, 0.56, 0.16 + pitch * 0.3, 0.30 + pad, 0.24 + pad, 0.07, 0.05, 1.22)
    z_horse = _add_seg(z_horse, px, y, -0.84, 0.04 - pitch * 0.25, -0.46, 0.16 - pitch * 0.2, 0.26 + pad, 0.30 + pad, 0.07, 0.03, 1.18)

    z_caparison = _seg_height(px, y, -0.42, 0.22, 0.16, 0.22, 0.15 + pad * 0.5, 0.15 + pad * 0.5, 0.11)
    if z_caparison > z_armor:
        z_armor, armor_tone = z_caparison, TONE_CRIMSON
    z_barding = _seg_height(px, y, 0.44, 0.16, 0.58, -0.04, 0.14 + pad * 0.5, 0.12 + pad * 0.5, 0.12)
    if z_barding > z_armor:
        z_armor, armor_tone = z_barding, TONE_STEEL

    # 2. Arched neck & flowing mane
    neck_bx, neck_by = 0.46, 0.22 + pitch * 0.25
    neck_mx, neck_my = 0.72, 0.68 + head_nod * 0.4
    poll_x, poll_y = 0.90, 0.98 + head_nod
    z_horse = _add_seg(z_horse, px, y, neck_bx, neck_by, neck_mx, neck_my, 0.25 + pad, 0.175 + pad, 0.05, 0.04)
    z_horse = _add_seg(z_horse, px, y, neck_mx, neck_my, poll_x, poll_y, 0.175 + pad, 0.14 + pad, 0.04, 0.05)

    for m in range(4):
        f = 0.26 + m * 0.22
        mx = _lerp(neck_bx, poll_x, f) - 0.06
        my = _lerp(neck_by, poll_y, f) + 0.06
        flap = math.sin(p * 2.0 + m * 1.1) * 0.04
        z_back = _add_seg(z_back, px, y, mx, my, mx - 0.22, my + 0.04 + flap, max(min_r, 0.075 + pad * 0.4), max(min_r * 0.7, 0.035), 0.03, -0.05)

    # 3. Head, chamfron & pricked ears
    nose_x = 1.26 if charging else 1.18
    nose_y = (0.58 if charging else 0.50) + head_nod
    z_horse = _add_seg(z_horse, px, y, poll_x, poll_y + 0.01, nose_x, nose_y + 0.01, 0.15 + pad, 0.075 + pad, 0.04, 0.07)
    z_horse = _add_seg(z_horse, px, y, poll_x + 0.01, poll_y - 0.07, poll_x + 0.09, poll_y - 0.15, 0.14 + pad, 0.10 + pad, 0.04, 0.09)
    z_horse = _add_seg(z_horse, px, y, poll_x + 0.07, poll_y - 0.15, nose_x - 0.04, nose_y - 0.04, 0.088 + pad, 0.056 + pad, 0.03, 0.05)
    z_steel = _add_seg(z_steel, px, y, poll_x + 0.05, poll_y + 0.04, nose_x - 0.08, nose_y + 0.04, max(min_r, 0.062), max(min_r * 0.85, 0.045), 0.02, 0.17)
    z_horse = _add_seg(z_horse, px, y, poll_x - 0.01, poll_y + 0.08, poll_x + 0.07, poll_y + 0.34, max(min_r, 0.058 + pad * 0.5), max(min_r * 0.75, 0.028), 0.02, 0.07)
    z_back = _add_seg(z_back, px, y, poll_x - 0.10, poll_y + 0.08, poll_x - 0.03, poll_y + 0.31, max(min_r, 0.052 + pad * 0.4), max(min_r * 0.7, 0.026), 0.02, -0.04)

    eye_catch = math.hypot(px - (poll_x + 0.13), y - (poll_y - 0.02)) < max(min_r * 1.1, 0.062)

    # 4. Tail
    tw1 = math.sin(p + 0.5) * 0.09
    tw2 = math.cos(p - 0.4) * 0.11
    z_back = _add_seg(z_back, px, y, -0.86, 0.15 - pitch * 0.25, -1.26, 0.08 + tw1, 0.11 + pad * 0.6, max(min_r, 0.08), 0.04, -0.04)
    z_back = _add_seg(z_back, px, y, -1.24, 0.08 + tw1, -1.64, -0.14 + tw2, max(min_r, 0.085), max(min_r * 0.8, 0.045), 0.03, -0.06)

    # 5. Four scissor-phased 3-bone gallop legs
    leg_defs = (
        (0.42, -0.08 + pitch * 0.25, 0.0, 0.40, 0.72, True, False),
        (0.35, -0.08 + pitch * 0.25, 2.25, 0.10, 0.68, True, True),
        (-0.62, -0.07 - pitch * 0.2, 3.05, -0.40, 0.70, False, False),
        (-0.68, -0.07 - pitch * 0.2, 5.20, -0.10, 0.66, False, True),
    )
    for hip_x, hip_y, ph_off, bias_ang, swing_amp, is_front, into_back in leg_defs:
        a = p + ph_off
        u_ang = math.sin(a) * swing_amp + bias_ang
        knee_bend = (0.24 + max(0.0, math.sin(a + 1.0)) * 1.00) if is_front else (-0.26 - max(0.0, math.sin(a - 0.7)) * 0.88)
        l_ang = u_ang + knee_bend
        kx = hip_x + math.sin(u_ang) * 0.42
        ky = hip_y - math.cos(u_ang) * 0.42
        fx = kx + math.sin(l_ang) * 0.41
        fy = ky - math.cos(l_ang) * 0.41
        bias = -0.05 if into_back else 0.11
        shin_r = max(min_r * 1.1, 0.068 + pad * 0.8)
        hoof_r = max(min_r * 1.2, 0.075 + pad * 0.8)
        target = z_back if into_back else z_horse
        target = _add_seg(target, px, y, hip_x, hip_y, kx, ky, (0.135 if is_front else 0.17) + pad, max(min_r * 1.25, 0.082 + pad), 0.04, bias)
        target = _add_seg(target, px, y, kx, ky, fx, fy, max(min_r * 1.2, 0.078 + pad), shin_r, 0.02, bias)
        target = _add_seg(target, px, y, fx - 0.02, fy, fx + 0.08, fy - 0.04, hoof_r, max(min_r, 0.062 + pad), 0.015, bias)
        if into_back:
            z_back = target
        else:
            z_horse = target

    # 6. Upright Knight + Helm + Flowing Cloak + Lance/Standard
    if include_rider:
        lean = 0.12 if charging else 0.06
        r_hip_x, r_hip_y = -0.14, 0.36
        r_sh_x, r_sh_y = r_hip_x + lean, 0.86
        z_rider = -99.0
        z_rider = _add_seg(z_rider, px, y, r_hip_x, r_hip_y, r_sh_x, r_sh_y, 0.17 + pad, 0.21 + pad, 0.04, 0.14)
        z_rider = max(
            z_rider,
            _seg_height(px, y, r_hip_x + 0.03, r_hip_y, r_hip_x + 0.16, 0.02, 0.115 + pad, 0.085 + pad, 0.18),
            _seg_height(px, y, r_hip_x + 0.16, 0.02, r_hip_x + 0.06, -0.24, 0.085 + pad, 0.068 + pad, 0.18),
            _seg_height(px, y, r_sh_x - 0.02, r_sh_y - 0.05, r_sh_x + 0.18, r_sh_y - 0.14, 0.13 + pad, 0.12 + pad, 0.21),
        )
        if z_rider > z_armor:
            z_armor, armor_tone = z_rider, TONE_STEEL

        z_steel = _add_seg(z_steel, px, y, r_sh_x + 0.01, r_sh_y + 0.14, r_sh_x + 0.04, r_sh_y + 0.32, 0.145 + pad, 0.135 + pad, 0.02, 0.21)
        plume = math.sin(p * 2.0) * 0.04
        z_plume = _seg_height(px, y, r_sh_x, r_sh_y + 0.34, r_sh_x - 0.28, r_sh_y + 0.30 + plume, max(min_r, 0.065), max(min_r * 0.75, 0.025), -0.02)
        if z_plume > z_back:
            z_back, back_tone = z_plume, TONE_CRIMSON

        cw1 = math.sin(p + 0.8) * 0.10
        cw2 = math.cos(p - 0.4) * 0.12
        z_c1 = _seg_height(px, y, r_sh_x - 0.08, r_sh_y + 0.02, -0.74, 0.68 + cw1, 0.125 + pad, 0.165 + pad, -0.04)
        z_c2 = _seg_height(px, y, -0.72, 0.68 + cw1, -1.34, 0.50 + cw2, 0.155 + pad, max(min_r, 0.065), -0.06)
        z_cloak = _smax(z_c1, z_c2, 0.04)
        if z_cloak > z_back:
            z_back, back_tone = z_cloak, TONE_CRIMSON

        tip_x = 0.24 if charging else 0.40
        tip_y = 1.48
        hand_x, hand_y = r_sh_x + 0.08, r_sh_y - 0.14
        z_shaft = _seg_height(px, y, hand_x, hand_y, tip_x, tip_y, max(min_r * 0.85, 0.045), max(min_r * 0.8, 0.036), 0.24)
        if z_shaft > z_steel:
            z_steel = z_shaft
            steel_tone = TONE_STEEL if py > 1.24 else TONE_WOOD
        if charging:
            z_couch = _seg_height(px, y, 0.72, 0.19, 1.72, 0.23, max(min_r * 0.62, 0.028), max(min_r * 0.45, 0.018), 0.24)
            if z_couch > z_steel:
                z_steel = z_couch
                steel_tone = TONE_STEEL if px > 1.38 else TONE_WOOD
        b_flap = math.sin(p * 2.0 + 0.4) * 0.05
        bx0 = _lerp(hand_x, tip_x, 0.78)
        by0 = _lerp(hand_y, tip_y, 0.78)
        z_banner = _seg_height(px, y, bx0, by0, bx0 - 0.56, by0 - 0.05 + b_flap, max(min_r * 1.15, 0.095), max(min_r * 0.75, 0.030), 0.16)
        if z_banner > z_armor:
            z_armor, armor_tone = z_banner, TONE_CRIMSON

    z = -99.0
    layer = 0
    tone = TONE_HORSE
    if z_back > z:
        z, layer, tone = z_back, 1, back_tone
    if z_horse > z:
        z, layer, tone = z_horse, 2, TONE_HORSE
    if z_armor > z:
        z, layer, tone = z_armor, 3, armor_tone
    if z_steel > z:
        z, layer, tone = z_steel, 4, steel_tone
    if eye_catch:
        tone = TONE_AMBER
    return z, layer, eye_catch, tone


def render_3d_horse_canvas(
    cols: int,
    rows: int,
    phase: float,
    *,
    scale: float = 1.0,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    with_sky_backdrop: bool = True,
    backdrop_scroll: float = 0.0,
    season_id: str = "winter",
    charging: bool = True,
    include_rider: bool = True,
) -> ToneCellGrid:
    out: ToneCellGrid = [[(" ", GRADE_GHOST, TONE_AMBER) for _ in range(cols)] for _ in range(rows)]
    half_w, half_h = cols * 0.5, rows * 0.52
    unit_per_col = max(3.65 / (cols * scale), 2.55 / (rows * CHAR_ASPECT * scale))
    eps = unit_per_col * 0.80
    pad = 0.036 if cols < 28 else (0.020 if cols < 48 else 0.0)
    min_r = unit_per_col * CHAR_ASPECT * 0.58
    kx, ky, kz = 0.52, 0.68, 0.52

    ground_y = int(rows * 0.88)
    keep_max_col = int(cols * 0.16)

    for r in range(rows):
        wy = (half_h - r) * CHAR_ASPECT * unit_per_col + offset_y
        for c in range(cols):
            wx = (c - half_w) * unit_per_col + offset_x
            cz, layer, eye_catch, cell_tone = _eval_horse_relief(wx, wy, phase, charging, include_rider, pad, min_r)

            if cz > -10:
                raw_r = _eval_horse_relief(wx + eps, wy, phase, charging, include_rider, pad, min_r)[0]
                raw_l = _eval_horse_relief(wx - eps, wy, phase, charging, include_rider, pad, min_r)[0]
                raw_u = _eval_horse_relief(wx, wy + eps, phase, charging, include_rider, pad, min_r)[0]
                raw_d = _eval_horse_relief(wx, wy - eps, phase, charging, include_rider, pad, min_r)[0]
                z_r = raw_r if raw_r > -10 else max(-0.08, cz - 0.14)
                z_l = raw_l if raw_l > -10 else max(-0.08, cz - 0.14)
                z_u = raw_u if raw_u > -10 else max(-0.08, cz - 0.14)
                z_d = raw_d if raw_d > -10 else max(-0.08, cz - 0.14)

                nx = -(z_r - z_l) / (2.0 * eps)
                ny = -(z_u - z_d) / (2.0 * eps)
                nz = 1.0
                n_len = math.hypot(nx, ny, nz) or 1.0
                ux, uy, uz = nx / n_len, ny / n_len, nz / n_len

                diff = max(0.0, ux * kx + uy * ky + uz * kz)
                rim = pow(_clamp(1.0 - uz, 0.0, 1.0), 1.3)
                lum = 0.30 + diff * 0.50 + rim * 0.22
                if layer == 1:
                    lum *= 0.52
                elif layer == 3:
                    lum = _clamp(lum * 1.12 + 0.08, 0.0, 1.0)
                elif layer == 4:
                    lum = _clamp(0.76 + diff * 0.24, 0.0, 1.0)
                if eye_catch:
                    lum = 0.99
                lum = _clamp(lum, 0.06, 0.99)
                idx = int(_clamp(round(lum * (len(BODY_RAMP) - 1)), 0, len(BODY_RAMP) - 1))
                ch = BODY_RAMP[idx]
                if layer == 1:
                    grade = GRADE_DIM if lum > 0.44 else GRADE_MIST
                else:
                    grade = GRADE_BRIGHT if lum > 0.84 else (GRADE_LIT if lum > 0.50 else GRADE_DIM)
                out[r][c] = (ch, grade, cell_tone)
            elif with_sky_backdrop:
                rx = c + backdrop_scroll * 0.45
                ridge = rows * 0.68 - math.sin(rx * 0.07) * 1.6 - math.cos(rx * 0.17) * 0.8
                in_left_keep = 2 <= c <= keep_max_col and int(rows * 0.46) <= r < ground_y
                keep_crown = in_left_keep and (r > int(rows * 0.50) or c % 2 == 0)

                if r >= ground_y:
                    if wx > -1.0 and wx < 1.0 and wy < -0.5:
                        out[r][c] = ("_", GRADE_GHOST, TONE_STONE)
                    else:
                        road_mix = ((c + int(backdrop_scroll * 1.5) + r * 3) % 6) == 0
                        out[r][c] = ("=" if road_mix else "-", GRADE_GHOST, TONE_PARCHMENT)
                elif keep_crown:
                    torch = c == int(keep_max_col * 0.55) and r == int(rows * 0.49)
                    out[r][c] = ("*", GRADE_BRIGHT, TONE_FIRE) if torch else (":" if c % 3 == 0 else ";", GRADE_MIST, TONE_STONE)
                elif int(ridge) <= r < ground_y:
                    is_crest = r == int(ridge)
                    out[r][c] = ("." if (c + r) % 7 == 0 else " ", GRADE_GHOST, TONE_SNOW if is_crest else TONE_STONE)
                else:
                    high_sky = max(0.0, 1.0 - r / (rows * 0.58))
                    c_a = math.sin(rx * 0.055 + r * 0.30) * 0.5 + 0.5
                    c_b = math.cos(rx * 0.11 - r * 0.40) * 0.5 + 0.5
                    sky = _clamp((c_a * 0.16 + c_b * 0.12) * high_sky, 0.0, 0.34)
                    snow = season_id == "winter" and ((c * 19 + int(backdrop_scroll * 1.3) + r * 31) % 79 == 0)
                    if snow:
                        out[r][c] = ("*", GRADE_DIM, TONE_SNOW)
                    elif sky > 0.04:
                        idx = int(_clamp(math.floor(sky * (len(RAMP) - 1)), 1, 5))
                        out[r][c] = (RAMP[idx], GRADE_GHOST, TONE_RIVER)
    return out


def _eval_infantry_relief(px: float, py: float, u_type: str, variant: int = 0) -> Tuple[float, int, int]:
    z = -99.0
    layer = 2
    tone = TONE_WOOD if u_type == "ram" else TONE_CRIMSON
    if u_type == "ram":
        x = px - (0.18 if variant == 1 else 0.0)
        roof_l = _seg_height(x, py, -1.15, 0.15, 0.0, 0.62, 0.12, 0.12, 0.05)
        roof_r = _seg_height(x, py, 0.0, 0.62, 1.15, 0.15, 0.12, 0.12, 0.05)
        timber = _box_height(x, py, 0.0, 0.02, 1.05, 0.25, 0.0, 0.14)
        z = _smax(timber, _smax(roof_l, roof_r, 0.04), 0.04)
        ram_head = _seg_height(x, py, -0.5, -0.05, 1.48, -0.05, 0.14, 0.19, 0.16)
        if ram_head > z:
            z, layer, tone = ram_head, 4, TONE_STEEL
        for wx in (-0.72, 0.72):
            v = 0.24 * 0.24 - ((x - wx) ** 2 + (py + 0.38) ** 2)
            if v > 0:
                wh = math.sqrt(v) + 0.20
                if wh > z:
                    z, layer, tone = wh, 3, TONE_STONE
        return z, layer, tone

    offsets = (-0.46, 0.18) if u_type == "spear" else (-0.42, 0.28)
    for ox in offsets:
        ux, uy = px - ox, py
        head_z = _seg_height(ux, uy, 0.0, 0.50, 0.0, 0.56, 0.16, 0.14, 0.05)
        body_z = _smax(
            _seg_height(ux, uy, 0.0, 0.38, 0.0, -0.04, 0.22, 0.16, 0.02),
            max(
                _seg_height(ux, uy, -0.09, -0.04, -0.15, -0.55, 0.105, 0.08, 0.0),
                _seg_height(ux, uy, 0.09, -0.04, 0.15, -0.55, 0.105, 0.08, 0.0),
            ),
            0.03,
        )
        if body_z > z:
            z, layer, tone = body_z, 2, TONE_CRIMSON
        if head_z > z:
            z, layer, tone = head_z, 3, TONE_STEEL
        if u_type == "spear":
            br = variant == 1
            sh = _box_height(ux, uy, 0.20 if br else 0.14, 0.14, 0.17, 0.35, 0.18, 0.14)
            if sh > z:
                z, layer, tone = sh, 3, TONE_STEEL
            pike = _seg_height(ux, uy, -0.16, 0.05, 0.80, 0.44 if br else 0.74, 0.055, 0.035, 0.22)
            if pike > z:
                z, layer = pike, 4
                tone = TONE_STEEL if (ux > 0.35 or uy > 0.48) else TONE_WOOD
        elif u_type == "bow":
            draw = 0.08 if variant == 1 else 0.0
            b_t = _seg_height(ux, uy, 0.20 - draw, 0.58, 0.36, 0.16, 0.055, 0.050, 0.18)
            b_b = _seg_height(ux, uy, 0.36, 0.16, 0.20 - draw, -0.24, 0.050, 0.055, 0.18)
            arr = _seg_height(ux, uy, 0.02, 0.18, 0.58, 0.18, 0.040, 0.025, 0.20)
            w = max(b_t, b_b, arr)
            if w > z:
                z, layer = w, 4
                tone = TONE_STEEL if (arr >= max(b_t, b_b) and ux > 0.32) else TONE_WOOD
        else:
            sw = variant == 1
            sh = _seg_height(ux, uy, -0.12, 0.04, -0.14, 0.34, 0.16, 0.16, 0.16)
            if sh > z:
                z, layer, tone = sh, 3, TONE_CRIMSON
            blade = _seg_height(ux, uy, 0.12, 0.20, 0.64 if sw else 0.36, 0.22 if sw else 0.70, 0.06, 0.032, 0.22)
            if blade > z:
                z, layer, tone = blade, 4, TONE_STEEL
    return z, layer, tone


def render_3d_battle_unit(u_type: str, variant: int = 0, cols: int = 15, rows: int = 6) -> ToneCellGrid:
    out: ToneCellGrid = [[(" ", GRADE_GHOST, TONE_CRIMSON) for _ in range(cols)] for _ in range(rows)]
    half_w, half_h = cols * 0.5, rows * 0.5
    unit_per_col = (3.2 if u_type == "ram" else 2.35) / cols
    eps = unit_per_col * 0.8
    y_squash = 0.78 if u_type == "ram" else 0.86
    kx, ky, kz = 0.5, 0.72, 0.48

    for r in range(rows):
        wy = (half_h - r) * CHAR_ASPECT * unit_per_col * y_squash
        for c in range(cols):
            wx = (c - half_w) * unit_per_col
            cz, layer, cell_tone = _eval_infantry_relief(wx, wy, u_type, variant)
            if cz > -10:
                r_r = _eval_infantry_relief(wx + eps, wy, u_type, variant)[0]
                r_l = _eval_infantry_relief(wx - eps, wy, u_type, variant)[0]
                r_u = _eval_infantry_relief(wx, wy + eps, u_type, variant)[0]
                r_d = _eval_infantry_relief(wx, wy - eps, u_type, variant)[0]
                z_r = r_r if r_r > -10 else max(-0.06, cz - 0.12)
                z_l = r_l if r_l > -10 else max(-0.06, cz - 0.12)
                z_u = r_u if r_u > -10 else max(-0.06, cz - 0.12)
                z_d = r_d if r_d > -10 else max(-0.06, cz - 0.12)
                nx, ny, nz = -(z_r - z_l) / (2 * eps), -(z_u - z_d) / (2 * eps), 1.0
                ln = math.hypot(nx, ny, nz) or 1.0
                diff = max(0.0, (nx * kx + ny * ky + nz * kz) / ln)
                lum = _clamp(0.28 + diff * 0.56, 0.22, 0.98)
                if layer == 3:
                    lum = _clamp(lum * 1.1 + 0.08, 0.0, 1.0)
                elif layer == 4:
                    lum = _clamp(0.78 + diff * 0.22, 0.0, 1.0)
                idx = int(_clamp(round(lum * (len(BODY_RAMP) - 1)), 0, len(BODY_RAMP) - 1))
                out[r][c] = (BODY_RAMP[idx], GRADE_BRIGHT if lum > 0.84 else (GRADE_LIT if lum > 0.48 else GRADE_DIM), cell_tone)

    if u_type == "spear" and rows >= 6 and cols >= 15:
        pikes = ((2, 9, "="), (2, 10, "="), (2, 11, ">"), (3, 8, "-"), (3, 12, ">")) if variant == 1 else ((0, 6, "^"), (0, 10, "^"), (1, 6, "|"), (1, 10, "|"), (2, 7, "/"), (2, 11, "/"))
        for rr, cc, ch in pikes:
            out[rr][cc] = (ch, GRADE_BRIGHT, TONE_STEEL)
    elif u_type == "bow" and rows >= 6 and cols >= 15:
        arcs = (
            ((1, 6, ")", TONE_WOOD), (2, 7, "|", TONE_WOOD), (2, 8, ">", TONE_STEEL), (3, 6, ")", TONE_WOOD), (1, 11, ")", TONE_WOOD), (2, 12, ">", TONE_STEEL), (3, 11, ")", TONE_WOOD))
            if variant == 1
            else ((1, 6, ")", TONE_WOOD), (2, 6, "|", TONE_WOOD), (3, 6, ")", TONE_WOOD), (1, 11, ")", TONE_WOOD), (2, 11, "|", TONE_WOOD), (3, 11, ")", TONE_WOOD))
        )
        for rr, cc, ch, tn in arcs:
            out[rr][cc] = (ch, GRADE_BRIGHT, tn)
    elif u_type == "guard" and rows >= 6 and cols >= 15:
        blades = ((2, 7, "-"), (2, 8, ">"), (2, 12, "="), (2, 13, ">"), (3, 5, "["), (3, 10, "[")) if variant == 1 else ((0, 7, "/"), (0, 12, "/"), (1, 6, "/"), (1, 11, "/"), (2, 5, "|"), (2, 10, "|"))
        for rr, cc, ch in blades:
            out[rr][cc] = (ch, GRADE_BRIGHT, TONE_STEEL)
    elif u_type == "ram" and rows >= 6 and cols >= 18:
        out[3][14] = ("=", GRADE_BRIGHT, TONE_STEEL)
        out[3][15] = (">", GRADE_BRIGHT, TONE_STEEL)
    return out


_PORTRAIT_CLOAK_TONE: Dict[str, int] = {
    "thorne": TONE_CRIMSON,
    "dray": TONE_VIOLET,
    "vance": TONE_FOREST,
    "brack": TONE_CRIMSON,
    "locke": TONE_STEEL,
    "council": TONE_STONE,
}


def _eval_lord_bust_relief(px: float, py: float, trait: str = "thorne") -> Tuple[float, bool, int]:
    z_face = -99.0
    z_cloak = -99.0
    z_beard = -99.0
    z_headgear = -99.0
    headgear_tone = TONE_AMBER

    z_face = _add_seg(z_face, px, py, 0.0, 0.28, 0.0, 0.02, 0.37, 0.35, 0.06, 0.05)
    z_face = _add_seg(z_face, px, py, 0.0, 0.04, 0.0, -0.26, 0.33, 0.21, 0.06, 0.06)
    z_face = _add_seg(z_face, px, py, -0.22, 0.20, 0.22, 0.20, 0.085, 0.085, 0.03, 0.16)
    z_face = _add_seg(z_face, px, py, 0.0, 0.21, 0.0, -0.04, 0.062, 0.055, 0.02, 0.20)
    z_face = _add_seg(z_face, px, py, 0.0, -0.22, 0.0, -0.52, 0.21, 0.24, 0.05, -0.02)
    z_cloak = _add_seg(z_cloak, px, py, -0.82, -0.68, 0.82, -0.68, 0.34, 0.34, 0.08, 0.0)

    if trait == "dray":
        z_headgear = _add_seg(z_headgear, px, py, -0.34, 0.42, 0.34, 0.42, 0.10, 0.10, 0.03, 0.14)
        z_headgear = _add_seg(z_headgear, px, py, -0.26, 0.44, -0.54, 0.90, 0.085, 0.030, 0.03, 0.12)
        z_headgear = _add_seg(z_headgear, px, py, 0.26, 0.44, 0.54, 0.90, 0.085, 0.030, 0.03, 0.12)
        headgear_tone = TONE_AMBER
    elif trait == "council":
        z_headgear = _add_seg(z_headgear, px, py, 0.0, 0.72, -0.40, 0.06, 0.19, 0.16, 0.06, 0.09)
        z_headgear = _add_seg(z_headgear, px, py, 0.0, 0.72, 0.40, 0.06, 0.19, 0.16, 0.06, 0.09)
        headgear_tone = TONE_STONE
    elif trait == "vance":
        z_headgear = _add_seg(z_headgear, px, py, 0.0, 0.42, 0.0, 0.78, 0.27, 0.10, 0.05, 0.11)
        headgear_tone = TONE_AMBER if py > 0.52 else TONE_WARHORSE
    elif trait == "locke":
        z_headgear = _add_seg(z_headgear, px, py, -0.35, 0.35, 0.35, 0.35, 0.08, 0.08, 0.02, 0.14)
        z_cloak = _add_seg(z_cloak, px, py, -0.56, -0.42, 0.56, -0.42, 0.25, 0.25, 0.06, 0.09)
        headgear_tone = TONE_STEEL
    elif trait == "brack":
        z_beard = _add_seg(z_beard, px, py, 0.0, -0.10, 0.0, -0.54, 0.25, 0.15, 0.04, 0.11)
    else:
        z_cloak = _add_seg(z_cloak, px, py, -0.58, -0.40, 0.58, -0.40, 0.26, 0.26, 0.06, 0.08)
        z_beard = _add_seg(z_beard, px, py, 0.0, -0.12, 0.0, -0.42, 0.21, 0.13, 0.04, 0.10)

    z = z_face
    tone = TONE_SKIN
    if z_beard > z:
        z, tone = z_beard, TONE_WOOD
    if z_headgear > z:
        z, tone = z_headgear, headgear_tone
    if z_cloak > z:
        z, tone = z_cloak, _PORTRAIT_CLOAK_TONE.get(trait, TONE_CRIMSON)

    eye_d = min(math.hypot(px + 0.14, py - 0.12), math.hypot(px - 0.14, py - 0.12))
    if eye_d < 0.09:
        z -= (0.09 - eye_d) * 2.2
    is_eye = eye_d < 0.058
    if is_eye:
        tone = TONE_SNOW
    return z, is_eye, tone


def render_3d_lord_portrait(trait: str, cols: int = 28, rows: int = 14) -> ToneCellGrid:
    out: ToneCellGrid = [[(" ", GRADE_GHOST, TONE_AMBER) for _ in range(cols)] for _ in range(rows)]
    unit_per_col = max(1.75 / cols, 1.75 / (rows * CHAR_ASPECT))
    eps = unit_per_col * 0.8
    kx, ky, kz = -0.62, 0.50, 0.60

    for r in range(rows):
        wy = (rows * 0.52 - r) * CHAR_ASPECT * unit_per_col
        for c in range(cols):
            wx = (c - cols * 0.5) * unit_per_col
            cz, is_eye, cell_tone = _eval_lord_bust_relief(wx, wy, trait)
            if cz > -10:
                r_r = _eval_lord_bust_relief(wx + eps, wy, trait)[0]
                r_l = _eval_lord_bust_relief(wx - eps, wy, trait)[0]
                r_u = _eval_lord_bust_relief(wx, wy + eps, trait)[0]
                r_d = _eval_lord_bust_relief(wx, wy - eps, trait)[0]
                z_r = r_r if r_r > -10 else max(-0.06, cz - 0.12)
                z_l = r_l if r_l > -10 else max(-0.06, cz - 0.12)
                z_u = r_u if r_u > -10 else max(-0.06, cz - 0.12)
                z_d = r_d if r_d > -10 else max(-0.06, cz - 0.12)
                nx, ny, nz = -(z_r - z_l) / (2 * eps), -(z_u - z_d) / (2 * eps), 1.0
                ln = math.hypot(nx, ny, nz) or 1.0
                diff = max(0.0, (nx * kx + ny * ky + nz * kz) / ln)
                rim = pow(_clamp(1.0 - nz / ln, 0.0, 1.0), 1.5)
                lum = _clamp(0.18 + diff * 0.62 + rim * 0.24, 0.08, 0.98)
                if is_eye:
                    lum = 0.99
                idx = int(_clamp(round(lum * (len(BODY_RAMP) - 1)), 0, len(BODY_RAMP) - 1))
                out[r][c] = (BODY_RAMP[idx], GRADE_BRIGHT if lum > 0.82 else (GRADE_LIT if lum > 0.44 else GRADE_DIM), cell_tone)
            else:
                haze = max(0.0, 0.22 - math.hypot(wx * 0.45, wy * 0.45) * 0.14)
                if haze > 0.09:
                    out[r][c] = (".", GRADE_GHOST, TONE_RIVER)
    return out


def _mirror_cell_grid(grid: ToneCellGrid) -> ToneCellGrid:
    return [[(MIRROR_CHAR.get(cell[0], cell[0]), cell[1], cell[2] if len(cell) >= 3 else TONE_AMBER) for cell in reversed(row)] for row in grid]


_CACHE: Dict[str, object] = {}


def _get_title_frames() -> List[ToneCellGrid]:
    if "title" not in _CACHE:
        _CACHE["title"] = [
            render_3d_horse_canvas(64, 30, i / 8.0, scale=0.94, offset_x=0.02, offset_y=0.04, with_sky_backdrop=True, backdrop_scroll=i * 3, charging=True)
            for i in range(8)
        ]
    return _CACHE["title"]  # type: ignore[return-value]


def _get_campaign_frames() -> Dict[str, object]:
    if "campaign" not in _CACHE:
        r_frames = [
            render_3d_horse_canvas(46, 13, i / 8.0, scale=0.94, offset_x=-0.02, offset_y=0.08, with_sky_backdrop=False, charging=True)
            for i in range(8)
        ]
        idle_r = render_3d_horse_canvas(46, 13, 0.15, scale=0.94, offset_x=-0.02, offset_y=0.08, with_sky_backdrop=False, charging=False)
        _CACHE["campaign"] = {
            "right": r_frames,
            "left": [_mirror_cell_grid(f) for f in r_frames],
            "idle_r": idle_r,
            "idle_l": _mirror_cell_grid(idle_r),
        }
    return _CACHE["campaign"]  # type: ignore[return-value]


def _get_battle_cache() -> Dict[str, object]:
    if "battle" not in _CACHE:
        hr = [render_3d_horse_canvas(26, 10, i / 6.0, scale=0.92, offset_x=-0.02, offset_y=0.08, with_sky_backdrop=False, charging=False) for i in range(6)]
        cr = render_3d_horse_canvas(26, 10, 0.02, scale=0.92, offset_x=0.0, offset_y=0.08, with_sky_backdrop=False, charging=True)
        units_r = {}
        units_l = {}
        for t in ("guard", "spear", "bow", "ram"):
            cols = 18 if t == "ram" else 15
            f0 = render_3d_battle_unit(t, 0, cols, 6)
            f1 = render_3d_battle_unit(t, 1, cols, 6)
            units_r[t] = [f0, f1]
            units_l[t] = [_mirror_cell_grid(f0), _mirror_cell_grid(f1)]
        _CACHE["battle"] = {
            "hr": hr,
            "hl": [_mirror_cell_grid(f) for f in hr],
            "cr": cr,
            "cl": _mirror_cell_grid(cr),
            "ur": units_r,
            "ul": units_l,
        }
    return _CACHE["battle"]  # type: ignore[return-value]


def get_baked_title_hero(clock: float) -> ToneCellGrid:
    frames = _get_title_frames()
    return frames[int(clock * 10) % len(frames)]


def get_baked_campaign_horse(clock: float, is_galloping: bool, facing_right: bool) -> ToneCellGrid:
    c = _get_campaign_frames()
    if not is_galloping:
        return c["idle_r"] if facing_right else c["idle_l"]  # type: ignore[index]
    frames = c["right"] if facing_right else c["left"]  # type: ignore[index]
    return frames[int(clock * 12) % len(frames)]  # type: ignore[index]


def get_baked_battle_sprite(squad: Dict[str, object], clock: float, pose: str = "idle") -> Tuple[ToneCellGrid, int, int]:
    c = _get_battle_cache()
    side_right = 1 if squad.get("side") == "attacker" else -1
    right = int(squad.get("facing", side_right)) >= 0  # type: ignore[arg-type]
    if squad.get("type") == "horse":
        if pose == "charge":
            grid = c["cr"] if right else c["cl"]
        else:
            arr = c["hr"] if right else c["hl"]
            grid = arr[int(clock * 10 + int(squad.get("slot", 0))) % len(arr)]  # type: ignore[index]
        return grid, 13, 5  # type: ignore[return-value]
    key = str(squad.get("type", "guard"))
    ur = c["ur"]  # type: ignore[index]
    if key not in ur:
        key = "guard"
    if key == "spear":
        active = 1 if squad.get("braced") else 0
    elif pose in ("attack", "volley") or (int(clock * 4 + int(squad.get("slot", 0))) % 2 == 1):
        active = 1
    else:
        active = 0
    arr = (c["ur"] if right else c["ul"])[key]  # type: ignore[index]
    grid = arr[active]
    return grid, len(grid[0]) // 2, len(grid) // 2


def get_baked_portrait(key: str) -> ToneCellGrid:
    if "portraits" not in _CACHE:
        _CACHE["portraits"] = {}
    pmap = _CACHE["portraits"]  # type: ignore[assignment]
    if key not in pmap:
        trait = key if key in ("thorne", "locke", "brack", "vance", "dray", "council") else "thorne"
        pmap[key] = render_3d_lord_portrait(trait, 28, 14)
    return pmap[key]


def get_baked_steed_panorama(clock: float, season_id: str = "winter") -> ToneCellGrid:
    key = f"pano_{season_id}"
    if key not in _CACHE:
        _CACHE[key] = [
            render_3d_horse_canvas(98, 27, i / 10.0, scale=0.94, offset_x=0.02, offset_y=0.04, with_sky_backdrop=True, backdrop_scroll=i * 4, season_id=season_id, charging=True)
            for i in range(10)
        ]
    frames = _CACHE[key]  # type: ignore[index]
    return frames[int(clock * 11) % len(frames)]  # type: ignore[return-value]


def house_tone_id(house_id: str) -> int:
    if house_id == "dray":
        return TONE_VIOLET
    if house_id == "vance":
        return TONE_FOREST
    if house_id == "locke":
        return TONE_STEEL
    if house_id in ("thorne", "brack"):
        return TONE_CRIMSON
    return TONE_AMBER


def stamp_cell_grid(
    buf: CellGrid,
    x: int,
    y: int,
    cell_grid: Sequence[Sequence[Tuple[object, ...]]],
    bounds: Optional[Tuple[int, int, int, int]] = None,
    grade_boost: int = 0,
    tone_buf: Optional[ToneGrid] = None,
    tone_remap: Optional[Dict[int, int]] = None,
) -> None:
    rows = len(buf)
    cols = len(buf[0]) if rows > 0 else 0
    x0, y0, x1, y1 = bounds if bounds else (0, 0, cols - 1, rows - 1)
    for r, row in enumerate(cell_grid):
        ty = y + r
        if ty < y0 or ty > y1:
            continue
        for c, cell in enumerate(row):
            tx = x + c
            ch = str(cell[0])
            if tx < x0 or tx > x1 or ch == " ":
                continue
            g = int(cell[1])  # type: ignore[arg-type]
            ng = max(GRADE_GHOST, min(GRADE_BRIGHT, g + grade_boost))
            buf[ty][tx] = (sanitize_glyph(ch), ng)
            if tone_buf is not None:
                raw_tone = int(cell[2]) if len(cell) >= 3 else TONE_AMBER  # type: ignore[arg-type]
                tone_buf[ty][tx] = tone_remap.get(raw_tone, raw_tone) if tone_remap else raw_tone


def stamp_sprite(
    buf: CellGrid,
    x: int,
    y: int,
    lines: List[str],
    base_grade: int = GRADE_LIT,
    bounds: Optional[Tuple[int, int, int, int]] = None,
    hi_chars: Optional[set] = None,
    tone_buf: Optional[ToneGrid] = None,
    tone: int = TONE_AMBER,
    hi_tone: Optional[int] = None,
) -> None:
    rows = len(buf)
    cols = len(buf[0]) if rows > 0 else 0
    x0, y0, x1, y1 = bounds if bounds else (0, 0, cols - 1, rows - 1)
    for r, line in enumerate(lines):
        ty = y + r
        if ty < y0 or ty > y1:
            continue
        for c, ch in enumerate(line):
            tx = x + c
            if tx < x0 or tx > x1 or ch == " ":
                continue
            is_hi = bool(hi_chars and ch in hi_chars)
            g = GRADE_BRIGHT if is_hi else base_grade
            buf[ty][tx] = (sanitize_glyph(ch), g)
            if tone_buf is not None:
                tone_buf[ty][tx] = hi_tone if (is_hi and hi_tone is not None) else tone


def pick_crest_for_dialogue(dlg: Dict[str, object]) -> Tuple[List[str], str, str]:
    sp = str(dlg.get("speaker", "")).lower()
    did = str(dlg.get("id", "")).lower()
    house_id = "thorne"
    if "dray" in sp or "dray" in did or "highcrown" in sp:
        house_id = "dray"
    elif "brack" in sp or "brack" in did:
        house_id = "brack"
    elif "vance" in sp or "rook" in sp or "vance" in did:
        house_id = "vance"
    elif "locke" in sp or "greycrag" in sp or "locke" in did:
        house_id = "locke"
    p_key = "council" if house_id == "thorne" and (did == "council_root" or "spymaster" in sp or "halden" in sp) else house_id
    return HOUSE_CRESTS[house_id], house_id, p_key


def render_campaign_march_vista(
    buf: CellGrid,
    game: object,
    x0: int = 1,
    y0: int = 19,
    width: int = 66,
    height: int = 13,
    tone_buf: Optional[ToneGrid] = None,
) -> None:
    bounds = (x0, y0, x0 + width - 1, y0 + height - 1)
    t = getattr(game, "clock", 0.0)
    camp = getattr(game, "campaign", {})
    gallop = camp.get("gallop_timer", 0.0) > 0
    facing_right = camp.get("facing", 1) >= 0
    scroll = int(camp.get("march_scroll", 0.0) * 3)
    season = "winter"

    def _put(rx: int, ry: int, ch: str, g: int, tn: int) -> None:
        buf[ry][rx] = (ch, g)
        if tone_buf is not None:
            tone_buf[ry][rx] = tn

    for r in range(5):
        for c in range(width):
            n = (c * 17 + scroll + r * 31) % 73
            if r < 3 and season == "winter" and n == 0:
                _put(x0 + c, y0 + r, "*", GRADE_DIM, TONE_SNOW)
            elif r < 2 and n % 19 == 0:
                _put(x0 + c, y0 + r, ".", GRADE_GHOST, TONE_RIVER)

    for c in range(width):
        if 12 < c < width - 14:
            continue
        h = 1 + int(math.sin((c + scroll * 0.25) * 0.28) * 1.1 + 1.0)
        for k in range(h):
            py2 = y0 + 5 - k
            if bounds[1] <= py2 <= bounds[3]:
                is_peak = k == h - 1
                _put(x0 + c, py2, "^" if is_peak else ":", GRADE_MIST if is_peak else GRADE_GHOST, TONE_SNOW if is_peak else TONE_STONE)

    px, py = camp.get("px", 0), camp.get("py", 0)
    tile = game.grid[py][px]  # type: ignore[attr-defined]
    near_hold = game.hold_at(px, py)  # type: ignore[attr-defined]
    if near_hold or any(abs(h["x"] - px) + abs(h["y"] - py) <= 4 for h in game.holds):  # type: ignore[attr-defined]
        castle = ["  |_|_|_   _|_|_  ", "  |##+##|=|##*##| ", "__|##[=]###[=]##|_", "##################"]
        cx = x0 + (width - 19 if facing_right else 1)
        stamp_sprite(buf, cx, y0 + height - 5, castle, GRADE_MIST, bounds, {"*"}, tone_buf=tone_buf, tone=TONE_STONE, hi_tone=TONE_FIRE)
    elif tile == "T":
        for tx in range(0, width, 19):
            rx = ((tx - (scroll % 19) + width) % width) + x0
            stamp_sprite(buf, rx, y0 + height - 5, ["  /\\  ", " /%%\\ ", "/%%%%\\"], GRADE_MIST, bounds, tone_buf=tone_buf, tone=TONE_FOREST)
            stamp_sprite(buf, rx, y0 + height - 2, ["  ||  "], GRADE_MIST, bounds, tone_buf=tone_buf, tone=TONE_WOOD)

    verge_row = y0 + height - 2
    road_row = y0 + height - 1
    for c in range(width):
        gx = x0 + c
        _put(gx, verge_row, "." if (c + scroll) % 4 == 0 else " ", GRADE_GHOST, TONE_SNOW)
        if tile == "=":
            _put(gx, road_row, "#" if (c + scroll) % 4 == 0 else "=", GRADE_DIM, TONE_RIVER)
        else:
            _put(gx, road_row, "=" if (c + scroll) % 5 == 0 else "-", GRADE_MIST, TONE_PARCHMENT)

    b_cache = _get_battle_cache()
    ret_idx = int(t * 7) % 2 if gallop else 0
    ret_grid = (b_cache["ur"] if facing_right else b_cache["ul"])["spear"][ret_idx]  # type: ignore[index]
    horse_grid = get_baked_campaign_horse(t, gallop, facing_right)
    horse_x = x0 + (18 if facing_right else 2)
    ret_x = horse_x - 16 if facing_right else horse_x + 46
    stamp_cell_grid(buf, ret_x, y0 + height - 7, ret_grid, bounds, -1, tone_buf=tone_buf)
    stamp_cell_grid(buf, horse_x, y0 + height - len(horse_grid), horse_grid, bounds, 0, tone_buf=tone_buf)

    if gallop:
        dust_x = horse_x + (5 if facing_right else 39)
        puff = "*.: " if int(t * 14) % 2 == 0 else ".:* "
        for i in range(3):
            px2 = dust_x + (-i if facing_right else i)
            if bounds[0] <= px2 <= bounds[2]:
                _put(px2, verge_row, puff[i], GRADE_DIM, TONE_SNOW)


def render_battle_scenery(
    buf: CellGrid,
    battle: Dict[str, object],
    clock: float,
    pulse_waves: List[Dict[str, float]],
    origin_x: int = 1,
    origin_y: int = 2,
    tone_buf: Optional[ToneGrid] = None,
) -> None:
    bmap = battle["map"]  # type: ignore[index]
    grid = bmap["grid"]  # type: ignore[index]
    bounds = (origin_x, origin_y, origin_x + BATTLE_W - 1, origin_y + BATTLE_H - 1)
    for r in range(BATTLE_H):
        for c in range(BATTLE_W):
            ch = grid[r][c]
            sx, sy = origin_x + c, origin_y + r
            g = GRADE_GHOST
            tn = TONE_FOREST
            if r <= 1 and ch == ".":
                ridge = math.sin(c * 0.24) + math.cos(c * 0.11)
                if ridge > 0.7:
                    ch, g, tn = "^", GRADE_MIST, TONE_SNOW
                elif ridge > 0.1:
                    ch, g, tn = ":", GRADE_GHOST, TONE_STONE
                else:
                    ch, g, tn = " ", GRADE_GHOST, TONE_RIVER
            elif ch == ".":
                speck = (c * 13 + r * 29) % 17
                ch = "." if speck == 0 else ("," if speck == 1 else " ")
                g = GRADE_GHOST
                tn = TONE_FOREST if speck == 0 else TONE_SNOW
            elif ch == "n":
                ch = "%" if (c + r) % 2 == 0 else "^"
                g, tn = GRADE_MIST, TONE_STONE
            elif ch == "=":
                g, tn = GRADE_DIM, TONE_PARCHMENT
            elif ch == "~":
                ch = "-" if ((c + r + int(clock * 3)) % 3 == 0) else "~"
                g, tn = GRADE_MIST, TONE_RIVER
            elif ch == "T":
                ch, g, tn = " ", GRADE_DIM, TONE_FOREST
            elif ch == "^":
                g, tn = GRADE_MIST, TONE_SNOW
            elif ch == ":":
                g, tn = GRADE_GHOST, TONE_STONE
            elif ch in ("#", "H"):
                g = GRADE_BRIGHT if ch == "H" else GRADE_LIT
                tn = TONE_WOOD if ch == "H" else TONE_STONE
            elif ch == "L":
                g, tn = GRADE_LIT, TONE_AMBER
            else:
                g, tn = GRADE_DIM, TONE_STONE
            for pw in pulse_waves:
                if abs(math.hypot(c - pw["x"], r - pw["y"]) - pw["radius"]) < 1.1:
                    ch, g, tn = "o", GRADE_BRIGHT, TONE_AMBER
            buf[sy][sx] = (ch, g)
            if tone_buf is not None:
                tone_buf[sy][sx] = tn

    for r in range(2, BATTLE_H - 2, 2):
        for c in range(2, BATTLE_W - 4, 3):
            if grid[r][c] == "T":
                stamp_sprite(buf, origin_x + c - 1, origin_y + r - 1, [" /\\ ", "/%%\\"], GRADE_DIM, bounds, tone_buf=tone_buf, tone=TONE_FOREST)
                stamp_sprite(buf, origin_x + c - 1, origin_y + r + 1, [" || "], GRADE_MIST, bounds, tone_buf=tone_buf, tone=TONE_WOOD)

    if bmap["kind"] == "siege":
        wall_x = int(bmap["wall_x"])  # type: ignore[index]
        brazier = "(*)" if int(clock * 6) % 2 == 0 else "(^)"
        for r in range(2, BATTLE_H - 2):
            for c in range(wall_x + 2, BATTLE_W - 1):
                if (c + r * 2) % 3 == 0:
                    buf[origin_y + r][origin_x + c] = (".", GRADE_GHOST)
                    if tone_buf is not None:
                        tone_buf[origin_y + r][origin_x + c] = TONE_STONE

        tower = [
            " _|_|_|_|_ ",
            "|%%%###%%%|",
            "|##[#][#]#|",
            "|#########===",
            "|%%#####%%|",
            "|_________|",
        ]
        stamp_sprite(buf, origin_x + wall_x - 1, origin_y, tower, GRADE_LIT, bounds, tone_buf=tone_buf, tone=TONE_STONE)
        stamp_sprite(buf, origin_x + wall_x - 1, origin_y + BATTLE_H - 6, tower, GRADE_LIT, bounds, tone_buf=tone_buf, tone=TONE_STONE)

        for r in range(BATTLE_H):
            tile = grid[r][wall_x]
            if tile == "L":
                buf[origin_y + r][origin_x + wall_x - 1] = ("|", GRADE_LIT)
                buf[origin_y + r][origin_x + wall_x] = ("=", GRADE_BRIGHT)
                buf[origin_y + r][origin_x + wall_x + 1] = ("|", GRADE_LIT)
                if tone_buf is not None:
                    tone_buf[origin_y + r][origin_x + wall_x - 1] = TONE_WOOD
                    tone_buf[origin_y + r][origin_x + wall_x] = TONE_AMBER
                    tone_buf[origin_y + r][origin_x + wall_x + 1] = TONE_WOOD
            elif tile == "#":
                buf[origin_y + r][origin_x + wall_x] = ("#", GRADE_LIT)
                if tone_buf is not None:
                    tone_buf[origin_y + r][origin_x + wall_x] = TONE_STONE
                if wall_x + 1 < BATTLE_W:
                    buf[origin_y + r][origin_x + wall_x + 1] = ("%", GRADE_DIM)
                    if tone_buf is not None:
                        tone_buf[origin_y + r][origin_x + wall_x + 1] = TONE_STONE

        brazier_hi = {"(", ")", "*", "^"}
        stamp_sprite(buf, origin_x + wall_x + 2, origin_y + 1, [brazier], GRADE_BRIGHT, bounds, brazier_hi, tone_buf=tone_buf, tone=TONE_FIRE, hi_tone=TONE_FIRE)
        stamp_sprite(buf, origin_x + wall_x + 2, origin_y + BATTLE_H - 5, [brazier], GRADE_BRIGHT, bounds, brazier_hi, tone_buf=tone_buf, tone=TONE_FIRE, hi_tone=TONE_FIRE)

        gy = int(bmap["gate_y"])  # type: ignore[index]
        if not battle.get("gate_breached"):
            gate_closed = [
                " /=====\\ ",
                "|[#|||#]|",
                f"|[{int(battle.get('gate_hp', 0)):>3}]|",
                "|[#|||#]|",
                " \\=====/ ",
            ]
            stamp_sprite(buf, origin_x + wall_x - 2, origin_y + gy - 2, gate_closed, GRADE_LIT, bounds, {"[", "]", "="}, tone_buf=tone_buf, tone=TONE_WOOD, hi_tone=TONE_STEEL)
        else:
            gate_broken = [
                " /.. ..\\ ",
                "|\\  =  /|",
                "   ===   ",
                "|/  =  \\|",
                " \\.. ../ ",
            ]
            stamp_sprite(buf, origin_x + wall_x - 2, origin_y + gy - 2, gate_broken, GRADE_DIM, bounds, {"="}, tone_buf=tone_buf, tone=TONE_WOOD, hi_tone=TONE_FIRE)
