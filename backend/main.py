"""
AI Background Remover - Backend Service
基于 FastAPI + rembg 的图像背景移除 API
支持并发处理多张图片 (线程池) + 用户体系 (Phase 5)
"""

import io
import gc
import os
import re
import asyncio
import logging
import threading
import time
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from PIL import Image
from rembg import remove, new_session
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from database import init_db, get_db
from auth import router as auth_router, require_user, check_and_reset_quota
from models import User
from history import router as history_router, save_history_entry, save_history_entry_blocked

# ---------- 日志 ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),           # 输出到 stderr（终端可见）
        logging.FileHandler("backend.log", mode="a", encoding="utf-8"),  # 写入文件
    ],
)
logger = logging.getLogger(__name__)

# ---------- 应用初始化 ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB. Shutdown: cleanup."""
    await init_db()
    logger.info("数据库初始化完成 (data/app.db)")
    yield

app = FastAPI(
    title="AI Background Remover",
    description="基于 rembg 模型的图像背景移除 API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS 配置 —— 从环境变量读取允许来源
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册鉴权路由
app.include_router(auth_router)

# 注册历史记录路由
app.include_router(history_router)

# ---------- 常量 ----------
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
# FastAPI 请求体大小限制（先于内存读取）
MAX_BODY_SIZE = 25 * 1024 * 1024  # 25MB
MAX_IMAGE_DIM = 3000       # 最大允许上传边长（超过拒绝）
PROCESS_MAX_DIM = 800      # AI 处理时缩放到的最大边长（降低内存压力）
AI_TIMEOUT_SECONDS = 90    # AI 推理超时（秒）

# 延迟加载模型 session，首次请求时初始化
# 模型降级链路：u2net（质量最高）→ u2netp（轻量）→ silueta（兜底）
_MODELS = [
    {"name": "u2net",  "label": "U2-Net (Standard)",  "key": "u2net"},
    {"name": "u2netp", "label": "U2-Net (Light)",     "key": "u2netp"},
    {"name": "silueta", "label": "Silueta (Fallback)", "key": "silueta"},
]

_sessions: dict[str, object] = {}
_sessions_lock = threading.Lock()


def _get_or_load_session(model_name: str):
    """获取已缓存的 session，或加载新模型（线程安全）。"""
    if model_name in _sessions:
        return _sessions[model_name]

    with _sessions_lock:
        if model_name in _sessions:  # 双重检查
            return _sessions[model_name]
        logger.info(f"正在加载模型 '{model_name}'，首次使用需下载模型文件...")
        try:
            session = new_session(model_name)
            _sessions[model_name] = session
            logger.info(f"模型 '{model_name}' 加载完成并已缓存")
            return session
        except Exception as e:
            logger.error(f"模型 '{model_name}' 加载失败: {e}")
            raise


def _run_remove_with_fallback(image, max_retries: int = 2):
    """
    运行背景移除，支持模型降级 + 单模型重试。

    降级链路: u2net → u2netp → silueta
    每个模型最多重试 max_retries 次（含首次 = max_retries+1 次尝试）

    返回: (result_image, model_label, was_fallback)
    """
    errors: list[str] = []

    for i, model_info in enumerate(_MODELS):
        model_name = model_info["name"]
        label = model_info["label"]

        # --- 加载模型 ---
        try:
            session = _get_or_load_session(model_name)
        except Exception as e:
            errors.append(f"'{model_name}' 加载失败: {e}")
            continue

        # --- 推理 + 重试 ---
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    backoff = min(0.5 * (2 ** (attempt - 1)), 4.0)
                    logger.warning(
                        f"模型 '{model_name}' 推理重试 {attempt}/{max_retries}，等待 {backoff:.1f}s..."
                    )
                    time.sleep(backoff)

                result = remove(image, session=session)
                was_fallback = i > 0
                logger.info(
                    "推理成功 | 模型=%-8s | 降级=%s | 尝试=%d/%d",
                    model_name,
                    "是" if was_fallback else "否",
                    attempt + 1,
                    max_retries + 1,
                )
                return result, label, was_fallback

            except Exception as e:
                if attempt < max_retries:
                    logger.warning(
                        f"模型 '{model_name}' 推理失败 (第{attempt+1}次): {e}"
                    )
                else:
                    logger.error(
                        f"模型 '{model_name}' 全部 {max_retries+1} 次尝试均失败: {e}"
                    )
                    errors.append(f"'{model_name}': {e}")
                    break  # 尝试下一个模型

    # 所有模型均失败
    detail = "; ".join(errors[-3:]) if errors else "未知错误"
    raise RuntimeError(f"所有 AI 模型均处理失败 ({detail})")


# ---------- 安全响应头中间件 ----------
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ---------- 健康检查 ----------
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Background Remover"}


# ---------- 文件魔数校验 ----------
def _validate_magic_bytes(raw: bytes) -> str | None:
    """校验文件魔数，返回检测到的 MIME 类型；不匹配返回 None。"""
    if len(raw) >= 8 and raw[:8] == b'\x89PNG\r\n\x1a\n':
        return 'image/png'
    if len(raw) >= 3 and raw[:3] == b'\xff\xd8\xff':
        return 'image/jpeg'
    if len(raw) >= 12 and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
        return 'image/webp'
    return None


# ---------- 全局异常处理 ----------
IS_DEV = os.environ.get("ENV", "production").lower() in ("dev", "development")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """捕获所有未处理异常，输出完整堆栈并返回 JSON 错误"""
    logger.error(f"未捕获异常 [{request.method} {request.url.path}]: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"服务器内部错误: {exc}" if IS_DEV else "服务器内部错误，请稍后重试",
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """确保 HTTPException 也输出到日志"""
    logger.warning(f"HTTP {exc.status_code} [{request.method} {request.url.path}]: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail), "type": "HTTPException"},
    )


# ---------- 背景移除 ----------
@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    接收图片文件，移除背景后返回透明 PNG。
    AI 推理在线程池中执行，不阻塞事件循环，支持并发。

    鉴权 & 配额：
    - 必须登录（未认证返回 401）
    - 已登录（free）：每日有限配额（5 次），日期变更自动重置
    - 已登录（pro/team）：无限制
    """
    # --- 1. 配额日重置（已登录免费用户）---
    if current_user.plan == "free":
        await check_and_reset_quota(current_user, db)
    # --- 2. 校验文件类型 ---
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"不支持的文件类型: {file.content_type}，仅支持 PNG、JPEG、WebP",
        )

    # --- 2.5 校验文件大小（FastAPI 请求体限制前置，防止内存耗尽） ---
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件过大 (最大 20MB)，当前大小: {int(content_length) / 1024 / 1024:.1f}MB",
        )

    # --- 3. 校验文件内容 ---
    try:
        contents = await file.read()
    except Exception as e:
        logger.error(f"读取文件失败: {e}")
        raise HTTPException(status_code=400, detail=f"读取文件失败: {e}")

    # 校验文件魔数（防止 MIME 伪造）
    detected_mime = _validate_magic_bytes(contents)
    if detected_mime is None:
        raise HTTPException(status_code=400, detail="无法识别的文件格式，请上传 PNG、JPEG 或 WebP 图片")

    # 校验文件大小
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"文件过大 (最大 20MB)，当前大小: {len(contents) / 1024 / 1024:.1f}MB",
        )

    # --- 4. 解析图片 ---
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()  # 强制解码，提前暴露损坏图片
    except Exception as e:
        logger.error(f"解析图片失败: {e}")
        raise HTTPException(status_code=400, detail="无法解析图片，请确认文件格式正确。")

    # 校验图片尺寸
    if max(image.width, image.height) > MAX_IMAGE_DIM:
        raise HTTPException(
            status_code=400,
            detail=f"图片尺寸过大 (最大 {MAX_IMAGE_DIM}px)，当前: {image.width}x{image.height}",
        )

    # --- 4.2 配额检查 & 原子扣减（防止 TOCTOU 竞态） ---
    if current_user.plan == "free":
        # 使用数据库级别原子更新：WHERE quota_used < quota_daily 确保不会超用
        result = await db.execute(
            update(User)
            .where(User.id == current_user.id, User.quota_used < User.quota_daily)
            .values(quota_used=User.quota_used + 1)
        )
        await db.refresh(current_user)

        if result.rowcount == 0:
            # 配额已满或超用，保存被阻塞的记录
            await save_history_entry_blocked(
                user=current_user,
                db=db,
                original_bytes=contents,
                filename=file.filename or "image.png",
                width=image.width,
                height=image.height,
            )
            raise HTTPException(
                status_code=429,
                detail=f"今日免费配额已用完 ({current_user.quota_used}/{current_user.quota_daily})，请升级至 Pro 版",
            )
        # 配额已原子递增，后续无需再手动 +1
        quota_deducted = True
    else:
        quota_deducted = False

    original_size = (image.width, image.height)
    logger.info(f"处理图片: {file.filename} (原图 {original_size[0]}x{original_size[1]}, {len(contents) / 1024:.1f}KB)")

    # --- 5. 先缩放再转 RGBA，减少峰值内存 ---
    try:
        needs_scale = max(original_size[0], original_size[1]) > PROCESS_MAX_DIM
        if needs_scale:
            ratio = PROCESS_MAX_DIM / max(original_size[0], original_size[1])
            new_w = int(original_size[0] * ratio)
            new_h = int(original_size[1] * ratio)
            # 先缩放原图（可能仍是 RGB/P 等模式），再转 RGBA
            ai_input = image.resize((new_w, new_h), Image.LANCZOS)
            if ai_input.mode != "RGBA":
                ai_input = ai_input.convert("RGBA")
            scaled = True
            logger.info(f"AI 输入已缩放: {original_size[0]}x{original_size[1]} -> {new_w}x{new_h}")
        else:
            # 无需缩放：直接转 RGBA
            if image.mode != "RGBA":
                ai_input = image.convert("RGBA")
            else:
                ai_input = image.copy()
            scaled = False

        # 保留 RGBA 原图（仅缩放时需要，用于最终 alpha 还原）
        if scaled:
            if image.mode != "RGBA":
                original_image = image.convert("RGBA")
            else:
                original_image = image.copy()
        else:
            original_image = ai_input
    except Exception as e:
        logger.error(f"图片预处理失败 (缩放/转RGBA): {e}")
        raise HTTPException(status_code=400, detail=f"图片预处理失败: {e}")

    # 主动触发垃圾回收，减少内存碎片（不阻塞事件循环）
    await asyncio.to_thread(gc.collect)

    # --- 6. AI 移除背景（模型降级 + 重试 + 超时保护） ---
    try:
        ai_result, model_label, was_fallback = await asyncio.wait_for(
            asyncio.to_thread(_run_remove_with_fallback, ai_input),
            timeout=AI_TIMEOUT_SECONDS,
        )
        if was_fallback:
            logger.warning(f"注意：主模型不可用，已降级至 {model_label}")
    except asyncio.TimeoutError:
        logger.error(f"背景移除超时（{AI_TIMEOUT_SECONDS}s）: {file.filename}")
        raise HTTPException(
            status_code=500,
            detail=(
                f"图片处理超时（{AI_TIMEOUT_SECONDS} 秒）。"
                "图片可能过大，建议上传长边 ≤ 2000px 的图片，或稍后重试"
            ),
        )
    except MemoryError:
        logger.error(f"内存不足: {file.filename}")
        await asyncio.to_thread(gc.collect)
        raise HTTPException(
            status_code=500,
            detail="服务器内存不足，无法处理该图片。建议：上传更小的图片（长边 ≤ 2000px，文件 ≤ 5MB）",
        )
    except RuntimeError as e:
        logger.error(f"背景移除失败 (全部模型均不可用): {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"背景移除处理失败: {e}")
    except Exception as e:
        logger.error(f"背景移除未知错误: {e}\n{traceback.format_exc()}")
        await asyncio.to_thread(gc.collect)
        raise HTTPException(status_code=500, detail=f"背景移除处理失败: {e}")

    # --- 6.5. 还原到原始尺寸 ---
    if scaled:
        # 从低分辨率结果中提取 alpha 通道
        alpha_small = ai_result.split()[-1]  # RGBA 的 A 通道
        # 将 alpha mask 放大到原始尺寸
        alpha_full = alpha_small.resize(original_size, Image.LANCZOS)
        # 将放大后的 alpha 应用到原始 RGB 数据
        original_image.putalpha(alpha_full)
        final_result = original_image
        logger.info(f"Alpha mask 已还原到原始尺寸: {original_size[0]}x{original_size[1]}")
    else:
        final_result = ai_result

    # --- 7. 输出为 PNG 字节流 ---
    output = io.BytesIO()
    final_result.save(output, format="PNG")
    output.seek(0)
    result_size_kb = output.getbuffer().nbytes / 1024

    logger.info(f"处理完成: {file.filename} ({final_result.width}x{final_result.height}, {result_size_kb:.1f}KB)")

    # --- 7.5 自动保存处理历史 ---
    result_bytes = output.getvalue()
    history_id = await save_history_entry(
        user=current_user,
        db=db,
        original_bytes=contents,
        result_bytes=result_bytes,
        result_image=final_result,
        filename=file.filename or "image.png",
        model_label=model_label,
    )

    # --- 7.6 配额已原子扣减，仅处理历史保存失败的异常情况 ---
    if current_user.plan == "free" and not quota_deducted:
        # 兜底：如果上面原子更新未执行（理论上不应发生），手动递增
        current_user.quota_used += 1
        await db.flush()
        logger.info(
            f"用户配额更新（兜底）: {current_user.email} ({current_user.quota_used}/{current_user.quota_daily})"
        )
    elif current_user.plan == "free" and quota_deducted:
        logger.info(
            f"用户配额更新: {current_user.email} ({current_user.quota_used}/{current_user.quota_daily})"
        )

    # 安全文件名：仅保留 ASCII 安全字符（字母数字、中文、下划线、连字符、点）
    original_stem = Path(file.filename or "image").stem
    safe_stem = re.sub(r'[^\w\u4e00-\u9fff.-]', '_', original_stem) or "image"
    # RFC 5987: 非 ASCII 文件名使用 filename*=UTF-8 编码
    encoded_filename = quote(f"removed_bg_{safe_stem}.png")

    # 响应头
    resp_headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
        "X-Image-Width": str(final_result.width),
        "X-Image-Height": str(final_result.height),
        "X-Model-Used": model_label,
    }
    resp_headers["X-Quota-Plan"] = current_user.plan
    resp_headers["X-Quota-Used"] = str(current_user.quota_used)
    resp_headers["X-Quota-Daily"] = str(current_user.quota_daily)

    return StreamingResponse(
        output,
        media_type="image/png",
        headers=resp_headers,
    )


# ---------- 启动入口 ----------
if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
