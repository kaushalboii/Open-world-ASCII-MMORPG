"""ASCII-Pixel Sprite & VFX Studio for inspecting, stepping, and editing sprites."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

from .ascii_buffer import AsciiBuffer
from .sprites import (
    AMBER,
    CYAN,
    DARK_SLATE,
    DIM,
    GREEN,
    RED,
    SILVER,
    TOWER_PALETTE,
    WHITE,
    YELLOW,
    AsciiSpriteAsset,
    barricade_sprite,
    build_studio_catalog,
    core_sprite,
    export_catalog_json,
    structural_damage_visual,
    turret_frames_for_display,
)

SPEED_STEPS: Tuple[float, ...] = (0.25, 0.5, 1.0, 2.0)


class SpriteStudioState:
    """Interactive controller state for the ASCII-Pixel Sprite & VFX Studio."""

    def __init__(self, export_dir: OptionalPath = None) -> None:  # type: ignore[name-defined]
        self.catalog: List[AsciiSpriteAsset] = build_studio_catalog()
        self.asset_index: int = 0
        self.frame_index: int = 0
        self.playing: bool = True
        self.speed_idx: int = 2  # 1.0x
        self._frame_accum: float = 0.0
        self.damage_ratio: float = 1.0
        self.cursor_col: int = 0
        self.cursor_row: int = 0
        self.paint_mode: bool = False
        self.export_dir: Path = export_dir or Path.cwd()
        self.status_message: str = "Studio ready. [Up/Dn] Catalog, [E] Paint mode, [-/+] Damage slider, [X] Export."

    def toggle_paint_mode(self) -> None:
        self.paint_mode = not self.paint_mode
        if self.paint_mode:
            self.playing = False
            self.status_message = "PAINT MODE: [Arrows] Move cursor, type ANY key to paint cell, [Esc/E] exit Paint."
        else:
            self.status_message = "INSPECT MODE: [Up/Dn] Catalog, [Space] Play/Pause, [-/+] Structural slider."

    @property
    def speed(self) -> float:
        return SPEED_STEPS[self.speed_idx]

    @property
    def current_asset(self) -> AsciiSpriteAsset:
        return self.catalog[self.asset_index]

    @property
    def current_frame(self) -> List[str]:
        asset = self.current_asset
        idx = self.frame_index % len(asset.frames)
        return asset.frames[idx]

    def _clamp_cursor(self) -> None:
        frame = self.current_frame
        h = max(1, len(frame))
        w = max(1, max((len(line) for line in frame), default=1))
        self.cursor_row = max(0, min(h - 1, self.cursor_row))
        self.cursor_col = max(0, min(w - 1, self.cursor_col))

    def select_asset(self, delta: int) -> None:
        self.asset_index = (self.asset_index + delta) % len(self.catalog)
        self.frame_index = 0
        self._frame_accum = 0.0
        self._clamp_cursor()
        self.status_message = f"Inspecting [{self.current_asset.category}] {self.current_asset.name}"

    def step_frame(self, delta: int) -> None:
        self.playing = False
        frames = self.current_asset.frames
        self.frame_index = (self.frame_index + delta) % len(frames)
        self._clamp_cursor()
        self.status_message = f"Paused at frame {self.frame_index + 1}/{len(frames)}"

    def toggle_play(self) -> None:
        self.playing = not self.playing
        self.status_message = "Playback resumed" if self.playing else "Playback paused"

    def cycle_speed(self) -> None:
        self.speed_idx = (self.speed_idx + 1) % len(SPEED_STEPS)
        self.status_message = f"Playback speed -> {self.speed:.2f}x"

    def adjust_damage(self, delta: float) -> None:
        self.damage_ratio = round(max(0.0, min(1.0, self.damage_ratio + delta)), 2)
        blocks, tier, _col = structural_damage_visual(self.damage_ratio)
        self.status_message = f"Structural integrity -> {int(self.damage_ratio * 100)}% {blocks} ({tier})"

    def move_edit_cursor(self, dc: int, dr: int) -> None:
        self.cursor_col += dc
        self.cursor_row += dr
        self._clamp_cursor()

    def paint_cell(self, ch: str) -> None:
        if not ch or len(ch) != 1 or ord(ch) < 32:
            return
        asset = self.current_asset
        f_idx = self.frame_index % len(asset.frames)
        frame = list(asset.frames[f_idx])
        while len(frame) <= self.cursor_row:
            frame.append(" " * 5)
        line = frame[self.cursor_row]
        if len(line) <= self.cursor_col:
            line = line.ljust(self.cursor_col + 1)
        new_line = line[: self.cursor_col] + ch + line[self.cursor_col + 1 :]
        frame[self.cursor_row] = new_line
        asset.frames[f_idx] = frame
        self.status_message = f"Set ({self.cursor_col},{self.cursor_row}) = '{ch}' on frame {f_idx + 1}"

    def reset_catalog(self) -> None:
        self.catalog = build_studio_catalog()
        self.asset_index = min(self.asset_index, len(self.catalog) - 1)
        self.frame_index = 0
        self._clamp_cursor()
        self.status_message = "Reset all studio sprites to factory defaults."

    def export_json(self) -> Path:
        out = self.export_dir / "studio_sprites.json"
        written = export_catalog_json(self.catalog, out)
        self.status_message = f"Exported {len(self.catalog)} assets -> {written.name}"
        return written

    def live_turret_frame(self, kind: str) -> _Optional[List[str]]:
        """Return custom L1 frame 0 from Studio catalog only when edited from defaults."""
        asset_id = f"turret_{kind}"
        default_frame = turret_frames_for_display(kind, 1, False, "R", 0)
        for asset in self.catalog:
            if asset.asset_id == asset_id and asset.frames and asset.frames[0] != default_frame:
                return asset.frames[0]
        return None

    def update(self, dt: float) -> None:
        if not self.playing:
            return
        asset = self.current_asset
        if len(asset.frames) <= 1 or asset.fps <= 0.0:
            return
        self._frame_accum += dt * asset.fps * self.speed
        while self._frame_accum >= 1.0:
            self._frame_accum -= 1.0
            self.frame_index = (self.frame_index + 1) % len(asset.frames)


# Support Python 3.9 typing cleanly without importing Optional just for alias
from typing import Optional as _Optional

OptionalPath = _Optional[Path]


def render_studio(buf: AsciiBuffer, studio: SpriteStudioState) -> None:
    """Render the full 100x32 ASCII-Pixel Sprite & VFX Studio interface."""
    buf.clear(" ", SILVER, (10, 13, 20))

    # Top Header Bar (rows 0..2)
    buf.draw_box(0, 0, buf.cols, 3, title="ASCII-PIXEL SPRITE & VFX STUDIO", border_fg=CYAN, title_fg=WHITE, fill_bg=(14, 20, 32))
    play_tag = "PAINT  " if studio.paint_mode else ("PLAYING" if studio.playing else "PAUSED ")
    play_col = YELLOW if studio.paint_mode else (GREEN if studio.playing else AMBER)
    buf.draw_text(2, 1, f"Asset {studio.asset_index + 1}/{len(studio.catalog)}: {studio.current_asset.name[:24]}", WHITE)
    buf.draw_text(44, 1, f"[{play_tag}] {studio.speed:.2f}x", play_col)
    blocks, tier, dmg_col = structural_damage_visual(studio.damage_ratio)
    buf.draw_text(66, 1, f"Integrity {int(studio.damage_ratio * 100):3d}% {blocks} {tier}", dmg_col)

    # Left Column: Catalog Browser (cols 0..29, rows 3..26)
    buf.draw_box(0, 3, 30, 24, title="ASSET CATALOG [Up/Dn]", border_fg=(70, 100, 135), title_fg=CYAN, fill_bg=(12, 15, 24))
    max_visible = 21
    start = max(0, min(studio.asset_index - max_visible // 2, max(0, len(studio.catalog) - max_visible)))
    for i in range(max_visible):
        idx = start + i
        if idx >= len(studio.catalog):
            break
        item = studio.catalog[idx]
        selected = idx == studio.asset_index
        marker = ">" if selected else " "
        bg = (28, 52, 82) if selected else (12, 15, 24)
        fg = WHITE if selected else SILVER
        label = f"{marker}[{item.category[:3].upper()}] {item.name}"[:27].ljust(27)
        buf.draw_text(1, 4 + i, label, fg, bg)

    # Center Stage: Zoomed Grid + True-Scale Preview (cols 30..69, rows 3..26)
    buf.draw_box(30, 3, 40, 24, title="PIXEL GRID INSPECTOR & 1:1 PREVIEW", border_fg=(70, 100, 135), title_fg=CYAN, fill_bg=(11, 14, 22))
    frame = studio.current_frame
    palette: Dict[str, Tuple[int, int, int]] = dict(TOWER_PALETTE)
    palette.update(studio.current_asset.palette)

    grid_w = max((len(line) for line in frame), default=5)
    grid_h = len(frame)
    origin_c = 34
    origin_r = 5

    # Column rulers
    for c in range(min(grid_w, 10)):
        buf.draw_text(origin_c + 2 + c * 3, origin_r, str(c), DIM)
    # Enlarged 3x-wide ASCII cell editor with cursor highlight
    for r, line in enumerate(frame[:7]):
        row_y = origin_r + 1 + r * 2
        buf.draw_text(origin_c, row_y, f"{r}:", DIM)
        for c in range(min(grid_w, 10)):
            ch = line[c] if c < len(line) else " "
            is_cur = (c == studio.cursor_col and r == studio.cursor_row)
            glyph_fg = palette.get(ch, WHITE)
            cell_bg = (55, 95, 135) if is_cur else (18, 24, 36)
            display_ch = "·" if ch == " " else ch
            left_b = "[" if is_cur else " "
            right_b = "]" if is_cur else " "
            buf.draw_text(origin_c + 1 + c * 3, row_y, left_b, CYAN if is_cur else DIM, cell_bg)
            buf.draw_text(origin_c + 2 + c * 3, row_y, display_ch, glyph_fg if ch != " " else DIM, cell_bg)
            buf.draw_text(origin_c + 3 + c * 3, row_y, right_b, CYAN if is_cur else DIM, cell_bg)

    # True-scale 1:1 preview box at bottom of center stage
    preview_r = 19
    buf.draw_box(33, preview_r, 17, 7, title="1:1 IN-GAME", border_fg=YELLOW, title_fg=YELLOW, fill_bg=(16, 20, 30))
    buf.draw_sprite(39, preview_r + 2, frame, palette=palette, default_fg=WHITE, transparent_space=False)

    # Frame pills
    frame_info = f"Frame {studio.frame_index + 1}/{len(studio.current_asset.frames)}"
    buf.draw_text(52, preview_r + 1, frame_info, WHITE)
    pills = " ".join(
        f"[{i + 1}]" if i == studio.frame_index else f" {i + 1} "
        for i in range(min(5, len(studio.current_asset.frames)))
    )
    buf.draw_text(52, preview_r + 3, pills[:16], CYAN)
    buf.draw_text(52, preview_r + 5, f"Cursor ({studio.cursor_col},{studio.cursor_row})", SILVER)

    # Right Column: Dynamic Structural Damage Lab & Controls (cols 70..99, rows 3..26)
    buf.draw_box(70, 3, 30, 24, title="STRUCTURAL DAMAGE LAB", border_fg=(70, 100, 135), title_fg=AMBER, fill_bg=(12, 15, 24))
    buf.draw_text(72, 4, studio.current_asset.description[:26], WHITE)
    buf.draw_text(72, 5, studio.current_asset.description[26:52], SILVER)

    buf.draw_text(72, 7, "Ladder: ███ → ▓▓▓ → ▒▒▒ → ░░░", SILVER)
    buf.draw_text(72, 8, f"Slider: {int(studio.damage_ratio * 100):3d}% ({tier})", dmg_col)
    buf.draw_bar(72, 9, 25, studio.damage_ratio, fill_char="█", empty_char="░", fg=dmg_col, empty_fg=DARK_SLATE)

    # Live Barricade morph at damage_ratio
    b_lines, b_pal = barricade_sprite(studio.damage_ratio)
    buf.draw_text(72, 11, "Barricade Live Preview:", CYAN)
    buf.draw_sprite(79, 12, b_lines, palette=b_pal, transparent_space=False)

    # Live Core morph at damage_ratio
    c_lines, c_pal = core_sprite(studio.damage_ratio, tick=studio.frame_index)
    buf.draw_text(72, 16, "Citadel Core Preview:", CYAN)
    buf.draw_sprite(79, 17, c_lines, palette=c_pal, transparent_space=False)

    # Quick Controls Legend
    buf.draw_text(72, 21, "Studio Controls:", YELLOW)
    buf.draw_text(72, 22, "[Space] Play/Pause [V] Speed", SILVER)
    buf.draw_text(72, 23, "[ [ / ] ] Step   [-/+] Damage", SILVER)
    buf.draw_text(72, 24, "[E] Paint Mode  [I/J/K/L] Cur", SILVER)
    buf.draw_text(72, 25, "[R] Reset  [X] Export JSON", SILVER)

    # Bottom Status Bar (rows 27..31)
    buf.draw_box(0, 27, buf.cols, 5, title="STUDIO LOG & GLYPH PALETTE", border_fg=(70, 100, 135), title_fg=CYAN, fill_bg=(10, 12, 19))
    buf.draw_text(2, 28, studio.status_message[:95], GREEN)
    buf.draw_text(2, 29, "Quick glyphs you can type:  [ ] = | ( ☼ ) - > * █ ▓ ▒ ░ ◈ Ω < > o x !", SILVER)
    buf.draw_text(2, 30, "Press [F2] or [Esc] to return directly to Tactical Tower Defense.", CYAN)
