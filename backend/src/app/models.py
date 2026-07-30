from sqlalchemy import Column, Integer, ForeignKey
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

class AppsList(SQLModel, table=True):
    __tablename__ = "apps_list"
    
    id: int | None = Field(default=None, primary_key=True)
    app_name: str = Field(min_length=1, max_length=255, nullable=False, unique=True)
    display_name: str = Field(min_length=1, max_length=255, nullable=True)
    added_hours: int = Field(default=0, sa_column_kwargs={"server_default": "0"}, ge=0, le=20000)

    is_ignored: bool = Field(default=False, sa_column_kwargs={"server_default": "0"})
    is_shown: bool = Field(default=True, sa_column_kwargs={"server_default": "1"})
    is_new: bool = Field(default=True, sa_column_kwargs={"server_default": "1"})

    sessions: list["AppSessions"] = Relationship(
        back_populates="app", 
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class AppSessions(SQLModel, table=True):
    __tablename__ = "apps_sessions"

    id: int | None = Field(default=None, primary_key=True)
    app_id: int = Field(
        sa_column=Column(
            Integer, 
            ForeignKey("apps_list.id", ondelete="CASCADE"), 
            nullable=False
        )
    )
    start_time: datetime = Field(nullable=False)
    end_time: datetime | None = Field(default=None, nullable=True)
    last_seen: datetime = Field(nullable=False)

    app: AppsList | None = Relationship(back_populates="sessions")