"""
Session storage for user data during the measurement workflow.
Stores building data per user while they go through the multi-step input process.
"""

from typing import Optional

from models.data_models import Building, Room, WallSegment, WallType


# In-memory storage: user_id -> building data
# For production, replace with Redis or a database
_buildings: dict[int, Building] = {}

# Current editing state per user
_user_state: dict[int, dict] = {}


def get_building(user_id: int) -> Building:
    """Get or create building data for a user."""
    if user_id not in _buildings:
        _buildings[user_id] = Building()
    return _buildings[user_id]


def save_building(user_id: int, building: Building) -> None:
    """Save building data for a user."""
    _buildings[user_id] = building


def clear_building(user_id: int) -> None:
    """Clear building data for a user."""
    _buildings.pop(user_id, None)
    _user_state.pop(user_id, None)


def get_state(user_id: int) -> dict:
    """Get the current editing state for a user."""
    if user_id not in _user_state:
        _user_state[user_id] = {}
    return _user_state[user_id]


def set_state(user_id: int, state: dict) -> None:
    """Set the editing state for a user."""
    _user_state[user_id] = state


def update_state(user_id: int, **kwargs) -> dict:
    """Update specific fields in the user's editing state."""
    state = get_state(user_id)
    state.update(kwargs)
    _user_state[user_id] = state
    return state


def clear_state(user_id: int) -> None:
    """Clear the editing state for a user."""
    _user_state.pop(user_id, None)


# Current room being edited
def get_current_room(user_id: int) -> Optional[Room]:
    """Get the room currently being edited by the user."""
    state = get_state(user_id)
    room_idx = state.get("current_room_index")
    if room_idx is None:
        return None
    building = get_building(user_id)
    if room_idx >= len(building.rooms):
        return None
    return building.rooms[room_idx]


def create_room(user_id: int) -> Room:
    """Create a new room in the building and set it as current."""
    building = get_building(user_id)
    room_number = len(building.rooms) + 1
    room = Room(number=room_number)
    building.rooms.append(room)
    update_state(user_id, current_room_index=len(building.rooms) - 1)
    return room
