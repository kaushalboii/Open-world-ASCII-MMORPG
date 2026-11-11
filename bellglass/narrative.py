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


STORY_BEATS: Dict[str, Dict[str, Any]] = {
    "prologue": {
        "id": "prologue",
        "title": "PROLOGUE: SEVEN WINTERS OF FOG",
        "lines": [
            "Magistrate Vane drowned Marren Valley's five parish bells under Sealed Order No. 14,",
            "leaving every flooded hamlet blinded in perpetual salt mist. You land as Oren",
            "with a whale-oil lantern and a bronze tuning fork tuned to wake metal through silt.",
        ],
        "now": "Speak to Old Hester (H) [E] beside you, then walk North to Sunken Orchard.",
        "next": "Find 5 stolen Clappers (!) and ring each silent Belfry (b) to scatter the fog.",
        "chronicle": "Seven winters since Vane sank the 5 bells. Speak w/ Hester [E] -> Orchard North.",
    },
    "region_orchard": {
        "id": "region_orchard",
        "title": "CHAPTER I: THE SUNKEN ORCHARD",
        "lines": [
            "Flooded apple rows rot without noon bell-wind to scatter estuary damp. Salt veins",
            "crust the western root-house where Orchard keepers hid the first parish clapper.",
        ],
        "now": "Search Root-House NW (18,29) for 1st Clapper (!); crack salt (%) w/ [Space] Fork.",
        "next": "Carry it East to Orchard Belfry (58,34) and toll [E] to lift Orchard mist.",
        "chronicle": "Entered Sunken Orchard: seek 1st Clapper (!) in NW Root-House.",
    },
    "region_nave": {
        "id": "region_nave",
        "title": "CHAPTER II: ST. JUDE'S FLOODED NAVE",
        "lines": [
            "Rain spears through shattered limestone arches. Prior Tomas keeps vigil beside the",
            "choir chasm where Vane chained up the oak plank bridge from the northwest loft.",
        ],
        "now": "Speak w/ Prior Tomas [E], climb NW loft, pull Choir Winch (&) [E] at (83,12).",
        "next": "Cross fallen plank East, fell Halberdier, take Clapper (!) -> ring Tenor Bell.",
        "chronicle": "Entered St. Jude's Nave: pull NW loft winch (&) [E] to drop choir bridge.",
    },
    "region_causeway": {
        "id": "region_causeway",
        "title": "CHAPTER III: BRAMWELL CAUSEWAY",
        "lines": [
            "A battered limestone dike spans black marshes toward the Kiln-Town of Redwick.",
            "Legend says sunken shoal-stones (~) south of the parapet hide an old sailor relic.",
        ],
        "now": "Walk East along dike to Redwick (or strike [Space] Fork south to reveal shoals).",
        "next": "Toll any 2 Parish Bells to lift the northern High Foundry Sluice Gate.",
        "chronicle": "Entered Bramwell Causeway: head East to Redwick, or [Space] Fork south waves.",
    },
    "region_redwick": {
        "id": "region_redwick",
        "title": "CHAPTER IV: KILN-TOWN OF REDWICK",
        "lines": [
            "Beehive coke ovens hiss against salt drizzle. Smith Marrow hammers brass at the",
            "square anvil while Watchman Callum guards the heavy northern Foundry sluice gate.",
        ],
        "now": "Crack SE Soot-Warehouse (%) w/ [Space] for Clapper (!); temper gear w/ Marrow [E].",
        "next": "Ring Redwick Bell (b), aid Pip south in Salt Flats, or pass Foundry Gate north.",
        "chronicle": "Entered Kiln-Town Redwick: Marrow tempers gear [E]; 3rd Clapper lies SE.",
    },
    "region_saltflats": {
        "id": "region_saltflats",
        "title": "CHAPTER V: WRECK OF THE CORMORANT",
        "lines": [
            "Bleached salt flats ring the split timber ribs of the harbor dredger Cormorant.",
            "Translucent Stalkers (S) vanish in brine haze unless held in beam light or [Space].",
        ],
        "now": "Rescue Apprentice Pip [E] by the wreck; take Aft Clapper (!) east [Keep Lamp Lit].",
        "next": "Carry Clapper North to Breakwater Crane Bell (220,65) -> Toll [E].",
        "chronicle": "Entered Low Sunder Flats: aid Apprentice Pip [E] & keep lamp lit for Stalkers.",
    },
    "region_foundry": {
        "id": "region_foundry",
        "title": "FINALE: THE HIGH FOUNDRY DAM",
        "lines": [
            "Riveted gantry cranes hang above molten slag channels. Magistrate Vane waits by the",
            "dam crest in riveted diving brass, gripping the Fifth Master Clapper at his belt.",
        ],
        "now": "Avoid glowing slag (=/*), bronze-parry [K] Vane windups (!), defeat Vane (V)!",
        "next": "Claim Fifth Clapper (!) from Vane -> Toll Master Dam Bell north for Estuary Dawn.",
        "chronicle": "Entered High Foundry Dam: defeat Magistrate Vane (V) to claim 5th Clapper.",
    },
    "milestone_sluice": {
        "id": "milestone_sluice",
        "title": "THE FOUNDRY SLUICE RISES",
        "lines": [
            "Twin parish bells echo upriver in harmony. Far up in Redwick square, iron dam",
            "counterweights thunder downward--lifting the locked sluice gate to High Foundry!",
        ],
        "now": "Pass North through Redwick gate (173,35) into Foundry, or sweep Salt Flats south.",
        "next": "Gather remaining Clappers (!) and settle Magistrate Vane above the slag vats.",
        "chronicle": "Two bells awakened the northern Foundry Sluice Gate in Redwick!",
    },
    "milestone_vane": {
        "id": "milestone_vane",
        "title": "THE FIFTH CLAPPER FALLS",
        "lines": [
            "Magistrate Vane's brass diving helm cracks beside the cooling gantry rails. From his",
            "belt drops the Fifth Master Clapper--the last silent tongue holding Marren in fog.",
        ],
        "now": "Carry Fifth Master Clapper north to Master Dam Bell (213,9) and press [E]!",
        "next": "All five parish bells singing together will sweep seven winters of fog to sea.",
        "chronicle": "Magistrate Vane felled! Carry 5th Clapper north to Master Dam Bell [E].",
    },
}


def _bearing_label(px: int, py: int, tx: int, ty: int) -> str:
    dx = tx - px
    dy = ty - py
    dist = abs(dx) + abs(dy)
    if dist <= 2:
        return "HERE!"
    ns = "N" if (dy < -2 and abs(dy) * 2 >= abs(dx)) else ("S" if (dy > 2 and abs(dy) * 2 >= abs(dx)) else "")
    ew = "E" if (dx > 2 and abs(dx) * 2 >= abs(dy)) else ("W" if (dx < -2 and abs(dx) * 2 >= abs(dy)) else "")
    direction = f"{ns}{ew}" or (("E" if dx > 0 else "W") if abs(dx) >= abs(dy) else ("S" if dy > 0 else "N"))
    return f"{direction} {dist}"


def wrap_lines(text: str, max_width: int) -> List[str]:
    if not text or max_width <= 0:
        return []
    words = text.split()
    out: List[str] = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_width:
            cur = f"{cur} {w}"
        else:
            out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out


def compute_current_objective(game: Any) -> Dict[str, Any]:
    px, py = game.player.x, game.player.y
    belfries = game.world.belfries
    bells_rung = game.bells_rung_count()
    cur_reg = game.world.region_at(px, py)

    if bells_rung >= 5:
        return {
            "chapter": "DAWN",
            "target": None,
            "now": "All 5 Parish Bells sing across Marren Valley!",
            "next": "Explore lit parishes or [Tab] Chart",
        }

    carried = sorted(
        (b for b in belfries if not b.rung and b.clapper_id in game.player.clappers),
        key=lambda b: (0 if b.region == cur_reg else 1, b.index),
    )
    if carried:
        target_bell = carried[0]
        br = _bearing_label(px, py, target_bell.x, target_bell.y)
        if bells_rung == 1 and not game.flags.get("sluice_open"):
            next_hint = "Lifts Redwick Sluice Gate"
        elif bells_rung == 4:
            next_hint = "5th bell clears valley fog!"
        elif bells_rung == 0:
            next_hint = "St. Jude's Nave NE"
        else:
            next_hint = "[Tab] Chart next bell"
        return {
            "chapter": f"BELL {bells_rung + 1}/5",
            "target": (target_bell.x, target_bell.y),
            "now": (
                f"Press [E] NOW to toll {target_bell.name}!"
                if br == "HERE!"
                else f"Toll {target_bell.name} [E] ({br})"
            ),
            "next": next_hint,
        }

    boss = next((e for e in game.enemies if e.tpl.is_boss), None)
    vane_alive = boss.alive if boss else (not game.flags.get("vane_defeated"))
    bell_by_id = {b.id: b for b in belfries}

    def region_chapter(reg: str) -> Optional[Dict[str, Any]]:
        if reg == "orchard" and not bell_by_id["bell_orchard"].rung:
            br = _bearing_label(px, py, 18, 29)
            return {
                "chapter": "CH.I ORCHARD",
                "target": (18, 29),
                "now": f"Root-House Clapper (!) ({br}) [Space] %",
                "next": "Orchard Belfry (58,34) -> [E]",
            }
        if reg == "nave" and not bell_by_id["bell_nave"].rung:
            if not game.flags.get("pulley_pulled"):
                br = _bearing_label(px, py, 83, 12)
                return {
                    "chapter": "CH.II ST.JUDE",
                    "target": (83, 12),
                    "now": f"Choir Winch (&) [E] NW loft ({br})",
                    "next": "Cross plank E -> Nave Clapper (!)",
                }
            br = _bearing_label(px, py, 99, 11)
            return {
                "chapter": "CH.II ST.JUDE",
                "target": (99, 11),
                "now": f"Nave Clapper (!) E of plank ({br})",
                "next": "Toll Tenor -> Opens Foundry Sluice",
            }
        if reg == "redwick" and not bell_by_id["bell_redwick"].rung:
            br = _bearing_label(px, py, 193, 60)
            return {
                "chapter": "CH.IV REDWICK",
                "target": (193, 60),
                "now": f"SE Warehouse (%) [Space] Clapper ({br})",
                "next": "Ring Redwick Bell & Marrow [E]",
            }
        if reg == "saltflats" and not bell_by_id["bell_breakwater"].rung:
            if not game.flags.get("pip_rescued"):
                br = _bearing_label(px, py, 206, 77)
                return {
                    "chapter": "CH.V FLATS",
                    "target": (206, 77),
                    "now": f"Rescue Pip [E] at wreck ({br}) [Lamp Lit]",
                    "next": "Aft Clapper (!) E -> Crane Bell",
                }
            br = _bearing_label(px, py, 224, 77)
            return {
                "chapter": "CH.V FLATS",
                "target": (224, 77),
                "now": f"Breakwater Clapper (!) E ({br}) [Space] S",
                "next": "Toll Crane Bell (220,65) -> [E]",
            }
        if reg == "foundry" and not bell_by_id["bell_foundry"].rung and vane_alive:
            bx = boss.x if boss else 212
            by = boss.y if boss else 16
            br = _bearing_label(px, py, bx, by)
            return {
                "chapter": "FINALE",
                "target": (bx, by),
                "now": f"Parry [K] & fell Magistrate Vane ({br})",
                "next": "5th Clapper -> Toll Dam Bell (213,9)",
            }
        return None

    if cur_reg == "tidemouth" and not game.flags.get("met_hester") and game.stats.get("steps", 0) < 6:
        br = _bearing_label(px, py, 27, 67)
        return {
            "chapter": "PROLOGUE",
            "target": (27, 67),
            "now": f"Speak Old Hester (H) [E] ({br})",
            "next": "Find 1st Clapper (!) in Orchard NW",
        }

    local_obj = region_chapter(cur_reg)
    if local_obj:
        return local_obj

    for r in ("orchard", "nave", "redwick", "saltflats", "foundry"):
        if r == "foundry" and not game.flags.get("sluice_open") and bells_rung < 2:
            continue
        step = region_chapter(r)
        if step:
            return step

    return region_chapter("foundry") or {
        "chapter": "MARREN",
        "target": (58, 34),
        "now": "Seek silent Parish Belfries (b) on [Tab] Parchment",
        "next": "Ring all 5 bells to break Sealed Order No. 14",
    }


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


def _on_enter_hester(game: Any) -> None:
    if not game.flags.get("met_hester"):
        game.flags["met_hester"] = True
        game.add_log("Hester: 'Walk North to Orchard Root-House for the 1st Clapper (!), Oren.'")


def build_dialogue_nodes() -> Dict[str, DialogueNode]:
    """Return full NPC dialogue graph indexed by node id."""
    return {
        "hester_root": DialogueNode(
            id="hester_root",
            speaker="Old Hester",
            line_fn=_hester_greeting,
            on_enter=_on_enter_hester,
            choices=[
                DialogueChoice("Five parish clappers", "hester_clappers"),
                DialogueChoice("Breaking salt crystals", "hester_fork"),
                DialogueChoice("Step back to pier", "END"),
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
                DialogueChoice("Why sink the bells?", "tomas_why"),
                DialogueChoice("Secret dike shoal", "tomas_shoal"),
                DialogueChoice("Leave altar", "END"),
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
                    "Temper Blade (35B)",
                    "marrow_root",
                    cond=lambda g: g.player.blade_tier == 1 and g.player.brass >= 35,
                    effect=_temper_blade,
                ),
                DialogueChoice(
                    "Bell Sabre (70B)",
                    "marrow_root",
                    cond=lambda g: g.player.blade_tier == 2 and g.player.brass >= 70,
                    effect=_temper_blade,
                ),
                DialogueChoice(
                    "Copper Lamp (30B)",
                    "marrow_root",
                    cond=lambda g: g.player.lamp_tier == 1 and g.player.brass >= 30,
                    effect=_upgrade_lamp,
                ),
                DialogueChoice(
                    "Fresnel Lamp (65B)",
                    "marrow_root",
                    cond=lambda g: g.player.lamp_tier == 2 and g.player.brass >= 65,
                    effect=_upgrade_lamp,
                ),
                DialogueChoice(
                    "Oil+Poultice (12B)",
                    "marrow_root",
                    cond=lambda g: g.player.brass >= 12 and (g.player.oil < g.player.max_oil or g.player.poultices < 4),
                    effect=_buy_oil,
                ),
                DialogueChoice("Foundry path", "marrow_foundry"),
                DialogueChoice("Leave anvil", "END"),
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
                    "Where is Apprentice Pip?",
                    "callum_pip",
                    effect=lambda g: g.flags.__setitem__("callum_quest", True),
                ),
                DialogueChoice("Redwick clapper location", "callum_clapper"),
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
                    "Send Pip north to Redwick (+45B)",
                    "pip_saved",
                    cond=lambda g: not g.flags.get("pip_rescued"),
                    effect=_rescue_pip,
                ),
                DialogueChoice("Leave wreck cove", "END"),
            ],
        ),
        "pip_saved": DialogueNode(
            id="pip_saved",
            speaker="Apprentice Pip",
            line_fn=lambda g: "Apprentice Pip: Thank heaven someone still carries true bronze. Take this brass—I saw the fourth clapper sealed inside Cormorant's aft hold!",
            choices=[DialogueChoice("Go safely, Pip.", "END")],
        ),
    }
