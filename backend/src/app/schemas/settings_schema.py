from typing import Any

from pydantic import BaseModel


class SetSetting(BaseModel):
    key: str
    value: Any


class SettingsResponse(BaseModel):
    enable_logging: bool
    enable_auto_backup: bool
