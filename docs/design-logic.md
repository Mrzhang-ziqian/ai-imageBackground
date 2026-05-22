# 页面逻辑 & 用户策略设计文档

> 创建时间：2026-05-22  
> 版本：v1.0  
> 用途：记录页面交互逻辑、用户流转策略、防滥用机制的详细设计方案，后续迭代持续更新。

---

## 一、背景 — 发现的问题

### 1.1 历史记录可见性问题

**现象**：点「重新上传」后，想回去操作历史记录 → 历史面板消失。

**根因**：模板使用 `v-if="showUpload"` 控制 UploadZone，`v-else` 控制结果区（含 HistoryPanel）。`handleReset()` 将状态回到 `idle` → `showUpload=true` → HistoryPanel 被移出 DOM。

```html
<!-- 当前有问题的结构 -->
<UploadZone v-if="showUpload" ... />
<div v-else>
  ...
  <HistoryPanel />  <!-- handleReset() 后不再渲染 -->
</div>
```

### 1.2 配额绕过问题

**现象**：免费用户用完 5 次后仍可「重新上传」+ 选文件 + 再次请求。

**根因**：
- 前端：429 错误后仍显示「重试」和「重新上传」按钮，浪费用户操作
- 后端：`quota_used` 只增不减，无日重置机制，用完永久卡死

### 1.3 历史记录去重缺失

**现象**：同样照片处理两次 → 两条完全一样的记录（缩略图/文件名相同），用户肉眼看去像旧记录被替换了。

**根因**：`useHistory.add()` 每次生成新 ID，无内容去重。

### 1.4 未登录用户无限白嫖

**现象**：匿名用户不检查配额 → 无痕窗口 → 无限使用。

**根因**：Phase 5 配额检查仅对已登录免费用户生效，`current_user=None` → 跳过所有限制。

---

## 二、页面状态模型

### 2.1 5 种核心状态

```
                  ┌───────────────────────────────────────────────┐
                  │              历史记录面板（始终可见）            │
                  └───────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────▼────┐  选择文件   ┌───────▼───────┐  AI完成   ┌─────────▼────┐
   │  IDLE   │───────────→│   PROCESSING   │─────────→│     DONE     │
   │ 上传区   │            │  进度条 + 预览  │          │ 预览 + 工具  │
   └────┬────┘            └───────┬───────┘          └──────┬───────┘
        │                         │                         │
        │                         │ 失败                    │ 点"重新上传"
        │                    ┌────▼────┐                    │
        │                    │  ERROR  │                    │
        │                    │ 错误卡片 │                    │
        │                    └────┬────┘                    │
        │                         │                         │
        │                    ┌────▼─────────┐               │
        └─←── 回 IDLE ──────│QUOTA_EXHAUST │               │
                 (保留历史)  │ 禁用上传区   │               │
                            │ + 升级引导   │               │
                            └──────────────┘               │
                                                           │
                            └────── 回 IDLE（保留历史）──────┘
```

### 2.2 各状态说明

| 状态 | 触发条件 | 显示内容 | 历史面板 |
|------|----------|----------|:---:|
| `IDLE` | 初始 / `handleReset()` / 配额未耗尽 | UploadZone（拖拽/点击上传） | ✅ 可见 |
| `PROCESSING` | 文件选择后 → `processImage()` 调用中 | 原图预览 + 进度条 | ✅ 可见 |
| `DONE` | AI 推理成功返回 | 左栏预览 + 右栏工具（颜色/模板/边缘/下载） | ✅ 可见 |
| `ERROR` | 网络错误 / 格式不支持 / AI 失败 | 错误卡片 + 场景化按钮组 | ✅ 可见 |
| `QUOTA_EXHAUST` | 返回 429 配额耗尽 | 上传区灰化 + 升级引导 | ✅ 可见 |

### 2.3 ERROR 状态 — 场景化按钮

| 错误类型 | 判断依据 | 显示按钮 |
|----------|----------|----------|
| 网络错误 | `fetch` 失败 / 超时 | [重试] [重新选择文件] |
| AI 推理失败 | 后端 500 | [重试] [重新选择文件] |
| 格式不支持 | 前端校验失败 | [重新选择文件] |
| 文件过大 | 前端尺寸/大小校验 | [重新选择文件] |
| **配额耗尽** | **HTTP 429** | [升级至 Pro] ← **不显示上传入口** |

---

## 三、历史记录始终可见 — 模板重构

### 3.1 目标结构

```html
<div class="app">
  <AppHeader />
  <main>
    <!-- ===== 状态区：根据状态切换 ===== -->
    <UploadZone v-if="viewState === 'idle'" />
    <ProgressOverlay v-else-if="viewState === 'processing'" />
    <ResultLayout v-else-if="viewState === 'done' || viewState === 'error' || viewState === 'quota_exhaust'" />
    
    <!-- ===== 历史面板：始终渲染 ===== -->
    <HistoryPanel
      v-if="history.entries.value.length > 0"
      :entries="history.entries.value"
      ...
    />
  </main>
  <AppFooter />
  <AuthModal />
</div>
```

### 3.2 改动要点

- `HistoryPanel` 提取到 `v-if/v-else` 切换之外，独立 `v-if="历史条目数 > 0"`
- `handleReset()` → 回到 IDLE，不再隐藏历史
- `handleHistoryRestore()` → 切换到 DONE 状态加载历史结果

---

## 四、登录前置策略（C 方案 → 逐步升级到 A）

### 4.1 三层漏斗

```
┌─────────────────────────────────────────────────┐
│  第 1 层：匿名试用                               │
│  · 无需登录，直接拖图处理                         │
│  · 最多 2 次免费（localStorage 计数）            │
│  · 第 1 次后 Toast："免费试用 1/2 次，登录后每天5次" │
│  · 第 2 次后 Toast："试用次数用完，登录获每日5次额度" │
│  · 第 2 次后自动弹出 AuthModal                    │
├─────────────────────────────────────────────────┤
│  第 2 层：免费注册（Free）                        │
│  · 邮箱注册/登录                                  │
│  · 每日 5 次全分辨率下载                         │
│  · 历史记录云端同步                               │
├─────────────────────────────────────────────────┤
│  第 3 层：付费订阅（Pro）                         │
│  · $5/月 全分辨率 + 无限次数 + 批量 + 模板        │
│  · 后续实现（Phase 5 G24）                        │
└─────────────────────────────────────────────────┘
```

### 4.2 防无痕窗口绕过

| 层级 | 措施 | 说明 |
|------|------|------|
| **前端** | localStorage 试用计数 | 无痕窗口的 localStorage 是隔离的，清除站点数据可重置 — 但大多数用户不知道 |
| **后端** | IP + 日期 匿名限额 | 同一 IP 每天最多 10 次匿名请求，超限返回 429 + 引导登录 |
| **后端（后续）** | 设备指纹 / reCAPTCHA | 高频 IP 触发人机验证 |

### 4.3 后端改动

```python
# /remove-bg 匿名请求拦截
if current_user is None:
    # IP + 日期 频率限制
    client_ip = request.client.host
    today = date.today().isoformat()
    key = f"anon:{client_ip}:{today}"
    count = rate_limiter.get(key) or 0
    
    if count >= ANON_DAILY_LIMIT:  # 默认 10
        raise HTTPException(
            status_code=429,
            detail="匿名试用次数已用完，请登录获取每日额度"
        )
    rate_limiter.increment(key, ttl=86400)
```

### 4.4 前端改动

1. 新增 `useQuota.ts` composable — 追踪匿名试用 + 登录配额
2. `UploadZone` — 当 `quotaExhausted` 时灰化禁用 + 显示升级引导
3. `AuthModal` — 匿名第 2 次用完自动弹出
4. `AppHeader` — 实时显示配额条（匿名：试用次数；登录：X/5）

---

## 五、配额日重置机制

### 5.1 后端实现

```python
# models.py
class User(Base):
    quota_daily = Column(Integer, default=5)
    quota_used = Column(Integer, default=0)
    quota_date = Column(Date, nullable=True)  # 上次使用的日期
```

```python
# main.py / auth.py — 每次配额检查时
today = date.today()
if current_user.quota_date != today:
    current_user.quota_used = 0
    current_user.quota_date = today
    await db.commit()
```

### 5.2 前端同步

每次 `/remove-bg` 成功后从响应头读取 `X-Quota-Used` / `X-Quota-Daily`，更新前端配额状态。

---

## 六、历史记录内容去重

### 6.1 策略

基于 **文件内容 SHA-256 哈希 + 处理模型** 去重（非文件名）。

```
相同图片 + 相同模型 → 旧记录移到顶部 + Toast "该图片已有处理记录"
相同图片 + 不同模型 → 新增记录（不同模型结果可能不同）
不同图片           → 正常新增
```

### 6.2 实现

```typescript
// useHistory.ts — add() 增强
import { computeHash } from '@/utils/crypto';

async function add(params: AddParams): Promise<string> {
  const hash = await computeHash(params.originalBlob);
  const model = params.modelUsed || '';
  
  // 查找已有记录（相同 hash + 相同模型）
  const existingIdx = entries.value.findIndex(
    e => e.fileHash === hash && e.modelUsed === model
  );
  
  if (existingIdx !== -1) {
    // 移到顶部
    const [existing] = entries.value.splice(existingIdx, 1);
    entries.value.unshift({ ...existing, timestamp: Date.now() });
    persist();
    return existing.id;
  }
  
  // 新记录
  const entry = { ...params, id: generateId(), fileHash: hash };
  entries.value.unshift(entry);
  // 上限裁剪 ...
  persist();
  return entry.id;
}
```

- **性能考虑**：SHA-256 计算在 Web Worker 中执行，不阻塞主线程
- **降级**：浏览器不支持 → 退化为简单哈希（如采样像素）

---

## 七、配额前端追踪

### 7.1 useQuota composable（新增）

```typescript
// composables/useQuota.ts
interface QuotaState {
  trialUsed: number;      // 匿名试用次数（localStorage）
  trialMax: number;       // 最大试用次数 (2)
  dailyUsed: number;      // 今日已用（从后端同步）
  dailyMax: number;       // 每日上限 (5)
  plan: 'free' | 'pro' | null;
  exhausted: ComputedRef<boolean>;
}
```

### 7.2 数据来源

| 场景 | 来源 |
|------|------|
| 匿名试用计数 | localStorage `trial_count` + `trial_date`（日期变了重置） |
| 登录用户配额 | `/auth/me` 返回 + `/remove-bg` 响应头 `X-Quota-*` |
| 配额耗尽判断 | `plan === 'free' && dailyUsed >= dailyMax` |

---

## 八、实施清单

| # | 文件 | 改动 | 类型 | 工作量 |
|---|------|------|------|:--:|
| 1 | `App.vue` | 模板重构：HistoryPanel 提取到状态切换之外 | 重构 | 中 |
| 2 | `App.vue` | ERROR 卡片场景化按钮（429 → 隐藏上传入口） | 优化 | 小 |
| 3 | `App.vue` | 新增 `QUOTA_EXHAUST` 状态 + UploadZone 禁用 | 新增 | 中 |
| 4 | `App.vue` | `handleRetry()` 成功后调用 `saveToHistory()` | 修复 | 小 |
| 5 | `useHistory.ts` | 内容哈希去重 | 增强 | 中 |
| 6 | `utils/crypto.ts` | SHA-256 哈希工具（Web Worker） | 新增 | 小 |
| 7 | `useQuota.ts` | 配额状态管理 composable | 新增 | 中 |
| 8 | `UploadZone.vue` | 配额耗尽时灰化 + 升级引导 | 增强 | 小 |
| 9 | `AuthModal.vue` | 匿名试用2次后自动弹出 | 增强 | 小 |
| 10 | `AppHeader.vue` | 实时配额条 | 增强 | 小 |
| 11 | `backend/main.py` | 匿名 IP 频率限制 + 配额日重置 | 增强 | 中 |
| 12 | `backend/models.py` | User 表增加 `last_quota_date` 字段 | 增强 | 小 |
| 13 | `backend/auth.py` | 配额日重置逻辑 | 增强 | 小 |
| 14 | `api.ts` | 读取 `X-Quota-*` 响应头 | 增强 | 小 |

---

## 九、里程碑

| 版本 | 内容 | 状态 |
|------|------|:--:|
| v1.0 | 初始设计：问题诊断 + 5 状态模型 + 登录前置 C 方案 + 模板重构 | ✅ 当前 |
| v1.1 | （待实施后）实施完成 + 测试记录 | ❌ 待实施 |
| v2.0 | （后续）引入 Google/微信 OAuth 一键登录 | ❌ 远期 |
| v2.1 | （后续）设备指纹 / reCAPTCHA 防刷 | ❌ 远期 |

---

> **核心理念**：让用户先尝到甜头（匿名 2 次），再引导注册（每日 5 次），最后付费升级（无限 Pro）。  
> **防滥用底线**：IP 频率限制 + localStorage 计数，确保即使用户知道怎么绕，成本也足够高。
