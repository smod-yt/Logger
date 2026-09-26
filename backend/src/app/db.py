import asyncio
import os
import subprocess
import sys
from pathlib import Path
from typing import Annotated

from alembic import command
from alembic.config import Config
from fastapi import Depends
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

local_appdata = os.getenv("LOCALAPPDATA")
if not local_appdata:
    local_appdata = Path.home() / "AppData" / "Local"

DB_DIR = Path(local_appdata) / "Logger"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "database.db"
BACKUP_DIR = DB_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


server_logger = logger.bind(service="server")

engine = create_async_engine(f"sqlite+aiosqlite:///{DB_DIR}/database.db")

AsyncSessionLocal = async_sessionmaker(engine)


async def get_async_session():
    async with AsyncSessionLocal() as session:
        yield session


AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]


def run_migrations_online(connection):
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.attributes["connection"] = connection
    command.upgrade(alembic_cfg, "head")


def _sync_run_migrations():
    return subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


async def run_async_migrations():
    result = await asyncio.to_thread(_sync_run_migrations)

    if result.stdout:
        server_logger.debug(f"Alembic stdout:\n{result.stdout}")
    if result.stderr:
        server_logger.warning(f"Alembic stderr:\n{result.stderr}")

    if result.returncode != 0:
        server_logger.error(
            f"Migration error (code {result.returncode})\n"
            f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
        raise RuntimeError("Alembic migration failed with an error")

    server_logger.info("Migrations have been successfully applied")
