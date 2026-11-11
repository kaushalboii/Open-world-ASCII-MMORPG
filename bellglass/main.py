"""CLI launcher and deterministic headless playthrough verification for Bellglass."""

from __future__ import annotations

import argparse
import json
from typing import Dict

from bellglass.engine import BellglassGame


def run_headless_demo(seed: int = 419) -> Dict[str, object]:
    """Run a deterministic simulated exploration & combat check cleanly."""
    game = BellglassGame(save_path=None, seed=seed)
    game.handle_action("confirm")  # Title -> Tidemouth Pier
    for _ in range(5):
        game.handle_action("move_e")
        game.update(0.11)
    game.handle_action("interact")  # Talk to Old Hester on pier
    if game.screen == "dialogue":
        game.handle_action("choice_1")
        game.handle_action("cancel")
    game.handle_action("fork")      # Resonance wave + shoal glint
    for _ in range(12):
        game.update(0.05)
    game.handle_action("parry")
    game.update(0.05)
    game.handle_action("strike")
    game.update(0.05)
    buf = game.render_buffer()
    return {
        "screen": game.screen,
        "rows": len(buf),
        "cols": len(buf[0]) if buf else 0,
        "player_pos": [game.player.x, game.player.y],
        "region": game.world.region_at(game.player.x, game.player.y),
        "bells_rung": game.bells_rung_count(),
        "waves_active": len(game.waves),
        "log_tail": game.log[-1] if game.log else "",
    }


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="BELLGLASS: The Drowned Province (Amber CRT ASCII RPG)")
    parser.add_argument("--pygame", action="store_true", help="Launch optional pygame-ce monospace window")
    parser.add_argument("--headless-demo", action="store_true", help="Run non-interactive smoke simulation & print JSON")
    parser.add_argument("--new", action="store_true", help="Start fresh crossing on title instead of resume")
    parser.add_argument("--seed", type=int, default=419, help="Deterministic RNG seed")
    args = parser.parse_args(argv)

    if args.headless_demo:
        print(json.dumps(run_headless_demo(seed=args.seed), indent=2))
        return

    game = BellglassGame(seed=args.seed)
    if args.new:
        game.has_existing_save = False

    if args.pygame:
        from bellglass.renderer_pygame import run_pygame

        run_pygame(game)
    else:
        from bellglass.renderer_curses import run_curses

        run_curses(game)


if __name__ == "__main__":
    main()
