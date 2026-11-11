"""Automated tests for Bellglass: topology reachability, ASCII CRT bounds, combat, and saves."""

from __future__ import annotations

from collections import deque
import os
import tempfile
import unittest

from bellglass.engine import BellglassGame
from bellglass.main import run_headless_demo
from bellglass.palette import GRID_COLS, GRID_ROWS
from bellglass.world_data import (
    TILE_BRIDGE,
    TILE_GATE,
    TILE_MUD,
    TILE_ROAD,
    TILE_SALT,
    WALKABLE_TILES,
    build_marren_world,
)


def _bfs_reachable(wm, start_x: int, start_y: int, allow_salt: bool = False, allow_gate: bool = False):
    visited = {(start_x, start_y)}
    q = deque([(start_x, start_y)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in visited or not wm.in_bounds(nx, ny):
                continue
            k = wm.kinds[ny][nx]
            ok = (k in WALKABLE_TILES) or (allow_salt and k == TILE_SALT) or (allow_gate and k == TILE_GATE)
            if ok:
                visited.add((nx, ny))
                q.append((nx, ny))
    return visited


class BellglassTests(unittest.TestCase):
    def test_world_critical_path_reachability(self) -> None:
        """All 5 parish bells, clappers, NPCs, secret shoal, and Vane must be reachable without soft-lock."""
        wm = build_marren_world()
        # Simulate progression: salt shatter + choir bridge winch + 2-bell foundry sluice
        reach_early = _bfs_reachable(wm, 22, 68, allow_salt=True, allow_gate=False)

        # Must reach Orchard Clapper, Bell I, Tollshed, Hester, Tomas, Shoal Ringlet, Marrow, Callum, Pip, Bell III, Bell IV, Choir Pulley
        for tx, ty in (
            (18, 29),   # clapper_orchard inside root-house
            (58, 34),   # bell_orchard
            (51, 62),   # oil_shed
            (27, 67),   # Hester
            (92, 27),   # Tomas
            (83, 12),   # Choir Pulley Lever
            (99, 11),   # clapper_nave
            (123, 76),  # secret Tide-Stealer's Ringlet across submerged shoals
            (161, 50),  # Marrow
            (175, 53),  # Callum
            (193, 60),  # clapper_redwick
            (173, 41),  # bell_redwick
            (206, 77),  # Pip
            (224, 77),  # clapper_breakwater
            (220, 65),  # bell_breakwater
        ):
            self.assertIn((tx, ty), reach_early, f"Coord {(tx, ty)} unreachable from Pier before sluice open")

        # Pull choir pulley -> reaches Bell II on eastern nave platform AND Vent Seam -> Magistrate Vane
        for x in range(108, 117):
            for y in range(20, 23):
                wm.set_tile(x, y, "=", TILE_BRIDGE)
        reach_choir = _bfs_reachable(wm, 22, 68, allow_salt=True, allow_gate=False)
        self.assertIn((127, 14), reach_choir, "St. Jude Bell II unreachable after pulling Choir Pulley")
        self.assertIn((212, 18), reach_choir, "Foundry secret route via West Vent Seam unreachable after Choir Pulley")

        # Open sluice gate after 2 bells -> reaches Dam Bell V via main Redwick gate too
        for x in (172, 173, 174):
            wm.set_tile(x, 35, ":", TILE_ROAD)
        reach_all = _bfs_reachable(wm, 22, 68, allow_salt=True, allow_gate=False)
        self.assertIn((213, 9), reach_all, "Master Dam Bell V unreachable after sluice opens")

    def test_all_screens_strict_amber_crt_dimensions(self) -> None:
        """Every game screen must render exactly 38x104 pure printable single-width ASCII glyphs."""
        game = BellglassGame(save_path=None)
        for scr in ("title", "help", "play", "ledger", "dead", "victory"):
            game.screen = scr
            buf = game.render_buffer()
            self.assertEqual(len(buf), GRID_ROWS)
            for row in buf:
                self.assertEqual(len(row), GRID_COLS)
                for ch, grade in row:
                    self.assertEqual(len(ch), 1)
                    self.assertGreaterEqual(ord(ch), 32)
                    self.assertLessEqual(ord(ch), 126)
                    self.assertIn(grade, (0, 1, 2, 3, 4))

    def test_tuning_fork_shatters_salt_and_parry_staggers(self) -> None:
        game = BellglassGame(save_path=None)
        game.handle_action("confirm")
        # Walk next to pier salt pillar at (46, 62)
        game.player.x, game.player.y = 44, 62
        self.assertEqual(game.world.kinds[62][46], TILE_SALT)
        game.handle_action("fork")
        self.assertEqual(game.world.kinds[62][46], TILE_MUD)
        self.assertGreater(game.shoal_lit_timer, 5.0)

        # Spawn close encounter to verify Parry -> Critical Strike -> Defeat
        warden = next(e for e in game.enemies if e.tpl.id == "e_warden_1")
        warden.x, warden.y = game.player.x + 1, game.player.y
        warden.state = "windup"
        warden.state_timer = 0.05
        warden.aim_x, warden.aim_y = game.player.x, game.player.y
        hp_before = game.player.hp
        game.handle_action("parry")
        game.update(0.05)
        game.update(0.05)
        self.assertEqual(game.player.hp, hp_before)
        self.assertEqual(warden.state, "staggered")

        game.player.fx, game.player.fy = 1, 0
        w_hp_before = warden.hp
        game.handle_action("strike")
        self.assertEqual(w_hp_before - warden.hp, 24)  # 2.4x stagger crit on 10 dmg

    def test_smith_marrow_temper_and_five_bell_victory(self) -> None:
        game = BellglassGame(save_path=None)
        game.handle_action("confirm")
        game.player.brass = 50
        game.player.x, game.player.y = 161, 51  # Right beside Smith Marrow (161, 50)
        game.handle_action("interact")
        self.assertEqual(game.screen, "dialogue")
        game.handle_action("choice_1")  # Temper blade -> Burnished Bronze (35 Brass)
        self.assertEqual(game.player.blade_tier, 2)
        self.assertEqual(game.player.damage, 15)
        self.assertEqual(game.player.brass, 15)
        game.handle_action("cancel")

        # Ring all 5 bells cleanly -> Victory epilogue
        for b in game.world.belfries:
            game.player.clappers.add(b.clapper_id)
            game.player.x, game.player.y = b.x, b.y + 1
            game.handle_action("interact")
        self.assertEqual(game.bells_rung_count(), 5)
        self.assertEqual(game.screen, "victory")

    def test_atomic_save_and_bak_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            sp = os.path.join(tmpdir, "save.json")
            g1 = BellglassGame(save_path=sp)
            g1.handle_action("confirm")
            g1.player.brass = 99
            g1.player.clappers.add("clapper_orchard")
            g1.world.belfries[0].rung = True
            self.assertTrue(g1.save_game())
            # Save a second time to create .bak, then corrupt primary to verify .bak fallback!
            g1.player.brass = 123
            self.assertTrue(g1.save_game())
            with open(sp, "w", encoding="utf-8") as fh:
                fh.write("{corrupt")

            g2 = BellglassGame(save_path=sp)
            self.assertTrue(g2.load_game())
            self.assertEqual(g2.player.brass, 99)
            self.assertTrue(g2.world.belfries[0].rung)
            self.assertIn("clapper_orchard", g2.player.clappers)

    def test_headless_demo_smoke(self) -> None:
        res = run_headless_demo(seed=7)
        self.assertEqual(res["rows"], GRID_ROWS)
        self.assertEqual(res["cols"], GRID_COLS)
        self.assertEqual(res["screen"], "play")

    def test_dialogue_wrap_no_truncation_and_fork_confirm(self) -> None:
        game = BellglassGame(save_path=None)
        # Space ('fork') starts game cleanly from title and closes modals
        game.handle_action("fork")
        self.assertEqual(game.screen, "play")
        for modal in ("help", "ledger"):
            game.handle_action(modal)
            self.assertEqual(game.screen, modal)
            game.handle_action("fork")
            self.assertEqual(game.screen, "play")

        # Marrow with 5 simultaneous choices must wrap cleanly across rows 35..36 without '..' truncation
        game.player.brass = 100
        game.player.oil = 10.0
        game.player.x, game.player.y = 161, 51
        game.handle_action("interact")
        self.assertEqual(game.screen, "dialogue")
        self.assertEqual(len(game.active_choices), 5)
        buf = game.render_buffer()
        choices_text = "".join(ch for ch, _ in buf[35]) + "\n" + "".join(ch for ch, _ in buf[36])
        for i in range(1, 6):
            self.assertIn(f"[{i}]", choices_text)
        self.assertNotIn("..", choices_text)

        # Space ('fork') confirms selected dialogue choice
        game.handle_action("fork")
        self.assertEqual(game.player.blade_tier, 2)

    def test_rich_diorama_density_and_row33_context_bar(self) -> None:
        game = BellglassGame(save_path=None)
        self.assertGreaterEqual(len(game.world.decor_lines), 40)
        title_buf = game.render_buffer()
        title_non_space = sum(1 for row in title_buf for ch, _ in row if ch != " ")
        self.assertGreater(title_non_space, 1400)

        game.handle_action("confirm")
        game.player.x, game.player.y = 26, 67
        buf = game.render_buffer()
        row33 = "".join(ch for ch, _ in buf[33])
        self.assertIn("--[ [E] Speak: Old Hester ]--", row33)

        warden = next(e for e in game.enemies if e.tpl.id == "e_warden_1")
        warden.x, warden.y = 28, 67
        game.active_target_id = warden.tpl.id
        buf_duel = game.render_buffer()
        self.assertIn("DUEL: Pike-Warden", "".join(ch for ch, _ in buf_duel[33]))

    def test_world_glyphs_all_single_ascii_strings_and_hollow_boxes(self) -> None:
        wm = build_marren_world()
        self.assertEqual((wm.width, wm.height), (240, 88))
        for y in range(wm.height):
            for x in range(wm.width):
                ch = wm.glyphs[y][x]
                self.assertIsInstance(ch, str, f"Non-string glyph at ({x}, {y}): {ch!r}")
                self.assertEqual(len(ch), 1, f"Bad glyph length at ({x}, {y}): {ch!r}")
                self.assertTrue(32 <= ord(ch) <= 126, f"Non-ASCII glyph at ({x}, {y}): {ch!r}")

        game = BellglassGame(save_path=None)
        game.handle_action("confirm")
        for px, py in ((27, 67), (50, 62), (18, 29)):
            game.player.x, game.player.y = px, py
            for _ in range(8):
                game.update(0.05)
                buf = game.render_buffer()
                self.assertEqual(len(buf), GRID_ROWS)
                for row in buf:
                    self.assertEqual(len(row), GRID_COLS)
                    for ch, _ in row:
                        self.assertIsInstance(ch, str)
                        self.assertEqual(len(ch), 1)
                        self.assertTrue(32 <= ord(ch) <= 126)

    def test_in_place_story_narration_and_live_objective_progression(self) -> None:
        game = BellglassGame(save_path=None)
        game.handle_action("confirm")
        self.assertIsNotNone(game.active_story)
        self.assertEqual(game.active_story["id"], "prologue")

        # Prologue Story Chronicle renders right inside the live viewport + Row 34 NOW/NEXT guidance
        buf = game.render_buffer()
        joined = "\n".join("".join(ch for ch, _ in row) for row in buf)
        self.assertIn("PROLOGUE: SEVEN WINTERS OF FOG", joined)
        row34 = "".join(ch for ch, _ in buf[34])
        self.assertIn("NOW [PROLOGUE]", row34)
        self.assertIn("NEXT:", row34)

        # Pressing confirm dismisses Story Dispatch cleanly without swinging sword
        game.handle_action("confirm")
        self.assertIsNone(game.active_story)

        # Talking to Old Hester advances objective to Sunken Orchard Clapper
        game.player.x, game.player.y = 26, 67
        game.handle_action("interact")
        self.assertTrue(game.flags.get("met_hester"))
        game.handle_action("cancel")
        row34_orchard = "".join(ch for ch, _ in game.render_buffer()[34])
        self.assertIn("CH.I ORCHARD", row34_orchard)

        # Walking into Orchard triggers Chapter I dispatch once
        game.player.x, game.player.y = 22, 56
        game.handle_action("move_n")
        self.assertIsNotNone(game.active_story)
        self.assertEqual(game.active_story["id"], "region_orchard")

        # Ledger displays active objective & [?] waypoint marker
        game.handle_action("ledger")
        self.assertEqual(game.screen, "ledger")
        ledger_txt = "\n".join("".join(ch for ch, _ in row) for row in game.render_buffer())
        self.assertIn("[ GOAL: CH.I ORCHARD ]", ledger_txt)
        self.assertIn("[?]", ledger_txt)


if __name__ == "__main__":
    unittest.main()
