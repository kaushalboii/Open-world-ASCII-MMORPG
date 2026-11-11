"""Core headless simulation for Tactical ASCII Tower Defense & Wave Siege."""

from __future__ import annotations

import math
import random
from typing import Callable, Dict, Iterable, List, Optional, Set, Tuple

from .models import (
    BUILD_ORDER,
    ENEMY_DEFS,
    MAP_COLS,
    MAP_PRESETS,
    MAP_ROWS,
    TARGET_MODES,
    TOWER_DEFS,
    BlastEffect,
    Enemy,
    EnemyFSM,
    FloatingPopup,
    GameEvent,
    LightningArc,
    MapPreset,
    Projectile,
    Tower,
    WaveSpec,
    get_wave_spec,
)
from .pathfinding import GridGraph, TilePos, can_place_blocking_structure, find_path


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(bx - ax, by - ay)


def _cardinal_aim(dx: float, dy: float) -> str:
    if abs(dx) >= abs(dy):
        return "R" if dx >= 0.0 else "L"
    return "D" if dy >= 0.0 else "U"


class GameSimulation:
    """Self-contained simulation engine decoupled from curses/pygame."""

    def __init__(
        self,
        map_id: str = "twin_bastion",
        seed: int = 42,
        total_waves: int = 10,
        endless: bool = False,
        on_event: Optional[Callable[[GameEvent], None]] = None,
    ) -> None:
        self.rng = random.Random(seed)
        self.seed = seed
        self.total_waves = total_waves
        self.endless = endless
        self.on_event = on_event

        self.preset: MapPreset = self._resolve_preset(map_id)
        self.width = MAP_COLS
        self.height = MAP_ROWS
        self.spawns, self.goal, self.cliffs, self.roads = self.preset.parse()

        self.gold: int = self.preset.starting_gold
        self.core_hp: float = self.preset.starting_core_hp
        self.max_core_hp: float = self.preset.starting_core_hp
        self.score: int = 0
        self.kills: int = 0

        self.wave_number: int = 0
        self.wave_active: bool = False
        self.prep_timer: float = 0.0
        self.spawn_queue: List[Tuple[float, str, TilePos]] = []
        self.wave_elapsed: float = 0.0
        self.current_wave_spec: Optional[WaveSpec] = get_wave_spec(1)

        self.victory: bool = False
        self.game_over: bool = False

        self.towers: Dict[TilePos, Tower] = {}
        self.enemies: List[Enemy] = []
        self.projectiles: List[Projectile] = []
        self.lightning_arcs: List[LightningArc] = []
        self.blasts: List[BlastEffect] = []
        self.popups: List[FloatingPopup] = []

        self.cursor: TilePos = (self.width // 2, self.height // 2)
        self.selected_build: str = "pulse"
        self.selected_tile: Optional[TilePos] = None

        self.sim_time: float = 0.0
        self.anim_tick: int = 0
        self.speed_multiplier: float = 1.0
        self.trauma: float = 0.0
        self.reduce_shake: bool = False
        self.last_status_message: str = "Place turrets [1-5 + Enter/Space] then [G] Send Wave 1"
        self.combat_log: List[str] = [
            f"Map loaded: {self.preset.name}",
            "Press [1-5] to pick turret/barricade, [Enter] to build, [G] to send Wave 1.",
        ]

        self._next_uid: int = 1
        self.spawn_paths: Dict[TilePos, List[TilePos]] = {}
        self._recompute_all_paths()

    @staticmethod
    def _resolve_preset(map_id: str) -> MapPreset:
        for preset in MAP_PRESETS:
            if preset.map_id == map_id:
                return preset
        return MAP_PRESETS[0]

    def _emit(self, kind: str, message: str) -> None:
        self.last_status_message = message
        self.combat_log.append(message)
        if len(self.combat_log) > 20:
            self.combat_log = self.combat_log[-20:]
        if self.on_event is not None:
            self.on_event(GameEvent(kind, message))

    def _alloc_uid(self) -> int:
        uid = self._next_uid
        self._next_uid += 1
        return uid

    def _add_trauma(self, amount: float) -> None:
        if self.reduce_shake:
            return
        self.trauma = min(1.0, self.trauma + amount)

    @property
    def core_hp_ratio(self) -> float:
        return 0.0 if self.max_core_hp <= 0 else max(0.0, min(1.0, self.core_hp / self.max_core_hp))

    @property
    def next_wave_spec(self) -> WaveSpec:
        next_num = self.wave_number + 1
        return get_wave_spec(next_num)

    def hard_blocked_tiles(self) -> Set[TilePos]:
        blocked = set(self.cliffs)
        for pos, tower in self.towers.items():
            if not tower.is_barricade:
                blocked.add(pos)
        return blocked

    def build_graph(self, is_sapper: bool = False) -> GridGraph:
        blocked = self.hard_blocked_tiles()
        tile_costs: Dict[TilePos, float] = {}
        barricade_cost = 3.0 if is_sapper else 14.0
        for pos, tower in self.towers.items():
            if tower.is_barricade:
                tile_costs[pos] = barricade_cost
        return GridGraph(self.width, self.height, blocked=blocked, tile_costs=tile_costs)

    def _recompute_all_paths(self) -> None:
        graph = self.build_graph(is_sapper=False)
        sapper_graph = self.build_graph(is_sapper=True)

        self.spawn_paths.clear()
        for sp in self.spawns:
            self.spawn_paths[sp] = find_path(graph, sp, self.goal)

        for enemy in self.enemies:
            if not enemy.alive or enemy.flying:
                continue
            g = sapper_graph if enemy.kind == "sapper" else graph
            start_tile = enemy.tile
            if start_tile in g.blocked:
                # Fallback if standing adjacent after a change
                start_tile = self.spawns[0]
            path = find_path(g, start_tile, self.goal)
            if path:
                enemy.path = path
                enemy.waypoint_idx = 1 if len(path) > 1 else 0
                if enemy.fsm == EnemyFSM.BREACHING and (
                    enemy.breach_target not in self.towers
                    or not self.towers[enemy.breach_target].is_barricade
                ):
                    enemy.fsm = EnemyFSM.MARCHING
                    enemy.breach_target = None

    def tile_terrain(self, pos: TilePos) -> str:
        if pos in self.spawns:
            return "spawn"
        if pos == self.goal:
            return "goal"
        if pos in self.cliffs:
            return "cliff"
        if pos in self.roads:
            return "road"
        return "open"

    def can_build_at(self, pos: TilePos, kind: str) -> Tuple[bool, str]:
        c, r = pos
        if not (0 <= c < self.width and 0 <= r < self.height):
            return False, "Out of bounds."
        if kind not in TOWER_DEFS:
            return False, f"Unknown build kind: {kind}"

        tdef = TOWER_DEFS[kind]
        if self.gold < tdef.cost:
            return False, f"Need {tdef.cost}g (have {self.gold}g)."

        terrain = self.tile_terrain(pos)
        if terrain in ("spawn", "goal", "cliff"):
            return False, f"Cannot build on {terrain}."
        if terrain == "road" and not tdef.is_barricade:
            return False, "Approach road allows Barricades [5] only."
        if pos in self.towers:
            return False, "Tile already occupied."

        for enemy in self.enemies:
            if enemy.alive and not enemy.flying and enemy.tile == pos:
                return False, "Ground enemy occupies that tile."

        if not tdef.is_barricade:
            ground_tiles = [e.tile for e in self.enemies if e.alive and not e.flying]
            ok = can_place_blocking_structure(
                width=self.width,
                height=self.height,
                hard_blocked=self.hard_blocked_tiles(),
                candidate=pos,
                spawns=self.spawns,
                goal=self.goal,
                active_enemy_tiles=ground_tiles,
            )
            if not ok:
                return False, "Blocked! Would seal the last path to Core."

        return True, "OK"

    def place_structure(self, pos: TilePos, kind: Optional[str] = None) -> Tuple[bool, str]:
        build_kind = kind or self.selected_build
        ok, reason = self.can_build_at(pos, build_kind)
        if not ok:
            self._emit("build_denied", reason)
            return False, reason

        tdef = TOWER_DEFS[build_kind]
        self.gold -= tdef.cost
        tower = Tower(
            uid=self._alloc_uid(),
            kind=build_kind,
            tile=pos,
            level=1,
            target_mode="first",
            total_invested=tdef.cost,
            hp=tdef.max_hp,
            max_hp=tdef.max_hp,
        )
        self.towers[pos] = tower
        self.selected_tile = pos
        self._recompute_all_paths()
        msg = f"Built {tdef.name} {tdef.badge} at {pos} (-{tdef.cost}g)."
        self._emit("built", msg)
        return True, msg

    def upgrade_structure(self, pos: Optional[TilePos] = None) -> Tuple[bool, str]:
        tile = pos or self.selected_tile or self.cursor
        tower = self.towers.get(tile)
        if tower is None:
            return False, "No structure selected."
        cost = tower.upgrade_cost
        if cost is None:
            return False, f"{tower.definition.name} is already MAX L3."
        if self.gold < cost:
            msg = f"Upgrade needs {cost}g (have {self.gold}g)."
            self._emit("upgrade_denied", msg)
            return False, msg

        self.gold -= cost
        tower.level += 1
        tower.total_invested += cost
        if tower.is_barricade:
            new_max = {1: 160.0, 2: 270.0, 3: 420.0}[tower.level]
            tower.max_hp = new_max
            tower.hp = new_max
        msg = f"Upgraded {tower.definition.name} to L{tower.level} (-{cost}g)."
        self._emit("upgraded", msg)
        return True, msg

    def repair_structure(self, pos: Optional[TilePos] = None) -> Tuple[bool, str]:
        tile = pos or self.selected_tile or self.cursor
        tower = self.towers.get(tile)
        if tower is None:
            return False, "No structure to repair."
        missing = tower.max_hp - tower.hp
        if missing <= 0.5:
            return False, f"{tower.definition.name} is already intact."
        cost = max(2, int(round(missing * 0.12)))
        if self.gold < cost:
            msg = f"Repair needs {cost}g (have {self.gold}g)."
            self._emit("repair_denied", msg)
            return False, msg

        self.gold -= cost
        tower.hp = tower.max_hp
        msg = f"Repaired {tower.definition.name} to 100% (-{cost}g)."
        self._emit("repaired", msg)
        return True, msg

    def sell_structure(self, pos: Optional[TilePos] = None) -> Tuple[bool, str]:
        tile = pos or self.selected_tile or self.cursor
        tower = self.towers.get(tile)
        if tower is None:
            return False, "No structure to sell."
        refund = tower.sell_refund
        name = tower.definition.name
        del self.towers[tile]
        if self.selected_tile == tile:
            self.selected_tile = None
        self.gold += refund
        self._recompute_all_paths()
        msg = f"Sold {name} (+{refund}g, 70% refund)."
        self._emit("sold", msg)
        return True, msg

    def cycle_target_mode(self, pos: Optional[TilePos] = None, step: int = 1) -> Tuple[bool, str]:
        tile = pos or self.selected_tile or self.cursor
        tower = self.towers.get(tile)
        if tower is None:
            return False, "No turret selected."
        if tower.is_barricade:
            return False, "Barricades do not target enemies."
        idx = TARGET_MODES.index(tower.target_mode)
        tower.target_mode = TARGET_MODES[(idx + step) % len(TARGET_MODES)]
        msg = f"{tower.definition.name} targeting -> {tower.target_mode.upper()}"
        self._emit("target_mode", msg)
        return True, msg

    def select_build_kind(self, kind: str) -> None:
        if kind in TOWER_DEFS:
            self.selected_build = kind
            tdef = TOWER_DEFS[kind]
            self.last_status_message = f"Selected [{tdef.hotkey}] {tdef.name} ({tdef.cost}g)"

    def move_cursor(self, dc: int, dr: int) -> None:
        nc = max(0, min(self.width - 1, self.cursor[0] + dc))
        nr = max(0, min(self.height - 1, self.cursor[1] + dr))
        self.cursor = (nc, nr)
        if self.cursor in self.towers:
            self.selected_tile = self.cursor

    def start_next_wave(self, claim_early_bonus: bool = True) -> Tuple[bool, str]:
        if self.game_over or self.victory:
            return False, "Run has already ended."
        if self.wave_active:
            return False, f"Wave {self.wave_number} already active."

        bonus = 0
        if claim_early_bonus and self.wave_number > 0 and self.prep_timer > 0.5:
            bonus = 10 + int(round(self.prep_timer * 1.5))
            self.gold += bonus

        self.wave_number += 1
        spec = get_wave_spec(self.wave_number)
        self.current_wave_spec = spec
        self.wave_active = True
        self.wave_elapsed = 0.0
        self.prep_timer = 0.0
        self.spawn_queue.clear()

        t = 0.0
        spawn_cursor = 0
        for group in spec.groups:
            t += group.delay_before
            for i in range(group.count):
                if group.spawn_index is not None:
                    sp = self.spawns[group.spawn_index % len(self.spawns)]
                else:
                    sp = self.spawns[spawn_cursor % len(self.spawns)]
                    spawn_cursor += 1
                self.spawn_queue.append((t, group.enemy_kind, sp))
                t += group.interval

        self.spawn_queue.sort(key=lambda item: item[0])
        bonus_txt = f" (+{bonus}g early bonus!)" if bonus > 0 else ""
        msg = f"Wave {self.wave_number}: {spec.title} incoming{bonus_txt}"
        self._emit("wave_started", msg)
        return True, msg

    def step(self, dt: float) -> None:
        """Advance simulation by `dt` seconds (scaled by speed_multiplier)."""
        if self.game_over or self.victory:
            return

        dt = max(0.0, min(dt, 0.1))
        scaled_dt = dt * self.speed_multiplier
        self.sim_time += scaled_dt
        self.anim_tick = int(self.sim_time * 12)
        self.trauma = max(0.0, self.trauma - dt * 1.6)

        if not self.wave_active:
            if self.wave_number > 0 and self.prep_timer > 0.0:
                self.prep_timer -= scaled_dt
                if self.prep_timer <= 0.0:
                    self.start_next_wave(claim_early_bonus=False)
            self._update_effects(scaled_dt)
            return

        self.wave_elapsed += scaled_dt
        while self.spawn_queue and self.spawn_queue[0][0] <= self.wave_elapsed:
            _spawn_t, kind, sp = self.spawn_queue.pop(0)
            self._spawn_enemy(kind, sp)

        self._update_enemies(scaled_dt)
        self._update_towers(scaled_dt)
        self._update_projectiles(scaled_dt)
        self._update_effects(scaled_dt)

        # Clean up dead enemies
        self.enemies = [e for e in self.enemies if e.alive]

        if self.core_hp <= 0.0:
            self.core_hp = 0.0
            self.game_over = True
            self.wave_active = False
            self._emit("game_over", "CITADEL CORE BREACHED! Defenses fallen.")
            return

        if not self.spawn_queue and not self.enemies and self.wave_active:
            self.wave_active = False
            wave_reward = 22 + self.wave_number * 4
            self.gold += wave_reward
            self.score += 100 + self.wave_number * 25
            if not self.endless and self.wave_number >= self.total_waves:
                self.victory = True
                self._emit(
                    "victory",
                    f"CITADEL DEFENDED! All {self.total_waves} waves repelled! Score: {self.score}",
                )
            else:
                self.prep_timer = 14.0
                self._emit(
                    "wave_cleared",
                    f"Wave {self.wave_number} cleared! +{wave_reward}g. [G] Call Wave {self.wave_number + 1} early.",
                )

    def _spawn_enemy(self, kind: str, spawn_pos: TilePos) -> Enemy:
        edef = ENEMY_DEFS[kind]
        mult = self.current_wave_spec.hp_multiplier if self.current_wave_spec else 1.0
        hp = round(edef.hp * mult, 1)
        armor = round(edef.armor * mult, 1)
        if edef.flying:
            path = [spawn_pos, self.goal]
        else:
            g = self.build_graph(is_sapper=(kind == "sapper"))
            path = find_path(g, spawn_pos, self.goal)
            if not path:
                path = [spawn_pos, self.goal]

        enemy = Enemy(
            uid=self._alloc_uid(),
            kind=kind,
            x=float(spawn_pos[0]),
            y=float(spawn_pos[1]),
            hp=hp,
            max_hp=hp,
            armor=armor,
            max_armor=armor,
            speed=edef.speed,
            bounty=edef.bounty,
            core_damage=edef.core_damage,
            barricade_dps=edef.barricade_dps,
            flying=edef.flying,
            is_boss=edef.is_boss,
            path=path,
            waypoint_idx=1 if len(path) > 1 else 0,
            emp_timer=edef.emp_interval,
        )
        enemy.progress_score = self._compute_progress_score(enemy)
        self.enemies.append(enemy)
        if edef.is_boss:
            self._add_trauma(0.35)
            self._emit("boss_spawn", "WARNING: DREAD COLOSSUS [Ω] HAS ENTERED THE FIELD!")
        return enemy

    def _compute_progress_score(self, enemy: Enemy) -> float:
        if enemy.flying:
            return 1000.0 - _dist(enemy.x, enemy.y, float(self.goal[0]), float(self.goal[1]))
        if not enemy.path or enemy.waypoint_idx >= len(enemy.path):
            return 1000.0
        nxt = enemy.path[enemy.waypoint_idx]
        rem = _dist(enemy.x, enemy.y, float(nxt[0]), float(nxt[1]))
        for idx in range(enemy.waypoint_idx, len(enemy.path) - 1):
            a = enemy.path[idx]
            b = enemy.path[idx + 1]
            rem += _dist(float(a[0]), float(a[1]), float(b[0]), float(b[1]))
        return 1000.0 - rem

    def _update_enemies(self, dt: float) -> None:
        for enemy in list(self.enemies):
            if not enemy.alive:
                continue

            if enemy.hit_flash > 0.0:
                enemy.hit_flash = max(0.0, enemy.hit_flash - dt)
            if enemy.chill_timer > 0.0:
                enemy.chill_timer = max(0.0, enemy.chill_timer - dt)
                if enemy.chill_timer == 0.0:
                    enemy.chill_factor = 0.0

            # Dread Colossus periodic EMP shockwave damages nearby barricades
            if enemy.is_boss:
                enemy.emp_timer -= dt
                if enemy.emp_timer <= 0.0:
                    enemy.emp_timer = ENEMY_DEFS["boss"].emp_interval
                    self._trigger_boss_emp(enemy)

            if enemy.flying:
                self._step_flying_enemy(enemy, dt)
            else:
                self._step_ground_enemy(enemy, dt)

            if enemy.alive:
                enemy.progress_score = self._compute_progress_score(enemy)

    def _trigger_boss_emp(self, boss: Enemy) -> None:
        emp_radius = 2.4
        emp_dmg = ENEMY_DEFS["boss"].emp_damage
        self.blasts.append(BlastEffect(boss.x, boss.y, emp_radius, 0.45, 0.45, kind="emp"))
        self._add_trauma(0.28)
        hit_any = False
        for tile, tower in list(self.towers.items()):
            if tower.is_barricade and _dist(boss.x, boss.y, float(tile[0]), float(tile[1])) <= emp_radius:
                self._damage_barricade(tile, emp_dmg)
                hit_any = True
        if hit_any:
            self._emit("boss_emp", "Colossus EMP blast fractured nearby barricades!")

    def _step_flying_enemy(self, enemy: Enemy, dt: float) -> None:
        gx, gy = float(self.goal[0]), float(self.goal[1])
        dist_left = _dist(enemy.x, enemy.y, gx, gy)
        step = enemy.effective_speed * dt
        if dist_left <= max(0.15, step):
            self._enemy_leaked(enemy)
            return
        enemy.x += ((gx - enemy.x) / dist_left) * step
        enemy.y += ((gy - enemy.y) / dist_left) * step

    def _step_ground_enemy(self, enemy: Enemy, dt: float) -> None:
        if enemy.fsm == EnemyFSM.BREACHING:
            b_tile = enemy.breach_target
            if b_tile is None or b_tile not in self.towers or not self.towers[b_tile].is_barricade:
                enemy.fsm = EnemyFSM.MARCHING
                enemy.breach_target = None
            else:
                dmg = enemy.barricade_dps * dt
                self._damage_barricade(b_tile, dmg)
                return

        budget = enemy.effective_speed * dt
        while budget > 1e-6 and enemy.waypoint_idx < len(enemy.path):
            nxt = enemy.path[enemy.waypoint_idx]
            blocker = self.towers.get(nxt)
            if blocker is not None and blocker.is_barricade:
                enemy.fsm = EnemyFSM.BREACHING
                enemy.breach_target = nxt
                return

            tx, ty = float(nxt[0]), float(nxt[1])
            d = _dist(enemy.x, enemy.y, tx, ty)
            if d <= budget:
                enemy.x = tx
                enemy.y = ty
                budget -= d
                enemy.waypoint_idx += 1
            else:
                enemy.x += ((tx - enemy.x) / d) * budget
                enemy.y += ((ty - enemy.y) / d) * budget
                budget = 0.0

        if enemy.waypoint_idx >= len(enemy.path) or (
            enemy.tile == self.goal and _dist(enemy.x, enemy.y, float(self.goal[0]), float(self.goal[1])) <= 0.25
        ):
            self._enemy_leaked(enemy)

    def _damage_barricade(self, tile: TilePos, damage: float) -> None:
        tower = self.towers.get(tile)
        if tower is None or not tower.is_barricade:
            return
        prev_ratio = tower.hp_ratio
        tower.hp -= damage
        new_ratio = tower.hp_ratio
        # Emit narrative alert when crossing structural tier thresholds
        for thresh, label in ((0.75, "CHIPPED"), (0.50, "CRACKED"), (0.25, "CRITICAL")):
            if prev_ratio >= thresh > new_ratio:
                self.popups.append(
                    FloatingPopup(float(tile[0]), float(tile[1]) - 0.3, label, (255, 165, 60), 0.75, 0.75)
                )
        if tower.hp <= 0.0:
            del self.towers[tile]
            if self.selected_tile == tile:
                self.selected_tile = None
            self.blasts.append(BlastEffect(float(tile[0]), float(tile[1]), 1.0, 0.35, 0.35, kind="breach"))
            self.popups.append(
                FloatingPopup(float(tile[0]), float(tile[1]), "SHATTERED!", (255, 80, 95), 0.9, 0.9)
            )
            self._add_trauma(0.24)
            self._recompute_all_paths()
            self._emit("barricade_breached", f"Blast Barricade at {tile} collapsed!")

    def _enemy_leaked(self, enemy: Enemy) -> None:
        if not enemy.alive:
            return
        enemy.alive = False
        self.core_hp = max(0.0, self.core_hp - enemy.core_damage)
        self.blasts.append(
            BlastEffect(float(self.goal[0]), float(self.goal[1]), 1.4, 0.45, 0.45, kind="core_hit")
        )
        self.popups.append(
            FloatingPopup(
                float(self.goal[0]),
                float(self.goal[1]) - 0.2,
                f"-{int(enemy.core_damage)} CORE",
                (255, 70, 90),
                1.0,
                1.0,
            )
        )
        self._add_trauma(min(0.85, 0.28 + enemy.core_damage * 0.012))
        self._emit(
            "core_damaged",
            f"{ENEMY_DEFS[enemy.kind].name} breached Core! (-{int(enemy.core_damage)} HP, bounty lost)",
        )

    def _select_target(self, tower: Tower) -> Optional[Enemy]:
        tdef = tower.definition
        tx, ty = float(tower.tile[0]), float(tower.tile[1])
        r_max = tower.effective_range
        r_min = tdef.min_range_tiles
        candidates: List[Tuple[float, Enemy]] = []
        for enemy in self.enemies:
            if not enemy.alive:
                continue
            if enemy.flying and not tdef.can_hit_air:
                continue
            d = _dist(tx, ty, enemy.x, enemy.y)
            if r_min <= d <= r_max:
                candidates.append((d, enemy))
        if not candidates:
            return None

        mode = tower.target_mode
        if mode == "first":
            return max(candidates, key=lambda item: (item[1].progress_score, -item[1].uid))[1]
        if mode == "last":
            return min(candidates, key=lambda item: (item[1].progress_score, item[1].uid))[1]
        if mode == "closest":
            return min(candidates, key=lambda item: (item[0], item[1].uid))[1]
        if mode == "strongest":
            return max(candidates, key=lambda item: (item[1].hp + item[1].armor, -item[1].uid))[1]
        if mode == "weakest":
            return min(candidates, key=lambda item: (item[1].hp + item[1].armor, item[1].uid))[1]
        return candidates[0][1]

    def _update_towers(self, dt: float) -> None:
        for tower in self.towers.values():
            if tower.fire_flash > 0.0:
                tower.fire_flash = max(0.0, tower.fire_flash - dt)
            if tower.is_barricade:
                continue
            tower.cooldown = max(0.0, tower.cooldown - dt)
            if tower.cooldown > 0.0:
                continue

            target = self._select_target(tower)
            if target is None:
                continue

            tx, ty = float(tower.tile[0]), float(tower.tile[1])
            tower.aim = _cardinal_aim(target.x - tx, target.y - ty)
            tower.cooldown = tower.effective_fire_interval
            tower.fire_flash = 0.18
            self._fire_tower(tower, target)

    def _fire_tower(self, tower: Tower, target: Enemy) -> None:
        tx, ty = float(tower.tile[0]), float(tower.tile[1])
        dmg = tower.effective_damage
        kind = tower.kind

        if kind == "pulse":
            self.projectiles.append(
                Projectile(
                    uid=self._alloc_uid(),
                    kind="pulse",
                    glyph="->",
                    source_tower_uid=tower.uid,
                    start_x=tx,
                    start_y=ty,
                    x=tx,
                    y=ty,
                    target_x=target.x,
                    target_y=target.y,
                    target_enemy_uid=target.uid,
                    speed=15.0,
                    damage=dmg,
                )
            )
        elif kind == "tesla":
            self._fire_tesla_chain(tower, target, dmg)
        elif kind == "mortar":
            self.projectiles.append(
                Projectile(
                    uid=self._alloc_uid(),
                    kind="mortar",
                    glyph="***",
                    source_tower_uid=tower.uid,
                    start_x=tx,
                    start_y=ty,
                    x=tx,
                    y=ty,
                    target_x=target.x,
                    target_y=target.y,
                    target_enemy_uid=None,
                    speed=4.8,
                    damage=dmg,
                    splash_radius=tower.definition.splash_radius,
                    arc_height=1.7,
                )
            )
        elif kind == "cryo":
            self.projectiles.append(
                Projectile(
                    uid=self._alloc_uid(),
                    kind="cryo",
                    glyph="*>",
                    source_tower_uid=tower.uid,
                    start_x=tx,
                    start_y=ty,
                    x=tx,
                    y=ty,
                    target_x=target.x,
                    target_y=target.y,
                    target_enemy_uid=target.uid,
                    speed=11.0,
                    damage=dmg,
                    slow_factor=tower.definition.slow_factor,
                    slow_duration=tower.definition.slow_duration,
                )
            )

    def _fire_tesla_chain(self, tower: Tower, first_target: Enemy, base_dmg: float) -> None:
        tx, ty = float(tower.tile[0]), float(tower.tile[1])
        chains = tower.effective_chains
        struck: Set[int] = set()
        segments: List[Tuple[float, float, float, float]] = []

        prev_x, prev_y = tx, ty
        current: Optional[Enemy] = first_target
        hop_dmg = base_dmg

        for _ in range(chains):
            if current is None or not current.alive:
                break
            segments.append((prev_x, prev_y, current.x, current.y))
            struck.add(current.uid)
            dmg = hop_dmg * (1.25 if current.armor > 0.0 else 1.0)
            self._apply_damage(current, dmg, source_tower_uid=tower.uid)
            prev_x, prev_y = current.x, current.y
            hop_dmg *= 0.80

            # Find nearest un-struck living enemy within 2.3 tiles of current
            nxt: Optional[Enemy] = None
            best_d = 2.35
            for e in self.enemies:
                if not e.alive or e.uid in struck:
                    continue
                d = _dist(prev_x, prev_y, e.x, e.y)
                if d <= best_d:
                    best_d = d
                    nxt = e
            current = nxt

        if segments:
            self.lightning_arcs.append(LightningArc(segments=segments, timer=0.26, duration=0.26))
            if len(segments) >= 2:
                self._add_trauma(0.08)

    def _find_enemy(self, uid: Optional[int]) -> Optional[Enemy]:
        if uid is None:
            return None
        for e in self.enemies:
            if e.uid == uid and e.alive:
                return e
        return None

    def _find_tower_by_uid(self, uid: int) -> Optional[Tower]:
        for t in self.towers.values():
            if t.uid == uid:
                return t
        return None

    def _update_projectiles(self, dt: float) -> None:
        for proj in self.projectiles:
            if proj.finished:
                continue

            proj.trail.append((proj.x, proj.y))
            if len(proj.trail) > 4:
                proj.trail = proj.trail[-4:]

            if proj.target_enemy_uid is not None:
                target = self._find_enemy(proj.target_enemy_uid)
                if target is not None:
                    proj.target_x = target.x
                    proj.target_y = target.y

            total_dist = max(0.2, _dist(proj.start_x, proj.start_y, proj.target_x, proj.target_y))
            proj.progress = min(1.0, proj.progress + (proj.speed * dt) / total_dist)

            p = proj.progress
            proj.x = proj.start_x + (proj.target_x - proj.start_x) * p
            arc_offset = proj.arc_height * (4.0 * p * (1.0 - p)) if proj.arc_height > 0.0 else 0.0
            proj.y = proj.start_y + (proj.target_y - proj.start_y) * p - arc_offset

            if proj.progress >= 1.0:
                proj.finished = True
                self._detonate_projectile(proj)

        self.projectiles = [p for p in self.projectiles if not p.finished]

    def _detonate_projectile(self, proj: Projectile) -> None:
        if proj.kind == "mortar":
            self.blasts.append(
                BlastEffect(proj.target_x, proj.target_y, proj.splash_radius, 0.42, 0.42, kind="mortar")
            )
            self._add_trauma(0.20)
            for enemy in list(self.enemies):
                if not enemy.alive or enemy.flying:
                    continue
                d = _dist(proj.target_x, proj.target_y, enemy.x, enemy.y)
                if d <= proj.splash_radius:
                    falloff = 1.0 if d <= proj.splash_radius * 0.55 else max(0.55, 1.0 - 0.45 * (d / proj.splash_radius))
                    self._apply_damage(enemy, proj.damage * falloff, source_tower_uid=proj.source_tower_uid)
            return

        target = self._find_enemy(proj.target_enemy_uid)
        if target is None:
            # Fallback proximity hit for pulse/cryo if original enemy died mid-flight
            best = None
            best_d = 0.75
            for e in self.enemies:
                if not e.alive:
                    continue
                d = _dist(proj.target_x, proj.target_y, e.x, e.y)
                if d <= best_d:
                    best_d = d
                    best = e
            target = best

        if target is not None:
            self._apply_damage(target, proj.damage, source_tower_uid=proj.source_tower_uid)
            if proj.slow_factor > 0.0 and target.alive:
                target.chill_factor = max(target.chill_factor, proj.slow_factor)
                target.chill_timer = max(target.chill_timer, proj.slow_duration)

    def _apply_damage(self, enemy: Enemy, amount: float, source_tower_uid: int) -> None:
        if not enemy.alive or amount <= 0.0:
            return
        remaining = amount
        if enemy.armor > 0.0:
            absorbed = min(enemy.armor, remaining)
            enemy.armor -= absorbed
            remaining -= absorbed
        if remaining > 0.0:
            enemy.hp -= remaining
        enemy.hit_flash = 0.14

        tower = self._find_tower_by_uid(source_tower_uid)
        if tower is not None:
            tower.total_damage += amount

        if enemy.hp <= 0.0:
            enemy.hp = 0.0
            enemy.alive = False
            self.gold += enemy.bounty
            self.kills += 1
            self.score += enemy.bounty * 10
            if tower is not None:
                tower.kills += 1
            self.popups.append(
                FloatingPopup(enemy.x, enemy.y - 0.25, f"+{enemy.bounty}g", (255, 220, 80), 0.75, 0.75)
            )
            if enemy.is_boss:
                self._add_trauma(0.55)
                self.blasts.append(BlastEffect(enemy.x, enemy.y, 2.2, 0.55, 0.55, kind="mortar"))
                self._emit("boss_killed", f"DREAD COLOSSUS DESTROYED! (+{enemy.bounty}g)")
        elif amount >= 26.0:
            self.popups.append(
                FloatingPopup(enemy.x, enemy.y - 0.2, f"-{int(round(amount))}", (255, 195, 100), 0.55, 0.55)
            )

    def _update_effects(self, dt: float) -> None:
        for arc in self.lightning_arcs:
            arc.timer -= dt
        self.lightning_arcs = [a for a in self.lightning_arcs if a.timer > 0.0]

        for blast in self.blasts:
            blast.timer -= dt
        self.blasts = [b for b in self.blasts if b.timer > 0.0]

        for pop in self.popups:
            pop.timer -= dt
            pop.y -= dt * 0.45
        self.popups = [p for p in self.popups if p.timer > 0.0]

    def summary_stats(self) -> Dict[str, object]:
        return {
            "map_id": self.preset.map_id,
            "wave": self.wave_number,
            "gold": self.gold,
            "core_hp": round(self.core_hp, 1),
            "towers": len(self.towers),
            "enemies_alive": len(self.enemies),
            "kills": self.kills,
            "score": self.score,
            "victory": self.victory,
            "game_over": self.game_over,
        }
