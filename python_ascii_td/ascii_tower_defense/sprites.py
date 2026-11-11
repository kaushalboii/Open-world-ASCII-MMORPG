"""Declarative multi-character ASCII sprites, turret frames, projectiles, and damage tiers."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

Color = Tuple[int, int, int]

# Semantic color palette tuned for high-contrast monospace readability
CYAN: Color = (0, 240, 255)
SKY: Color = (120, 210, 255)
YELLOW: Color = (255, 224, 70)
AMBER: Color = (255, 165, 55)
RED: Color = (255, 72, 92)
CRIMSON: Color = (210, 45, 70)
GREEN: Color = (72, 245, 140)
MAGENTA: Color = (255, 70, 175)
VIOLET: Color = (185, 120, 255)
WHITE: Color = (242, 246, 252)
SILVER: Color = (175, 185, 200)
DIM: Color = (92, 102, 122)
DARK_SLATE: Color = (38, 44, 58)
TILE_BG: Color = (14, 17, 25)
PATH_BG: Color = (22, 24, 34)
WALL_BG: Color = (24, 28, 38)


# Dynamic structural damage progression: ███ -> ▓▓▓ -> ▒▒▒ -> ░░░ -> ...
DAMAGE_TIERS: List[Tuple[float, str, str, Color]] = [
    (0.75, "███", "INTACT", CYAN),
    (0.50, "▓▓▓", "CHIPPED", YELLOW),
    (0.25, "▒▒▒", "CRACKED", AMBER),
    (0.00, "░░░", "CRITICAL", RED),
]


def structural_damage_visual(hp_ratio: float) -> Tuple[str, str, Color]:
    """Return the exact 3-char structural block glyphs, state label, and color for an HP ratio."""
    ratio = max(0.0, min(1.0, hp_ratio))
    if ratio <= 0.0:
        return "...", "BREACHED", DIM
    for threshold, blocks, label, color in DAMAGE_TIERS:
        if ratio > threshold:
            return blocks, label, color
    return "░░░", "CRITICAL", RED


@dataclass
class AsciiSpriteAsset:
    """Inspectable and editable sprite definition for both gameplay and the Sprite Studio."""

    asset_id: str
    category: str
    name: str
    description: str
    frames: List[List[str]]
    palette: Dict[str, Color] = field(default_factory=dict)
    fps: float = 4.0


def _tower_palette() -> Dict[str, Color]:
    return {
        "[": SILVER,
        "]": SILVER,
        "(": YELLOW,
        ")": YELLOW,
        "<": SKY,
        ">": SKY,
        "╔": CYAN,
        "╗": CYAN,
        "╚": DIM,
        "╝": DIM,
        "═": DIM,
        "╩": DIM,
        "▼": SKY,
        "▲": WHITE,
        "=": CYAN,
        "|": WHITE,
        "^": WHITE,
        "v": WHITE,
        "-": CYAN,
        ".": DIM,
        "☼": YELLOW,
        "◈": CYAN,
        "O": AMBER,
        "/": SILVER,
        "\\": SILVER,
        "*": YELLOW,
        "█": AMBER,
        "▓": YELLOW,
        "▒": AMBER,
        "░": RED,
        "⚡": YELLOW,
        "│": CYAN,
    }


TOWER_PALETTE = _tower_palette()


def turret_frames_for_display(kind: str, level: int = 1, firing: bool = False, aim: str = "R", anim_tick: int = 0) -> List[str]:
    """Build exact 5x3 ASCII pixels for a turret given kind, upgrade tier, aim, and recoil state."""
    if kind == "pulse":
        if firing:
            muzzle = {
                "R": "[*|->",
                "L": "<-|*]",
                "U": "[*^*]",
                "D": "[*v*]",
            }.get(aim, "[*|*]")
            top = " *^* " if aim == "U" else (" ╔═╗ " if level >= 2 else " .=. ")
            bot = "/═══\\" if level == 1 else "╠═══╣"
            return [top, muzzle, bot]

        barrel = {
            "R": "[=|=]",
            "L": "[=|=]",
            "U": "[=^=]",
            "D": "[=v=]",
        }.get(aim, "[=|=]")
        if level >= 3:
            top = " ╔═╗ "
            barrel = "{=|=}" if aim in ("R", "L") else f"{{={aim}=}}"
            bot = "╚═╩═╝"
        elif level == 2:
            top = " ╔.╗ "
            bot = "╠═══╣"
        else:
            top = " .=. "
            bot = "/═══\\"
        return [top, barrel, bot]

    if kind == "tesla":
        spark = "/|\\" if anim_tick % 2 == 0 else "\\|/"
        if firing:
            return [
                " *│* ",
                "(*☼*)",
                "╚═╩═╝",
            ]
        core = " (☼) " if level == 1 else ("(☼☼☼)" if level >= 3 else "(☼·☼)")
        return [
            f" {spark} ",
            core,
            "╚═╩═╝",
        ]

    if kind == "mortar":
        if firing:
            return [
                "\\ * /",
                "[▓▓▓]",
                "╚═══╝",
            ]
        crown = " /O\\ " if level == 1 else (" /╬\\ " if level == 2 else "╔═O═╗")
        body = "[███]" if level < 3 else "{███}"
        return [
            crown,
            body,
            "╚═══╝",
        ]

    if kind == "cryo":
        if firing:
            return [
                " *▲* ",
                "<◈*◈>",
                "╚═▼═╝",
            ]
        core = " <◈> " if level == 1 else ("<◈·◈>" if level == 2 else "<◈◈◈>")
        return [
            " .▲. ",
            core,
            "╚═▼═╝",
        ]

    # Fallback barricade
    return [
        "╔═══╗",
        "║███║",
        "╚═══╝",
    ]


def barricade_sprite(hp_ratio: float) -> Tuple[List[str], Dict[str, Color]]:
    """Build exact 5x3 ASCII art for a destructible barricade wall showing ███->▓▓▓->▒▒▒->░░░."""
    blocks, _, col = structural_damage_visual(hp_ratio)
    if hp_ratio <= 0:
        return (
            [
                " . . ",
                " ... ",
                " . . ",
            ],
            {".": DIM},
        )
    lines = [
        "╔═══╗",
        f"║{blocks}║",
        "╚═══╝",
    ]
    border_col = col if hp_ratio <= 0.5 else SILVER
    pal = {
        "╔": border_col,
        "╗": border_col,
        "╚": border_col,
        "╝": border_col,
        "═": border_col,
        "║": border_col,
        "█": col,
        "▓": col,
        "▒": col,
        "░": col,
    }
    return lines, pal


def core_sprite(hp_ratio: float, tick: int = 0) -> Tuple[List[str], Dict[str, Color]]:
    """Build exact 5x3 ASCII art for the player Citadel Core with live shield degradation."""
    blocks, _, col = structural_damage_visual(hp_ratio)
    glyph = "Ω" if tick % 4 < 2 else "◈"
    lines = [
        f"╔{blocks}╗",
        f"║ {glyph} ║",
        f"╚{blocks}╝",
    ]
    pal = {
        "╔": col,
        "╗": col,
        "╚": col,
        "╝": col,
        "║": col,
        "Ω": WHITE if hp_ratio > 0.25 else RED,
        "◈": CYAN if hp_ratio > 0.25 else AMBER,
        "█": col,
        "▓": col,
        "▒": col,
        "░": col,
    }
    return lines, pal


def enemy_sprite(
    kind: str,
    hp_ratio: float,
    armor_ratio: float = 0.0,
    tick: int = 0,
    chilled: bool = False,
) -> Tuple[List[str], Dict[str, Color]]:
    """Return exact 5x3 ASCII pixels for an enemy unit, reflecting armor/shield wear."""
    step = tick % 2
    chill_tint = SKY if chilled else None

    if kind == "scout":
        body = " ~r> " if step == 0 else " ~R> "
        fg = chill_tint or GREEN
        return (
            [
                "  .  ",
                body,
                " / \\ ",
            ],
            {"~": DIM, "r": fg, "R": WHITE, ">": YELLOW, ".": fg, "/": fg, "\\": fg},
        )

    if kind == "grunt":
        body = "<[o]>" if step == 0 else "<[O]>"
        fg = chill_tint or AMBER
        return (
            [
                " .-. ",
                body,
                " d b ",
            ],
            {"<": DIM, ">": DIM, "[": SILVER, "]": SILVER, "o": fg, "O": WHITE, ".": fg, "-": fg, "d": fg, "b": fg},
        )

    if kind == "tank":
        blocks, _, shield_col = structural_damage_visual(armor_ratio if armor_ratio > 0 else hp_ratio)
        fg = chill_tint or shield_col
        return (
            [
                f"╔{blocks}╗",
                f"[{blocks}]",
                "o═o═o",
            ],
            {
                "╔": SILVER,
                "╗": SILVER,
                "[": WHITE,
                "]": WHITE,
                "o": DIM,
                "═": DIM,
                "█": fg,
                "▓": fg,
                "▒": fg,
                "░": fg,
            },
        )

    if kind == "sapper":
        head = "<X!>" if step == 0 else "<!X>"
        fg = chill_tint or RED
        return (
            [
                " /!\\ ",
                f" {head}",
                " / \\ ",
            ],
            {"<": SILVER, ">": SILVER, "X": fg, "!": YELLOW, "/": AMBER, "\\": AMBER},
        )

    if kind == "drone":
        wings = "^v^" if step == 0 else "-v-"
        fg = chill_tint or MAGENTA
        return (
            [
                f" {wings} ",
                " (·) ",
                "     ",
            ],
            {"^": fg, "v": WHITE, "-": fg, "(": SILVER, ")": SILVER, "·": CYAN},
        )

    # Colossus Boss
    blocks, _, boss_col = structural_damage_visual(hp_ratio)
    fg = chill_tint or boss_col
    crown = "{ΩΩΩ}" if step == 0 else "{♦Ω♦}"
    return (
        [
            crown,
            f"║{blocks}║",
            "╩═╩═╩",
        ],
        {
            "{": MAGENTA,
            "}": MAGENTA,
            "Ω": YELLOW,
            "♦": CYAN,
            "║": RED,
            "╩": SILVER,
            "═": SILVER,
            "█": fg,
            "▓": fg,
            "▒": fg,
            "░": fg,
        },
    )


def directional_arrow(vx: float, vy: float) -> str:
    """Pick an exact ASCII projectile glyph matching travel direction."""
    if abs(vx) >= abs(vy) * 1.8:
        return "->" if vx >= 0 else "<-"
    if abs(vy) >= abs(vx) * 1.8:
        return "||"
    if (vx >= 0 and vy >= 0) or (vx < 0 and vy < 0):
        return "\\\\"
    return "//"


def build_studio_catalog() -> List[AsciiSpriteAsset]:
    """Return the complete catalog of ASCII sprites and VFX sequences for the Sprite Studio."""
    return [
        AsciiSpriteAsset(
            asset_id="turret_pulse",
            category="Turrets",
            name="Pulse Repeater [=|=]",
            description="Rapid kinetic turret with directional barrels and recoil flash.",
            frames=[
                turret_frames_for_display("pulse", 1, False, "R", 0),
                turret_frames_for_display("pulse", 1, True, "R", 1),
                turret_frames_for_display("pulse", 2, False, "U", 0),
                turret_frames_for_display("pulse", 3, True, "R", 1),
            ],
            palette=TOWER_PALETTE,
            fps=3.0,
        ),
        AsciiSpriteAsset(
            asset_id="turret_tesla",
            category="Turrets",
            name="Tesla Spire (☼)",
            description="High-voltage coil firing chain lightning (⚡) across multiple foes.",
            frames=[
                turret_frames_for_display("tesla", 1, False, "R", 0),
                turret_frames_for_display("tesla", 1, False, "R", 1),
                turret_frames_for_display("tesla", 2, True, "R", 0),
                turret_frames_for_display("tesla", 3, True, "R", 1),
            ],
            palette=TOWER_PALETTE,
            fps=4.0,
        ),
        AsciiSpriteAsset(
            asset_id="turret_mortar",
            category="Turrets",
            name="Siege Mortar ***",
            description="Parabolic artillery launching arcing (***) shells with AoE blast.",
            frames=[
                turret_frames_for_display("mortar", 1, False, "R", 0),
                turret_frames_for_display("mortar", 1, True, "R", 1),
                turret_frames_for_display("mortar", 2, False, "R", 0),
                turret_frames_for_display("mortar", 3, True, "R", 1),
            ],
            palette=TOWER_PALETTE,
            fps=2.5,
        ),
        AsciiSpriteAsset(
            asset_id="turret_cryo",
            category="Turrets",
            name="Cryo Prism <◈>",
            description="Crystalline emitter firing frost shards (*>) that chill advancing waves.",
            frames=[
                turret_frames_for_display("cryo", 1, False, "R", 0),
                turret_frames_for_display("cryo", 1, True, "R", 1),
                turret_frames_for_display("cryo", 2, False, "R", 0),
                turret_frames_for_display("cryo", 3, True, "R", 1),
            ],
            palette=TOWER_PALETTE,
            fps=3.0,
        ),
        AsciiSpriteAsset(
            asset_id="damage_barricade",
            category="Structural",
            name="Barricade Degradation (███ -> ░░░)",
            description="Live structural integrity transitions from 100% intact down to breach.",
            frames=[
                barricade_sprite(1.0)[0],
                barricade_sprite(0.65)[0],
                barricade_sprite(0.35)[0],
                barricade_sprite(0.15)[0],
                barricade_sprite(0.0)[0],
            ],
            palette={
                "╔": CYAN, "╗": CYAN, "╚": CYAN, "╝": CYAN, "═": CYAN, "║": CYAN,
                "█": CYAN, "▓": YELLOW, "▒": AMBER, "░": RED, ".": DIM,
            },
            fps=1.5,
        ),
        AsciiSpriteAsset(
            asset_id="damage_core",
            category="Structural",
            name="Citadel Core [Ω]",
            description="Core bastion whose walls crack dynamically as leaks occur.",
            frames=[
                core_sprite(1.0, 0)[0],
                core_sprite(0.65, 2)[0],
                core_sprite(0.35, 0)[0],
                core_sprite(0.15, 2)[0],
            ],
            palette={
                "╔": CYAN, "╗": CYAN, "╚": CYAN, "╝": CYAN, "║": CYAN,
                "Ω": WHITE, "◈": CYAN, "█": CYAN, "▓": YELLOW, "▒": AMBER, "░": RED,
            },
            fps=2.0,
        ),
        AsciiSpriteAsset(
            asset_id="vfx_projectiles",
            category="Projectiles & VFX",
            name="Projectiles (->, ⚡, ***)",
            description="Animated lane bolt, jagged chain lightning, and arcing mortar blast.",
            frames=[
                ["  ->  ", " .    ", "      "],
                ["   -> ", "  .   ", "      "],
                [" ⚡~⚡ ", "  *⚡  ", "      "],
                ["  *** ", " +*+  ", " ·*·  "],
            ],
            palette={
                "-": CYAN, ">": WHITE, ".": DIM, "⚡": YELLOW, "~": SKY,
                "*": AMBER, "+": YELLOW, "·": RED,
            },
            fps=4.0,
        ),
        AsciiSpriteAsset(
            asset_id="vfx_explosion",
            category="Projectiles & VFX",
            name="Mortar Blast Cycle",
            description="4-frame shockwave expansion after parabolic mortar shell impact.",
            frames=[
                ["  .  ", " (o) ", "  .  "],
                [" .*. ", " *** ", " .*. "],
                ["*+*+*", "+* *+", "*+*+*"],
                ["· · ·", " · · ", "· · ·"],
            ],
            palette={"o": WHITE, "(": AMBER, ")": AMBER, "*": YELLOW, "+": RED, ".": AMBER, "·": DIM},
            fps=6.0,
        ),
        AsciiSpriteAsset(
            asset_id="enemy_tank",
            category="Enemies & Boss",
            name="Shield Tank [███]",
            description="Heavy armored crawler showing armor stripping across damage tiers.",
            frames=[
                enemy_sprite("tank", 1.0, 1.0, 0)[0],
                enemy_sprite("tank", 0.7, 0.65, 1)[0],
                enemy_sprite("tank", 0.4, 0.35, 0)[0],
                enemy_sprite("tank", 0.2, 0.15, 1)[0],
            ],
            palette={
                "╔": SILVER, "╗": SILVER, "[": WHITE, "]": WHITE, "o": DIM, "═": DIM,
                "█": CYAN, "▓": YELLOW, "▒": AMBER, "░": RED,
            },
            fps=2.0,
        ),
        AsciiSpriteAsset(
            asset_id="enemy_boss",
            category="Enemies & Boss",
            name="Colossus Wyrm {ΩΩΩ}",
            description="Every-5th-wave Siege Boss with dynamic multi-tier hull damage.",
            frames=[
                enemy_sprite("boss", 1.0, 1.0, 0)[0],
                enemy_sprite("boss", 0.65, 0.65, 1)[0],
                enemy_sprite("boss", 0.35, 0.35, 0)[0],
                enemy_sprite("boss", 0.15, 0.15, 1)[0],
            ],
            palette={
                "{": MAGENTA, "}": MAGENTA, "Ω": YELLOW, "♦": CYAN, "║": RED,
                "╩": SILVER, "═": SILVER, "█": CYAN, "▓": YELLOW, "▒": AMBER, "░": RED,
            },
            fps=2.0,
        ),
    ]


def export_catalog_json(catalog: List[AsciiSpriteAsset], output_path: Path) -> Path:
    """Export all sprite assets as deterministic JSON for sharing or custom editing."""
    payload = [
        {
            "id": item.asset_id,
            "category": item.category,
            "name": item.name,
            "description": item.description,
            "fps": item.fps,
            "frames": item.frames,
            "palette": {ch: list(rgb) for ch, rgb in item.palette.items()},
        }
        for item in catalog
    ]
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return output_path
