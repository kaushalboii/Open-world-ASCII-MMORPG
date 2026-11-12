"""Python automated test suite for IRONCROWN: The Realm in Winter."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from ironcrown.ai import compute_house_betrayal_utility
from ironcrown.engine import IroncrownGame
from ironcrown.main import run_headless_demo
from ironcrown.narrative import compute_war_objective
from ironcrown.palette import GRID_COLS, GRID_ROWS, TONE_RGB
from ironcrown.world_data import HOLD_TEMPLATES, REALM_H, REALM_W, TERRAIN_META, create_realm_grid


class IroncrownTests(unittest.TestCase):
    def _assert_strict_grid(self, buf, tone_buf=None) -> set:
        self.assertEqual(len(buf), GRID_ROWS)
        tones = set()
        for row in buf:
            self.assertEqual(len(row), GRID_COLS)
            for ch, grade in row:
                self.assertEqual(len(ch), 1)
                self.assertTrue(32 <= ord(ch) <= 126, f"Bad char {ch!r}")
                self.assertIn(grade, (0, 1, 2, 3, 4))
        if tone_buf is not None:
            self.assertEqual(len(tone_buf), GRID_ROWS)
            for trow in tone_buf:
                self.assertEqual(len(trow), GRID_COLS)
                for tn in trow:
                    self.assertIn(tn, TONE_RGB)
                    tones.add(tn)
        return tones

    def test_realm_reachability_and_grid_hygiene(self) -> None:
        grid, villages = create_realm_grid()
        visited = {(28, 16)}
        queue = [(28, 16)]
        while queue:
            x, y = queue.pop(0)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < REALM_W and 0 <= ny < REALM_H:
                    if TERRAIN_META[grid[ny][nx]]["passable"] and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
        for h in HOLD_TEMPLATES:
            self.assertIn((h["x"], h["y"]), visited)
        for vx, vy in villages:
            self.assertIn((vx, vy), visited)

    def test_all_screens_strict_104x38_ascii(self) -> None:
        g = IroncrownGame(save_path=None, seed=717)
        title_tones = self._assert_strict_grid(g.render_buffer(), g.tone_buffer)  # minimal title
        self.assertGreaterEqual(len(title_tones), 8)
        g.handle_action("help")
        help_tones = self._assert_strict_grid(g.render_buffer(), g.tone_buffer)  # help
        self.assertGreaterEqual(len(help_tones), 3)
        g.handle_action("cancel")
        g.handle_action("confirm")
        self.assertEqual(g.screen, "battle")
        self.assertIsNone(g.active_story)
        buf = g.render_buffer()
        battle_tones = self._assert_strict_grid(buf, g.tone_buffer)  # battleground + small bottom map
        self.assertGreaterEqual(len(battle_tones), 8)
        row26 = "".join(ch for ch, _ in buf[26])
        self.assertIn("SMALL REALM MAP", row26)
        map_txt = "\n".join("".join(ch for ch, _ in r) for r in buf[27:36])
        for tag in ("BLK", "ASH", "GRY", "OLD", "SLT", "ROK", "RED", "KGB", "HGC"):
            self.assertIn(tag, map_txt)

    def test_supply_winter_dread_and_siege_ram_progression(self) -> None:
        g = IroncrownGame(save_path=None, seed=717)
        g.handle_action("confirm")
        self.assertEqual(g.screen, "battle")
        self.assertEqual(g.battle["source_hold"]["id"], "redwatch")

        # Dread mitigates Utility AI betrayal
        vance = g.get_house("vance")
        th = g.get_house("thorne")
        th["dread"] = 0
        low_d = compute_house_betrayal_utility(vance, th, 80, g.holds)
        th["dread"] = 85
        high_d = compute_house_betrayal_utility(vance, th, 80, g.holds)
        self.assertLess(high_d, low_d)

        # Siege Kingsbridge Gate Breach directly (Ram [5] already provisioned)
        kb = next(h for h in g.holds if h["id"] == "kingsbridge")
        g.deploy_to_hold(kb)
        self.assertIn("Ram [5]", compute_war_objective(g)["now"])
        ram_sq = next(s for s in g.battle["player_squads"] if s["type"] == "ram")
        ram_sq["x"] = g.battle["map"]["wall_x"] - 1
        ram_sq["y"] = g.battle["map"]["gate_y"]
        g.handle_action("choice_5")
        while not g.battle["gate_breached"]:
            g.handle_action("interact")
        self.assertTrue(g.battle["gate_breached"])

        for es in g.battle["enemy_squads"]:
            es["morale"] = 10
            es["routed"] = True
        g.handle_action("confirm")
        self.assertEqual(kb["owner"], "thorne")
        self.assertEqual(g.screen, "battle")
        self.assertEqual(g.battle["outcome"], "victory")
        self._assert_strict_grid(g.render_buffer(), g.tone_buffer)

    def test_atomic_save_and_bak_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            sp = Path(tmp) / "save.json"
            g = IroncrownGame(save_path=sp, seed=717)
            g.handle_action("confirm")
            g.handle_action("confirm")
            g.get_house("thorne")["treasury"] = 777
            self.assertTrue(g.save_game())
            self.assertTrue(g.save_game())  # creates .bak
            sp.write_text("{CORRUPT", encoding="utf-8")
            g2 = IroncrownGame(save_path=sp, seed=717)
            self.assertTrue(g2.load_game())
            self.assertEqual(g2.get_house("thorne")["treasury"], 777)

    def test_headless_demo_smoke(self) -> None:
        res = run_headless_demo(seed=717)
        self.assertEqual((res["rows"], res["cols"]), (38, 104))
        self.assertEqual(res["screen"], "battle")


if __name__ == "__main__":
    unittest.main()

