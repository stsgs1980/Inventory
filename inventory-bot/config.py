"""
Configuration for Inventory Telegram Bot.
All settings are loaded from environment variables.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Bot configuration loaded from environment variables."""

    # Telegram Bot API token (get from @BotFather)
    BOT_TOKEN: str = ""

    # Path where generated DXF files are stored temporarily
    OUTPUT_DIR: str = "/home/z/my-project/inventory-bot/output"

    # Default drawing parameters (millimeters, matching CADSoftTools Inventory)
    DIMSCALE: float = 1.0
    TEXT_HEIGHT: float = 250.0  # mm
    DIM_TEXT_HEIGHT: float = 180.0  # mm

    # Unit conversion factor (user enters meters, DXF uses millimeters)
    M_TO_MM: float = 1000.0

    # DXF version compatible with Inventory
    DXF_VERSION: str = "AC1021"  # AutoCAD 2007

    # Layer names (matching Inventory convention)
    LAYER_PORTANT: str = "Portant"
    LAYER_DESPARTITOR: str = "Despartitor"
    LAYER_INCAPERI: str = "Incaperi"
    LAYER_INCIZOLATE: str = "IncIzolate"
    LAYER_NIVEL: str = "Nivel"
    LAYER_GOL: str = "Gol"
    LAYER_DIMENSIUNI: str = "Dimensiuni"
    LAYER_TEXT: str = "Text"
    LAYER_ALTE: str = "Alte"
    LAYER_GREVARI: str = "Grevari"

    # Layer colors (AutoCAD color index)
    COLOR_PORTANT: int = 1  # Red
    COLOR_DESPARTITOR: int = 3  # Green
    COLOR_INCAPERI: int = 150  # Cyan
    COLOR_INCIZOLATE: int = 4  # Blue
    COLOR_NIVEL: int = 202  # Purple
    COLOR_GOL: int = 5  # Magenta
    COLOR_DIMENSIUNI: int = 150  # Cyan
    COLOR_TEXT: int = 7  # White
    COLOR_ALTE: int = 100  # Green variant

    class Config:
        env_prefix = "INVENTORY_BOT_"
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure output directory exists
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
