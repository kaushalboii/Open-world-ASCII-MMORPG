"""Domain models, unit/tower balance tables, maps, and 10+ wave definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

from .pathfinding import TilePos

MAP_COLS = 15
MAP_ROWS = 8
TILE_W = 5
TILE_H = 3

TARGET_MODES: Tuple[str, ...] = (
    "first",
    "last",
    "closest",
    "strongest",
    "weakest",
)

BUILD_ORDER: Tuple[str, ...] = (
    "pulse",
    "tesla",
    "mortar",
    "cryo",
    "barricade",
)


class ScreenState(str, Enum):
    MENU = "menu"
    PLAYING = "playing"
    PAUSED = "paused"
    STUDIO = "studio"
    VICTORY = "victory"
    GAMEOVER = "gameover"


class EnemyFSM(str, Enum):
    MARCHING = "marching"
    BREACHING = "breaching"


@dataclass(frozen=True)
class TowerDef:
    kind: str
    hotkey: str
    name: str
    badge: str
    cost: int
    range_tiles: float
    min_range_tiles: float
    fire_interval: float
    damage: float
    splash_radius: float
    chain_count: int
    slow_factor: float
    slow_duration: float
    can_hit_air: bool
    is_barricade: bool
    max_hp: float
    projectile_glyph: str
    description: str


TOWER_DEFS: Dict[str, TowerDef] = {
    "pulse": TowerDef(
        kind="pulse",
        hotkey="1",
        name="Pulse Repeater",
        badge="[=|=]",
        cost=50,
        range_tiles=3.3,
        min_range_tiles=0.0,
        fire_interval=0.46,
        damage=16.0,
        splash_radius=0.0,
        chain_count=1,
        slow_factor=0.0,
        slow_duration=0.0,
        can_hit_air=True,
        is_barricade=False,
        max_hp=120.0,
        projectile_glyph="->",
        description="Rapid (->) Gnd + Air",
    ),
    "tesla": TowerDef(
        kind="tesla",
        hotkey="2",
        name="Tesla Coil",
        badge="(☼)",
        cost=75,
        range_tiles=2.9,
        min_range_tiles=0.0,
        fire_interval=1.15,
        damage=28.0,
        splash_radius=0.0,
        chain_count=2,
        slow_factor=0.0,
        slow_duration=0.0,
        can_hit_air=True,
        is_barricade=False,
        max_hp=120.0,
        projectile_glyph="⚡",
        description="Chain (⚡) +25% Armor",
    ),
    "mortar": TowerDef(
        kind="mortar",
        hotkey="3",
        name="Siege Mortar",
        badge="[███]",
        cost=90,
        range_tiles=4.8,
        min_range_tiles=1.2,
        fire_interval=2.10,
        damage=50.0,
        splash_radius=1.35,
        chain_count=1,
        slow_factor=0.0,
        slow_duration=0.0,
        can_hit_air=False,
        is_barricade=False,
        max_hp=150.0,
        projectile_glyph="***",
        description="Arc (***) Ground AoE",
    ),
    "cryo": TowerDef(
        kind="cryo",
        hotkey="4",
        name="Cryo Emitter",
        badge="<◈>",
        cost=65,
        range_tiles=2.8,
        min_range_tiles=0.0,
        fire_interval=0.90,
        damage=10.0,
        splash_radius=0.0,
        chain_count=1,
        slow_factor=0.45,
        slow_duration=2.4,
        can_hit_air=True,
        is_barricade=False,
        max_hp=115.0,
        projectile_glyph="*>",
        description="Frost (*>) 45% Slow",
    ),
    "barricade": TowerDef(
        kind="barricade",
        hotkey="5",
        name="Blast Barricade",
        badge="[██]",
        cost=15,
        range_tiles=0.0,
        min_range_tiles=0.0,
        fire_interval=0.0,
        damage=0.0,
        splash_radius=0.0,
        chain_count=0,
        slow_factor=0.0,
        slow_duration=0.0,
        can_hit_air=False,
        is_barricade=True,
        max_hp=160.0,
        projectile_glyph="█",
        description="Wall ███→▓▓▓→▒▒▒→░░░",
    ),
}


@dataclass(frozen=True)
class EnemyDef:
    kind: str
    name: str
    glyph: str
    hp: float
    armor: float
    speed: float
    bounty: int
    core_damage: float
    barricade_dps: float
    flying: bool = False
    is_boss: bool = False
    emp_interval: float = 0.0
    emp_damage: float = 0.0


ENEMY_DEFS: Dict[str, EnemyDef] = {
    "scout": EnemyDef(
        kind="scout",
        name="Swarm Runner",
        glyph=">o>",
        hp=44.0,
        armor=0.0,
        speed=2.65,
        bounty=7,
        core_damage=8.0,
        barricade_dps=16.0,
    ),
    "grunt": EnemyDef(
        kind="grunt",
        name="Shock Trooper",
        glyph="[X]",
        hp=96.0,
        armor=0.0,
        speed=1.55,
        bounty=11,
        core_damage=12.0,
        barricade_dps=24.0,
    ),
    "tank": EnemyDef(
        kind="tank",
        name="Shield Juggernaut",
        glyph="[▓]",
        hp=185.0,
        armor=115.0,
        speed=1.02,
        bounty=20,
        core_damage=18.0,
        barricade_dps=34.0,
    ),
    "sapper": EnemyDef(
        kind="sapper",
        name="Siege Sapper",
        glyph="{!}",
        hp=115.0,
        armor=35.0,
        speed=1.65,
        bounty=16,
        core_damage=14.0,
        barricade_dps=52.0,
    ),
    "drone": EnemyDef(
        kind="drone",
        name="Sky Wraith",
        glyph="<v>",
        hp=80.0,
        armor=0.0,
        speed=2.20,
        bounty=13,
        core_damage=10.0,
        barricade_dps=0.0,
        flying=True,
    ),
    "boss": EnemyDef(
        kind="boss",
        name="Dread Colossus",
        glyph="[Ω]",
        hp=760.0,
        armor=280.0,
        speed=0.76,
        bounty=85,
        core_damage=45.0,
        barricade_dps=80.0,
        flying=False,
        is_boss=True,
        emp_interval=3.4,
        emp_damage=24.0,
    ),
}


@dataclass(frozen=True)
class WaveGroup:
    enemy_kind: str
    count: int
    interval: float
    delay_before: float = 0.0
    spawn_index: Optional[int] = None


@dataclass(frozen=True)
class WaveSpec:
    wave_number: int
    title: str
    hp_multiplier: float
    groups: Tuple[WaveGroup, ...]

    @property
    def total_enemies(self) -> int:
        return sum(g.count for g in self.groups)

    def composition_summary(self) -> str:
        counts: Dict[str, int] = {}
        for g in self.groups:
            counts[g.enemy_kind] = counts.get(g.enemy_kind, 0) + g.count
        parts = [f"{qty}x{ENEMY_DEFS[k].glyph}" for k, qty in counts.items()]
        return " ".join(parts)


WAVE_DEFS: Tuple[WaveSpec, ...] = (
    WaveSpec(
        1,
        "First Probe",
        1.00,
        (WaveGroup("grunt", 7, 1.05),),
    ),
    WaveSpec(
        2,
        "Skirmish Rush",
        1.10,
        (
            WaveGroup("scout", 8, 0.55),
            WaveGroup("grunt", 5, 0.95, delay_before=1.2),
        ),
    ),
    WaveSpec(
        3,
        "Iron Vanguard",
        1.22,
        (
            WaveGroup("grunt", 6, 0.90),
            WaveGroup("tank", 3, 1.65, delay_before=0.8),
        ),
    ),
    WaveSpec(
        4,
        "Wall Breakers",
        1.34,
        (
            WaveGroup("scout", 6, 0.50),
            WaveGroup("sapper", 4, 1.10, delay_before=0.7),
            WaveGroup("grunt", 4, 0.90, delay_before=0.5),
        ),
    ),
    WaveSpec(
        5,
        "Sky Raid",
        1.48,
        (
            WaveGroup("grunt", 6, 0.85),
            WaveGroup("drone", 6, 0.80, delay_before=0.9),
        ),
    ),
    WaveSpec(
        6,
        "Armored Convoy",
        1.65,
        (
            WaveGroup("tank", 5, 1.35),
            WaveGroup("sapper", 4, 0.95, delay_before=0.6),
            WaveGroup("scout", 6, 0.45, delay_before=0.6),
        ),
    ),
    WaveSpec(
        7,
        "Combined Arms",
        1.85,
        (
            WaveGroup("scout", 8, 0.42),
            WaveGroup("tank", 4, 1.30, delay_before=0.7),
            WaveGroup("drone", 5, 0.75, delay_before=0.6),
            WaveGroup("sapper", 4, 0.95, delay_before=0.5),
        ),
    ),
    WaveSpec(
        8,
        "Swarm Stampede",
        2.05,
        (
            WaveGroup("scout", 16, 0.34),
            WaveGroup("drone", 6, 0.65, delay_before=0.8),
            WaveGroup("tank", 4, 1.15, delay_before=0.6),
        ),
    ),
    WaveSpec(
        9,
        "Bastion Breaker",
        2.28,
        (
            WaveGroup("tank", 6, 1.10),
            WaveGroup("sapper", 6, 0.80, delay_before=0.5),
            WaveGroup("drone", 6, 0.65, delay_before=0.5),
            WaveGroup("grunt", 6, 0.75, delay_before=0.4),
        ),
    ),
    WaveSpec(
        10,
        "DREAD COLOSSUS",
        2.50,
        (
            WaveGroup("boss", 1, 2.0),
            WaveGroup("tank", 5, 1.10, delay_before=0.8),
            WaveGroup("sapper", 5, 0.85, delay_before=0.6),
            WaveGroup("drone", 6, 0.65, delay_before=0.5),
        ),
    ),
)


def get_wave_spec(wave_number: int) -> WaveSpec:
    """Return curated wave 1..10 or generate endless Wave 11+."""
    if 1 <= wave_number <= len(WAVE_DEFS):
        return WAVE_DEFS[wave_number - 1]
    extra = wave_number - len(WAVE_DEFS)
    hp_mult = round(2.50 * (1.16 ** extra), 2)
    groups: List[WaveGroup] = [
        WaveGroup("tank", 4 + extra // 2, max(0.65, 1.15 - extra * 0.03)),
        WaveGroup("sapper", 4 + extra // 2, 0.80, delay_before=0.5),
        WaveGroup("drone", 5 + extra // 2, 0.60, delay_before=0.5),
        WaveGroup("scout", 8 + extra, 0.35, delay_before=0.4),
    ]
    if wave_number % 5 == 0:
        groups.insert(0, WaveGroup("boss", 1 + extra // 10, 2.0))
    title = f"Endless Siege {wave_number}"
    return WaveSpec(wave_number, title, hp_mult, tuple(groups))


@dataclass(frozen=True)
class MapPreset:
    map_id: str
    name: str
    description: str
    starting_gold: int
    starting_core_hp: float
    rows: Tuple[str, ...]

    def parse(
        self,
    ) -> Tuple[List[TilePos], TilePos, set, set]:
        """Return (spawns, goal, cliff_tiles, road_tiles)."""
        spawns: List[TilePos] = []
        goal: Optional[TilePos] = None
        cliffs = set()
        roads = set()
        for r, line in enumerate(self.rows):
            for c, ch in enumerate(line):
                pos = (c, r)
                if ch == "S":
                    spawns.append(pos)
                elif ch == "G":
                    goal = pos
                elif ch == "#":
                    cliffs.add(pos)
                elif ch == "=":
                    roads.add(pos)
        if not spawns or goal is None:
            raise ValueError(f"Invalid map preset {self.map_id}: missing S or G")
        return spawns, goal, cliffs, roads


MAP_PRESETS: Tuple[MapPreset, ...] = (
    MapPreset(
        map_id="twin_bastion",
        name="Twin Bastion Gate",
        description="Two western portals merge through twin obsidian archways.",
        starting_gold=165,
        starting_core_hp=100.0,
        rows=(
            "###.........###",
            "S==.........==#",
            "#....##.##....#",
            "#............=G",
            "#....##.##....#",
            "#.............#",
            "S==.........==#",
            "###.........###",
        ),
    ),
    MapPreset(
        map_id="spiral_switchback",
        name="Spiral Switchback",
        description="Tiered canyon bridges reward maze-lengthening killboxes.",
        starting_gold=175,
        starting_core_hp=100.0,
        rows=(
            "S==.....#.....#",
            "###.###.#.###.#",
            "#...=.....=..=#",
            "#.###.###.###.#",
            "#.............#",
            "#.###.#####.#.#",
            "#.............#",
            "#########...==G",
        ),
    ),
)


@dataclass
class Tower:
    uid: int
    kind: str
    tile: TilePos
    level: int = 1
    target_mode: str = "first"
    cooldown: float = 0.0
    aim: str = "R"
    fire_flash: float = 0.0
    total_invested: int = 0
    total_damage: float = 0.0
    kills: int = 0
    hp: float = 120.0
    max_hp: float = 120.0

    @property
    def definition(self) -> TowerDef:
        return TOWER_DEFS[self.kind]

    @property
    def is_barricade(self) -> bool:
        return self.definition.is_barricade

    @property
    def hp_ratio(self) -> float:
        return 0.0 if self.max_hp <= 0 else max(0.0, min(1.0, self.hp / self.max_hp))

    @property
    def effective_damage(self) -> float:
        base = self.definition.damage
        return base * (1.0 + 0.42 * (self.level - 1))

    @property
    def effective_fire_interval(self) -> float:
        base = self.definition.fire_interval
        if base <= 0.0:
            return 0.0
        return base * (0.86 ** (self.level - 1))

    @property
    def effective_range(self) -> float:
        base = self.definition.range_tiles
        if base <= 0.0:
            return 0.0
        return base + 0.35 * (self.level - 1)

    @property
    def effective_chains(self) -> int:
        if self.definition.chain_count <= 1:
            return self.definition.chain_count
        return self.definition.chain_count + (self.level - 1)

    @property
    def upgrade_cost(self) -> Optional[int]:
        if self.level >= 3:
            return None
        factor = 0.85 if self.level == 1 else 1.45
        return max(10, int(round(self.definition.cost * factor)))

    @property
    def sell_refund(self) -> int:
        return int(round(self.total_invested * 0.70))


@dataclass
class Enemy:
    uid: int
    kind: str
    x: float
    y: float
    hp: float
    max_hp: float
    armor: float
    max_armor: float
    speed: float
    bounty: int
    core_damage: float
    barricade_dps: float
    flying: bool = False
    is_boss: bool = False
    fsm: EnemyFSM = EnemyFSM.MARCHING
    path: List[TilePos] = field(default_factory=list)
    waypoint_idx: int = 1
    progress_score: float = 0.0
    chill_timer: float = 0.0
    chill_factor: float = 0.0
    hit_flash: float = 0.0
    breach_target: Optional[TilePos] = None
    emp_timer: float = 0.0
    alive: bool = True

    @property
    def tile(self) -> TilePos:
        return (int(round(self.x)), int(round(self.y)))

    @property
    def hp_ratio(self) -> float:
        return 0.0 if self.max_hp <= 0 else max(0.0, min(1.0, self.hp / self.max_hp))

    @property
    def armor_ratio(self) -> float:
        return 0.0 if self.max_armor <= 0 else max(0.0, min(1.0, self.armor / self.max_armor))

    @property
    def effective_speed(self) -> float:
        if self.chill_timer > 0.0:
            return self.speed * max(0.25, 1.0 - self.chill_factor)
        return self.speed


@dataclass
class Projectile:
    uid: int
    kind: str  # "pulse" | "mortar" | "cryo"
    glyph: str
    source_tower_uid: int
    start_x: float
    start_y: float
    x: float
    y: float
    target_x: float
    target_y: float
    target_enemy_uid: Optional[int]
    speed: float
    damage: float
    splash_radius: float = 0.0
    slow_factor: float = 0.0
    slow_duration: float = 0.0
    progress: float = 0.0
    arc_height: float = 0.0
    trail: List[Tuple[float, float]] = field(default_factory=list)
    finished: bool = False


@dataclass
class LightningArc:
    segments: List[Tuple[float, float, float, float]]
    timer: float
    duration: float = 0.24


@dataclass
class BlastEffect:
    x: float
    y: float
    radius: float
    timer: float
    duration: float = 0.42
    kind: str = "mortar"  # "mortar" | "emp" | "breach" | "core_hit"


@dataclass
class FloatingPopup:
    x: float
    y: float
    text: str
    color: Tuple[int, int, int]
    timer: float
    duration: float = 0.85


@dataclass(frozen=True)
class GameEvent:
    kind: str
    message: str
