"""
Data models for building measurements.
Represents the structure of a building floor plan with rooms, walls, and openings.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class WallType(str, Enum):
    """Wall type matching CADSoftTools Inventory layers."""
    PORTANT = "portant"       # Load-bearing wall
    DESPARTITOR = "despartitor"  # Partition wall


class OpeningType(str, Enum):
    """Opening type: window or door."""
    WINDOW = "window"
    DOOR = "door"


class RoomPurpose(str, Enum):
    """Room purpose classification per Romanian BTI standards."""
    LOCUIBILA = "Locuibilă"                          # Habitable
    AUXILIARA = "Auxiliară a încăperilor locative"   # Auxiliary


class RoomName(str, Enum):
    """Standard room names per Romanian inventory standards."""
    ANTREU = "Antreu"
    CAZANGERIE = "Cazangerie"
    BUCATARIE = "Bucătărie"
    SUFRAGERIE = "Sufragerie"
    TERASA = "Terasă"
    CORIDOR = "Coridor"
    GARDEROBA = "Garderobă"
    DORMITOR = "Dormitor"
    GRUP_SANITAR = "Grup sanitar"
    CABINET = "Cabinet"
    BALCON = "Balcon"
    DEPOZIT = "Depozit"
    CAMERA_TEHNICA = "Cameră tehnică"
    ALTA = "Altă încăpere"


class WallSegment(BaseModel):
    """A single wall segment with direction, length, and type.

    Direction is the compass direction when walking along the wall
    clockwise around the room perimeter.
    """
    direction: str = Field(
        description="Compass direction: N, S, E, W, NE, NW, SE, SW"
    )
    length: float = Field(
        description="Wall length in meters", gt=0
    )
    thickness: float = Field(
        description="Wall thickness in millimeters", gt=0
    )
    wall_type: WallType = Field(
        description="Load-bearing or partition"
    )


class Opening(BaseModel):
    """A door or window opening in a wall."""
    opening_type: OpeningType
    wall_index: int = Field(
        description="Index of the wall this opening is on (0-based)"
    )
    offset: float = Field(
        description="Distance from wall start to opening edge, in meters",
        gt=0
    )
    width: float = Field(
        description="Opening width in meters", gt=0
    )
    height: float = Field(
        description="Opening height in meters", gt=0
    )


class Room(BaseModel):
    """A room with its walls and openings.

    Walls are listed in clockwise order starting from a corner.
    The room is treated as a polygon formed by the wall segments.
    """
    number: int = Field(description="Room number")
    name: RoomName = Field(description="Room name")
    purpose: RoomPurpose = Field(
        default=RoomPurpose.AUXILIARA,
        description="Room purpose classification"
    )
    interior_height: float = Field(
        default=2.70,
        description="Interior ceiling height in meters"
    )
    walls: list[WallSegment] = Field(
        default_factory=list,
        description="Wall segments in clockwise order"
    )
    openings: list[Opening] = Field(
        default_factory=list,
        description="Doors and windows"
    )

    def calculate_area(self) -> float:
        """Calculate room area in square meters using the Shoelace formula.

        Uses full wall lengths (center-to-center dimensions).
        The result represents the area bounded by wall center lines,
        which is the convention used in Romanian BTI inventory
        (matching CADSoftTools Inventory output).
        """
        if not self.walls:
            return 0.0

        # Direction vectors for compass directions
        dir_vectors = {
            "N":  (0, 1),
            "S":  (0, -1),
            "E":  (1, 0),
            "W":  (-1, 0),
            "NE": (0.7071, 0.7071),
            "NW": (-0.7071, 0.7071),
            "SE": (0.7071, -0.7071),
            "SW": (-0.7071, -0.7071),
        }

        # Build polygon vertices from wall center lines
        points = [(0.0, 0.0)]
        x, y = 0.0, 0.0

        for wall in self.walls:
            dx, dy = dir_vectors.get(wall.direction.upper(), (0, 0))
            x += dx * wall.length
            y += dy * wall.length
            points.append((x, y))

        # Shoelace formula
        n = len(points)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += points[i][0] * points[j][1]
            area -= points[j][0] * points[i][1]
        return abs(area) / 2.0


class FloorType(str, Enum):
    """Floor level type."""
    PARTER = "Parter"
    ETAJ_1 = "Etaj 1"
    ETAJ_2 = "Etaj 2"
    ETAJ_3 = "Etaj 3"
    MANSARDA = "Mansardă"
    SUBSOL = "Subsol"


class Building(BaseModel):
    """Complete building floor plan data."""
    letter: str = Field(
        default="",
        description="Building letter (e.g., 'B')"
    )
    permit_number: str = Field(
        default="",
        description="Construction permit number"
    )
    permit_date: str = Field(
        default="",
        description="Construction permit date"
    )
    floor_type: FloorType = Field(
        default=FloorType.PARTER,
        description="Floor level type"
    )
    floor_number: int = Field(
        default=1,
        description="Floor number for labeling"
    )
    interior_height: float = Field(
        default=2.70,
        description="Interior ceiling height in meters"
    )
    exterior_height: float = Field(
        default=3.00,
        description="Exterior height in meters"
    )
    notes: str = Field(
        default="",
        description="Additional notes"
    )
    rooms: list[Room] = Field(
        default_factory=list,
        description="List of rooms"
    )

    def total_area(self) -> float:
        """Calculate total area of all rooms."""
        return sum(room.calculate_area() for room in self.rooms)

    def habitable_area(self) -> float:
        """Calculate total habitable area."""
        return sum(
            room.calculate_area()
            for room in self.rooms
            if room.purpose == RoomPurpose.LOCUIBILA
        )

    def auxiliary_area(self) -> float:
        """Calculate total auxiliary area."""
        return sum(
            room.calculate_area()
            for room in self.rooms
            if room.purpose == RoomPurpose.AUXILIARA
        )
