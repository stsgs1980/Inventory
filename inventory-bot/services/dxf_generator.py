"""
DXF generator service.
Creates DXF files compatible with CADSoftTools Inventory format,
using the same layer structure, entity types, and conventions.
"""

import math
from pathlib import Path

import ezdxf
from ezdxf.enums import TextEntityAlignment
from ezdxf.math import Vec2

from config import settings
from models.data_models import Building, Room, WallType, RoomPurpose


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


class DXFGenerator:
    """Generates DXF files from Building data models."""

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
                "dimlfac": 0.001,  # Display in meters (drawing in mm)
                "dimtad": 1,
                "dimclrd": 0,
                "dimclre": 0,
                "dimclrt": 0,
                "dimpost": "",
                "dimsah": 0,
                "dimblk1": "",
                "dimblk2": "",
            })

    def _m(self, value_m: float) -> float:
        """Convert meters to millimeters."""
        return value_m * settings.M_TO_MM

    def generate(self) -> Path:
        """Generate the complete DXF file and return its path.

        Returns:
            Path to the generated DXF file.
        """
        # Calculate room positions (layout algorithm)
        room_positions = self._layout_rooms()

        # Draw each room
        for idx, room in enumerate(self.building.rooms):
            origin_x, origin_y = room_positions[idx]
            self._draw_room(room, origin_x, origin_y)

        # Draw level labels
        self._draw_level_labels(room_positions)

        # Draw building info text
        self._draw_building_info(room_positions)

        # Save file
        output_path = Path(settings.OUTPUT_DIR) / f"building_{self.building.letter or 'X'}.dxf"
        self.doc.saveas(str(output_path))
        return output_path

    def _layout_rooms(self) -> list[tuple[float, float]]:
        """Calculate placement positions for all rooms.

        Rooms are placed in a row from left to right with spacing.
        Each room's width is estimated from its wall segments.

        Returns:
            List of (x, y) origin coordinates for each room.
        """
        positions = []
        current_x = 0.0
        spacing = self._m(0.5)  # 0.5m gap between rooms

        for room in self.building.rooms:
            # Estimate room width and height from walls
            width, height = self._estimate_room_dimensions(room)

            positions.append((current_x, 0.0))
            current_x += width + spacing

        return positions

    def _estimate_room_dimensions(self, room: Room) -> tuple[float, float]:
        """Estimate room bounding box dimensions from wall segments.

        Returns:
            (width_mm, height_mm) in millimeters.
        """
        # Build the room polygon from walls
        points = self._build_room_polygon(room)

        if not points:
            return (self._m(3.0), self._m(3.0))

        min_x = min(p[0] for p in points)
        max_x = max(p[0] for p in points)
        min_y = min(p[1] for p in points)
        max_y = max(p[1] for p in points)

        width = (max_x - min_x) * settings.M_TO_MM
        height = (max_y - min_y) * settings.M_TO_MM

        return (max(width, self._m(1.0)), max(height, self._m(1.0)))

    def _build_room_polygon(self, room: Room) -> list[tuple[float, float]]:
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
            length = wall.length
            x += dx * length
            y += dy * length
            points.append((x, y))

        return points

    def _draw_room(self, room: Room, origin_x: float, origin_y: float) -> None:
        """Draw a complete room: walls, outline, labels, dimensions.

        Args:
            room: Room data model.
            origin_x: X coordinate of room origin in mm.
            origin_y: Y coordinate of room origin in mm.
        """
        # Build polygon points
        polygon = self._build_room_polygon(room)
        if not polygon:
            return

        # Convert to mm and offset by origin
        polygon_mm = [
            (origin_x + p[0] * settings.M_TO_MM,
             origin_y + p[1] * settings.M_TO_MM)
            for p in polygon
        ]

        # Draw walls (pairs of parallel lines for each wall segment)
        for i, wall in enumerate(room.walls):
            start = polygon_mm[i]
            end = polygon_mm[i + 1] if i + 1 < len(polygon_mm) else polygon_mm[0]
            self._draw_wall(start, end, wall.thickness, wall.wall_type)

        # Draw room outline on Incaperi layer
        self._draw_room_outline(polygon_mm, room)

        # Draw room label (number and area)
        self._draw_room_label(polygon_mm, room)

        # Draw dimensions for each wall
        for i, wall in enumerate(room.walls):
            start = polygon_mm[i]
            end = polygon_mm[i + 1] if i + 1 < len(polygon_mm) else polygon_mm[0]
            self._draw_dimension(start, end, wall.length)

        # Draw openings
        for opening in room.openings:
            if opening.wall_index < len(room.walls):
                start = polygon_mm[opening.wall_index]
                end = (polygon_mm[opening.wall_index + 1]
                       if opening.wall_index + 1 < len(polygon_mm)
                       else polygon_mm[0])
                self._draw_opening(start, end, opening, room.walls[opening.wall_index])

    def _draw_wall(
        self,
        start: tuple[float, float],
        end: tuple[float, float],
        thickness_mm: float,
        wall_type: WallType,
    ) -> None:
        """Draw a wall as two parallel lines with the given thickness.

        Args:
            start: Start point (x, y) in mm.
            end: End point (x, y) in mm.
            thickness_mm: Wall thickness in mm.
            wall_type: Load-bearing or partition.
        """
        layer = (settings.LAYER_PORTANT if wall_type == WallType.PORTANT
                 else settings.LAYER_DESPARTITOR)

        # Calculate perpendicular offset
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        length = math.sqrt(dx * dx + dy * dy)

        if length < 0.01:
            return

        # Normal vector (perpendicular to wall direction)
        nx = -dy / length
        ny = dx / length

        half_thickness = thickness_mm / 2.0

        # Line 1 (one side of the wall)
        x1s = start[0] + nx * half_thickness
        y1s = start[1] + ny * half_thickness
        x1e = end[0] + nx * half_thickness
        y1e = end[1] + ny * half_thickness

        # Line 2 (other side of the wall)
        x2s = start[0] - nx * half_thickness
        y2s = start[1] - ny * half_thickness
        x2e = end[0] - nx * half_thickness
        y2e = end[1] - ny * half_thickness

        dxfattribs = {"layer": layer}

        self.msp.add_line(
            (x1s, y1s), (x1e, y1e), dxfattribs=dxfattribs
        )
        self.msp.add_line(
            (x2s, y2s), (x2e, y2e), dxfattribs=dxfattribs
        )

        # End caps (short lines connecting the two parallel lines)
        self.msp.add_line(
            (x1s, y1s), (x2s, y2s), dxfattribs=dxfattribs
        )
        self.msp.add_line(
            (x1e, y1e), (x2e, y2e), dxfattribs=dxfattribs
        )

    def _draw_room_outline(
        self,
        polygon_mm: list[tuple[float, float]],
        room: Room,
    ) -> None:
        """Draw the room outline as a closed LWPOLYLINE on Incaperi layer.

        The outline follows the inner edge of the walls (room interior).
        """
        if len(polygon_mm) < 3:
            return

        # Offset polygon inward by average wall thickness / 2
        avg_thickness = self._avg_wall_thickness(room) / 2.0

        inner_points = self._offset_polygon(polygon_mm, -avg_thickness)

        dxfattribs = {
            "layer": settings.LAYER_INCAPERI,
        }

        self.msp.add_lwpolyline(
            inner_points + [inner_points[0]],  # Close the polygon
            dxfattribs=dxfattribs,
        )

    def _offset_polygon(
        self,
        points: list[tuple[float, float]],
        offset: float,
    ) -> list[tuple[float, float]]:
        """Offset polygon vertices inward (negative) or outward (positive).

        Simple approach: move each vertex along the inward normal.
        """
        if abs(offset) < 0.01 or len(points) < 3:
            return points

        result = []
        n = len(points)

        for i in range(n):
            prev_pt = points[(i - 1) % n]
            curr_pt = points[i]
            next_pt = points[(i + 1) % n]

            # Normal from previous edge
            dx1 = curr_pt[0] - prev_pt[0]
            dy1 = curr_pt[1] - prev_pt[1]
            len1 = math.sqrt(dx1 * dx1 + dy1 * dy1)
            if len1 < 0.01:
                n1x, n1y = 0, 0
            else:
                n1x = -dy1 / len1
                n1y = dx1 / len1

            # Normal from next edge
            dx2 = next_pt[0] - curr_pt[0]
            dy2 = next_pt[1] - curr_pt[1]
            len2 = math.sqrt(dx2 * dx2 + dy2 * dy2)
            if len2 < 0.01:
                n2x, n2y = 0, 0
            else:
                n2x = -dy2 / len2
                n2y = dx2 / len2

            # Average normal
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

    def _avg_wall_thickness(self, room: Room) -> float:
        """Calculate average wall thickness for a room in mm."""
        if not room.walls:
            return 200.0
        return sum(w.thickness for w in room.walls) / len(room.walls)

    def _draw_room_label(
        self,
        polygon_mm: list[tuple[float, float]],
        room: Room,
    ) -> None:
        """Draw room number and area text on the Incaperi layer.

        Places the number above center and area below center of the room.
        """
        # Calculate room center
        cx = sum(p[0] for p in polygon_mm) / len(polygon_mm)
        cy = sum(p[1] for p in polygon_mm) / len(polygon_mm)

        area = room.calculate_area()

        # Room number (above center)
        self.msp.add_text(
            str(room.number),
            dxfattribs={
                "layer": settings.LAYER_INCAPERI,
                "height": settings.TEXT_HEIGHT,
                "insert": (cx, cy + settings.TEXT_HEIGHT * 1.5),
            },
        )

        # Room area in m^2 (below center)
        area_str = f"{area:.1f}"
        self.msp.add_text(
            area_str,
            dxfattribs={
                "layer": settings.LAYER_INCAPERI,
                "height": settings.TEXT_HEIGHT * 0.8,
                "insert": (cx, cy - settings.TEXT_HEIGHT * 1.5),
            },
        )

    def _draw_dimension(
        self,
        start: tuple[float, float],
        end: tuple[float, float],
        length_m: float,
    ) -> None:
        """Draw a dimension line for a wall segment.

        Args:
            start: Start point in mm.
            end: End point in mm.
            length_m: Display length in meters.
        """
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        wall_length = math.sqrt(dx * dx + dy * dy)

        if wall_length < 1.0:
            return

        # Normal vector for dimension offset
        nx = -dy / wall_length
        ny = dx / wall_length

        # Offset dimension line outward
        dim_offset = 800.0  # mm offset from wall

        dim_start = (start[0] + nx * dim_offset, start[1] + ny * dim_offset)
        dim_end = (end[0] + nx * dim_offset, end[1] + ny * dim_offset)

        # Format length with comma as decimal separator (Romanian convention)
        length_str = f"{length_m:.2f}".replace(".", ",")

        try:
            dim = self.msp.add_linear_dim(
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
            # Fallback: simple text label if dimension rendering fails
            mid_x = (dim_start[0] + dim_end[0]) / 2
            mid_y = (dim_start[1] + dim_end[1]) / 2
            self.msp.add_text(
                length_str,
                dxfattribs={
                    "layer": settings.LAYER_DIMENSIUNI,
                    "height": settings.DIM_TEXT_HEIGHT,
                    "insert": (mid_x, mid_y),
                },
            )

    def _draw_opening(
        self,
        wall_start: tuple[float, float],
        wall_end: tuple[float, float],
        opening,
        wall,
    ) -> None:
        """Draw a door or window opening on the Gol layer.

        Draws a gap in the wall with an arc (door) or parallel lines (window).
        """
        dx = wall_end[0] - wall_start[0]
        dy = wall_end[1] - wall_start[1]
        wall_length_mm = math.sqrt(dx * dx + dy * dy)

        if wall_length_mm < 1.0:
            return

        # Direction unit vector along the wall
        ux = dx / wall_length_mm
        uy = dy / wall_length_mm

        # Normal unit vector
        nx = -uy
        ny = ux

        half_thickness = wall.thickness / 2.0
        offset_mm = opening.offset * settings.M_TO_MM
        width_mm = opening.width * settings.M_TO_MM

        # Opening start and end points along the wall
        op_start_x = wall_start[0] + ux * offset_mm
        op_start_y = wall_start[1] + uy * offset_mm
        op_end_x = wall_start[0] + ux * (offset_mm + width_mm)
        op_end_y = wall_start[1] + uy * (offset_mm + width_mm)

        dxfattribs = {"layer": settings.LAYER_GOL}

        if opening.opening_type.value == "door":
            # Draw door as an arc
            try:
                self.msp.add_arc(
                    center=(op_start_x, op_start_y),
                    radius=width_mm,
                    start_angle=0,
                    end_angle=90,
                    dxfattribs=dxfattribs,
                )
            except Exception:
                pass

            # Door swing line
            self.msp.add_line(
                (op_start_x, op_start_y),
                (op_end_x, op_start_y),
                dxfattribs=dxfattribs,
            )

        else:
            # Draw window as parallel lines inside the wall
            for t in [-half_thickness * 0.3, half_thickness * 0.3]:
                self.msp.add_line(
                    (op_start_x + nx * t, op_start_y + ny * t),
                    (op_end_x + nx * t, op_end_y + ny * t),
                    dxfattribs=dxfattribs,
                )

    def _draw_level_labels(
        self,
        room_positions: list[tuple[float, float]],
    ) -> None:
        """Draw floor level label text on the Nivel layer."""
        if not room_positions:
            return

        # Find the topmost point of the drawing
        max_y = max(pos[1] for pos in room_positions)

        label_x = room_positions[0][0]
        label_y = max_y + self._m(2.0)

        floor_label = f"Nivelul:{self.building.floor_number} {self.building.floor_type.value}"

        self.msp.add_text(
            floor_label,
            dxfattribs={
                "layer": settings.LAYER_NIVEL,
                "height": settings.TEXT_HEIGHT * 1.2,
                "insert": (label_x, label_y),
            },
        )

    def _draw_building_info(
        self,
        room_positions: list[tuple[float, float]],
    ) -> None:
        """Draw building identification and metadata text."""
        if not room_positions:
            return

        # Top-right area for building info
        max_x = max(pos[0] for pos in room_positions) + self._m(1.0)
        max_y = max(pos[1] for pos in room_positions) + self._m(3.0)

        info_lines = []

        if self.building.letter:
            info_lines.append(f"SCHITA CLADIRII LIT. \"{self.building.letter}\"")

        info_lines.append(
            f"h={self.building.interior_height:.2f}".replace(".", ",")
        )
        info_lines.append(
            f"H={self.building.exterior_height:.2f}".replace(".", ",")
        )

        if self.building.permit_number:
            permit_info = (
                f"În conformitate cu Autorizaţia de construire "
                f"Nr.{self.building.permit_number}"
            )
            if self.building.permit_date:
                permit_info += f" din {self.building.permit_date}"
            info_lines.append(permit_info)

        for i, line in enumerate(info_lines):
            self.msp.add_text(
                line,
                dxfattribs={
                    "layer": settings.LAYER_TEXT,
                    "height": settings.TEXT_HEIGHT,
                    "insert": (max_x, max_y - i * settings.TEXT_HEIGHT * 2),
                },
            )

        # Mark for the building
        if self.building.letter:
            mark = f"{self.building.letter.upper()}-04"
            self.msp.add_text(
                mark,
                dxfattribs={
                    "layer": settings.LAYER_TEXT,
                    "height": settings.TEXT_HEIGHT * 1.5,
                    "insert": (max_x, max_y + settings.TEXT_HEIGHT * 2),
                },
            )
