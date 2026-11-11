"""Grid pathfinding (A*) and anti-block BFS verification for tactical TD."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import heapq
from itertools import count
from typing import Callable, Dict, Iterable, List, Optional, Set, Tuple

TilePos = Tuple[int, int]  # (col, row)


@dataclass
class GridGraph:
    """4-way orthogonal grid supporting variable tile traversal costs."""

    width: int
    height: int
    blocked: Set[TilePos] = field(default_factory=set)
    tile_costs: Dict[TilePos, float] = field(default_factory=dict)

    def in_bounds(self, pos: TilePos) -> bool:
        c, r = pos
        return 0 <= c < self.width and 0 <= r < self.height

    def passable(self, pos: TilePos) -> bool:
        return pos not in self.blocked

    def cost(self, _from_pos: TilePos, to_pos: TilePos) -> float:
        return self.tile_costs.get(to_pos, 1.0)

    def neighbors(self, pos: TilePos) -> List[TilePos]:
        c, r = pos
        # Deterministic clockwise-ish order (Right, Down, Left, Up)
        candidates = [(c + 1, r), (c, r + 1), (c - 1, r), (c, r - 1)]
        return [nxt for nxt in candidates if self.in_bounds(nxt) and self.passable(nxt)]


def manhattan(a: TilePos, b: TilePos) -> float:
    """Admissible 4-direction grid heuristic."""
    return float(abs(a[0] - b[0]) + abs(a[1] - b[1]))


def a_star(
    graph: GridGraph,
    start: TilePos,
    goal: TilePos,
    heuristic: Callable[[TilePos, TilePos], float] = manhattan,
) -> Optional[Tuple[Dict[TilePos, Optional[TilePos]], Dict[TilePos, float]]]:
    """Run A* on a GridGraph. Returns (came_from, cost_so_far) or None if unreachable."""
    if not graph.in_bounds(start) or not graph.in_bounds(goal):
        return None
    if not graph.passable(goal):
        return None

    tie = count()
    frontier: List[Tuple[float, int, TilePos]] = []
    heapq.heappush(frontier, (0.0, next(tie), start))

    came_from: Dict[TilePos, Optional[TilePos]] = {start: None}
    cost_so_far: Dict[TilePos, float] = {start: 0.0}

    while frontier:
        _priority, _idx, current = heapq.heappop(frontier)
        if current == goal:
            return came_from, cost_so_far

        for nxt in graph.neighbors(current):
            new_cost = cost_so_far[current] + graph.cost(current, nxt)
            if nxt not in cost_so_far or new_cost < cost_so_far[nxt]:
                cost_so_far[nxt] = new_cost
                priority = new_cost + heuristic(nxt, goal)
                heapq.heappush(frontier, (priority, next(tie), nxt))
                came_from[nxt] = current

    return None


def reconstruct_path(
    came_from: Dict[TilePos, Optional[TilePos]],
    start: TilePos,
    goal: TilePos,
) -> List[TilePos]:
    """Reconstruct inclusive list of tiles [start, ..., goal]."""
    if goal not in came_from:
        return []
    current: Optional[TilePos] = goal
    path: List[TilePos] = []
    while current is not None:
        path.append(current)
        if current == start:
            break
        current = came_from.get(current)
    path.reverse()
    if not path or path[0] != start:
        return []
    return path


def find_path(
    graph: GridGraph,
    start: TilePos,
    goal: TilePos,
) -> List[TilePos]:
    """Convenience helper returning the A* path [start, ..., goal] or []."""
    result = a_star(graph, start, goal)
    if result is None:
        return []
    came_from, _costs = result
    return reconstruct_path(came_from, start, goal)


def bfs_distances_to_goal(
    width: int,
    height: int,
    blocked: Set[TilePos],
    goal: TilePos,
) -> Dict[TilePos, int]:
    """Compute unweighted shortest hop distances from all reachable tiles to goal."""
    if not (0 <= goal[0] < width and 0 <= goal[1] < height) or goal in blocked:
        return {}

    dist: Dict[TilePos, int] = {goal: 0}
    queue: deque[TilePos] = deque([goal])

    while queue:
        c, r = queue.popleft()
        base_d = dist[(c, r)]
        for nc, nr in ((c + 1, r), (c, r + 1), (c - 1, r), (c, r - 1)):
            nxt = (nc, nr)
            if not (0 <= nc < width and 0 <= nr < height):
                continue
            if nxt in blocked or nxt in dist:
                continue
            dist[nxt] = base_d + 1
            queue.append(nxt)
    return dist


def can_place_blocking_structure(
    width: int,
    height: int,
    hard_blocked: Set[TilePos],
    candidate: TilePos,
    spawns: Iterable[TilePos],
    goal: TilePos,
    active_enemy_tiles: Iterable[TilePos] = (),
) -> bool:
    """
    Ensure placing an impassable structure at `candidate` leaves at least one valid
    walkable route from every spawn point and every living ground enemy to `goal`.
    """
    if candidate == goal:
        return False
    spawn_list = list(spawns)
    if candidate in spawn_list:
        return False
    enemy_list = list(active_enemy_tiles)
    if candidate in enemy_list:
        return False

    test_blocked = set(hard_blocked)
    test_blocked.add(candidate)

    dist = bfs_distances_to_goal(width, height, test_blocked, goal)
    if not dist:
        return False

    for sp in spawn_list:
        if sp not in dist:
            return False
    for ep in enemy_list:
        if ep not in dist:
            return False
    return True

