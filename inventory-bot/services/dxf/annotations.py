"""
DXF drawing functions for annotations:
dimensions, room labels, openings, level labels, building info.
"""

import math

from config import settings


def draw_dimension(
    msp,
    start: tuple[float, float],
    end: tuple[float, float],
    length_m: float,
) -> None:
    """Draw a dimension line for a wall segment.

    Args:
        msp: DXF model space.
        start: Start point in mm.
        end: End point in mm.
        length_m: Display length in meters.
    """
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    wall_length = math.sqrt(dx * dx + dy * dy)

    if wall_length < 1.0:
        return

    nx = -dy / wall_length
    ny = dx / wall_length
    dim_offset = 800.0

    dim_start = (start[0] + nx * dim_offset, start[1] + ny * dim_offset)
    dim_end = (end[0] + nx * dim_offset, end[1] + ny * dim_offset)

    length_str = f"{length_m:.2f}".replace(".", ",")

    try:
        dim = msp.add_linear_dim(
            p1=dim_start,
            p2=dim_end,
            distance=dim_offset,
            text=length_str,
            dimstyle="INVENTORY",
            override={
                "dimclrd": settings.COLOR_DIMENSIUNI,
                "dimclre": settings.COLOR_DIMENSIUNI,
                "dimclrt": settings.COLOR_DIMENSIUNI,
            },
        )
        dim.render()
    except Exception:
        mid_x = (dim_start[0] + dim_end[0]) / 2
        mid_y = (dim_start[1] + dim_end[1]) / 2
        msp.add_text(
            length_str,
            dxfattribs={
                "layer": settings.LAYER_DIMENSIUNI,
                "height": settings.DIM_TEXT_HEIGHT,
                "insert": (mid_x, mid_y),
            },
        )


def draw_room_label(
    msp,
    polygon_mm: list[tuple[float, float]],
    room,
) -> None:
    """Draw room number and area text on the Incaperi layer."""
    cx = sum(p[0] for p in polygon_mm) / len(polygon_mm)
    cy = sum(p[1] for p in polygon_mm) / len(polygon_mm)

    area = room.calculate_area()

    msp.add_text(
        str(room.number),
        dxfattribs={
            "layer": settings.LAYER_INCAPERI,
            "height": settings.TEXT_HEIGHT,
            "insert": (cx, cy + settings.TEXT_HEIGHT * 1.5),
        },
    )

    msp.add_text(
        f"{area:.1f}",
        dxfattribs={
            "layer": settings.LAYER_INCAPERI,
            "height": settings.TEXT_HEIGHT * 0.8,
            "insert": (cx, cy - settings.TEXT_HEIGHT * 1.5),
        },
    )


def draw_opening(
    msp,
    wall_start: tuple[float, float],
    wall_end: tuple[float, float],
    opening,
    wall,
) -> None:
    """Draw a door or window opening on the Gol layer."""
    dx = wall_end[0] - wall_start[0]
    dy = wall_end[1] - wall_start[1]
    wall_length_mm = math.sqrt(dx * dx + dy * dy)

    if wall_length_mm < 1.0:
        return

    ux = dx / wall_length_mm
    uy = dy / wall_length_mm
    nx = -uy
    ny = ux

    half_thickness = wall.thickness / 2.0
    offset_mm = opening.offset * settings.M_TO_MM
    width_mm = opening.width * settings.M_TO_MM

    op_sx = wall_start[0] + ux * offset_mm
    op_sy = wall_start[1] + uy * offset_mm
    op_ex = wall_start[0] + ux * (offset_mm + width_mm)
    op_ey = wall_start[1] + uy * (offset_mm + width_mm)

    attrs = {"layer": settings.LAYER_GOL}

    if opening.opening_type.value == "door":
        try:
            msp.add_arc(
                center=(op_sx, op_sy),
                radius=width_mm,
                start_angle=0,
                end_angle=90,
                dxfattribs=attrs,
            )
        except Exception:
            pass
        msp.add_line((op_sx, op_sy), (op_ex, op_sy), dxfattribs=attrs)
    else:
        for t in [-half_thickness * 0.3, half_thickness * 0.3]:
            msp.add_line(
                (op_sx + nx * t, op_sy + ny * t),
                (op_ex + nx * t, op_ey + ny * t),
                dxfattribs=attrs,
            )


def draw_level_labels(
    msp,
    building,
    room_positions: list[tuple[float, float]],
) -> None:
    """Draw floor level label text on the Nivel layer."""
    if not room_positions:
        return

    max_y = max(pos[1] for pos in room_positions)
    label_x = room_positions[0][0]
    label_y = max_y + building.interior_height * settings.M_TO_MM + 2000

    floor_label = f"Nivelul:{building.floor_number} {building.floor_type.value}"

    msp.add_text(
        floor_label,
        dxfattribs={
            "layer": settings.LAYER_NIVEL,
            "height": settings.TEXT_HEIGHT * 1.2,
            "insert": (label_x, label_y),
        },
    )


def draw_building_info(
    msp,
    building,
    room_positions: list[tuple[float, float]],
) -> None:
    """Draw building identification and metadata text."""
    if not room_positions:
        return

    max_x = max(pos[0] for pos in room_positions) + settings.M_TO_MM
    max_y = max(pos[1] for pos in room_positions) + settings.M_TO_MM * 3

    info_lines = []

    if building.letter:
        info_lines.append(f"SCHITA CLADIRII LIT. \"{building.letter}\"")

    info_lines.append(
        f"h={building.interior_height:.2f}".replace(".", ",")
    )
    info_lines.append(
        f"H={building.exterior_height:.2f}".replace(".", ",")
    )

    if building.permit_number:
        permit_info = (
            f"În conformitate cu Autorizaţia de construire "
            f"Nr.{building.permit_number}"
        )
        if building.permit_date:
            permit_info += f" din {building.permit_date}"
        info_lines.append(permit_info)

    for i, line in enumerate(info_lines):
        msp.add_text(
            line,
            dxfattribs={
                "layer": settings.LAYER_TEXT,
                "height": settings.TEXT_HEIGHT,
                "insert": (max_x, max_y - i * settings.TEXT_HEIGHT * 2),
            },
        )

    if building.letter:
        msp.add_text(
            f"{building.letter.upper()}-04",
            dxfattribs={
                "layer": settings.LAYER_TEXT,
                "height": settings.TEXT_HEIGHT * 1.5,
                "insert": (max_x, max_y + settings.TEXT_HEIGHT * 2),
            },
        )
