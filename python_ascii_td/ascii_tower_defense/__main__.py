"""CLI entrypoint for Tactical ASCII Tower Defense & Wave Siege."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import List, Optional

from .ascii_buffer import AsciiBuffer
from .models import MAP_PRESETS
from .ui_screens import AppState, render_app


def build_parser() -> argparse.ArgumentParser:
    map_choices = [m.map_id for m in MAP_PRESETS]
    parser = argparse.ArgumentParser(
        prog="ascii-td",
        description="Tactical ASCII Tower Defense & Wave Siege + Sprite Studio.",
    )
    parser.add_argument(
        "--pygame",
        action="store_true",
        help="Run with optional 60 FPS pygame-ce pixel-grid window (default: terminal curses).",
    )
    parser.add_argument(
        "--studio",
        action="store_true",
        help="Open directly inside the ASCII-Pixel Sprite & VFX Studio.",
    )
    parser.add_argument(
        "--map",
        choices=map_choices,
        default=map_choices[0],
        help="Starting tactical map preset.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic RNG seed.",
    )
    parser.add_argument(
        "--reduce-shake",
        action="store_true",
        help="Disable camera trauma screen shake.",
    )
    parser.add_argument(
        "--headless-demo",
        action="store_true",
        help="Run a short deterministic battle simulation and print an ASCII frame snapshot.",
    )
    return parser


def run_headless_demo(app: AppState) -> None:
    app.start_new_game(app.map_index)
    sim = app.sim
    sim.place_structure((3, 1), "pulse")
    sim.place_structure((5, 3), "tesla")
    sim.place_structure((7, 2), "barricade")
    sim.start_next_wave(claim_early_bonus=False)
    for _ in range(120):
        sim.step(0.05)

    buf = AsciiBuffer(cols=100, rows=32)
    render_app(buf, app)
    print(buf.to_plain_text())
    print(f"Summary: {sim.summary_stats()}")


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    export_dir = Path.cwd() / "python_ascii_td"
    if not export_dir.exists():
        export_dir = Path.cwd()

    app = AppState(
        map_id=args.map,
        seed=args.seed,
        start_in_studio=args.studio,
        reduce_shake=args.reduce_shake,
        export_dir=export_dir,
    )

    if args.headless_demo:
        run_headless_demo(app)
        return 0

    if args.pygame:
        try:
            from .renderer_pygame import run_pygame_app

            run_pygame_app(app)
            return 0
        except RuntimeError as exc:
            print(str(exc), file=sys.stderr)
            return 2

    from .renderer_curses import run_curses_app

    run_curses_app(app)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

