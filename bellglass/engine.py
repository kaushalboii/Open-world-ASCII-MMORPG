"""Core simulation, FOV lantern lighting, resonance combat, and atomic saves for Bellglass."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import math
import os
import random
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from bellglass.narrative import (
    BLADE_TIERS,
    LAMP_TIERS,
    NOTES_TEXT,
    DialogueNode,
    build_dialogue_nodes,
)
from bellglass.palette import (
    GRADE_BRIGHT,
    GRADE_DIM,
    GRADE_GHOST,
    GRADE_LIT,
    GRADE_MIST,
    GRID_COLS,
    GRID_ROWS,
    HINT_ROW,
    LOG_ROWS,
    LOG_TOP,
    VIEW_BOTTOM,
    VIEW_ROWS,
    VIEW_TOP,
    fit_line,
)
from bellglass.world_data import (
    REGION_META,
    TILE_BRIDGE,
    TILE_GATE,
    TILE_MUD,
    TILE_PILLAR,
    TILE_ROAD,
    TILE_SALT,
    TILE_SHOAL,
    TILE_SLAG,
    TILE_STONE,
    TILE_TIMBER,
    TILE_TREE,
    TILE_WALL,
    TILE_WATER,
    WORLD_H,
    WORLD_W,
    Belfry,
    Brazier,
    EnemyTemplate,
    Interactable,
    NpcData,
    PickupItem,
    WorldMap,
    build_marren_world,
)

SAVE_VERSION = 1
DEFAULT_SAVE_PATH = os.path.expanduser("~/.bellglass_save.json")


@dataclass
class PlayerState:
    x: int = 22
    y: int = 68
    fx: int = 1
    fy: int = 0
    hp: int = 60
    max_hp: int = 60
    stamina: float = 100.0
    max_stamina: float = 100.0
    oil: float = 100.0
    max_oil: float = 100.0
    poultices: int = 2
    brass: int = 10
    blade_tier: int = 1
    lamp_tier: int = 1
    lamp_hooded: bool = False
    ringlet_equipped: bool = False
    clappers: Set[str] = field(default_factory=set)
    parry_timer: float = 0.0
    dodge_timer: float = 0.0
    attack_timer: float = 0.0
    fork_timer: float = 0.0
    hurt_timer: float = 0.0
    move_cd: float = 0.0

    @property
    def blade_name(self) -> str:
        return BLADE_TIERS[self.blade_tier - 1][1]

    @property
    def damage(self) -> int:
        return BLADE_TIERS[self.blade_tier - 1][2]

    @property
    def lamp_name(self) -> str:
        return LAMP_TIERS[self.lamp_tier - 1][1]

    def recompute_stats(self) -> None:
        self.max_hp = 60 + (15 if self.ringlet_equipped else 0)
        self.hp = min(self.hp, self.max_hp)
        self.max_oil = float(LAMP_TIERS[self.lamp_tier - 1][2])
        self.oil = min(self.oil, self.max_oil)


@dataclass
class EnemyRuntime:
    tpl: EnemyTemplate
    x: int
    y: int
    hp: int
    alive: bool = True
    state: str = "idle"      # idle | stalk | windup | recover | staggered
    state_timer: float = 0.0
    move_timer: float = 0.0
    reveal_timer: float = 0.0
    hurt_timer: float = 0.0
    aim_x: int = 0
    aim_y: int = 0
    phase: int = 1
    shockwave_armed: bool = False

    @property
    def is_revealed(self) -> bool:
        return (not self.tpl.stealth) or self.reveal_timer > 0.0 or self.state == "windup"


@dataclass
class ResonanceWave:
    cx: float
    cy: float
    radius: float = 0.4
    max_radius: float = 13.5
    speed: float = 18.0
    broken_salts: bool = False


@dataclass
class SparkParticle:
    x: float
    y: float
    vx: float
    vy: float
    glyph: str
    grade: int
    ttl: float
    max_ttl: float


@dataclass
class WeatherDrop:
    x: float
    y: float
    vx: float
    vy: float
    glyph: str
    kind: str  # rain | ember


@dataclass
class SlashCell:
    x: int
    y: int
    glyph: str
    ttl: float


@dataclass
class FloatingText:
    x: float
    y: float
    text: str
    ttl: float


class BellglassGame:
    """Complete real-time simulation & 104x38 Amber CRT buffer generator."""

    def __init__(self, save_path: Optional[str] = DEFAULT_SAVE_PATH, seed: int = 419) -> None:
        self.save_path = save_path
        self.rng = random.Random(seed)
        self.world: WorldMap = build_marren_world()
        self.dialogue_nodes: Dict[str, DialogueNode] = build_dialogue_nodes()
        self.sfx_callback: Optional[Callable[[str], None]] = None

        self.screen = "title"  # title | play | dialogue | ledger | help | victory | dead
        self._help_return_screen = "title"
        self.clock: float = 0.0
        self.hit_stop: float = 0.0
        self.cam_x: float = 0.0
        self.cam_y: float = 0.0
        self.shake_trauma: float = 0.0

        self.player = PlayerState()
        self.enemies: List[EnemyRuntime] = []
        self.waves: List[ResonanceWave] = []
        self.sparks: List[SparkParticle] = []
        self.ambient_motes: List[SparkParticle] = []
        self.slashes: List[SlashCell] = []
        self.floaters: List[FloatingText] = []
        self.weather: List[WeatherDrop] = []
        self.visited: Set[Tuple[int, int]] = set()
        self.shoal_lit_timer: float = 0.0
        self.foundry_wave_timer: float = 0.0
        self.shockwaves: List[Dict[str, Any]] = []
        self.stats: Dict[str, int] = {"slain": 0, "parries": 0, "steps": 0}
        self.flags: Dict[str, Any] = {}
        self.log: List[str] = []
        self.active_dialogue: Optional[DialogueNode] = None
        self.active_choices: List[Any] = []
        self.selected_choice: int = 0
        self.last_brazier_pos: Tuple[int, int] = (24, 67)
        self.active_target_id: Optional[str] = None
        self.has_existing_save: bool = False

        self._init_weather()
        self.reset_new_game(go_title=True)
        self._check_save_exists()

    def _check_save_exists(self) -> None:
        if not self.save_path:
            self.has_existing_save = False
            return
        self.has_existing_save = os.path.exists(self.save_path) or os.path.exists(self.save_path + ".bak")

    def emit_sfx(self, cue: str) -> None:
        if self.sfx_callback:
            self.sfx_callback(cue)

    def _init_weather(self) -> None:
        self.weather.clear()
        for _ in range(72):
            self.weather.append(
                WeatherDrop(
                    x=self.rng.uniform(0, GRID_COLS),
                    y=self.rng.uniform(VIEW_TOP, VIEW_BOTTOM),
                    vx=-3.6,
                    vy=13.0,
                    glyph="/",
                    kind="rain",
                )
            )

    def reset_new_game(self, go_title: bool = False) -> None:
        self.world = build_marren_world()
        self.player = PlayerState()
        self.player.recompute_stats()
        self.enemies = [EnemyRuntime(tpl=t, x=t.x, y=t.y, hp=t.max_hp) for t in self.world.enemies]
        self.waves.clear()
        self.sparks.clear()
        self.ambient_motes.clear()
        self.slashes.clear()
        self.floaters.clear()
        self.shockwaves.clear()
        self.visited.clear()
        self.shoal_lit_timer = 0.0
        self.stats = {"slain": 0, "parries": 0, "steps": 0}
        self.flags = {
            "pulley_pulled": False,
            "sluice_open": False,
            "callum_quest": False,
            "pip_rescued": False,
            "vane_defeated": False,
            "bell_orchard_rung": False,
            "bell_nave_rung": False,
            "bell_redwick_rung": False,
            "bell_breakwater_rung": False,
            "bell_foundry_rung": False,
            "read_notes": [],
        }
        self.last_brazier_pos = (24, 67)
        self.active_target_id = None
        self.active_dialogue = None
        self.active_choices = []
        self.log = [
            "Tidemouth ferry pier. Thick estuary mist swallows the bell-posts.",
            "Old Hester watches from the pilings. Press [E] near her, or walk north.",
        ]
        self._snap_camera()
        self._update_visited()
        self.screen = "title" if go_title else "play"

    def _snap_camera(self) -> None:
        half_w = GRID_COLS // 2
        half_h = VIEW_ROWS // 2
        self.cam_x = float(max(0, min(WORLD_W - GRID_COLS, self.player.x - half_w)))
        self.cam_y = float(max(0, min(WORLD_H - VIEW_ROWS, self.player.y - half_h)))

    def bells_rung_count(self) -> int:
        return sum(1 for b in self.world.belfries if b.rung)

    def add_log(self, msg: str) -> None:
        if not msg:
            return
        if not self.log or self.log[-1] != msg:
            self.log.append(msg)
        if len(self.log) > 24:
            self.log = self.log[-24:]

    # ------------------------------------------------------------------
    # Save / Load (versioned JSON + atomic .tmp + .bak)
    # ------------------------------------------------------------------
    def capture_save_dict(self) -> Dict[str, Any]:
        shattered_coords = self.flags.get("shattered_salts", [])
        return {
            "version": SAVE_VERSION,
            "player": {
                "x": self.player.x,
                "y": self.player.y,
                "fx": self.player.fx,
                "fy": self.player.fy,
                "hp": self.player.hp,
                "oil": round(self.player.oil, 2),
                "poultices": self.player.poultices,
                "brass": self.player.brass,
                "blade_tier": self.player.blade_tier,
                "lamp_tier": self.player.lamp_tier,
                "lamp_hooded": self.player.lamp_hooded,
                "ringlet_equipped": self.player.ringlet_equipped,
                "clappers": sorted(self.player.clappers),
            },
            "rung_bells": [b.id for b in self.world.belfries if b.rung],
            "collected_pickups": [p.id for p in self.world.pickups if p.collected],
            "defeated_enemies": [e.tpl.id for e in self.enemies if not e.alive],
            "last_brazier_pos": list(self.last_brazier_pos),
            "shattered_salts": shattered_coords,
            "flags": {k: v for k, v in self.flags.items() if k != "shattered_salts"},
        }

    def save_game(self) -> bool:
        if not self.save_path:
            return False
        data = self.capture_save_dict()
        tmp = self.save_path + ".tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(data, fh, indent=2)
                fh.flush()
            if os.path.exists(self.save_path):
                os.replace(self.save_path, self.save_path + ".bak")
            os.replace(tmp, self.save_path)
            self.has_existing_save = True
            return True
        except OSError:
            return False

    def load_game(self) -> bool:
        if not self.save_path:
            return False
        for path in (self.save_path, self.save_path + ".bak"):
            if not os.path.exists(path):
                continue
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    raw = json.load(fh)
                if not isinstance(raw, dict):
                    continue
                if int(raw.get("version", 0)) > SAVE_VERSION:
                    continue
                self.apply_save_dict(raw)
                return True
            except (OSError, ValueError, KeyError, TypeError):
                continue
        return False

    def apply_save_dict(self, data: Dict[str, Any]) -> None:
        self.reset_new_game(go_title=False)
        p = data.get("player", {})
        self.player.x = int(p.get("x", 22))
        self.player.y = int(p.get("y", 68))
        self.player.fx = int(p.get("fx", 1))
        self.player.fy = int(p.get("fy", 0))
        self.player.blade_tier = int(p.get("blade_tier", 1))
        self.player.lamp_tier = int(p.get("lamp_tier", 1))
        self.player.ringlet_equipped = bool(p.get("ringlet_equipped", False))
        self.player.recompute_stats()
        self.player.hp = max(1, min(self.player.max_hp, int(p.get("hp", self.player.max_hp))))
        self.player.oil = max(0.0, min(self.player.max_oil, float(p.get("oil", self.player.max_oil))))
        self.player.poultices = int(p.get("poultices", 2))
        self.player.brass = int(p.get("brass", 10))
        self.player.lamp_hooded = bool(p.get("lamp_hooded", False))
        self.player.clappers = set(p.get("clappers", []))

        saved_flags = data.get("flags", {})
        if isinstance(saved_flags, dict):
            self.flags.update(saved_flags)

        rung = set(data.get("rung_bells", []))
        for b in self.world.belfries:
            b.rung = b.id in rung

        if self.flags.get("pulley_pulled"):
            self._open_choir_bridge(silent=True)
        if self.flags.get("sluice_open") or self.bells_rung_count() >= 2:
            self._open_foundry_sluice(silent=True)

        for sx, sy in data.get("shattered_salts", []):
            if self.world.in_bounds(sx, sy) and self.world.kinds[sy][sx] == TILE_SALT:
                self.world.set_tile(sx, sy, ".", TILE_MUD)
        self.flags["shattered_salts"] = list(data.get("shattered_salts", []))

        collected = set(data.get("collected_pickups", []))
        for item in self.world.pickups:
            item.collected = item.id in collected

        dead_ids = set(data.get("defeated_enemies", []))
        for e in self.enemies:
            if e.tpl.id in dead_ids:
                e.alive = False

        lb = data.get("last_brazier_pos", [24, 67])
        if isinstance(lb, list) and len(lb) == 2:
            self.last_brazier_pos = (int(lb[0]), int(lb[1]))

        self._snap_camera()
        self._update_visited()
        self.add_log("Journey resumed from embers.")

    # ------------------------------------------------------------------
    # World state mutations
    # ------------------------------------------------------------------
    def _open_choir_bridge(self, silent: bool = False) -> None:
        self.flags["pulley_pulled"] = True
        for inter in self.world.interactables:
            if inter.id == "pulley_choir":
                inter.activated = True
        for x in range(108, 117):
            for y in range(20, 23):
                self.world.set_tile(x, y, "=", TILE_BRIDGE)
        if not silent:
            self.shake_trauma = min(1.0, self.shake_trauma + 0.45)
            self.add_log("Iron winches groan; oak planking slams across St. Jude's choir trench!")
            self.emit_sfx("gate")

    def _open_foundry_sluice(self, silent: bool = False) -> None:
        self.flags["sluice_open"] = True
        for x in (172, 173, 174):
            self.world.set_tile(x, 35, ":", TILE_ROAD)
        if not silent:
            self.add_log("A distant counterweight drops—the High Foundry sluice gate in Redwick is raised.")
            self.emit_sfx("gate")

    def _collect_nearby_pickups(self) -> None:
        for item in self.world.pickups:
            if item.collected:
                continue
            if abs(item.x - self.player.x) + abs(item.y - self.player.y) <= 1:
                item.collected = True
                if item.kind == "clapper":
                    self.player.clappers.add(item.id)
                    self.add_log(f"Found {item.name}! Carry it to its parish belfry.")
                    self.emit_sfx("pickup")
                elif item.kind == "oil":
                    self.player.oil = min(self.player.max_oil, self.player.oil + item.amount)
                    self.add_log(f"Decanted {item.name} (+{item.amount}% oil).")
                    self.emit_sfx("pickup")
                elif item.kind == "poultice":
                    self.player.poultices = min(4, self.player.poultices + item.amount)
                    self.add_log(f"Packed {item.name} ({self.player.poultices}/4).")
                    self.emit_sfx("pickup")
                elif item.kind == "brass":
                    self.player.brass += item.amount
                    self.add_log(f"Pocketed {item.amount} Stamped Brass ({self.player.brass} total).")
                    self.emit_sfx("pickup")
                elif item.kind == "relic":
                    self.player.ringlet_equipped = True
                    self.player.recompute_stats()
                    self.player.hp = min(self.player.max_hp, self.player.hp + 15)
                    self.add_log("Slipped on Tide-Stealer's Ringlet (+15 Max HP)!")
                    self.emit_sfx("temper")
                elif item.kind == "note":
                    title, body = NOTES_TEXT.get(item.value, (item.name, ""))
                    read = list(self.flags.get("read_notes", []))
                    if item.value not in read:
                        read.append(item.value)
                        self.flags["read_notes"] = read
                    self.add_log(f"{title}: {body}")
                    self.emit_sfx("pickup")

    def _update_visited(self) -> None:
        rad = 5 if self.player.lamp_hooded else 9
        px, py = self.player.x, self.player.y
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                if dx * dx + dy * dy <= rad * rad:
                    tx, ty = px + dx, py + dy
                    if self.world.in_bounds(tx, ty):
                        self.visited.add((tx, ty))

    # ------------------------------------------------------------------
    # Input Actions
    # ------------------------------------------------------------------
    def handle_action(self, action: str) -> bool:
        """Process a normalized semantic input action. Returns False to quit."""
        if self.screen == "title":
            if action in ("confirm", "interact", "fork"):
                if self.has_existing_save and self.load_game():
                    return True
                self.reset_new_game(go_title=False)
                return True
            if action == "new_game":
                self.reset_new_game(go_title=False)
                return True
            if action == "help":
                self._help_return_screen = "title"
                self.screen = "help"
                return True
            if action == "quit":
                return False
            return True

        if self.screen == "help":
            if action in ("confirm", "cancel", "help", "ledger", "fork"):
                self.screen = self._help_return_screen if (self._help_return_screen == "title" or self.player.hp > 0) else "title"
            elif action == "quit":
                return False
            return True

        if self.screen == "ledger":
            if action in ("ledger", "cancel", "confirm", "fork"):
                self.screen = "play"
            elif action == "quit":
                return False
            return True

        if self.screen == "victory":
            if action in ("confirm", "cancel", "fork"):
                self.screen = "play"
            elif action == "new_game":
                self.reset_new_game(go_title=False)
            elif action == "quit":
                return False
            return True

        if self.screen == "dead":
            if action in ("confirm", "interact", "fork"):
                self._revive_at_brazier()
            elif action == "quit":
                return False
            return True

        if self.screen == "dialogue":
            return self._handle_dialogue_input(action)

        # Playing actions
        if action == "quit":
            self.save_game()
            self.screen = "title"
            return True
        if action == "help":
            self._help_return_screen = "play"
            self.screen = "help"
            return True
        if action == "ledger":
            self.screen = "ledger"
            return True

        if action.startswith("move_"):
            dx, dy = {
                "move_n": (0, -1),
                "move_s": (0, 1),
                "move_w": (-1, 0),
                "move_e": (1, 0),
            }[action]
            self._try_move_player(dx, dy)
        elif action == "strike":
            self._perform_strike()
        elif action == "parry":
            self._perform_parry()
        elif action == "dodge":
            self._perform_dodge()
        elif action == "fork":
            self._perform_tuning_fork()
        elif action == "lamp":
            self._toggle_lamp()
        elif action == "poultice":
            self._use_poultice()
        elif action == "interact":
            self._perform_interact()
        return True

    def _revive_at_brazier(self) -> None:
        bx, by = self.last_brazier_pos
        self.player.x = bx
        self.player.y = by
        self.player.hp = self.player.max_hp
        self.player.stamina = self.player.max_stamina
        self.player.oil = max(self.player.oil, self.player.max_oil * 0.75)
        self.player.poultices = max(self.player.poultices, 2)
        for e in self.enemies:
            if not e.tpl.is_boss and e.alive:
                e.x = e.tpl.x
                e.y = e.tpl.y
                e.state = "idle"
                e.state_timer = 0.0
            elif e.tpl.is_boss and not self.flags.get("vane_defeated"):
                e.x = e.tpl.x
                e.y = e.tpl.y
                e.hp = e.tpl.max_hp
                e.phase = 1
                e.state = "idle"
        self.screen = "play"
        self._snap_camera()
        self.add_log("You wake beside low hearth coals, oil flask refilled.")
        self.emit_sfx("brazier")

    def _try_move_player(self, dx: int, dy: int) -> None:
        self.player.fx = dx
        self.player.fy = dy
        if self.player.move_cd > 0.0 or self.player.dodge_timer > 0.0:
            return
        nx, ny = self.player.x + dx, self.player.y + dy
        if not self.world.in_bounds(nx, ny):
            return
        if self.world.kinds[ny][nx] == TILE_SLAG:
            self.player.x = nx
            self.player.y = ny
            self._damage_player(9, "Molten slag scorches your boots!")
            self.player.move_cd = 0.14
            return
        if not self.world.is_walkable(nx, ny):
            if self.world.kinds[ny][nx] == TILE_SALT:
                self.add_log("Brittle salt crust seals this opening—strike [Space] Tuning Fork!")
            elif self.world.kinds[ny][nx] == TILE_GATE:
                self.add_log("Locked sluice iron. Pull a parish winch or wake two great bells.")
            return
        if self._enemy_at(nx, ny) is not None:
            return
        self.player.x = nx
        self.player.y = ny
        self.player.move_cd = 0.095
        self.stats["steps"] += 1
        landed_kind = self.world.kinds[ny][nx]
        if landed_kind == TILE_SHOAL:
            self.sparks.append(SparkParticle(float(nx), float(ny), 0.0, 0.0, "~", GRADE_LIT, 0.28, 0.28))
        elif landed_kind == TILE_MUD and self.stats["steps"] % 2 == 0:
            self.sparks.append(SparkParticle(float(nx), float(ny), -self.player.fx * 0.8, -0.3, ",", GRADE_MIST, 0.22, 0.22))
        self.emit_sfx("step")
        self._update_visited()
        self._collect_nearby_pickups()

    def _enemy_at(self, x: int, y: int) -> Optional[EnemyRuntime]:
        for e in self.enemies:
            if e.alive and e.x == x and e.y == y:
                return e
        return None

    def _toggle_lamp(self) -> None:
        if self.player.oil <= 0.1 and self.player.lamp_hooded:
            self.add_log("Wick dry—rest at a brazier or find oil before raising the beam.")
            return
        self.player.lamp_hooded = not self.player.lamp_hooded
        state = "HOODED (quiet stealth beam)" if self.player.lamp_hooded else "RAISED (wide golden beam)"
        self.add_log(f"Oil lantern switched to {state}.")
        self.emit_sfx("lamp")

    def _use_poultice(self) -> None:
        if self.player.poultices <= 0:
            self.add_log("No reed poultices left in your coat.")
            return
        if self.player.hp >= self.player.max_hp:
            self.add_log("Wounds already bound.")
            return
        self.player.poultices -= 1
        healed = 28
        self.player.hp = min(self.player.max_hp, self.player.hp + healed)
        self.add_log(f"Bound bog-mint dressing (+{healed} HP).")
        self.emit_sfx("heal")
        self._spawn_sparks(self.player.x, self.player.y, 6, "+", GRADE_LIT)

    def _perform_parry(self) -> None:
        if self.player.parry_timer > 0.0 or self.player.stamina < 10.0:
            return
        self.player.stamina = max(0.0, self.player.stamina - 10.0)
        self.player.parry_timer = 0.38
        self.emit_sfx("parry_stance")

    def _perform_dodge(self) -> None:
        if self.player.dodge_timer > 0.0 or self.player.stamina < 18.0:
            return
        self.player.stamina -= 18.0
        self.player.dodge_timer = 0.25
        steps = 0
        for _ in range(2):
            nx = self.player.x + self.player.fx
            ny = self.player.y + self.player.fy
            if self.world.is_walkable(nx, ny) and self._enemy_at(nx, ny) is None:
                self._spawn_sparks(self.player.x, self.player.y, 2, ":", GRADE_MIST)
                self.player.x = nx
                self.player.y = ny
                steps += 1
        self._update_visited()
        self._collect_nearby_pickups()
        self.emit_sfx("step")
        if steps == 0:
            self.floaters.append(FloatingText(self.player.x, self.player.y - 1, "SLIP", 0.35))

    def _perform_strike(self) -> None:
        if self.player.attack_timer > 0.0 or self.player.stamina < 12.0:
            return
        self.player.stamina -= 12.0
        self.player.attack_timer = 0.24
        fx, fy = self.player.fx, self.player.fy
        tx, ty = self.player.x + fx, self.player.y + fy
        # Perpendicular cleave offsets
        sx, sy = -fy, fx
        hit_cells = [(tx, ty), (tx + sx, ty + sy), (tx - sx, ty - sy)]
        slash_glyph = "-" if fx != 0 else "|"
        for idx, (cx, cy) in enumerate(hit_cells):
            if self.world.in_bounds(cx, cy):
                g = slash_glyph if idx == 0 else ("/" if idx == 1 else "\\")
                self.slashes.append(SlashCell(cx, cy, g, 0.16))

        self.emit_sfx("slash")
        hit_any = False
        for e in self.enemies:
            if not e.alive:
                continue
            if (e.x, e.y) in hit_cells or (e.tpl.is_boss and abs(e.x - tx) <= 1 and abs(e.y - ty) <= 1):
                hit_any = True
                mult = 2.4 if e.state == "staggered" else 1.0
                dmg = int(round(self.player.damage * mult))
                e.hp -= dmg
                e.hurt_timer = 0.18
                self.active_target_id = e.tpl.id
                label = f"!{dmg}" if mult > 1.0 else f"{dmg}"
                self.floaters.append(FloatingText(e.x, e.y - 1, label, 0.55))
                self._spawn_sparks(e.x, e.y, 7 if mult > 1.0 else 4, "*", GRADE_BRIGHT)
                if e.tpl.is_boss and e.phase == 1 and e.hp <= e.tpl.max_hp * 0.55 and e.hp > 0:
                    e.phase = 2
                    e.state = "idle"
                    e.state_timer = 0.4
                    self.add_log("Magistrate Vane slams his diving helmet shut: 'Let fog bury the rest!'")
                if e.hp <= 0:
                    self._handle_enemy_defeat(e)
        if hit_any:
            self.hit_stop = 0.045
            self.shake_trauma = min(1.0, self.shake_trauma + 0.35)
            self.emit_sfx("hit")

    def _handle_enemy_defeat(self, e: EnemyRuntime) -> None:
        e.alive = False
        self.stats["slain"] += 1
        self.player.brass += e.tpl.brass_drop
        self._spawn_sparks(e.x, e.y, 12, "+", GRADE_BRIGHT)
        self.floaters.append(FloatingText(e.x, e.y - 1, f"+{e.tpl.brass_drop}B", 0.75))
        self.add_log(f"{e.tpl.name} collapses into bronze scree (+{e.tpl.brass_drop} Brass).")
        if e.tpl.is_boss:
            self.flags["vane_defeated"] = True
            self.player.clappers.add("clapper_foundry")
            self.add_log("The Fifth Master Clapper drops from Vane's belt! Carry it to the Dam Bell north.")
            self.emit_sfx("bell")

    def _perform_tuning_fork(self) -> None:
        if self.player.fork_timer > 0.0 or self.player.stamina < 28.0:
            return
        self.player.stamina -= 28.0
        self.player.fork_timer = 0.55
        self.waves.append(ResonanceWave(cx=float(self.player.x), cy=float(self.player.y)))
        self.shoal_lit_timer = max(self.shoal_lit_timer, 6.5)
        self.shake_trauma = min(1.0, self.shake_trauma + 0.25)
        self.emit_sfx("fork")
        # Immediate shatter / reveal / rattle check within resonance crest
        shattered_count = 0
        for dy in range(-5, 6):
            for dx in range(-5, 6):
                if dx * dx + dy * dy <= 25:
                    tx, ty = self.player.x + dx, self.player.y + dy
                    if self.world.in_bounds(tx, ty) and self.world.kinds[ty][tx] == TILE_SALT:
                        self.world.set_tile(tx, ty, ".", TILE_MUD)
                        self._spawn_sparks(tx, ty, 8, "%", GRADE_BRIGHT)
                        shattered_count += 1
                        saved_salts = list(self.flags.get("shattered_salts", []))
                        saved_salts.append([tx, ty])
                        self.flags["shattered_salts"] = saved_salts
        if shattered_count:
            self.add_log("Bronze harmonics shatter nearby salt seams into white powder!")
            self.emit_sfx("shatter")

        for e in self.enemies:
            if not e.alive:
                continue
            dist = math.hypot(e.x - self.player.x, e.y - self.player.y)
            if dist <= 12.0:
                if e.tpl.stealth:
                    e.reveal_timer = 7.0
                    self.floaters.append(FloatingText(e.x, e.y - 1, "SEEN", 0.6))
                if e.state == "windup" and dist <= 8.0:
                    e.state = "staggered"
                    e.state_timer = 1.65
                    self.active_target_id = e.tpl.id
                    self.floaters.append(FloatingText(e.x, e.y - 1, "RING-BREAK", 0.75))
                    self.add_log(f"Tuning resonance rattles {e.tpl.name}'s helm mid-swing!")

    def _perform_interact(self) -> None:
        px, py = self.player.x, self.player.y
        # 1. Nearby Belfry
        for b in self.world.belfries:
            if abs(b.x - px) + abs(b.y - py) <= 2:
                self._interact_belfry(b)
                return
        # 2. Nearby Brazier (rest & save)
        for br in self.world.braziers:
            if abs(br.x - px) + abs(br.y - py) <= 2:
                self._rest_at_brazier(br)
                return
        # 3. Nearby NPC
        for npc in self.world.npcs:
            if npc.id == "pip" and self.flags.get("pip_rescued") and self.world.region_at(px, py) == "saltflats":
                continue
            if abs(npc.x - px) + abs(npc.y - py) <= 2:
                self._start_dialogue(npc.dialogue_root)
                return
        # 4. Interactables (pulley, noticeboard)
        for inter in self.world.interactables:
            if abs(inter.x - px) + abs(inter.y - py) <= 2:
                if inter.kind == "pulley":
                    if not self.flags.get("pulley_pulled"):
                        self._open_choir_bridge()
                    else:
                        self.add_log("The choir bridge chain sits locked open.")
                elif inter.kind == "noticeboard":
                    self.add_log("Redwick Notice: 'Two bells lift northern Foundry sluice. Watchman Callum seeks Pip south.'")
                return
        self.add_log("Nothing nearby answers your hand.")

    def _interact_belfry(self, b: Belfry) -> None:
        if b.rung:
            self.add_log(f"{b.name} already tolls slow and golden across {b.region.title()}.")
            return
        if b.clapper_id not in self.player.clappers:
            self.add_log(f"{b.name} hangs mute and hollow—its parish clapper is missing.")
            return
        b.rung = True
        self.flags[f"{b.id}_rung"] = True
        if b.id == "bell_nave":
            self.flags["bell_nave_rung"] = True
        elif b.id == "bell_redwick":
            self.flags["bell_redwick_rung"] = True
        self.waves.append(ResonanceWave(cx=float(b.x), cy=float(b.y), max_radius=28.0, speed=22.0))
        self.shake_trauma = 1.0
        self.emit_sfx("bell")
        self._spawn_sparks(b.x, b.y, 18, "*", GRADE_BRIGHT)
        self.add_log(f"*** {b.name.upper()} RINGS OUT! Fog retreats across {b.region.upper()}! ***")

        if self.bells_rung_count() >= 2 and not self.flags.get("sluice_open"):
            self._open_foundry_sluice()

        self.save_game()
        if self.bells_rung_count() >= 5:
            self.screen = "victory"

    def _rest_at_brazier(self, br: Brazier) -> None:
        self.last_brazier_pos = (br.x, br.y + 1 if self.world.is_walkable(br.x, br.y + 1) else br.y)
        self.player.hp = self.player.max_hp
        self.player.stamina = self.player.max_stamina
        self.player.oil = self.player.max_oil
        self.player.poultices = max(self.player.poultices, 2)
        self._spawn_sparks(br.x, br.y, 10, "'", GRADE_BRIGHT)
        saved = self.save_game()
        msg = f"Warmed boots at {br.name}. Oil & wounds restored"
        self.add_log(msg + (" (progress saved)." if saved else "."))
        self.emit_sfx("brazier")

    # ------------------------------------------------------------------
    # Dialogue handling
    # ------------------------------------------------------------------
    def _start_dialogue(self, node_id: str) -> None:
        if node_id == "END" or node_id not in self.dialogue_nodes:
            self.active_dialogue = None
            self.screen = "play"
            return
        node = self.dialogue_nodes[node_id]
        if node.on_enter:
            node.on_enter(self)
        self.active_dialogue = node
        self.active_choices = [c for c in node.choices if c.cond is None or c.cond(self)]
        self.selected_choice = 0
        self.screen = "dialogue"

    def _handle_dialogue_input(self, action: str) -> bool:
        if action in ("cancel", "quit"):
            self.active_dialogue = None
            self.screen = "play"
            return True
        if action in ("move_n", "move_w") and self.active_choices:
            self.selected_choice = (self.selected_choice - 1) % len(self.active_choices)
            return True
        if action in ("move_s", "move_e") and self.active_choices:
            self.selected_choice = (self.selected_choice + 1) % len(self.active_choices)
            return True
        if action.startswith("choice_"):
            idx = int(action.split("_")[1]) - 1
            if 0 <= idx < len(self.active_choices):
                self._pick_choice(idx)
            return True
        if action in ("confirm", "interact", "fork") and self.active_choices:
            self._pick_choice(self.selected_choice)
        return True

    def _pick_choice(self, idx: int) -> None:
        ch = self.active_choices[idx]
        if ch.effect:
            ch.effect(self)
        self._start_dialogue(ch.to)

    # ------------------------------------------------------------------
    # Fixed-dt Simulation Step
    # ------------------------------------------------------------------
    def update(self, dt: float) -> None:
        dt = max(0.0, min(0.05, dt))
        self.clock += dt
        self._update_weather(dt)

        if self.screen != "play":
            return

        if self.hit_stop > 0.0:
            self.hit_stop = max(0.0, self.hit_stop - dt)
            return

        p = self.player
        p.move_cd = max(0.0, p.move_cd - dt)
        p.parry_timer = max(0.0, p.parry_timer - dt)
        p.dodge_timer = max(0.0, p.dodge_timer - dt)
        p.attack_timer = max(0.0, p.attack_timer - dt)
        p.fork_timer = max(0.0, p.fork_timer - dt)
        p.hurt_timer = max(0.0, p.hurt_timer - dt)
        p.stamina = min(p.max_stamina, p.stamina + 30.0 * dt)

        oil_burn = 0.14 if p.lamp_hooded else 0.72
        p.oil = max(0.0, p.oil - oil_burn * dt)
        if p.oil <= 0.0 and not p.lamp_hooded:
            p.lamp_hooded = True
            self.add_log("Lantern oil runs dry; wick shrinks to an ember hood.")

        self.shoal_lit_timer = max(0.0, self.shoal_lit_timer - dt)
        self.shake_trauma = max(0.0, self.shake_trauma - 2.4 * dt)

        # Waves & Particles
        for w in list(self.waves):
            w.radius += w.speed * dt
            if w.radius > w.max_radius:
                self.waves.remove(w)

        for sp in list(self.sparks):
            sp.x += sp.vx * dt
            sp.y += sp.vy * dt
            sp.ttl -= dt
            if sp.ttl <= 0:
                self.sparks.remove(sp)

        for sl in list(self.slashes):
            sl.ttl -= dt
            if sl.ttl <= 0:
                self.slashes.remove(sl)

        for fl in list(self.floaters):
            fl.y -= 1.8 * dt
            fl.ttl -= dt
            if fl.ttl <= 0:
                self.floaters.remove(fl)

        for sw in list(self.shockwaves):
            sw["x"] += sw["dx"] * 12.0 * dt
            sw["y"] += sw["dy"] * 12.0 * dt
            sw["ttl"] -= dt
            ix, iy = int(round(sw["x"])), int(round(sw["y"]))
            if not self.world.is_walkable(ix, iy) or sw["ttl"] <= 0:
                self.shockwaves.remove(sw)
                continue
            if ix == p.x and iy == p.y:
                self._damage_player(13, "Boss shockwave sweeps your footing!")
                self.shockwaves.remove(sw)

        self._update_ambient_motes(dt)
        self._update_enemies(dt)
        self._update_camera(dt)

    def _update_ambient_motes(self, dt: float) -> None:
        for m in list(self.ambient_motes):
            m.x += m.vx * dt
            m.y += m.vy * dt
            m.ttl -= dt
            if m.ttl <= 0:
                self.ambient_motes.remove(m)
        if len(self.ambient_motes) < 28 and self.rng.random() < 0.45:
            px, py = self.player.x, self.player.y
            if self.rng.random() < 0.42:
                sources = (
                    (24, 66, "'", GRADE_LIT),
                    (40, 46, "'", GRADE_LIT),
                    (88, 28, "'", GRADE_LIT),
                    (160, 49, "*", GRADE_BRIGHT),
                    (157, 40, "~", GRADE_MIST),
                    (188, 40, "~", GRADE_MIST),
                    (194, 47, "~", GRADE_MIST),
                    (168, 52, "'", GRADE_LIT),
                    (168, 22, "'", GRADE_LIT),
                    (170, 13, "*", GRADE_LIT),
                    (208, 27, "*", GRADE_LIT),
                )
                near = [s for s in sources if abs(s[0] - px) < 55 and abs(s[1] - py) < 25]
                if near:
                    sx, sy, g, gr = near[self.rng.randrange(len(near))]
                    self.ambient_motes.append(
                        SparkParticle(
                            x=sx + self.rng.uniform(-0.8, 0.8),
                            y=sy - 0.5,
                            vx=self.rng.uniform(-0.4, 0.5),
                            vy=-self.rng.uniform(1.1, 2.3),
                            glyph=g,
                            grade=gr,
                            ttl=self.rng.uniform(0.9, 1.8),
                            max_ttl=1.8,
                        )
                    )
                    return
            wx = px + self.rng.uniform(-34.0, 34.0)
            wy = py + self.rng.uniform(-14.0, 14.0)
            ix, iy = int(round(wx)), int(round(wy))
            if self.world.in_bounds(ix, iy):
                is_water = self.world.kinds[iy][ix] == TILE_WATER
                self.ambient_motes.append(
                    SparkParticle(
                        x=wx,
                        y=wy,
                        vx=self.rng.uniform(-1.6, 1.6),
                        vy=self.rng.uniform(-0.6, 0.5),
                        glyph="v" if is_water else ".",
                        grade=GRADE_DIM if is_water else GRADE_LIT,
                        ttl=self.rng.uniform(1.2, 2.6),
                        max_ttl=2.6,
                    )
                )

    def _update_weather(self, dt: float) -> None:
        reg = self.world.region_at(self.player.x, self.player.y)
        is_kiln = reg in ("redwick", "foundry")
        for drop in self.weather:
            if self.screen == "play" and is_kiln and self.rng.random() < 0.04:
                drop.kind = "ember"
                drop.glyph = "'"
                drop.vx = self.rng.uniform(-1.2, 1.2)
                drop.vy = -self.rng.uniform(4.5, 8.0)
            elif drop.kind == "ember" and not is_kiln:
                drop.kind = "rain"
                drop.glyph = "/"
                drop.vx = -3.8
                drop.vy = 13.5

            drop.x += drop.vx * dt
            drop.y += drop.vy * dt
            if drop.y >= VIEW_BOTTOM:
                drop.y = float(VIEW_TOP)
                drop.x = self.rng.uniform(0, GRID_COLS)
            elif drop.y < VIEW_TOP:
                drop.y = float(VIEW_BOTTOM - 1)
                drop.x = self.rng.uniform(0, GRID_COLS)
            if drop.x < 0:
                drop.x += GRID_COLS
            elif drop.x >= GRID_COLS:
                drop.x -= GRID_COLS

    def _update_camera(self, dt: float) -> None:
        half_w = GRID_COLS // 2
        half_h = VIEW_ROWS // 2
        tx = max(0.0, min(float(WORLD_W - GRID_COLS), self.player.x - half_w + self.player.fx * 3.0))
        ty = max(0.0, min(float(WORLD_H - VIEW_ROWS), self.player.y - half_h + self.player.fy * 1.5))
        t = 1.0 - math.exp(-10.0 * dt)
        self.cam_x += (tx - self.cam_x) * t
        self.cam_y += (ty - self.cam_y) * t

    def _update_enemies(self, dt: float) -> None:
        px, py = self.player.x, self.player.y
        aggro_mult = 0.58 if self.player.lamp_hooded else 1.0

        for e in self.enemies:
            if not e.alive:
                continue
            e.reveal_timer = max(0.0, e.reveal_timer - dt)
            e.hurt_timer = max(0.0, e.hurt_timer - dt)
            dist = abs(e.x - px) + abs(e.y - py)

            if not self.player.lamp_hooded and dist <= 6 and e.tpl.stealth:
                e.reveal_timer = max(e.reveal_timer, 0.8)

            if e.state in ("staggered", "recover"):
                e.state_timer -= dt
                if e.state_timer <= 0:
                    e.state = "stalk"
                continue

            if e.state == "windup":
                e.state_timer -= dt
                if e.state_timer <= 0:
                    self._resolve_enemy_attack(e)
                continue

            eff_aggro = e.tpl.aggro_range * aggro_mult
            if dist > eff_aggro:
                e.state = "idle"
                continue

            self.active_target_id = e.tpl.id
            e.state = "stalk"

            attack_reach = 2 if (e.tpl.is_boss or e.tpl.kind == "warden") else 1
            if dist <= attack_reach and (e.x == px or e.y == py or dist <= 2):
                e.state = "windup"
                wind = e.tpl.windup_s * (0.8 if (e.tpl.is_boss and e.phase == 2) else 1.0)
                e.state_timer = wind
                e.aim_x = px
                e.aim_y = py
                e.shockwave_armed = e.tpl.is_boss and self.rng.random() < (0.6 if e.phase == 2 else 0.35)
                continue

            e.move_timer -= dt
            if e.move_timer <= 0:
                speed = e.tpl.speed * (1.22 if (e.tpl.is_boss and e.phase == 2) else 1.0)
                e.move_timer = 1.0 / max(1.0, speed)
                self._step_enemy_toward(e, px, py)

    def _step_enemy_toward(self, e: EnemyRuntime, tx: int, ty: int) -> None:
        dx = 0 if tx == e.x else (1 if tx > e.x else -1)
        dy = 0 if ty == e.y else (1 if ty > e.y else -1)
        candidates = [(dx, 0), (0, dy)] if abs(tx - e.x) >= abs(ty - e.y) else [(0, dy), (dx, 0)]
        for mx, my in candidates:
            if mx == 0 and my == 0:
                continue
            nx, ny = e.x + mx, e.y + my
            if self.world.is_walkable(nx, ny) and (nx, ny) != (tx, ty) and self._enemy_at(nx, ny) is None:
                e.x, e.y = nx, ny
                return

    def _resolve_enemy_attack(self, e: EnemyRuntime) -> None:
        px, py = self.player.x, self.player.y
        reach = 2 if (e.tpl.is_boss or e.tpl.kind == "warden") else 1
        in_range = abs(e.x - px) + abs(e.y - py) <= reach or abs(e.aim_x - px) + abs(e.aim_y - py) <= 1

        if e.shockwave_armed:
            dx = 0 if px == e.x else (1 if px > e.x else -1)
            dy = 0 if py == e.y else (1 if py > e.y else -1)
            if dx == 0 and dy == 0:
                dx = 1
            self.shockwaves.append({"x": float(e.x + dx), "y": float(e.y + dy), "dx": float(dx), "dy": float(dy), "ttl": 0.9})
            self.add_log("Vane slams a glowing slag-wave across the iron deck!")
            self.emit_sfx("hit")

        if in_range:
            if self.player.parry_timer > 0.0:
                e.state = "staggered"
                e.state_timer = 2.1
                self.stats["parries"] += 1
                self.player.parry_timer = 0.0
                self.player.stamina = min(self.player.max_stamina, self.player.stamina + 25.0)
                self.hit_stop = 0.06
                self.shake_trauma = 0.6
                self.floaters.append(FloatingText(e.x, e.y - 1, "*PARRY*", 0.7))
                self._spawn_sparks(self.player.x, self.player.y, 10, "*", GRADE_BRIGHT)
                self.add_log(f"CLANG! Parried {e.tpl.name} cleanly—strike while staggered!")
                self.emit_sfx("parry")
                return
            self._damage_player(e.tpl.damage, f"{e.tpl.name} catches you ({e.tpl.damage} dmg).")

        e.state = "recover"
        e.state_timer = e.tpl.cooldown_s

    def _damage_player(self, amount: int, log_msg: str) -> None:
        if self.player.dodge_timer > 0.0:
            self.floaters.append(FloatingText(self.player.x, self.player.y - 1, "EVADED", 0.45))
            return
        self.player.hp = max(0, self.player.hp - amount)
        self.player.hurt_timer = 0.28
        self.shake_trauma = min(1.0, self.shake_trauma + 0.55)
        self._spawn_sparks(self.player.x, self.player.y, 5, "x", GRADE_BRIGHT)
        self.add_log(log_msg)
        self.emit_sfx("hurt")
        if self.player.hp <= 0:
            self.screen = "dead"

    def _spawn_sparks(self, x: int, y: int, count: int, glyph: str, grade: int) -> None:
        for _ in range(count):
            ang = self.rng.uniform(0, math.tau)
            spd = self.rng.uniform(3.0, 9.5)
            ttl = self.rng.uniform(0.18, 0.45)
            self.sparks.append(
                SparkParticle(
                    x=float(x),
                    y=float(y),
                    vx=math.cos(ang) * spd,
                    vy=math.sin(ang) * spd * 0.65,
                    glyph=glyph,
                    grade=grade,
                    ttl=ttl,
                    max_ttl=ttl,
                )
            )

    # ------------------------------------------------------------------
    # Line-of-Sight Shadowing & Frame Buffer Composition (104 x 38)
    # ------------------------------------------------------------------
    def _has_los(self, x0: int, y0: int, x1: int, y1: int) -> bool:
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        x, y = x0, y0
        while (x, y) != (x1, y1):
            if (x, y) != (x0, y0) and self.world.is_opaque(x, y):
                return False
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy
        return True

    def _lamp_radius(self) -> float:
        if self.player.oil <= 0.1:
            return 3.5
        if self.player.lamp_hooded:
            return 4.5
        return 8.5 + (self.player.lamp_tier - 1) * 1.8

    def render_buffer(self) -> List[List[Tuple[str, int]]]:
        """Produce exact 104x38 (glyph, amber_grade) CRT matrix for current screen."""
        buf: List[List[Tuple[str, int]]] = [[(" ", GRADE_GHOST) for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        if self.screen == "title":
            self._render_title(buf)
        elif self.screen == "help":
            self._render_help(buf)
        elif self.screen == "ledger":
            self._render_ledger(buf)
        elif self.screen == "victory":
            self._render_victory(buf)
        elif self.screen == "dead":
            self._render_world(buf)
            self._overlay_death(buf)
        else:
            self._render_world(buf)
        return buf

    def _put_str(self, buf: List[List[Tuple[str, int]]], col: int, row: int, text: str, grade: int) -> None:
        if not (0 <= row < GRID_ROWS):
            return
        for i, ch in enumerate(text):
            c = col + i
            if 0 <= c < GRID_COLS:
                buf[row][c] = (ch if 32 <= ord(ch) <= 126 else ".", grade)

    def _draw_frame(
        self,
        buf: List[List[Tuple[str, int]]],
        x: int,
        y: int,
        w: int,
        h: int,
        title: str = "",
        border_grade: int = GRADE_DIM,
        title_grade: int = GRADE_BRIGHT,
    ) -> None:
        x1 = x + w - 1
        y1 = y + h - 1
        for cx in range(x + 1, x1):
            self._put_str(buf, cx, y, "=", border_grade)
            self._put_str(buf, cx, y1, "=", border_grade)
        for cy in range(y + 1, y1):
            self._put_str(buf, x, cy, "|", border_grade)
            self._put_str(buf, x1, cy, "|", border_grade)
        self._put_str(buf, x, y, "+", title_grade)
        self._put_str(buf, x1, y, "+", title_grade)
        self._put_str(buf, x, y1, "+", title_grade)
        self._put_str(buf, x1, y1, "+", title_grade)
        if title:
            tag = f"[ {title} ]"
            tx = x + max(2, (w - len(tag)) // 2)
            self._put_str(buf, tx, y, tag[: max(0, w - 4)], title_grade)

    def _nearby_prompt(self) -> str:
        px, py = self.player.x, self.player.y
        for npc in self.world.npcs:
            if npc.id == "pip" and self.flags.get("pip_rescued"):
                continue
            if abs(npc.x - px) + abs(npc.y - py) <= 2:
                return f"[E] Speak: {npc.name}"
        for b in self.world.belfries:
            if abs(b.x - px) + abs(b.y - py) <= 2:
                if b.rung:
                    return f"{b.name} [RINGING]"
                return f"[E] Toll {b.name}" if b.clapper_id in self.player.clappers else f"{b.name} (needs clapper)"
        for inter in self.world.interactables:
            if abs(inter.x - px) + abs(inter.y - py) <= 2:
                verb = "Inspect" if inter.activated else "Use"
                return f"[E] {verb} {inter.name}"
        for br in self.world.braziers:
            if abs(br.x - px) + abs(br.y - py) <= 2:
                return f"[E] Rest at {br.name} (Heal + Refill Oil)"
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                if dx * dx + dy * dy <= 20:
                    tx, ty = px + dx, py + dy
                    if self.world.in_bounds(tx, ty) and self.world.kinds[ty][tx] == TILE_SALT:
                        return "Saline Seam (%) Nearby : Strike [Space] Tuning Fork"
        return ""

    def _render_title(self, buf: List[List[Tuple[str, int]]]) -> None:
        t = self.clock
        # 1. Drifting twilight cloud wisps & wind-driven estuary mist backdrop
        for r in range(18):
            for c in range(GRID_COLS):
                mv = math.sin(c * 0.14 - t * 0.45 + r * 0.65) + math.cos(r * 0.42 + c * 0.05 + t * 0.2)
                if r < 4 and mv > 1.1:
                    buf[r][c] = ("~", GRADE_GHOST)
                elif 9 <= r < 17 and mv > 0.75:
                    buf[r][c] = (":" if c % 3 == 0 else ".", GRADE_GHOST)
        for drop in self.weather:
            ix, iy = int(drop.x), int(drop.y)
            if 0 <= iy < 26 and 0 <= ix < GRID_COLS:
                buf[iy][ix] = ("/", GRADE_GHOST)

        # 2. Distant Marren Valley Parish Skyline (Orchard ridge, St. Jude spires, Redwick kilns)
        ridge = "^^^/\\^^^..Y..Y..^^^/==\\^^^^   /|\\  (*)  /|\\    /###\\ |#| |##|  /==\\==\\   "
        self._put_str(buf, 0, 14, ridge, GRADE_MIST)
        self._put_str(buf, 0, 15, "#" * 74, GRADE_GHOST)
        kiln_puff = int(t * 2.5) % 3
        self._put_str(buf, 54, 12 + (1 if kiln_puff == 0 else 0), "~ .", GRADE_MIST)
        self._put_str(buf, 58, 11 + (1 if kiln_puff == 1 else 0), ". ~", GRADE_MIST)

        # 3. Towering Animated Tidemouth Lighthouse & Volumetric Rotating Beam (cols 68..103)
        beam_step = int(t * 1.9) % 4
        beam_rays = [
            ["       ..::***", "     ...:::==>", "       ..::---"],
            ["    ...:::====", "  ..:::*****=>", "    ...:::----"],
            ["         .::**", "         ..:::", "          .::-"],
            ["   ...::* * * ", "  ..::=======>", "   ...::-- - -"],
        ][beam_step]
        for idx, ray in enumerate(beam_rays):
            self._put_str(buf, 86, 4 + idx, ray, GRADE_LIT if beam_step % 2 == 1 else GRADE_DIM)
        if beam_step in (0, 3):
            self._put_str(buf, 65, 5, ". . :::***==", GRADE_LIT)
            self._put_str(buf, 62, 6, "..  ..:::====*", GRADE_DIM)
        lh = [
            "     .|.     ",
            "    /_*_\\    ",
            "   |=[*]=|   ",
            "   /|:::|\\   ",
            "   ||::.||   ",
            "  /|:::::|\\  ",
            "  ||::.::||  ",
            " /#|:::::|#\\ ",
            " |#|::.::|#| ",
            "/==|_____|==\\",
        ]
        for idx, line in enumerate(lh):
            g = (GRADE_BRIGHT if beam_step % 2 == 0 else GRADE_LIT) if idx <= 2 else GRADE_DIM
            self._put_str(buf, 74, 4 + idx, line, g)
        self._put_str(buf, 68, 14, "   /^\\___/^\\____/^^^\\___/^^^^\\__ ", GRADE_DIM)
        self._put_str(buf, 68, 15, "  /#############################\\", GRADE_MIST)
        self._put_str(buf, 66, 16, " /=================================\\", GRADE_MIST)
        self._put_str(buf, 66, 17, "~~~~~~~~~~^~~~^~~~~^~~~~~~~^~~~~~~~~", GRADE_MIST)

        # 4. Engraved Double-Border Masthead Plaque + Animated Parish Bell Crest (cols 3..66, rows 2..11)
        self._draw_frame(buf, 3, 2, 64, 10, "P3 AMBER EDITION", GRADE_DIM, GRADE_LIT)
        for r in range(3, 11):
            self._put_str(buf, 4, r, " " * 62, GRADE_GHOST)
        masthead = [
            " ____  _____ _     _     ____ _        _    ____ ____ ",
            "| __ )| ____| |   | |   / ___| |      / \\  / ___/ ___|",
            "|  _ \\|  _| | |   | |  | |  _| |     / _ \\ \\___ \\___ \\",
            "| |_) | |___| |___| |__| |_| | |___ / ___ \\ ___) |__)|",
            "|____/|_____|_____|_____\\____|_____/_/   \\_\\____/____/",
        ]
        for idx, row_txt in enumerate(masthead):
            self._put_str(buf, 5, 3 + idx, row_txt, GRADE_BRIGHT if idx < 2 else GRADE_LIT)

        swing = int(round(math.sin(t * 2.2)))
        clapper = "(o) " if swing < 0 else (" (o)" if swing > 0 else " (o)")
        self._put_str(buf, 60, 4, " /#\\ ", GRADE_LIT)
        self._put_str(buf, 60, 5, "|(*)|", GRADE_BRIGHT)
        self._put_str(buf, 60, 6, "|___|", GRADE_LIT)
        self._put_str(buf, 60, 7, clapper, GRADE_BRIGHT)
        self._put_str(buf, 5, 9, "T H E   D R O W N E D   P R O V I N C E  --  MARREN VALLEY", GRADE_LIT)
        self._put_str(buf, 5, 10, "Five sunken parish bells beneath salt mist and rising tide.", GRADE_DIM)

        # 5. Rolling Multi-Depth Harbor Sea, Timber Jetty Wharf & Rigged Salvage Skiff (rows 18..25)
        for r in range(18, 26):
            for c in range(GRID_COLS):
                w = math.sin(c * 0.24 + t * (1.35 + (r - 18) * 0.14) + r * 0.9)
                ch = "^" if w > 0.45 else ("~" if w > 0.05 else ("-" if w > -0.45 else " "))
                g = GRADE_MIST if r < 21 else GRADE_GHOST
                if abs(c - 80) <= 3 and (c + r + int(t * 5)) % 2 == 0:
                    ch = "*" if r < 22 else ":"
                    g = GRADE_LIT
                buf[r][c] = (ch, g)

        self._put_str(buf, 0, 19, "=========================(*)  ", GRADE_LIT)
        self._put_str(buf, 0, 20, " [o] [#]   |   |   |   |  |   ", GRADE_DIM)
        self._put_str(buf, 0, 21, "  ~   ~    |   ~   |   ~  |   ", GRADE_MIST)

        bob = 1 if math.sin(t * 2.1) > 0.2 else 0
        self._put_str(buf, 43, 16 + bob, "    /|      /|     ", GRADE_LIT)
        self._put_str(buf, 43, 17 + bob, "   /_|     /_|     ", GRADE_LIT)
        self._put_str(buf, 42, 18 + bob, " * /===\\===/===\\  ", GRADE_BRIGHT)
        self._put_str(buf, 42, 19 + bob, "  \\______________/ ", GRADE_LIT)
        self._put_str(buf, 44, 20 + bob, "~~~ ~~~ ~~~ ~~~  ", GRADE_DIM)

        # 6. Bottom Docked Expedition Launch Console (rows 27..34) + Survey Brief
        self._draw_frame(buf, 4, 27, 48, 8, "EXPEDITION LAUNCH", GRADE_DIM, GRADE_LIT)
        prompt = "[Enter] Resume Journey from Embers" if self.has_existing_save else "[Enter] Step onto Tidemouth Pier"
        self._put_str(buf, 7, 28, f"> {prompt}", GRADE_BRIGHT)
        if self.has_existing_save:
            self._put_str(buf, 9, 30, "[N] Start Fresh Crossing", GRADE_LIT)
        else:
            self._put_str(buf, 9, 30, "Wake five bells to clear the valley fog.", GRADE_DIM)
        self._put_str(buf, 9, 32, "[H] Tuning Fork & Field Manual", GRADE_LIT)
        self._put_str(buf, 9, 33, "[Q] Quit Console", GRADE_MIST)

        self._draw_frame(buf, 54, 27, 46, 8, "SURVEY BRIEF", GRADE_MIST, GRADE_DIM)
        self._put_str(buf, 57, 28, "7 Flooded Parishes  *  5 Parish Bells", GRADE_LIT)
        self._put_str(buf, 57, 30, "[WASD/Arrows] Walk   [J/Enter] Strike", GRADE_DIM)
        self._put_str(buf, 57, 31, "[K/Shift] Parry      [L] Dodge  [F] Lamp", GRADE_DIM)
        self._put_str(buf, 57, 32, "[Space] Tuning Fork  [E] Act    [Tab] Map", GRADE_DIM)
        self._put_str(buf, 57, 33, "[H] Poultice   [Esc] Pause / Title", GRADE_MIST)

        self._put_str(buf, 6, 36, "P3 AMBER PHOSPHOR  |  OPEN-WORLD VALLEY OF MARREN  |  V1.0", GRADE_DIM)

    def _render_help(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 2, 1, GRID_COLS - 4, GRID_ROWS - 2, "BELLGLASS FIELD MANUAL  --  OREN WARD'S NOTES", GRADE_DIM, GRADE_BRIGHT)
        rows = [
            ("MOVEMENT & LANTERN", ""),
            ("  W A S D / Arrows", "Walk dirt dikes, docks, ruined aisles, and dry causeways."),
            ("  F", "Hood or Raise your Oil Lantern (hooded saves oil & halves aggro range)."),
            ("  L", "Quick Dodge-Step two tiles along facing direction (brief evasive invulnerability)."),
            ("COMBAT & RESONANCE", ""),
            ("  J / Enter", "Strike forward across 3 blade cells (2.4x damage on STAGGERED foes)."),
            ("  K / Shift", "Raise Bronze Parry Guard: block incoming telegraph strikes to STAGGER foes."),
            ("  Space", "Strike Tuning Fork: sends concentric harmonic echo ring that:"),
            ("", "  * Shatters brittle Salt Crystals (%) blocking secret vaults & sluices"),
            ("", "  * Illuminates hidden Stepping Stones (~ -> o) & Stalkers (S)"),
            ("", "  * Interrupts armored Wardens/Bosses mid-swing (RING-BREAK!)"),
            ("WORLD & RECOVERY", ""),
            ("  E", "Speak to townsfolk, pull winches (&), rest at Braziers (*), or toll Bells (B)."),
            ("  H", "Bind Pressed Bog-Mint Poultice (+28 HP)."),
            ("  Tab / M", "Open Surveyor Parchment Map & Five-Bell Ledger."),
        ]
        y = 5
        for key, desc in rows:
            if desc == "":
                self._put_str(buf, 5, y, key, GRADE_LIT)
            else:
                self._put_str(buf, 5, y, key.ljust(22), GRADE_BRIGHT)
                self._put_str(buf, 28, y, desc, GRADE_DIM)
            y += 1
        self._put_str(buf, 5, 34, "+" + "-" * 92 + "+", GRADE_MIST)
        self._put_str(buf, 6, 35, "[Enter / Esc] Return", GRADE_BRIGHT)

    def _render_ledger(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 1, 1, GRID_COLS - 2, GRID_ROWS - 2, "SURVEYOR PARCHMENT  &  PARISH CLAPPER LEDGER", GRADE_DIM, GRADE_BRIGHT)
        self._put_str(buf, 4, 3, "[ VALLEY OF MARREN - SURVEY CHART ]", GRADE_LIT)
        self._draw_frame(buf, 3, 4, 62, 24, "", GRADE_MIST, GRADE_MIST)

        map_w, map_h = 60, 22
        for my in range(map_h):
            wy = min(WORLD_H - 1, my * 4 + 1)
            for mx in range(map_w):
                wx = min(WORLD_W - 1, mx * 4 + 1)
                if any((wx + dx, wy + dy) in self.visited for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                    k = self.world.kinds[wy][wx]
                    if k == TILE_WATER:
                        ch, g = "~", GRADE_GHOST
                    elif k in (TILE_WALL, TILE_PILLAR, TILE_TREE):
                        ch, g = "#", GRADE_DIM
                    elif k in (TILE_ROAD, TILE_BRIDGE, TILE_TIMBER, TILE_STONE):
                        ch, g = "=", GRADE_LIT
                    else:
                        ch, g = ".", GRADE_MIST
                else:
                    h = ((mx * 73856093) ^ (my * 19349663)) & 15
                    ch, g = ("." if h == 0 else ("," if h == 7 else " ")), GRADE_GHOST
                buf[5 + my][4 + mx] = (ch, g)

        for lx, ly, tag in [
            (6, 7, "ORCHARD"),
            (21, 6, "ST.JUDE"),
            (42, 6, "FOUNDRY"),
            (6, 17, "PIER"),
            (23, 14, "CAUSEWAY"),
            (41, 13, "REDWICK"),
            (45, 20, "FLATS"),
        ]:
            self._put_str(buf, 4 + lx, 5 + ly, tag, GRADE_DIM)

        for b in self.world.belfries:
            bx = max(0, min(map_w - 1, b.x // 4))
            by = max(0, min(map_h - 1, b.y // 4))
            buf[5 + by][4 + bx] = ("B" if b.rung else "b", GRADE_BRIGHT if b.rung else GRADE_LIT)
        pmx = max(0, min(map_w - 1, self.player.x // 4))
        pmy = max(0, min(map_h - 1, self.player.y // 4))
        buf[5 + pmy][4 + pmx] = ("@", GRADE_BRIGHT)

        col = 67
        self._put_str(buf, col, 3, "[ FIVE GREAT BELLS ]", GRADE_LIT)
        for idx, b in enumerate(self.world.belfries):
            have = b.clapper_id in self.player.clappers
            icon = "(*)" if b.rung else ("(o)" if have else "(.)")
            status = "RINGING" if b.rung else ("CLAPPER" if have else "SILENT")
            grade = GRADE_BRIGHT if b.rung else (GRADE_LIT if have else GRADE_MIST)
            self._put_str(buf, col, 5 + idx * 2, f"{icon} {b.name}", grade)
            self._put_str(buf, col + 4, 6 + idx * 2, status, grade)

        self._put_str(buf, col, 16, "[ EQUIPMENT & TALLY ]", GRADE_LIT)
        self._put_str(buf, col, 18, f"Blade : {self.player.blade_name} ({self.player.damage})", GRADE_DIM)
        self._put_str(buf, col, 19, f"Lamp  : {self.player.lamp_name}", GRADE_DIM)
        self._put_str(buf, col, 20, f"Brass : {self.player.brass}   Poultices: {self.player.poultices}", GRADE_DIM)
        ring = "Equipped (+15 HP)" if self.player.ringlet_equipped else "Hidden south of dike"
        self._put_str(buf, col, 21, f"Relic : {ring}", GRADE_MIST)
        self._put_str(buf, col, 23, f"Felled: {self.stats['slain']}   Parries: {self.stats['parries']}", GRADE_DIM)
        self._put_str(buf, col, 24, f"Steps : {self.stats['steps']}", GRADE_MIST)

        self._put_str(buf, 5, 29, "   N   ", GRADE_LIT)
        self._put_str(buf, 5, 30, " W-+-E ", GRADE_DIM)
        self._put_str(buf, 5, 31, "   S   ", GRADE_LIT)
        self._put_str(buf, 15, 29, "Legend: [@] You   [B] Bell Rung   [b] Silent Belfry", GRADE_DIM)
        self._put_str(buf, 15, 30, "        [=] Cobble / Timber Bridge   [#] Ruin Masonry", GRADE_MIST)
        self._put_str(buf, 15, 32, "[Tab / Esc / Enter] Close Parchment", GRADE_BRIGHT)

    def _render_victory(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 4, 3, GRID_COLS - 8, 30, "ESTUARY DAWN  --  FIVE BELLS AWAKENED", GRADE_DIM, GRADE_BRIGHT)
        self._put_str(buf, 10, 6, "ALL FIVE PARISH BELLS ANSWER ACROSS MARREN VALLEY", GRADE_BRIGHT)
        self._put_str(buf, 10, 7, "=" * 52, GRADE_DIM)
        self._put_str(buf, 82, 5, "   /#\\   ", GRADE_LIT)
        self._put_str(buf, 82, 6, "  |(*)|  ", GRADE_BRIGHT)
        self._put_str(buf, 82, 7, " /_____\\ ", GRADE_LIT)
        self._put_str(buf, 82, 8, "   (o)   ", GRADE_BRIGHT)
        lines = [
            "Bronze tremor clears seven winters of estuary haze.",
            "Out on Tidemouth Pier, Old Hester unfastens her river rope.",
            "In St. Jude's flooded nave, sunlight hits limestone pillars.",
            "Redwick's three chimneys stand white against the dawn.",
            "Beside the silent gantry dam, Vane's fallen brass cools.",
            "",
            "You walk back downriver with a quiet fork and half a jar of oil.",
        ]
        for idx, ln in enumerate(lines):
            self._put_str(buf, 10, 10 + idx, ln, GRADE_LIT if idx < 5 else GRADE_BRIGHT)
        self._put_str(
            buf,
            10,
            20,
            f"Expedition Record -> Foes Felled: {self.stats['slain']}  |  Parries: {self.stats['parries']}  |  Brass: {self.player.brass}",
            GRADE_LIT,
        )
        self._put_str(buf, 10, 26, "[Enter] Keep Wandering Lit Marren   |   [N] Begin New Crossing   |   [Q] Title", GRADE_BRIGHT)

    def _overlay_death(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 24, 12, 56, 7, "EXTINGUISHED", GRADE_LIT, GRADE_BRIGHT)
        self._put_str(buf, 26, 13, " " * 52, GRADE_GHOST)
        self._put_str(buf, 26, 14, "      YOUR LANTERN SPUTTERS INTO COLD MUD        ", GRADE_BRIGHT)
        self._put_str(buf, 26, 15, " " * 52, GRADE_GHOST)
        self._put_str(buf, 26, 16, "  [Enter / E] Wake at Nearest Brazier            ", GRADE_LIT)

    def _render_dialogue_choices(self, buf: List[List[Tuple[str, int]]]) -> None:
        if not self.active_choices:
            return
        max_w = GRID_COLS - 4
        sep = "   "
        rows: List[List[Tuple[int, str, int]]] = []
        current_row: List[Tuple[int, str, int]] = []
        cur_w = 0
        sel_row_idx = 0

        for i, c in enumerate(self.active_choices):
            raw_tok = f"[{i + 1}] {c.label}"
            token = fit_line(raw_tok, min(len(raw_tok), max_w))
            needed = len(token) if not current_row else len(sep) + len(token)
            if current_row and cur_w + needed > max_w:
                rows.append(current_row)
                current_row = []
                cur_w = 0
            x_offset = 0 if not current_row else cur_w + len(sep)
            current_row.append((i, token, x_offset))
            cur_w = x_offset + len(token)
            if i == self.selected_choice:
                sel_row_idx = len(rows)
        if current_row:
            rows.append(current_row)

        win_start = max(0, min(len(rows) - 2, sel_row_idx)) if len(rows) > 2 else 0
        for r_idx, row_items in enumerate(rows[win_start : win_start + 2]):
            y = LOG_TOP + 1 + r_idx
            for idx, token, x_offset in row_items:
                is_sel = idx == self.selected_choice
                if is_sel:
                    self._put_str(buf, 1 + x_offset, y, ">", GRADE_BRIGHT)
                self._put_str(buf, 2 + x_offset, y, token, GRADE_BRIGHT if is_sel else GRADE_LIT)
        if len(rows) == 1:
            sel = self.active_choices[self.selected_choice]
            self._put_str(buf, 2, LOG_TOP + 2, fit_line(f"Selected [{self.selected_choice + 1}]: {sel.label}", max_w), GRADE_DIM)

    def _render_world(self, buf: List[List[Tuple[str, int]]]) -> None:
        # 1. Compute trauma camera shake offset
        shake_x = 0
        shake_y = 0
        if self.shake_trauma > 0.01:
            mag = self.shake_trauma * self.shake_trauma
            shake_x = int(round(math.sin(self.clock * 57.0) * 1.4 * mag))
            shake_y = int(round(math.cos(self.clock * 49.0) * 0.9 * mag))

        cx0 = max(0, min(WORLD_W - GRID_COLS, int(round(self.cam_x)) + shake_x))
        cy0 = max(0, min(WORLD_H - VIEW_ROWS, int(round(self.cam_y)) + shake_y))

        t = self.clock
        px, py = self.player.x, self.player.y
        lamp_r = self._lamp_radius()
        lamp_r2 = lamp_r * lamp_r
        cur_region = self.world.region_at(px, py)
        cleared_regions = {b.region for b in self.world.belfries if b.rung}

        brazier_pts = [(br.x, br.y) for br in self.world.braziers]
        lit_belfries = [(b.x, b.y) for b in self.world.belfries if b.rung]

        # Row 0: Clean Segmented Instrument Header
        reg_title = next((r[1] for r in REGION_META if r[0] == cur_region), "MARREN VALLEY")
        haze_txt = "CLEAR" if cur_region in cleared_regions else ("HOODED" if self.player.lamp_hooded else "FOG DEEP")
        bells_str = "".join("[o]" if b.rung else "[ ]" for b in self.world.belfries)
        hp_pips = int(round(6 * self.player.hp / max(1, self.player.max_hp)))
        oil_pips = int(round(5 * self.player.oil / max(1.0, self.player.max_oil)))
        hp_bar = "#" * hp_pips + "." * (6 - hp_pips)
        oil_bar = "#" * oil_pips + "." * (5 - oil_pips)
        top_line = (
            f"{reg_title} [{haze_txt}] | BELLS {bells_str} | "
            f"HP[{hp_bar}] {self.player.hp:2d}/{self.player.max_hp:<2d} | "
            f"OIL[{oil_bar}] {int(self.player.oil):3d}% | "
            f"${self.player.brass}"
        )
        self._put_str(buf, 0, 0, fit_line(top_line, GRID_COLS), GRADE_LIT)

        tgt = next((e for e in self.enemies if e.alive and e.tpl.id == self.active_target_id), None)

        # World tile pass
        wave_rings = self.waves
        shoal_open = self.shoal_lit_timer > 0.0
        beam_ang = (t * 0.65) % math.tau
        arch_kinds = (TILE_WALL, TILE_PILLAR, TILE_TREE, TILE_SALT, TILE_GATE)
        path_kinds = (TILE_BRIDGE, TILE_TIMBER, TILE_ROAD, TILE_STONE)
        for vr in range(VIEW_ROWS):
            wy = cy0 + vr
            row_idx = VIEW_TOP + vr
            for vc in range(GRID_COLS):
                wx = cx0 + vc
                kind = self.world.kinds[wy][wx]
                ch = self.world.glyphs[wy][wx]
                reg = self.world.region_ids[wy][wx]
                dist2 = (wx - px) * (wx - px) + (wy - py) * (wy - py)

                is_shore = False
                if kind == TILE_WATER and 0 < wx < WORLD_W - 1 and 0 < wy < WORLD_H - 1:
                    k_n = self.world.kinds[wy - 1][wx]
                    k_s = self.world.kinds[wy + 1][wx]
                    k_w = self.world.kinds[wy][wx - 1]
                    k_e = self.world.kinds[wy][wx + 1]
                    if (
                        (k_n not in (TILE_WATER, TILE_SHOAL))
                        or (k_s not in (TILE_WATER, TILE_SHOAL))
                        or (k_w not in (TILE_WATER, TILE_SHOAL))
                        or (k_e not in (TILE_WATER, TILE_SHOAL))
                    ):
                        is_shore = True

                # Animate water shimmer & shorelines
                if kind in (TILE_WATER, TILE_SHOAL):
                    if kind == TILE_SHOAL and shoal_open:
                        ch = "o"
                    elif is_shore:
                        ch = "~" if (wx + wy + int(t * 3)) % 2 == 0 else "_"
                    else:
                        phase = int(t * 2.5 + wx * 0.4 + wy * 0.7) % 7
                        ch = "~" if phase < 4 else ("-" if phase < 6 else " ")
                elif kind == TILE_SLAG:
                    ch = "*" if int(t * 5 + wx + wy) % 3 == 0 else "="

                # Lighting & Shadow evaluation
                lit_score = 0.0
                if dist2 <= lamp_r2 and (dist2 <= 4 or self._has_los(px, py, wx, wy)):
                    dot = (wx - px) * self.player.fx + (wy - py) * self.player.fy
                    beam_boost = 1.2 if (not self.player.lamp_hooded and dot > 0) else 0.0
                    lit_score = max(lit_score, 1.0 - (math.sqrt(dist2) / (lamp_r + beam_boost + 0.5)) * 0.75)

                # Tidemouth Lighthouse volumetric rotating beam
                lh_dx = wx - 14
                lh_dy = wy - 56
                lh_dist2 = lh_dx * lh_dx + lh_dy * lh_dy
                if lh_dist2 <= 784:
                    d_ang = abs(math.atan2(lh_dy, lh_dx) - beam_ang)
                    if d_ang > math.pi:
                        d_ang = math.tau - d_ang
                    if d_ang <= 0.28:
                        lit_score = max(lit_score, 0.72 - math.sqrt(lh_dist2) * 0.015)

                # Braziers & Lit Belfries radiate warm beacons
                for bx, by in brazier_pts:
                    bd2 = (wx - bx) ** 2 + (wy - by) ** 2
                    if bd2 <= 36:
                        lit_score = max(lit_score, 0.9 - math.sqrt(bd2) * 0.11)
                for bx, by in lit_belfries:
                    bd2 = (wx - bx) ** 2 + (wy - by) ** 2
                    if bd2 <= 64:
                        lit_score = max(lit_score, 0.85 - math.sqrt(bd2) * 0.08)

                # Resonance wave crest lighting
                wave_hit = False
                for w in wave_rings:
                    d_w = math.hypot(wx - w.cx, wy - w.cy)
                    if abs(d_w - w.radius) <= 1.25:
                        wave_hit = True
                        lit_score = 1.0
                        if kind == TILE_WATER and ch == " ":
                            ch = ")" if wx >= w.cx else "("
                        break

                in_cleared = reg in cleared_regions
                in_memory = (wx, wy) in self.visited
                is_arch = kind in arch_kinds
                is_path = kind in path_kinds

                if lit_score <= 0.05:
                    if in_cleared:
                        grade = GRADE_GHOST if (kind == TILE_WATER and not is_shore) else GRADE_MIST
                    elif in_memory:
                        grade = GRADE_MIST if (is_arch or is_path or is_shore) else GRADE_GHOST
                    elif (is_shore and dist2 <= 324) or (is_arch and dist2 <= 256):
                        grade = GRADE_GHOST
                    else:
                        mv = math.sin(wx * 0.11 - t * 0.7 + wy * 0.35) + math.cos(wx * 0.23 + wy * 0.14 - t * 0.45)
                        h = ((wx * 73856093) ^ (wy * 19349663) ^ int(t * 2)) & 7
                        if mv > 1.15 and h < 3:
                            ch = "~"
                        elif mv > 0.85 and h < 2:
                            ch = "." if ((wx + wy) & 1) else "-"
                        elif mv > 0.65 and h == 0:
                            ch = ","
                        else:
                            ch = " "
                        grade = GRADE_GHOST
                elif wave_hit:
                    grade = GRADE_BRIGHT
                elif lit_score > 0.65:
                    if kind in (TILE_SALT, TILE_SLAG):
                        grade = GRADE_BRIGHT
                    elif is_path or kind in (TILE_WALL, TILE_PILLAR, TILE_GATE):
                        grade = GRADE_LIT
                    else:
                        grade = GRADE_LIT if is_shore else GRADE_DIM
                elif lit_score > 0.30:
                    grade = GRADE_DIM if (kind != TILE_WATER or is_shore) else GRADE_MIST
                else:
                    grade = GRADE_MIST

                if kind == TILE_SHOAL and shoal_open and (lit_score > 0.1 or wave_hit):
                    ch = "o"
                    grade = GRADE_BRIGHT if (int(t * 4 + wx) % 2 == 0) else GRADE_LIT

                buf[row_idx][vc] = (ch, grade)

        # Weather streaks (rendered subtly behind foreground characters)
        for drop in self.weather:
            ix, iy = int(drop.x), int(drop.y)
            if VIEW_TOP <= iy < VIEW_BOTTOM and 0 <= ix < GRID_COLS:
                wx = cx0 + ix
                wy = cy0 + (iy - VIEW_TOP)
                if drop.kind == "ember":
                    buf[iy][ix] = ("'", GRADE_LIT)
                elif abs(wx - px) + abs(wy - py) <= lamp_r + 4:
                    if buf[iy][ix][0] in (" ", ".", ",", "~"):
                        buf[iy][ix] = ("/", GRADE_MIST)

        # Structural multi-line ASCII landmarks (lighthouse apex, belfry roofs, cormorant ribs)
        for feat in self.world.decor_lines:
            feat_dist2 = (feat.x + 3 - px) ** 2 + (feat.y + 2 - py) ** 2
            feat_clear = self.world.region_at(max(0, feat.x), max(0, feat.y)) in cleared_regions
            for dr, line in enumerate(feat.lines):
                wy = feat.y + dr
                if not (cy0 <= wy < cy0 + VIEW_ROWS):
                    continue
                vr = VIEW_TOP + (wy - cy0)
                for dc, ch in enumerate(line):
                    if ch == " ":
                        continue
                    wx = feat.x + dc
                    if cx0 <= wx < cx0 + GRID_COLS:
                        d2 = (wx - px) ** 2 + (wy - py) ** 2
                        if feat_clear or feat_dist2 <= 324 or (wx, wy) in self.visited or d2 <= 289:
                            g = GRADE_LIT if d2 <= lamp_r2 else (GRADE_DIM if d2 <= 196 else GRADE_MIST)
                            buf[vr][wx - cx0] = (ch, g)

        # Ambient Motes (kiln smoke, forge anvil sparks, estuary gulls / fireflies)
        for m in self.ambient_motes:
            ix, iy = int(round(m.x)), int(round(m.y))
            if cx0 <= ix < cx0 + GRID_COLS and cy0 <= iy < cy0 + VIEW_ROWS:
                d2 = (ix - px) ** 2 + (iy - py) ** 2
                if d2 <= lamp_r2 + 64 or m.glyph in ("*", "'"):
                    buf[VIEW_TOP + (iy - cy0)][ix - cx0] = (m.glyph, m.grade if m.ttl > 0.45 else GRADE_MIST)

        # Dynamic Resonance Wave glyphs
        for w in self.waves:
            steps = max(24, int(w.radius * 7))
            for s in range(steps):
                ang = (s / steps) * math.tau
                wx = int(round(w.cx + math.cos(ang) * w.radius))
                wy = int(round(w.cy + math.sin(ang) * w.radius * 0.72))
                if cx0 <= wx < cx0 + GRID_COLS and cy0 <= wy < cy0 + VIEW_ROWS:
                    ch = "~" if s % 3 == 0 else ("(" if math.cos(ang) < 0 else ")")
                    buf[VIEW_TOP + (wy - cy0)][wx - cx0] = (ch, GRADE_BRIGHT)

        # Braziers, Interactables, Belfries, Pickups, NPCs
        for br in self.world.braziers:
            if cx0 <= br.x < cx0 + GRID_COLS and cy0 <= br.y < cy0 + VIEW_ROWS:
                flick = "*" if int(t * 7 + br.x) % 2 == 0 else "+"
                buf[VIEW_TOP + (br.y - cy0)][br.x - cx0] = (flick, GRADE_BRIGHT)

        for inter in self.world.interactables:
            if cx0 <= inter.x < cx0 + GRID_COLS and cy0 <= inter.y < cy0 + VIEW_ROWS:
                if (inter.x, inter.y) in self.visited or abs(inter.x - px) + abs(inter.y - py) <= lamp_r:
                    buf[VIEW_TOP + (inter.y - cy0)][inter.x - cx0] = (inter.glyph, GRADE_LIT)

        for b in self.world.belfries:
            if cx0 <= b.x < cx0 + GRID_COLS and cy0 <= b.y < cy0 + VIEW_ROWS:
                ch = "B" if b.rung else ("O" if b.clapper_id in self.player.clappers else "b")
                g = GRADE_BRIGHT if b.rung else GRADE_LIT
                buf[VIEW_TOP + (b.y - cy0)][b.x - cx0] = (ch, g)

        for item in self.world.pickups:
            if item.collected:
                continue
            if cx0 <= item.x < cx0 + GRID_COLS and cy0 <= item.y < cy0 + VIEW_ROWS:
                d2 = (item.x - px) ** 2 + (item.y - py) ** 2
                if d2 <= lamp_r2 or self.world.region_at(item.x, item.y) in cleared_regions:
                    g = GRADE_BRIGHT if item.kind == "clapper" else GRADE_LIT
                    buf[VIEW_TOP + (item.y - cy0)][item.x - cx0] = (item.glyph, g)

        for npc in self.world.npcs:
            if npc.id == "pip" and self.flags.get("pip_rescued"):
                continue
            if cx0 <= npc.x < cx0 + GRID_COLS and cy0 <= npc.y < cy0 + VIEW_ROWS:
                d2 = (npc.x - px) ** 2 + (npc.y - py) ** 2
                if d2 <= (lamp_r + 3) ** 2 or self.world.region_at(npc.x, npc.y) in cleared_regions:
                    buf[VIEW_TOP + (npc.y - cy0)][npc.x - cx0] = (npc.glyph, GRADE_BRIGHT if d2 <= 25 else GRADE_LIT)

        # Enemies + Telegraph windups
        for e in self.enemies:
            if not e.alive:
                continue
            if cx0 <= e.x < cx0 + GRID_COLS and cy0 <= e.y < cy0 + VIEW_ROWS:
                d2 = (e.x - px) ** 2 + (e.y - py) ** 2
                in_light = d2 <= lamp_r2 and self._has_los(px, py, e.x, e.y)
                if not e.is_revealed and not in_light:
                    if d2 <= (lamp_r + 4) ** 2:
                        buf[VIEW_TOP + (e.y - cy0)][e.x - cx0] = (":", GRADE_GHOST)
                    continue
                if not in_light and self.world.region_at(e.x, e.y) not in cleared_regions and d2 > 64:
                    continue

                vr = VIEW_TOP + (e.y - cy0)
                vc = e.x - cx0
                glyph = e.tpl.glyph
                grade = GRADE_LIT
                if e.hurt_timer > 0.0:
                    grade = GRADE_BRIGHT
                    glyph = "X"
                elif e.state == "staggered":
                    glyph = "z" if int(t * 8) % 2 == 0 else e.tpl.glyph.lower()
                    grade = GRADE_DIM
                elif e.state == "windup":
                    grade = GRADE_BRIGHT if int(t * 14) % 2 == 0 else GRADE_LIT
                    tx_off = 0 if px == e.x else (1 if px > e.x else -1)
                    ty_off = 0 if py == e.y else (1 if py > e.y else -1)
                    tc = vc + tx_off
                    tr = vr + ty_off
                    if 0 <= tc < GRID_COLS and VIEW_TOP <= tr < VIEW_BOTTOM:
                        buf[tr][tc] = ("!", GRADE_BRIGHT)
                buf[vr][vc] = (glyph, grade)

        # Shockwaves
        for sw in self.shockwaves:
            ix, iy = int(round(sw["x"])), int(round(sw["y"]))
            if cx0 <= ix < cx0 + GRID_COLS and cy0 <= iy < cy0 + VIEW_ROWS:
                buf[VIEW_TOP + (iy - cy0)][ix - cx0] = (">", GRADE_BRIGHT)

        # Player character + Parry / Slash / Lantern aura
        pvc = px - cx0
        pvr = VIEW_TOP + (py - cy0)
        if 0 <= pvc < GRID_COLS and VIEW_TOP <= pvr < VIEW_BOTTOM:
            pl = self.player
            if pl.parry_timer > 0.0:
                if pvc > 0:
                    buf[pvr][pvc - 1] = ("(", GRADE_BRIGHT)
                if pvc + 1 < GRID_COLS:
                    buf[pvr][pvc + 1] = (")", GRADE_BRIGHT)
            buf[pvr][pvc] = ("@" if pl.hurt_timer <= 0 else "!", GRADE_BRIGHT)
            if not pl.lamp_hooded and pl.oil > 1.0:
                lx = pvc - pl.fx
                if 0 <= lx < GRID_COLS and buf[pvr][lx][0] in (" ", ".", ",", ":"):
                    buf[pvr][lx] = ("*", GRADE_LIT if int(t * 6) % 2 == 0 else GRADE_BRIGHT)

        # Slashes & Sparks & Floaters
        for sl in self.slashes:
            if cx0 <= sl.x < cx0 + GRID_COLS and cy0 <= sl.y < cy0 + VIEW_ROWS:
                buf[VIEW_TOP + (sl.y - cy0)][sl.x - cx0] = (sl.glyph, GRADE_BRIGHT)
        for sp in self.sparks:
            ix, iy = int(round(sp.x)), int(round(sp.y))
            if cx0 <= ix < cx0 + GRID_COLS and cy0 <= iy < cy0 + VIEW_ROWS:
                buf[VIEW_TOP + (iy - cy0)][ix - cx0] = (sp.glyph, sp.grade if sp.ttl > 0.15 else GRADE_DIM)
        for fl in self.floaters:
            ix, iy = int(round(fl.x)) - len(fl.text) // 2, int(round(fl.y))
            if cy0 <= iy < cy0 + VIEW_ROWS:
                self._put_str(buf, max(0, ix - cx0), VIEW_TOP + (iy - cy0), fl.text, GRADE_BRIGHT)

        # Row 33: Dynamic Duel / Proximity / Gear Separator Bar
        self._put_str(buf, 0, VIEW_BOTTOM, "+" + "-" * (GRID_COLS - 2) + "+", GRADE_MIST)
        if tgt and abs(tgt.x - px) + abs(tgt.y - py) <= 16:
            e_pips = max(0, min(12, int(round(12 * tgt.hp / max(1, tgt.tpl.max_hp)))))
            e_bar = "#" * e_pips + "-" * (12 - e_pips)
            posture = "STAGGERED x2.4" if tgt.state == "staggered" else tgt.state.upper()
            duel_str = f"--[ DUEL: {tgt.tpl.name}  [{e_bar}] {tgt.hp}/{tgt.tpl.max_hp}  {posture} ]--"
            self._put_str(
                buf,
                2,
                VIEW_BOTTOM,
                duel_str[: GRID_COLS - 4],
                GRADE_BRIGHT if tgt.state in ("windup", "staggered") else GRADE_LIT,
            )
        else:
            near = self._nearby_prompt()
            fork_ready = "FORK:READY" if self.player.fork_timer <= 0.0 else "FORK:WAIT "
            right_tag = f"--[ {self.player.blade_name} ({self.player.damage}d) | Mint:{self.player.poultices} | {fork_ready} ]--"
            if len(right_tag) < GRID_COLS - 6:
                self._put_str(buf, GRID_COLS - len(right_tag) - 1, VIEW_BOTTOM, right_tag, GRADE_DIM)
            if near:
                max_left = max(16, GRID_COLS - len(right_tag) - 10)
                self._put_str(buf, 2, VIEW_BOTTOM, f"--[ {near[:max_left]} ]--", GRADE_BRIGHT)
            else:
                self._put_str(buf, 2, VIEW_BOTTOM, "--[ CHRONICLE ]--", GRADE_LIT)

        # Rows 34..36: Inline Dialogue OR 3-Line Literary Log
        if self.screen == "dialogue" and self.active_dialogue is not None:
            line = self.active_dialogue.line_fn(self)
            self._put_str(buf, 1, LOG_TOP, fit_line(line, GRID_COLS - 2), GRADE_BRIGHT)
            self._render_dialogue_choices(buf)
        else:
            recent = self.log[-LOG_ROWS:]
            for idx in range(LOG_ROWS):
                if idx < len(recent):
                    grade = GRADE_BRIGHT if idx == len(recent) - 1 else (GRADE_DIM if idx == len(recent) - 2 else GRADE_MIST)
                    self._put_str(buf, 1, LOG_TOP + idx, fit_line(recent[idx], GRID_COLS - 2), grade)

        # Row 37: Keybind whisper
        if self.screen == "dialogue":
            hint = "[1-6] Choose   [W/S] Cycle   [Enter] Speak   [Esc] Step Back"
        else:
            hint = "[WASD] Walk  [J] Strike  [K] Parry  [L] Step  [Space] Fork  [F] Lamp  [E] Act  [H] Heal  [Tab] Map"
        self._put_str(buf, 1, HINT_ROW, fit_line(hint, GRID_COLS - 2), GRADE_MIST)
        return buf
