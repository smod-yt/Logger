from fastapi import status
from enum import Enum

class Error(Enum):
    CONFLICT              = ("CONFLICT", status.HTTP_409_CONFLICT)
    INTERNAL_SERVER_ERROR = ("INTERNAL_SERVER_ERROR", status.HTTP_500_INTERNAL_SERVER_ERROR)

    APP_NOT_FOUND         = ("APP_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    BACKUP_NOT_FOUND      = ("BACKUP_NOT_FOUND", status.HTTP_404_NOT_FOUND)

    def __init__(self, code: str, status: int,):
        self.code = code
        self.status = status