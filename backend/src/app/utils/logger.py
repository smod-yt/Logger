import os
import sys
from pathlib import Path

from loguru import logger
from src.app.services import settings_service

local_appdata = os.getenv("LOCALAPPDATA")
if not local_appdata:
    local_appdata = Path.home() / "AppData" / "Local"

LOGS_PATH = Path(local_appdata) / "Logger" / "logs"


def setup_logging():
    LOGS_PATH.mkdir(parents=True, exist_ok=True)

    logger.remove()

    settings = settings_service.get_settings()
    if settings["enable_logging"] == False:
        return

    logger.add(
        sys.stderr,
        level="INFO",
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> [<level>{level}</level>] {name} ({file}:{line}): <level>{message}</level>",
    )

    logger.add(
        LOGS_PATH / "server.log",
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} [{level}] {name} ({file}:{line}): {message}",
        encoding="utf-8",
        rotation="10 MB",
        retention="7 days",
        filter=lambda record: record["extra"].get("service") == "server",
    )

    logger.add(
        LOGS_PATH / "watcher.log",
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} [{level}] {name} ({file}:{line}): {message}",
        encoding="utf-8",
        rotation="10 MB",
        retention="7 days",
        filter=lambda record: record["extra"].get("service") == "watcher",
    )
