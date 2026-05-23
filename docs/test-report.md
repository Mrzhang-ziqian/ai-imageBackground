# 测试报告

> 日期: 2026-05-23 | 版本: sprint-N | 测试工程师: AI Test Agent

---

## 🔴 P1 — 阻塞性缺陷（已修复）

### T1. Pinia Store 懒初始化 + reactive 解包导致路由守卫误判未登录 ✅ 已修复
**状态**: ✅ 已修复  
**根因**: 两重原因：
1. Pinia Store 在首次调用时才初始化 `fetchMe()`，路由守卫在完成前检测到 `user` 为 null
2. Pinia 的 `reactive()` 自动解包 ref，`auth.isLoggedIn` 已是 `boolean`，`.value` 返回 `undefined`，导致 watcher 永不触发  
**修复**: 
- `main.ts`: 在 `app.mount()` 前调用 `useAuthStore()` 触发提前初始化
- `router/index.ts`: 导入 `useAuthStore` 直查 `!!auth.token && !!auth.user`
- `App.vue`: 替换 `auth.isLoggedIn.value` → `auth.isLoggedIn`
- 全项目替换 Pinia Store 属性的 `.value` 访问（共 15 处）
**文件**: `main.ts`, `router/index.ts`, `App.vue`, `WorkspacePage.vue`, `HomePage.vue`, `useBackgroundRemover.ts`, `useBatchProcessor.ts`, `stores/history.ts`

---

## 🟡 P2 — 功能性缺陷

### T2. HomePage 中 `open-auth` 事件未在 emits 声明
**状态**: 🔜 待修复（低优先级，仅日志噪音）  
**文件**: `frontend/src/components/LandingPage.vue`  
**现象**: 控制台警告 `[Vue warn]: Component emitted event "open-auth" but it is neither declared in the emits option`  
**分析**: `defineEmits<{ openAuth: [] }>()` 已声明，Vue 应自动转换 camelCase→kebab-case。可能是 Vite HMR 环境下的边界情况。

---

### ~~T3. favicon 404 错误~~ ✅ 已修复
**状态**: ✅ 已修复  
**文件**: `frontend/index.html`  
**修复**: 内联 SVG favicon（data URI），无需外部文件。

---

### ~~T4. HomePage 模板中读取 Pinia Store 方式不当~~ ✅ 已修复
**状态**: ✅ 已修复  
**文件**: `frontend/src/pages/HomePage.vue`  
**修复**: `v-if="!auth.isLoggedIn.value"` → `v-if="!auth.isLoggedIn"`

---

## ⚠️ P3 — 体验优化

### T5. Pinia Store `.value` 解包不规范（全项目）
**状态**: 💡 设计决策  
**现象**: Pinia Store 通过 `reactive()` 自动解包 ref，访问 `store.someRef` 即得值，`.value` 为 undefined 或异常行为。  
**影响文件**: `WorkspacePage.vue`, `App.vue`, `router/index.ts`, `useBackgroundRemover.ts`, `useBatchProcessor.ts`, `stores/history.ts`  
**已修复**: 全项目 15 处 `.value` 访问已修正。

---

## ✅ 已验证通过

- [x] 后端 `/health` → 200
- [x] admin 登录 (admin@admin.com / Admin123!) → 200 + token
- [x] test 登录 (test@test.com / Test123456!) → 200 + token
- [x] 新用户注册 → 200
- [x] 非法邮箱注册 → 422 (格式校验)
- [x] 无 Token → `/auth/me` 401, `/history` 401
- [x] `/auth/me` → 200 + 用户信息
- [x] `/history` → 200 + 空数组
- [x] 数据库重建 → admin + test 种子用户
- [x] Pinia 架构重构 (K8) — 完成
- [x] TypeScript 类型安全 (catch any → unknown)
- [x] 邮箱格式正则校验 (schemas.py)
- [x] UploadZone 动态文件大小 (K34)
- [x] 批量上传反馈 (K35)
- [x] retry-blocked 事件签名 (K36)
- [x] HistoryPanel 缩略图 DRY (K37)
- [x] DraftDetailPage URL 过滤 (K41)
- [x] console.warn 生产守卫
- [x] BackgroundColorPicker 常量 (K38)
- [x] 登录后自动重定向 → `/workspace` ✅
- [x] Workspace 页面完整渲染 ✅（导航栏、上传区、示例图、底部信息）
- [x] favicon 加载 ✅
- [x] Pinia Store `.value` 全项目规范化 ✅
