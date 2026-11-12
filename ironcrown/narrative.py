"""War Chronicle Dispatches, Small Council & Raven Diplomacy Trees, and live NOW/NEXT Guidance."""

from __future__ import annotations

from typing import Any, Dict, List

STORY_BEATS: Dict[str, Dict[str, Any]] = {
    "prologue": {
        "id": "prologue",
        "title": "CH.I: ASHES OF OLD FORD",
        "lines": [
            "Archon Malcor Dray slew your elder brother under truce banner and seized Highcrown.",
            "House Thorne holds Blackpike, Ashford, and Old Ford -- but winter grain runs thin.",
            "Houses Locke, Brack, and Vance watch from their towers, weighing silver against steel.",
        ],
        "now": "Press [E] at Blackpike to muster levies/ram, or [T] Raven House Brack/Vance.",
        "next": "Capture Redwatch Bastion & Kingsbridge before storming Highcrown Citadel.",
    },
    "first_siege": {
        "id": "first_siege",
        "title": "THE LAW OF STONE WALLS",
        "lines": [
            "Stone gatehouses shred unsupported infantry under crossfire from high battlements.",
            "Drive a Capped Siege Ram [R] into [HH], scale breach notches [L], or bribe a gate",
            "warden in your Small Council [C] so the postern swings open at first horn.",
        ],
        "now": "In Battle: Press [5] for Ram & walk to [HH] then [E], or flank wall notch [L].",
        "next": "Break enemy morale [B Volleys + H Cavalry flank] to capture rival lords.",
    },
    "betrayal_spark": {
        "id": "betrayal_spark",
        "title": "BROKEN WAX ON COLD PARCHMENT",
        "lines": [
            "Outriders bring a cut raven from the marches -- a wavering House has sold its oath.",
            "High crown silver or steep losses tempt fence-sitters unless Honor or Dread holds them.",
            "Cut off the turncloak road before their columns reach Ashford Granary.",
        ],
        "now": "Check [Tab] House Relations & march to intercept hostile banners!",
        "next": "Capture their lord in battle to ransom, cage as hostage, or execute for Dread.",
    },
    "deep_winter": {
        "id": "deep_winter",
        "title": "DEEP WINTER LOCKS THE FORDS",
        "lines": [
            "Freezing gales sweep down from Greycrag. River bends skim with thick gray ice (:).",
            "Armies cut off from friendly Holds starve twice as fast and lose half their cohesion.",
            "Watch your Supply status in the top bar; hold Crossroads or coastal Saltport.",
        ],
        "now": "Stay along [=] Supply Roads or capture Villages [v] / Holds to feed men.",
        "next": "Use frozen winter crossings [:] to flank Kingsbridge without crossing under fire.",
    },
    "highcrown_gates": {
        "id": "highcrown_gates",
        "title": "GATES OF THE IRON CROWN",
        "lines": [
            "The triple basalt curtain of Highcrown Citadel rises over the burned fields of Dray.",
            "Archon Malcor Dray refuses parley; his longbows hold the ramparts three tiers deep.",
            "Shatter his outer field columns or bribe a traitor inside [C] before the final horn.",
        ],
        "now": "Approach Highcrown Citadel (#) with Siege Ram & full grain -> [E] Storm Keep.",
        "next": "Break the Iron Gate, rout Dray Guard, and claim Highcrown by steel or submission.",
    },
}


def wrap_lines(text: str, max_width: int) -> List[str]:
    words = [w for w in str(text or "").split() if w]
    lines: List[str] = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_width:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def bearing_label(px: int, py: int, tx: int, ty: int) -> str:
    dx, dy = tx - px, ty - py
    steps = abs(dx) + abs(dy)
    if steps == 0:
        return "HERE!"
    ns = "N" if dy < -1 else ("S" if dy > 1 else "")
    ew = "W" if dx < -1 else ("E" if dx > 1 else "")
    d = ns + ew
    if not d:
        d = ("N" if dy < 0 else "S") if abs(dy) >= abs(dx) else ("W" if dx < 0 else "E")
    return f"{d} {steps}"


def compute_war_objective(game: Any) -> Dict[str, Any]:
    """Compute crisp live NOW/NEXT directions + compass bearings."""
    if game.screen == "battle" and game.battle:
        b = game.battle
        foes = [s for s in b["enemy_squads"] if s["men"] > 0 and not s["routed"]]
        guard = next((s for s in b["player_squads"] if s["type"] == "guard" and s["men"] > 0), None)
        ram = next((s for s in b["player_squads"] if s["type"] == "ram" and s["men"] > 0), None)
        bows = next((s for s in b["player_squads"] if s["type"] == "bow" and s["men"] > 0), None)

        if b["map"]["kind"] == "siege" and not b["gate_breached"]:
            gx, gy = b["map"]["wall_x"] - 1, b["map"]["gate_y"]
            if ram:
                br = bearing_label(ram["x"], ram["y"], gx, gy)
                now_txt = "Select Ram [5] & Press [E] to SMASH Gatehouse!" if br == "HERE!" else f"Move Ram [5] to Gate [HH] ({br}) -> [E]"
                return {"chapter": "SIEGE GATE", "target": [gx, gy], "now": now_txt, "next": "After breach, send Spearmen [2] & Horse [4] through"}
            return {"chapter": "SCALE WALL", "target": [gx, 6], "now": "No Ram: Climb breach ladder [L] at N/S wall -> [E]", "next": "Use [B] Volleys to thin rampart bows"}

        if foes and guard:
            low = min(foes, key=lambda f: f["morale"])
            br = bearing_label(guard["x"], guard["y"], low["x"], low["y"])
            bow_hint = " | [3]+[B] Volley" if bows else ""
            return {
                "chapter": "TACTICAL",
                "target": [low["x"], low["y"]],
                "now": f"Break {low['label']} ({low['morale']}% mor, {br}){bow_hint}",
                "next": "[F] ShieldWall | [4]+[C] Flank Charge | [Space] Rally",
            }
        return {"chapter": "MOP UP", "target": None, "now": "Enemy line breaking -- chase stragglers or [Enter]!", "next": "Collect loot & capture Hold"}

    px, py = game.campaign["px"], game.campaign["py"]
    season_idx = game.campaign["season_index"]
    th = game.get_house("thorne")
    dray_hold = next((h for h in game.holds if h["id"] == "highcrown"), None)

    if not game.campaign["supplied"] and game.campaign["grain"] < 70:
        friendly = sorted([h for h in game.holds if h["owner"] == "thorne"], key=lambda h: abs(h["x"] - px) + abs(h["y"] - py))
        if friendly:
            br = bearing_label(px, py, friendly[0]["x"], friendly[0]["y"])
            return {"chapter": "SUPPLY CRISIS", "target": [friendly[0]["x"], friendly[0]["y"]], "now": f"Supply CUT & low grain! March to {friendly[0]['name']} ({br})", "next": "Or press [R] Forage / [C] Buy Grain before desertions"}

    has_ram = any(r["type"] == "ram" and r["men"] > 0 for r in game.player_regiments)
    here_hold = game.hold_at(px, py)
    if not has_ram and here_hold and here_hold["owner"] == "thorne" and th["treasury"] >= 80:
        return {"chapter": "MUSTERING", "target": [here_hold["x"], here_hold["y"]], "now": f"Press [E] at {here_hold['name']} -> Build Capped Ram (80g)", "next": "You need a Ram [R] (or Bribe) to crack Keep Gates!"}

    risk_house = next((h for h in game.houses if not h["is_player"] and h["id"] != "dray" and h["treaty"] != "war" and h["betrayal_risk"] >= 52), None)
    if risk_house and th["treasury"] >= 90:
        return {"chapter": "COUNCIL ALERT", "target": [px, py], "now": f"{risk_house['name']} wavers ({risk_house['betrayal_risk']}% risk)! Press [T] Raven", "next": "Bribe/Oath before they turn cloak with Archon Dray"}

    for tid in ("redwatch", "kingsbridge", "highcrown"):
        th_hold = next((h for h in game.holds if h["id"] == tid), None)
        if th_hold and th_hold["owner"] != "thorne":
            br = bearing_label(px, py, th_hold["x"], th_hold["y"])
            chap = "WINTER WAR" if season_idx == 2 else "WAR MARCH"
            verb = f"Press [E] NOW to storm {th_hold['name']}!" if br == "HERE!" else f"March on {th_hold['name']} ({br})"
            nxt = "Then cross Kingsbridge toward Highcrown" if tid == "redwatch" else ("Opens final supply road to Highcrown Citadel" if tid == "kingsbridge" else "Take Highcrown Citadel to end Archon Dray!")
            return {"chapter": chap, "target": [th_hold["x"], th_hold["y"]], "now": verb, "next": nxt}

    return {"chapter": "CROWN VICTORY", "target": [dray_hold["x"], dray_hold["y"]] if dray_hold else None, "now": "Consolidate realm at Highcrown", "next": "[Tab] Realm Survey"}


def open_council_menu(game: Any) -> Dict[str, Any]:
    def _next_enemy_hold(g: Any):
        return next((h for h in g.holds if h["owner"] == "dray" or g.get_house(h["owner"])["treaty"] == "war"), None)

    def _bribe_act(g: Any):
        eh = _next_enemy_hold(g)
        if eh:
            g.get_house("thorne")["treasury"] -= 75
            g.flags[f"bribed_{eh['id']}"] = True
            g.push_log(f"Whisperers paid 75g: {eh['name']} postern warden will throw the bolt!")

    def _poison_act(g: Any):
        eh = _next_enemy_hold(g)
        if eh:
            g.get_house("thorne")["treasury"] -= 55
            eh["garrison"] = max(20, round(eh["garrison"] * 0.75))
            g.get_house("thorne")["dread"] = min(100, g.get_house("thorne")["dread"] + 6)
            g.get_house("thorne")["honor"] = max(0, g.get_house("thorne")["honor"] - 5)
            g.push_log(f"Saboteurs fouled cisterns at {eh['name']}; garrison fell to {eh['garrison']} men.")

    def _grain_act(g: Any):
        g.get_house("thorne")["treasury"] -= 50
        g.campaign["grain"] += 115
        g.push_log("Quartermaster wagons arrive: +115 Grain added to camp stores.")

    def _tax_act(g: Any):
        g.flags["taxed_this_season"] = True
        th = g.get_house("thorne")
        th["treasury"] += 95
        th["honor"] = max(0, th["honor"] - 10)
        th["dread"] = min(100, th["dread"] + 8)
        for h in g.houses:
            if not h["is_player"] and h["id"] != "dray":
                h["relation"] = max(-100, h["relation"] - 8)
        g.push_log("Bailiffs wrung 95g war tax from river baronies. Vassals grumble (+8 Dread).")

    eh0 = _next_enemy_hold(game)
    return {
        "id": "council_root",
        "speaker": "SMALL COUNCIL & SPYMASTER VEYN",
        "line_fn": lambda g: f"Silver {g.get_house('thorne')['treasury']}g | Grain {g.campaign['grain']} | Honor {g.get_house('thorne')['honor']} | Dread {g.get_house('thorne')['dread']}",
        "choices": [
            {"label": lambda _g: f"Bribe Gate Warden at {eh0['name']} (75g)" if eh0 else "No enemy hold", "enabled": lambda g: bool(_next_enemy_hold(g) and not g.flags.get(f"bribed_{_next_enemy_hold(g)['id']}") and g.get_house("thorne")["treasury"] >= 75), "action": _bribe_act},
            {"label": lambda _g: f"Poison Granary at {eh0['name']} (55g)" if eh0 else "Sabotage", "enabled": lambda g: bool(_next_enemy_hold(g) and g.get_house("thorne")["treasury"] >= 55 and _next_enemy_hold(g)["garrison"] > 30), "action": _poison_act},
            {"label": lambda _g: "Buy Emergency Grain (50g -> +115 Grain)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 50, "action": _grain_act},
            {"label": lambda _g: "Levy Harsh War Tax (+95g, -10 Hon, +8 Dread)", "enabled": lambda g: not g.flags.get("taxed_this_season"), "action": _tax_act},
            {"label": lambda _g: "Leave War Tent", "action": lambda g: setattr(g, "screen", "campaign")},
        ],
    }


def open_raven_menu(game: Any) -> Dict[str, Any]:
    def _brack_pact(g: Any):
        b = g.get_house("brack")
        g.get_house("thorne")["treasury"] -= 85
        b["relation"] = min(100, b["relation"] + 26)
        if b["relation"] >= 45:
            b["treaty"] = "oath"
        g.push_log(f"Lord Harmund Brack seals charter (+26 Rel -> {b['treaty'].upper()}).")

    def _vance_pact(g: Any):
        v = g.get_house("vance")
        g.get_house("thorne")["treasury"] -= 90
        v["relation"] = min(100, v["relation"] + 24)
        if v["relation"] >= 40:
            v["treaty"] = "truce"
        if v["relation"] >= 68:
            v["treaty"] = "oath"
        g.push_log(f"Lord Corvin Vance accepts Thorne coin (+24 Rel -> {v['treaty'].upper()}).")

    def _ultimatum(g: Any):
        v = g.get_house("vance")
        v["treaty"] = "truce"
        v["betrayal_risk"] = max(8, v["betrayal_risk"] - 25)
        g.push_log("Cowed by Thorne Dread, Lord Corvin Vance swears Truce & stands down.")

    def _locke_tribute(g: Any):
        l = g.get_house("locke")
        g.campaign["grain"] -= 45
        l["relation"] = min(100, l["relation"] + 18)
        l["treaty"] = "oath"
        g.flags["locke_steel"] = True
        g.push_log("Lady Ysabel Locke vows Greycrag ironworks (+15% Siege/Melee attack)!")

    return {
        "id": "raven_root",
        "speaker": "ROOKERY -- DISPATCH WAR RAVENS",
        "line_fn": lambda g: f"Treasury {g.get_house('thorne')['treasury']}g | Locke:{g.get_house('locke')['relation']} Brack:{g.get_house('brack')['relation']} Vance:{g.get_house('vance')['relation']}",
        "choices": [
            {"label": lambda g: f"Charter to Brack [{g.get_house('brack')['treaty'].upper()}] (85g)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 85 and g.get_house("brack")["treaty"] != "war", "action": _brack_pact},
            {"label": lambda g: f"Gift to Corvin Vance [{g.get_house('vance')['treaty'].upper()}] (90g)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 90 and g.get_house("vance")["treaty"] != "war", "action": _vance_pact},
            {"label": lambda _g: "Fire & Steel Ultimatum to Vance (Dread>=45)", "enabled": lambda g: g.get_house("thorne")["dread"] >= 45 and g.get_house("vance")["treaty"] == "none", "action": _ultimatum},
            {"label": lambda _g: "Grain Tribute to House Locke (45 Grain -> Iron)", "enabled": lambda g: g.campaign["grain"] >= 60 and g.get_house("locke")["treaty"] != "war", "action": _locke_tribute},
            {"label": lambda _g: "Fold Parchment", "action": lambda g: setattr(g, "screen", "campaign")},
        ],
    }


def open_hold_menu(game: Any, hold: Dict[str, Any]) -> Dict[str, Any]:
    owner = game.get_house(hold["owner"])
    hostile = owner["treaty"] == "war" or owner["relation"] <= -40

    if hold["owner"] == "thorne":
        return {
            "id": "hold_friendly",
            "speaker": f"{hold['name'].upper()} [HOUSE THORNE HOLD]",
            "line_fn": lambda g: f"Wall {hold['wall_hp']}/{hold['max_wall']} | Garrison {hold['garrison']} | {g.get_house('thorne')['treasury']}g | Grain {g.campaign['grain']}",
            "choices": [
                {"label": lambda _g: "Muster 20 Pikes [S] (40g)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 40, "action": lambda g: (g.get_house("thorne").__setitem__("treasury", g.get_house("thorne")["treasury"] - 40), g.add_player_men("spear", 20), g.push_log(f"Mustered +20 Pikes at {hold['name']}."))},
                {"label": lambda _g: "Muster 18 Longbows [B] (45g)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 45, "action": lambda g: (g.get_house("thorne").__setitem__("treasury", g.get_house("thorne")["treasury"] - 45), g.add_player_men("bow", 18), g.push_log("Mustered +18 Longbows."))},
                {"label": lambda _g: "Mount 12 Lancers [H] (65g)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 65, "action": lambda g: (g.get_house("thorne").__setitem__("treasury", g.get_house("thorne")["treasury"] - 65), g.add_player_men("horse", 12), g.push_log("Mounted +12 Lancers."))},
                {"label": lambda _g: "Build Capped Ram [R] (80g -> Breaks Gates!)", "enabled": lambda g: g.get_house("thorne")["treasury"] >= 80 and not any(r["type"] == "ram" and r["men"] >= 12 for r in g.player_regiments), "action": lambda g: (g.get_house("thorne").__setitem__("treasury", g.get_house("thorne")["treasury"] - 80), g.add_player_men("ram", 12, True), g.push_log("Built iron-shod Siege Ram [R]."))},
                {"label": lambda _g: "Quarter & Resupply (+45 Grain & Mend Wounded)", "action": lambda g: (g.resupply_at_hold(hold), setattr(g, "screen", "campaign"))},
                {"label": lambda _g: "Ride Out", "action": lambda g: setattr(g, "screen", "campaign")},
            ],
        }

    def _storm(g: Any):
        if not hostile:
            owner["treaty"] = "war"
            owner["relation"] = -90
            g.get_house("thorne")["honor"] = max(0, g.get_house("thorne")["honor"] - 18)
            g.get_house("thorne")["dread"] = min(100, g.get_house("thorne")["dread"] + 12)
        g.start_siege_battle(hold)

    def _starve(g: Any):
        g.campaign["grain"] -= 14
        hold["garrison"] = max(25, hold["garrison"] - 22)
        hold["wall_hp"] = max(30, hold["wall_hp"] - 25)
        g.advance_campaign_day(already_ate=True)
        g.push_log(f"Siege tightens around {hold['name']}: garrison down to {hold['garrison']}.")

    return {
        "id": "hold_foreign",
        "speaker": f"{hold['name'].upper()} [{owner['name'].upper()}]",
        "line_fn": lambda _g: f"Garrison {hold['garrison']} | Wall {hold['wall_hp']}/{hold['max_wall']} | Treaty: {owner['treaty'].upper()}",
        "choices": [
            {"label": lambda _g: f"SOUND ASSAULT -- Storm {hold['name']}!" if hostile else f"BREAK TRUCE & STORM {hold['name']}", "enabled": lambda g: g.total_men(g.player_regiments) >= 15, "action": _storm},
            {"label": lambda _g: "Besiege & Starve 1 Day (14 Grain -> -22 Garrison)", "enabled": lambda g: hostile and g.campaign["grain"] >= 14, "action": _starve},
            {"label": lambda _g: "Demand Surrender (Garrison<=45 & 2.5x Men)", "enabled": lambda g: hostile and hold["garrison"] <= 45 and g.total_men(g.player_regiments) >= hold["garrison"] * 2.5, "action": lambda g: (g.capture_hold(hold), setattr(g, "screen", "campaign"))},
            {"label": lambda _g: "Hold Perimeter" if hostile else "Ride Past", "action": lambda g: setattr(g, "screen", "campaign")},
        ],
    }


def open_prisoner_menu(game: Any, captive: Dict[str, Any]) -> Dict[str, Any]:
    house = game.get_house(captive["house_id"])

    def _ransom(g: Any):
        g.get_house("thorne")["treasury"] += 135
        g.get_house("thorne")["honor"] = min(100, g.get_house("thorne")["honor"] + 8)
        house["relation"] = min(100, house["relation"] + 10)
        g.push_log(f"{captive['lord_name']} ransomed for 135g silver.")
        g.screen = "campaign"

    def _hostage(g: Any):
        g.flags["hostages"] = g.flags.get("hostages", 0) + 1
        house["betrayal_risk"] = max(0, house["betrayal_risk"] - 30)
        if house["id"] != "dray":
            house["treaty"] = "truce"
        g.push_log(f"{captive['lord_name']} locked in Blackpike tower as surety.")
        g.screen = "campaign"

    def _execute(g: Any):
        th = g.get_house("thorne")
        th["dread"] = min(100, th["dread"] + 22)
        th["honor"] = max(0, th["honor"] - 18)
        house["relation"] = max(-100, house["relation"] - 45)
        g.push_log(f"Steel falls. {captive['lord_name']} executed (+22 Dread, Blood Feud!).")
        g.screen = "campaign"

    return {
        "id": "prisoner_judgment",
        "speaker": f"CAPTIVE COMMANDER: {captive['lord_name'].upper()}",
        "line_fn": lambda _g: f"Bound in chains after {house['name']}'s rout. Decide their fate:",
        "choices": [
            {"label": lambda _g: "Accept Silver Ransom (+135g, +8 Honor)", "action": _ransom},
            {"label": lambda _g: "Hold as Blackpike Hostage (-30% House Betrayal)", "action": _hostage},
            {"label": lambda _g: "Execute Before Lines (+22 Dread, -18 Honor, Feud!)", "action": _execute},
        ],
    }

