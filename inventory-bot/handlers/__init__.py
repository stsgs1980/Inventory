"""Bot handlers package."""
from .common import router as common_router
from .building import router as building_router
from .room import router as room_router
from .export import router as export_router

all_routers = [
    common_router,
    building_router,
    room_router,
    export_router,
]
