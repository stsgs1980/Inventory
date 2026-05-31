"""
Opening (window/door) entry and room confirmation handlers.
"""

from aiogram import F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

import storage
from keyboards import (
    add_opening_kb,
    back_to_menu_kb,
    main_menu_kb,
)
from models.data_models import Opening, OpeningType
from handlers.room.states import router, RoomFlow, show_room_summary


# --- Opening entry flow ---

@router.callback_query(RoomFlow.add_openings, F.data == "add_window")
async def cb_add_window(callback: CallbackQuery, state: FSMContext) -> None:
    """Start adding a window opening."""
    storage.update_state(callback.from_user.id, opening_type="window")
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
        f"ОКНО\n\nСтены:\n{walls_list}\n\n"
        "Введите расстояние от начала стены до окна (м):"
    )
    await callback.answer()


@router.callback_query(RoomFlow.add_openings, F.data == "add_door")
async def cb_add_door(callback: CallbackQuery, state: FSMContext) -> None:
    """Start adding a door opening."""
    storage.update_state(callback.from_user.id, opening_type="door")
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
        f"ДВЕРЬ\n\nСтены:\n{walls_list}\n\n"
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
    """Process opening height and save the opening."""
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
    wall_index = 0  # Default: first wall

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
    await message.answer(text, reply_markup=add_opening_kb())


@router.callback_query(RoomFlow.add_openings, F.data == "skip_openings")
@router.callback_query(RoomFlow.add_another_opening, F.data == "skip_openings")
async def cb_skip_openings(callback: CallbackQuery, state: FSMContext) -> None:
    """Skip openings and show room summary."""
    await show_room_summary(callback, state)


@router.callback_query(RoomFlow.add_another_opening, F.data == "add_window")
async def cb_add_another_window(callback: CallbackQuery, state: FSMContext) -> None:
    """Add another window."""
    storage.update_state(callback.from_user.id, opening_type="window")
    await state.set_state(RoomFlow.opening_offset)
    await callback.message.edit_text(
        "ОКНО\n\nВведите расстояние от начала стены до окна (м):"
    )
    await callback.answer()


@router.callback_query(RoomFlow.add_another_opening, F.data == "add_door")
async def cb_add_another_door(callback: CallbackQuery, state: FSMContext) -> None:
    """Add another door."""
    storage.update_state(callback.from_user.id, opening_type="door")
    await state.set_state(RoomFlow.opening_offset)
    await callback.message.edit_text(
        "ДВЕРЬ\n\nВведите расстояние от начала стены до двери (м):"
    )
    await callback.answer()


# --- Room confirmation ---

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
