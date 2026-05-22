"""
SQLAlchemy ORM models
"""
from datetime import date, datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
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

    # Onboarding
    onboarding_completed = Column(Boolean, default=False, server_default="0")  # 新手引导是否完成

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    history_entries = relationship("History", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")


class History(Base):
    """处理历史记录 — 每次上传（成功或被配额拒绝）后自动保存。"""
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=True)      # 原图 SHA-256，用于去重
    model_used = Column(String(100), nullable=False, default="")
    original_width = Column(Integer, nullable=False)
    original_height = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 处理状态：completed（正常处理完成）/ blocked（配额限制被拒绝）
    status = Column(String(20), default="completed", server_default="'completed'", index=True)

    # 存储路径（相对于 data/history/）
    thumb_original = Column(String(500), nullable=False)
    thumb_result = Column(String(500), nullable=False)
    result_path = Column(String(500), nullable=False)

    user = relationship("User", back_populates="history_entries")
