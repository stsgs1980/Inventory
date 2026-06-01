"""
DXF generator -- main orchestrator.
Creates DXF files compatible with CADSoftTools Inventory format.
"""

from pathlib import Path

import ezdxf

from config import settings
from models.data_models import Building, Room
from services.dxf.utils import m_to_mm, build_room_polygon
from services.dxf.walls import draw_wall, draw_room_outline
from services.dxf.annotations import (
    draw_dimension,
    draw_room_label,
    draw_opening,
    draw_level_labels,
    draw_building_info,
)


class DXFGenerator:
    """Generates DXF files from Building data models.

    Orchestrates the drawing process: sets up the document,
    places rooms, and delegates drawing to specialized modules.
    """

    def __init__(self, building: Building):
        self.building = building
        self.doc = ezdxf.new(settings.DXF_VERSION)
        self.msp = self.doc.modelspace()
        self._setup_layers()
        self._setup_dimstyle()

    def _setup_layers(self) -> None:
        """Create layers matching CADSoftTools Inventory convention."""
        layer_defs = [
            (settings.LAYER_PORTANT, settings.COLOR_PORTANT),
            (settings.LAYER_DESPARTITOR, settings.COLOR_DESPARTITOR),
            (settings.LAYER_INCAPERI, settings.COLOR_INCAPERI),
            (settings.LAYER_INCIZOLATE, settings.COLOR_INCIZOLATE),
            (settings.LAYER_NIVEL, settings.COLOR_NIVEL),
            (settings.LAYER_GOL, settings.COLOR_GOL),
            (settings.LAYER_DIMENSIUNI, settings.COLOR_DIMENSIUNI),
            (settings.LAYER_TEXT, settings.COLOR_TEXT),
            (settings.LAYER_ALTE, settings.COLOR_ALTE),
            (settings.LAYER_GREVARI, 2),
        ]
        for name, color in layer_defs:
            self.doc.layers.add(name, color=color)

    def _setup_dimstyle(self) -> None:
        """Set up dimension style matching Inventory defaults."""
        if "INVENTORY" not in self.doc.dimstyles:
            self.doc.dimstyles.add("INVENTORY", dxfattribs={
                "dimtxsty": "STANDARD",
                "dimtxt": settings.DIM_TEXT_HEIGHT,
                "dimasz": 250,
                "dimexe": 250,
                "dimexo": 80,
                "dimgap": 80,
                "dimdec": 2,
                "dimlfac": 0.001,
                "dimtad": 1,
                "dimclrd": 0,
                "dimclre": 0,
                "dimclrt": 0,
                "dimpost": "",
                "dimsah": 0,
                "dimblk1": "",
                "dimblk2": "",
            })

    def generate(self) -> Path:
        """Generate the complete DXF file and return its path."""
        room_positions = self._layout_rooms()

        for idx, room in enumerate(self.building.rooms):
            origin_x, origin_y = room_positions[idx]
            self._draw_room(room, origin_x, origin_y)

        draw_level_labels(self.msp, self.building, room_positions)
        draw_building_info(self.msp, self.building, room_positions)

        output_path = Path(settings.OUTPUT_DIR) / f"building_{self.building.letter or 'X'}.dxf"
        self.doc.saveas(str(output_path))
        return output_path

    def _layout_rooms(self) -> list[tuple[float, float]]:
        """Calculate placement positions for all rooms (left to right)."""
        positions = []
        current_x = 0.0
        spacing = m_to_mm(0.5)

        for room in self.building.rooms:
            width, _ = self._estimate_room_dimensions(room)
            positions.append((current_x, 0.0))
            current_x += width + spacing

        return positions

    def _estimate_room_dimensions(self, room: Room) -> tuple[float, float]:
        """Estimate room bounding box from walls. Returns (w_mm, h_mm)."""
        points = build_room_polygon(room)

        if not points:
            return (m_to_mm(3.0), m_to_mm(3.0))

        min_x = min(p[0] for p in points)
        max_x = max(p[0] for p in points)
        min_y = min(p[1] for p in points)
        max_y = max(p[1] for p in points)

        width = (max_x - min_x) * settings.M_TO_MM
        height = (max_y - min_y) * settings.M_TO_MM

        return (max(width, m_to_mm(1.0)), max(height, m_to_mm(1.0)))

    def _draw_room(self, room: Room, origin_x: float, origin_y: float) -> None:
        """Draw a complete room: walls, outline, labels, dimensions."""
        polygon = build_room_polygon(room)
        if not polygon:
            return

        polygon_mm = [
            (origin_x + p[0] * settings.M_TO_MM,
             origin_y + p[1] * settings.M_TO_MM)
            for p in polygon
        ]

        for i, wall in enumerate(room.walls):
            start = polygon_mm[i]
            end = polygon_mm[i + 1] if i + 1 < len(polygon_mm) else polygon_mm[0]
            draw_wall(self.msp, start, end, wall.thickness, wall.wall_type)

        draw_room_outline(self.msp, polygon_mm, room)
        draw_room_label(self.msp, polygon_mm, room)

        for i, wall in enumerate(room.walls):
            start = polygon_mm[i]
            end = polygon_mm[i + 1] if i + 1 < len(polygon_mm) else polygon_mm[0]
            draw_dimension(self.msp, start, end, wall.length)

        for opening in room.openings:
            if opening.wall_index < len(room.walls):
                start = polygon_mm[opening.wall_index]
                end = (polygon_mm[opening.wall_index + 1]
                       if opening.wall_index + 1 < len(polygon_mm)
                       else polygon_mm[0])
                draw_opening(self.msp, start, end, opening, room.walls[opening.wall_index])
