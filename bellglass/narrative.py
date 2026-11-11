"""Literary dialogue graph, Field Ledger lore, and forge tempering definitions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional


@dataclass
class DialogueChoice:
    label: str
    to: str
    cond: Optional[Callable[[Any], bool]] = None
    effect: Optional[Callable[[Any], None]] = None


@dataclass
class DialogueNode:
    id: str
    speaker: str
    line_fn: Callable[[Any], str]
    choices: List[DialogueChoice]
    next_id: Optional[str] = None
    on_enter: Optional[Callable[[Any], None]] = None


NOTES_TEXT: Dict[str, tuple[str, str]] = {
    "note_pier": (
        "TIDEMOUTH MILESTONE (CHISELED)",
        "Seven miles upriver to Redwick kilns. Keep oil hooded past dusk; salt-hounds hunt lamp-grease.",
    ),
    "note_shoal": (
        "DROWNED TIDE TABLE (OILCLOTH)",
        "Magistrate Vane sank the five parish tongues at low neap. Only forked bronze rings true through silt.",
    ),
    "note_foundry": (
        "SEALED ORDER NO. 14",
        "All bells in Marren Valley forfeit to Dam Custody. Whoso raises brass above roof-level forfeits his breath.",
    ),
}

BLADE_TIERS = [
    (1, "Pitted Iron Fork", 10, 0),
    (2, "Burnished Bronze Edge", 15, 35),
    (3, "Bell-Metal Sabre", 22, 70),
]

LAMP_TIERS = [
    (1, "Tin Hurricane Lamp", 100, 0),
    (2, "Double-Wick Copper Lamp", 135, 30),
    (3, "Beacon Fresnel Core", 175, 65),
]


def _hester_greeting(game: Any) -> str:
    n = game.bells_rung_count()
    if n == 0:
        return "Old Hester: Seven winters since bronze sang here. Keep your fork dry, Oren."
    if n < 5:
        return f"Old Hester: I heard bell-wind roll downriver ({n}/5 lit). My boat planks stopped groaning."
    return "Old Hester: All five tongues awake. Look at the water—even the mist remembers which way is sea."


def _tomas_greeting(game: Any) -> str:
    if game.flags.get("bell_nave_rung"):
        return "Prior Tomas: Hear how the vault answers cleanly? Silence was never mercy—it was hiding."
    if game.flags.get("pulley_pulled"):
        return "Prior Tomas: The oak plank fell across the choir trench. Only the Vestry Halberdier keeps the tongue."
    return "Prior Tomas: Vane chained the nave bridge from the northwest confessional loft. Mud swallowed our hymnals."


def _marrow_greeting(game: Any) -> str:
    b = game.player.brass
    if game.flags.get("bell_redwick_rung"):
        return f"Smith Marrow: All three coke chimneys draw air again! Got {b} stamped brass—want your edge dressed?"
    return f"Smith Marrow: Damp kills good steel faster than bone. Bring salvaged brass ({b} in pouch) and I'll fold it."


def _callum_greeting(game: Any) -> str:
    if game.flags.get("pip_rescued"):
        return "Watchman Callum: Pip limped in smelling of bilge salt. Redwick owes you clear passage."
    if game.flags.get("callum_quest"):
        return "Watchman Callum: My apprentice Pip went south to the wrecked Cormorant at dawn. Sluice gate opens once two bells ring."
    return "Watchman Callum: Two parish bells rung wakes the Foundry sluice gate. Till then, even iron rusts shut."


def _pip_greeting(game: Any) -> str:
    if game.flags.get("pip_rescued"):
        return "Apprentice Pip: Stay beside the hull if Stalkers draw near—a raised lamp shows their spears before they strike."
    return "Apprentice Pip: Don't lower your lantern! Things stand invisible in salt-haze till light or bell-ring hits them."


def _rescue_pip(game: Any) -> None:
    if not game.flags.get("pip_rescued"):
        game.flags["pip_rescued"] = True
        game.player.brass += 45
        game.player.oil = min(game.player.max_oil, game.player.oil + 25)
        game.add_log("Pip slips 45 Brass & spare oil into your coat before slipping north toward Redwick.")


def _temper_blade(game: Any) -> None:
    tier = game.player.blade_tier
    if tier >= len(BLADE_TIERS):
        return
    _next_tier, name, _dmg, cost = BLADE_TIERS[tier]
    if game.player.brass >= cost:
        game.player.brass -= cost
        game.player.blade_tier += 1
        game.player.recompute_stats()
        game.add_log(f"Marrow folds bronze sparks into your grip -> {name}.")
        game.emit_sfx("temper")


def _upgrade_lamp(game: Any) -> None:
    tier = game.player.lamp_tier
    if tier >= len(LAMP_TIERS):
        return
    _next_tier, name, _cap, cost = LAMP_TIERS[tier]
    if game.player.brass >= cost:
        game.player.brass -= cost
        game.player.lamp_tier += 1
        game.player.recompute_stats()
        game.player.oil = game.player.max_oil
        game.add_log(f"Copper reflector fitted -> {name} (oil topped off).")
        game.emit_sfx("temper")


def _buy_oil(game: Any) -> None:
    if game.player.brass >= 12 and (game.player.oil < game.player.max_oil or game.player.poultices < 4):
        game.player.brass -= 12
        game.player.oil = game.player.max_oil
        game.player.poultices = min(4, game.player.poultices + 1)
        game.add_log("Flasks topped with filtered whale-oil and a fresh reed poultice.")
        game.emit_sfx("heal")


def build_dialogue_nodes() -> Dict[str, DialogueNode]:
    """Return full NPC dialogue graph indexed by node id."""
    return {
        "hester_root": DialogueNode(
            id="hester_root",
            speaker="Old Hester",
            line_fn=_hester_greeting,
            choices=[
                DialogueChoice("Ask about the five clappers", "hester_clappers"),
                DialogueChoice("Ask how salt-crystals break", "hester_fork"),
                DialogueChoice("Step back to the pier", "END"),
            ],
        ),
        "hester_clappers": DialogueNode(
            id="hester_clappers",
            speaker="Old Hester",
            line_fn=lambda g: "Old Hester: First lies north in the Orchard root-house. Rest wait in Jude's choir, Redwick warehouse, Cormorant wreck, and Vane's dam.",
            choices=[DialogueChoice("Understood.", "hester_root")],
        ),
        "hester_fork": DialogueNode(
            id="hester_fork",
            speaker="Old Hester",
            line_fn=lambda g: "Old Hester: Salt veins ring hollow (%). Strike your tuning fork [Space] close to crack 'em, or rattle hooded wardens off balance.",
            choices=[DialogueChoice("I'll test it near the shed.", "hester_root")],
        ),
        "tomas_root": DialogueNode(
            id="tomas_root",
            speaker="Prior Tomas",
            line_fn=_tomas_greeting,
            choices=[
                DialogueChoice("Why did Magistrate Vane drown the bells?", "tomas_why"),
                DialogueChoice("Ask about the secret shoal south of the dike", "tomas_shoal"),
                DialogueChoice("Leave the altar in peace", "END"),
            ],
        ),
        "tomas_why": DialogueNode(
            id="tomas_why",
            speaker="Prior Tomas",
            line_fn=lambda g: "Prior Tomas: A bell tells sailors and townsfolk the same hour. Fog makes every hamlet fend alone. That was his fear.",
            choices=[DialogueChoice("Wait by the candle", "tomas_root")],
        ),
        "tomas_shoal": DialogueNode(
            id="tomas_shoal",
            speaker="Prior Tomas",
            line_fn=lambda g: "Prior Tomas: Below Bramwell Causeway lie sunken causeway-stones beneath black surf. Strike your fork at the southern parapet to see them gleam.",
            choices=[DialogueChoice("Thank you, Prior.", "tomas_root")],
        ),
        "marrow_root": DialogueNode(
            id="marrow_root",
            speaker="Smith Marrow",
            line_fn=_marrow_greeting,
            choices=[
                DialogueChoice(
                    "Temper blade -> Burnished Bronze (35 Brass)",
                    "marrow_root",
                    cond=lambda g: g.player.blade_tier == 1 and g.player.brass >= 35,
                    effect=_temper_blade,
                ),
                DialogueChoice(
                    "Temper blade -> Bell-Metal Sabre (70 Brass)",
                    "marrow_root",
                    cond=lambda g: g.player.blade_tier == 2 and g.player.brass >= 70,
                    effect=_temper_blade,
                ),
                DialogueChoice(
                    "Upgrade lantern housing (Copper / Fresnel)",
                    "marrow_root",
                    cond=lambda g: (
                        (g.player.lamp_tier == 1 and g.player.brass >= 30)
                        or (g.player.lamp_tier == 2 and g.player.brass >= 65)
                    ),
                    effect=_upgrade_lamp,
                ),
                DialogueChoice(
                    "Refill oil & reed poultice (12 Brass)",
                    "marrow_root",
                    cond=lambda g: g.player.brass >= 12 and (g.player.oil < g.player.max_oil or g.player.poultices < 4),
                    effect=_buy_oil,
                ),
                DialogueChoice("Ask about the High Foundry path", "marrow_foundry"),
                DialogueChoice("Step away from the anvil", "END"),
            ],
        ),
        "marrow_foundry": DialogueNode(
            id="marrow_foundry",
            speaker="Smith Marrow",
            line_fn=lambda g: "Smith Marrow: Ring two parish bells to lift Callum's sluice gate north—or cross Jude's east bridge and crack the old vent salt wall.",
            choices=[DialogueChoice("Back to the anvil", "marrow_root")],
        ),
        "callum_root": DialogueNode(
            id="callum_root",
            speaker="Watchman Callum",
            line_fn=_callum_greeting,
            choices=[
                DialogueChoice(
                    "Tell me where Pip was last seen",
                    "callum_pip",
                    effect=lambda g: g.flags.__setitem__("callum_quest", True),
                ),
                DialogueChoice("Ask about Redwick's bell clapper", "callum_clapper"),
                DialogueChoice("Move along", "END"),
            ],
        ),
        "callum_pip": DialogueNode(
            id="callum_pip",
            speaker="Watchman Callum",
            line_fn=lambda g: "Watchman Callum: South past the jetty stairs where the dredger Cormorant broke her spine. Things out there fade into fog.",
            choices=[DialogueChoice("I'll find him.", "callum_root")],
        ),
        "callum_clapper": DialogueNode(
            id="callum_clapper",
            speaker="Watchman Callum",
            line_fn=lambda g: "Watchman Callum: Locked in the east soot-warehouse when Cinder-Crawlers nested the coal bins. Spire stairs wait north of square.",
            choices=[DialogueChoice("Noted.", "callum_root")],
        ),
        "pip_root": DialogueNode(
            id="pip_root",
            speaker="Apprentice Pip",
            line_fn=_pip_greeting,
            choices=[
                DialogueChoice(
                    "Point him north to Redwick & give flare direction (+45 Brass)",
                    "pip_saved",
                    cond=lambda g: not g.flags.get("pip_rescued"),
                    effect=_rescue_pip,
                ),
                DialogueChoice("Leave the wreck cove", "END"),
            ],
        ),
        "pip_saved": DialogueNode(
            id="pip_saved",
            speaker="Apprentice Pip",
            line_fn=lambda g: "Apprentice Pip: Thank heaven someone still carries true bronze. Take this brass—I saw the fourth clapper sealed inside Cormorant's aft hold!",
            choices=[DialogueChoice("Go safely, Pip.", "END")],
        ),
    }
