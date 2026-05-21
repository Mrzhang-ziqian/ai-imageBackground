"""
AI Background Remover - Backend Service
基于 FastAPI + rembg 的图像背景移除 API
支持并发处理多张图片 (线程池)
"""

import io
import gc
import asyncio
import logging
import threading
import time
import traceback
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from PIL import Image
from rembg import remove, new_session

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
app = FastAPI(
    title="AI Background Remover",
    description="基于 rembg 模型的图像背景移除 API",
    version="1.0.0",
)

# CORS 配置 —— 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- 常量 ----------
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
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


# ---------- 健康检查 ----------
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Background Remover"}


# ---------- 全局异常处理 ----------
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """捕获所有未处理异常，输出完整堆栈并返回 JSON 错误"""
    logger.error(f"未捕获异常 [{request.method} {request.url.path}]: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"服务器内部错误: {exc}", "type": type(exc).__name__},
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
async def remove_background(file: UploadFile = File(...)):
    """
    接收图片文件，移除背景后返回透明 PNG。
    AI 推理在线程池中执行，不阻塞事件循环，支持并发。
    """
    # --- 1. 校验文件类型 ---
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file.content_type}，仅支持 PNG、JPEG、WebP",
        )

    # --- 2. 读取文件内容 ---
    try:
        contents = await file.read()
    except Exception as e:
        logger.error(f"读取文件失败: {e}")
        raise HTTPException(status_code=400, detail=f"读取文件失败: {e}")

    # 校验文件大小
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大 (最大 20MB)，当前大小: {len(contents) / 1024 / 1024:.1f}MB",
        )

    # --- 3. 解析图片 ---
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

    original_size = (image.width, image.height)
    logger.info(f"处理图片: {file.filename} (原图 {original_size[0]}x{original_size[1]}, {len(contents) / 1024:.1f}KB)")

    # --- 3.5. 先缩放再转 RGBA，减少峰值内存 ---
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

    # 主动触发垃圾回收，减少内存碎片
    gc.collect()

    # --- 4. AI 移除背景（模型降级 + 重试 + 超时保护） ---
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
        gc.collect()
        raise HTTPException(
            status_code=500,
            detail="服务器内存不足，无法处理该图片。建议：上传更小的图片（长边 ≤ 2000px，文件 ≤ 5MB）",
        )
    except RuntimeError as e:
        logger.error(f"背景移除失败 (全部模型均不可用): {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"背景移除处理失败: {e}")
    except Exception as e:
        logger.error(f"背景移除未知错误: {e}\n{traceback.format_exc()}")
        gc.collect()
        raise HTTPException(status_code=500, detail=f"背景移除处理失败: {e}")

    # --- 4.5. 还原到原始尺寸：提取 alpha mask → 放大 → 应用到原图 ---
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

    # --- 5. 输出为 PNG 字节流 ---
    output = io.BytesIO()
    final_result.save(output, format="PNG")
    output.seek(0)
    result_size_kb = output.getbuffer().nbytes / 1024

    logger.info(f"处理完成: {file.filename} ({final_result.width}x{final_result.height}, {result_size_kb:.1f}KB)")

    return StreamingResponse(
        output,
        media_type="image/png",
        headers={
            "Content-Disposition": f"attachment; filename=removed_bg_{Path(file.filename).stem}.png",
            "X-Image-Width": str(final_result.width),
            "X-Image-Height": str(final_result.height),
            "X-Model-Used": model_label,
        },
    )


# ---------- 启动入口 ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
