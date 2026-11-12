"""Strategic Utility AI and Tactical Battlefield Squad AI for IRONCROWN."""

from __future__ import annotations

import heapq
from typing import Any, Callable, Dict, List, Optional, Tuple

from ironcrown.world_data import BATTLE_H, BATTLE_W, REALM_H, REALM_W, TERRAIN_META


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def next_realm_step(
    grid: List[List[str]],
    sx: int,
    sy: int,
    gx: int,
    gy: int,
    season_id: str,
    max_visited: int = 900,
) -> Optional[Tuple[int, int]]:
    """Bounded A* pathfinding returning next (x, y) step across realm tiles."""
    if sx == gx and sy == gy:
        return None
    start_k = sy * REALM_W + sx
    goal_k = gy * REALM_W + gx
    heap: List[Tuple[float, int, int]] = [(0.0, sx, sy)]
    came_from: Dict[int, int] = {start_k: -1}
    cost_so_far: Dict[int, float] = {start_k: 0.0}
    visited = 0

    while heap and visited < max_visited:
        _, cx, cy = heapq.heappop(heap)
        ck = cy * REALM_W + cx
        if ck == goal_k:
            break
        visited += 1

        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if not (0 <= nx < REALM_W and 0 <= ny < REALM_H):
                continue
            ch = grid[ny][nx]
            passable = TERRAIN_META.get(ch, {}).get("passable", False)
            if ch == ":" and season_id == "autumn":
                passable = False
            if not passable:
                continue
            step_cost = TERRAIN_META.get(ch, {}).get("cost", 1.0)
            nk = ny * REALM_W + nx
            new_cost = cost_so_far[ck] + step_cost
            if nk not in cost_so_far or new_cost < cost_so_far[nk]:
                cost_so_far[nk] = new_cost
                came_from[nk] = ck
                h = abs(gx - nx) + abs(gy - ny)
                heapq.heappush(heap, (new_cost + h * 0.72, nx, ny))

    if goal_k not in came_from:
        dirs = sorted(
            ((1, 0), (-1, 0), (0, 1), (0, -1)),
            key=lambda d: abs(gx - (sx + d[0])) + abs(gy - (sy + d[1])),
        )
        for dx, dy in dirs:
            nx, ny = sx + dx, sy + dy
            if 0 <= nx < REALM_W and 0 <= ny < REALM_H and TERRAIN_META.get(grid[ny][nx], {}).get("passable"):
                return (nx, ny)
        return None

    cur = goal_k
    while came_from[cur] != start_k and came_from[cur] != -1:
        cur = came_from[cur]
    return (cur % REALM_W, cur // REALM_W)


def compute_house_betrayal_utility(
    house: Dict[str, Any],
    player_house: Dict[str, Any],
    player_men: int,
    holds: List[Dict[str, Any]],
) -> float:
    """Evaluate 0..1 betrayal likelihood for non-Dray Great Houses."""
    if house.get("is_player") or house["id"] == "dray" or house["treaty"] == "war":
        return 0.0
    rel_danger = _clamp01((35.0 - house["relation"]) / 90.0)
    low_honor = _clamp01((75.0 - house["honor"]) / 75.0)
    weak_player = _clamp01((140.0 - player_men) / 110.0)
    poor_crown = _clamp01((90.0 - player_house["treasury"]) / 90.0) * 0.6
    fear_shield = _clamp01(player_house["dread"] / 85.0)
    p_holds = sum(1 for h in holds if h["owner"] == "thorne")
    overext = 0.25 if (p_holds >= 5 and house["personality"] == "ambitious") else 0.0
    raw = rel_danger * 0.44 + low_honor * 0.24 + weak_player * 0.2 + poor_crown * 0.12 + overext
    return _clamp01(raw * (1.0 - fear_shield * 0.58))


def pick_campaign_army_intent(army: Dict[str, Any], house: Dict[str, Any], game: Any) -> Dict[str, Any]:
    """Select strategic march destination and mission mode for an NPC host."""
    px, py = game.campaign["px"], game.campaign["py"]
    dist_player = abs(army["x"] - px) + abs(army["y"] - py)
    p_str = game.total_men(game.player_regiments)
    my_str = game.total_men(army["regiments"])
    hostile = house["treaty"] == "war" or house["relation"] <= -40

    if not hostile:
        owned = [h for h in game.holds if h["owner"] == house["id"]]
        if house["treaty"] == "oath" and owned and dist_player > 8:
            guard_hold = next((h for h in game.holds if h["id"] == "ashford"), owned[0])
            return {"tx": guard_hold["x"], "ty": guard_hold["y"], "mode": "guard_pass"}
        home = owned[0] if owned else game.holds[0]
        return {"tx": home["x"], "ty": home["y"], "mode": "patrol"}

    best = {"tx": px, "ty": py, "mode": "hunt", "score": -1.0}
    eng_sc = _clamp01(my_str / max(40.0, float(p_str))) * 0.65 + _clamp01((18.0 - dist_player) / 18.0) * 0.45
    if eng_sc > best["score"] and my_str >= p_str * 0.72:
        best = {"tx": px, "ty": py, "mode": "intercept", "score": eng_sc}

    for h in game.holds:
        if h["owner"] == house["id"]:
            continue
        if h["owner"] != "thorne" and house["id"] != "dray":
            continue
        dist = abs(army["x"] - h["x"]) + abs(army["y"] - h["y"])
        weak_g = _clamp01((130.0 - h["garrison"]) / 130.0)
        prox = _clamp01((32.0 - dist) / 32.0)
        grain_bonus = 0.18 if h["grain_yield"] >= 35 else 0.0
        sc = weak_g * 0.45 + prox * 0.45 + grain_bonus
        if sc > best["score"]:
            best = {"tx": h["x"], "ty": h["y"], "mode": "besiege", "hold_id": h["id"], "score": sc}

    return best


def decide_tactical_ai_action(squad: Dict[str, Any], battle: Dict[str, Any]) -> Dict[str, Any]:
    """Choose next battle action for an enemy regiment."""
    if squad["men"] <= 0:
        return {"act": "none"}
    if squad["morale"] < 22 or squad["routed"]:
        squad["routed"] = True
        squad["braced"] = False
        return {"act": "move", "tx": BATTLE_W - 1, "ty": squad["y"], "mode": "rout"}

    foes = [s for s in battle["player_squads"] if s["men"] > 0 and not s["routed"]]
    if not foes:
        return {"act": "hold"}

    nearest = min(foes, key=lambda s: abs(s["x"] - squad["x"]) + abs(s["y"] - squad["y"]))
    dist_nearest = abs(nearest["x"] - squad["x"]) + abs(nearest["y"] - squad["y"])

    if squad["type"] == "bow":
        if dist_nearest <= 2 and battle["map"]["kind"] != "siege":
            return {"act": "move", "tx": min(BATTLE_W - 2, squad["x"] + 3), "ty": squad["y"]}
        in_range = sorted(
            [f for f in foes if abs(f["x"] - squad["x"]) + abs(f["y"] - squad["y"]) <= 22],
            key=lambda a: (1 if a["braced"] else 0, a["hp"]),
        )
        if in_range and squad["cooldown"] <= 0:
            return {"act": "volley", "target": in_range[0]}
        if battle["map"]["kind"] == "siege" and squad["side"] == "defender":
            return {"act": "hold"}
        return {"act": "move", "tx": min(BATTLE_W - 2, nearest["x"] + 10), "ty": nearest["y"]}

    if squad["type"] == "horse":
        soft = next((f for f in foes if f["type"] == "bow" and not f["braced"]), None)
        if soft is None:
            soft = next((f for f in foes if not f["braced"]), nearest)
        d = abs(soft["x"] - squad["x"]) + abs(soft["y"] - squad["y"])
        if d <= 2:
            return {"act": "charge", "target": soft}
        flank_y = max(2, soft["y"] - 2) if soft["y"] < BATTLE_H / 2 else min(BATTLE_H - 3, soft["y"] + 2)
        return {"act": "move", "tx": max(2, soft["x"] - 1) if d > 6 else soft["x"], "ty": flank_y if d > 4 else soft["y"]}

    if battle["map"]["kind"] == "siege" and squad["side"] == "defender":
        breachers = [f for f in foes if f["x"] >= battle["map"]["wall_x"] - 2]
        if breachers:
            target = breachers[0]
            if abs(target["x"] - squad["x"]) + abs(target["y"] - squad["y"]) <= 1:
                return {"act": "melee", "target": target}
            return {"act": "move", "tx": target["x"], "ty": target["y"]}
        if squad["type"] == "spear" and not squad["braced"]:
            return {"act": "brace"}
        return {"act": "move", "tx": battle["map"]["wall_x"] + 3, "ty": battle["map"]["gate_y"]}

    horse_near = any(f["type"] == "horse" and abs(f["x"] - squad["x"]) + abs(f["y"] - squad["y"]) <= 5 for f in foes)
    if squad["type"] == "spear" and horse_near and dist_nearest > 1:
        return {"act": "brace"}
    if dist_nearest <= 1:
        squad["braced"] = False
        return {"act": "melee", "target": nearest}
    return {"act": "move", "tx": nearest["x"], "ty": nearest["y"]}


def step_battle_tile(
    grid: List[List[str]],
    sx: int,
    sy: int,
    tx: int,
    ty: int,
    occupied_fn: Optional[Callable[[int, int], bool]] = None,
) -> Tuple[int, int]:
    """Single tactical grid step avoiding walls, unbroken gatehouses, and deep water."""
    dirs = sorted(
        ((1, 0), (-1, 0), (0, 1), (0, -1)),
        key=lambda d: abs(tx - (sx + d[0])) + abs(ty - (sy + d[1])),
    )
    for dx, dy in dirs:
        nx, ny = sx + dx, sy + dy
        if not (0 <= nx < BATTLE_W and 0 <= ny < BATTLE_H):
            continue
        ch = grid[ny][nx]
        if ch in ("#", "H", "~"):
            continue
        if occupied_fn and occupied_fn(nx, ny):
            continue
        return (nx, ny)
    return (sx, sy)

