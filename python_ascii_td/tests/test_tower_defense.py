"""Comprehensive unittest suite for Tactical ASCII Tower Defense & Wave Siege."""

from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

PKG_ROOT = Path(__file__).resolve().parents[1]
if str(PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(PKG_ROOT))

from ascii_tower_defense.ascii_buffer import AsciiBuffer, is_wide_glyph
from ascii_tower_defense.game import GameSimulation
from ascii_tower_defense.models import MAP_PRESETS, TARGET_MODES, EnemyFSM, ScreenState
from ascii_tower_defense.pathfinding import (
    GridGraph,
    bfs_distances_to_goal,
    can_place_blocking_structure,
    find_path,
)
from ascii_tower_defense.renderer_curses import curses_glyph_for_cell
from ascii_tower_defense.sprites import (
    barricade_sprite,
    build_studio_catalog,
    core_sprite,
    export_catalog_json,
    structural_damage_visual,
    turret_frames_for_display,
)
from ascii_tower_defense.studio import SpriteStudioState, render_studio
from ascii_tower_defense.ui_screens import AppState, render_app


class TestBufferAndSprites(unittest.TestCase):
    def test_buffer_dimensions_and_wide_glyph_safety(self) -> None:
        buf = AsciiBuffer(cols=100, rows=32)
        buf.draw_box(0, 0, 20, 5, title="TEST")
        text = buf.to_plain_text().splitlines()
        self.assertEqual(len(text), 32)
        self.assertEqual(len(text[0]), 100)
        self.assertTrue(is_wide_glyph("⚡"))
        self.assertFalse(is_wide_glyph("="))

        # ⚡ next to space keeps ⚡ and skips next col; ⚡ next to border falls back to ϟ
        row_with_space = list(" ⚡ |")
        g1, skip1 = curses_glyph_for_cell(row_with_space, 1)
        self.assertEqual((g1, skip1), ("⚡", True))

        row_next_to_border = list(" ⚡|")
        g2, skip2 = curses_glyph_for_cell(row_next_to_border, 1)
        self.assertEqual((g2, skip2), ("ϟ", False))

    def test_structural_damage_progression(self) -> None:
        expected = [
            (1.00, "███", "INTACT"),
            (0.65, "▓▓▓", "CHIPPED"),
            (0.35, "▒▒▒", "CRACKED"),
            (0.10, "░░░", "CRITICAL"),
        ]
        for ratio, blocks, tier in expected:
            b, t, _col = structural_damage_visual(ratio)
            self.assertEqual(b, blocks)
            self.assertEqual(t, tier)
            b_lines, _pal = barricade_sprite(ratio)
            self.assertIn(blocks, "\n".join(b_lines))
            c_lines, _cpal = core_sprite(ratio, tick=0)
            self.assertIn(blocks, "\n".join(c_lines))

    def test_turret_icons_and_studio_catalog_export(self) -> None:
        self.assertIn("[=|=]", "\n".join(turret_frames_for_display("pulse")))
        self.assertIn("(☼)", "\n".join(turret_frames_for_display("tesla")))
        self.assertIn("◈", "\n".join(turret_frames_for_display("cryo")))
        catalog = build_studio_catalog()
        self.assertGreaterEqual(len(catalog), 10)
        with tempfile.TemporaryDirectory() as tmp:
            out = export_catalog_json(catalog, Path(tmp) / "export.json")
            data = json.loads(out.read_text(encoding="utf-8"))
            self.assertIsInstance(data, list)
            self.assertEqual(len(data), len(catalog))


class TestPathfindingAndAntiBlock(unittest.TestCase):
    def test_astar_and_maze_anti_block(self) -> None:
        g = GridGraph(width=5, height=3, blocked={(2, 0), (2, 1)})
        path = find_path(g, (0, 0), (4, 0))
        self.assertTrue(path)
        self.assertEqual(path[0], (0, 0))
        self.assertEqual(path[-1], (4, 0))
        self.assertIn((2, 2), path)

        # Placing at (2, 2) closes the only choke
        ok = can_place_blocking_structure(5, 3, g.blocked, (2, 2), [(0, 0)], (4, 0))
        self.assertFalse(ok)

    def test_all_presets_have_valid_spawn_paths(self) -> None:
        for preset in MAP_PRESETS:
            spawns, goal, cliffs, _roads = preset.parse()
            dists = bfs_distances_to_goal(15, 8, cliffs, goal)
            for sp in spawns:
                self.assertIn(sp, dists)


class TestSimulationMechanics(unittest.TestCase):
    def test_economy_build_upgrade_sell_refund(self) -> None:
        sim = GameSimulation(map_id="twin_bastion", seed=7)
        start_gold = sim.gold
        ok, _ = sim.place_structure((4, 1), "pulse")
        self.assertTrue(ok)
        self.assertEqual(sim.gold, start_gold - 50)

        up_cost = sim.towers[(4, 1)].upgrade_cost
        self.assertIsNotNone(up_cost)
        ok_up, _ = sim.upgrade_structure((4, 1))
        self.assertTrue(ok_up)
        self.assertEqual(sim.towers[(4, 1)].level, 2)

        invested = 50 + int(up_cost or 0)
        expected_refund = int(round(invested * 0.70))
        gold_before_sell = sim.gold
        ok_sell, _ = sim.sell_structure((4, 1))
        self.assertTrue(ok_sell)
        self.assertEqual(sim.gold, gold_before_sell + expected_refund)
        self.assertNotIn((4, 1), sim.towers)

    def test_targeting_modes(self) -> None:
        sim = GameSimulation(map_id="twin_bastion", seed=11)
        sim.gold = 999
        sim.place_structure((7, 3), "pulse")
        tower = sim.towers[(7, 3)]

        e_front = sim._spawn_enemy("grunt", (0, 1))
        e_front.x, e_front.y = 9.0, 3.0
        e_front.hp, e_front.armor = 50.0, 0.0
        e_front.progress_score = 995.0

        e_strong = sim._spawn_enemy("tank", (0, 1))
        e_strong.x, e_strong.y = 8.0, 3.0
        e_strong.hp, e_strong.armor = 220.0, 120.0
        e_strong.progress_score = 990.0

        e_weak_close = sim._spawn_enemy("scout", (0, 6))
        e_weak_close.x, e_weak_close.y = 7.2, 3.0
        e_weak_close.hp, e_weak_close.armor = 15.0, 0.0
        e_weak_close.progress_score = 985.0

        expected_uid = {
            "first": e_front.uid,
            "last": e_weak_close.uid,
            "closest": e_weak_close.uid,
            "strongest": e_strong.uid,
            "weakest": e_weak_close.uid,
        }
        for mode in TARGET_MODES:
            tower.target_mode = mode
            chosen = sim._select_target(tower)
            self.assertIsNotNone(chosen)
            assert chosen is not None
            self.assertEqual(chosen.uid, expected_uid[mode], f"Failed target mode {mode}")

    def test_waypoint_leftover_carryover_and_leak_costs_no_bounty(self) -> None:
        sim = GameSimulation(map_id="twin_bastion", seed=3)
        gold_before = sim.gold
        core_before = sim.core_hp
        runner = sim._spawn_enemy("scout", (12, 3))
        runner.x, runner.y = 12.8, 3.0
        runner.path = [(12, 3), (13, 3), (14, 3)]
        runner.waypoint_idx = 1

        sim.wave_active = True
        sim.spawn_queue = [(99.0, "grunt", (0, 1))]
        # speed ~2.65 tiles/sec -> across 0.54s travels ~1.43 tiles: crosses (13,3) into (14,3) Goal!
        for _ in range(6):
            sim.step(0.09)
        self.assertFalse(runner.alive)
        self.assertLess(sim.core_hp, core_before)
        self.assertEqual(sim.gold, gold_before)

    def test_sapper_breaches_barricade_and_repaths(self) -> None:
        sim = GameSimulation(map_id="twin_bastion", seed=5)
        ok, _ = sim.place_structure((7, 2), "barricade")
        self.assertTrue(ok)
        bar = sim.towers[(7, 2)]
        bar.hp = 60.0

        sap = sim._spawn_enemy("sapper", (6, 2))
        sap.path = [(6, 2), (7, 2), (8, 2), (14, 3)]
        sap.waypoint_idx = 1
        sim.wave_active = True
        sim.spawn_queue = [(99.0, "grunt", (0, 1))]

        # Step until Sapper engages & breaks barricade
        entered_breach = False
        for _ in range(80):
            sim.step(0.05)
            if sap.fsm == EnemyFSM.BREACHING:
                entered_breach = True
            if (7, 2) not in sim.towers:
                break

        self.assertTrue(entered_breach)
        self.assertNotIn((7, 2), sim.towers)
        self.assertEqual(sap.fsm, EnemyFSM.MARCHING)

    def test_weapons_mortar_ground_only_tesla_chain_cryo_slow(self) -> None:
        sim = GameSimulation(map_id="twin_bastion", seed=19)
        sim.gold = 999
        sim.place_structure((5, 3), "tesla")
        sim.place_structure((6, 5), "mortar")
        sim.place_structure((4, 3), "cryo")

        drone = sim._spawn_enemy("drone", (5, 5))
        drone.x, drone.y = 8.0, 5.0
        # Mortar at (6, 5) has splash range and ground-only targeting -> must ignore flying drone
        self.assertIsNone(sim._select_target(sim.towers[(6, 5)]))

        g1 = sim._spawn_enemy("tank", (4, 3))
        g1.x, g1.y = 5.5, 3.0
        g2 = sim._spawn_enemy("grunt", (4, 3))
        g2.x, g2.y = 6.2, 3.0
        sim.wave_active = True
        sim.spawn_queue = [(99.0, "grunt", (0, 1))]

        for _ in range(30):
            sim.step(0.05)

        self.assertGreater(sim.towers[(5, 3)].total_damage, 0.0)
        self.assertGreater(g1.chill_timer, 0.0)


class TestStudioAndUIApp(unittest.TestCase):
    def test_studio_edit_slider_and_render(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            studio = SpriteStudioState(export_dir=Path(tmp))
            studio.adjust_damage(-0.6)
            self.assertLess(studio.damage_ratio, 0.5)
            studio.toggle_paint_mode()
            studio.move_edit_cursor(1, 1)
            studio.paint_cell("#")
            self.assertEqual(studio.current_frame[1][1], "#")
            out = studio.export_json()
            self.assertTrue(out.exists())
            studio.reset_catalog()
            buf = AsciiBuffer(cols=100, rows=32)
            render_studio(buf, studio)
            self.assertIn("STRUCTURAL DAMAGE LAB", buf.to_plain_text())

    def test_app_screens_and_headless_battle(self) -> None:
        app = AppState(map_id="twin_bastion", seed=42)
        buf = AsciiBuffer(cols=100, rows=32)

        self.assertEqual(app.current_screen, ScreenState.MENU)
        render_app(buf, app)
        self.assertIn("TACTICAL ASCII TOWER DEFENSE", buf.to_plain_text())

        # Launch game via enter on menu item 0
        app.handle_key("enter")
        self.assertEqual(app.current_screen, ScreenState.PLAYING)

        # Build turrets, select tesla via click, toggle Studio and return
        app.sim.cursor = (4, 1)
        app.handle_key("1")
        app.handle_key("enter")
        self.assertIn((4, 1), app.sim.towers)

        app.handle_key("f2")
        self.assertEqual(app.current_screen, ScreenState.STUDIO)
        app.studio.toggle_paint_mode()
        app.studio.cursor_col, app.studio.cursor_row = 2, 1
        app.studio.paint_cell("@")
        app.handle_key("f2")
        self.assertEqual(app.current_screen, ScreenState.PLAYING)
        render_app(buf, app)
        self.assertIn("[=@=]", buf.to_plain_text())
        app.studio.reset_catalog()

        # Start wave via [G] and run steps
        app.handle_key("g")
        for _ in range(40):
            app.update(0.05)
        render_app(buf, app)
        frame_txt = buf.to_plain_text()
        self.assertIn("WAVE 1/10", frame_txt)
        self.assertIn("[=|=]", frame_txt)


if __name__ == "__main__":
    unittest.main()
