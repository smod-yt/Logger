from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from src.app.db import run_async_migrations
from src.app.services.backup_service import create_backup
import src.app.routes as routes
import src.app.utils.exceptions as exceptions
from src.app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_async_migrations()

    create_backup(add_time=False)

    logger.info("Background backend successfully started")
    yield

app = FastAPI(lifespan=lifespan)

DIST_DIR = os.path.join(os.path.dirname(__file__), "../static")

app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

exceptions.register_exception_handlers(app)
routes.inclucde_routes(app)

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """
    Serves static files or falls back to index.html for SPA routing
    """

    file_path = os.path.join(DIST_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    return FileResponse(os.path.join(DIST_DIR, "index.html"))