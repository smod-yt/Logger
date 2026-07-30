from pydantic import BaseModel, Field, model_validator

class AppPatch(BaseModel):
    display_name: str | None = Field(default=None, max_length=255)
    added_hours: int | None = Field(default=None, ge=0, le=20000)

    is_ignored: bool | None = Field(default=None)
    is_shown: bool | None = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def empty_string_to_none(cls, data: dict) -> dict:
        if isinstance(data, dict):
            if "display_name" in data:
                val = data["display_name"]
                if val is None or (isinstance(val, str) and val.strip() == ""):
                    data["display_name"] = None
        return data

class AppResponse(BaseModel):
    id: int
    app_name: str
    display_name: str | None
    added_hours: int

    is_ignored: bool
    is_shown: bool
    is_new: bool

class RegisterApps(BaseModel):
    app_ids: list[int]