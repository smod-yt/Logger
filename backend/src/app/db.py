from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from fastapi import Depends
from typing import Annotated
import asyncio
import sys
from alembic import command
from alembic.config import Config
import subprocess

from src.app.utils.logger import logger

engine = create_async_engine("sqlite+aiosqlite:///database.db")

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
        text=True
    )

async def run_async_migrations():
    result = await asyncio.to_thread(_sync_run_migrations)
    
    if result.returncode != 0:
        logger.error(f"Migration error (code {result.returncode})")
        raise RuntimeError("Alembic migration failed with an error")
    else:
        logger.info("Migrations have been successfully applied")