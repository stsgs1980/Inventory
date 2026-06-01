"""
DXF drawing functions for wall entities.
Handles load-bearing walls (Portant) and partition walls (Despartitor).
"""

import math

from config import settings
from models.data_models import WallType
from services.dxf.utils import offset_polygon, avg_wall_thickness


def draw_wall(
    msp,
    start: tuple[float, float],
    end: tuple[float, float],
    thickness_mm: float,
    wall_type: WallType,
) -> None:
    """Draw a wall as two parallel lines with end caps.

    Args:
        msp: DXF model space.
        start: Start point (x, y) in mm.
        end: End point (x, y) in mm.
        thickness_mm: Wall thickness in mm.
        wall_type: Load-bearing or partition.
    """
    layer = (settings.LAYER_PORTANT if wall_type == WallType.PORTANT
             else settings.LAYER_DESPARTITOR)

    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.sqrt(dx * dx + dy * dy)

    if length < 0.01:
        return

    nx = -dy / length
    ny = dx / length
    half = thickness_mm / 2.0

    x1s = start[0] + nx * half
    y1s = start[1] + ny * half
    x1e = end[0] + nx * half
    y1e = end[1] + ny * half

    x2s = start[0] - nx * half
    y2s = start[1] - ny * half
    x2e = end[0] - nx * half
    y2e = end[1] - ny * half

    attrs = {"layer": layer}

    msp.add_line((x1s, y1s), (x1e, y1e), dxfattribs=attrs)
    msp.add_line((x2s, y2s), (x2e, y2e), dxfattribs=attrs)
    msp.add_line((x1s, y1s), (x2s, y2s), dxfattribs=attrs)
    msp.add_line((x1e, y1e), (x2e, y2e), dxfattribs=attrs)


def draw_room_outline(
    msp,
    polygon_mm: list[tuple[float, float]],
    room,
) -> None:
    """Draw room outline as a closed LWPOLYLINE on Incaperi layer."""
    if len(polygon_mm) < 3:
        return

    avg_thickness = avg_wall_thickness(room) / 2.0
    inner_points = offset_polygon(polygon_mm, -avg_thickness)

    msp.add_lwpolyline(
        inner_points + [inner_points[0]],
        dxfattribs={"layer": settings.LAYER_INCAPERI},
    )
