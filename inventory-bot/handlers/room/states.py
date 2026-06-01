"""
Room flow FSM states and shared helpers.
Shared across room handler submodules.
"""

from aiogram import Router
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery
from aiogram.fsm.context import FSMContext

import storage
from keyboards import (
    confirm_kb,
    main_menu_kb,
)
from models.data_models import RoomName, RoomPurpose

router = Router()


class RoomFlow(StatesGroup):
    """FSM states for room data entry."""
    name = State()
    purpose = State()
    wall_direction = State()
    wall_length = State()
    wall_type = State()
    wall_thickness = State()
    wall_custom_thickness = State()
    add_another_wall = State()
    add_openings = State()
    opening_type = State()
    opening_wall_index = State()
    opening_width = State()
    opening_height = State()
    opening_offset = State()
    add_another_opening = State()
    confirm = State()


async def show_room_summary(event, state: FSMContext) -> None:
    """Show room data summary for confirmation.

    Works with both CallbackQuery and Message events.
    """
    room = storage.get_current_room(event.from_user.id)

    if not room:
        await state.clear()
        await event.message.edit_text(
            "Ошибка: помещение не найдено.",
            reply_markup=main_menu_kb(),
        )
        return

    area = room.calculate_area()
    purpose = "жилое" if room.purpose.value == "Locuibila" else "вспомогательное"

    walls_info = "\n".join(
        f"  {i+1}. {w.direction} {w.length:.2f}м "
        f"/ {w.thickness:.0f}мм "
        f"[{'несущ.' if w.wall_type.value == 'portant' else 'перегор.'}]"
        for i, w in enumerate(room.walls)
    )

    openings_info = ""
    if room.openings:
        openings_info = "\nПроёмы:\n" + "\n".join(
            f"  {'Окно' if o.opening_type.value == 'window' else 'Дверь'} "
            f"{o.width:.2f}x{o.height:.2f}м"
            for o in room.openings
        )

    text = (
        f"ПОМЕЩЕНИЕ #{room.number}\n\n"
        f"Название: {room.name.value}\n"
        f"Назначение: {purpose}\n"
        f"Площадь: {area:.1f} кв.м\n\n"
        f"Стены:\n{walls_info}"
        f"{openings_info}\n\n"
        "Сохранить помещение?"
    )

    await state.set_state(RoomFlow.confirm)
    if isinstance(event, CallbackQuery):
        await event.message.edit_text(
            text, reply_markup=confirm_kb("room")
        )
        await event.answer()
    else:
        await event.answer(text, reply_markup=confirm_kb("room"))
