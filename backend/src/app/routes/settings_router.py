from fastapi import APIRouter, status
from src.app.schemas.settings_schema import SetSetting, SettingsResponse
from src.app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=SettingsResponse, status_code=status.HTTP_200_OK)
def get_settings():
    """
    Returns settings dict
    """

    result = settings_service.get_settings()
    return result


@router.patch(
    "/",
    responses={
        404: {
            "description": "Setting Not Found",
            "content": {
                "applications/json": {"example": {"error_code": "SETTING_NOT_FOUND"}}
            },
        }
    },
    status_code=status.HTTP_204_NO_CONTENT,
)
def set_setting(data: SetSetting):
    """
    Modify settings by key
    """

    settings_service.set_setting(data)
    return


@router.get(
    "/open",
    status_code=status.HTTP_204_NO_CONTENT,
)
def open_settings_directory():
    """
    Open settings directory in explorer
    """

    settings_service.open_settings()
    return
