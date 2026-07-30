from pydantic import BaseModel, Field, field_validator
from enum import Enum
from datetime import datetime

class EventTypes(str, Enum):
    START = "start"
    STOP = "stop"
    ALIVE = "alive"

class ActivityPost(BaseModel):
    app_name: str = Field(min_length=1, max_length=255)
    event_type: EventTypes
    timestamp: datetime

    @field_validator("app_name")
    @classmethod
    def clean_app_name(cls, value: str) -> str:
        if isinstance(value, str):
            value = value.strip().lower()
            if value.endswith(".exe"):
                return value[:-4]
        return value

class SessionResponse(BaseModel):
    id: int
    app_id: int
    start_time: datetime
    end_time: datetime | None
    last_seen: datetime
    app_name: str
    display_name: str | None

class SessionTimeResponse(BaseModel):
    app_id: int
    app_name: str
    display_name: str | None
    total_seconds: int
    added_hours: int
    human_readable: str