"""Room handlers subpackage."""
from .states import router as states_router
from .walls import router as walls_router
from .openings import router as openings_router

# All room handlers share a single Router instance (defined in states.py)
# walls.py and openings.py register handlers on that same router.
room_router = states_router
