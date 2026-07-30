from fastapi import APIRouter, Query, status
from typing import Annotated
from datetime import datetime, date
from src.app.services import session_service
from src.app.db import AsyncSessionDep
from src.app.schemas import PaginatedResponse
from src.app.schemas.session_schema import SessionResponse, SessionTimeResponse, ActivityPost

router = APIRouter(prefix="/sessions", tags=["sessions"])

OffsetParam = Annotated[int | None, Query(ge=0)]
LimitParam  = Annotated[int | None, Query(ge=0, le=100)]

@router.post("/activity",
             response_model=None,
             status_code=status.HTTP_204_NO_CONTENT)
async def post_activity(session: AsyncSessionDep, data: ActivityPost):
    """
    Creates application sessions and applications in the database if they don't already exist. Used only by watcher
    """

    result = await session_service.post_activity(session, data)
    return result

@router.get("/",
            response_model=PaginatedResponse[SessionResponse],
            status_code=status.HTTP_200_OK)
async def get_sessions(session: AsyncSessionDep,
                       offset: OffsetParam = 0,
                       limit: LimitParam = 20,
                       is_active: bool | None = Query(default=None),
                       period: str | None = Query(
                           default=None,
                           description="'today', 'yesterday', 'week', 'month', 'year', 'custom', 'specific_day'"),
                       specific_day: date | None = Query(
                           default=None,
                           description="A specific day in the format YYYY-MM-DD"),
                       date_from: datetime | None = Query(
                           default=None,
                           description="For your interval (start)"),
                       date_to: datetime | None = Query(
                           default=None,
                           description="For your interval (end)"),
                       app_name: str | None = Query(
                           default=None,
                           description="app_name or display_name")):
    """
    Returns a list of sessions with pagination
    """

    result = await session_service.get_sessions(session, offset, limit, is_active, period, specific_day, date_from, date_to, app_name)
    return result

@router.get("/time",
            response_model=list[SessionTimeResponse],
            status_code=status.HTTP_200_OK)
async def get_sessions_time(session: AsyncSessionDep,
                       offset: OffsetParam = 0,
                       limit: LimitParam = 20,
                       period: str | None = Query(
                           default=None,
                           description="'today', 'yesterday', 'week', 'month', 'year', 'custom', 'specific_day'"),
                       specific_day: date | None = Query(
                                                  default=None,
                                                  description="A specific day in the format YYYY-MM-DD"),
                       date_from: datetime | None = Query(
                           default=None,
                           description="For your interval (start)"),
                       date_to: datetime | None = Query(
                           default=None,
                           description="For your interval (end)")):
    """
    Returns a list of time spent in applications with pagination
    """

    result = await session_service.get_sessions_time(session, offset, limit, period, specific_day, date_from, date_to)
    return result