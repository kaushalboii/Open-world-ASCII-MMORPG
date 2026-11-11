"""Hand-authored open-world terrain, landmarks, entities, and items for Marren Valley."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

WORLD_W = 240
WORLD_H = 88

# Tile semantic tags
TILE_WATER = "water"
TILE_SHOAL = "shoal"        # Secret sunken stones: appear as water until pinged/lit, walkable!
TILE_MUD = "mud"
TILE_ROAD = "road"
TILE_STONE = "stone"
TILE_TIMBER = "timber"
TILE_WALL = "wall"
TILE_TREE = "tree"
TILE_SALT = "salt"          # Brittle salt crystal (%): shattered by Tuning Fork wave
TILE_GATE = "gate"          # Locked sluice/choir gate (+) opened by pulley or bells
TILE_BRIDGE = "bridge"      # Lowered wooden bridge (=)
TILE_SLAG = "slag"          # Hot foundry slag channel (~ glowing, hurts if stepped on without step)
TILE_PILLAR = "pillar"      # Structural stone pillar

WALKABLE_TILES = {TILE_SHOAL, TILE_MUD, TILE_ROAD, TILE_STONE, TILE_TIMBER, TILE_BRIDGE}
OPAQUE_TILES = {TILE_WALL, TILE_TREE, TILE_SALT, TILE_GATE, TILE_PILLAR}

REGION_META: List[Tuple[str, str, str, Tuple[int, int, int, int]]] = [
    ("tidemouth", "TIDEMOUTH PIER", "Driftwood jetty beneath a weeping estuary lighthouse.", (0, 56, 70, 88)),
    ("orchard", "THE SUNKEN ORCHARD", "Apple rows half-swallowed by fog-choked silt.", (0, 20, 76, 56)),
    ("nave", "ST. JUDE'S NAVE", "Rain drills diagonally through broken limestone arches.", (72, 4, 146, 44)),
    ("causeway", "BRAMWELL CAUSEWAY", "A battered stone dike spanning dark tidal marshes.", (70, 44, 146, 86)),
    ("redwick", "KILN-TOWN OF REDWICK", "Beehive coke ovens steaming into cold salt drizzle.", (146, 36, 206, 68)),
    ("saltflats", "LOW SUNDER FLATS", "Pale salt crust and the bleached ribs of wrecked dredgers.", (146, 68, 238, 87)),
    ("foundry", "THE HIGH FOUNDRY", "Riveted gantry cranes suspended over glowing slag channels.", (146, 4, 238, 36)),
]


@dataclass
class Belfry:
    id: str
    index: int
    name: str
    region: str
    x: int
    y: int
    clapper_id: str
    rung: bool = False


@dataclass
class NpcData:
    id: str
    name: str
    glyph: str
    x: int
    y: int
    region: str
    dialogue_root: str


@dataclass
class EnemyTemplate:
    id: str
    kind: str
    name: str
    glyph: str
    x: int
    y: int
    region: str
    max_hp: int
    damage: int
    speed: float
    windup_s: float
    cooldown_s: float
    aggro_range: int
    brass_drop: int
    stealth: bool = False
    is_boss: bool = False


@dataclass
class PickupItem:
    id: str
    kind: str       # clapper | oil | poultice | brass | relic | note
    name: str
    glyph: str
    x: int
    y: int
    value: str = ""
    amount: int = 1
    collected: bool = False


@dataclass
class Brazier:
    id: str
    name: str
    region: str
    x: int
    y: int


@dataclass
class Interactable:
    id: str
    kind: str       # pulley | noticeboard | anvil
    name: str
    glyph: str
    x: int
    y: int
    activated: bool = False


@dataclass
class DecorativeFeature:
    x: int
    y: int
    lines: List[str]
    min_grade: int = 2
    kind: str = "landmark"


@dataclass
class WorldMap:
    width: int
    height: int
    glyphs: List[List[str]]
    kinds: List[List[str]]
    region_ids: List[List[str]]
    belfries: List[Belfry] = field(default_factory=list)
    npcs: List[NpcData] = field(default_factory=list)
    enemies: List[EnemyTemplate] = field(default_factory=list)
    pickups: List[PickupItem] = field(default_factory=list)
    braziers: List[Brazier] = field(default_factory=list)
    interactables: List[Interactable] = field(default_factory=list)
    decor_lines: List[DecorativeFeature] = field(default_factory=list)

    def in_bounds(self, x: int, y: int) -> bool:
        return 0 <= x < self.width and 0 <= y < self.height

    def is_walkable(self, x: int, y: int) -> bool:
        if not self.in_bounds(x, y):
            return False
        return self.kinds[y][x] in WALKABLE_TILES

    def is_opaque(self, x: int, y: int) -> bool:
        if not self.in_bounds(x, y):
            return True
        return self.kinds[y][x] in OPAQUE_TILES

    def set_tile(self, x: int, y: int, glyph: str, kind: str) -> None:
        if self.in_bounds(x, y):
            self.glyphs[y][x] = glyph
            self.kinds[y][x] = kind

    def region_at(self, x: int, y: int) -> str:
        if not self.in_bounds(x, y):
            return "tidemouth"
        return self.region_ids[y][x]


def _paint_rect(
    wm: WorldMap,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    glyph_fn,
    kind: str,
) -> None:
    for y in range(max(0, y0), min(wm.height, y1 + 1)):
        for x in range(max(0, x0), min(wm.width, x1 + 1)):
            g = glyph_fn(x, y) if callable(glyph_fn) else glyph_fn
            wm.set_tile(x, y, g, kind)


def _paint_hollow_box(
    wm: WorldMap,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    wall_glyph = "#",
    floor_glyph = ".",
    floor_kind: str = TILE_STONE,
) -> None:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if x in (x0, x1) or y in (y0, y1):
                wg = wall_glyph(x, y) if callable(wall_glyph) else wall_glyph
                wm.set_tile(x, y, wg, TILE_WALL)
            else:
                fg = floor_glyph(x, y) if callable(floor_glyph) else floor_glyph
                wm.set_tile(x, y, fg, floor_kind)


def _earth_glyph(x: int, y: int) -> str:
    h = (x * 37 + y * 91) % 19
    if h == 0:
        return ","
    if h in (1, 2):
        return "`"
    if h in (3, 4):
        return "'"
    if h == 5:
        return ";"
    if h == 6:
        return '"'
    return "."


def _salt_sand_glyph(x: int, y: int) -> str:
    h = (x * 53 + y * 19) % 15
    if h < 2:
        return "'"
    if h < 4:
        return ","
    if h == 5:
        return "`"
    if h == 6:
        return "_"
    if h == 7:
        return ";"
    return "."


def _stone_glyph(x: int, y: int) -> str:
    h = (x * 41 + y * 67) % 17
    if h in (0, 1):
        return "_"
    if h == 2:
        return ","
    if h == 3:
        return ";"
    return "."


def _timber_glyph(x: int, y: int) -> str:
    return "-" if ((x + y * 2) % 5 == 0) else "="


def _cliff_glyph(x: int, y: int) -> str:
    h = (x * 29 + y * 73) % 11
    if h < 2:
        return "A"
    if h == 2:
        return "M"
    if h == 3:
        return "/"
    if h == 4:
        return "\\"
    return "^"


def _water_glyph(x: int, y: int) -> str:
    return "~" if ((x + y * 3) % 4 != 0) else "-"


def build_marren_world() -> WorldMap:
    """Construct the seamless 240x88 valley of Marren with verified routes."""
    glyphs = [[_water_glyph(x, y) for x in range(WORLD_W)] for y in range(WORLD_H)]
    kinds = [[TILE_WATER for _ in range(WORLD_W)] for _ in range(WORLD_H)]
    region_ids = [["tidemouth" for _ in range(WORLD_W)] for _ in range(WORLD_H)]

    for rid, _title, _desc, (rx0, ry0, rx1, ry1) in REGION_META:
        for y in range(max(0, ry0), min(WORLD_H, ry1)):
            for x in range(max(0, rx0), min(WORLD_W, rx1)):
                region_ids[y][x] = rid

    wm = WorldMap(WORLD_W, WORLD_H, glyphs, kinds, region_ids)

    # Outer rugged crag cliff boundary
    _paint_rect(wm, 0, 0, WORLD_W - 1, 3, _cliff_glyph, TILE_WALL)
    _paint_rect(wm, 0, WORLD_H - 2, WORLD_W - 1, WORLD_H - 1, _cliff_glyph, TILE_WALL)
    _paint_rect(wm, 0, 0, 3, WORLD_H - 1, _cliff_glyph, TILE_WALL)
    _paint_rect(wm, WORLD_W - 4, 0, WORLD_W - 1, WORLD_H - 1, _cliff_glyph, TILE_WALL)

    # 1. TIDEMOUTH PIER (SW: X 6..68, Y 56..80)
    _paint_rect(wm, 16, 56, 62, 74, _earth_glyph, TILE_MUD)
    _paint_rect(wm, 8, 66, 26, 71, _timber_glyph, TILE_TIMBER)        # Wooden pier out over estuary
    _paint_hollow_box(wm, 10, 58, 18, 65, "#", ":", TILE_STONE)  # Lighthouse base
    wm.set_tile(14, 65, ".", TILE_STONE)                      # Lighthouse doorway
    # Toll-shed near pier east road (cache behind brittle salt pillar)
    _paint_hollow_box(wm, 46, 59, 55, 65, "#", _stone_glyph, TILE_STONE)
    wm.set_tile(46, 62, "%", TILE_SALT)                       # Practice salt barrier
    # Main roads out of Tidemouth
    _paint_rect(wm, 20, 62, 45, 63, ":", TILE_ROAD)         # Pier to shed
    _paint_rect(wm, 32, 52, 37, 63, ":", TILE_ROAD)         # North into Orchard
    _paint_rect(wm, 50, 65, 76, 67, ":", TILE_ROAD)         # South dike approach -> Causeway

    # 2. THE SUNKEN ORCHARD (NW: X 8..74, Y 20..56)
    _paint_rect(wm, 8, 22, 74, 56, _earth_glyph, TILE_MUD)
    # Scenic marsh water pockets in orchard
    _paint_rect(wm, 12, 42, 24, 51, _water_glyph, TILE_WATER)
    _paint_rect(wm, 44, 24, 56, 29, _water_glyph, TILE_WATER)
    # North-South and East-West orchard cart tracks
    _paint_rect(wm, 32, 29, 37, 56, ":", TILE_ROAD)
    _paint_rect(wm, 22, 34, 78, 37, ":", TILE_ROAD)
    _paint_rect(wm, 55, 37, 60, 54, ":", TILE_ROAD)
    # Orchard apple trees (avoiding paths)
    orchard_trees = (
        (14, 24), (20, 24), (28, 25), (41, 26), (62, 25), (69, 27),
        (13, 39), (26, 40), (42, 39), (48, 41), (66, 42), (70, 48),
        (29, 47), (45, 50), (14, 53), (64, 52),
    )
    for tx, ty in orchard_trees:
        wm.set_tile(tx, ty, "Y", TILE_TREE)
    # Northwest Root-House holding Clapper I behind brittle salt crust
    _paint_hollow_box(wm, 12, 25, 24, 33, "#", _stone_glyph, TILE_STONE)
    wm.set_tile(24, 29, "%", TILE_SALT)
    _paint_rect(wm, 25, 29, 32, 30, ":", TILE_ROAD)
    # Orchard Belfry Plinth (Bell I)
    _paint_rect(wm, 54, 31, 61, 37, _stone_glyph, TILE_STONE)
    wm.set_tile(55, 32, "+", TILE_PILLAR)
    wm.set_tile(60, 32, "+", TILE_PILLAR)

    # 3. BRAMWELL CAUSEWAY (Center: X 70..148, Y 44..84)
    # Deep water surrounds dike; dry ramp connects West -> East across Y 53..59
    _paint_rect(wm, 70, 52, 82, 68, _earth_glyph, TILE_MUD)   # Western dike head
    _paint_rect(wm, 80, 54, 148, 58, "=", TILE_STONE)         # Elevated stone seawall causeway!
    # Broken masonry parapets along north/south rim of causeway
    for px in range(82, 144, 6):
        if px not in (106, 112):
            wm.set_tile(px, 53, "#", TILE_WALL)
            wm.set_tile(px + 1, 53, "#", TILE_WALL)
            wm.set_tile(px, 59, "#", TILE_WALL)
    # Central Toll-Arch (wide 3-tile high passage through X 108..112)
    _paint_rect(wm, 108, 51, 112, 53, "#", TILE_WALL)
    _paint_rect(wm, 108, 59, 112, 61, "#", TILE_WALL)
    # Submerged stepping stones South (orthogonal 4-way shoal stones -> Beacon Islet)
    sx, sy = 96, 59
    while sy < 76:
        wm.set_tile(sx, sy, "~", TILE_SHOAL)
        wm.set_tile(sx + 1, sy, "~", TILE_SHOAL)
        sy += 1
        if sy % 2 == 0:
            wm.set_tile(sx, sy, "~", TILE_SHOAL)
            sx += 1
    while sx <= 117:
        wm.set_tile(sx, 76, "~", TILE_SHOAL)
        sx += 1
    _paint_rect(wm, 117, 73, 129, 80, _earth_glyph, TILE_MUD)  # Secret Beacon Islet!
    wm.set_tile(123, 74, "+", TILE_PILLAR)

    # 4. ST. JUDE'S FLOODED NAVE (North-Center: X 74..144, Y 6..43)
    _paint_rect(wm, 74, 34, 86, 44, _earth_glyph, TILE_MUD)   # South-west chapel forecourt
    # Cathedral stone hull
    _paint_hollow_box(wm, 78, 7, 138, 41, "#", ".", TILE_STONE)
    wm.set_tile(78, 35, ".", TILE_STONE)                       # West entrance from Orchard
    wm.set_tile(78, 36, ".", TILE_STONE)
    wm.set_tile(94, 41, ".", TILE_STONE)                       # South doorway down toward Dike
    wm.set_tile(95, 41, ".", TILE_STONE)
    _paint_rect(wm, 93, 42, 97, 54, ":", TILE_ROAD)            # Flagstone spur down to Causeway!
    # Flooded dark choir trench dividing West Nave & East Bell-Tower
    _paint_rect(wm, 108, 8, 116, 40, _water_glyph, TILE_WATER)
    # Choir pews & pillars on west side
    for py in (22, 25, 31, 34):
        _paint_rect(wm, 86, py, 91, py, "=", TILE_WALL)
    wm.set_tile(82, 20, "+", TILE_PILLAR)
    wm.set_tile(82, 30, "+", TILE_PILLAR)
    wm.set_tile(102, 20, "+", TILE_PILLAR)
    wm.set_tile(102, 30, "+", TILE_PILLAR)
    # Northwest Reliquary Alcove (guarded by salt seam & warden) holding Clapper II
    _paint_hollow_box(wm, 78, 7, 106, 17, "#", ".", TILE_STONE)
    wm.set_tile(92, 17, ".", TILE_STONE)                       # Alcove doorway
    wm.set_tile(93, 17, ".", TILE_STONE)
    # Choir gate at bridge entrance (Y: 20..22, starts locked "+" until Confessional Pulley at (83, 12) is pulled!)
    wm.set_tile(108, 20, "+", TILE_GATE)
    wm.set_tile(108, 21, "+", TILE_GATE)
    wm.set_tile(108, 22, "+", TILE_GATE)
    # Bridge itself east side wait (turns to TILE_BRIDGE when pulley pulled, plus gate turns STONE)
    # East Belfry platform cleanly paved inside X 117..137
    _paint_rect(wm, 117, 9, 136, 39, ".", TILE_STONE)
    wm.set_tile(125, 12, "+", TILE_PILLAR)
    wm.set_tile(129, 12, "+", TILE_PILLAR)
    # Secret high east bridge out of St. Jude's toward High Foundry western vent seam!
    wm.set_tile(138, 27, ".", TILE_STONE)
    wm.set_tile(138, 28, ".", TILE_STONE)
    _paint_rect(wm, 139, 27, 151, 28, "=", TILE_TIMBER)

    # 5. KILN-TOWN OF REDWICK (Mid-East: X 146..204, Y 36..68)
    _paint_rect(wm, 146, 38, 202, 67, _earth_glyph, TILE_MUD)
    _paint_rect(wm, 148, 54, 178, 57, ":", TILE_ROAD)         # Main cobbled street from Causeway
    _paint_rect(wm, 171, 34, 175, 69, ":", TILE_ROAD)         # North-south town avenue -> Sluice & Salt-Flats
    # Terracotta Beehive Kilns (glowing circular stone ovens)
    for kx, ky in ((154, 42), (185, 42), (191, 49)):
        _paint_hollow_box(wm, kx, ky, kx + 5, ky + 4, "#", "*", TILE_WALL)
    # Smith Marrow's open-front forge pavilion (clear roof corners, open south)
    _paint_rect(wm, 157, 46, 166, 47, "#", TILE_WALL)
    _paint_rect(wm, 158, 48, 165, 52, "=", TILE_STONE)
    # Redwick Bell Spire (Bell III)
    _paint_rect(wm, 170, 39, 176, 44, "=", TILE_STONE)
    wm.set_tile(171, 40, "+", TILE_PILLAR)
    wm.set_tile(175, 40, "+", TILE_PILLAR)
    # Soot-choked Warehouse SE of Redwick holding Clapper III
    _paint_hollow_box(wm, 180, 54, 198, 65, "#", ".", TILE_STONE)
    wm.set_tile(180, 59, ".", TILE_STONE)
    wm.set_tile(180, 60, ".", TILE_STONE)
    _paint_rect(wm, 175, 59, 180, 60, ":", TILE_ROAD)

    # 6. LOW SUNDER SALT-FLATS & WRECK BEACH (SE: X 146..236, Y 68..86)
    _paint_rect(wm, 148, 69, 234, 84, _salt_sand_glyph, TILE_MUD)
    _paint_rect(wm, 169, 68, 175, 76, ":", TILE_ROAD)         # Ramp down from Redwick
    _paint_rect(wm, 174, 74, 224, 76, _salt_sand_glyph, TILE_ROAD)
    # Beached Dredger Hull "SS Cormorant" (navigable hull deck!)
    _paint_hollow_box(wm, 196, 72, 228, 82, "#", "=", TILE_TIMBER)
    wm.set_tile(196, 76, ".", TILE_TIMBER)                     # Breached prow entrance
    wm.set_tile(196, 77, ".", TILE_TIMBER)
    wm.set_tile(216, 72, ".", TILE_TIMBER)                     # North deck gangway -> Harbor Crane
    wm.set_tile(217, 72, ".", TILE_TIMBER)
    # Aft hold inner bulkhead blocked by salt pillar holding Clapper IV
    _paint_rect(wm, 219, 73, 219, 81, "#", TILE_WALL)
    wm.set_tile(219, 77, "%", TILE_SALT)
    # Harbor Crane platform north-east of Flats -> Redwick east crane track
    _paint_rect(wm, 214, 62, 226, 71, "=", TILE_STONE)
    _paint_rect(wm, 200, 63, 214, 65, "=", TILE_TIMBER)       # Crane causeway back to Redwick

    # 7. THE HIGH FOUNDRY & BELL-DAM (NE: X 146..235, Y 5..35)
    _paint_rect(wm, 148, 6, 234, 34, ".", TILE_STONE)
    # South wall dividing Redwick except at Sluice Gate (172..174, 35) & West Vent Seam (151, 27..28)
    _paint_rect(wm, 147, 35, 235, 36, "#", TILE_WALL)
    wm.set_tile(172, 35, "+", TILE_GATE)
    wm.set_tile(173, 35, "+", TILE_GATE)
    wm.set_tile(174, 35, "+", TILE_GATE)
    wm.set_tile(172, 36, ":", TILE_ROAD)
    wm.set_tile(173, 36, ":", TILE_ROAD)
    wm.set_tile(174, 36, ":", TILE_ROAD)
    # West Vent Tunnel from St. Jude's East Bridge
    _paint_rect(wm, 147, 25, 148, 34, "#", TILE_WALL)
    wm.set_tile(148, 27, "%", TILE_SALT)
    wm.set_tile(148, 28, "%", TILE_SALT)
    wm.set_tile(147, 27, "=", TILE_TIMBER)
    wm.set_tile(147, 28, "=", TILE_TIMBER)
    # Glowing Molten Slag Spillways (with riveted catwalk crossings!)
    _paint_rect(wm, 158, 12, 182, 14, "*", TILE_SLAG)
    _paint_rect(wm, 166, 12, 169, 14, "=", TILE_TIMBER)        # West gantry crossing
    _paint_rect(wm, 188, 26, 226, 28, "*", TILE_SLAG)
    _paint_rect(wm, 198, 26, 202, 28, "=", TILE_TIMBER)        # South arena gantry
    # Grand Foundry Climax Arena & Master Dam-Belfry
    wm.set_tile(192, 12, "+", TILE_PILLAR)
    wm.set_tile(226, 12, "+", TILE_PILLAR)
    wm.set_tile(192, 23, "+", TILE_PILLAR)
    wm.set_tile(226, 23, "+", TILE_PILLAR)
    _paint_rect(wm, 208, 7, 218, 12, "=", TILE_STONE)

    # Interactive world entities
    wm.belfries = [
        Belfry("bell_orchard", 0, "Orchard Belfry", "orchard", 58, 34, "clapper_orchard"),
        Belfry("bell_nave", 1, "St. Jude's Tenor", "nave", 127, 14, "clapper_nave"),
        Belfry("bell_redwick", 2, "Redwick Kiln-Spire", "redwick", 173, 41, "clapper_redwick"),
        Belfry("bell_breakwater", 3, "Breakwater Crane", "saltflats", 220, 65, "clapper_breakwater"),
        Belfry("bell_foundry", 4, "Master Dam Bell", "foundry", 213, 9, "clapper_foundry"),
    ]

    wm.braziers = [
        Brazier("braz_pier", "Tidemouth Pier Brazier", "tidemouth", 24, 66),
        Brazier("braz_orchard", "Orchard Wall Brazier", "orchard", 40, 46),
        Brazier("braz_nave", "St. Jude Altar Candle-Pit", "nave", 88, 28),
        Brazier("braz_redwick", "Redwick Square Furnace", "redwick", 168, 52),
        Brazier("braz_foundry", "Foundry Gate Brazier", "foundry", 168, 22),
    ]

    wm.npcs = [
        NpcData("hester", "Old Hester", "H", 27, 67, "tidemouth", "hester_root"),
        NpcData("tomas", "Prior Tomas", "T", 92, 27, "nave", "tomas_root"),
        NpcData("marrow", "Smith Marrow", "M", 161, 50, "redwick", "marrow_root"),
        NpcData("callum", "Watchman Callum", "C", 175, 53, "redwick", "callum_root"),
        NpcData("pip", "Apprentice Pip", "P", 206, 77, "saltflats", "pip_root"),
    ]

    wm.interactables = [
        Interactable("pulley_choir", "pulley", "Confessional Choir Winch", "&", 83, 12),
        Interactable("board_redwick", "noticeboard", "Redwick Parish Board", "N", 177, 52),
    ]

    wm.pickups = [
        # Parish Clappers
        PickupItem("clapper_orchard", "clapper", "Orchard Clapper", "!", 18, 29, "bell_orchard"),
        PickupItem("clapper_nave", "clapper", "Nave Tenor Clapper", "!", 99, 11, "bell_nave"),
        PickupItem("clapper_redwick", "clapper", "Redwick Chime Clapper", "!", 193, 60, "bell_redwick"),
        PickupItem("clapper_breakwater", "clapper", "Breakwater Anchor Clapper", "!", 224, 77, "bell_breakwater"),
        # Supplies, lore & relics
        PickupItem("oil_shed", "oil", "Amber Whale-Oil Jar", "o", 51, 62, amount=35),
        PickupItem("brass_shed", "brass", "Stamped Toll-Coins", "$", 52, 61, amount=18),
        PickupItem("note_pier", "note", "Tidemouth Milestone", "?", 31, 61, "note_pier"),
        PickupItem("poultice_orchard", "poultice", "Pressed Bog-Mint", "+", 16, 48, amount=1),
        PickupItem("brass_causeway_west", "brass", "Fallen Helm Buckle", "$", 76, 61, amount=20),
        PickupItem("relic_ringlet", "relic", "Tide-Stealer's Ringlet", "*", 123, 76, "ringlet"),
        PickupItem("note_shoal", "note", "Drowned Tide Table", "?", 125, 77, "note_shoal"),
        PickupItem("oil_vestry", "oil", "Choir Tallows", "o", 82, 9, amount=35),
        PickupItem("poultice_redwick", "poultice", "Kiln-Bandage Roll", "+", 191, 56, amount=2),
        PickupItem("brass_flats", "brass", "Cormorant Logbox", "$", 199, 79, amount=35),
        PickupItem("note_foundry", "note", "Magistrate's Sealing Order", "?", 180, 20, "note_foundry"),
    ]

    wm.enemies = [
        # Orchard
        EnemyTemplate("e_hound_1", "hound", "Bog-Hound", "d", 36, 44, "orchard", 18, 8, 5.4, 0.55, 1.3, 11, 10),
        EnemyTemplate("e_hound_2", "hound", "Bog-Hound", "d", 28, 31, "orchard", 18, 8, 5.4, 0.55, 1.3, 11, 10),
        EnemyTemplate("e_picker_1", "picker", "Mire-Picker", "p", 50, 41, "orchard", 26, 10, 3.6, 0.65, 1.5, 12, 14),
        # Causeway
        EnemyTemplate("e_warden_1", "warden", "Pike-Warden", "W", 94, 56, "causeway", 38, 14, 2.7, 0.72, 1.8, 12, 22),
        EnemyTemplate("e_picker_2", "picker", "Bridge Lurker", "p", 118, 56, "causeway", 28, 11, 3.8, 0.62, 1.4, 12, 15),
        EnemyTemplate("e_warden_2", "warden", "Causeway Warden", "W", 136, 56, "causeway", 42, 15, 2.7, 0.72, 1.8, 12, 24),
        # St Jude's Nave
        EnemyTemplate("e_hound_3", "hound", "Choir Curs", "d", 94, 22, "nave", 20, 9, 5.5, 0.52, 1.2, 11, 12),
        EnemyTemplate("e_warden_3", "warden", "Vestry Halberdier", "W", 95, 12, "nave", 44, 15, 2.6, 0.70, 1.8, 11, 25),
        EnemyTemplate("e_picker_3", "picker", "Belfry Watch", "p", 126, 28, "nave", 30, 11, 3.9, 0.60, 1.4, 12, 16),
        # Redwick Warehouse
        EnemyTemplate("e_crawler_1", "crawler", "Cinder-Crawler", "c", 186, 58, "redwick", 28, 12, 4.6, 0.50, 1.2, 12, 18),
        EnemyTemplate("e_crawler_2", "crawler", "Soot-Hound", "c", 191, 62, "redwick", 30, 12, 4.8, 0.50, 1.2, 12, 18),
        # Salt Flats
        EnemyTemplate("e_stalker_1", "stalker", "Silt-Stalker", "S", 186, 76, "saltflats", 36, 14, 4.2, 0.58, 1.4, 13, 24, stealth=True),
        EnemyTemplate("e_stalker_2", "stalker", "Dredger-Ghost", "S", 204, 78, "saltflats", 38, 15, 4.3, 0.58, 1.4, 13, 26, stealth=True),
        EnemyTemplate("e_warden_4", "warden", "Breakwater Sentinel", "W", 220, 68, "saltflats", 48, 16, 2.8, 0.68, 1.7, 12, 28),
        # High Foundry approach
        EnemyTemplate("e_crawler_3", "crawler", "Slag-Hound", "c", 162, 26, "foundry", 34, 13, 4.7, 0.48, 1.1, 12, 20),
        EnemyTemplate("e_warden_5", "warden", "Foundry Guard", "W", 177, 19, "foundry", 50, 16, 2.8, 0.66, 1.6, 12, 30),
        # Boss
        EnemyTemplate(
            "boss_vane", "vane", "Magistrate Vane", "V", 212, 18, "foundry",
            max_hp=155, damage=20, speed=3.5, windup_s=0.68, cooldown_s=1.55,
            aggro_range=15, brass_drop=100, is_boss=True,
        ),
    ]

    # Handcrafted ASCII structural details overlaid artistically over static buildings
    wm.decor_lines = [
        # Tidemouth Pier & Estuary Harbor
        DecorativeFeature(
            10,
            53,
            [
                "   .|.   ",
                "  /_*_\\  ",
                " -|:::|- ",
                "  |:.:|  ",
                " /|:::|\\ ",
                "/=|::.|=\\",
            ],
            min_grade=3,
            kind="lighthouse",
        ),
        DecorativeFeature(11, 60, ["[=]  [o]", "   ..   ", "[#]  [=]"], min_grade=2, kind="interior"),
        DecorativeFeature(5, 72, ["    /|   ", "   / |   ", " /===+\\  ", " \\_____/ "], min_grade=2, kind="skiff"),
        DecorativeFeature(8, 61, ["  /|  ", " /==\\ ", " \\__/ "], min_grade=2, kind="skiff"),
        DecorativeFeature(29, 73, ["   /|   ", " /====\\ ", " \\____/ "], min_grade=2, kind="skiff"),
        DecorativeFeature(18, 65, ["[o][#]"], min_grade=2, kind="prop"),
        DecorativeFeature(8, 71, ["|==|==|==|==|==|==|"], min_grade=2, kind="wharf"),
        DecorativeFeature(45, 58, [" /========\\ ", "/==========\\"], min_grade=2, kind="roof"),
        DecorativeFeature(47, 60, ["[=]  [#]"], min_grade=2, kind="interior"),
        DecorativeFeature(28, 60, [" _|_ ", "|(I)|"], min_grade=2, kind="prop"),
        DecorativeFeature(64, 71, ["\\|/  \\|/"], min_grade=1, kind="reeds"),
        # Sunken Orchard Reeds, Ruined Mill, Root-House & Belfry
        *[
            DecorativeFeature(tx - 2, ty - 1, [" .-. ", "( % )", "  Y  "], min_grade=2, kind="tree")
            for tx, ty in orchard_trees
            if ty < 52
        ],
        DecorativeFeature(13, 45, ["\\|/ i \\|/", " ~ . ~ "], min_grade=1, kind="reeds"),
        DecorativeFeature(46, 26, ["i \\|/  i"], min_grade=1, kind="reeds"),
        DecorativeFeature(13, 24, ["/===+===\\"], min_grade=2, kind="roof"),
        DecorativeFeature(13, 27, ["[o] [=]"], min_grade=2, kind="interior"),
        DecorativeFeature(54, 29, ["  /^\\  ", " |(_)| ", "/==B==\\", "|     |"], min_grade=3, kind="belfry"),
        # Bramwell Causeway Arches, Toll-Gate & South Beacon Cairn
        DecorativeFeature(84, 59, ["| /==\\ |", "| |  | |"], min_grade=2, kind="arch"),
        DecorativeFeature(98, 59, ["| /==\\ |", "| |  | |"], min_grade=2, kind="arch"),
        DecorativeFeature(120, 59, ["| /==\\ |", "| |  | |"], min_grade=2, kind="arch"),
        DecorativeFeature(134, 59, ["| /==\\ |", "| |  | |"], min_grade=2, kind="arch"),
        DecorativeFeature(108, 51, ["/#===#\\", "|v| |v|"], min_grade=2, kind="gatehouse"),
        DecorativeFeature(108, 59, ["|=====|", "\\#===#/"], min_grade=2, kind="gatehouse"),
        DecorativeFeature(120, 72, ["  /|\\  ", " / * \\ ", "[=====]"], min_grade=3, kind="cairn"),
        # St. Jude's Flooded Nave Cathedral & Tenor Spire
        DecorativeFeature(80, 5, ["  /^\\     ( * )     /^\\  ", " /===\\   /|===|\\   /===\\ "], min_grade=2, kind="nave"),
        DecorativeFeature(109, 14, ["~~~===~~~", "  |   |  "], min_grade=1, kind="wreck"),
        DecorativeFeature(109, 31, ["~~~===~~~", " /     \\ "], min_grade=1, kind="wreck"),
        DecorativeFeature(89, 27, ["i * i"], min_grade=3, kind="altar"),
        DecorativeFeature(124, 9, ["  /|\\  ", " /^B^\\ ", " |(|)| ", "/=====\\"], min_grade=3, kind="belfry"),
        DecorativeFeature(120, 12, ["[+] [=]", "       ", "[+] [=]"], min_grade=2, kind="nave"),
        # Kiln-Town of Redwick Coke Ovens, Marrow Forge & Spire
        DecorativeFeature(154, 40, [" .~.~. ", " /###\\ ", "| (*) |"], min_grade=2, kind="kiln"),
        DecorativeFeature(185, 40, [" .~.~. ", " /###\\ ", "| (*) |"], min_grade=2, kind="kiln"),
        DecorativeFeature(191, 47, [" .~.~. ", " /###\\ ", "| (*) |"], min_grade=2, kind="kiln"),
        DecorativeFeature(157, 45, [" /======\\ ", "/========\\"], min_grade=2, kind="roof"),
        DecorativeFeature(159, 48, ["[**] [#]"], min_grade=3, kind="forge"),
        DecorativeFeature(170, 37, ["  /^\\  ", " /(|)\\ ", " |===| "], min_grade=3, kind="belfry"),
        DecorativeFeature(182, 56, ["[#] [o] [o]"], min_grade=2, kind="warehouse"),
        DecorativeFeature(182, 63, ["[=] [=] [#]"], min_grade=2, kind="warehouse"),
        # Low Sunder Flats, Whalebone Ribs, SS Cormorant & Breakwater Crane
        DecorativeFeature(198, 69, ["   /|\\      /|\\   ", "  /_|_\\    /_|_\\  ", "__/___\\____/___\\__"], min_grade=2, kind="wreck"),
        DecorativeFeature(195, 73, [" /==\\", "|    ", " \\==/"], min_grade=2, kind="wreck"),
        DecorativeFeature(201, 82, ["  \\==\\__@"], min_grade=2, kind="wreck"),
        DecorativeFeature(156, 73, ["( /   \\ )", "  \\___/  "], min_grade=2, kind="bones"),
        DecorativeFeature(179, 80, [" \\ | / ", "  \\|/  "], min_grade=2, kind="bones"),
        DecorativeFeature(215, 61, ["  /|==+==>", " /_|_B_\\  ", "/       \\ "], min_grade=3, kind="crane"),
        # High Foundry Gantries, Smokestacks & Master Dam Bastion
        DecorativeFeature(154, 4, ["  |##|    |##|  ", "  |##|    |##|  "], min_grade=2, kind="foundry"),
        DecorativeFeature(164, 11, ["|=/==\\=|"], min_grade=2, kind="gantry"),
        DecorativeFeature(196, 25, ["|=/==\\=|"], min_grade=2, kind="gantry"),
        DecorativeFeature(186, 15, ["(___)"], min_grade=2, kind="vat"),
        DecorativeFeature(208, 5, ["  /__B__\\  ", " /| (|) |\\ ", "|==|===|==|"], min_grade=4, kind="belfry"),
    ]

    return wm
