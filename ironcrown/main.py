"""CLI launcher and deterministic headless war-campaign smoke test for IRONCROWN."""

from __future__ import annotations

import argparse
import json
from typing import Dict

from ironcrown.engine import IroncrownGame


def run_headless_demo(seed: int = 717) -> Dict[str, object]:
    """Run deterministic strategic campaign + live siege battle smoke check."""
    game = IroncrownGame(save_path=None, seed=seed)
    game.handle_action("confirm")   # Title -> Campaign + Prologue Story Dispatch
    game.handle_action("confirm")   # Dismiss story card
    game.handle_action("council")   # Open Small Council -> Bribe Gate Warden
    game.handle_action("choice_1")
    game.handle_action("cancel")
    game.handle_action("fork")      # Outrider Scout reveal pulse
    game.handle_action("move_e")
    game.handle_action("move_e")

    redwatch = next(h for h in game.holds if h["id"] == "redwatch")
    game.start_siege_battle(redwatch)
    game.handle_action("choice_3")  # Bows
    game.handle_action("volley")
    game.handle_action("choice_1")  # Guard charge
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

