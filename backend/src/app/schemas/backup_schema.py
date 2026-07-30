from pydantic import BaseModel, Field
from enum import Enum

class BackupTypes(str, Enum):
    AUTO = "auto"
    MANUAL = "manual"
    BEFORE_RESTORE = "BEFORE-RESTORE"

class CreateBackup(BaseModel):
    backup_type: BackupTypes = BackupTypes.MANUAL
    add_time: bool = True

class DeleteBackup(BaseModel):
    backup_name: str = Field(min_length=1, max_length=64)

class LoadBackup(BaseModel):
    backup_name: str = Field(min_length=1, max_length=64)

class BackupResponse(BaseModel):
    filename: str
    size_kb: float
    created_at: float