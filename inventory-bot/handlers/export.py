"""
Export handler: generates DXF file and sends it via Telegram.
"""

import os
from pathlib import Path

from aiogram import Router, F
from aiogram.types import CallbackQuery, FSInputFile

import storage
from services.dxf_generator import DXFGenerator
from keyboards import main_menu_kb, back_to_menu_kb

router = Router()


@router.callback_query(F.data == "generate_dxf")
async def cb_generate_dxf(callback: CallbackQuery) -> None:
    """Generate DXF file from building data and send it."""
    building = storage.get_building(callback.from_user.id)

    # Validate building data
    if not building.letter:
        await callback.message.edit_text(
            "Ошибка: не заполнены данные здания.\n"
            "Сначала введите данные здания (пункт 1 в меню).",
            reply_markup=back_to_menu_kb(),
        )
        await callback.answer()
        return

    if not building.rooms:
        await callback.message.edit_text(
            "Ошибка: нет помещений.\n"
            "Добавьте хотя бы одно помещение (пункт 2 в меню).",
            reply_markup=back_to_menu_kb(),
        )
        await callback.answer()
        return

    # Validate rooms have walls
    for room in building.rooms:
        if not room.walls:
            await callback.message.edit_text(
                f"Ошибка: помещение #{room.number} не имеет стен.\n"
                "Каждое помещение должно иметь хотя бы 3 стены.",
                reply_markup=back_to_menu_kb(),
            )
            await callback.answer()
            return

    # Show progress
    await callback.message.edit_text(
        "Генерация DXF-файла...\n"
        "Подождите."
    )
    await callback.answer()

    try:
        # Generate DXF
        generator = DXFGenerator(building)
        dxf_path = generator.generate()

        # Send the file
        file = FSInputFile(
            str(dxf_path),
            filename=f"building_{building.letter}.dxf",
        )

        # Build summary
        total_area = building.total_area()
        habitable = building.habitable_area()
        auxiliary = building.auxiliary_area()
        room_count = len(building.rooms)

        caption = (
            f"DXF-файл: здание лит. \"{building.letter}\"\n"
            f"Этаж: {building.floor_type.value}\n"
            f"Помещений: {room_count}\n"
            f"Общая площадь: {total_area:.1f} кв.м\n"
            f"Жилая: {habitable:.1f} / Вспомогательная: {auxiliary:.1f} кв.м\n\n"
            f"Файл совместим с CADSoftTools Inventory.\n"
            f"Откройте его в Inventory для редактирования."
        )

        await callback.message.answer_document(
            file,
            caption=caption,
        )

        await callback.message.answer(
            "Файл отправлен.\n"
            "Откройте его в CADSoftTools Inventory.",
            reply_markup=main_menu_kb(),
        )

    except Exception as e:
        await callback.message.answer(
            f"Ошибка генерации DXF:\n{str(e)}\n\n"
            "Проверьте корректность введённых данных.",
            reply_markup=main_menu_kb(),
        )
