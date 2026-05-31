"""
DXF generation constants and utility functions.
Shared across all DXF drawing modules.
"""

import math

from config import settings

# Direction vectors for compass directions (normalized)
DIR_VECTORS = {
    "N":  (0.0, 1.0),
    "S":  (0.0, -1.0),
    "E":  (1.0, 0.0),
    "W":  (-1.0, 0.0),
    "NE": (0.7071, 0.7071),
    "NW": (-0.7071, 0.7071),
    "SE": (0.7071, -0.7071),
    "SW": (-0.7071, -0.7071),
}


def m_to_mm(value_m: float) -> float:
    """Convert meters to millimeters."""
    return value_m * settings.M_TO_MM


def build_room_polygon(room) -> list[tuple[float, float]]:
    """Build room polygon vertices from wall segments.

    Returns:
        List of (x, y) coordinates in meters, starting from (0, 0).
    """
    if not room.walls:
        return []

    points = [(0.0, 0.0)]
    x, y = 0.0, 0.0

    for wall in room.walls:
        dx, dy = DIR_VECTORS.get(wall.direction.upper(), (0, 0))
        x += dx * wall.length
        y += dy * wall.length
        points.append((x, y))

    return points


def offset_polygon(
    points: list[tuple[float, float]],
    offset: float,
) -> list[tuple[float, float]]:
    """Offset polygon vertices inward (negative) or outward (positive)."""
    if abs(offset) < 0.01 or len(points) < 3:
        return points

    result = []
    n = len(points)

    for i in range(n):
        prev_pt = points[(i - 1) % n]
        curr_pt = points[i]
        next_pt = points[(i + 1) % n]

        dx1 = curr_pt[0] - prev_pt[0]
        dy1 = curr_pt[1] - prev_pt[1]
        len1 = math.sqrt(dx1 * dx1 + dy1 * dy1)
        if len1 < 0.01:
            n1x, n1y = 0, 0
        else:
            n1x = -dy1 / len1
            n1y = dx1 / len1

        dx2 = next_pt[0] - curr_pt[0]
        dy2 = next_pt[1] - curr_pt[1]
        len2 = math.sqrt(dx2 * dx2 + dy2 * dy2)
        if len2 < 0.01:
            n2x, n2y = 0, 0
        else:
            n2x = -dy2 / len2
            n2y = dx2 / len2

        avg_nx = (n1x + n2x) / 2.0
        avg_ny = (n1y + n2y) / 2.0
        avg_len = math.sqrt(avg_nx * avg_nx + avg_ny * avg_ny)

        if avg_len > 0.001:
            avg_nx /= avg_len
            avg_ny /= avg_len

        result.append((
            curr_pt[0] + avg_nx * offset,
            curr_pt[1] + avg_ny * offset,
        ))

    return result


def avg_wall_thickness(room) -> float:
    """Calculate average wall thickness for a room in mm."""
    if not room.walls:
        return 200.0
    return sum(w.thickness for w in room.walls) / len(room.walls)
