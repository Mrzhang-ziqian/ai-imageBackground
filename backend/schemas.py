"""
Pydantic request/response schemas
"""
from datetime import datetime
from pydantic import BaseModel, Field


# ---------- Auth ----------

# 更严格的邮箱正则：禁止本地部分/域名以点或横线开头结尾、禁止连续点号
_EMAIL_RE = r'^[a-zA-Z0-9][a-zA-Z0-9._%+\-]*@[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}$'

class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, pattern=_EMAIL_RE)
    username: str = Field(..., min_length=2, max_length=100, pattern=r'^[a-zA-Z0-9_\-\u4e00-\u9fff]+$')
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, pattern=_EMAIL_RE)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    plan: str
    quota_daily: int = Field(..., alias="quotaDaily")
    quota_used: int = Field(..., alias="quotaUsed")
    onboarding_completed: bool = Field(default=False, alias="onboardingCompleted")
    subscription_status: str | None = Field(default=None, alias="subscriptionStatus")

    model_config = {"from_attributes": True, "populate_by_name": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------- G24: Subscription ----------

class CheckoutRequest(BaseModel):
    """创建 Stripe Checkout Session 请求"""
    plan: str = Field(default="pro", pattern=r"^(pro)$")  # 目前只支持 pro
    success_url: str = Field(default="")
    cancel_url: str = Field(default="")


class CheckoutResponse(BaseModel):
    """Stripe Checkout Session 响应"""
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    """Stripe Customer Portal 响应"""
    portal_url: str


class ProFeaturesResponse(BaseModel):
    """Pro 功能限制（供前端查询）"""
    max_batch_free: int = 1        # 免费用户批量上限
    max_batch_pro: int = 50        # Pro 用户批量上限
    max_history_free: int = 20     # 免费用户历史上限
    max_history_pro: int = 9999    # Pro 用户历史上限
    edge_tools_pro_only: bool = True  # 边缘工具仅 Pro 可用
    high_res_pro_only: bool = True    # 高分辨率下载仅 Pro 可用


# ---------- History ----------

class HistoryItemOut(BaseModel):
    """历史记录列表项（含 base64 缩略图，前端可直接渲染）。"""
    id: int
    filename: str
    timestamp: int                                   # Unix 毫秒
    file_hash: str = Field(alias="fileHash")
    model_used: str = Field(alias="modelUsed")
    original_thumb: str = Field(alias="originalThumb")      # base64 data URL (JPEG)
    result_thumb: str = Field(alias="resultThumb")           # base64 data URL (PNG)
    width: int
    height: int
    status: str = "completed"

    model_config = {"from_attributes": True, "populate_by_name": True}
