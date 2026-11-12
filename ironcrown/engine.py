"""Core Python parity engine for IRONCROWN: Campaign, Live Battle & 104x38 CRT ASCII."""

from __future__ import annotations

import copy
import json
import math
import os
import random
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from ironcrown.ai import (
    compute_house_betrayal_utility,
    decide_tactical_ai_action,
    next_realm_step,
    pick_campaign_army_intent,
    step_battle_tile,
)
from ironcrown.ascii_art import (
    get_baked_battle_sprite,
    get_baked_campaign_horse,
    get_baked_portrait,
    get_baked_steed_panorama,
    get_baked_title_hero,
    pick_crest_for_dialogue,
    render_battle_scenery,
    render_campaign_march_vista,
    stamp_cell_grid,
    stamp_sprite,
)
from ironcrown.narrative import (
    STORY_BEATS,
    bearing_label,
    compute_war_objective,
    open_council_menu,
    open_hold_menu,
    open_prisoner_menu,
    open_raven_menu,
    wrap_lines,
)
from ironcrown.palette import (
    GRADE_BRIGHT,
    GRADE_DIM,
    GRADE_GHOST,
    GRADE_LIT,
    GRADE_MIST,
    GRID_COLS,
    GRID_ROWS,
    HINT_ROW,
    LOG_ROWS,
    LOG_TOP,
    VIEW_ROWS,
    VIEW_TOP,
    fit_line,
    sanitize_glyph,
)
from ironcrown.world_data import (
    BATTLE_H,
    BATTLE_W,
    HOLD_TEMPLATES,
    INITIAL_HOUSES,
    REALM_H,
    REALM_W,
    SEASONS,
    TERRAIN_META,
    UNIT_TYPES,
    build_battle_map,
    create_realm_grid,
    make_default_regiments,
)

DEFAULT_SAVE_PATH = Path.home() / ".ironcrown_war_save.json"


class IroncrownGame:
    """Complete Python simulation matching the Web ES-module IroncrownGame."""

    def __init__(
        self,
        save_path: Optional[Path] = DEFAULT_SAVE_PATH,
        seed: int = 717,
        sfx_callback: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.save_path = Path(save_path) if save_path is not None else None
        self.seed = seed
        self.rng = random.Random(seed)
        self.sfx = sfx_callback or (lambda _cue: None)

        self.screen = "title"
        self._prev_screen = "title"
        self.clock = 0.0
        self.shake = 0.0
        self.active_story: Optional[Dict[str, Any]] = None
        self.active_dialogue: Optional[Dict[str, Any]] = None
        self.choice_cursor = 0
        self.log: List[str] = []
        self.particles: List[Dict[str, Any]] = []
        self.projectiles: List[Dict[str, Any]] = []
        self.pulse_waves: List[Dict[str, Any]] = []
        self.flags: Dict[str, Any] = {}

        self.grid, self.villages = create_realm_grid()
        self._init_fresh_state()
        self.has_existing_save = self._check_existing_save()

    def _init_fresh_state(self) -> None:
        self.houses = copy.deepcopy(INITIAL_HOUSES)
        self.holds = copy.deepcopy(HOLD_TEMPLATES)
        self.player_regiments = make_default_regiments("THN", 1.0, False)
        self.campaign: Dict[str, Any] = {
            "px": 28,
            "py": 16,
            "day": 1,
            "season_index": 0,
            "grain": 230,
            "supplied": True,
            "scouted_until_day": 0,
            "move_cooldown": 0.0,
            "facing": 1,
            "gallop_timer": 0.0,
            "march_scroll": 0.0,
        }
        self.armies: List[Dict[str, Any]] = [
            {"id": "dray_van", "house_id": "dray", "lord_name": "Ser Torrhen Vane", "x": 34, "y": 33, "men": 145, "regiments": make_default_regiments("DRY1", 0.85, False), "move_every": 2},
            {"id": "dray_main", "house_id": "dray", "lord_name": "Archon Malcor Dray", "x": 52, "y": 31, "men": 205, "regiments": make_default_regiments("DRY2", 1.18, False), "move_every": 2},
            {"id": "vance_host", "house_id": "vance", "lord_name": "Lord Corvin Vance", "x": 54, "y": 16, "men": 155, "regiments": make_default_regiments("VNC", 0.9, False), "move_every": 2},
            {"id": "brack_host", "house_id": "brack", "lord_name": "Captain Maron Brack", "x": 15, "y": 28, "men": 130, "regiments": make_default_regiments("BRK", 0.78, False), "move_every": 3},
        ]
        self.flags = {"story_seen": {}}
        self.active_story = None
        self.active_dialogue = None
        self.battle = None
        self.particles = []
        self.projectiles = []
        self.pulse_waves = []
        self.stats = {"battles_won": 0, "sieges_won": 0, "lords_captured": 0, "days_marched": 0}
        self.log = [
            "Blackpike Keep holds against winter sleet. Archon Dray holds Highcrown in the south.",
            "Press [E] at Blackpike to muster, [C] for Small Council Spies, or march East to Old Ford.",
        ]
        self._recompute_supply()

    def get_house(self, hid: str) -> Dict[str, Any]:
        return next((h for h in self.houses if h["id"] == hid), self.houses[0])

    def hold_at(self, x: int, y: int) -> Optional[Dict[str, Any]]:
        return next((h for h in self.holds if h["x"] == x and h["y"] == y), None)

    def total_men(self, regs: Optional[List[Dict[str, Any]]]) -> int:
        return sum(max(0, r.get("men", 0)) for r in (regs or []))

    def held_count(self) -> int:
        return sum(1 for h in self.holds if h["owner"] == "thorne")

    def add_player_men(self, type_id: str, amount: int, reset_if_dead: bool = False) -> None:
        reg = next((r for r in self.player_regiments if r["type"] == type_id), None)
        if reg is None:
            reg = {"id": f"THN_{type_id}", "type": type_id, "men": 0, "max_men": amount, "morale": 88}
            self.player_regiments.append(reg)
        if reset_if_dead or reg["men"] <= 0:
            reg["men"] = amount
            reg["max_men"] = max(reg["max_men"], amount)
            reg["morale"] = 88
        else:
            reg["men"] += amount
            reg["max_men"] = max(reg["max_men"], reg["men"])
            reg["morale"] = min(100, reg["morale"] + 6)

    def push_log(self, msg: str) -> None:
        clean = str(msg or "").strip()
        if clean and (not self.log or self.log[-1] != clean):
            self.log.append(clean)
            if len(self.log) > 48:
                self.log.pop(0)

    def _trigger_story(self, beat_id: str) -> bool:
        seen = self.flags.setdefault("story_seen", {})
        if seen.get(beat_id):
            return False
        beat = STORY_BEATS.get(beat_id)
        if not beat:
            return False
        seen[beat_id] = True
        self.active_story = beat
        self.sfx("raven")
        return True

    def _check_existing_save(self) -> bool:
        if not self.save_path:
            return False
        for cand in (self.save_path, Path(str(self.save_path) + ".bak")):
            if cand.exists():
                try:
                    data = json.loads(cand.read_text(encoding="utf-8"))
                    if data.get("version") == 1 and "campaign" in data:
                        return True
                except Exception:
                    pass
        return False

    def save_game(self) -> bool:
        if not self.save_path:
            return False
        payload = {
            "version": 1,
            "houses": self.houses,
            "holds": self.holds,
            "player_regiments": self.player_regiments,
            "campaign": self.campaign,
            "armies": self.armies,
            "flags": self.flags,
            "stats": self.stats,
            "log": self.log[-8:],
        }
        tmp = Path(str(self.save_path) + ".tmp")
        bak = Path(str(self.save_path) + ".bak")
        try:
            self.save_path.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            if self.save_path.exists():
                os.replace(self.save_path, bak)
            os.replace(tmp, self.save_path)
            self.has_existing_save = True
            return True
        except Exception:
            return False

    def load_game(self) -> bool:
        if not self.save_path:
            return False
        for cand in (self.save_path, Path(str(self.save_path) + ".bak")):
            if cand.exists():
                try:
                    data = json.loads(cand.read_text(encoding="utf-8"))
                    if data.get("version") == 1 and "campaign" in data:
                        self.houses = data["houses"]
                        self.holds = data["holds"]
                        self.player_regiments = data["player_regiments"]
                        self.campaign = data["campaign"]
                        self.campaign.setdefault("facing", 1)
                        self.campaign.setdefault("gallop_timer", 0.0)
                        self.campaign.setdefault("march_scroll", 0.0)
                        self.armies = data["armies"]
                        self.flags = data.get("flags", {"story_seen": {}})
                        self.stats = data.get("stats", self.stats)
                        self.log = data.get("log", self.log)
                        self.screen = "campaign"
                        self.active_story = None
                        self.active_dialogue = None
                        self.battle = None
                        self._recompute_supply()
                        return True
                except Exception:
                    continue
        return False

    def _recompute_supply(self) -> bool:
        season_id = SEASONS[self.campaign["season_index"]]["id"]
        blocked = set()
        for a in self.armies:
            if a["men"] <= 0:
                continue
            h = self.get_house(a["house_id"])
            if h["treaty"] == "war" or h["relation"] <= -40:
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        blocked.add((a["x"] + dx, a["y"] + dy))

        q: List[Tuple[int, int, int]] = []
        seen = set()
        for hold in self.holds:
            owner = self.get_house(hold["owner"])
            if hold["owner"] == "thorne" or owner["treaty"] == "oath":
                pos = (hold["x"], hold["y"])
                q.append((pos[0], pos[1], 0))
                seen.add(pos)

        px, py = self.campaign["px"], self.campaign["py"]
        idx = 0
        while idx < len(q):
            cx, cy, d = q[idx]
            idx += 1
            if (cx, cy) == (px, py):
                self.campaign["supplied"] = True
                return True
            if d >= 26:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = cx + dx, cy + dy
                if not (0 <= nx < REALM_W and 0 <= ny < REALM_H):
                    continue
                ch = self.grid[ny][nx]
                passable = TERRAIN_META.get(ch, {}).get("passable", False)
                if ch == ":" and season_id == "autumn":
                    passable = False
                if not passable:
                    continue
                if (nx, ny) in blocked and (nx, ny) != (px, py):
                    continue
                if (nx, ny) not in seen:
                    seen.add((nx, ny))
                    q.append((nx, ny, d + 1))

        salt = next((h for h in self.holds if h["id"] == "saltport"), None)
        brack = self.get_house("brack")
        if salt and (salt["owner"] == "thorne" or brack["treaty"] == "oath") and px <= 16 and py >= 20:
            self.campaign["supplied"] = True
            return True
        self.campaign["supplied"] = False
        return False

    def advance_campaign_day(self, already_ate: bool = False) -> None:
        self.campaign["day"] += 1
        self.stats["days_marched"] += 1
        prev_s = self.campaign["season_index"]
        self.campaign["season_index"] = ((self.campaign["day"] - 1) // 10) % len(SEASONS)
        season = SEASONS[self.campaign["season_index"]]
        if self.campaign["season_index"] != prev_s:
            self.flags["taxed_this_season"] = False
            self.push_log(f"Season turns to {season['label']}.")
            if season["id"] == "winter":
                self._trigger_story("deep_winter")

        if self.campaign["day"] % 3 == 0:
            silver = 0
            harvest = 0
            for h in self.holds:
                if h["owner"] == "thorne":
                    silver += round(h["tax_yield"] * 0.4)
                    harvest += round(h["grain_yield"] * (0.35 if season["id"] == "winter" else 0.75))
            self.get_house("thorne")["treasury"] += silver
            self.campaign["grain"] += harvest
            self.push_log(f"Bailiffs remit +{silver}g taxes and +{harvest} Grain.")

        self._recompute_supply()
        if not already_ate:
            men = self.total_men(self.player_regiments)
            sup_mult = 1.0 if self.campaign["supplied"] else 1.5
            eaten = max(2, round((men / 26.0) * season["food_mult"] * sup_mult))
            self.campaign["grain"] = max(0, self.campaign["grain"] - eaten)

        if self.campaign["grain"] <= 0:
            for r in self.player_regiments:
                if r["men"] > 2 and r["type"] != "ram":
                    r["men"] = max(2, r["men"] - 3)
                r["morale"] = max(25, r["morale"] - 6)
            self.push_log("STARVATION! Empty wagons cost desertions & morale. Forage [R]!")
        elif not self.campaign["supplied"] and season["attrition"] > 0:
            for r in self.player_regiments:
                if r["men"] > 4 and r["type"] != "ram":
                    r["men"] = max(4, r["men"] - season["attrition"])
            self.push_log("Cut off from Supply in freezing cold: frostbite claims stragglers.")

        self._step_houses_and_armies()
        if self.total_men(self.player_regiments) <= 0 or self.held_count() <= 0:
            self.screen = "dead"
            self.sfx("defeat")
            return
        self.save_game()

    def _step_houses_and_armies(self) -> None:
        th = self.get_house("thorne")
        p_men = self.total_men(self.player_regiments)
        for h in self.houses:
            if h["is_player"] or h["id"] == "dray":
                continue
            risk01 = compute_house_betrayal_utility(h, th, p_men, self.holds)
            h["betrayal_risk"] = round(risk01 * 100)
            if h["treaty"] != "war" and h["betrayal_risk"] >= 74 and not self.flags.get(f"betrayed_{h['id']}"):
                self.flags[f"betrayed_{h['id']}"] = True
                h["treaty"] = "war"
                h["relation"] = -85
                self.push_log(f"TREACHERY! {h['name']} breaks faith and declares for Archon Dray!")
                self._trigger_story("betrayal_spark")

        for army in self.armies:
            if army["men"] <= 0 or self.campaign["day"] % army.get("move_every", 2) != 0:
                continue
            house = self.get_house(army["house_id"])
            intent = pick_campaign_army_intent(army, house, self)
            step = next_realm_step(self.grid, army["x"], army["y"], intent["tx"], intent["ty"], SEASONS[self.campaign["season_index"]]["id"], 650)
            if step:
                army["x"], army["y"] = step
            hostile = house["treaty"] == "war" or house["relation"] <= -40
            if hostile and army["x"] == self.campaign["px"] and army["y"] == self.campaign["py"] and self.screen == "campaign":
                self.start_field_battle(army)
                return
            hold_here = self.hold_at(army["x"], army["y"])
            if hostile and hold_here and hold_here["owner"] == "thorne":
                hold_here["garrison"] = max(0, hold_here["garrison"] - round(army["men"] * 0.18))
                hold_here["wall_hp"] = max(0, hold_here["wall_hp"] - 18)
                if hold_here["garrison"] <= 0:
                    hold_here["owner"] = house["id"]
                    hold_here["garrison"] = 55
                    hold_here["wall_hp"] = round(hold_here["max_wall"] * 0.65)
                    self.push_log(f"{hold_here['name']} HAS FALLEN to {house['name']}!")

    def resupply_at_hold(self, hold: Dict[str, Any]) -> None:
        heal = 8 if SEASONS[self.campaign["season_index"]]["id"] == "winter" else 14
        for r in self.player_regiments:
            r["men"] = min(r["max_men"], r["men"] + heal)
            r["morale"] = min(100, r["morale"] + 18)
        self.campaign["grain"] = min(450, self.campaign["grain"] + 45)
        hold["wall_hp"] = min(hold["max_wall"], hold["wall_hp"] + 30)
        self.push_log(f"Quartered at {hold['name']}: wounded mended, +45 Grain.")

    def capture_hold(self, hold: Dict[str, Any]) -> None:
        prev = self.get_house(hold["owner"])
        hold["owner"] = "thorne"
        hold["garrison"] = 60
        hold["wall_hp"] = round(hold["max_wall"] * 0.75)
        self.get_house("thorne")["treasury"] += 110
        self.campaign["grain"] += 55
        self.stats["sieges_won"] += 1
        self.sfx("victory")
        self.push_log(f"{hold['name'].upper()} CAPTURED from {prev['name']}! (+110g, +55 Grain)")
        self._recompute_supply()
        if hold["id"] == "highcrown":
            self.screen = "victory"
            return
        if hold["id"] == "kingsbridge":
            self._trigger_story("highcrown_gates")
        self.save_game()

    def _infer_battle_terrain(self, x: int, y: int) -> str:
        ch = self.grid[y][x]
        if ch == "=" and y in (18, 19, 30, 31):
            return "bridge"
        if ch == "T":
            return "forest"
        if ch == ",":
            return "mud"
        return "plains"

    def start_field_battle(self, army: Dict[str, Any]) -> None:
        kind = self._infer_battle_terrain(self.campaign["px"], self.campaign["py"])
        bmap = build_battle_map(kind=kind)
        self._launch_battle(f"FIELD CLASH: vs {army['lord_name']}", bmap, army, None, 0, True)

    def start_siege_battle(self, hold: Dict[str, Any]) -> None:
        bribed = bool(self.flags.get(f"bribed_{hold['id']}"))
        bmap = build_battle_map(kind="siege", hold=hold, gate_breached=bribed)
        enemy_house = self.get_house(hold["owner"])
        scale = max(0.6, hold["garrison"] / 115.0)
        defs = [
            {"id": "def_guard", "type": "guard", "men": round(28 * scale), "max_men": round(28 * scale), "morale": 90},
            {"id": "def_spear", "type": "spear", "men": round(52 * scale), "max_men": round(52 * scale), "morale": 85},
            {"id": "def_bow", "type": "bow", "men": round(48 * scale), "max_men": round(48 * scale), "morale": 84},
        ]
        self._trigger_story("first_siege")
        gate_hp = 0 if bribed else max(60, round(hold["wall_hp"] * 0.72))
        self._launch_battle(
            f"SIEGE OF {hold['name'].upper()}",
            bmap,
            {"id": f"garrison_{hold['id']}", "house_id": enemy_house["id"], "lord_name": "Archon Malcor Dray" if hold["id"] == "highcrown" else f"Castellan of {hold['name']}", "regiments": defs},
            hold,
            gate_hp,
            bribed,
        )

    def _launch_battle(self, title: str, bmap: Dict[str, Any], source_army: Dict[str, Any], source_hold: Optional[Dict[str, Any]], gate_hp: int, gate_breached: bool) -> None:
        p_slots = [(15, 7), (26, 13), (12, 18), (21, 24), (22, 14)]
        p_squads = []
        for i, r in enumerate([x for x in self.player_regiments if x["men"] > 0]):
            t = UNIT_TYPES[r["type"]]
            sx, sy = p_slots[i] if i < len(p_slots) else (10, 8 + i * 4)
            p_squads.append({"slot": i + 1, "type": r["type"], "label": t["name"], "code": t["code"], "x": sx, "y": sy, "men": r["men"], "max_men": r["max_men"], "hp": r["men"] * t["hp_per_man"], "morale": r["morale"], "braced": r["type"] == "spear", "routed": False, "cooldown": 0, "side": "attacker", "facing": 1, "pose": "idle", "pose_timer": 0.0, "order": None})

        is_siege = bmap["kind"] == "siege"
        d_slots = [(56, 13), (50, 14), (50, 21), (53, 8)] if is_siege else [(55, 11), (50, 14), (58, 19), (51, 24)]
        e_squads = []
        for i, r in enumerate([x for x in source_army["regiments"] if x["men"] > 0]):
            t = UNIT_TYPES[r["type"]]
            dx, dy = d_slots[i] if i < len(d_slots) else (52, 8 + i * 5)
            e_squads.append({"slot": i + 1, "type": r["type"], "label": t["name"], "code": t["code"].lower(), "x": dx, "y": dy, "men": r["men"], "max_men": r["max_men"], "hp": r["men"] * t["hp_per_man"], "morale": r["morale"], "braced": is_siege and r["type"] == "spear", "routed": False, "cooldown": 0, "side": "defender" if is_siege else "enemy", "facing": -1, "pose": "idle", "pose_timer": 0.0})

        self.battle = {
            "title": title,
            "map": bmap,
            "source_army": source_army,
            "source_hold": source_hold,
            "gate_hp": gate_hp,
            "max_gate_hp": max(1, gate_hp),
            "gate_breached": gate_breached,
            "player_squads": p_squads,
            "enemy_squads": e_squads,
            "selected_slot": p_squads[0]["slot"] if p_squads else 1,
            "paused": False,
            "tick_timer": 0.0,
            "turn_count": 0,
            "outcome": None,
        }
        self.projectiles = []
        self.particles = []
        self.pulse_waves = []
        self.screen = "battle"
        self.sfx("horn")
        self.push_log(f"{title} -- Command [1-5], [WASD] Move, [F] Shield, [B] Volley, [J/C] Charge.")

    def _selected_squad(self) -> Optional[Dict[str, Any]]:
        if not self.battle:
            return None
        return next((s for s in self.battle["player_squads"] if s["slot"] == self.battle["selected_slot"] and s["men"] > 0), next((s for s in self.battle["player_squads"] if s["men"] > 0), None))

    def _is_battle_occ(self, x: int, y: int, self_sq: Optional[Dict[str, Any]] = None) -> bool:
        if not self.battle:
            return False
        return any(s is not self_sq and s["men"] > 0 and s["x"] == x and s["y"] == y for s in self.battle["player_squads"] + self.battle["enemy_squads"])

    def _apply_squad_dmg(self, att: Dict[str, Any], tgt: Dict[str, Any], raw_dmg: float, morale_hit: int, is_arrow: bool = False) -> int:
        if tgt["men"] <= 0:
            return 0
        t_def = UNIT_TYPES[tgt["type"]]
        mult = 1.15 if (att["side"] == "attacker" and self.flags.get("locke_steel")) else 1.0
        tile = self.battle["map"]["grid"][tgt["y"]][tgt["x"]]
        cover = TERRAIN_META.get(tile, {}).get("cover", 0)
        if tgt["braced"] and (is_arrow or att["type"] == "horse"):
            mult *= 0.52
        if cover > 0 and is_arrow:
            mult *= max(0.45, 1.0 - cover / 120.0)
        if not is_arrow and att["type"] == "horse" and not tgt["braced"]:
            mult *= 1.55
            morale_hit += 12
        armor_mit = max(0.5, 1.0 - t_def["armor"] * 0.035)
        dmg = max(18, round(raw_dmg * mult * armor_mit))
        tgt["hp"] = max(0, tgt["hp"] - dmg)
        tgt["men"] = 0 if tgt["hp"] <= 0 else math.ceil(tgt["hp"] / t_def["hp_per_man"])
        tgt["morale"] = max(0, tgt["morale"] - morale_hit)
        if tgt["morale"] < 22 and tgt["men"] > 0 and not tgt["routed"]:
            tgt["routed"] = True
            tgt["braced"] = False
            self.push_log(f"{tgt['label']} ({tgt['side']}) MORALE BREAKS -- ROUTING!")
        return dmg

    def _tick_battle(self) -> None:
        b = self.battle
        if not b or b["outcome"]:
            return
        b["turn_count"] += 1
        for ps in b["player_squads"]:
            if ps["men"] <= 0:
                continue
            if ps["cooldown"] > 0:
                ps["cooldown"] -= 1
            adj = next((e for e in b["enemy_squads"] if e["men"] > 0 and abs(e["x"] - ps["x"]) + abs(e["y"] - ps["y"]) <= 1), None)
            if adj and ps["type"] != "ram":
                pwr = UNIT_TYPES[ps["type"]]["atk"] * math.sqrt(max(4, ps["men"])) * 2.3
                self._apply_squad_dmg(ps, adj, pwr, 5)

        for es in b["enemy_squads"]:
            if es["men"] <= 0:
                continue
            if es["cooldown"] > 0:
                es["cooldown"] -= 1
            dec = decide_tactical_ai_action(es, b)
            act = dec["act"]
            if act == "brace":
                es["braced"] = True
            elif act == "move":
                es["braced"] = False
                nx, ny = step_battle_tile(b["map"]["grid"], es["x"], es["y"], dec["tx"], dec["ty"], lambda x, y, s=es: self._is_battle_occ(x, y, s))
                es["x"], es["y"] = nx, ny
                if es["routed"] and es["x"] >= BATTLE_W - 2:
                    es["men"] = 0
                    es["hp"] = 0
            elif act == "volley" and "target" in dec:
                es["cooldown"] = 2
                pwr = UNIT_TYPES["bow"]["atk"] * math.sqrt(max(4, es["men"])) * 1.9
                self._apply_squad_dmg(es, dec["target"], pwr, 4, True)
            elif act == "charge" and "target" in dec:
                es["cooldown"] = 2
                tgt = dec["target"]
                nx, ny = step_battle_tile(b["map"]["grid"], es["x"], es["y"], tgt["x"], tgt["y"], lambda x, y, s=es: self._is_battle_occ(x, y, s))
                es["x"], es["y"] = nx, ny
                if abs(es["x"] - tgt["x"]) + abs(es["y"] - tgt["y"]) <= 1:
                    if tgt["type"] == "spear" and tgt["braced"]:
                        self._apply_squad_dmg(tgt, es, 140, 14)
                    else:
                        dmg = UNIT_TYPES["horse"]["atk"] * math.sqrt(max(4, es["men"])) * 2.8
                        self._apply_squad_dmg(es, tgt, dmg, 12)
            elif act == "melee" and "target" in dec:
                dmg = UNIT_TYPES[es["type"]]["atk"] * math.sqrt(max(4, es["men"])) * 2.1
                self._apply_squad_dmg(es, dec["target"], dmg, 5)

        if not any(s["men"] > 0 and not s["routed"] for s in b["enemy_squads"]):
            self._resolve_battle_victory()
        elif not any(s["men"] > 0 and not s["routed"] for s in b["player_squads"]):
            self._resolve_battle_defeat(False)

    def _execute_player_tactic(self, verb: str) -> None:
        b = self.battle
        if not b or b["outcome"]:
            return
        sq = self._selected_squad()
        if not sq:
            return
        if verb == "parry":
            sq["braced"] = not sq["braced"]
            self.push_log(f"{sq['label']} {'LOCKS SHIELD WALL!' if sq['braced'] else 'opens formation.'}")
            return
        if verb == "fork":
            self.pulse_waves.append({"x": sq["x"], "y": sq["y"], "radius": 1.0, "max_radius": 11.0})
            for s in b["player_squads"]:
                if s["men"] > 0:
                    s["morale"] = min(100, s["morale"] + 14)
                    s["routed"] = False
            self.push_log("WAR-HORN RALLY! House Thorne banners steady (+14 Morale).")
            return
        foes = [s for s in b["enemy_squads"] if s["men"] > 0]
        if not foes:
            self._resolve_battle_victory()
            return
        nearest = min(foes, key=lambda s: abs(s["x"] - sq["x"]) + abs(s["y"] - sq["y"]))
        if verb == "volley":
            shooter = next((s for s in b["player_squads"] if s["type"] == "bow" and s["men"] > 0), sq)
            btgt = min(foes, key=lambda s: abs(s["x"] - shooter["x"]) + abs(s["y"] - shooter["y"]))
            bd = abs(btgt["x"] - shooter["x"]) + abs(btgt["y"] - shooter["y"])
            if bd > 15:
                self.push_log(f"Longbows out of range ({bd} > 15). Move [3] Bows closer!")
                return
            shooter["facing"] = 1 if btgt["x"] >= shooter["x"] else -1
            shooter["pose"] = "volley"
            shooter["pose_timer"] = 0.45
            dmg = UNIT_TYPES[shooter["type"]]["atk"] * math.sqrt(max(4, shooter["men"])) * (2.5 if shooter["type"] == "bow" else 1.1)
            self._apply_squad_dmg(shooter, btgt, dmg, 7, True)
            self.push_log(f"Arrow volley shreds {btgt['label']} ({btgt['morale']}% mor)!")
            self._tick_battle()
            return
        if verb in ("strike", "dodge"):
            if abs(nearest["x"] - sq["x"]) + abs(nearest["y"] - sq["y"]) > 1:
                steps = 2 if (sq["type"] == "horse" or verb == "dodge") else 1
                for _ in range(steps):
                    nx, ny = step_battle_tile(b["map"]["grid"], sq["x"], sq["y"], nearest["x"], nearest["y"], lambda x, y, s=sq: self._is_battle_occ(x, y, s))
                    if nx != sq["x"]:
                        sq["facing"] = 1 if nx > sq["x"] else -1
                    sq["x"], sq["y"] = nx, ny
            sq["pose"] = "charge" if sq["type"] == "horse" else "attack"
            sq["pose_timer"] = 0.45
            if abs(nearest["x"] - sq["x"]) + abs(nearest["y"] - sq["y"]) <= 2:
                sq["facing"] = 1 if nearest["x"] >= sq["x"] else -1
                sq["braced"] = False
                mult = 3.2 if sq["type"] == "horse" else 2.5
                dmg = UNIT_TYPES[sq["type"]]["atk"] * math.sqrt(max(4, sq["men"])) * mult
                self._apply_squad_dmg(sq, nearest, dmg, 14 if sq["type"] == "horse" else 7)
                self.push_log(f"{sq['label']} crashes into {nearest['label']} ({nearest['men']} left)!")
            self._tick_battle()
            return
        if verb == "interact":
            if b["map"]["kind"] == "siege" and not b["gate_breached"]:
                if abs(sq["x"] - (b["map"]["wall_x"] - 1)) <= 2 and abs(sq["y"] - b["map"]["gate_y"]) <= 2:
                    blow = 48 if sq["type"] == "ram" else 18
                    b["gate_hp"] = max(0, b["gate_hp"] - blow)
                    if b["gate_hp"] <= 0:
                        b["gate_breached"] = True
                        for gy in (13, 14, 15):
                            b["map"]["grid"][gy][b["map"]["wall_x"]] = "."
                            b["map"]["grid"][gy][b["map"]["wall_x"] + 1] = "."
                        self.push_log("IRON GATEHOUSE SHATTERS! Storm into the Courtyard!")
                    else:
                        self.push_log(f"Ram cracks Gatehouse ({b['gate_hp']}/{b['max_gate_hp']} HP)!")
                    self._tick_battle()
                    return
                if abs(sq["x"] - (b["map"]["wall_x"] - 1)) <= 1 and (abs(sq["y"] - 6) <= 1 or abs(sq["y"] - 23) <= 1):
                    dx = b["map"]["wall_x"] + 2
                    if not self._is_battle_occ(dx, sq["y"]):
                        sq["x"] = dx
                        self.push_log(f"{sq['label']} climbs Siege Ladders onto inner bailey!")
                        self._tick_battle()
                        return
            eboss = next((s for s in b["enemy_squads"] if s["men"] > 0 and s["type"] == "guard" and abs(s["x"] - sq["x"]) + abs(s["y"] - sq["y"]) <= 2), None)
            if eboss:
                self._apply_squad_dmg(sq, eboss, 150, 26)
                self.push_log(f"SINGLE COMBAT! Steel sparks against {b['source_army']['lord_name']}!")
                self._tick_battle()

    def _resolve_battle_victory(self) -> None:
        b = self.battle
        if not b or b["outcome"]:
            return
        b["outcome"] = "victory"
        self.stats["battles_won"] += 1
        for r in self.player_regiments:
            sq = next((s for s in b["player_squads"] if s["type"] == r["type"]), None)
            if sq:
                r["men"] = max(0, sq["men"])
                r["morale"] = max(45, sq["morale"])
        self.get_house("thorne")["treasury"] += 85
        self.campaign["grain"] += 30
        if b["source_hold"]:
            won_h = b["source_hold"]
            self.battle = None
            self.capture_hold(won_h)
            return
        defeated = b["source_army"]
        defeated["men"] = 0
        self.stats["lords_captured"] += 1
        self.battle = None
        self.active_dialogue = open_prisoner_menu(self, defeated)
        self.choice_cursor = 0
        self.screen = "dialogue"
        self.save_game()

    def _resolve_battle_defeat(self, retreated: bool = False) -> None:
        b = self.battle
        if not b:
            return
        for r in self.player_regiments:
            sq = next((s for s in b["player_squads"] if s["type"] == r["type"]), None)
            if sq:
                r["men"] = max(8, round(sq["men"] * 0.72)) if retreated else max(0, sq["men"])
                r["morale"] = 52
        self.battle = None
        self.campaign["px"], self.campaign["py"] = 28, 16
        self.screen = "campaign" if self.total_men(self.player_regiments) > 0 else "dead"
        self.save_game()

    def handle_action(self, act: str) -> bool:
        if not act:
            return True
        if act == "quit" and self.screen == "title":
            return False

        if self.screen == "title":
            if act == "confirm":
                if not (self.has_existing_save and self.load_game()):
                    self._init_fresh_state()
                    self.screen = "campaign"
                    self._trigger_story("prologue")
            elif act == "new_game":
                self._init_fresh_state()
                self.screen = "campaign"
                self._trigger_story("prologue")
            elif act == "help":
                self.screen = "help"
            elif act == "steed":
                self._prev_screen = "title"
                self.screen = "steed"
            return True

        if self.screen == "steed":
            if act in ("steed", "confirm", "cancel", "help"):
                self.screen = self._prev_screen if getattr(self, "_prev_screen", "title") != "steed" else "campaign"
            return True

        if self.screen in ("help", "ledger"):
            if act in ("confirm", "cancel", "ledger", "help"):
                self.screen = "battle" if self.battle else "campaign"
            return True

        if self.screen in ("victory", "dead"):
            if act in ("confirm", "new_game"):
                self._init_fresh_state()
                self.screen = "campaign"
                self._trigger_story("prologue")
            elif act == "cancel":
                self.screen = "title"
            return True

        if self.screen == "dialogue":
            self._handle_dialogue(act)
            return True

        if self.screen in ("campaign", "battle") and self.active_story is not None:
            self.active_story = None
            if act in ("confirm", "cancel"):
                return True

        if act == "steed" and self.screen == "campaign":
            self._prev_screen = "campaign"
            self.screen = "steed"
            return True

        if self.screen == "battle":
            self._handle_battle_input(act)
        elif self.screen == "campaign":
            self._handle_campaign_input(act)
        return True

    def _handle_dialogue(self, act: str) -> None:
        dlg = self.active_dialogue
        if not dlg:
            self.screen = "campaign"
            return
        choices = dlg.get("choices", [])
        if act == "cancel":
            self.active_dialogue = None
            self.screen = "battle" if self.battle else "campaign"
            return
        if act == "move_n":
            self.choice_cursor = (self.choice_cursor - 1) % len(choices)
            return
        if act == "move_s":
            self.choice_cursor = (self.choice_cursor + 1) % len(choices)
            return
        idx = int(act.split("_")[1]) - 1 if act.startswith("choice_") else (self.choice_cursor if act == "confirm" else -1)
        if 0 <= idx < len(choices):
            c = choices[idx]
            if "enabled" in c and not c["enabled"](self):
                self.push_log("Requirements not met.")
                return
            if "action" in c and c["action"]:
                c["action"](self)

    def _handle_campaign_input(self, act: str) -> None:
        if act == "ledger":
            self.screen = "ledger"
            return
        if act == "help":
            self.screen = "help"
            return
        if act == "council":
            self.active_dialogue = open_council_menu(self)
            self.choice_cursor = 0
            self.screen = "dialogue"
            return
        if act == "raven":
            self.active_dialogue = open_raven_menu(self)
            self.choice_cursor = 0
            self.screen = "dialogue"
            return
        if act == "fork":
            self.campaign["scouted_until_day"] = self.campaign["day"] + 4
            self.pulse_waves.append({"x": self.campaign["px"], "y": self.campaign["py"], "radius": 1.0, "max_radius": 20.0})
            self.push_log("Outriders reveal hostile banners for 4 Days!")
            return
        if act == "rest":
            tile = self.grid[self.campaign["py"]][self.campaign["px"]]
            base_f = TERRAIN_META.get(tile, {}).get("forage", 2)
            w_pen = 0.5 if SEASONS[self.campaign["season_index"]]["id"] == "winter" else 1.0
            gain = round((10 + base_f * 5) * w_pen)
            self.campaign["grain"] = min(450, self.campaign["grain"] + gain)
            for r in self.player_regiments:
                r["men"] = min(r["max_men"], r["men"] + 4)
                r["morale"] = min(100, r["morale"] + 5)
            self.advance_campaign_day(already_ate=True)
            self.push_log(f"Camp & Forage (+{gain} Grain, Day {self.campaign['day']}).")
            return
        if act == "interact":
            hold_here = self.hold_at(self.campaign["px"], self.campaign["py"])
            if hold_here:
                self.active_dialogue = open_hold_menu(self, hold_here)
                self.choice_cursor = 0
                self.screen = "dialogue"
                return
            adj = next((a for a in self.armies if a["men"] > 0 and abs(a["x"] - self.campaign["px"]) + abs(a["y"] - self.campaign["py"]) <= 1), None)
            if adj:
                self.start_field_battle(adj)
                return
            if self.grid[self.campaign["py"]][self.campaign["px"]] == "v":
                self.campaign["grain"] += 22
                self.push_log("Villagers share +22 Grain.")
            return

        dirs = {"move_n": (0, -1), "move_s": (0, 1), "move_w": (-1, 0), "move_e": (1, 0)}
        if act not in dirs or self.campaign["move_cooldown"] > 0:
            return
        dx, dy = dirs[act]
        nx, ny = self.campaign["px"] + dx, self.campaign["py"] + dy
        if not (0 <= nx < REALM_W and 0 <= ny < REALM_H):
            return
        tile = self.grid[ny][nx]
        season_id = SEASONS[self.campaign["season_index"]]["id"]
        passable = TERRAIN_META.get(tile, {}).get("passable", False)
        if tile == ":" and season_id == "autumn":
            passable = False
        if not passable:
            self.push_log("River or crag blocks passage -- cross at [=] Bridges!")
            return
        self.campaign["px"], self.campaign["py"] = nx, ny
        if dx != 0:
            self.campaign["facing"] = 1 if dx > 0 else -1
        self.campaign["gallop_timer"] = 0.85
        self.campaign["march_scroll"] = self.campaign.get("march_scroll", 0.0) + 1.0
        self.campaign["move_cooldown"] = 0.08
        enemy_here = next((a for a in self.armies if a["men"] > 0 and a["x"] == nx and a["y"] == ny and (self.get_house(a["house_id"])["treaty"] == "war" or self.get_house(a["house_id"])["relation"] <= -40)), None)
        if enemy_here:
            self.start_field_battle(enemy_here)
            return
        self.advance_campaign_day(False)
        h_here = self.hold_at(nx, ny)
        if h_here and h_here["id"] == "highcrown":
            self._trigger_story("highcrown_gates")

    def _handle_battle_input(self, act: str) -> None:
        if act == "ledger":
            self.screen = "ledger"
            return
        if act == "help":
            self.screen = "help"
            return
        if act in ("cancel", "quit"):
            self._resolve_battle_defeat(True)
            return
        if act == "pause_battle":
            self.battle["paused"] = not self.battle["paused"]
            return
        if act.startswith("choice_"):
            slot = int(act.split("_")[1])
            found = next((s for s in self.battle["player_squads"] if s["slot"] == slot and s["men"] > 0), None)
            if found:
                self.battle["selected_slot"] = slot
            return
        if act in ("parry", "fork", "volley", "strike", "dodge", "interact", "confirm"):
            if act == "confirm":
                self._tick_battle()
            else:
                self._execute_player_tactic(act)
            return
        dirs = {"move_n": (0, -1), "move_s": (0, 1), "move_w": (-1, 0), "move_e": (1, 0)}
        if act not in dirs:
            return
        sq = self._selected_squad()
        if not sq:
            return
        dx, dy = dirs[act]
        if dx != 0:
            sq["facing"] = 1 if dx > 0 else -1
        nx, ny = sq["x"] + dx, sq["y"] + dy
        if not (0 <= nx < BATTLE_W and 0 <= ny < BATTLE_H):
            return
        if self.battle["map"]["grid"][ny][nx] in ("#", "H", "~"):
            return
        if any(e["men"] > 0 and e["x"] == nx and e["y"] == ny for e in self.battle["enemy_squads"]):
            self._execute_player_tactic("strike")
            return
        if not self._is_battle_occ(nx, ny, sq):
            sq["x"], sq["y"] = nx, ny
            sq["pose"] = "charge" if sq["type"] == "horse" else "march"
            sq["pose_timer"] = 0.25

    def update(self, dt: float) -> None:
        self.clock += dt
        if self.campaign["move_cooldown"] > 0:
            self.campaign["move_cooldown"] = max(0.0, self.campaign["move_cooldown"] - dt)
        if self.campaign.get("gallop_timer", 0.0) > 0:
            self.campaign["gallop_timer"] = max(0.0, self.campaign["gallop_timer"] - dt)
            self.campaign["march_scroll"] = self.campaign.get("march_scroll", 0.0) + dt * 6.0
        for pw in self.pulse_waves:
            pw["radius"] += dt * 16.0
        self.pulse_waves = [pw for pw in self.pulse_waves if pw["radius"] < pw["max_radius"]]
        if self.battle:
            for sq in self.battle["player_squads"] + self.battle["enemy_squads"]:
                if sq.get("pose_timer", 0.0) > 0:
                    sq["pose_timer"] = max(0.0, sq["pose_timer"] - dt)
        if self.screen == "battle" and self.battle and not self.battle["paused"] and not self.battle["outcome"]:
            self.battle["tick_timer"] += dt
            if self.battle["tick_timer"] >= 0.72:
                self.battle["tick_timer"] = 0.0
                self._tick_battle()

    # ==================== RENDERING (104x38 PRINTABLE ASCII) ====================

    def _put_str(self, buf: List[List[Tuple[str, int]]], x: int, y: int, text: str, grade: int = GRADE_LIT) -> None:
        if not (0 <= y < GRID_ROWS):
            return
        for i, ch in enumerate(text):
            c = x + i
            if 0 <= c < GRID_COLS:
                buf[y][c] = (sanitize_glyph(ch), grade)

    def _draw_frame(self, buf: List[List[Tuple[str, int]]], x: int, y: int, w: int, h: int, title: str = "", bg: int = GRADE_DIM, tg: int = GRADE_BRIGHT) -> None:
        for cx in range(x + 1, x + w - 1):
            buf[y][cx] = ("-", bg)
            buf[y + h - 1][cx] = ("-", bg)
        for ry in range(y + 1, y + h - 1):
            buf[ry][x] = ("|", bg)
            buf[ry][x + w - 1] = ("|", bg)
        buf[y][x] = ("+", bg)
        buf[y][x + w - 1] = ("+", bg)
        buf[y + h - 1][x] = ("+", bg)
        buf[y + h - 1][x + w - 1] = ("+", bg)
        if title:
            t = f"[ {title} ]"
            self._put_str(buf, x + max(2, (w - len(t)) // 2), y, t, tg)

    def render_buffer(self) -> List[List[Tuple[str, int]]]:
        buf: List[List[Tuple[str, int]]] = [[(" ", GRADE_GHOST) for _ in range(GRID_COLS)] for _ in range(GRID_ROWS)]
        if self.screen == "title":
            self._render_title(buf)
        elif self.screen == "steed":
            self._render_steed(buf)
        elif self.screen == "ledger":
            self._render_ledger(buf)
        elif self.screen == "help":
            self._render_help(buf)
        elif self.screen in ("victory", "dead"):
            self._render_outcome(buf)
        elif self.screen == "battle":
            self._render_battle(buf)
        else:
            self._render_campaign(buf)
        return buf

    def _render_steed(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 1, 1, GRID_COLS - 2, VIEW_ROWS, "WARHORSE & ROYAL DESTRIER GALLERY", GRADE_DIM, GRADE_BRIGHT)
        season_id = SEASONS[self.campaign["season_index"]]["id"]
        pano = get_baked_steed_panorama(self.clock, season_id)
        px = 2 + max(0, (GRID_COLS - 4 - len(pano[0])) // 2)
        stamp_cell_grid(buf, px, 2, pano, (2, 2, GRID_COLS - 3, VIEW_TOP + VIEW_ROWS - 2), 0)
        self._put_str(buf, 4, 31, fit_line("THORNE HEAVY DESTRIER -- 3D HALFTONE RELIEF  |  Press [4] + [J/C] in Battle to Charge!", 96), GRADE_LIT)
        self._render_bottom_hud(buf)
        self._put_str(buf, 1, HINT_ROW, fit_line("[Enter / Esc / Z] Return to Command", GRID_COLS - 2), GRADE_BRIGHT)

    def _render_title(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 1, 1, 66, 32, "HIGHCROWN MARCH -- WINTER 298", GRADE_DIM, GRADE_LIT)
        stamp_cell_grid(buf, 2, 2, get_baked_title_hero(self.clock), (2, 2, 65, 31), 0)
        self._put_str(buf, 4, 31, fit_line("War is won by full granaries, loyal spears & steel cavalry.", 60), GRADE_DIM)

        self._draw_frame(buf, 68, 1, 35, 32, "IRONCROWN", GRADE_LIT, GRADE_BRIGHT)
        masthead = [
            " ___ ____   ___  _   _ ",
            "|_ _|  _ \\ / _ \\| \\ | |",
            " | || |_) | | | |  \\| |",
            " | ||  _ <| |_| | |\\  |",
            "|___|_| \\_\\\\___/|_| \\_|",
            "       C R O W N       ",
        ]
        for i, ln in enumerate(masthead):
            self._put_str(buf, 74, 3 + i, ln, GRADE_BRIGHT if i < 2 else GRADE_LIT)
        self._put_str(buf, 71, 10, "THE REALM IN WINTER -- GOT WAR", GRADE_BRIGHT)
        self._put_str(buf, 70, 12, "------------------------------", GRADE_GHOST)
        self._put_str(buf, 70, 13, "Real Feudal War & Sieges:", GRADE_LIT)
        self._put_str(buf, 70, 14, "* Supply Lines & Starvation", GRADE_DIM)
        self._put_str(buf, 70, 15, "* House Oaths & Betrayals", GRADE_DIM)
        self._put_str(buf, 70, 16, "* Animated Horses, Bows & Rams", GRADE_DIM)
        self._put_str(buf, 70, 17, "* Frozen River Winter Strikes", GRADE_DIM)
        self._put_str(buf, 70, 19, "------------------------------", GRADE_GHOST)
        self._put_str(buf, 70, 21, "[Enter] Resume Saved War" if self.has_existing_save else "[Enter] Muster & Ride Out", GRADE_BRIGHT)
        if self.has_existing_save:
            self._put_str(buf, 70, 23, "[N] Tear Old Charter (New)", GRADE_LIT)
        self._put_str(buf, 70, 25, "[Z] Inspect War Destrier", GRADE_LIT)
        self._put_str(buf, 70, 27, "[H] War Manual & Controls", GRADE_DIM)
        self._put_str(buf, 1, LOG_TOP, fit_line("Archon Malcor Dray murdered your brother under truce banner and seized Highcrown Citadel.", GRID_COLS - 2), GRADE_LIT)
        self._put_str(buf, 1, LOG_TOP + 1, fit_line("Command animated cavalry, pikemen, longbows & siege rams across Marren Valley to claim the crown.", GRID_COLS - 2), GRADE_DIM)
        self._put_str(buf, 1, HINT_ROW, fit_line("[Enter] Begin Campaign | [Z] Full-Screen Destrier | [H] Manual", GRID_COLS - 2), GRADE_MIST)

    def _render_campaign(self, buf: List[List[Tuple[str, int]]]) -> None:
        th = self.get_house("thorne")
        season = SEASONS[self.campaign["season_index"]]
        sup = "SUPPLY OK" if self.campaign["supplied"] else "CUT OFF!!"
        hdr = f"DAY {self.campaign['day']} {season['label']} | {th['treasury']}g | GRAIN {self.campaign['grain']} [{sup}] | MEN {self.total_men(self.player_regiments)} | HOLDS {self.held_count()}/{len(self.holds)} | HON {th['honor']} DRD {th['dread']}"
        self._put_str(buf, 1, 0, fit_line(hdr, GRID_COLS - 2), GRADE_BRIGHT if self.campaign["supplied"] else GRADE_LIT)

        self._draw_frame(buf, 0, VIEW_TOP, 68, 17, "REALM CAMPAIGN MAP", GRADE_DIM, GRADE_LIT)
        cam_x = max(0, min(REALM_W - 66, self.campaign["px"] - 33))
        cam_y = max(0, min(REALM_H - 15, self.campaign["py"] - 7))
        scouted = self.campaign["day"] <= self.campaign["scouted_until_day"]

        for r in range(15):
            wy = cam_y + r
            for c in range(66):
                wx = cam_x + c
                ch = self.grid[wy][wx]
                g = GRADE_DIM if ch == "=" else (GRADE_LIT if ch in ("T", "v", "#") else GRADE_GHOST)
                for pw in self.pulse_waves:
                    if abs(math.hypot(wx - pw["x"], wy - pw["y"]) - pw["radius"]) < 1.2:
                        ch, g = "o", GRADE_BRIGHT
                buf[VIEW_TOP + 1 + r][1 + c] = (ch, g)

        for h in self.holds:
            sx, sy = h["x"] - cam_x + 1, h["y"] - cam_y + VIEW_TOP + 1
            if 1 <= sx <= 66 and VIEW_TOP + 1 <= sy <= VIEW_TOP + 15:
                owner = self.get_house(h["owner"])
                sym = "*" if h["owner"] == "thorne" else ("!" if owner["treaty"] == "war" else "+")
                buf[sy][sx] = (sym, GRADE_BRIGHT if h["owner"] == "thorne" else GRADE_LIT)
                if sx + 4 <= 66:
                    self._put_str(buf, sx + 1, sy, h["name"][:6].upper(), GRADE_BRIGHT if h["owner"] == "thorne" else GRADE_DIM)

        for a in self.armies:
            if a["men"] <= 0:
                continue
            sx, sy = a["x"] - cam_x + 1, a["y"] - cam_y + VIEW_TOP + 1
            if 1 <= sx <= 66 and VIEW_TOP + 1 <= sy <= VIEW_TOP + 15:
                d = abs(a["x"] - self.campaign["px"]) + abs(a["y"] - self.campaign["py"])
                vis = scouted or d <= 14
                h = self.get_house(a["house_id"])
                buf[sy][sx] = (("X" if h["treaty"] == "war" else h["tag"][0]) if vis else "?", GRADE_BRIGHT if vis and h["treaty"] == "war" else GRADE_LIT)

        psx, psy = self.campaign["px"] - cam_x + 1, self.campaign["py"] - cam_y + VIEW_TOP + 1
        buf[psy][psx] = ("@", GRADE_BRIGHT)

        cur_hold = self.hold_at(self.campaign["px"], self.campaign["py"])
        tile_here = self.grid[self.campaign["py"]][self.campaign["px"]]
        here_label = f"{cur_hold['name']} [{self.get_house(cur_hold['owner'])['tag']}]" if cur_hold else TERRAIN_META.get(tile_here, {}).get("name", "Wilds")
        riding_tag = "GALLOPING" if self.campaign.get("gallop_timer", 0.0) > 0 else "HALTED"
        self._draw_frame(buf, 0, 18, 68, 15, f"KING'S ROAD: {here_label[:22].upper()} ({riding_tag})", GRADE_DIM, GRADE_BRIGHT)
        render_campaign_march_vista(buf, self, 1, 19, 66, 13)

        self._draw_frame(buf, 68, VIEW_TOP, 36, VIEW_ROWS, "WAR COLUMN & HOUSES", GRADE_DIM, GRADE_LIT)
        self._put_str(buf, 70, 2, fit_line(f"LOC: {here_label}", 32), GRADE_BRIGHT)
        self._put_str(buf, 70, 4, "[ THORNE REGIMENTS ]", GRADE_LIT)
        for i, r in enumerate(self.player_regiments):
            t = UNIT_TYPES[r["type"]]
            self._put_str(buf, 70, 5 + i, f"[{t['code']}] {t['name'][:15].ljust(15)} {r['men']:3d} {r['morale']}%", GRADE_DIM if r["men"] > 0 else GRADE_GHOST)
        self._put_str(buf, 70, 11, "[ GREAT HOUSES & OATHS ]", GRADE_LIT)
        for i, h in enumerate([x for x in self.houses if not x["is_player"]]):
            risk = f" R{h['betrayal_risk']}%" if (h["betrayal_risk"] > 0 and h["treaty"] != "war") else ""
            self._put_str(buf, 70, 12 + i, fit_line(f"{h['tag']} {h['treaty'].upper():<5} {h['relation']:>4}{risk}", 32), GRADE_BRIGHT if h["treaty"] == "war" else GRADE_DIM)

        self._put_str(buf, 70, 17, "[ NEAREST FOE BANNERS ]", GRADE_LIT)
        hostiles = sorted([a for a in self.armies if a["men"] > 0], key=lambda a: abs(a["x"] - self.campaign["px"]) + abs(a["y"] - self.campaign["py"]))[:3]
        for i, a in enumerate(hostiles):
            br = bearing_label(self.campaign["px"], self.campaign["py"], a["x"], a["y"])
            men_str = f"{a['men']}m" if (scouted or abs(a["x"] - self.campaign["px"]) + abs(a["y"] - self.campaign["py"]) <= 14) else "?m"
            self._put_str(buf, 70, 18 + i, fit_line(f"{a['lord_name'][:16]} {men_str} {br}", 32), GRADE_DIM)

        self._put_str(buf, 70, 22, "[ COMMAND ACTIONS ]", GRADE_LIT)
        for i, c in enumerate(["[E] Keep / Siege / Village", "[C] Small Council & Spies", "[T] Dispatch Raven Pact", "[R] Camp & Forage 1 Day", "[Space] Outrider Scout", "[Z] Full-Screen Destrier", "[Tab] Map & Full Ledger", "[H] Field Manual / Help"]):
            self._put_str(buf, 70, 23 + i, fit_line(c, 32), GRADE_MIST)

        if self.screen == "dialogue" and self.active_dialogue:
            self._render_dialogue_chamber(buf)
        if self.active_story is not None:
            self._render_story_dispatch(buf, psy)
        self._render_bottom_hud(buf)

    def _render_dialogue_chamber(self, buf: List[List[Tuple[str, int]]]) -> None:
        dlg = self.active_dialogue
        if not dlg:
            return
        crest, house_id, p_key = pick_crest_for_dialogue(dlg)
        house = self.get_house(house_id)
        bx, by, bw, bh = 4, 2, 96, 19
        bounds = (bx + 1, by + 1, bx + bw - 2, by + bh - 2)
        for r in range(by + 1, by + bh - 1):
            self._put_str(buf, bx + 1, r, " " * (bw - 2), GRADE_GHOST)
        self._draw_frame(buf, bx, by, bw, bh, f"PARLEY CHAMBER -- {dlg['speaker']}", GRADE_LIT, GRADE_BRIGHT)
        self._draw_frame(buf, bx + 2, by + 1, 30, 16, house["name"].upper(), GRADE_DIM, GRADE_LIT)
        stamp_cell_grid(buf, bx + 3, by + 2, get_baked_portrait(p_key), bounds, 0)
        flame = "(*)" if int(self.clock * 7) % 2 == 0 else "(^)"
        self._put_str(buf, bx + 35, by + 2, flame, GRADE_BRIGHT)
        self._put_str(buf, bx + 90, by + 2, flame, GRADE_BRIGHT)
        stamp_sprite(buf, bx + 79, by + 3, crest, GRADE_DIM, bounds, {"O", "*"})
        self._put_str(buf, bx + 40, by + 2, fit_line(dlg["speaker"], 36), GRADE_BRIGHT)
        self._put_str(buf, bx + 35, by + 4, fit_line(f"{house['lord']} | {house['treaty'].upper()} | Rel {house['relation']}", 42), GRADE_DIM)
        line_txt = dlg["line_fn"](self) if "line_fn" in dlg else ""
        for i, ln in enumerate(wrap_lines(line_txt, 54)[:5]):
            self._put_str(buf, bx + 35, by + 9 + i, ln, GRADE_LIT)
        self._put_str(buf, bx + 35, by + 16, fit_line("Pick [1..5] below or [W/S + Enter]  |  [Esc] Close", 56), GRADE_MIST)

    def _render_battle(self, buf: List[List[Tuple[str, int]]]) -> None:
        b = self.battle
        gate_txt = f" | GATE {'OPEN' if b['gate_breached'] else str(b['gate_hp']) + '/' + str(b['max_gate_hp'])}" if b["map"]["kind"] == "siege" else ""
        hdr = f"{b['title']}{gate_txt} | THORNE {self.total_men(b['player_squads'])} | FOE {self.total_men(b['enemy_squads'])} | {'PAUSED' if b['paused'] else 'LIVE'}"
        self._put_str(buf, 1, 0, fit_line(hdr, GRID_COLS - 2), GRADE_BRIGHT)
        self._draw_frame(buf, 0, VIEW_TOP, 68, VIEW_ROWS, "SIEGE FIELD (LIVE ANIMATED UNITS)" if b["map"]["kind"] == "siege" else "BATTLEFIELD (LIVE ANIMATED UNITS)", GRADE_DIM, GRADE_LIT)
        render_battle_scenery(buf, b, self.clock, self.pulse_waves, 1, VIEW_TOP + 1)

        bounds = (1, VIEW_TOP + 1, 66, VIEW_TOP + 30)
        sel = self._selected_squad()
        all_units = [
            (s, True) for s in b["player_squads"] if s["men"] > 0
        ] + [
            (s, False) for s in b["enemy_squads"] if s["men"] > 0
        ]
        all_units.sort(key=lambda pair: pair[0]["y"])
        for sq, is_player in all_units:
            pose = sq.get("pose", "idle") if sq.get("pose_timer", 0.0) > 0 else "idle"
            grid, half_w, half_h = get_baked_battle_sprite(sq, self.clock, pose)
            sx = 1 + sq["x"] - half_w
            sy = VIEW_TOP + 1 + sq["y"] - half_h
            is_sel = bool(is_player and sel and sel["slot"] == sq["slot"])
            grade_boost = 1 if is_sel else (0 if is_player else (-2 if sq.get("routed") else -1))
            stamp_cell_grid(buf, sx, sy, grid, bounds, grade_boost)
            badge = (f"*[{sq['slot']}]{sq['code']}:{sq['men']}*" if is_sel else f"[{sq['slot']}]{sq['code']}:{sq['men']}") if is_player else f"({sq['code']}){sq['men']}"
            bx = max(1, min(67 - len(badge), 1 + sq["x"] - len(badge) // 2))
            by = min(VIEW_TOP + 30, max(VIEW_TOP + 1, sy + len(grid)))
            self._put_str(buf, bx, by, badge, GRADE_BRIGHT if is_sel else (GRADE_LIT if is_player else GRADE_DIM))

        self._draw_frame(buf, 68, VIEW_TOP, 36, VIEW_ROWS, "BATTLE ORDERS", GRADE_DIM, GRADE_LIT)
        if sel:
            self._put_str(buf, 70, 2, fit_line(f"SEL [{sel['slot']}] {sel['label']}", 32), GRADE_BRIGHT)
            self._put_str(buf, 70, 3, fit_line(f"Men {sel['men']} | Morale {sel['morale']}%", 32), GRADE_LIT)
        self._put_str(buf, 70, 5, "[ THORNE LINE (Keys 1..5) ]", GRADE_LIT)
        for i, s in enumerate(b["player_squads"]):
            mark = ">" if (sel and sel["slot"] == s["slot"]) else " "
            st = "LOST" if s["men"] <= 0 else ("ROUT" if s["routed"] else ("SHLD" if s["braced"] else "OK  "))
            self._put_str(buf, 70, 6 + i, fit_line(f"{mark}[{s['slot']}]{s['code']} {s['men']:3d}m {s['morale']:3d}% {st}", 32), GRADE_DIM if s["men"] > 0 else GRADE_GHOST)
        self._put_str(buf, 70, 12, fit_line(f"[ FOE: {b['source_army']['lord_name'][:23]} ]", 32), GRADE_LIT)
        for i, s in enumerate(b["enemy_squads"]):
            st = "DOWN" if s["men"] <= 0 else ("ROUT" if s["routed"] else ("SHLD" if s["braced"] else "LINE"))
            self._put_str(buf, 70, 13 + i, fit_line(f" ({s['code']}) {s['label'][:12].ljust(12)} {s['men']:3d}m {s['morale']:3d}% {st}", 32), GRADE_MIST if s["routed"] else GRADE_DIM)
        if self.active_story is not None:
            self._render_story_dispatch(buf, sel["y"] + 2 if sel else 16)
        self._render_bottom_hud(buf)

    def _render_bottom_hud(self, buf: List[List[Tuple[str, int]]]) -> None:
        if self.screen == "dialogue" and self.active_dialogue:
            dlg = self.active_dialogue
            self._put_str(buf, 1, LOG_TOP, fit_line(f"{dlg['speaker']}: {dlg['line_fn'](self)}", GRID_COLS - 2), GRADE_BRIGHT)
            choices = dlg["choices"]
            for i in range(2):
                a, b = i * 2, i * 2 + 1
                ta = f"{'>' if a == self.choice_cursor else ' '}[{a+1}] {choices[a]['label'](self)}" if a < len(choices) else ""
                tb = f"{'>' if b == self.choice_cursor else ' '}[{b+1}] {choices[b]['label'](self)}" if b < len(choices) else ""
                line = f"{ta[:48].ljust(50)} {tb[:50]}" if tb else ta
                self._put_str(buf, 1, LOG_TOP + 1 + i, fit_line(line, GRID_COLS - 2), GRADE_LIT)
            self._put_str(buf, 1, HINT_ROW, fit_line(f"[1-{len(choices)}] Pick Choice  [Enter] Act  [Esc] Close", GRID_COLS - 2), GRADE_MIST)
            return

        obj = compute_war_objective(self)
        self._put_str(buf, 1, LOG_TOP, fit_line(f"NOW [{obj['chapter']}] {obj['now']} | NEXT: {obj['next']}", GRID_COLS - 2), GRADE_BRIGHT)
        recent = self.log[-(LOG_ROWS - 1):]
        for i, msg in enumerate(recent):
            self._put_str(buf, 1, LOG_TOP + 1 + i, fit_line(msg, GRID_COLS - 2), GRADE_LIT if i == len(recent) - 1 else GRADE_DIM)
        hint = "[WASD] March  [E] Hold/Siege  [C] Council  [T] Raven  [R] Forage  [Space] Scout  [Z] Steed" if self.screen != "battle" else "[1-5] Squad  [WASD] Move  [J/C] Charge  [B] Volley  [F] Shield  [E] Ram/Duel  [Space] Horn"
        self._put_str(buf, 1, HINT_ROW, fit_line(hint, GRID_COLS - 2), GRADE_MIST)

    def _render_story_dispatch(self, buf: List[List[Tuple[str, int]]], cursor_row: int) -> None:
        story = self.active_story
        if not story:
            return
        w, h, left = 102, 10, 1
        top = 21 if cursor_row <= 19 else 2
        for r in range(top, top + h):
            self._put_str(buf, left, r, " " * w, GRADE_GHOST)
        self._draw_frame(buf, left, top, w, h, f"WAR CHRONICLE: {story['title']}", GRADE_DIM, GRADE_BRIGHT)
        for idx, ln in enumerate(story["lines"][:3]):
            self._put_str(buf, left + 3, top + 1 + idx, fit_line(ln, w - 6), GRADE_LIT)
        self._put_str(buf, left + 3, top + 5, fit_line(f"NOW : {story['now']}", w - 6), GRADE_BRIGHT)
        self._put_str(buf, left + 3, top + 6, fit_line(f"NEXT: {story['next']}", w - 6), GRADE_DIM)
        self._put_str(buf, left + 3, top + 8, fit_line("[WASD / Enter / Space] Dismiss & Command  |  [Tab] Full Ledger", w - 6), GRADE_BRIGHT)

    def _render_ledger(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 1, 1, GRID_COLS - 2, GRID_ROWS - 3, "REALM WAR LEDGER, HOUSES & OBJECTIVES", GRADE_DIM, GRADE_BRIGHT)
        obj = compute_war_objective(self)
        col = 63
        self._put_str(buf, col, 3, "[ REALM HOLDS & CONTROL ]", GRADE_LIT)
        for i, h in enumerate(self.holds):
            tag = self.get_house(h["owner"])["tag"]
            self._put_str(buf, col, 5 + i, fit_line(f"{h['name'][:17].ljust(17)} [{tag}] G:{h['garrison']:3d}", 38), GRADE_BRIGHT if h["owner"] == "thorne" else GRADE_DIM)
        self._put_str(buf, col, 23, f"[ GOAL: {obj['chapter']} ]", GRADE_BRIGHT)
        for i, ln in enumerate(wrap_lines(f"NOW : {obj['now']}", 38)[:3]):
            self._put_str(buf, col, 24 + i, ln, GRADE_LIT)
        for i, ln in enumerate(wrap_lines(f"NEXT: {obj['next']}", 38)[:3]):
            self._put_str(buf, col, 28 + i, ln, GRADE_DIM)
        self._put_str(buf, 1, HINT_ROW, fit_line("[Tab / Esc / Enter] Return", GRID_COLS - 2), GRADE_MIST)

    def _render_help(self, buf: List[List[Tuple[str, int]]]) -> None:
        self._draw_frame(buf, 3, 1, GRID_COLS - 6, GRID_ROWS - 3, "IRONCROWN -- REAL WAR FIELD MANUAL", GRADE_DIM, GRADE_BRIGHT)
        self._put_str(buf, 6, 4, "1. Hold Supply Lines & Grain; Ride with [WASD] & Inspect Destrier with [Z].", GRADE_BRIGHT)
        self._put_str(buf, 6, 7, "2. Manage Locke, Brack & Vance Loyalty via Ravens [T] or Spies [C].", GRADE_LIT)
        self._put_str(buf, 6, 10, "3. In Battle: [1-5] Squads, [F] Shieldwall, [B] Volley, [E] Siege Ram, [J/C] Charge.", GRADE_LIT)
        self._put_str(buf, 1, HINT_ROW, fit_line("[Enter / Esc / H] Return", GRID_COLS - 2), GRADE_MIST)

    def _render_outcome(self, buf: List[List[Tuple[str, int]]]) -> None:
        won = self.screen == "victory"
        title = "THE IRON CROWN RECLAIMED -- VICTORY" if won else "THE HOUSE OF THORNE FALLS -- DEFEAT"
        self._draw_frame(buf, 6, 2, GRID_COLS - 12, 30, title, GRADE_DIM, GRADE_BRIGHT)
        if won:
            stamp_cell_grid(buf, 29, 6, get_baked_campaign_horse(self.clock, True, True), (7, 3, GRID_COLS - 8, 21), 0)
            self._put_str(buf, 22, 22, "HIGHCROWN FLIES THE WOLF AND AMBER PIKE OF HOUSE THORNE!", GRADE_BRIGHT)
        self._put_str(buf, 26, 28, "[Enter / N] Begin New War  |  [Esc] Title", GRADE_BRIGHT)
        self._put_str(buf, 1, HINT_ROW, fit_line("[Enter] New War | [Esc] Title", GRID_COLS - 2), GRADE_MIST)
