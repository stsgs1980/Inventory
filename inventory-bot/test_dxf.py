"""
Test script for the DXF generator.
Creates a sample building and generates a DXF file without running the bot.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.data_models import (
    Building, Room, WallSegment, WallType, RoomName,
    RoomPurpose, FloorType, Opening, OpeningType,
)
from services.dxf import DXFGenerator


def create_sample_building() -> Building:
    """Create a sample building matching the uploaded DXF data."""
    building = Building(
        letter="B",
        permit_number="1922",
        permit_date="29.01.2025",
        floor_type=FloorType.PARTER,
        floor_number=1,
        interior_height=2.70,
        exterior_height=3.00,
    )

    # Room 1: Antreu (Hallway) -- 6.2 m2
    room1 = Room(
        number=1,
        name=RoomName.ANTREU,
        purpose=RoomPurpose.AUXILIARA,
        walls=[
            WallSegment(direction="N", length=2.55, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="E", length=1.07, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="S", length=2.55, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="W", length=1.07, thickness=400, wall_type=WallType.PORTANT),
        ],
    )
    building.rooms.append(room1)

    # Room 2: Bucatarie (Kitchen) -- 11.5 m2
    room2 = Room(
        number=2,
        name=RoomName.BUCATARIE,
        purpose=RoomPurpose.AUXILIARA,
        walls=[
            WallSegment(direction="N", length=3.16, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="E", length=1.94, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="S", length=2.55, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="W", length=1.82, thickness=400, wall_type=WallType.PORTANT),
        ],
    )
    building.rooms.append(room2)

    # Room 3: Grup sanitar (Bathroom) -- 4.4 m2
    room3 = Room(
        number=3,
        name=RoomName.GRUP_SANITAR,
        purpose=RoomPurpose.AUXILIARA,
        walls=[
            WallSegment(direction="N", length=2.55, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="E", length=1.04, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="S", length=1.84, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="W", length=1.04, thickness=150, wall_type=WallType.DESPARTITOR),
        ],
    )
    building.rooms.append(room3)

    # Room 4: Dormitor (Bedroom) -- 12.6 m2
    room4 = Room(
        number=4,
        name=RoomName.DORMITOR,
        purpose=RoomPurpose.LOCUIBILA,
        interior_height=2.75,
        walls=[
            WallSegment(direction="N", length=3.28, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="E", length=2.72, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="S", length=3.16, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="W", length=2.72, thickness=400, wall_type=WallType.PORTANT),
        ],
        openings=[
            Opening(
                opening_type=OpeningType.WINDOW,
                wall_index=0,
                offset=0.5,
                width=1.20,
                height=1.50,
            ),
        ],
    )
    building.rooms.append(room4)

    # Room 5: Sufragerie (Living room) -- 31.9 m2
    room5 = Room(
        number=5,
        name=RoomName.SUFRAGERIE,
        purpose=RoomPurpose.LOCUIBILA,
        walls=[
            WallSegment(direction="N", length=4.40, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="E", length=4.14, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="S", length=3.28, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="W", length=2.55, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="N", length=2.55, thickness=150, wall_type=WallType.DESPARTITOR),
            WallSegment(direction="E", length=1.69, thickness=150, wall_type=WallType.DESPARTITOR),
        ],
        openings=[
            Opening(
                opening_type=OpeningType.WINDOW,
                wall_index=0,
                offset=0.5,
                width=1.50,
                height=1.50,
            ),
            Opening(
                opening_type=OpeningType.DOOR,
                wall_index=3,
                offset=0.3,
                width=0.90,
                height=2.10,
            ),
        ],
    )
    building.rooms.append(room5)

    # Room 6: Terasa (Terrace) -- 27.8 m2
    room6 = Room(
        number=6,
        name=RoomName.TERASA,
        purpose=RoomPurpose.AUXILIARA,
        interior_height=3.00,
        walls=[
            WallSegment(direction="N", length=4.25, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="E", length=6.53, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="S", length=4.25, thickness=400, wall_type=WallType.PORTANT),
            WallSegment(direction="W", length=6.53, thickness=400, wall_type=WallType.PORTANT),
        ],
        openings=[
            Opening(
                opening_type=OpeningType.DOOR,
                wall_index=2,
                offset=1.0,
                width=0.90,
                height=2.10,
            ),
        ],
    )
    building.rooms.append(room6)

    return building


def main() -> None:
    """Generate a test DXF file."""
    building = create_sample_building()

    # Print summary
    print("=" * 60)
    print("TEST BUILDING DATA")
    print("=" * 60)
    print(f"Letter: {building.letter}")
    print(f"Permit: {building.permit_number} from {building.permit_date}")
    print(f"Floor: {building.floor_type.value}")
    print(f"Interior height: h={building.interior_height:.2f} m")
    print(f"Exterior height: H={building.exterior_height:.2f} m")
    print(f"Rooms: {len(building.rooms)}")
    print()

    for room in building.rooms:
        area = room.calculate_area()
        print(f"  Room #{room.number} {room.name.value}")
        print(f"    Purpose: {room.purpose.value}")
        print(f"    Area: {area:.1f} m2")
        for i, wall in enumerate(room.walls):
            wtype = "PORTANT" if wall.wall_type.value == "portant" else "DESPARTITOR"
            print(f"    Wall {i+1}: {wall.direction} {wall.length:.2f}m / {wall.thickness:.0f}mm [{wtype}]")
        for op in room.openings:
            otype = "Window" if op.opening_type.value == "window" else "Door"
            print(f"    {otype}: {op.width:.2f}x{op.height:.2f}m")
        print()

    total = building.total_area()
    habitable = building.habitable_area()
    auxiliary = building.auxiliary_area()
    print(f"TOTAL AREA: {total:.1f} m2")
    print(f"HABITABLE: {habitable:.1f} m2")
    print(f"AUXILIARY: {auxiliary:.1f} m2")
    print()

    # Generate DXF
    print("Generating DXF...")
    generator = DXFGenerator(building)
    dxf_path = generator.generate()

    print(f"DXF file saved to: {dxf_path}")
    file_size = os.path.getsize(dxf_path)
    print(f"File size: {file_size:,} bytes")

    # Verify the file can be read back
    import ezdxf
    doc = ezdxf.readfile(str(dxf_path))
    msp = doc.modelspace()
    entity_count = sum(1 for _ in msp)
    print(f"Entities in model space: {entity_count}")

    # Check layers
    print("\nLayers in output:")
    for layer in doc.layers:
        print(f"  {layer.dxf.name} (color {layer.dxf.color})")

    print("\nDone!")


if __name__ == "__main__":
    main()
