"""Optional pygame-ce Amber P3 Phosphor window renderer aligned cleanly to grid cells."""

from __future__ import annotations

import sys

from bellglass.engine import BellglassGame
from bellglass.palette import (
    AMBER_RGB,
    BG_RGB,
    GRADE_BRIGHT,
    GRADE_LIT,
    GRID_COLS,
    GRID_ROWS,
    sanitize_glyph,
)


def run_pygame(game: BellglassGame) -> None:
    """Launch Bellglass in an optional pygame-ce pixel-grid Amber CRT window."""
    try:
        import pygame
    except ImportError:
        sys.stderr.write(
            "pygame / pygame-ce is not installed.\n"
            "Run directly in terminal (`python3 play.py`) or install `pip install pygame-ce`.\n"
        )
        raise SystemExit(1)

    pygame.init()
    cell_w, cell_h = 11, 20
    width, height = GRID_COLS * cell_w, GRID_ROWS * cell_h
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("BELLGLASS — The Drowned Province")
    font = pygame.font.SysFont("menlo,consolas,dejavusansmono,monospace", 16)
    clock = pygame.time.Clock()

    # Pre-cache monochrome surfaces per (glyph, grade) for buttery zero-GC 60 FPS
    glyph_cache: dict[tuple[str, int], object] = {}

    def get_glyph_surf(ch: str, grade: int):
        key = (ch, grade)
        surf = glyph_cache.get(key)
        if surf is None:
            surf = font.render(ch, True, AMBER_RGB[grade])
            glyph_cache[key] = surf
        return surf

    scanline = pygame.Surface((width, height), pygame.SRCALPHA)
    for y in range(0, height, 2):
        pygame.draw.line(scanline, (0, 0, 0, 52), (0, y), (width, y))

    held_dirs = {
        pygame.K_w: "move_n",
        pygame.K_UP: "move_n",
        pygame.K_s: "move_s",
        pygame.K_DOWN: "move_s",
        pygame.K_a: "move_w",
        pygame.K_LEFT: "move_w",
        pygame.K_d: "move_e",
        pygame.K_RIGHT: "move_e",
    }

    running = True
    while running:
        dt = min(0.05, clock.tick(60) / 1000.0)
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT:
                running = False
            elif ev.type == pygame.KEYDOWN:
                action = _map_pygame_key(ev.key, game.screen, game.active_story is not None)
                if action and not game.handle_action(action):
                    running = False

        if running and game.screen == "play":
            pressed = pygame.key.get_pressed()
            for k, act in held_dirs.items():
                if pressed[k]:
                    game.handle_action(act)
                    break

        game.update(dt)
        buf = game.render_buffer()

        screen.fill(BG_RGB)
        for r in range(GRID_ROWS):
            py = r * cell_h
            row_cells = buf[r]
            for c in range(GRID_COLS):
                ch, grade = row_cells[c]
                if ch == " ":
                    continue
                g = sanitize_glyph(ch)
                px = c * cell_w
                if grade == GRADE_BRIGHT:
                    halo = get_glyph_surf(g, GRADE_LIT)
                    halo.set_alpha(95)
                    screen.blit(halo, (px - 1, py))
                    screen.blit(halo, (px + 1, py))
                    halo.set_alpha(255)
                screen.blit(get_glyph_surf(g, grade), (px, py))

        screen.blit(scanline, (0, 0))
        pygame.display.flip()

    game.save_game()
    pygame.quit()


def _map_pygame_key(key: int, screen: str, has_story: bool = False) -> str:
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
        pygame.K_j: "strike",
        pygame.K_z: "strike",
        pygame.K_k: "parry",
        pygame.K_x: "parry",
        pygame.K_LSHIFT: "parry",
        pygame.K_l: "dodge",
        pygame.K_c: "dodge",
        pygame.K_SPACE: "fork",
        pygame.K_f: "lamp",
        pygame.K_e: "interact",
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
    }
    if key in (pygame.K_RETURN, pygame.K_KP_ENTER):
        return "confirm" if (screen != "play" or has_story) else "strike"
    if key == pygame.K_h:
        return "help" if screen in ("title", "help") else "poultice"
    return mapping.get(key, "")
