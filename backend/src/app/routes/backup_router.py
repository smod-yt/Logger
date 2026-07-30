from fastapi import APIRouter, status
from src.app.services import backup_service
from src.app.schemas.backup_schema import BackupResponse, CreateBackup, DeleteBackup, LoadBackup
from src.app.db import engine
from src.app.utils.exceptions import InternalServerError

router = APIRouter(prefix="/backups", tags=["backups"])

@router.get("/",
            response_model=list[BackupResponse],
            status_code=status.HTTP_200_OK)
def get_backups():
    """
    Returns a list of backups
    """

    result = backup_service.get_backups()
    return result

@router.post("/create",
             response_model=None,
             status_code=status.HTTP_201_CREATED)
def create_backup(data: CreateBackup):
    """
    Creates a backup
    """

    result = backup_service.create_backup(backup_prefix=data.backup_type.value, add_time=data.add_time)
    if not result:
        raise InternalServerError()
    return

@router.post("/load",
             response_model=None,
             status_code=status.HTTP_204_NO_CONTENT,
             responses={
                 404: {
                     "description": "Backup Not Found",
                     "content": {
                         "applications/json": {
                             "example": {"error_code": "BACKUP_NOT_FOUND"}
                         }
                     }
                 },
                 500: {
                     "content": {
                         "applications/json": {
                             "example": {"error_code": "INTERNAL_SERVER_ERROR"}
                         }
                     }
                }
             })
def load_backup(data: LoadBackup):
    """
    Loads data from a backup into the database by file name
    """

    backup_service.load_backup(data, engine)   
    return

@router.delete("/delete",
               response_model=None,
               status_code=status.HTTP_204_NO_CONTENT,
               responses={
                   404: {
                       "description": "Backup Not Found",
                       "content": {
                           "applications/json": {
                               "example": {"error_code": "BACKUP_NOT_FOUND"}
                           }
                       }
                   },
                   500: {
                       "content": {
                           "applications/json": {
                               "example": {"error_code": "INTERNAL_SERVER_ERROR"}
                           }
                       }
                   }
               })
def delete_backup(data: DeleteBackup):
    """
    Deletes the backup by file name
    """

    backup_service.delete_backup(data)
    return