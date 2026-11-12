"""Realm cartography, Great Houses, military levies, and battle map generators."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

REALM_W = 76
REALM_H = 44
BATTLE_W = 66
BATTLE_H = 30

SEASONS: List[Dict[str, Any]] = [
    {"id": "autumn", "label": "AUTUMN RAIN", "food_mult": 1.0, "move_delay": 1.0, "attrition": 0},
    {"id": "frost", "label": "EARLY FROST", "food_mult": 1.25, "move_delay": 1.15, "attrition": 1},
    {"id": "winter", "label": "DEEP WINTER", "food_mult": 1.65, "move_delay": 1.35, "attrition": 3},
    {"id": "thaw", "label": "MUD THAW", "food_mult": 1.1, "move_delay": 1.2, "attrition": 0},
]

TERRAIN_META: Dict[str, Dict[str, Any]] = {
    ".": {"name": "Scrub Plain", "passable": True, "cost": 1.0, "cover": 0, "forage": 2},
    "=": {"name": "King Road / Span", "passable": True, "cost": 0.72, "cover": 0, "forage": 1},
    ",": {"name": "Bog / Mud Flat", "passable": True, "cost": 1.65, "cover": 0, "forage": 1},
    "T": {"name": "Briar Wood", "passable": True, "cost": 1.35, "cover": 30, "forage": 3},
    "n": {"name": "Hill Ridge", "passable": True, "cost": 1.25, "cover": 20, "forage": 1},
    "#": {"name": "Hold Bastion", "passable": True, "cost": 0.9, "cover": 55, "forage": 2},
    "v": {"name": "Croft Village", "passable": True, "cost": 0.85, "cover": 15, "forage": 4},
    "^": {"name": "High Crag", "passable": False, "cost": 99.0, "cover": 40, "forage": 0},
    "~": {"name": "Deep River / Sea", "passable": False, "cost": 99.0, "cover": 0, "forage": 0},
    ":": {"name": "Frozen Ford", "passable": True, "cost": 1.3, "cover": 0, "forage": 0},
}

INITIAL_HOUSES: List[Dict[str, Any]] = [
    {
        "id": "thorne", "name": "House Thorne", "tag": "THN", "lord": "Lord Garret Thorne",
        "seat": "blackpike", "is_player": True, "relation": 100, "honor": 62, "dread": 25,
        "treasury": 320, "grain": 240, "attitude": "player", "treaty": "liege",
        "betrayal_risk": 0, "personality": "lawful",
    },
    {
        "id": "locke", "name": "House Locke", "tag": "LCK", "lord": "Lady Ysabel Locke",
        "seat": "greycrag", "is_player": False, "relation": 58, "honor": 74, "dread": 18,
        "treasury": 260, "grain": 190, "attitude": "allied", "treaty": "oath",
        "betrayal_risk": 14, "personality": "honor",
    },
    {
        "id": "brack", "name": "House Brack", "tag": "BRK", "lord": "Lord Harmund Brack",
        "seat": "saltport", "is_player": False, "relation": 16, "honor": 28, "dread": 32,
        "treasury": 410, "grain": 230, "attitude": "neutral", "treaty": "truce",
        "betrayal_risk": 52, "personality": "mercantile",
    },
    {
        "id": "vance", "name": "House Vance", "tag": "VNC", "lord": "Lord Corvin Vance",
        "seat": "rookkeep", "is_player": False, "relation": -22, "honor": 36, "dread": 48,
        "treasury": 350, "grain": 210, "attitude": "wary", "treaty": "none",
        "betrayal_risk": 64, "personality": "ambitious",
    },
    {
        "id": "dray", "name": "Archon Dray", "tag": "DRY", "lord": "Archon Malcor Dray",
        "seat": "highcrown", "is_player": False, "relation": -95, "honor": 18, "dread": 85,
        "treasury": 680, "grain": 420, "attitude": "war", "treaty": "war",
        "betrayal_risk": 0, "personality": "ruthless",
    },
]

HOLD_TEMPLATES: List[Dict[str, Any]] = [
    {"id": "blackpike", "name": "Blackpike Keep", "region": "Twin-River", "x": 28, "y": 16, "owner": "thorne", "wall_hp": 180, "max_wall": 180, "garrison": 85, "tax_yield": 38, "grain_yield": 26, "has_iron": False, "has_port": False, "is_capital": True},
    {"id": "ashford", "name": "Ashford Granary", "region": "Greenvale", "x": 19, "y": 23, "owner": "thorne", "wall_hp": 90, "max_wall": 90, "garrison": 45, "tax_yield": 24, "grain_yield": 44, "has_iron": False, "has_port": False, "is_capital": False},
    {"id": "greycrag", "name": "Greycrag Hold", "region": "Northfells", "x": 24, "y": 6, "owner": "locke", "wall_hp": 170, "max_wall": 170, "garrison": 95, "tax_yield": 34, "grain_yield": 18, "has_iron": True, "has_port": False, "is_capital": False},
    {"id": "oldford", "name": "Old Ford Toll", "region": "Riverford", "x": 43, "y": 17, "owner": "thorne", "wall_hp": 115, "max_wall": 115, "garrison": 60, "tax_yield": 32, "grain_yield": 22, "has_iron": False, "has_port": False, "is_capital": False},
    {"id": "saltport", "name": "Saltport Quays", "region": "Westreach", "x": 12, "y": 29, "owner": "brack", "wall_hp": 145, "max_wall": 145, "garrison": 105, "tax_yield": 56, "grain_yield": 24, "has_iron": False, "has_port": True, "is_capital": False},
    {"id": "rookkeep", "name": "Rook's Keep", "region": "Ashmarch", "x": 57, "y": 13, "owner": "vance", "wall_hp": 165, "max_wall": 165, "garrison": 120, "tax_yield": 42, "grain_yield": 28, "has_iron": True, "has_port": False, "is_capital": False},
    {"id": "redwatch", "name": "Redwatch Bastion", "region": "Red March", "x": 27, "y": 34, "owner": "dray", "wall_hp": 160, "max_wall": 160, "garrison": 110, "tax_yield": 30, "grain_yield": 20, "has_iron": False, "has_port": False, "is_capital": False},
    {"id": "kingsbridge", "name": "Kingsbridge Camp", "region": "Crownwash", "x": 48, "y": 29, "owner": "dray", "wall_hp": 130, "max_wall": 130, "garrison": 125, "tax_yield": 36, "grain_yield": 30, "has_iron": False, "has_port": False, "is_capital": False},
    {"id": "highcrown", "name": "Highcrown Citadel", "region": "Crownlands", "x": 61, "y": 36, "owner": "dray", "wall_hp": 240, "max_wall": 240, "garrison": 175, "tax_yield": 68, "grain_yield": 38, "has_iron": True, "has_port": True, "is_capital": True},
]

UNIT_TYPES: Dict[str, Dict[str, Any]] = {
    "guard": {"id": "guard", "code": "@", "name": "Household Guard", "hp_per_man": 16, "atk": 13, "armor": 7, "range": 1, "speed": 1.0},
    "spear": {"id": "spear", "code": "S", "name": "Shieldwall Pikes", "hp_per_man": 13, "atk": 9, "armor": 6, "range": 1, "speed": 0.9},
    "bow": {"id": "bow", "code": "B", "name": "Ashwood Longbows", "hp_per_man": 9, "atk": 11, "armor": 2, "range": 13, "speed": 1.0},
    "horse": {"id": "horse", "code": "H", "name": "Mail Lancers", "hp_per_man": 17, "atk": 15, "armor": 6, "range": 1, "speed": 1.55},
    "ram": {"id": "ram", "code": "R", "name": "Capped Siege Ram", "hp_per_man": 32, "atk": 42, "armor": 10, "range": 1, "speed": 0.55},
}


def create_realm_grid() -> Tuple[List[List[str]], List[Tuple[int, int]]]:
    """Generate the 76x44 strategic continent grid matching Web worldData."""
    g = [["." for _ in range(REALM_W)] for _ in range(REALM_H)]

    def set_tile(x: int, y: int, ch: str) -> None:
        if 0 <= x < REALM_W and 0 <= y < REALM_H:
            g[y][x] = ch

    def rect(x0: int, y0: int, x1: int, y1: int, ch: str) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                set_tile(x, y, ch)

    def road_line(x0: int, y0: int, x1: int, y1: int, ch: str = "=") -> None:
        x, y = x0, y0
        set_tile(x, y, ch)
        while x != x1 or y != y1:
            if abs(x1 - x) >= abs(y1 - y):
                x += 1 if x < x1 else -1
            else:
                y += 1 if y < y1 else -1
            set_tile(x, y, ch)

    for y in range(REALM_H):
        if y < 14:
            coast_x = 4 + int(math.sin(y * 0.4) * 2)
        elif y < 26:
            coast_x = 7 + int((y - 14) * 0.25)
        else:
            coast_x = 9 + int(math.sin(y * 0.35) * 2)
        for x in range(coast_x + 1):
            set_tile(x, y, "~")

    for y in range(39, REALM_H):
        for x in range(REALM_W):
            if x < 50 or y >= 41:
                set_tile(x, y, "~")

    rect(5, 0, REALM_W - 1, 3, "^")
    rect(10, 4, 17, 9, "^")
    rect(31, 4, 38, 10, "^")
    rect(50, 4, 56, 8, "^")
    rect(67, 4, REALM_W - 1, 16, "^")
    rect(70, 17, REALM_W - 1, 40, "^")

    rect(39, 10, 47, 13, "n")
    rect(14, 12, 20, 15, "T")
    rect(34, 21, 41, 25, "T")
    rect(51, 18, 60, 23, "T")
    rect(16, 28, 22, 33, ",")
    rect(35, 32, 41, 36, ",")
    rect(54, 25, 62, 28, "n")

    for x in range(8, 70):
        ry = 18 + round(math.sin(x * 0.14))
        set_tile(x, ry, "~")
        set_tile(x, ry + 1, "~")

    for sx, sy in [(14, 18), (14, 19)]:
        set_tile(sx, sy, ":")
    for bx, by in [
        (28, 17), (28, 18), (28, 19),
        (43, 18), (43, 19),
        (58, 17), (58, 18), (58, 19),
    ]:
        set_tile(bx, by, "=")

    for x in range(10, 70):
        ry = 30 + (1 if x > 46 else 0)
        set_tile(x, ry, "~")
        set_tile(x, ry + 1, "~")
    for bx, by in [(27, 30), (27, 31), (48, 30), (48, 31), (48, 32)]:
        set_tile(bx, by, "=")

    for rx0, ry0, rx1, ry1 in [
        (24, 6, 28, 16), (28, 16, 43, 17), (43, 17, 57, 13),
        (28, 16, 19, 23), (19, 23, 12, 29), (19, 23, 27, 34),
        (43, 17, 48, 29), (57, 13, 58, 24), (58, 24, 48, 29),
        (27, 34, 48, 29), (48, 29, 61, 36),
    ]:
        road_line(rx0, ry0, rx1, ry1, "=")

    villages = [(22, 11), (16, 21), (35, 16), (51, 14), (35, 27), (20, 35), (56, 31)]
    for vx, vy in villages:
        set_tile(vx, vy, "v")

    for h in HOLD_TEMPLATES:
        set_tile(h["x"], h["y"], "#")
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = h["x"] + dx, h["y"] + dy
            if 0 <= nx < REALM_W and 0 <= ny < REALM_H and g[ny][nx] in ("^", "~"):
                set_tile(nx, ny, ".")

    return g, villages


def build_battle_map(kind: str = "plains", hold: Optional[Dict[str, Any]] = None, gate_breached: bool = False) -> Dict[str, Any]:
    """Generate a tactical 66x30 battlefield matched to terrain or siege hold."""
    g = [["." for _ in range(BATTLE_W)] for _ in range(BATTLE_H)]

    def set_tile(x: int, y: int, ch: str) -> None:
        if 0 <= x < BATTLE_W and 0 <= y < BATTLE_H:
            g[y][x] = ch

    if kind == "siege" and hold:
        wall_x = 44
        for y in range(2, BATTLE_H - 2):
            set_tile(wall_x, y, "#")
            set_tile(wall_x + 1, y, "#")
        for y in range(3, BATTLE_H - 3):
            if y < 12 or y > 16:
                set_tile(wall_x - 3, y, "~")
        for y in range(13, 16):
            ch = "." if gate_breached else "H"
            set_tile(wall_x, y, ch)
            set_tile(wall_x + 1, y, ch)
        for ly in (6, 23):
            set_tile(wall_x, ly, "L")
            set_tile(wall_x + 1, ly, "L")
        for ky in range(8, 22, 6):
            set_tile(54, ky, "#")
            set_tile(55, ky, "#")
        for mx, my in [(24, 9), (28, 14), (24, 20), (34, 11), (34, 18)]:
            set_tile(mx, my, "T")
        return {"grid": g, "wall_x": wall_x, "gate_y": 14, "kind": "siege"}

    if kind == "bridge":
        for y in range(BATTLE_H):
            for x in range(31, 35):
                set_tile(x, y, "~")
        for y in range(12, 18):
            for x in range(30, 36):
                set_tile(x, y, "=")
        for y in range(4, 6):
            for x in range(31, 35):
                set_tile(x, y, ":")
        for fx, fy in [(21, 6), (22, 7), (20, 22), (44, 7), (46, 21)]:
            set_tile(fx, fy, "T")
            set_tile(fx + 1, fy, "T")
        return {"grid": g, "wall_x": None, "gate_y": None, "kind": "bridge"}

    if kind in ("forest", "mud"):
        ch = "T" if kind == "forest" else ","
        clusters = [(20, 6), (21, 7), (26, 13), (27, 14), (22, 22), (38, 8), (40, 16), (42, 23), (33, 5), (34, 24)]
        for cx, cy in clusters:
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    if abs(dx) + abs(dy) <= 2:
                        set_tile(cx + dx, cy + dy, ch)
        return {"grid": g, "wall_x": None, "gate_y": None, "kind": kind}

    for rx, ry in [(28, 7), (29, 7), (37, 21), (38, 21), (33, 14)]:
        set_tile(rx, ry, "n")
    return {"grid": g, "wall_x": None, "gate_y": None, "kind": "plains"}


def make_default_regiments(owner_tag: str, scale: float = 1.0, include_ram: bool = False) -> List[Dict[str, Any]]:
    list_r = [
        {"id": f"{owner_tag}_guard", "type": "guard", "men": round(35 * scale), "max_men": round(35 * scale), "morale": 92},
        {"id": f"{owner_tag}_spear", "type": "spear", "men": round(60 * scale), "max_men": round(60 * scale), "morale": 84},
        {"id": f"{owner_tag}_bow", "type": "bow", "men": round(45 * scale), "max_men": round(45 * scale), "morale": 80},
        {"id": f"{owner_tag}_horse", "type": "horse", "men": round(28 * scale), "max_men": round(28 * scale), "morale": 86},
    ]
    if include_ram:
        list_r.append({"id": f"{owner_tag}_ram", "type": "ram", "men": 12, "max_men": 12, "morale": 90})
    return list_r

