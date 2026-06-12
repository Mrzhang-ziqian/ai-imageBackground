"""
G24: Stripe Subscription Management

Provides:
- POST /subscription/checkout  → 创建 Checkout Session
- POST /subscription/portal    → 创建 Customer Portal Session
- GET  /subscription/features  → Pro 功能限制查询
- POST /subscription/webhook   → Stripe Webhook 处理
"""
import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth import require_user
from models import User
from schemas import CheckoutRequest, CheckoutResponse, PortalResponse, ProFeaturesResponse
from config import IS_DEV

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscription", tags=["subscription"])

# ---------- Stripe Config ----------
STRIPE_API_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# 价格 ID（从 Stripe Dashboard 获取）
STRIPE_PRO_PRICE_ID = os.environ.get("STRIPE_PRO_PRICE_ID", "")

# Pro 计划配额
PRO_QUOTA_DAILY = 999_999
FREE_QUOTA_DAILY = 5

# 功能限制常量
MAX_BATCH_FREE = 1
MAX_BATCH_PRO = 50
MAX_HISTORY_FREE = 20
MAX_HISTORY_PRO = 9999


def _is_stripe_configured() -> bool:
    """检查 Stripe 是否已配置（非空 API Key + Price ID + stripe 包可导入）"""
    if not (STRIPE_API_KEY and STRIPE_PRO_PRICE_ID):
        return False
    try:
        import stripe  # noqa: F401
        return True
    except ImportError:
        return False


# ---------- Routes ----------

@router.get("/features", response_model=ProFeaturesResponse)
async def get_pro_features():
    """返回 Pro 功能限制配置（公开接口，无需鉴权）"""
    return ProFeaturesResponse(
        max_batch_free=MAX_BATCH_FREE,
        max_batch_pro=MAX_BATCH_PRO,
        max_history_free=MAX_HISTORY_FREE,
        max_history_pro=MAX_HISTORY_PRO,
        edge_tools_pro_only=True,
        high_res_pro_only=True,
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """创建 Stripe Checkout Session，返回支付页面 URL"""
    if current_user.plan == "pro":
        raise HTTPException(status_code=400, detail="您已经是 Pro 用户")

    if not _is_stripe_configured():
        raise HTTPException(
            status_code=503,
            detail="支付系统尚未配置，请联系管理员",
        )

    import stripe
    stripe.api_key = STRIPE_API_KEY

    # 创建或复用 Stripe Customer
    customer_id = current_user.stripe_customer_id
    if not customer_id:
        try:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"user_id": str(current_user.id)},
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            # BUG1 修复: 立即 commit 持久化 customer_id，防止后续失败导致重复 Customer
            await db.commit()
        except stripe.error.StripeError as e:
            logger.error(f"创建 Stripe Customer 失败: {e}")
            # 回滚本地记录，避免脏数据
            await db.rollback()
            raise HTTPException(status_code=500, detail="创建支付客户失败")

    # 构建 success/cancel URL
    base_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    success_url = data.success_url or f"{base_url}/workspace?checkout=success"
    cancel_url = data.cancel_url or f"{base_url}/workspace?checkout=cancel"

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": STRIPE_PRO_PRICE_ID, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(current_user.id)},
            subscription_data={
                "metadata": {"user_id": str(current_user.id)},
            },
        )
        return CheckoutResponse(checkout_url=session.url, session_id=session.id)
    except stripe.error.StripeError as e:
        logger.error(f"创建 Checkout Session 失败: {e}")
        raise HTTPException(status_code=500, detail="创建支付会话失败")


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """创建 Stripe Customer Portal Session（管理订阅）"""
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="无关联的 Stripe 客户，请先订阅")

    if not _is_stripe_configured():
        raise HTTPException(status_code=503, detail="支付系统尚未配置")

    import stripe
    stripe.api_key = STRIPE_API_KEY

    base_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

    try:
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=f"{base_url}/workspace",
        )
        return PortalResponse(portal_url=session.url)
    except stripe.error.StripeError as e:
        logger.error(f"创建 Portal Session 失败: {e}")
        raise HTTPException(status_code=500, detail="创建管理页面失败")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Stripe Webhook 端点 — 处理订阅事件"""
    body = await request.body()

    if not STRIPE_WEBHOOK_SECRET:
        logger.error("Stripe Webhook Secret 未配置，拒绝处理 Webhook")
        # 开发环境允许直接解析，生产环境强制拒绝
        if not IS_DEV:
            raise HTTPException(status_code=500, detail="Webhook secret not configured")
        logger.warning("开发环境：跳过 Stripe webhook 验签")
        import json
        try:
            event = json.loads(body)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid payload")
    else:
        sig_header = request.headers.get("stripe-signature", "")

        import stripe
        stripe.api_key = STRIPE_API_KEY

        try:
            event = stripe.Webhook.construct_event(
                body, sig_header, STRIPE_WEBHOOK_SECRET,
            )
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe Webhook 签名验证失败")
            raise HTTPException(status_code=400, detail="Invalid signature")
        except Exception as e:
            logger.error(f"Stripe Webhook 解析失败: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event.get("type", "")
    logger.info(f"Stripe Webhook: {event_type}")

    # ---------- Webhook 幂等性：基于 Stripe event ID 去重 ----------
    # 使用内存集合（服务重启后清空，但 Stripe 不会跨重启重发），
    # 避免污染业务表（history.file_hash）。
    _processed_events: set[str] = set()
    event_id = event.get("id", "")
    if event_id:
        if event_id in _processed_events:
            logger.info(f"Stripe Webhook 重复事件，已跳过: {event_id}")
            return {"received": True, "duplicate": True}
        _processed_events.add(event_id)
        # 限制内存使用：超过 1000 条时清理旧的（Stripe 通常在 72h 内完成重试）
        if len(_processed_events) > 1000:
            # 保留最近的 500 条
            _processed_events = set(list(_processed_events)[-500:])

    # ---------- 处理订阅事件 ----------
    try:
        if event_type == "checkout.session.completed":
            await _handle_checkout_completed(event, db)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(event, db)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(event, db)
        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(event, db)
        else:
            logger.info(f"Stripe Webhook: 未处理的事件类型 {event_type}")
    except Exception as e:
        logger.error(f"Stripe Webhook 处理失败 ({event_type}): {e}")
        # 不重新抛出：Stripe 会根据 HTTP 状态码决定是否重试
        # 返回 200 避免 Stripe 无限重试导致事件堆积

    return {"received": True}


# ---------- Webhook Handlers ----------

async def _handle_checkout_completed(event: dict, db: AsyncSession):
    """Checkout 完成 → 升级为 Pro"""
    session = event.get("data", {}).get("object", {})
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not customer_id:
        logger.error("checkout.session.completed: 缺少 customer ID")
        return

    # 查找用户
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        logger.error(f"checkout.session.completed: 未找到 Stripe 客户 {customer_id}")
        return

    user.plan = "pro"
    user.quota_daily = PRO_QUOTA_DAILY
    user.stripe_subscription_id = subscription_id
    user.subscription_status = "active"
    await db.commit()
    logger.info(f"用户 {user.email} 已升级为 Pro (subscription: {subscription_id})")


async def _handle_subscription_updated(event: dict, db: AsyncSession):
    """订阅更新（如切换计划）"""
    subscription = event.get("data", {}).get("object", {})
    subscription_id = subscription.get("id")
    status = subscription.get("status")

    if not subscription_id:
        return

    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return

    user.subscription_status = status

    if status == "active":
        user.plan = "pro"
        user.quota_daily = PRO_QUOTA_DAILY
    elif status in ("past_due", "unpaid"):
        # 逾期未付 → 保留原始状态，给宽限期
        user.subscription_status = status
        # 暂不降级，等待 customer.subscription.deleted

    await db.commit()
    logger.info(f"用户 {user.email} 订阅状态更新: {status}")


async def _handle_subscription_deleted(event: dict, db: AsyncSession):
    """订阅取消/过期 → 降级为 free"""
    subscription = event.get("data", {}).get("object", {})
    subscription_id = subscription.get("id")

    if not subscription_id:
        return

    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return

    user.plan = "free"
    user.quota_daily = FREE_QUOTA_DAILY
    user.quota_used = 0
    user.subscription_status = "canceled"
    user.stripe_subscription_id = None
    await db.commit()
    logger.info(f"用户 {user.email} 订阅已取消，降级为 free")


async def _handle_payment_failed(event: dict, db: AsyncSession):
    """支付失败 → 标记 past_due"""
    invoice = event.get("data", {}).get("object", {})
    customer_id = invoice.get("customer")

    if not customer_id:
        return

    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return

    user.subscription_status = "past_due"
    await db.commit()
    logger.warning(f"用户 {user.email} 支付失败，状态设为 past_due")


# ---------- 辅助函数（供其他模块使用） ----------

def get_batch_limit(plan: str) -> int:
    """返回用户批量处理上限"""
    return MAX_BATCH_PRO if plan == "pro" else MAX_BATCH_FREE

def get_history_limit(plan: str) -> int:
    """返回用户历史记录上限"""
    return MAX_HISTORY_PRO if plan == "pro" else MAX_HISTORY_FREE

def is_edge_tools_allowed(plan: str) -> bool:
    """边缘工具是否可用"""
    return plan == "pro"

def is_high_res_download_allowed(plan: str) -> bool:
    """高分辨率下载是否可用"""
    return plan == "pro"
