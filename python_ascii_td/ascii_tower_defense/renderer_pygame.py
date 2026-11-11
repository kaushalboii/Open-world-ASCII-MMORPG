"""Optional pygame-ce graphical character-grid frontend (60 FPS exact grid alignment)."""

from __future__ import annotations

from typing import Dict, Optional, Tuple

from .ascii_buffer import AsciiBuffer, Color
from .ui_screens import AppState, render_app


def _pick_font(pygame_mod: object, size: int) -> object:
    candidates = ["Menlo", "JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono", "Courier New"]
    for name in candidates:
        path = pygame_mod.font.match_font(name)  # type: ignore[attr-defined]
        if path:
            return pygame_mod.font.Font(path, size)  # type: ignore[attr-defined]
    return pygame_mod.font.SysFont("monospace", size)  # type: ignore[attr-defined]


def _pygame_key_to_name(pygame_mod: object, event: object) -> Optional[str]:
    key = event.key  # type: ignore[attr-defined]
    mapping = {
        pygame_mod.K_UP: "up",  # type: ignore[attr-defined]
        pygame_mod.K_DOWN: "down",  # type: ignore[attr-defined]
        pygame_mod.K_LEFT: "left",  # type: ignore[attr-defined]
        pygame_mod.K_RIGHT: "right",  # type: ignore[attr-defined]
        pygame_mod.K_RETURN: "enter",  # type: ignore[attr-defined]
        pygame_mod.K_KP_ENTER: "enter",  # type: ignore[attr-defined]
        pygame_mod.K_SPACE: "space",  # type: ignore[attr-defined]
        pygame_mod.K_ESCAPE: "esc",  # type: ignore[attr-defined]
        pygame_mod.K_F2: "f2",  # type: ignore[attr-defined]
        pygame_mod.K_BACKSPACE: "backspace",  # type: ignore[attr-defined]
        pygame_mod.K_DELETE: "delete",  # type: ignore[attr-defined]
    }
    if key in mapping:
        return mapping[key]
    uni = getattr(event, "unicode", "")
    if uni and len(uni) == 1 and 32 <= ord(uni) < 127:
        return uni
    return None


def run_pygame_app(app: AppState) -> None:
    """Launch the 60 FPS fixed monospace grid window via pygame-ce."""
    try:
        import pygame
    except ImportError as exc:
        raise RuntimeError(
            "pygame-ce is not installed. Run inside curses without --pygame, "
            "or install pygame-ce (`pip install pygame-ce`)."
        ) from exc

    cell_w, cell_h = 12, 22
    buf = AsciiBuffer(cols=100, rows=32)
    win_w, win_h = buf.cols * cell_w, buf.rows * cell_h

    pygame.init()
    screen = pygame.display.set_mode((win_w, win_h))
    pygame.display.set_caption("Tactical ASCII Tower Defense & Wave Siege")
    clock = pygame.time.Clock()
    font = _pick_font(pygame, 17)
    glyph_cache: Dict[Tuple[str, Color], object] = {}
    scanlines = True

    def get_glyph(ch: str, fg: Color) -> object:
        key = (ch, fg)
        surf = glyph_cache.get(key)
        if surf is None:
            surf = font.render(ch, True, fg)  # type: ignore[attr-defined]
            glyph_cache[key] = surf
        return surf

    try:
        while not app.should_quit:
            dt = min(clock.tick(60) / 1000.0, 0.05)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    app.should_quit = True
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_F3:
                        scanlines = not scanlines
                    else:
                        key_name = _pygame_key_to_name(pygame, event)
                        if key_name:
                            app.handle_key(key_name)
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    mx, my = event.pos
                    app.handle_cell_click(mx // cell_w, my // cell_h)

            app.update(dt)
            render_app(buf, app)

            ox, oy = app.visual_shake_offset()
            shake_px = int(round(ox * cell_w * 0.45))
            shake_py = int(round(oy * cell_h * 0.45))

            screen.fill((10, 12, 18))
            for r in range(buf.rows):
                for c in range(buf.cols):
                    in_field = 0 <= c < 75 and 3 <= r < 27
                    dx = shake_px if in_field else 0
                    dy = shake_py if in_field else 0
                    x = c * cell_w + dx
                    y = r * cell_h + dy
                    bg = buf.bg[r][c]
                    pygame.draw.rect(screen, bg, (x, y, cell_w, cell_h))
                    ch = buf.chars[r][c]
                    if ch and ch != " ":
                        surf = get_glyph(ch, buf.fg[r][c])
                        rect = surf.get_rect(center=(x + cell_w // 2, y + cell_h // 2))  # type: ignore[attr-defined]
                        screen.blit(surf, rect)

            if scanlines:
                for sy in range(0, win_h, 4):
                    pygame.draw.line(screen, (6, 8, 12), (0, sy), (win_w, sy), 1)

            pygame.display.flip()
    finally:
        pygame.quit()

