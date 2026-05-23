"""
Pydantic request/response schemas
"""
from pydantic import BaseModel, Field


# ---------- Auth ----------

class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, pattern=r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
    username: str = Field(..., min_length=2, max_length=100, pattern=r'^[a-zA-Z0-9_\-\u4e00-\u9fff]+$')
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, pattern=r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    plan: str
    quota_daily: int = Field(..., alias="quotaDaily")
    quota_used: int = Field(..., alias="quotaUsed")
    onboarding_completed: bool = Field(default=False, alias="onboardingCompleted")

    model_config = {"from_attributes": True, "populate_by_name": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------- History ----------

class HistoryItemOut(BaseModel):
    """历史记录列表项（含 base64 缩略图，前端可直接渲染）。"""
    id: int
    filename: str
    timestamp: int                                   # Unix 毫秒
    file_hash: str | None = Field(default=None, alias="fileHash")
    model_used: str = Field(alias="modelUsed")
    original_thumb: str = Field(alias="originalThumb")      # base64 data URL (JPEG)
    result_thumb: str = Field(alias="resultThumb")           # base64 data URL (PNG)
    width: int
    height: int
    status: str = "completed"

    model_config = {"from_attributes": True, "populate_by_name": True}
