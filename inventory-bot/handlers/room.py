"""
Room data entry handlers.
Guides the user through entering room information:
name, purpose, wall segments, and openings.
"""

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

import storage
from keyboards import (
    room_name_kb,
    room_purpose_kb,
    wall_direction_kb,
    wall_type_kb,
    wall_thickness_kb,
    add_wall_kb,
    add_opening_kb,
    confirm_kb,
    main_menu_kb,
    back_to_menu_kb,
)
from models.data_models import (
    Room,
    RoomName,
    RoomPurpose,
    WallSegment,
    WallType,
    Opening,
    OpeningType,
)

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

    # Create a new room in storage
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
    """Process room purpose selection and start wall entry."""
    purpose_value = callback.data.replace("rpurpose_", "")
    room = storage.get_current_room(callback.from_user.id)
    if room:
        room.purpose = RoomPurpose(purpose_value)

    storage.update_state(
        callback.from_user.id,
        wall_index=0,
    )

    await state.set_state(RoomFlow.wall_direction)
    await callback.message.edit_text(
        f"Стена 1 -- Направление\n\n"
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
    # wdir_{index}_{direction}
    direction = parts[2]

    ustate = storage.get_state(callback.from_user.id)
    wall_idx = ustate.get("wall_index", 0)
    ustate["current_direction"] = direction
    storage.set_state(callback.from_user.id, ustate)

    await state.set_state(RoomFlow.wall_length)
    await callback.message.edit_text(
        f"Стена {wall_idx + 1}: направление {direction}\n\n"
        "Введите длину стены в метрах\n"
        "(например: 3.16):"
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
        await message.answer("Неверный формат. Введите положительное число (например: 3.16):")
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
    parts = callback.data.split("_")
    # wtype_{index}_{type}
    wall_type_value = parts[2]

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
    parts = callback.data.split("_")
    # wthick_{index}_{value}
    thickness_str = parts[2]

    if thickness_str == "custom":
        await state.set_state(RoomFlow.wall_custom_thickness)
        await callback.message.edit_text(
            "Введите толщину стены в миллиметрах:"
        )
        await callback.answer()
        return

    thickness = float(thickness_str)
    await _save_wall_and_continue(
        callback, state, callback.from_user.id, thickness
    )


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

    await _save_wall_and_continue(
        message, state, message.from_user.id, thickness
    )


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

    # Count walls so far
    num_walls = len(room.walls) if room else 0

    text = (
        f"Стена добавлена (всего: {num_walls}).\n\n"
    )

    # If we have at least 3 walls, allow finishing the room
    if num_walls >= 3:
        text += "Добавить ещё стену или завершить помещение?"
        await state.set_state(RoomFlow.add_another_wall)
        if isinstance(event, CallbackQuery):
            await event.message.edit_text(text, reply_markup=add_wall_kb())
            await event.answer()
        else:
            await event.answer(text, reply_markup=add_wall_kb())
    else:
        # Must add more walls
        text += f"Стена {wall_idx + 1} -- Направление:"
        await state.set_state(RoomFlow.wall_direction)
        if isinstance(event, CallbackQuery):
            await event.message.edit_text(
                text, reply_markup=wall_direction_kb(wall_idx)
            )
            await event.answer()
        else:
            await event.answer(
                text, reply_markup=wall_direction_kb(wall_idx)
            )


@router.callback_query(RoomFlow.add_another_wall, F.data == "add_wall")
async def cb_add_another_wall(callback: CallbackQuery, state: FSMContext) -> None:
    """Add another wall segment."""
    ustate = storage.get_state(callback.from_user.id)
    wall_idx = ustate.get("wall_index", 0)

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
        "Добавить проёмы (окна/двери)?",
    )
    await state.set_state(RoomFlow.add_openings)
    await callback.message.edit_text(text, reply_markup=add_opening_kb())
    await callback.answer()


# --- Opening entry flow ---

@router.callback_query(RoomFlow.add_openings, F.data == "add_window")
async def cb_add_window(callback: CallbackQuery, state: FSMContext) -> None:
    """Start adding a window opening."""
    storage.update_state(
        callback.from_user.id,
        opening_type="window",
    )
    room = storage.get_current_room(callback.from_user.id)

    if not room or not room.walls:
        await callback.message.edit_text(
            "Нет стен для добавления проёма.",
            reply_markup=back_to_menu_kb(),
        )
        await callback.answer()
        return

    walls_list = "\n".join(
        f"  {i+1}. {w.direction} {w.length:.2f}м"
        for i, w in enumerate(room.walls)
    )

    await state.set_state(RoomFlow.opening_offset)
    await callback.message.edit_text(
        f"ОКНО\n\n"
        f"Стены:\n{walls_list}\n\n"
        "Введите расстояние от начала стены до окна (м):"
    )
    await callback.answer()


@router.callback_query(RoomFlow.add_openings, F.data == "add_door")
async def cb_add_door(callback: CallbackQuery, state: FSMContext) -> None:
    """Start adding a door opening."""
    storage.update_state(
        callback.from_user.id,
        opening_type="door",
    )
    room = storage.get_current_room(callback.from_user.id)

    if not room or not room.walls:
        await callback.message.edit_text(
            "Нет стен для добавления проёма.",
            reply_markup=back_to_menu_kb(),
        )
        await callback.answer()
        return

    walls_list = "\n".join(
        f"  {i+1}. {w.direction} {w.length:.2f}м"
        for i, w in enumerate(room.walls)
    )

    await state.set_state(RoomFlow.opening_offset)
    await callback.message.edit_text(
        f"ДВЕРЬ\n\n"
        f"Стены:\n{walls_list}\n\n"
        "Введите расстояние от начала стены до двери (м):"
    )
    await callback.answer()


@router.message(RoomFlow.opening_offset)
async def process_opening_offset(message: Message, state: FSMContext) -> None:
    """Process opening offset from wall start."""
    try:
        offset = float(message.text.strip().replace(",", "."))
        if offset < 0:
            raise ValueError
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 0.5):")
        return

    storage.update_state(message.from_user.id, opening_offset=offset)

    await state.set_state(RoomFlow.opening_width)
    await message.answer("Введите ширину проёма (м):")


@router.message(RoomFlow.opening_width)
async def process_opening_width(message: Message, state: FSMContext) -> None:
    """Process opening width."""
    try:
        width = float(message.text.strip().replace(",", "."))
        if width <= 0:
            raise ValueError
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 1.2):")
        return

    storage.update_state(message.from_user.id, opening_width=width)

    await state.set_state(RoomFlow.opening_height)
    await message.answer("Введите высоту проёма (м):")


@router.message(RoomFlow.opening_height)
async def process_opening_height(message: Message, state: FSMContext) -> None:
    """Process opening height and ask for wall index."""
    try:
        height = float(message.text.strip().replace(",", "."))
        if height <= 0:
            raise ValueError
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 2.1):")
        return

    ustate = storage.get_state(message.from_user.id)
    opening_type_str = ustate.get("opening_type", "window")
    offset = ustate.get("opening_offset", 0.0)
    width = ustate.get("opening_width", 1.0)

    room = storage.get_current_room(message.from_user.id)

    # Determine wall index -- default to first wall (0)
    # For simplicity, place opening on the first wall
    # In future: ask user which wall
    wall_index = 0

    opening = Opening(
        opening_type=OpeningType(opening_type_str),
        wall_index=wall_index,
        offset=offset,
        width=width,
        height=height,
    )

    if room:
        room.openings.append(opening)

    otype = "Окно" if opening_type_str == "window" else "Дверь"
    text = (
        f"Проём добавлен: {otype} {width:.2f}x{height:.2f}м\n"
        f"Отступ: {offset:.2f}м от начала стены {wall_index + 1}\n\n"
        "Добавить ещё проём?"
    )

    await state.set_state(RoomFlow.add_another_opening)
    await message.answer(
        text,
        reply_markup=add_opening_kb(),
    )


@router.callback_query(RoomFlow.add_openings, F.data == "skip_openings")
@router.callback_query(RoomFlow.add_another_opening, F.data == "skip_openings")
async def cb_skip_openings(callback: CallbackQuery, state: FSMContext) -> None:
    """Skip openings and show room summary."""
    await _show_room_summary(callback, state)


@router.callback_query(
    RoomFlow.add_another_opening, F.data == "add_window"
)
async def cb_add_another_window(callback: CallbackQuery, state: FSMContext) -> None:
    """Add another window."""
    storage.update_state(callback.from_user.id, opening_type="window")
    await state.set_state(RoomFlow.opening_offset)
    await callback.message.edit_text(
        "ОКНО\n\n"
        "Введите расстояние от начала стены до окна (м):"
    )
    await callback.answer()


@router.callback_query(
    RoomFlow.add_another_opening, F.data == "add_door"
)
async def cb_add_another_door(callback: CallbackQuery, state: FSMContext) -> None:
    """Add another door."""
    storage.update_state(callback.from_user.id, opening_type="door")
    await state.set_state(RoomFlow.opening_offset)
    await callback.message.edit_text(
        "ДВЕРЬ\n\n"
        "Введите расстояние от начала стены до двери (м):"
    )
    await callback.answer()


async def _show_room_summary(event, state: FSMContext) -> None:
    """Show room data summary for confirmation."""
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


@router.callback_query(RoomFlow.confirm, F.data == "room_yes")
async def cb_confirm_room(callback: CallbackQuery, state: FSMContext) -> None:
    """Confirm room and return to main menu."""
    storage.clear_state(callback.from_user.id)
    await state.clear()

    building = storage.get_building(callback.from_user.id)
    room_count = len(building.rooms)

    await callback.message.edit_text(
        f"Помещение сохранено (всего: {room_count}).\n\n"
        "Вы можете добавить ещё помещение\n"
        "или сгенерировать DXF-файл.",
        reply_markup=main_menu_kb(),
    )
    await callback.answer()


@router.callback_query(RoomFlow.confirm, F.data == "room_no")
async def cb_reject_room(callback: CallbackQuery, state: FSMContext) -> None:
    """Discard room and return to main menu."""
    # Remove the last room
    building = storage.get_building(callback.from_user.id)
    if building.rooms:
        building.rooms.pop()

    storage.clear_state(callback.from_user.id)
    await state.clear()

    await callback.message.edit_text(
        "Помещение удалено.",
        reply_markup=main_menu_kb(),
    )
    await callback.answer()
