"""
Inventory Telegram Bot -- Main entry point.

Bot for entering building measurements and generating DXF files
compatible with CADSoftTools Inventory.

Usage:
    export INVENTORY_BOT_BOT_TOKEN="your-token-here"
    python main.py
"""

import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher

from config import settings
from handlers import all_routers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    """Start the bot."""
    if not settings.BOT_TOKEN:
        print(
            "ERROR: Bot token not set.\n"
            "Set the INVENTORY_BOT_BOT_TOKEN environment variable\n"
            "or create a .env file with BOT_TOKEN=your-token\n\n"
            "Get a token from @BotFather in Telegram."
        )
        sys.exit(1)

    bot = Bot(token=settings.BOT_TOKEN)
    dp = Dispatcher()

    # Register all routers
    for router in all_routers:
        dp.include_router(router)

    logger.info("Starting Inventory Bot...")
    asyncio.run(dp.start_polling(bot))


if __name__ == "__main__":
    main()
