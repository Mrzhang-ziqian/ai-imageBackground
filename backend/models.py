"""
SQLAlchemy ORM models
"""
from datetime import date, datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, server_default="1")

    # Plan & quota
    plan = Column(String(20), default="free", server_default="'free'")   # free | pro | team
    quota_daily = Column(Integer, default=5, server_default="5")         # daily full-res quota
    quota_used  = Column(Integer, default=0, server_default="0")
    quota_date  = Column(Date, nullable=True)                            # last quota usage date (for daily reset)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
