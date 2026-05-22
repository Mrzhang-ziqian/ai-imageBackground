"""
Authentication — JWT + bcrypt + SQLAlchemy async + IP rate limiter + quota daily reset
"""
import os
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from schemas import UserRegister, UserLogin, UserResponse, TokenResponse

# ---------- Config ----------
SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-in-production-32chars!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# ---------- Security ----------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": str(user_id), "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ---------- Daily Quota Reset ----------

async def check_and_reset_quota(user: User, db: AsyncSession) -> None:
    """如果 quota_date 不是今天，重置 quota_used 为 0 并更新日期。"""
    if user.plan != "free":
        return
    today = date.today()
    if user.quota_date != today:
        user.quota_used = 0
        user.quota_date = today
        await db.commit()


# ---------- Anonymous IP Rate Limiter ----------
# 匿名用户：同一 IP 每天最多 ANON_DAILY_LIMIT 次/remove-bg 请求
ANON_DAILY_LIMIT = 10

# 内存计数器：key = "192.168.1.1:2026-05-22" → count
_anon_counter: dict[str, int] = defaultdict(int)
_anon_counter_lock = __import__("threading").Lock()
_anon_last_cleanup = time.time()


def _check_anon_rate_limit(client_ip: str) -> None:
    """检查匿名 IP 频率限制。超过限制抛出 HTTPException(429)。"""
    today = date.today().isoformat()
    key = f"{client_ip}:{today}"

    global _anon_last_cleanup
    # 每 10 分钟清理一次过期键（非今天日期的键）
    now = time.time()
    if now - _anon_last_cleanup > 600:
        with _anon_counter_lock:
            expired = [k for k in _anon_counter if not k.endswith(f":{today}")]
            for k in expired:
                del _anon_counter[k]
            _anon_last_cleanup = now

    with _anon_counter_lock:
        count = _anon_counter[key]
        if count >= ANON_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"匿名试用次数已用完（每天 {ANON_DAILY_LIMIT} 次），请登录获取每日额度",
            )
        _anon_counter[key] = count + 1


# ---------- Dependencies ----------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Optional auth: returns User or None."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.id == int(user_id)))
    return result.scalar_one_or_none()


async def require_user(current_user: User | None = Depends(get_current_user)) -> User:
    """Required auth: raises 401 if not logged in."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    return current_user


# ---------- Routes ----------

@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check duplicates
    if (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    if (await db.execute(select(User).where(User.username == data.username))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该用户名已被占用")

    user = User(
        email=data.email.strip().lower(),
        username=data.username.strip(),
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.strip().lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(require_user)):
    return UserResponse.model_validate(current_user)
