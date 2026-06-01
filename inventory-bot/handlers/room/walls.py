"""
Room name/purpose entry and wall data entry handlers.
"""

from aiogram import F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

import storage
from keyboards import (
    room_name_kb,
    room_purpose_kb,
    wall_direction_kb,
    wall_type_kb,
    wall_thickness_kb,
    add_wall_kb,
    add_opening_kb,
    back_to_menu_kb,
)
from models.data_models import (
    RoomName,
    RoomPurpose,
    WallSegment,
    WallType,
)
from handlers.room.states import router, RoomFlow


# --- Room creation and basic info ---

@router.callback_query(F.data == "add_room")
async def cb_add_room(callback: CallbackQuery, state: FSMContext) -> None:
    """Start room data entry flow."""
    building = storage.get_building(callback.from_user.id)
    if not building.letter:
        await callback.message.edit_text(
            "Сначала введите данные здания (пункт 1 в меню).",
            reply_markup=back_to_menu_kb(),
        )
        await callback.answer()
        return

    room = storage.create_room(callback.from_user.id)

    await state.set_state(RoomFlow.name)
    await callback.message.edit_text(
        f"ПОМЕЩЕНИЕ #{room.number}\n\n"
        "Шаг 1: Название помещения\n"
        "Выберите из списка:",
        reply_markup=room_name_kb(),
    )
    await callback.answer()


@router.callback_query(RoomFlow.name, F.data.startswith("rname_"))
async def cb_room_name(callback: CallbackQuery, state: FSMContext) -> None:
    """Process room name selection."""
    name_value = callback.data.replace("rname_", "")
    room = storage.get_current_room(callback.from_user.id)
    if room:
        room.name = RoomName(name_value)

    await state.set_state(RoomFlow.purpose)
    await callback.message.edit_text(
        f"Помещение: {name_value}\n\n"
        "Шаг 2: Назначение помещения",
        reply_markup=room_purpose_kb(),
    )
    await callback.answer()


@router.callback_query(RoomFlow.purpose, F.data.startswith("rpurpose_"))
async def cb_room_purpose(callback: CallbackQuery, state: FSMContext) -> None:
    """Process room purpose and start wall entry."""
    purpose_value = callback.data.replace("rpurpose_", "")
    room = storage.get_current_room(callback.from_user.id)
    if room:
        room.purpose = RoomPurpose(purpose_value)

    storage.update_state(callback.from_user.id, wall_index=0)

    await state.set_state(RoomFlow.wall_direction)
    await callback.message.edit_text(
        "Стена 1 -- Направление\n\n"
        "Укажите направление стены\n"
        "(при обходе по часовой стрелке):",
        reply_markup=wall_direction_kb(0),
    )
    await callback.answer()


# --- Wall entry flow ---

@router.callback_query(RoomFlow.wall_direction, F.data.startswith("wdir_"))
async def cb_wall_direction(callback: CallbackQuery, state: FSMContext) -> None:
    """Process wall direction selection."""
    parts = callback.data.split("_")
    direction = parts[2]

    ustate = storage.get_state(callback.from_user.id)
    wall_idx = ustate.get("wall_index", 0)
    ustate["current_direction"] = direction
    storage.set_state(callback.from_user.id, ustate)

    await state.set_state(RoomFlow.wall_length)
    await callback.message.edit_text(
        f"Стена {wall_idx + 1}: направление {direction}\n\n"
        "Введите длину стены в метрах (например: 3.16):"
    )
    await callback.answer()


@router.message(RoomFlow.wall_length)
async def process_wall_length(message: Message, state: FSMContext) -> None:
    """Process wall length input."""
    try:
        length = float(message.text.strip().replace(",", "."))
        if length <= 0:
            raise ValueError
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 3.16):")
        return

    ustate = storage.get_state(message.from_user.id)
    ustate["current_length"] = length
    storage.set_state(message.from_user.id, ustate)
    wall_idx = ustate.get("wall_index", 0)

    await state.set_state(RoomFlow.wall_type)
    await message.answer(
        f"Стена {wall_idx + 1}: длина {length:.2f} м\n\n"
        "Тип стены:",
        reply_markup=wall_type_kb(wall_idx),
    )


@router.callback_query(RoomFlow.wall_type, F.data.startswith("wtype_"))
async def cb_wall_type(callback: CallbackQuery, state: FSMContext) -> None:
    """Process wall type selection."""
    wall_type_value = callback.data.split("_")[2]

    ustate = storage.get_state(callback.from_user.id)
    wall_idx = ustate.get("wall_index", 0)
    ustate["current_wall_type"] = wall_type_value
    storage.set_state(callback.from_user.id, ustate)

    await state.set_state(RoomFlow.wall_thickness)
    await callback.message.edit_text(
        f"Стена {wall_idx + 1}: тип "
        f"{'несущая' if wall_type_value == 'portant' else 'перегородка'}\n\n"
        "Толщина стены:",
        reply_markup=wall_thickness_kb(wall_idx),
    )
    await callback.answer()


@router.callback_query(RoomFlow.wall_thickness, F.data.startswith("wthick_"))
async def cb_wall_thickness(callback: CallbackQuery, state: FSMContext) -> None:
    """Process wall thickness selection."""
    thickness_str = callback.data.split("_")[2]

    if thickness_str == "custom":
        await state.set_state(RoomFlow.wall_custom_thickness)
        await callback.message.edit_text("Введите толщину стены в миллиметрах:")
        await callback.answer()
        return

    await _save_wall_and_continue(callback, state, callback.from_user.id, float(thickness_str))


@router.message(RoomFlow.wall_custom_thickness)
async def process_custom_thickness(message: Message, state: FSMContext) -> None:
    """Process custom wall thickness input."""
    try:
        thickness = float(message.text.strip().replace(",", "."))
        if thickness <= 0:
            raise ValueError
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 380):")
        return

    await _save_wall_and_continue(message, state, message.from_user.id, thickness)


async def _save_wall_and_continue(
    event, state: FSMContext, user_id: int, thickness: float
) -> None:
    """Save the current wall and ask whether to add another."""
    ustate = storage.get_state(user_id)
    direction = ustate.get("current_direction", "N")
    length = ustate.get("current_length", 1.0)
    wall_type_value = ustate.get("current_wall_type", "despartitor")

    wall = WallSegment(
        direction=direction,
        length=length,
        thickness=thickness,
        wall_type=WallType(wall_type_value),
    )

    room = storage.get_current_room(user_id)
    if room:
        room.walls.append(wall)

    wall_idx = ustate.get("wall_index", 0) + 1
    ustate["wall_index"] = wall_idx
    storage.set_state(user_id, ustate)

    num_walls = len(room.walls) if room else 0
    text = f"Стена добавлена (всего: {num_walls}).\n\n"

    if num_walls >= 3:
        text += "Добавить ещё стену или завершить помещение?"
        await state.set_state(RoomFlow.add_another_wall)
        if isinstance(event, CallbackQuery):
            await event.message.edit_text(text, reply_markup=add_wall_kb())
            await event.answer()
        else:
            await event.answer(text, reply_markup=add_wall_kb())
    else:
        text += f"Стена {wall_idx + 1} -- Направление:"
        await state.set_state(RoomFlow.wall_direction)
        if isinstance(event, CallbackQuery):
            await event.message.edit_text(text, reply_markup=wall_direction_kb(wall_idx))
            await event.answer()
        else:
            await event.answer(text, reply_markup=wall_direction_kb(wall_idx))


@router.callback_query(RoomFlow.add_another_wall, F.data == "add_wall")
async def cb_add_another_wall(callback: CallbackQuery, state: FSMContext) -> None:
    """Add another wall segment."""
    wall_idx = storage.get_state(callback.from_user.id).get("wall_index", 0)
    await state.set_state(RoomFlow.wall_direction)
    await callback.message.edit_text(
        f"Стена {wall_idx + 1} -- Направление:",
        reply_markup=wall_direction_kb(wall_idx),
    )
    await callback.answer()


@router.callback_query(RoomFlow.add_another_wall, F.data == "finish_room")
async def cb_finish_room(callback: CallbackQuery, state: FSMContext) -> None:
    """Finish room wall entry and move to openings."""
    room = storage.get_current_room(callback.from_user.id)

    if room:
        walls_summary = "\n".join(
            f"  {i+1}. {w.direction} {w.length:.2f}м "
            f"/ {w.thickness:.0f}мм "
            f"[{'несущ.' if w.wall_type.value == 'portant' else 'перегор.'}]"
            for i, w in enumerate(room.walls)
        )
        area = room.calculate_area()
    else:
        walls_summary = "Нет данных"
        area = 0.0

    text = (
        f"Стены помещения:\n{walls_summary}\n\n"
        f"Расчётная площадь: {area:.1f} кв.м\n\n"
        "Добавить проёмы (окна/двери)?"
    )
    await state.set_state(RoomFlow.add_openings)
    await callback.message.edit_text(text, reply_markup=add_opening_kb())
    await callback.answer()
