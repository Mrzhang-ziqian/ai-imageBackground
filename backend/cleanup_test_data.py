"""清理脚本 — 删除除 admin 和 test 之外的所有用户及数据"""
import asyncio
import os
import shutil
from sqlalchemy import select, delete
import sqlalchemy as sa

from database import async_session, engine, Base
from models import User, History

# 保留的账号
KEEP_EMAILS = {"admin@admin.com", "test@test.com"}

HISTORY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "history")


async def cleanup():
    # 确保表结构存在并运行迁移
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # G24: 添加 Stripe 订阅相关列（如果不存在）
        try:
            result = await conn.execute(sa.text("PRAGMA table_info('users')"))
            columns = [row[1] for row in result.fetchall()]
            if 'stripe_customer_id' not in columns:
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255)"))
                print("[MIGRATE] 添加列: users.stripe_customer_id")
            if 'stripe_subscription_id' not in columns:
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255)"))
                print("[MIGRATE] 添加列: users.stripe_subscription_id")
            if 'subscription_status' not in columns:
                await conn.execute(sa.text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20)"))
                print("[MIGRATE] 添加列: users.subscription_status")
        except sa.exc.OperationalError:
            pass

    async with async_session() as db:
        # 1. 查找所有用户
        result = await db.execute(select(User))
        all_users = result.scalars().all()

        deleted_count = 0
        for user in all_users:
            if user.email in KEEP_EMAILS:
                # 保留用户 → 重置配额和历史
                user.quota_used = 0
                user.quota_date = None
                user.stripe_customer_id = None
                user.stripe_subscription_id = None
                user.subscription_status = None
                print(f"[RESET] 已重置 {user.email} (ID={user.id}): quota_used=0, stripe cleared")

                # 删除该用户的历史记录及文件
                await db.execute(delete(History).where(History.user_id == user.id))
                user_dir = os.path.join(HISTORY_DIR, str(user.id))
                if os.path.isdir(user_dir):
                    try:
                        shutil.rmtree(user_dir)
                        print(f"[CLEAN] 已删除历史文件: {user_dir}")
                    except OSError as e:
                        print(f"[WARN] 删除历史文件失败 {user_dir}: {e}")
            else:
                # 非保留用户 → 彻底删除
                user_dir = os.path.join(HISTORY_DIR, str(user.id))
                if os.path.isdir(user_dir):
                    try:
                        shutil.rmtree(user_dir)
                        print(f"[CLEAN] 已删除历史文件: {user_dir}")
                    except OSError as e:
                        print(f"[WARN] 删除历史文件失败 {user_dir}: {e}")

                await db.delete(user)
                deleted_count += 1
                print(f"[DELETE] 已删除用户: {user.email} (ID={user.id})")

        await db.commit()

        print(f"\n[DONE] 已删除 {deleted_count} 个用户，保留 admin@admin.com 和 test@test.com")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cleanup())
