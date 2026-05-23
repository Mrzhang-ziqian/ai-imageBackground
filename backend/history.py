"""
处理历史记录 API — 数据库存储 + 文件系统
"""
import asyncio
import base64
import io
import os
import hashlib
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_user
from models import User, History
from schemas import HistoryItemOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["history"])

HISTORY_DIR = "data/history"
MAX_HISTORY_PER_USER = 100      # 每个用户最多保留成功记录
MAX_BLOCKED_PER_USER = 5        # 被配额拒绝的记录最多保留条数（防止刷接口）
THUMB_SIDE = 120


def _thumb_bytes(img: Image.Image, fmt: str, max_side: int = THUMB_SIDE) -> bytes:
    """生成缩略图字节流。"""
    scale = min(1.0, max_side / max(img.width, img.height))
    if scale < 1.0:
        thumb = img.resize(
            (int(img.width * scale), int(img.height * scale)),
            Image.LANCZOS,
        )
    else:
        thumb = img.copy()

    buf = io.BytesIO()
    if thumb.mode == "RGBA" and fmt == "JPEG":
        # JPEG 不支持透明通道 → 合成白底
        bg = Image.new("RGB", thumb.size, (255, 255, 255))
        bg.paste(thumb, mask=thumb.split()[-1])
        bg.save(buf, format="JPEG", quality=60)
    else:
        # P1-11: 支持 WebP 缩略图保留原格式，避免线条图/截图的 JPEG 伪影
        save_fmt = fmt if fmt in ("JPEG", "PNG", "WEBP") else "JPEG"
        thumb.save(buf, format=save_fmt, quality=60)
    buf.seek(0)
    return buf.getvalue()


def _data_url(blob: bytes, mime: str) -> str:
    """将字节编码为 base64 data URL。"""
    return f"data:{mime};base64,{base64.b64encode(blob).decode()}"


def _mime_from_path(path: str) -> str:
    """从文件扩展名推断 MIME 类型。"""
    ext = os.path.splitext(path)[1].lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }.get(ext, "image/jpeg")


async def _read_thumb_async(path: str) -> tuple[str, str]:
    """P1-4: 异步读取缩略图文件，避免阻塞事件循环。返回 (base64_data_url, mime)。"""
    try:
        blob = await asyncio.to_thread(_sync_read_file, path)
        if blob:
            return _data_url(blob, _mime_from_path(path)), _mime_from_path(path)
    except Exception:
        pass
    return "", ""


def _sync_read_file(path: str) -> bytes | None:
    """同步读取文件内容（供 asyncio.to_thread 使用）。"""
    try:
        with open(path, "rb") as f:
            return f.read()
    except Exception:
        return None


# ──────────────── Routes ────────────────

@router.get("", response_model=list[HistoryItemOut])
async def list_history(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """返回当前用户的历史记录列表（最新在前）。"""
    result = await db.execute(
        select(History)
        .where(History.user_id == current_user.id)
        .order_by(History.created_at.desc())
        .limit(MAX_HISTORY_PER_USER)
    )
    entries = result.scalars().all()

    items: list[HistoryItemOut] = []
    for e in entries:
        # P1-4: 异步读取缩略图文件，不阻塞事件循环
        # P1-11: MIME 类型从文件扩展名推断，而非硬编码
        orig_thumb_b64, _ = await _read_thumb_async(e.thumb_original)
        result_thumb_b64, _ = await _read_thumb_async(e.thumb_result)

        items.append(HistoryItemOut(
            id=e.id,
            filename=e.filename,
            timestamp=int(e.created_at.timestamp() * 1000),
            file_hash=e.file_hash,
            model_used=e.model_used,
            original_thumb=orig_thumb_b64,
            result_thumb=result_thumb_b64,
            width=e.original_width,
            height=e.original_height,
            status=e.status or "completed",
        ))

    return items


@router.get("/{history_id}/result")
async def get_result_image(
    history_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """返回历史记录的结果原图（PNG）。"""
    result = await db.execute(
        select(History).where(History.id == history_id)
    )
    entry = result.scalar_one_or_none()
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="记录不存在")

    if not os.path.isfile(entry.result_path):
        raise HTTPException(status_code=404, detail="文件已丢失")

    return FileResponse(entry.result_path, media_type="image/png")


@router.delete("/{history_id}")
async def delete_history(
    history_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """删除一条历史记录及其文件。"""
    result = await db.execute(
        select(History).where(History.id == history_id)
    )
    entry = result.scalar_one_or_none()
    if not entry or entry.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="记录不存在")

    # P1-3: 先删 DB 再清理文件（DB 操作可回滚，文件不可回滚）
    await db.delete(entry)
    await db.commit()

    for path in (entry.thumb_original, entry.thumb_result, entry.result_path):
        try:
            if path and os.path.isfile(path):
                os.remove(path)
        except Exception:
            pass

    return {"ok": True}


@router.delete("")
async def clear_history(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """清空当前用户所有历史记录及文件。"""
    result = await db.execute(
        select(History).where(History.user_id == current_user.id)
    )
    entries = result.scalars().all()

    # P0-4/P1-3: 先删 DB 再清理文件
    await db.execute(
        delete(History).where(History.user_id == current_user.id)
    )
    await db.commit()

    for entry in entries:
        for path in (entry.thumb_original, entry.thumb_result, entry.result_path):
            try:
                if path and os.path.isfile(path):
                    os.remove(path)
            except Exception:
                pass

    return {"ok": True, "deleted": len(entries)}


# ──────────────── 工具函数（供 main.py 调用） ────────────────

async def save_history_entry_blocked(
    user: User,
    db: AsyncSession,
    original_bytes: bytes,
    filename: str,
    width: int,
    height: int,
) -> int | None:
    """配额超出时保存被阻塞的记录（仅原图信息 + 缩略图，无结果）。"""
    try:
        import hashlib as hlib
        file_hash = hlib.sha256(original_bytes).hexdigest()

        # 去重：当天同一 hash 不重复保存
        from datetime import datetime, timezone, timedelta
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing = (await db.execute(
            select(History).where(
                History.user_id == user.id,
                History.file_hash == file_hash,
                History.status == "blocked",
                History.created_at >= today_start,
            )
        )).scalar_one_or_none()
        if existing:
            return existing.id

        # 清理超过上限的旧 blocked 记录
        blocked_rows = (await db.execute(
            select(History.id)
            .where(History.user_id == user.id, History.status == "blocked")
            .order_by(History.created_at.desc())
            .offset(MAX_BLOCKED_PER_USER - 1)
            .limit(100)
        )).all()
        stale_ids = [r[0] for r in blocked_rows]
        if stale_ids:
            # P0-4: 先收集路径 → 删 DB → commit → 再清理文件
            stale_entries = (await db.execute(
                select(History).where(History.id.in_(stale_ids))
            )).scalars().all()
            stale_paths: list[str] = []
            for se in stale_entries:
                for p in (se.thumb_original, se.thumb_result, se.result_path):
                    if p:
                        stale_paths.append(p)
            await db.execute(delete(History).where(History.id.in_(stale_ids)))
            await db.commit()
            for p in stale_paths:
                try:
                    if os.path.isfile(p):
                        os.remove(p)
                except Exception:
                    pass

        # 生成原图缩略图
        orig_img = Image.open(io.BytesIO(original_bytes))
        thumb_orig_bytes = _thumb_bytes(orig_img, "JPEG")

        # 目录
        user_dir = os.path.join(HISTORY_DIR, str(user.id))
        os.makedirs(user_dir, exist_ok=True)

        # P0-3 (same pattern): flush to get ID → write files → commit
        entry = History(
            user_id=user.id,
            filename=filename or "image.png",
            file_hash=file_hash,
            model_used="",
            original_width=width,
            original_height=height,
            status="blocked",
            thumb_original="",
            thumb_result="",
            result_path="",
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)

        # 写入原图缩略图文件
        thumb_orig_path = os.path.join(user_dir, f"{entry.id}_thumb_orig.jpg")
        with open(thumb_orig_path, "wb") as f:
            f.write(thumb_orig_bytes)

        entry.thumb_original = thumb_orig_path
        await db.commit()

        logger.info(f"被阻塞历史记录已保存: user={user.id} id={entry.id} file={filename}")
        return entry.id

    except Exception:
        logger.exception("保存被阻塞历史记录失败")
        return None


async def save_history_entry(
    user: User,
    db: AsyncSession,
    original_bytes: bytes,
    result_bytes: bytes,
    result_image: Image.Image,
    filename: str,
    model_label: str,
) -> int | None:
    """保存历史记录：生成缩略图、写文件、建 DB 记录。返回 history ID。"""
    try:
        from sqlalchemy import update
        from datetime import datetime, timezone

        # 计算原图 SHA-256
        file_hash = hashlib.sha256(original_bytes).hexdigest()

        # 去重检查：同一用户、同一哈希、同一模型 → 仅匹配成功记录
        # blocked 记录不参与去重（用户再次上传同一张图时应允许重新处理）
        existing = (await db.execute(
            select(History).where(
                History.user_id == user.id,
                History.file_hash == file_hash,
                History.model_used == model_label,
                History.status != "blocked",
            )
        )).scalar_one_or_none()

        if existing:
            # 已存在成功记录 → 更新时间戳（移到最前）
            await db.execute(
                update(History)
                .where(History.id == existing.id)
                .values(created_at=datetime.now(timezone.utc))
            )
            await db.commit()
            return existing.id

        # 如果存在同一 hash 的 blocked 记录，删除它（为新成功记录让路）
        blocked_existing = (await db.execute(
            select(History).where(
                History.user_id == user.id,
                History.file_hash == file_hash,
                History.status == "blocked",
            )
        )).scalar_one_or_none()

        if blocked_existing:
            for path in (blocked_existing.thumb_original, blocked_existing.thumb_result, blocked_existing.result_path):
                try:
                    if path and os.path.isfile(path):
                        os.remove(path)
                except Exception:
                    pass
            await db.delete(blocked_existing)
            await db.commit()
            logger.info(f"已清理 blocked 记录 (id={blocked_existing.id})，即将写入新成功记录")

        # 清理超过上限的旧记录
        # T6: limit 从 1000 缩小到 20，避免一次删除过多记录
        count_result = await db.execute(
            select(History.id)
            .where(History.user_id == user.id)
            .order_by(History.created_at.desc())
            .offset(MAX_HISTORY_PER_USER - 1)
            .limit(20)
        )
        stale_ids = [row[0] for row in count_result.all()]
        if stale_ids:
            # P0-4: 先收集路径 → 删 DB → commit → 再清理文件
            stale_entries = (await db.execute(
                select(History).where(History.id.in_(stale_ids))
            )).scalars().all()
            stale_paths: list[str] = []
            for se in stale_entries:
                for p in (se.thumb_original, se.thumb_result, se.result_path):
                    if p:
                        stale_paths.append(p)
            await db.execute(delete(History).where(History.id.in_(stale_ids)))
            await db.commit()
            for p in stale_paths:
                try:
                    if os.path.isfile(p):
                        os.remove(p)
                except Exception:
                    pass

        # 生成缩略图
        orig_img = Image.open(io.BytesIO(original_bytes))
        thumb_orig_bytes = _thumb_bytes(orig_img, "JPEG")
        thumb_result_bytes = _thumb_bytes(result_image, "PNG")

        # 创建目录
        user_dir = os.path.join(HISTORY_DIR, str(user.id))
        os.makedirs(user_dir, exist_ok=True)

        # P0-3: 先 flush 获取 ID → 写文件 → 最后 commit
        # 避免 commit 后文件写入失败产生孤儿 DB 记录
        entry = History(
            user_id=user.id,
            filename=filename,
            file_hash=file_hash,
            model_used=model_label,
            original_width=orig_img.width,
            original_height=orig_img.height,
            thumb_original="",
            thumb_result="",
            result_path="",
        )
        db.add(entry)
        await db.flush()  # 获取 ID，不提交事务
        await db.refresh(entry)

        # 写入文件（使用 flush 获取的 ID）
        thumb_orig_path = os.path.join(user_dir, f"{entry.id}_thumb_orig.jpg")
        thumb_result_path = os.path.join(user_dir, f"{entry.id}_thumb_result.png")
        result_path = os.path.join(user_dir, f"{entry.id}_result.png")

        with open(thumb_orig_path, "wb") as f:
            f.write(thumb_orig_bytes)
        with open(thumb_result_path, "wb") as f:
            f.write(thumb_result_bytes)
        with open(result_path, "wb") as f:
            f.write(result_bytes)

        # 更新路径 + 统一提交
        entry.thumb_original = thumb_orig_path
        entry.thumb_result = thumb_result_path
        entry.result_path = result_path
        await db.commit()

        logger.info(f"历史记录已保存: user={user.id} id={entry.id} file={filename}")
        return entry.id

    except Exception:
        logger.exception("保存历史记录失败")
        return None
