from fastapi import APIRouter, Query, status
from typing import Annotated
from src.app.services import app_service
from src.app.db import AsyncSessionDep
from src.app.schemas import PaginatedResponse
from src.app.schemas.app_schema import RegisterApps, AppResponse, AppPatch

router = APIRouter(prefix="/apps", tags=["apps"])

OffsetParam = Annotated[int | None, Query(ge=0)]
LimitParam  = Annotated[int | None, Query(ge=0, le=100)]

@router.post("/register",
               response_model=None,
               status_code=status.HTTP_204_NO_CONTENT,
               responses={
                   404: {
                       "description": "App Not Found",
                       "content": {
                           "application/json": {
                               "example": {"error_code": "APP_NOT_FOUND"}
                           }
                       }
                   },
                   500: {
                       "content": {
                           "application/json": {
                               "example": {"error_code": "INTERNAL_SERVER_ERROR"}
                           }
                       }
                   }
               })
async def register_apps(session: AsyncSessionDep, data: RegisterApps):
    """
    Register a list of applications by IDs
    """

    await app_service.register_apps(session, data)
    return

@router.get("/",
            response_model=PaginatedResponse[AppResponse],
            status_code=status.HTTP_200_OK)
async def get_apps(session: AsyncSessionDep,
                   offset: OffsetParam = 0,
                   limit: LimitParam = 20):
    """
    Returns a list of applications with pagination
    """
    
    result = await app_service.get_apps(session, offset, limit)
    return result

@router.patch("/{app_id}",
              response_model=AppResponse,
              status_code=status.HTTP_200_OK,
              responses={
                  404: {
                      "description": "App Not Found",
                      "content": {
                          "application/json": {
                              "example": {"error_code": "APP_NOT_FOUND"}
                          }
                      }
                  },
                  500: {
                      "content": {
                          "application/json": {
                              "example": {"error_code": "INTERNAL_SERVER_ERROR"}
                          }
                      }
                }
              })
async def patch_app(session: AsyncSessionDep, data: AppPatch, app_id: int):
    """
    Updates fields for a specific application by ID
    """

    result = await app_service.patch_app(session, data, app_id)
    return result

@router.delete("/{app_id}",
               response_model=AppResponse,
               status_code=status.HTTP_200_OK,
              responses={
                  404: {
                      "description": "App Not Found",
                      "content": {
                          "application/json": {
                              "example": {"error_code": "APP_NOT_FOUND"}
                          }
                      }
                  },
                  500: {
                      "content": {
                          "application/json": {
                              "example": {"error_code": "INTERNAL_SERVER_ERROR"}
                          }
                      }
                  }
              })
async def delete_app(session: AsyncSessionDep, app_id: int):
    """
    Deletes an application by ID
    """

    result = await app_service.delete_app(session, app_id)
    return result