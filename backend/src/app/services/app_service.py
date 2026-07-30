from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from src.app.schemas.session_schema import ActivityPost
from src.app.schemas.app_schema import AppPatch, RegisterApps
from src.app.models import AppsList, AppSessions
from src.app.utils.logger import logger
from src.app.utils.exceptions import AppNotFound, Conflict, InternalServerError

async def add_new_app(session: AsyncSession, data: ActivityPost) -> AppsList:
    new_app = AppsList(
        app_name=data.app_name
    )
    try:
        session.add(new_app)
        await session.commit()
        await session.refresh(new_app)
    except IntegrityError:
        await session.rollback()
        raise Conflict()

    logger.info(f"New app successfully added (id: {new_app.id}, name: {new_app.app_name})")

    return new_app

async def register_apps(session: AsyncSession, data: RegisterApps):
    apps_list = set(data.app_ids)

    try:
        query = await session.execute(
            update(AppsList)
            .where(AppsList.id.in_(apps_list))
            .values(is_new = False)
            .returning(AppsList.id))

        result = query.scalars().all()

        if len(result) != len(apps_list):
            missing_ids = apps_list - set(result)
            logger.error(f"Failed register app: apps with ids {missing_ids} not found")
            await session.rollback()
            raise AppNotFound()

        await session.commit()

        query = await session.execute(select(AppsList).where(AppsList.is_new == True))
        apps_to_delete = query.scalars().all()

        for app in apps_to_delete:
            await session.delete(app)
        await session.commit()

        logger.info(f"{len(set(result))} apps successfully registred")

    except Exception as e:
        logger.error(f"Failed to register apps: {e}")
        await session.rollback()
        raise InternalServerError()

async def get_apps(session: AsyncSession, offset: int, limit: int):
    query = select(
        AppsList, 
        func.count(AppsList.id).over().label("total_count")
    ).offset(offset).limit(limit)
    
    result = await session.execute(query)
    rows = result.all()

    if not rows:
        return {"items": [], "total": 0}

    apps = [row[0] for row in rows]
    total = rows[0][1]

    logger.info(f"Received apps list ({len(apps)} apps, total: {total}, offset: {offset}, limit: {limit})")

    return {"items": apps, "total": total}

async def patch_app(session: AsyncSession, data: AppPatch, app_id: int):
    query = await session.execute(select(AppsList).where(AppsList.id == app_id))
    app = query.scalars().first()

    if app is None:
        logger.error(f"Failed to patch app: app with id {app_id} not found")
        raise AppNotFound()
    
    was_ignored = app.is_ignored

    items = data.model_dump(exclude_unset=True).items()
    for key, value in items:
        setattr(app, key, value)
    
    if data.is_ignored is True and not was_ignored:
        logger.info(f"App {app.app_name} (id: {app_id}) was marked as ignored. Closing active session...")
        
        session_query = await session.execute(
            select(AppSessions).where(AppSessions.end_time == None, AppSessions.app_id == app_id)
        )
        active_session = session_query.scalars().first()
        
        if active_session:
            active_session.end_time = datetime.now(timezone.utc)
            logger.info(f"Active session (id: {active_session.id}) for app {app.app_name} successfully closed")
    
    try:
        await session.commit()
        await session.refresh(app)
    except Exception:
        await session.rollback()
        raise InternalServerError()

    logger.info(f"App successfully updated (id: {app_id}, updated fields: {list(data.model_dump(exclude_unset=True).keys())})")

    return app

async def delete_app(session: AsyncSession, app_id: int):
    query = await session.execute(select(AppsList).where(AppsList.id == app_id))
    app = query.scalars().first()

    if app is None:
        logger.error(f"Failed to delete app: app with id {app_id} not found")
        raise AppNotFound()

    try:
        await session.delete(app)
        await session.commit()
    except Exception as e:
        logger.error(f"Failed to delete app: {e}")
        await session.rollback()
        raise InternalServerError()

    logger.info(f"App successfully deleted from database (id: {app_id}, name: {app.app_name})")

    return app