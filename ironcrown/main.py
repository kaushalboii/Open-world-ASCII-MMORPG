"""CLI launcher and deterministic headless war-campaign smoke test for IRONCROWN."""

from __future__ import annotations

import argparse
import json
from typing import Dict

from ironcrown.engine import IroncrownGame


def run_headless_demo(seed: int = 717) -> Dict[str, object]:
    """Run deterministic Battleground + Small Bottom Map siege smoke check."""
    game = IroncrownGame(save_path=None, seed=seed)
    game.handle_action("confirm")   # Minimal Title -> Redwatch Siege Battleground
    game.handle_action("choice_3")  # Bows
    game.handle_action("volley")
    game.handle_action("choice_5")  # Siege Ram
    ram_sq = next(s for s in game.battle["player_squads"] if s["type"] == "ram")
    ram_sq["x"] = game.battle["map"]["wall_x"] - 1
    ram_sq["y"] = game.battle["map"]["gate_y"]
    game.handle_action("interact")  # Ram strike on Gatehouse
    game.handle_action("ledger")    # Switch to Next Keep via Small Map shortcut [M]
    game.handle_action("choice_1")
    game.handle_action("strike")
    buf = game.render_buffer()
    return {
        "screen": game.screen,
        "rows": len(buf),
        "cols": len(buf[0]) if buf else 0,
        "day": game.campaign["day"],
        "grain": game.campaign["grain"],
        "supplied": game.campaign["supplied"],
        "treasury": game.get_house("thorne")["treasury"],
        "held_keeps": game.held_count(),
        "log_tail": game.log[-1] if game.log else "",
    }


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="IRONCROWN: The Realm in Winter (Amber CRT ASCII War)")
    parser.add_argument("--pygame", action="store_true", help="Launch optional pygame-ce monospace window")
    parser.add_argument("--headless-demo", action="store_true", help="Run non-interactive smoke simulation & print JSON")
    parser.add_argument("--new", action="store_true", help="Start fresh campaign on title instead of resume")
    parser.add_argument("--seed", type=int, default=717, help="Deterministic RNG seed")
    args = parser.parse_args(argv)

    if args.headless_demo:
        print(json.dumps(run_headless_demo(seed=args.seed), indent=2))
        return

    game = IroncrownGame(seed=args.seed)
    if args.new:
        game.has_existing_save = False

    if args.pygame:
        from ironcrown.renderer_pygame import run_pygame

        run_pygame(game)
    else:
        from ironcrown.renderer_curses import run_curses

        run_curses(game)


if __name__ == "__main__":
    main()

