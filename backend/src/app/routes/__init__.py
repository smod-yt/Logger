from fastapi import FastAPI
from src.app.routes.app_router import router as app_router
from src.app.routes.session_router import router as session_router
from src.app.routes.backup_router import router as backup_router
from src.app.utils.logger import logger

prefix = "/api"

def inclucde_routes(app: FastAPI):
    app.include_router(app_router, prefix=prefix)
    app.include_router(session_router, prefix=prefix)
    app.include_router(backup_router, prefix=prefix)

    routers = [app_router, session_router, backup_router]
    total_endpoints = sum(len(r.routes) for r in routers)

    logger.info(f"API router initialized successfully (Loaded {total_endpoints} endpoints)")