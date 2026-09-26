import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger
from src.app.schemas.backup_schema import BackupTypes, DeleteBackup, LoadBackup
from src.app.services import settings_service
from src.app.utils.exceptions import BackupNotFound, InternalServerError

local_appdata = os.getenv("LOCALAPPDATA")
if not local_appdata:
    local_appdata = Path.home() / "AppData" / "Local"

DB_DIR = Path(local_appdata) / "Logger"
DB_PATH = DB_DIR / "database.db"  # файл БД
BACKUP_DIR = DB_DIR / "backups"  # папка бэкапов

DB_DIR.mkdir(parents=True, exist_ok=True)  # создаём ПАПКУ
BACKUP_DIR.mkdir(parents=True, exist_ok=True)  # создаём ПАПКУ бэкапов

server_logger = logger.bind(service="server")


def get_backups():
    server_logger.debug("Fetching the list of all available backups")

    if not os.path.exists(BACKUP_DIR):
        server_logger.info("Backup directory does not exist yet. Returning empty list")
        return []

    backups_list = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith(".zip"):
            file_path = os.path.join(BACKUP_DIR, filename)
            try:
                file_stat = os.stat(file_path)
                backups_list.append(
                    {
                        "filename": filename,
                        "size_kb": round(file_stat.st_size / 1024, 2),
                        "created_at": file_stat.st_mtime,
                    }
                )
            except Exception as e:
                server_logger.warning(
                    f"Failed to read metadata for file {filename}: {e}"
                )
                continue

    backups_list.sort(key=lambda x: x["created_at"], reverse=True)
    server_logger.debug(f"Successfully loaded {len(backups_list)} backups")
    return backups_list


def create_backup(
    backup_prefix: BackupTypes = BackupTypes.AUTO.value,
    add_time: bool = False,
    db_path: str = DB_PATH,
    auto_backup: bool = False,
) -> bool:
    settings = settings_service.get_settings()
    if settings["enable_auto_backup"] == False and auto_backup == True:
        return True

    server_logger.info(
        f"Initiating backup creation. Prefix: '{backup_prefix}', Add time: {add_time}"
    )

    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)

        now_utc = datetime.now(timezone.utc)
        if add_time:
            timestamp = now_utc.strftime("%Y-%m-%d_%H-%M-%S")
        else:
            timestamp = now_utc.strftime("%Y-%m-%d")

        backup_name = f"{backup_prefix}_{timestamp}.zip"
        backup_file_path = os.path.join(BACKUP_DIR, backup_name)

        if not os.path.exists(db_path):
            server_logger.error(
                f"Backup creation failed: database file not found at path '{db_path}'"
            )
            return False

        with zipfile.ZipFile(backup_file_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(db_path, arcname=os.path.basename(db_path))

        server_logger.info(f"Backup successfully created: '{backup_name}'")
        return True

    except Exception as e:
        server_logger.exception(f"Critical error during backup creation process: {e}")
        return False


def load_backup(backup_name: LoadBackup, engine, db_path: str = DB_PATH) -> bool:
    backup_name_str = backup_name.model_dump(exclude_none=True).get("backup_name")
    server_logger.info(
        f"Request received to restore database from backup: '{backup_name_str}'"
    )

    safe_name = os.path.basename(backup_name_str)
    if not safe_name.endswith(".zip"):
        safe_name += ".zip"

    backup_path = os.path.join(BACKUP_DIR, safe_name)

    if not os.path.exists(backup_path):
        server_logger.error(
            f"Database restore failed: backup file '{safe_name}' not found"
        )
        raise BackupNotFound()

    try:
        engine.dispose()
        server_logger.info("Database connection pool disposed for restore operation")

        if os.path.exists(db_path):
            os.makedirs(BACKUP_DIR, exist_ok=True)

            timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
            emergency_prefix = getattr(
                BackupTypes, "BEFORE-RESTORE", BackupTypes.BEFORE_RESTORE
            ).value
            emergency_backup = os.path.join(
                BACKUP_DIR, f"{emergency_prefix}_{timestamp}.zip"
            )

            server_logger.info(
                f"Creating safety backup of the current database state: '{os.path.basename(emergency_backup)}'"
            )
            with zipfile.ZipFile(emergency_backup, "w", zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(db_path, arcname=os.path.basename(db_path))

        server_logger.info(f"Extracting '{safe_name}' to temporary directory...")
        with zipfile.ZipFile(backup_path, "r") as zipf:
            zipf.extractall(path="temp_restore")

        extracted_db = os.path.join("temp_restore", os.path.basename(db_path))
        if os.path.exists(extracted_db):
            shutil.move(extracted_db, db_path)
            server_logger.info(
                "Extracted database file successfully moved to working directory"
            )

        if os.path.exists("temp_restore"):
            shutil.rmtree("temp_restore")

        server_logger.info(f"Database successfully restored from '{safe_name}'")
        return True

    except Exception as e:
        server_logger.error(
            f"Critical error during database restore from '{safe_name}': {e}"
        )
        if os.path.exists("temp_restore"):
            shutil.rmtree("temp_restore")
        raise InternalServerError()


def delete_backup(backup_name: DeleteBackup) -> bool:
    print(backup_name)
    backup_name_str = backup_name.model_dump(exclude_none=True).get(
        "backup_name", str(backup_name)
    )
    server_logger.info(f"Request received to delete backup: '{backup_name_str}'")

    safe_name = os.path.basename(backup_name_str)
    backup_file_path = os.path.join(BACKUP_DIR, safe_name)

    if not os.path.exists(backup_file_path):
        server_logger.error(f"Delete aborted: backup file '{safe_name}' does not exist")
        raise BackupNotFound()

    try:
        os.remove(backup_file_path)
        server_logger.info(f"Backup file '{safe_name}' successfully deleted from disk")
        return True
    except Exception as e:
        server_logger.error(f"Failed to delete backup file '{safe_name}': {e}")
        raise InternalServerError()


def delete_old_backups():
    server_logger.debug("Starting cleanup: keeping only the latest backup")

    if not os.path.exists(BACKUP_DIR):
        server_logger.info("Backup directory does not exist. Nothing to delete")
        return []

    backups_list = []
    for filename in os.listdir(BACKUP_DIR):
        if filename.endswith(".zip"):
            file_path = os.path.join(BACKUP_DIR, filename)
            try:
                file_stat = os.stat(file_path)
                backups_list.append(
                    {
                        "filename": filename,
                        "path": file_path,
                        "created_at": file_stat.st_mtime,
                    }
                )
            except Exception as e:
                server_logger.warning(
                    f"Failed to read metadata for file {filename}: {e}"
                )
                continue

    if len(backups_list) <= 1:
        server_logger.info(
            f"Only {len(backups_list)} backup(s) found. Nothing to delete"
        )
        return []

    backups_list.sort(key=lambda x: x["created_at"], reverse=True)

    latest_backup = backups_list[0]
    server_logger.info(f"Keeping latest backup: {latest_backup['filename']}")

    deleted_files = []
    for backup in backups_list[1:]:
        try:
            os.remove(backup["path"])
            deleted_files.append(backup["filename"])
            server_logger.info(f"Deleted old backup: {backup['filename']}")
        except Exception as e:
            server_logger.warning(f"Failed to delete backup {backup['filename']}: {e}")

    server_logger.debug(f"Cleanup complete. Deleted {len(deleted_files)} backup(s)")
    return deleted_files
