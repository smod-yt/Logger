from sqlalchemy import select, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date, timedelta
from collections import defaultdict
from src.app.schemas.session_schema import ActivityPost, EventTypes
from src.app.models import AppsList, AppSessions
from src.app.services import app_service
from src.app.utils.logger import logger

async def post_activity(session: AsyncSession, data: ActivityPost):
    app_name = data.app_name
    event_type = data.event_type
    timestamp = data.timestamp
    
    query = await session.execute(select(AppsList).where(AppsList.app_name == app_name))
    app = query.scalars().first()
    
    if app is None:
        app = await app_service.add_new_app(session, data)

    if app.is_new == True:
        logger.debug(f"Activity ignored for app '{app_name}' (is_new = True)")
        return True

    if app.is_ignored:
        logger.debug(f"Activity ignored for app '{app_name}' (is_ignored = True)")
        return True
    
    if event_type == EventTypes.START:
        logger.info(f"App focus changed/started: '{app_name}' (ID: {app.id})")
        
        query = await session.execute(
            select(AppSessions).where(AppSessions.end_time == None, AppSessions.app_id == app.id)
        )
        unclosed_sessions = query.scalars().all()

        if unclosed_sessions:
            logger.info(f"Closing {len(unclosed_sessions)} previous unclosed sessions for app ID: {app.id}")
            for _session in unclosed_sessions:
                _session.end_time = _session.last_seen

        new_session = AppSessions(
            app_id=app.id,
            start_time=timestamp,
            end_time=None,
            last_seen=timestamp
        )
        session.add(new_session)
        await session.commit()
        return True
    
    elif event_type == EventTypes.STOP:
        query = await session.execute(
            select(AppSessions).where(AppSessions.end_time == None, AppSessions.app_id == app.id)
        )
        current_session = query.scalars().first()

        if current_session is None:
            logger.warning(f"Failed to process STOP event: no active session found for '{app_name}'")
            return False

        current_session.end_time = timestamp
        await session.commit()
        logger.info(f"App stopped: '{app_name}' (Session closed)")
        return True
    
    elif event_type == EventTypes.ALIVE:
        logger.debug(f"Heartbeat received for '{app_name}'")
        
        query = await session.execute(
            select(AppSessions).where(AppSessions.end_time == None, AppSessions.app_id == app.id)
        )
        current_session = query.scalars().first()

        if current_session is None:
            logger.debug(f"ALIVE received but no active session for '{app_name}'. Creating a new one")
            new_session = AppSessions(
                app_id=app.id,
                start_time=timestamp,
                end_time=None,
                last_seen=timestamp
            )
            session.add(new_session)
            await session.commit()
            return True

        current_session.last_seen = timestamp
        await session.commit()
        return True
    
    else:
        logger.error(f"Invalid event type received: '{event_type}' from app '{app_name}'")
        return False

async def get_sessions(session: AsyncSession, offset: int, limit: int, is_active: bool,
                       period: str, specific_day: date | None, date_from: datetime | None, date_to: datetime | None, app_name: str):
    logger.debug(f"Fetching sessions list (period: {period}, limit: {limit}, offset: {offset})")
    
    query = select(AppSessions).order_by(desc(AppSessions.start_time))

    if is_active is True:
        query = query.where(AppSessions.end_time.is_(None))
    elif is_active is False:
        query = query.where(AppSessions.end_time.is_not(None))

    today_start = datetime.combine(date.today(), datetime.min.time())
    tomorrow_start = today_start + timedelta(days=1)

    if period == "today":
        query = query.where(AppSessions.start_time >= today_start,
                            AppSessions.start_time < tomorrow_start)
    elif period == "yesterday":
        yesterday_start = today_start - timedelta(days=1)
        query = query.where(AppSessions.start_time >= yesterday_start,
                            AppSessions.start_time < today_start)
    elif period == "week":
        week_start = today_start - timedelta(days=6)
        query = query.where(AppSessions.start_time >= week_start,
                            AppSessions.start_time < tomorrow_start)
    elif period == "month":
        month_start = today_start - timedelta(days=29)
        query = query.where(AppSessions.start_time >= month_start,
                            AppSessions.start_time < tomorrow_start)
    elif period == "year":
        year_start = today_start - timedelta(days=364)
        query = query.where(AppSessions.start_time >= year_start,
                            AppSessions.start_time < tomorrow_start)
    elif period == "specific_day":
        if not specific_day:
            logger.warning("get_sessions requested with 'specific_day' period, but specific_day is missing")
            return {"items": [], "total": 0}
        day_start = datetime.combine(specific_day, datetime.min.time())
        query = query.where(AppSessions.start_time >= day_start,
                            AppSessions.start_time < day_start + timedelta(days=1))
    elif period == "custom":
        if not date_from or not date_to:
            logger.warning("get_sessions requested with 'custom' period, but date range is incomplete")
            return {"items": [], "total": 0}
        query = query.where(AppSessions.start_time >= date_from,
                            AppSessions.start_time <= date_to)
    
    if app_name:
        search_pattern = f"%{app_name}%"
    
        query = query.where(
            or_(
                AppsList.app_name.ilike(search_pattern),
                AppsList.display_name.ilike(search_pattern)
            )
        )

    query = query.join(AppsList).where(AppsList.is_shown == True, AppsList.is_new == False)

    query = query.with_only_columns(
        AppSessions, 
        AppsList.app_name, 
        AppsList.display_name,
        func.count(AppSessions.id).over().label("total_count")
    )

    query = query.offset(offset).limit(limit)

    result = await session.execute(query)
    raw_rows = result.all() 

    if not raw_rows:
        return {"items": [], "total": 0}

    total = raw_rows[0][3]

    sessions_list = []
    for row in raw_rows:
        session_obj = row[0]
        
        session_dict = {
            c.name: getattr(session_obj, c.name) 
            for c in session_obj.__table__.columns
        }
        
        session_dict["app_name"] = row[1]
        session_dict["display_name"] = row[2]   
        
        sessions_list.append(session_dict)

    logger.info(f"Received sessions list ({len(sessions_list)} items, total: {total}, offset: {offset})")
    
    return {"items": sessions_list, "total": total}

async def get_sessions_time(session: AsyncSession, offset: int, limit: int,
                            period: str, specific_day: datetime | None, date_from: datetime | None, date_to: datetime | None):
    logger.info(f"Calculating analytics data for period: '{period}'")
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    tomorrow_start = today_start + timedelta(days=1)
    time_filter = None

    if period == "today":
        time_filter = (
            AppSessions.start_time >= today_start,
            AppSessions.start_time < tomorrow_start
        )
    elif period == "yesterday":
        yesterday_start = today_start - timedelta(days=1)
        time_filter = (
            AppSessions.start_time >= yesterday_start,
            AppSessions.start_time < today_start
        )
    elif period == "week":
        time_filter = (
            AppSessions.start_time >= today_start - timedelta(days=6),
            AppSessions.start_time < tomorrow_start
        )
    elif period == "month":
        time_filter = (
            AppSessions.start_time >= today_start - timedelta(days=29),
            AppSessions.start_time < tomorrow_start
        )
    elif period == "year":
        time_filter = (
            AppSessions.start_time >= today_start - timedelta(days=364),
            AppSessions.start_time < tomorrow_start
        )
    elif period == "specific_day":
        if not specific_day:
            logger.warning("get_sessions_time requested with 'specific_day', but date is missing")
            return []
        day_start = datetime.combine(specific_day, datetime.min.time())
        time_filter = (
            AppSessions.start_time >= day_start,
            AppSessions.start_time < day_start + timedelta(days=1)
        )
    elif period == "custom":
        if not date_from or not date_to:
            logger.warning("get_sessions_time requested with 'custom' period, but date range is incomplete")
            return []
        time_filter = (AppSessions.start_time.between(date_from, date_to),)

    query = select(
        AppSessions.app_id, 
        AppSessions.start_time, 
        AppSessions.end_time, 
        AppSessions.last_seen,
        AppsList.app_name,
        AppsList.display_name,
        AppsList.added_hours
    ).join(AppsList, AppSessions.app_id == AppsList.id).where(
        AppsList.is_shown == True, 
        AppsList.is_new == False
    )

    if time_filter is not None:
        query = query.where(*time_filter)

    result = await session.execute(query)
    sessions = result.all()

    duration_map = defaultdict(lambda: {
        "seconds": 0.0, 
        "app_name": "", 
        "display_name": None, 
        "added_hours": 0
    })
    
    for row in sessions:
        actual_end = row.end_time if row.end_time is not None else row.last_seen
        duration = actual_end - row.start_time
        
        duration_map[row.app_id]["seconds"] += max(0.0, duration.total_seconds())
        duration_map[row.app_id]["app_name"] = row.app_name
        duration_map[row.app_id]["display_name"] = row.display_name
        duration_map[row.app_id]["added_hours"] = row.added_hours or 0

    if period == "all":
        all_apps_query = select(AppsList).where(AppsList.is_shown == True, AppsList.is_new == False)
        all_apps_res = await session.execute(all_apps_query)
        for app_obj in all_apps_res.scalars().all():
            if app_obj.id not in duration_map:
                duration_map[app_obj.id]["app_name"] = app_obj.app_name
                duration_map[app_obj.id]["display_name"] = app_obj.display_name
                duration_map[app_obj.id]["added_hours"] = app_obj.added_hours or 0

    def get_sort_key(item):
        app_data = item[1]
        tracked_sec = app_data["seconds"]
        if period == "all":
            return tracked_sec + (app_data["added_hours"] * 3600)
        return tracked_sec

    sorted_analytics = sorted(duration_map.items(), key=get_sort_key, reverse=True)
    paginated_analytics = sorted_analytics[offset : offset + limit]

    response = []
    for app_id, data in paginated_analytics:
        tracked_seconds = int(data["seconds"])
        added_hours = max(0, int(data["added_hours"]))
        added_seconds = added_hours * 3600

        if period == "all":
            total_seconds = tracked_seconds + added_seconds
        else:
            total_seconds = tracked_seconds

        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        
        response.append({
            "app_id": app_id,
            "app_name": data["app_name"],
            "display_name": data["display_name"],
            "added_hours": added_hours,
            "total_seconds": total_seconds,
            "human_readable": f"{hours}h {minutes}m"
        })

    logger.info(f"Analytics successfully calculated. Returning {len(response)} rows")
    return response