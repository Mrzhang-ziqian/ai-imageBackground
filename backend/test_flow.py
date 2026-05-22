"""QA 测试脚本 — 测试配额递增 + 耗尽 + 历史记录"""
import requests
import json

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3IiwiZXhwIjoxNzgwMDQ5MDYzfQ.i9TyGxybfsRIrNa3QEOTNeeIvBShMEnfSUjkXgxRhAU"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
BASE = "http://localhost:8000"

passed = 0
failed = 0

def check(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  [PASS] {name} {detail}")
        passed += 1
    else:
        print(f"  [FAIL] {name} {detail}")
        failed += 1

# ---- Test 1: Upload 4 more to exhaust quota ----
print("\n=== Test 1: 上传 4 次，配额 1→5 ===")
for i in range(4):
    with open("test_red_100x100.png", "rb") as f:
        r = requests.post(f"{BASE}/remove-bg", headers=HEADERS, files={"file": ("t.png", f, "image/png")})
    used = r.headers.get("x-quota-used", "?")
    status = r.status_code
    check(f"上传 #{i+1}", status == 200, f"HTTP {status} quota={used}")

# Verify quota is 5
r = requests.get(f"{BASE}/auth/me", headers=HEADERS)
u = r.json()
check("配额已用 = 5", u["quotaUsed"] == 5, f"quotaUsed={u['quotaUsed']} quotaDaily={u['quotaDaily']}")
check("quotaDaily = 5", u["quotaDaily"] == 5)
check("quotaDaily 非 null/undefined", isinstance(u["quotaDaily"], int))
check("quotaUsed 非 null/undefined", isinstance(u["quotaUsed"], int))

# ---- Test 2: Quota exhausted → 429 ----
print("\n=== Test 2: 配额耗尽后上传 → 应返回 429 ===")
with open("test_red_100x100.png", "rb") as f:
    r = requests.post(f"{BASE}/remove-bg", headers=HEADERS, files={"file": ("t.png", f, "image/png")})
check("返回 429", r.status_code == 429, f"HTTP {r.status_code}")
check("错误信息包含'配额'", "配额" in r.json().get("detail", ""), str(r.json().get("detail", "")[:80]))

# ---- Test 3: 配额耗尽后 blocked 记录应被保存 ----
print("\n=== Test 3: 配额耗尽后 history 应有 blocked 记录 ===")
r = requests.get(f"{BASE}/history", headers=HEADERS)
history = r.json()
blocked_items = [h for h in history if h.get("status") == "blocked"]
check("存在 blocked 记录", len(blocked_items) > 0, f"blocked={len(blocked_items)} total={len(history)}")
if blocked_items:
    check("blocked 记录有缩略图", len(blocked_items[0].get("originalThumb", "") or "") > 0)

# ---- Test 4: Pro 用户测试 (admin@admin.com) ----
print("\n=== Test 4: Pro 用户 (admin) ===")
r = requests.post(f"{BASE}/auth/login", json={"email": "admin@admin.com", "password": "12345678"})
pro_token = r.json()["access_token"]
pro_headers = {"Authorization": f"Bearer {pro_token}"}
pro_user = r.json()["user"]
check("Pro 用户 plan = pro", pro_user["plan"] == "pro", f"plan={pro_user['plan']}")

# Pro user upload (should always succeed)
with open("test_red_100x100.png", "rb") as f:
    r = requests.post(f"{BASE}/remove-bg", headers=pro_headers, files={"file": ("t.png", f, "image/png")})
check("Pro 上传成功", r.status_code == 200, f"HTTP {r.status_code}")
check("Pro quota_used 返回", r.headers.get("x-quota-used") is not None)

# ---- Test 5: History API 基本检查 ----
print("\n=== Test 5: History API ===")
# Clear admin history (for cleanup)
requests.delete(f"{BASE}/history", headers=pro_headers)

# ---- Summary ----
print(f"\n{'='*40}")
print(f"  PASS={passed}  FAIL={failed}")
print(f"{'='*40}")
