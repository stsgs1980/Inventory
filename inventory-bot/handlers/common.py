"""
Common bot handlers: /start, /help, main menu navigation.
"""

from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, Command

import storage
from keyboards import main_menu_kb, back_to_menu_kb

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    """Handle /start command -- show welcome message and main menu."""
    text = (
        "INVENTORY BOT\n"
        "Бот для ввода измерений зданий и генерации DXF-чертежей\n"
        "совместимых с CADSoftTools Inventory.\n\n"
        "Выберите действие:"
    )
    await message.answer(text, reply_markup=main_menu_kb())


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    """Handle /help command."""
    text = (
        "ИНСТРУКЦИЯ\n\n"
        "1. [Новое здание] -- введите данные объекта\n"
        "   (литера, разрешение, этаж, высоты)\n\n"
        "2. [Добавить помещение] -- введите данные комнаты\n"
        "   (название, назначение, стены, проёмы)\n\n"
        "3. [Список помещений] -- просмотр введённых данных\n\n"
        "4. [Генерировать DXF] -- создать и скачать файл\n\n"
        "5. [Сбросить данные] -- начать заново\n\n"
        "ПОРЯДОК РАБОТЫ:\n"
        "Сначала заполните данные здания, затем добавляйте\n"
        "помещения одно за другим. Для каждого помещения\n"
        "указывайте стены по часовой стрелке.\n\n"
        "Стены вводятся направлением (N/S/E/W)\n"
        "и длиной в метрах."
    )
    await message.answer(text)


@router.callback_query(F.data == "main_menu")
async def cb_main_menu(callback: CallbackQuery) -> None:
    """Return to main menu."""
    text = "Выберите действие:"
    await callback.message.edit_text(text, reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(F.data == "reset")
async def cb_reset(callback: CallbackQuery) -> None:
    """Reset all building data for the user."""
    storage.clear_building(callback.from_user.id)
    text = (
        "Все данные сброшены.\n"
        "Начните с создания нового здания."
    )
    await callback.message.edit_text(text, reply_markup=main_menu_kb())
    await callback.answer()


@router.callback_query(F.data == "room_list")
async def cb_room_list(callback: CallbackQuery) -> None:
    """Show list of all rooms with their data."""
    building = storage.get_building(callback.from_user.id)

    if not building.rooms:
        text = "Список помещений пуст.\nДобавьте хотя бы одно помещение."
        await callback.message.edit_text(text, reply_markup=back_to_menu_kb())
        await callback.answer()
        return

    lines = [f"Здание лит. \"{building.letter or '?'}\""]
    lines.append(f"Этаж: {building.floor_type.value}")
    lines.append(f"Высота внутр.: h={building.interior_height:.2f} м")
    lines.append(f"Высота наружн.: H={building.exterior_height:.2f} м")
    lines.append("")
    lines.append("ПОМЕЩЕНИЯ:")
    lines.append("-" * 40)

    for room in building.rooms:
        area = room.calculate_area()
        purpose = "жилое" if room.purpose.value == "Locuibila" else "вспом."
        lines.append(
            f"  #{room.number} {room.name.value} "
            f"({purpose})"
        )
        lines.append(f"     Площадь: {area:.1f} кв.м")
        lines.append(f"     Стен: {len(room.walls)}")
        for j, wall in enumerate(room.walls):
            wtype = "несущ." if wall.wall_type.value == "portant" else "перегор."
            lines.append(
                f"       Стена {j+1}: {wall.direction} "
                f"{wall.length:.2f}м / {wall.thickness:.0f}мм [{wtype}]"
            )
        if room.openings:
            lines.append(f"     Проёмов: {len(room.openings)}")
            for op in room.openings:
                otype = "Окно" if op.opening_type.value == "window" else "Дверь"
                lines.append(
                    f"       {otype}: {op.width:.2f}x{op.height:.2f}м"
                )
        lines.append("")

    total = building.total_area()
    habitable = building.habitable_area()
    auxiliary = building.auxiliary_area()
    lines.append("-" * 40)
    lines.append(f"ОБЩАЯ ПЛОЩАДЬ: {total:.1f} кв.м")
    lines.append(f"ЖИЛАЯ: {habitable:.1f} кв.м")
    lines.append(f"ВСПОМОГАТЕЛЬНАЯ: {auxiliary:.1f} кв.м")

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=back_to_menu_kb(),
    )
    await callback.answer()
