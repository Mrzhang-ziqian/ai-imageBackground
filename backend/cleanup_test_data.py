"""清理脚本 — 删除除 admin 和 test 之外的所有用户及数据"""
import asyncio
import os
import shutil
from sqlalchemy import select, delete

from database import async_session, engine
from models import User, History

# 保留的账号
KEEP_EMAILS = {"admin@admin.com", "test@test.com"}

HISTORY_DIR = "data/history"


async def cleanup():
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
                print(f"[RESET] 已重置 {user.email} (ID={user.id}): quota_used=0")

                # 删除该用户的历史记录及文件
                await db.execute(delete(History).where(History.user_id == user.id))
                user_dir = os.path.join(HISTORY_DIR, str(user.id))
                if os.path.isdir(user_dir):
                    shutil.rmtree(user_dir, ignore_errors=True)
                    print(f"[CLEAN] 已删除历史文件: {user_dir}")
            else:
                # 非保留用户 → 彻底删除
                user_dir = os.path.join(HISTORY_DIR, str(user.id))
                if os.path.isdir(user_dir):
                    shutil.rmtree(user_dir, ignore_errors=True)
                    print(f"[CLEAN] 已删除历史文件: {user_dir}")

                await db.delete(user)
                deleted_count += 1
                print(f"[DELETE] 已删除用户: {user.email} (ID={user.id})")

        await db.commit()

        print(f"\n[DONE] 已删除 {deleted_count} 个用户，保留 admin@admin.com 和 test@test.com")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cleanup())
