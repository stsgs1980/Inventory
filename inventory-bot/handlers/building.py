"""
Building data entry handlers.
Guides the user through entering building-level information:
letter, permit number, floor type, heights, etc.
"""

from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.filters import StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

import storage
from keyboards import (
    floor_type_kb,
    confirm_kb,
    main_menu_kb,
    back_to_menu_kb,
)
from models.data_models import FloorType

router = Router()


class BuildingFlow(StatesGroup):
    """FSM states for building data entry."""
    letter = State()
    permit_number = State()
    permit_date = State()
    floor_type = State()
    interior_height = State()
    exterior_height = State()
    confirm = State()


@router.callback_query(F.data == "new_building")
async def cb_new_building(callback: CallbackQuery, state: FSMContext) -> None:
    """Start building data entry flow."""
    await state.set_state(BuildingFlow.letter)
    text = (
        "ВВОД ДАННЫХ ЗДАНИЯ\n\n"
        "Шаг 1/6: Литера здания\n"
        "Введите букву (например: B):"
    )
    await callback.message.edit_text(text)
    await callback.answer()


@router.message(BuildingFlow.letter)
async def process_letter(message: Message, state: FSMContext) -> None:
    """Process building letter input."""
    letter = message.text.strip().upper()[:5]
    building = storage.get_building(message.from_user.id)
    building.letter = letter

    await state.set_state(BuildingFlow.permit_number)
    await message.answer(
        "Шаг 2/6: Номер разрешения на строительство\n"
        "Введите номер (например: 1922) или '-' чтобы пропустить:"
    )


@router.message(BuildingFlow.permit_number)
async def process_permit_number(message: Message, state: FSMContext) -> None:
    """Process permit number input."""
    permit = message.text.strip()
    if permit == "-":
        permit = ""
    building = storage.get_building(message.from_user.id)
    building.permit_number = permit

    await state.set_state(BuildingFlow.permit_date)
    await message.answer(
        "Шаг 3/6: Дата разрешения\n"
        "Введите дату (например: 29.01.2025) или '-' чтобы пропустить:"
    )


@router.message(BuildingFlow.permit_date)
async def process_permit_date(message: Message, state: FSMContext) -> None:
    """Process permit date input."""
    date = message.text.strip()
    if date == "-":
        date = ""
    building = storage.get_building(message.from_user.id)
    building.permit_date = date

    await state.set_state(BuildingFlow.floor_type)
    await message.answer(
        "Шаг 4/6: Тип этажа\n"
        "Выберите тип этажа:",
        reply_markup=floor_type_kb(),
    )


@router.callback_query(BuildingFlow.floor_type, F.data.startswith("floor_"))
async def cb_floor_type(callback: CallbackQuery, state: FSMContext) -> None:
    """Process floor type selection."""
    floor_value = callback.data.replace("floor_", "")
    building = storage.get_building(callback.from_user.id)
    building.floor_type = FloorType(floor_value)

    await state.set_state(BuildingFlow.interior_height)
    await callback.message.edit_text(
        "Шаг 5/6: Внутренняя высота помещения (м)\n"
        "Введите значение (например: 2.70):"
    )
    await callback.answer()


@router.message(BuildingFlow.interior_height)
async def process_interior_height(message: Message, state: FSMContext) -> None:
    """Process interior height input."""
    try:
        height = float(message.text.strip().replace(",", "."))
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 2.70):")
        return

    building = storage.get_building(message.from_user.id)
    building.interior_height = height

    await state.set_state(BuildingFlow.exterior_height)
    await message.answer(
        "Шаг 6/6: Наружная высота помещения (м)\n"
        "Введите значение (например: 3.00):"
    )


@router.message(BuildingFlow.exterior_height)
async def process_exterior_height(message: Message, state: FSMContext) -> None:
    """Process exterior height input and show confirmation."""
    try:
        height = float(message.text.strip().replace(",", "."))
    except ValueError:
        await message.answer("Неверный формат. Введите число (например: 3.00):")
        return

    building = storage.get_building(message.from_user.id)
    building.exterior_height = height

    await state.set_state(BuildingFlow.confirm)

    # Show summary for confirmation
    summary = (
        "ДАННЫЕ ЗДАНИЯ -- ПОДТВЕРЖДЕНИЕ\n\n"
        f"Литера: {building.letter}\n"
        f"Разрешение: {building.permit_number or '-'} "
        f"от {building.permit_date or '-'}\n"
        f"Этаж: {building.floor_type.value}\n"
        f"Высота внутр.: h={building.interior_height:.2f} м\n"
        f"Высота наружн.: H={building.exterior_height:.2f} м\n\n"
        "Всё верно?"
    )
    await message.answer(summary, reply_markup=confirm_kb("building"))


@router.callback_query(BuildingFlow.confirm, F.data == "building_yes")
async def cb_confirm_building(callback: CallbackQuery, state: FSMContext) -> None:
    """Confirm building data and return to main menu."""
    await state.clear()
    await callback.message.edit_text(
        "Данные здания сохранены.\n\n"
        "Теперь добавьте помещения.",
        reply_markup=main_menu_kb(),
    )
    await callback.answer()


@router.callback_query(BuildingFlow.confirm, F.data == "building_no")
async def cb_reject_building(callback: CallbackQuery, state: FSMContext) -> None:
    """Restart building data entry."""
    await state.set_state(BuildingFlow.letter)
    await callback.message.edit_text(
        "Начнём заново.\n\n"
        "Шаг 1/6: Литера здания\n"
        "Введите букву (например: B):"
    )
    await callback.answer()
