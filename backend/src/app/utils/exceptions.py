from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.app.utils.errors import Error

def error(error: Error) -> JSONResponse:
    return JSONResponse(
        {"error_code": error.code},
        status_code=error.status
    )

def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(Conflict)
    async def conflict(request: Request, exc: Conflict):
        return error(Error.CONFLICT)
    
    @app.exception_handler(InternalServerError)
    async def internalServerError(request: Request, exc: InternalServerError):
        return error(Error.INTERNAL_SERVER_ERROR)
    


    @app.exception_handler(AppNotFound)
    async def appNotFound(request: Request, exc: AppNotFound):
        return error(Error.APP_NOT_FOUND)
    
    @app.exception_handler(BackupNotFound)
    async def backupNotFound(request: Request, exc: BackupNotFound):
        return error(Error.BACKUP_NOT_FOUND)



class Conflict(Exception):
    pass

class InternalServerError(Exception):
    pass



class AppNotFound(Exception):
    pass

class BackupNotFound(Exception):
    pass