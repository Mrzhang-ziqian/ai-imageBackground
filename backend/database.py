"""
Database setup — async SQLAlchemy + aiosqlite
"""
import os
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./data/app.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# ---------- 内置种子用户 ----------
# 这些账号在首次启动时自动创建（已存在则跳过）。
SEED_USERS = [
    {
        "email": "admin@admin.com",
        "username": "Admin",
        "password": os.environ.get("SEED_ADMIN_PASSWORD", "Admin123!"),
        "plan": "pro",
        "quota_daily": 999_999,
        "onboarding_completed": True,
    },
    {
        "email": "test@test.com",
        "username": "TestUser",
        "password": os.environ.get("SEED_TEST_PASSWORD", "Test123456!"),
        "plan": "free",
        "quota_daily": 5,
        "onboarding_completed": False,
    },
]


async def init_db() -> None:
    """Create all tables, then insert seed users if they don't exist."""
    import sqlalchemy as sa

    os.makedirs("data", exist_ok=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # --- 数据库迁移：为已有 history 表添加 status 列 ---
        try:
            await conn.execute(sa.text("ALTER TABLE history ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'completed'"))
            logger.info("数据库迁移: history.status 列已添加")
        except sa.exc.OperationalError:
            pass  # 列已存在，忽略

    # 插入内置账号
    from auth import hash_password
    from models import User

    async with async_session() as db:
        for seed in SEED_USERS:
            existing = (await db.execute(
                select(User).where(User.email == seed["email"])
            )).scalar_one_or_none()
            if existing is None:
                user = User(
                    email=seed["email"],
                    username=seed["username"],
                    hashed_password=hash_password(seed["password"]),
                    plan=seed["plan"],
                    quota_daily=seed["quota_daily"],
                    quota_used=0,
                    onboarding_completed=seed["onboarding_completed"],
                )
                db.add(user)
                logger.info(f"内置用户已创建: {seed['email']} (plan={seed['plan']})")
            else:
                logger.info(f"内置用户已存在，跳过: {seed['email']}")
        await db.commit()

    logger.info("数据库初始化完成 (data/app.db)")


async def get_db() -> AsyncSession:
    """FastAPI dependency: yield an async DB session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
