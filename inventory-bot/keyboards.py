"""
Inline keyboard builders for the Telegram bot.
No Unicode emoji are used -- only plain text labels.
"""

from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


def main_menu_kb() -> InlineKeyboardMarkup:
    """Main menu keyboard."""
    buttons = [
        [InlineKeyboardButton(text="[1] Новое здание", callback_data="new_building")],
        [InlineKeyboardButton(text="[2] Добавить помещение", callback_data="add_room")],
        [InlineKeyboardButton(text="[3] Список помещений", callback_data="room_list")],
        [InlineKeyboardButton(text="[4] Генерировать DXF", callback_data="generate_dxf")],
        [InlineKeyboardButton(text="[5] Сбросить данные", callback_data="reset")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def floor_type_kb() -> InlineKeyboardMarkup:
    """Floor type selection keyboard."""
    buttons = [
        [InlineKeyboardButton(text="Parter", callback_data="floor_Parter")],
        [InlineKeyboardButton(text="Etaj 1", callback_data="floor_Etaj 1")],
        [InlineKeyboardButton(text="Etaj 2", callback_data="floor_Etaj 2")],
        [InlineKeyboardButton(text="Mansarda", callback_data="floor_Mansarda")],
        [InlineKeyboardButton(text="Subsol", callback_data="floor_Subsol")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def room_name_kb() -> InlineKeyboardMarkup:
    """Room name selection keyboard."""
    buttons = [
        [
            InlineKeyboardButton(text="Antreu", callback_data="rname_Antreu"),
            InlineKeyboardButton(text="Cazangerie", callback_data="rname_Cazangerie"),
        ],
        [
            InlineKeyboardButton(text="Bucatarie", callback_data="rname_Bucatarie"),
            InlineKeyboardButton(text="Sufragerie", callback_data="rname_Sufragerie"),
        ],
        [
            InlineKeyboardButton(text="Terasa", callback_data="rname_Terasa"),
            InlineKeyboardButton(text="Coridor", callback_data="rname_Coridor"),
        ],
        [
            InlineKeyboardButton(text="Garderoba", callback_data="rname_Garderoba"),
            InlineKeyboardButton(text="Dormitor", callback_data="rname_Dormitor"),
        ],
        [
            InlineKeyboardButton(text="Grup sanitar", callback_data="rname_Grup sanitar"),
            InlineKeyboardButton(text="Cabinet", callback_data="rname_Cabinet"),
        ],
        [
            InlineKeyboardButton(text="Balcon", callback_data="rname_Balcon"),
            InlineKeyboardButton(text="Depozit", callback_data="rname_Depozit"),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def room_purpose_kb() -> InlineKeyboardMarkup:
    """Room purpose selection keyboard."""
    buttons = [
        [InlineKeyboardButton(
            text="Locuibila (жилое)",
            callback_data="rpurpose_Locuibila"
        )],
        [InlineKeyboardButton(
            text="Auxiliara (вспомогательное)",
            callback_data="rpurpose_Auxiliara"
        )],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def wall_type_kb(wall_index: int) -> InlineKeyboardMarkup:
    """Wall type selection keyboard for a specific wall."""
    buttons = [
        [
            InlineKeyboardButton(
                text="Несущая (Portant)",
                callback_data=f"wtype_{wall_index}_portant"
            ),
            InlineKeyboardButton(
                text="Перегородка (Despartitor)",
                callback_data=f"wtype_{wall_index}_despartitor"
            ),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def wall_direction_kb(wall_index: int) -> InlineKeyboardMarkup:
    """Wall direction selection keyboard."""
    buttons = [
        [
            InlineKeyboardButton(text="N (вверх)", callback_data=f"wdir_{wall_index}_N"),
            InlineKeyboardButton(text="S (вниз)", callback_data=f"wdir_{wall_index}_S"),
        ],
        [
            InlineKeyboardButton(text="E (вправо)", callback_data=f"wdir_{wall_index}_E"),
            InlineKeyboardButton(text="W (влево)", callback_data=f"wdir_{wall_index}_W"),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def wall_thickness_kb(wall_index: int) -> InlineKeyboardMarkup:
    """Wall thickness selection keyboard (common values)."""
    buttons = [
        [
            InlineKeyboardButton(text="400 мм", callback_data=f"wthick_{wall_index}_400"),
            InlineKeyboardButton(text="450 мм", callback_data=f"wthick_{wall_index}_450"),
        ],
        [
            InlineKeyboardButton(text="150 мм", callback_data=f"wthick_{wall_index}_150"),
            InlineKeyboardButton(text="200 мм", callback_data=f"wthick_{wall_index}_200"),
        ],
        [
            InlineKeyboardButton(text="250 мм", callback_data=f"wthick_{wall_index}_250"),
            InlineKeyboardButton(text="120 мм", callback_data=f"wthick_{wall_index}_120"),
        ],
        [InlineKeyboardButton(
            text="Другое...",
            callback_data=f"wthick_{wall_index}_custom"
        )],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def add_wall_kb() -> InlineKeyboardMarkup:
    """Keyboard after adding a wall: add another or finish room."""
    buttons = [
        [InlineKeyboardButton(text="Добавить стену", callback_data="add_wall")],
        [InlineKeyboardButton(text="Завершить помещение", callback_data="finish_room")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def add_opening_kb() -> InlineKeyboardMarkup:
    """Keyboard for adding openings to a room."""
    buttons = [
        [InlineKeyboardButton(text="Добавить окно", callback_data="add_window")],
        [InlineKeyboardButton(text="Добавить дверь", callback_data="add_door")],
        [InlineKeyboardButton(text="Пропустить", callback_data="skip_openings")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def confirm_kb(prefix: str) -> InlineKeyboardMarkup:
    """Generic confirm/cancel keyboard."""
    buttons = [
        [
            InlineKeyboardButton(text="Да", callback_data=f"{prefix}_yes"),
            InlineKeyboardButton(text="Нет", callback_data=f"{prefix}_no"),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def back_to_menu_kb() -> InlineKeyboardMarkup:
    """Keyboard with a single button to return to main menu."""
    buttons = [
        [InlineKeyboardButton(text="<< В главное меню", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)
