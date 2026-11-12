"""Optional pygame-ce Multi-Color & Amber P3 Phosphor window renderer for IRONCROWN."""

from __future__ import annotations

import sys

from ironcrown.engine import IroncrownGame
from ironcrown.palette import (
    AMBER_RGB,
    BG_RGB,
    FULL_COLOR_BG_RGB,
    GRADE_BRIGHT,
    GRADE_LIT,
    GRID_COLS,
    GRID_ROWS,
    TONE_AMBER,
    TONE_RGB,
    sanitize_glyph,
)


def run_pygame(game: IroncrownGame) -> None:
    """Launch IRONCROWN in an optional pygame-ce CRT window (Multi-Color / Amber toggle [O])."""
    try:
        import pygame
    except ImportError:
        sys.stderr.write("pygame / pygame-ce is not installed. Run `python3 play.py` in terminal.\n")
        raise SystemExit(1)

    pygame.init()
    cell_w, cell_h = 11, 20
    width, height = GRID_COLS * cell_w, GRID_ROWS * cell_h
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("IRONCROWN — The Realm in Winter")
    font = pygame.font.SysFont("menlo,consolas,dejavusansmono,monospace", 16)
    clock = pygame.time.Clock()
    color_enabled = True
    glyph_cache: dict[tuple[str, int, int], object] = {}

    def get_glyph_surf(ch: str, grade: int, tone: int):
        active_tone = tone if color_enabled else TONE_AMBER
        key = (ch, grade, active_tone)
        surf = glyph_cache.get(key)
        if surf is None:
            rgb_map = TONE_RGB.get(active_tone, AMBER_RGB)
            surf = font.render(ch, True, rgb_map[grade])
            glyph_cache[key] = surf
        return surf

    scanline = pygame.Surface((width, height), pygame.SRCALPHA)
    for y in range(0, height, 2):
        pygame.draw.line(scanline, (0, 0, 0, 52), (0, y), (width, y))

    running = True
    while running:
        dt = min(0.05, clock.tick(60) / 1000.0)
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT:
                running = False
            elif ev.type == pygame.KEYDOWN:
                action = _map_pygame_key(ev.key, game.screen)
                if action == "toggle_color":
                    color_enabled = not color_enabled
                elif action and not game.handle_action(action):
                    running = False

        game.update(dt)
        buf = game.render_buffer()
        tone_buf = getattr(game, "tone_buffer", None)
        screen.fill(FULL_COLOR_BG_RGB if color_enabled else BG_RGB)
        for r in range(GRID_ROWS):
            py = r * cell_h
            row_cells = buf[r]
            row_tones = tone_buf[r] if tone_buf is not None else None
            for c in range(GRID_COLS):
                ch, grade = row_cells[c]
                if ch == " ":
                    continue
                g = sanitize_glyph(ch)
                tone = row_tones[c] if (color_enabled and row_tones is not None) else TONE_AMBER
                px = c * cell_w
                if grade == GRADE_BRIGHT:
                    halo = get_glyph_surf(g, GRADE_LIT, tone)
                    halo.set_alpha(95)
                    screen.blit(halo, (px - 1, py))
                    screen.blit(halo, (px + 1, py))
                    halo.set_alpha(255)
                screen.blit(get_glyph_surf(g, grade, tone), (px, py))

        screen.blit(scanline, (0, 0))
        pygame.display.flip()

    game.save_game()
    pygame.quit()


def _map_pygame_key(key: int, screen: str) -> str:
    import pygame

    mapping = {
        pygame.K_w: "move_n",
        pygame.K_UP: "move_n",
        pygame.K_s: "move_s",
        pygame.K_DOWN: "move_s",
        pygame.K_a: "move_w",
        pygame.K_LEFT: "move_w",
        pygame.K_d: "move_e",
        pygame.K_RIGHT: "move_e",
        pygame.K_o: "toggle_color",
        pygame.K_j: "strike",
        pygame.K_f: "parry",
        pygame.K_k: "parry",
        pygame.K_b: "volley",
        pygame.K_x: "volley",
        pygame.K_l: "pause_battle",
        pygame.K_SPACE: "fork",
        pygame.K_e: "interact",
        pygame.K_r: "rest",
        pygame.K_t: "raven",
        pygame.K_h: "help",
        pygame.K_TAB: "ledger",
        pygame.K_m: "ledger",
        pygame.K_n: "new_game",
        pygame.K_ESCAPE: "cancel",
        pygame.K_q: "quit",
        pygame.K_1: "choice_1",
        pygame.K_2: "choice_2",
        pygame.K_3: "choice_3",
        pygame.K_4: "choice_4",
        pygame.K_5: "choice_5",
        pygame.K_6: "choice_6",
        pygame.K_RETURN: "confirm",
        pygame.K_KP_ENTER: "confirm",
    }
    if key == pygame.K_z:
        return "strike" if screen == "battle" else "steed"
    if key == pygame.K_c:
        return "strike" if screen == "battle" else "council"
    return mapping.get(key, "")

