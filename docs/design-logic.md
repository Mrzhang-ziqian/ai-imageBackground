# 页面逻辑 & 用户策略设计文档

> 创建时间：2026-05-22  
> 版本：v2.0  
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

**现象**：
```
打开无痕 → 免费使用 2 次（localStorage） → 用完 → 弹登录
关闭无痕 → 重新打开 → localStorage 清零 → 又是 2 次
换浏览器 → 同理
```

**根因分析**：
- 前端 localStorage 是无痕模式天然隔离的——无法修复
- 后端 IP 限频（10 次/日）可被 VPN 绕过，且与前端 2 次不一致
- 设备指纹方案：换浏览器指纹变化 → 依然可绕

**终局结论**：匿名免费试用的任何前端/后端防御都是军备竞赛，对手只是一个浏览器开关。唯一的不可绕过方案是 **强制登录**。

---

## 二、策略决策：废弃匿名试用 → 强制登录

### 2.1 v1.0（废弃） vs v2.0（当前）

| 维度 | v1.0（C 方案） | v2.0（强制登录） |
|------|:--:|:--:|
| 匿名体验 | 2 次免费试用 | ❌ 无匿名入口 |
| 首次体验 | 直接上传 → 2 次后弹登录 | Landing Page 展示 → 注册 → 使用 |
| 无痕重置 | ✅ 可绕过 | ❌ 不可绕过 |
| 换浏览器 | ✅ 可绕过 | ❌ 不可绕过（登录即恢复） |
| 防滥用维护成本 | 持续军备竞赛 | 零 |
| 用户转化路径 | 用 2 次 → 被截断 → 反感 | 看 demo → 注册 → 每天 5 次 → 体验完整 |

### 2.2 新用户完整路径

```
首次访问
    ↓
Landing Page（Hero + Demo 滑块 + 功能介绍 + Pro 预告）
    ↓
点击「免费开始使用」
    ↓
AuthModal（默认注册 Tab）
    ↓
注册成功 → JWT 存入 localStorage → 自动进入主应用
    ↓
【首次登录 → 新手引导（3 步 spotlight，可跳过）】
    ↓
主应用完整功能（每日 5 次）
    ↓
配额耗尽 → 配额耗尽卡片（升级 Pro 引导）
```

### 2.3 回访用户路径

```
再次访问 → localStorage 有 token
    ↓
fetchMe() → 有效 → 直接进主应用（跳过 Landing Page）
fetchMe() → 过期 → 弹出 AuthModal 登录
```

---

## 三、页面状态模型

### 3.1 两层切换

```
┌──────────────────────────────────────────────────┐
│  Layer 0：认证层（App.vue 顶层）                   │
│                                                  │
│  isAuthenticated = false → <LandingPage />        │
│  isAuthenticated = true  → <MainApp />            │
│                                                  │
│  切换：注册/登录成功后 isAuthenticated → true       │
│        logout() → isAuthenticated → false         │
└──────────────────────────────────────────────────┘
                         │
            (isAuthenticated = true)
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│  Layer 1：视图层（MainApp 内部）                   │
│                                                  │
│  ┌────────────────────────────────────────┐      │
│  │        历史记录面板（始终可见）            │      │
│  └────────────────────────────────────────┘      │
│                    │                              │
│   ┌────▼────┐  ┌───▼───┐  ┌───▼───┐  ┌──▼──┐   │
│   │  IDLE   │  │PROCESS│  │ DONE  │  │ERROR│   │
│   │ 上传区   │  │进度条  │  │预览+工具│  │错误  │   │
│   └─────────┘  └───────┘  └───────┘  └─────┘   │
│                    │                              │
│   ┌────────▼───────┐                              │
│   │ QUOTA_EXHAUST  │  ← HTTP 429                 │
│   │ 禁用上传区      │                              │
│   │ + Pro 引导     │                              │
│   └────────────────┘                              │
└──────────────────────────────────────────────────┘
```

### 3.2 5 种视图状态（仅已登录）

| 状态 | 触发条件 | 显示内容 | 历史面板 |
|------|----------|----------|:---:|
| `IDLE` | 初始 / `handleReset()` / 配额未耗尽 | UploadZone（拖拽/点击上传） | ✅ 可见 |
| `PROCESSING` | 文件选择后 → `processImage()` 调用中 | 原图预览 + 进度条 | ✅ 可见 |
| `DONE` | AI 推理成功返回 | 左栏预览 + 右栏工具（颜色/模板/边缘/下载） | ✅ 可见 |
| `ERROR` | 网络错误 / 格式不支持 / AI 失败 | 错误卡片 + 场景化按钮组 | ✅ 可见 |
| `QUOTA_EXHAUST` | 返回 429 配额耗尽 | 上传区灰化 + Pro 引导卡片 | ✅ 可见 |

### 3.3 ERROR 状态 — 场景化按钮

| 错误类型 | 判断依据 | 显示按钮 |
|----------|----------|----------|
| 网络错误 | `fetch` 失败 / 超时 | [重试] [重新选择文件] |
| AI 推理失败 | 后端 500 | [重试] [重新选择文件] |
| 格式不支持 | 前端校验失败 | [重新选择文件] |
| 文件过大 | 前端尺寸/大小校验 | [重新选择文件] |
| 未认证 (401) | token 过期 | [重新登录] |
| **配额耗尽** | **HTTP 429** | [升级至 Pro] ← **不显示上传入口** |

---

## 四、Landing Page 设计

### 4.1 页面结构

```
┌─────────────────────────────────────────────┐
│  Logo               [功能] [定价]  [登录]    │  ← 精简导航
├─────────────────────────────────────────────┤
│                                             │
│        🎨 AI 一键移除背景                     │  ← 入场动画：从下浮入 (300ms)
│    上传即处理 · 高清输出 · 每日免费 5 次        │  ← 副标题延迟 150ms 淡入
│                                             │
│    [ 免费开始使用 ]    [ 已有账号? 登录 ]       │
│                                             │
├─────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐      │
│  │   Before     │ ← → │   After      │      │  ← 自动演示一次(800ms)
│  │  (原图)       │     │  (去背景)      │      │    然后可手动拖拽
│  └──────────────┘     └──────────────┘      │
│        拖拽中间滑块对比效果                    │
├─────────────────────────────────────────────┤
│  功能卡片（Intersection Observer 逐张浮入）    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ 高清  │ │ 批量  │ │ 模板  │ │ 精修  │      │  ← 每张延迟 100ms
│  │ 分辨率 │ │ 处理  │ │ 背景  │ │ 边缘  │      │     staggered 入场
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ PNG/  │ │ 移动  │ │ 对比  │                │
│  │ WebP  │ │ 适配  │ │ 滑块  │                │
│  └──────┘ └──────┘ └──────┘                │
├─────────────────────────────────────────────┤
│  ✨ Pro 计划即将上线                           │  ← Pro 占位卡片（金色渐变）
│  无限使用 · 批量处理 · 专属模板 · 优先支持       │     点击 → Toast "Pro 即将上线"
├─────────────────────────────────────────────┤
│  Footer：© 2026 AI Background Remover       │
└─────────────────────────────────────────────┘
```

### 4.2 动画策略（三层体系）

| 层级 | 触发时机 | 动画 | 目的 |
|------|----------|------|------|
| **入场层** | 页面加载 0~800ms | Hero 标题 `translateY(20px) → 0` + `opacity 0→1` | 第一时间抓住注意力 |
| **演示层** | 入场完成后 +800ms | Before/After 滑块自动滑动一次 （`left: 0 → 50%`，800ms ease-in-out） | 零操作展示核心能力 |
| **浏览层** | 滚动触发（Intersection Observer） | 功能卡片从下 staggered 浮入（每张 delay 100ms） | 浏览时有节奏感 |

**统一动效参数**：
- 时长：300~400ms（入场）/ 800ms（demo 自动滑动）
- Easing：`cubic-bezier(0.34, 1.56, 0.64, 1)`（微弹性回弹）
- 原则：动效服务于信息传递，不拖沓

### 4.3 Demo 对比图的实现

```
使用内置静态图片（放在 frontend/public/demo/）
  ├── demo_before.png  （原图素材）
  └── demo_after.png   （去背景结果）

组件 CompareSlider 复用 → 初始自动滑动一次 → 用户可自由拖拽
```

零依赖，视觉冲击力最大化。

### 4.4 风格切换（远期规划 — Phase 6）

```
CSS 变量体系（本次搭建好）：
  --color-bg-primary
  --color-text-primary
  --color-accent
  --color-surface
  ...

预设主题（Phase 6 实现）：
  ├── 默认蓝紫（当前）
  ├── 暗夜模式（G18）
  ├── 暖橙
  └── 极简白

存储：用户偏好存 localStorage + 后端 User 表 theme 字段
```

本次开发：先搭建 CSS 变量体系，改值即可换肤。

---

## 五、新手引导

### 5.1 设计原则

- **轻触式**：3 步 spotlight，不超过 30 秒
- **可跳过**：每步都有 [跳过引导] 按钮，尊重用户
- **只显示一次**：`onboarding_completed` 标记持久化到后端

### 5.2 3 步引导流程

```
第 1 步：上传区高亮
┌──────────────────────────────────────┐
│  🔦 Spotlight 高亮上传区              │
│  其余区域半透明深色遮罩（opacity 0.6）  │
│                                      │
│  ┌──────────────────────────┐        │
│  │  📤 拖拽图片到此处         │        │
│  │  或点击选择文件            │        │
│  │  支持 PNG / JPG / WebP   │        │
│  └──────────────────────────┘        │
│                                      │
│  [ 跳过引导 ]          [ 下一步 → ]   │
└──────────────────────────────────────┘

第 2 步：工具栏高亮（背景颜色选择器区域）
  文字："选择纯色背景或模板，实时预览"

第 3 步：下载按钮高亮
  文字："一键下载 PNG/WebP，或复制到剪贴板"
  按钮变为：[ 开始使用 → ]

完成 → 标记 onboarding_completed = true
```

### 5.3 触发条件

| 条件 | 行为 |
|------|------|
| 首次注册登录 | 自动弹出引导 |
| 后端 `onboarding_completed = false` | 自动弹出 |
| 用户点击「跳过」 | 立即关闭，标记 completed |
| 用户走完 3 步 | 标记 completed |
| `completed = true` 的用户（换设备/浏览器） | 不再显示 |
| 引导完成后不再重复 | 后续可加「帮助 → 重新看引导」入口 |

### 5.4 后端新增字段

```python
# models.py — User 表
onboarding_completed = Column(Boolean, default=False)
```

---

## 六、历史记录始终可见 — 模板重构

### 6.1 目标结构

```html
<!-- MainApp 内部（已认证状态） -->
<div class="app">
  <AppHeader />
  <main>
    <!-- ===== 视图状态区：根据 viewState 切换 ===== -->
    <UploadZone v-if="viewState === 'idle'" />
    <ProgressOverlay v-else-if="viewState === 'processing'" />
    <ResultLayout v-else-if="viewState === 'done' || viewState === 'error' || viewState === 'quota_exhaust'" />
    
    <!-- ===== 历史面板：独立渲染，不受 viewState 影响 ===== -->
    <HistoryPanel
      v-if="history.entries.value.length > 0"
      :entries="history.entries.value"
    />
  </main>
  <AppFooter />
</div>
```

### 6.2 改动要点

- `HistoryPanel` 提取到 `v-if/v-else` 切换之外，独立 `v-if="历史条目数 > 0"`
- `handleReset()` → 回到 IDLE，不再隐藏历史
- `handleHistoryRestore()` → 切换到 DONE 状态加载历史结果

---

## 七、配额日重置机制（仅登录用户）

### 7.1 后端实现

```python
# models.py — 已有
class User(Base):
    quota_daily = Column(Integer, default=5)
    quota_used = Column(Integer, default=0)
    quota_date = Column(Date, nullable=True)
```

```python
# auth.py — check_and_reset_quota()
today = date.today()
if current_user.quota_date != today:
    current_user.quota_used = 0
    current_user.quota_date = today
    db.commit()
```

### 7.2 前端同步

每次 `/remove-bg` 成功后从响应头读取 `X-Quota-Used` / `X-Quota-Daily`，更新前端配额状态。

---

## 八、历史记录内容去重

### 8.1 策略

基于 **文件内容 SHA-256 哈希 + 处理模型** 去重（非文件名）。

```
相同图片 + 相同模型 → 旧记录移到顶部 + Toast "该图片已有处理记录"
相同图片 + 不同模型 → 新增记录（不同模型结果可能不同）
不同图片           → 正常新增
```

### 8.2 实现

```typescript
// useHistory.ts — add() 增强
async function add(params: AddParams): Promise<string> {
  const hash = await computeHash(params.originalBlob);
  const model = params.modelUsed || '';
  
  const existingIdx = entries.value.findIndex(
    e => e.fileHash === hash && e.modelUsed === model
  );
  
  if (existingIdx !== -1) {
    const [existing] = entries.value.splice(existingIdx, 1);
    entries.value.unshift({ ...existing, timestamp: Date.now() });
    persist();
    return existing.id;
  }
  
  const entry = { ...params, id: generateId(), fileHash: hash };
  entries.value.unshift(entry);
  persist();
  return entry.id;
}
```

---

## 九、Pro 付费计划预留

### 9.1 三个占位位置

| 位置 | 形式 | 点击行为 | 视觉特征 |
|------|------|----------|----------|
| **Landing Page 底部** | 卡片 "Pro 无限使用 · 即将上线" | Toast "Pro 计划即将上线" | 金色渐变 `#f59e0b → #d97706` |
| **配额耗尽卡片** | 按钮 "升级至 Pro 无限使用" | Toast "Pro 计划即将上线" | 金色渐变 |
| **AppHeader 配额条右侧** | 小标签 "Pro ↑" | Toast "Pro 计划即将上线" | 金色微标 |

### 9.2 Pro 品牌色

建立视觉一致性：
```
--color-pro-start: #f59e0b
--color-pro-end: #d97706
--color-pro-gradient: linear-gradient(135deg, #f59e0b, #d97706)
```

---

## 十、后端认证架构

### 10.1 两个依赖

```python
# get_current_user() — 可选认证（用于健康检查等无需登录的端点）
# 返回 User | None

# get_required_user() — 强制认证（用于 /remove-bg 等核心端点）
# 返回 User | 401
```

### 10.2 `/remove-bg` 强制认证

```python
@router.post("/remove-bg")
async def remove_background(
    file: UploadFile,
    current_user: User = Depends(get_required_user),  # ← 匿名 → 401
    ...
):
```

### 10.3 删除的代码

| 删除项 | 文件 | 说明 |
|--------|------|------|
| `_anon_counter` 字典 | `auth.py` | IP 限频内存存储 |
| `_anon_lock` | `auth.py` | 线程锁 |
| `ANON_DAILY_LIMIT = 10` | `auth.py` | 匿名限额常量 |
| `_check_anon_rate_limit()` | `auth.py` | 匿名限频函数 |
| `_cleanup_timer` | `auth.py` | 过期 key 定时清理 |

---

## 十一、前端架构

### 11.1 useQuota.ts — 精简后

```typescript
// 仅追踪登录用户配额
interface QuotaState {
  dailyUsed: number;      // 今日已用（从后端同步）
  dailyMax: number;       // 每日上限 (5)
  plan: 'free' | 'pro';
  exhausted: ComputedRef<boolean>;  // plan === 'free' && dailyUsed >= dailyMax
}
```

**删除项**：
- `ANON_TRIAL_LIMIT = 2`
- `AnonTrial` 接口
- `checkAnonDate()`
- `localStorage` key `ai-bg-remover-anon-trial`
- 所有匿名试用相关逻辑

### 11.2 App.vue — 认证守卫

```html
<template>
  <!-- 未认证：Landing Page -->
  <LandingPage 
    v-if="!auth.isAuthenticated.value"
    @open-auth="showAuthModal = true" 
  />

  <!-- 已认证：主应用 -->
  <MainApp v-else />

  <!-- 全局 AuthModal -->
  <AuthModal v-model:visible="showAuthModal" />
  
  <!-- 新手引导（仅首次登录 + 未完成） -->
  <OnboardingTour v-if="showOnboarding" @complete="completeOnboarding" />
</template>
```

---

## 十二、实施清单

### Phase 5a — 强制登录重构（当前，2天）

| # | 文件 | 改动 | 类型 | 工作量 |
|---|------|------|------|:--:|
| **Day 1：后端 + 前端清理** | | | | |
| 1 | `backend/auth.py` | 新增 `get_required_user()`，删除 `_anon_counter` 全部代码 | 重构 | 中 |
| 2 | `backend/main.py` | `/remove-bg` 改用 `get_required_user`，删除匿名限频分支 | 重构 | 小 |
| 3 | `backend/models.py` | User 表增加 `onboarding_completed` 字段 | 新增 | 小 |
| 4 | `frontend/src/composables/useQuota.ts` | 删除 `anonTrial` 全部逻辑，仅保留登录配额 | 重构 | 中 |
| 5 | `frontend/src/App.vue` | 加认证守卫 + 删除匿名配额耗尽卡片 + 删除 trial toast | 重构 | 中 |
| 6 | `frontend/src/components/AppHeader.vue` | 删除匿名配额显示分支 | 精简 | 小 |
| 7 | `frontend/src/services/api.ts` | 清理匿名相关错误匹配 | 精简 | 小 |
| 8 | `frontend/src/components/UploadZone.vue` | 清理匿名相关逻辑 | 精简 | 小 |
| **Day 2：新组件 + 测试** | | | | |
| 9 | `frontend/src/components/LandingPage.vue` | **新建** Landing Page（Hero + Demo 滑块动画 + 功能卡片 + Pro 占位） | 新增 | 大 |
| 10 | `frontend/src/components/OnboardingTour.vue` | **新建** 3 步 spotlight 引导（可跳过） | 新增 | 中 |
| 11 | `frontend/src/styles/variables.css` | CSS 变量体系（为风格切换搭骨架） | 新增 | 小 |
| 12 | `frontend/public/demo/` | 内置静态 demo 图（before + after） | 资源 | 小 |
| 13 | Playwright 测试 | E2E 测试覆盖新流程（Landing Page → 注册 → 引导 → 使用 → 配额耗尽） | 测试 | 中 |
| 14 | `docs/design-logic.md` | 更新为 v2.0（本文档） | 文档 | ✅ 已完成 |

### Phase 5b — 付费墙 G24（后续，1.5天）

| # | 文件 | 改动 |
|---|------|------|
| 15 | 定价方案设计 + Stripe 集成 | `models.py` 加 `subscription` 相关字段 + Webhook |

### Phase 6 — 风格切换 + 暗色模式（远期）

| # | 文件 | 改动 |
|---|------|------|
| 16 | CSS 变量 → 主题预设 | `variables.css` 扩展 + `useTheme.ts` + 后端 `theme` 字段 |

---

## 十三、里程碑

| 版本 | 内容 | 状态 |
|------|------|:--:|
| v1.0 | 初始设计：问题诊断 + 5 状态模型 + 匿名试用 C 方案 + 模板重构 | ✅ 已完成 |
| v2.0 | **废弃匿名试用 → 强制登录 + Landing Page + 新手引导 + Pro 占位 + 动画** | ✅ 设计完成 |
| v3.0 | 付费墙 G24：Stripe 集成 + Pro 功能解锁 | ❌ 规划中 |
| v4.0 | OAuth 一键登录（Google/GitHub） | ❌ 远期 |
| v5.0 | 风格切换 + 暗色模式 + 国际化 | ❌ 远期 |

---

> **核心理念 v2.0**：不再和浏览器的无痕模式搞军备竞赛。让用户通过 Landing Page 了解产品价值，注册后获得完整体验。认证 = 唯一的、不可绕过的防线。  
> **产品哲学**：2 次免费试用的"断头台"不如一个精心设计的 Landing Page。给用户看真正的效果，比给用户半截体验更有力。
