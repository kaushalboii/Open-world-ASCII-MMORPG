"""Direct launcher script for Tactical ASCII Tower Defense & Wave Siege."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ascii_tower_defense.__main__ import main

if __name__ == "__main__":
    raise SystemExit(main())

