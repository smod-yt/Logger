import json
import os
import subprocess
from pathlib import Path

from src.app.schemas.settings_schema import SetSetting
from src.app.utils.exceptions import SettingNotFound

local_appdata = os.getenv("LOCALAPPDATA")
if not local_appdata:
    local_appdata = Path.home() / "AppData" / "Local"

SETTINGS_DIR = Path(local_appdata) / "Logger"
SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
SETTINGS_PATH = Path(f"{SETTINGS_DIR}/settings.json")

BASE_SETTINGS = {"enable_logging": True, "enable_auto_backup": True}

if not SETTINGS_PATH.is_file():
    with open(SETTINGS_PATH, "w") as file:
        file.write(json.dumps(BASE_SETTINGS))


def get_settings() -> dict:
    with open(SETTINGS_PATH, "r") as file:
        return json.loads(file.read())


def set_setting(data: SetSetting) -> None:
    key = data.key
    value = data.value

    with open(SETTINGS_PATH, "r") as file:
        settings = json.loads(file.read())

    try:
        if settings[key] is None:
            raise SettingNotFound
        settings[key] = value
        with open(SETTINGS_PATH, "w") as file:
            file.write(json.dumps(settings))
    except KeyError:
        raise SettingNotFound


def open_settings():
    subprocess.Popen(f'explorer {SETTINGS_DIR}"')

    return
