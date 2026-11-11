"""Screen state machine, battlefield ASCII renderer, HUD, and modal overlays."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .ascii_buffer import AsciiBuffer
from .game import GameSimulation
from .models import (
    BUILD_ORDER,
    MAP_PRESETS,
    TILE_H,
    TILE_W,
    TOWER_DEFS,
    ScreenState,
)
from .pathfinding import TilePos
from .sprites import (
    AMBER,
    CRIMSON,
    CYAN,
    DARK_SLATE,
    DIM,
    GREEN,
    MAGENTA,
    PATH_BG,
    RED,
    SILVER,
    SKY,
    TILE_BG,
    TOWER_PALETTE,
    WALL_BG,
    WHITE,
    YELLOW,
    barricade_sprite,
    core_sprite,
    directional_arrow,
    enemy_sprite,
    structural_damage_visual,
    turret_frames_for_display,
)
from .studio import SpriteStudioState, render_studio

Color = Tuple[int, int, int]


class AppState:
    """Top-level application state owning screen stack, simulation, and Studio."""

    def __init__(
        self,
        map_id: str = "twin_bastion",
        seed: int = 42,
        start_in_studio: bool = False,
        reduce_shake: bool = False,
        export_dir: Optional[Path] = None,
    ) -> None:
        self.map_index: int = 0
        for idx, preset in enumerate(MAP_PRESETS):
            if preset.map_id == map_id:
                self.map_index = idx
                break
        self.seed = seed
        self.reduce_shake = reduce_shake
        self.sim = GameSimulation(map_id=MAP_PRESETS[self.map_index].map_id, seed=seed)
        self.sim.reduce_shake = reduce_shake
        self.studio = SpriteStudioState(export_dir=export_dir)
        self.stack: List[ScreenState] = [ScreenState.MENU]
        if start_in_studio:
            self.stack.append(ScreenState.STUDIO)
        self.menu_focus: int = 0
        self.pause_focus: int = 0
        self.should_quit: bool = False
        self.show_paths: bool = True

    @property
    def current_screen(self) -> ScreenState:
        return self.stack[-1] if self.stack else ScreenState.MENU

    def push_screen(self, screen: ScreenState) -> None:
        if self.current_screen != screen:
            self.stack.append(screen)

    def pop_screen(self) -> None:
        if len(self.stack) > 1:
            self.stack.pop()

    def start_new_game(self, map_idx: Optional[int] = None) -> None:
        if map_idx is not None:
            self.map_index = map_idx % len(MAP_PRESETS)
        preset = MAP_PRESETS[self.map_index]
        self.sim = GameSimulation(map_id=preset.map_id, seed=self.seed)
        self.sim.reduce_shake = self.reduce_shake
        self.stack = [ScreenState.PLAYING]

    def open_studio(self) -> None:
        if self.current_screen != ScreenState.STUDIO:
            self.stack.append(ScreenState.STUDIO)

    def toggle_pause(self) -> None:
        if self.current_screen == ScreenState.PLAYING:
            self.pause_focus = 0
            self.stack.append(ScreenState.PAUSED)
        elif self.current_screen == ScreenState.PAUSED:
            self.pop_screen()

    def update(self, dt: float) -> None:
        screen = self.current_screen
        if screen == ScreenState.PLAYING:
            self.sim.step(dt)
            if self.sim.victory:
                self.push_screen(ScreenState.VICTORY)
            elif self.sim.game_over:
                self.push_screen(ScreenState.GAMEOVER)
        elif screen == ScreenState.STUDIO:
            self.studio.update(dt)

    def visual_shake_offset(self) -> Tuple[float, float]:
        if self.reduce_shake or self.current_screen != ScreenState.PLAYING:
            return 0.0, 0.0
        t = self.sim.trauma
        if t <= 0.01:
            return 0.0, 0.0
        mag = (t * t) * 2.0
        ox = mag * math.sin(self.sim.sim_time * 47.0)
        oy = mag * math.cos(self.sim.sim_time * 53.0)
        return ox, oy

    def handle_cell_click(self, buf_col: int, buf_row: int) -> None:
        """Handle mouse click on a 100x32 AsciiBuffer cell."""
        screen = self.current_screen
        if screen == ScreenState.MENU:
            x0, y0 = (100 - 62) // 2, (32 - 18) // 2
            for idx in range(4):
                ry = y0 + 6 + idx * 2
                if x0 + 4 <= buf_col <= x0 + 58 and buf_row == ry:
                    self.menu_focus = idx
                    self.handle_key("enter")
                    return
            return

        if screen == ScreenState.STUDIO:
            # Click inside Asset Catalog rows 4..24 cols 1..28
            if 1 <= buf_col <= 28 and 4 <= buf_row <= 24:
                max_visible = 21
                start = max(
                    0,
                    min(
                        self.studio.asset_index - max_visible // 2,
                        max(0, len(self.studio.catalog) - max_visible),
                    ),
                )
                clicked = start + (buf_row - 4)
                if 0 <= clicked < len(self.studio.catalog):
                    self.studio.select_asset(clicked - self.studio.asset_index)
            return

        if screen != ScreenState.PLAYING:
            return

        # Battlefield tile click (cols 0..74, rows 3..26)
        if 0 <= buf_col < 75 and 3 <= buf_row < 27:
            tc = buf_col // TILE_W
            tr = (buf_row - 3) // TILE_H
            self.sim.cursor = (tc, tr)
            if self.sim.cursor in self.sim.towers:
                self.sim.selected_tile = self.sim.cursor
            else:
                self.sim.place_structure(self.sim.cursor)
            return

        # Right-panel Arsenal clicks (cols 76..98, rows 4..8)
        if 76 <= buf_col <= 98 and 4 <= buf_row < 4 + len(BUILD_ORDER):
            self.sim.select_build_kind(BUILD_ORDER[buf_row - 4])

    def handle_key(self, key: str) -> None:
        """Dispatch normalized key events across the screen state stack."""
        if not key:
            return
        low = key.lower() if len(key) > 1 or key.isalpha() else key

        if low == "f2":
            if self.current_screen == ScreenState.STUDIO:
                self.studio.paint_mode = False
                self.pop_screen()
            else:
                self.open_studio()
            return

        screen = self.current_screen
        if screen == ScreenState.MENU:
            self._handle_menu_key(low)
        elif screen == ScreenState.PLAYING:
            self._handle_play_key(low)
        elif screen == ScreenState.PAUSED:
            self._handle_pause_key(low)
        elif screen == ScreenState.STUDIO:
            self._handle_studio_key(key, low)
        elif screen in (ScreenState.VICTORY, ScreenState.GAMEOVER):
            self._handle_end_key(low)

    def _handle_menu_key(self, low: str) -> None:
        if low in ("up", "w", "k"):
            self.menu_focus = (self.menu_focus - 1) % 4
        elif low in ("down", "s", "j"):
            self.menu_focus = (self.menu_focus + 1) % 4
        elif low in ("left", "a") and self.menu_focus in (0, 1):
            self.map_index = (self.map_index - 1) % len(MAP_PRESETS)
            self.sim = GameSimulation(map_id=MAP_PRESETS[self.map_index].map_id, seed=self.seed)
        elif low in ("right", "d") and self.menu_focus in (0, 1):
            self.map_index = (self.map_index + 1) % len(MAP_PRESETS)
            self.sim = GameSimulation(map_id=MAP_PRESETS[self.map_index].map_id, seed=self.seed)
        elif low in ("enter", "space"):
            if self.menu_focus == 0:
                self.start_new_game(self.map_index)
            elif self.menu_focus == 1:
                self.map_index = (self.map_index + 1) % len(MAP_PRESETS)
                self.sim = GameSimulation(map_id=MAP_PRESETS[self.map_index].map_id, seed=self.seed)
            elif self.menu_focus == 2:
                self.open_studio()
            elif self.menu_focus == 3:
                self.should_quit = True
        elif low in ("q", "esc"):
            self.should_quit = True

    def _handle_play_key(self, low: str) -> None:
        if low in ("up", "w"):
            self.sim.move_cursor(0, -1)
        elif low in ("down", "s"):
            self.sim.move_cursor(0, 1)
        elif low in ("left", "a"):
            self.sim.move_cursor(-1, 0)
        elif low in ("right", "d"):
            self.sim.move_cursor(1, 0)
        elif low in ("1", "2", "3", "4", "5"):
            self.sim.select_build_kind(BUILD_ORDER[int(low) - 1])
        elif low in ("enter", "space"):
            if self.sim.cursor in self.sim.towers:
                self.sim.selected_tile = self.sim.cursor
                t = self.sim.towers[self.sim.cursor]
                self.sim.last_status_message = f"Selected {t.definition.name} L{t.level} at {self.sim.cursor}"
            else:
                self.sim.place_structure(self.sim.cursor)
        elif low == "u":
            self.sim.upgrade_structure()
        elif low == "t":
            self.sim.cycle_target_mode()
        elif low == "r":
            self.sim.repair_structure()
        elif low in ("x", "backspace", "delete"):
            self.sim.sell_structure()
        elif low == "g":
            self.sim.start_next_wave(claim_early_bonus=True)
        elif low == "f":
            speeds = (1.0, 2.0, 4.0)
            try:
                idx = speeds.index(self.sim.speed_multiplier)
                self.sim.speed_multiplier = speeds[(idx + 1) % len(speeds)]
            except ValueError:
                self.sim.speed_multiplier = 1.0
            self.sim.last_status_message = f"Game speed -> {self.sim.speed_multiplier:.0f}x"
        elif low == "v":
            self.show_paths = not self.show_paths
        elif low == "m":
            self.start_new_game(self.map_index + 1)
        elif low in ("p", "esc"):
            self.toggle_pause()

    def _handle_pause_key(self, low: str) -> None:
        if low in ("p", "esc", "enter", "space"):
            self.pop_screen()
        elif low == "n":
            self.start_new_game(self.map_index)
        elif low == "m":
            self.stack = [ScreenState.MENU]
        elif low == "q":
            self.should_quit = True

    def _handle_studio_key(self, raw: str, low: str) -> None:
        if self.studio.paint_mode:
            if low == "esc" or low == "e":
                self.studio.toggle_paint_mode()
            elif low == "up":
                self.studio.move_edit_cursor(0, -1)
            elif low == "down":
                self.studio.move_edit_cursor(0, 1)
            elif low == "left":
                self.studio.move_edit_cursor(-1, 0)
            elif low == "right":
                self.studio.move_edit_cursor(1, 0)
            elif low in ("backspace", "delete"):
                self.studio.paint_cell(" ")
            elif low == "space":
                self.studio.paint_cell(" ")
            elif len(raw) == 1 and 32 <= ord(raw) < 127:
                self.studio.paint_cell(raw)
            return

        if low == "esc":
            self.pop_screen()
        elif low == "e":
            self.studio.toggle_paint_mode()
        elif low in ("up",):
            self.studio.select_asset(-1)
        elif low in ("down",):
            self.studio.select_asset(1)
        elif low in ("left", "["):
            self.studio.step_frame(-1)
        elif low in ("right", "]"):
            self.studio.step_frame(1)
        elif low == "space":
            self.studio.toggle_play()
        elif low == "v":
            self.studio.cycle_speed()
        elif low in ("-", "_"):
            self.studio.adjust_damage(-0.15)
        elif low in ("=", "+"):
            self.studio.adjust_damage(0.15)
        elif low == "i":
            self.studio.move_edit_cursor(0, -1)
        elif low == "k":
            self.studio.move_edit_cursor(0, 1)
        elif low == "j":
            self.studio.move_edit_cursor(-1, 0)
        elif low == "l":
            self.studio.move_edit_cursor(1, 0)
        elif low == "r":
            self.studio.reset_catalog()
        elif low == "x":
            self.studio.export_json()

    def _handle_end_key(self, low: str) -> None:
        if low in ("enter", "space", "n"):
            self.start_new_game(self.map_index)
        elif low == "m":
            self.stack = [ScreenState.MENU]
        elif low == "q":
            self.should_quit = True


def _tile_to_buf(tx: float, ty: float) -> Tuple[int, int]:
    """Convert continuous map tile coords to top-left character cell (for 5x3 tiles)."""
    col = int(round(tx * TILE_W))
    row = 3 + int(round(ty * TILE_H))
    return col, row


def _draw_top_hud(buf: AsciiBuffer, sim: GameSimulation) -> None:
    buf.draw_box(0, 0, buf.cols, 3, title="", border_fg=(65, 98, 138), fill_bg=(13, 18, 28))
    wave_label = f"WAVE {sim.wave_number}/{sim.total_waves}"
    wave_col = YELLOW if sim.wave_active else CYAN
    buf.draw_text(2, 1, sim.preset.name[:18], WHITE)
    buf.draw_text(22, 1, wave_label, wave_col)
    buf.draw_text(35, 1, f"GOLD:{sim.gold:>4d}g", YELLOW)

    c_blocks, c_tier, c_col = structural_damage_visual(sim.core_hp_ratio)
    buf.draw_text(48, 1, f"CORE:{int(sim.core_hp):>3d}/{int(sim.max_core_hp)} {c_blocks}", c_col)

    spd_txt = f"{sim.speed_multiplier:.0f}x" if sim.speed_multiplier >= 1 else f"{sim.speed_multiplier:.1f}x"
    status_badge = f"ACTIVE {spd_txt}" if sim.wave_active else (f"NEXT {int(sim.prep_timer)}s" if sim.prep_timer > 0 else f"PREP {spd_txt}")
    buf.draw_text(69, 1, status_badge, GREEN if not sim.wave_active else AMBER)
    buf.draw_text(84, 1, "[F2] Studio [P]", SILVER)


def _draw_battlefield(buf: AsciiBuffer, app: AppState) -> None:
    sim = app.sim
    # Compute range preview center if cursor hovers tower or buildable tile
    hovered_tower = sim.towers.get(sim.cursor)
    preview_center: Optional[TilePos] = None
    preview_r_max = 0.0
    preview_r_min = 0.0
    if hovered_tower is not None and not hovered_tower.is_barricade:
        preview_center = hovered_tower.tile
        preview_r_max = hovered_tower.effective_range
        preview_r_min = hovered_tower.definition.min_range_tiles
    elif hovered_tower is None:
        tdef = TOWER_DEFS[sim.selected_build]
        if not tdef.is_barricade and sim.tile_terrain(sim.cursor) == "open":
            preview_center = sim.cursor
            preview_r_max = tdef.range_tiles
            preview_r_min = tdef.min_range_tiles

    path_tiles = set()
    if app.show_paths:
        for p in sim.spawn_paths.values():
            path_tiles.update(p)

    # 1. Terrain Layer (15x8 tiles at 5x3 chars each -> cols 0..74, rows 3..26)
    for tr in range(sim.height):
        for tc in range(sim.width):
            pos = (tc, tr)
            x0 = tc * TILE_W
            y0 = 3 + tr * TILE_H
            terrain = sim.tile_terrain(pos)

            in_range = False
            if preview_center is not None:
                d = math.hypot(tc - preview_center[0], tr - preview_center[1])
                in_range = preview_r_min <= d <= preview_r_max

            if terrain == "cliff":
                bg = WALL_BG
                buf.fill_rect(x0, y0, TILE_W, TILE_H, "▓", (52, 62, 82), bg)
                buf.draw_text(x0, y0, "▄█▓█▄", (72, 84, 108), bg)
                buf.draw_text(x0, y0 + 2, "▀▓█▓▀", (60, 70, 92), bg)
            elif terrain == "spawn":
                pulse = SKY if (sim.anim_tick // 3) % 2 == 0 else CYAN
                buf.fill_rect(x0, y0, TILE_W, TILE_H, " ", pulse, (20, 32, 48))
                buf.draw_sprite(x0, y0, ["╔═══╗", "║>>>║", "╚═══╝"], default_fg=pulse, transparent_space=False)
            elif terrain == "goal":
                c_lines, c_pal = core_sprite(sim.core_hp_ratio, sim.anim_tick)
                buf.fill_rect(x0, y0, TILE_W, TILE_H, " ", CYAN, (18, 28, 44))
                buf.draw_sprite(x0, y0, c_lines, palette=c_pal, default_fg=CYAN, transparent_space=False)
            elif terrain == "road":
                bg = (26, 46, 64) if in_range else PATH_BG
                buf.fill_rect(x0, y0, TILE_W, TILE_H, " ", (75, 90, 118), bg)
                buf.draw_text(x0, y0 + 1, "══·══", (78, 96, 126), bg)
            else:
                bg = (22, 42, 60) if in_range else TILE_BG
                buf.fill_rect(x0, y0, TILE_W, TILE_H, " ", DIM, bg)
                marker = "·" if pos in path_tiles else "."
                marker_col = (88, 128, 160) if pos in path_tiles else (46, 56, 74)
                buf.draw_text(x0 + 2, y0 + 1, marker, marker_col, bg)

    # 2. Towers & Barricades Layer
    for pos, tower in sim.towers.items():
        x0 = pos[0] * TILE_W
        y0 = 3 + pos[1] * TILE_H
        if tower.is_barricade:
            b_lines, b_pal = barricade_sprite(tower.hp_ratio)
            buf.draw_sprite(x0, y0, b_lines, palette=b_pal, transparent_space=True)
            if tower.level > 1:
                buf.draw_text(x0 + 3, y0, f"L{tower.level}", WHITE)
        else:
            custom = (
                app.studio.live_turret_frame(tower.kind)
                if (tower.level == 1 and tower.fire_flash <= 0.0 and tower.aim in ("R", "L"))
                else None
            )
            lines = custom or turret_frames_for_display(
                tower.kind,
                level=tower.level,
                firing=(tower.fire_flash > 0.0),
                aim=tower.aim,
                anim_tick=sim.anim_tick,
            )
            pal = dict(TOWER_PALETTE)
            if tower.fire_flash > 0.0:
                buf.draw_sprite(x0, y0, lines, palette=pal, override_fg=WHITE, transparent_space=True)
            else:
                buf.draw_sprite(x0, y0, lines, palette=pal, default_fg=WHITE, transparent_space=True)

    # 3. Mortar Reticles [x] before shell lands
    for proj in sim.projectiles:
        if proj.kind == "mortar":
            tx, ty = _tile_to_buf(proj.target_x, proj.target_y)
            if 0 <= tx + 1 < 75 and 3 <= ty + 1 < 27:
                ret_col = RED if (sim.anim_tick % 4 < 2) else AMBER
                buf.draw_text(tx + 1, ty + 1, "[x]", ret_col)

    # 4. Enemies Layer
    for enemy in sim.enemies:
        if not enemy.alive:
            continue
        x0, y0 = _tile_to_buf(enemy.x, enemy.y)
        x0 = max(0, min(70, x0))
        y0 = max(3, min(24, y0))
        e_lines, e_pal = enemy_sprite(
            enemy.kind,
            enemy.hp_ratio,
            enemy.armor_ratio,
            tick=sim.anim_tick,
            chilled=(enemy.chill_timer > 0.0),
        )
        override = WHITE if enemy.hit_flash > 0.0 else None
        buf.draw_sprite(x0, y0, e_lines, palette=e_pal, override_fg=override, transparent_space=True)

    # 5. Projectiles Layer (->, ***, *>)
    for proj in sim.projectiles:
        for idx, (tr_x, tr_y) in enumerate(proj.trail):
            tc = int(round(tr_x * TILE_W)) + 2
            tr = 3 + int(round(tr_y * TILE_H)) + 1
            if 0 <= tc < 75 and 3 <= tr < 27:
                trail_ch = "·" if idx < 2 else "•"
                trail_col = AMBER if proj.kind == "mortar" else (SKY if proj.kind == "cryo" else YELLOW)
                buf.set_cell(tc, tr, trail_ch, trail_col)

        px = int(round(proj.x * TILE_W)) + 1
        py = 3 + int(round(proj.y * TILE_H)) + 1
        if proj.kind == "pulse":
            dx = proj.target_x - proj.start_x
            dy = proj.target_y - proj.start_y
            arrow = directional_arrow(dx, dy) if abs(dy) > abs(dx) * 1.4 else ("<-" if dx < 0 else "->")
            if 0 <= px < 74 and 3 <= py < 27:
                buf.draw_text(px, py, arrow, CYAN)
        elif proj.kind == "mortar":
            if 0 <= px < 73 and 3 <= py < 27:
                buf.draw_text(px, py, "***", YELLOW if (sim.anim_tick % 2 == 0) else AMBER)
        elif proj.kind == "cryo":
            if 0 <= px < 74 and 3 <= py < 27:
                buf.draw_text(px, py, "*>", SKY)

    # 6. Chain Lightning Arcs (⚡)
    for arc in sim.lightning_arcs:
        for sx, sy, ex, ey in arc.segments:
            c0 = int(round(sx * TILE_W)) + 2
            r0 = 3 + int(round(sy * TILE_H)) + 1
            c1 = int(round(ex * TILE_W)) + 2
            r1 = 3 + int(round(ey * TILE_H)) + 1
            steps = max(2, abs(c1 - c0), abs(r1 - r0))
            for s in range(1, steps):
                t = s / steps
                jc = int(round(c0 + (c1 - c0) * t)) + ((s % 2) - 1 if abs(r1 - r0) > abs(c1 - c0) else 0)
                jr = int(round(r0 + (r1 - r0) * t))
                if 0 <= jc < 75 and 3 <= jr < 27:
                    ch = "⚡" if s == steps // 2 else ("ϟ" if s % 2 == 0 else "~")
                    buf.set_cell(jc, jr, ch, YELLOW if s % 2 else CYAN)
            if 0 <= c1 < 75 and 3 <= r1 < 27:
                buf.set_cell(c1, r1, "⚡", YELLOW)

    # 7. Blast Explosions (*** -> +*+ -> ·*·)
    for blast in sim.blasts:
        ratio = max(0.0, 1.0 - blast.timer / max(0.01, blast.duration))
        cx = int(round(blast.x * TILE_W)) + 2
        cy = 3 + int(round(blast.y * TILE_H)) + 1
        glyph = "***" if ratio < 0.35 else ("+*+" if ratio < 0.7 else "·*·")
        b_col = RED if blast.kind in ("core_hit", "breach") else (MAGENTA if blast.kind == "emp" else AMBER)
        for ox, oy, ch in ((-2, 0, glyph[0]), (0, 0, glyph[1]), (2, 0, glyph[2]), (0, -1, "*"), (0, 1, "*")):
            if 0 <= cx + ox < 75 and 3 <= cy + oy < 27:
                buf.set_cell(cx + ox, cy + oy, ch, b_col)

    # 8. Floating Popups
    for pop in sim.popups:
        px = max(0, min(74 - len(pop.text), int(round(pop.x * TILE_W))))
        py = max(3, min(26, 3 + int(round(pop.y * TILE_H))))
        buf.draw_text(px, py, pop.text, pop.color)

    # 9. Battlefield Cursor Highlight
    cx0 = sim.cursor[0] * TILE_W
    cy0 = 3 + sim.cursor[1] * TILE_H
    if sim.cursor in sim.towers:
        cur_col = YELLOW
    else:
        ok, _reason = sim.can_build_at(sim.cursor, sim.selected_build)
        cur_col = GREEN if ok else RED
    buf.set_cell(cx0, cy0, "┏", cur_col)
    buf.set_cell(cx0 + 4, cy0, "┓", cur_col)
    buf.set_cell(cx0, cy0 + 2, "┗", cur_col)
    buf.set_cell(cx0 + 4, cy0 + 2, "┛", cur_col)


def _draw_right_panel(buf: AsciiBuffer, sim: GameSimulation) -> None:
    # Build Arsenal (cols 75..99, rows 3..12)
    buf.draw_box(75, 3, 25, 10, title="ARSENAL [1-5]", border_fg=(65, 98, 138), title_fg=CYAN, fill_bg=(12, 16, 25))
    for i, kind in enumerate(BUILD_ORDER):
        tdef = TOWER_DEFS[kind]
        selected = sim.selected_build == kind
        afford = sim.gold >= tdef.cost
        fg = WHITE if selected else (GREEN if afford else CRIMSON)
        bg = (28, 52, 82) if selected else (12, 16, 25)
        mark = ">" if selected else " "
        row_txt = f"{mark}[{tdef.hotkey}]{tdef.badge:<5} {tdef.cost:>3d}g"[:23].ljust(23)
        buf.draw_text(76, 4 + i, row_txt, fg, bg)

    # Quick selected turret description inside arsenal footer
    active_def = TOWER_DEFS[sim.selected_build]
    buf.draw_text(76, 10, active_def.name[:23], CYAN)
    buf.draw_text(76, 11, active_def.description[:23], SILVER)

    # Inspector & Actions (cols 75..99, rows 13..26)
    buf.draw_box(75, 13, 25, 14, title="INSPECTOR", border_fg=(65, 98, 138), title_fg=AMBER, fill_bg=(12, 16, 25))
    tower = sim.towers.get(sim.cursor) or (sim.towers.get(sim.selected_tile) if sim.selected_tile else None)
    if tower is not None:
        tdef = tower.definition
        buf.draw_text(76, 14, f"{tdef.name[:16]} L{tower.level}", WHITE)
        if tower.is_barricade:
            blocks, tier, bcol = structural_damage_visual(tower.hp_ratio)
            buf.draw_text(76, 15, f"HP: {int(tower.hp)}/{int(tower.max_hp)}", SILVER)
            buf.draw_text(76, 16, f"Wall: {blocks} {tier}", bcol)
            buf.draw_bar(76, 17, 22, tower.hp_ratio, fg=bcol)
            repair_cost = max(2, int(round((tower.max_hp - tower.hp) * 0.12))) if tower.hp < tower.max_hp - 0.5 else 0
            buf.draw_text(76, 19, f"[R] Repair ({repair_cost}g)" if repair_cost else "[R] Intact (100%)", GREEN if not repair_cost else YELLOW)
        else:
            buf.draw_text(76, 15, f"DMG:{tower.effective_damage:>4.0f} RNG:{tower.effective_range:.1f}", SILVER)
            buf.draw_text(76, 16, f"RoF:{tower.effective_fire_interval:.2f}s KILLS:{tower.kills}", SILVER)
            buf.draw_text(76, 17, f"[T] Aim: {tower.target_mode.upper():<9}", CYAN)
            buf.draw_text(76, 18, f"Total Dmg: {int(tower.total_damage)}", DIM)
        up_cost = tower.upgrade_cost
        up_txt = f"[U] Upgr ({up_cost}g)" if up_cost else "[U] MAX LEVEL (L3)"
        buf.draw_text(76, 20, up_txt[:23], YELLOW if up_cost else GREEN)
        buf.draw_text(76, 21, f"[X] Sell (+{tower.sell_refund}g)", AMBER)
    else:
        ok, msg = sim.can_build_at(sim.cursor, sim.selected_build)
        terrain = sim.tile_terrain(sim.cursor).upper()
        buf.draw_text(76, 14, f"Tile {sim.cursor} ({terrain})", WHITE)
        buf.draw_text(76, 15, ("READY TO BUILD" if ok else "BUILD BLOCKED")[:23], GREEN if ok else RED)
        buf.draw_text(76, 16, msg[:23], SILVER)
        buf.draw_text(76, 18, "Next Wave Forecast:", YELLOW)
        nw = sim.next_wave_spec
        buf.draw_text(76, 19, f"W{nw.wave_number}: {nw.title}"[:23], CYAN)
        buf.draw_text(76, 20, nw.composition_summary()[:23], WHITE)
        buf.draw_text(76, 21, nw.composition_summary()[23:46], WHITE)

    buf.draw_text(76, 23, "[G] Start/Call Wave", GREEN)
    buf.draw_text(76, 24, "[F] Speed  [M] Map", SILVER)
    buf.draw_text(76, 25, "[V] Paths  [F2] Studio", SILVER)


def _draw_bottom_bar(buf: AsciiBuffer, sim: GameSimulation) -> None:
    buf.draw_box(0, 27, buf.cols, 5, title="COMBAT LOG & STRUCTURAL TELEMETRY", border_fg=(65, 98, 138), title_fg=CYAN, fill_bg=(10, 12, 19))
    msg1 = sim.combat_log[-1] if sim.combat_log else ""
    msg2 = sim.combat_log[-2] if len(sim.combat_log) >= 2 else ""
    buf.draw_text(2, 28, f"> {msg1}"[:95], WHITE)
    buf.draw_text(2, 29, f"  {msg2}"[:95], DIM)
    controls = "[Arrows/WASD] Move [Enter] Build [1-5] Unit [U] Upgr [T] Aim [R] Repair [G] Wave [F2] Lab"
    buf.draw_text(2, 30, controls[:96], CYAN)


def _draw_modal_menu(buf: AsciiBuffer, app: AppState) -> None:
    w, h = 62, 18
    x0 = (buf.cols - w) // 2
    y0 = (buf.rows - h) // 2
    buf.draw_box(x0, y0, w, h, title="TACTICAL ASCII TOWER DEFENSE & WAVE SIEGE", border_fg=CYAN, title_fg=YELLOW, fill_bg=(14, 19, 30))
    buf.draw_text(x0 + 3, y0 + 2, "Turrets: [=|=] Pulse  (☼) Tesla  [███] Mortar  <◈> Cryo", WHITE)
    buf.draw_text(x0 + 3, y0 + 3, "VFX: -> Bolts | ⚡ Chain Arcs | *** Shells | ███→▓▓▓→▒▒▒→░░░", SKY)
    preset = MAP_PRESETS[app.map_index]
    items = [
        f"Launch Siege ({preset.name})",
        f"Switch Map: < {preset.name} >",
        "Open ASCII-Pixel Sprite & VFX Studio [F2]",
        "Quit Game",
    ]
    for idx, label in enumerate(items):
        selected = idx == app.menu_focus
        bg = (30, 62, 96) if selected else (14, 19, 30)
        fg = YELLOW if selected else SILVER
        prefix = "▶ " if selected else "  "
        buf.draw_text(x0 + 6, y0 + 6 + idx * 2, f"{prefix}{label}".ljust(w - 12), fg, bg)
    buf.draw_text(x0 + 3, y0 + 15, preset.description[: w - 6], DIM)
    buf.draw_text(x0 + 3, y0 + 16, "[Up/Down] Select   [Enter/Space] Confirm   [Q] Quit", CYAN)


def _draw_modal_overlay(buf: AsciiBuffer, title: str, lines: List[str], border_col: Color) -> None:
    w = 54
    h = 6 + len(lines)
    x0 = (buf.cols - w) // 2
    y0 = (buf.rows - h) // 2
    buf.draw_box(x0, y0, w, h, title=title, border_fg=border_col, title_fg=WHITE, fill_bg=(16, 20, 32))
    for i, text in enumerate(lines):
        buf.draw_text(x0 + 3, y0 + 2 + i, text[: w - 6], SILVER if i > 0 else WHITE)


def render_app(buf: AsciiBuffer, app: AppState) -> None:
    """Render current screen state onto a 100x32 AsciiBuffer."""
    screen = app.current_screen
    if screen == ScreenState.STUDIO:
        render_studio(buf, app.studio)
        return

    buf.clear(" ", SILVER, (10, 12, 18))
    _draw_top_hud(buf, app.sim)
    _draw_battlefield(buf, app)
    _draw_right_panel(buf, app.sim)
    _draw_bottom_bar(buf, app.sim)

    if screen == ScreenState.MENU:
        _draw_modal_menu(buf, app)
    elif screen == ScreenState.PAUSED:
        _draw_modal_overlay(
            buf,
            "SIEGE PAUSED",
            [
                f"Map: {app.sim.preset.name} | Wave {app.sim.wave_number}/{app.sim.total_waves}",
                "",
                "[P / Esc] Resume Battle",
                "[F2] Open Sprite & VFX Studio",
                "[N] Restart Current Map",
                "[Q] Quit to Terminal",
            ],
            AMBER,
        )
    elif screen == ScreenState.VICTORY:
        _draw_modal_overlay(
            buf,
            "CITADEL VICTORIOUS!",
            [
                f"All {app.sim.total_waves} waves repelled! Score: {app.sim.score}",
                f"Core Integrity Remaining: {int(app.sim.core_hp)}/{int(app.sim.max_core_hp)}",
                f"Total Kills: {app.sim.kills}",
                "",
                "[Enter / N] Play Again   [M] Main Menu   [Q] Quit",
            ],
            GREEN,
        )
    elif screen == ScreenState.GAMEOVER:
        _draw_modal_overlay(
            buf,
            "CITADEL CORE BREACHED",
            [
                f"Fell on Wave {app.sim.wave_number} | Kills: {app.sim.kills} | Score: {app.sim.score}",
                "",
                "[Enter / N] Retry Siege   [M] Main Menu   [Q] Quit",
            ],
            RED,
        )
