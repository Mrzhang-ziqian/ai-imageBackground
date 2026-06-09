# 测试发现的问题与优化建议

> 记录于 2026-06-08 全栈测试阶段
> 第二轮深度测试：2026-06-08（资深测试工程师审查）
> 第三轮全栈优化：2026-06-09（安全加固 + 异常处理完善）
> 最终清理完成于 2026-06-09，数据库仅保留 admin@admin.com 和 test@test.com 用户

---

## 🔴 严重 Bug（已修复）

### 1. history.py: 引用未定义的变量 `MAX_HISTORY_FREE`
- **位置**: `backend/history.py` 第 378 行
- **现象**: `save_history_entry()` 中直接使用了 `MAX_HISTORY_FREE`，但该变量定义在 `subscription.py` 中，未导入到 `history.py` 的作用域
- **修复**: 添加 `from subscription import MAX_HISTORY_FREE` 局部导入

### 2. history.py: `_data_url` 返回值解包逻辑错误
- **位置**: `backend/history.py` 第 119-124 行
- **现象**: `_data_url()` 返回单个字符串，但 `list_history` 中将其解包为 `orig_thumb_b64, _ = _data_url(...), _mime_from_path(...)`，导致 `orig_thumb_b64` 被赋值为 tuple 而非字符串
- **修复**: 直接赋值 `orig_thumb_b64 = _data_url(orig_blobs[i], _mime_from_path(e.thumb_original))`

---

## 🟡 中等 Bug（已修复）

### 3. auth.py: 登录后配额刷新未 commit
- **位置**: `backend/auth.py` 第 131 行
- **修复**: 在 `login()` 和 `/me` 中调用 `check_and_reset_quota` 后添加 `await db.commit()`

### 4. EdgeToolsPanel.vue: CSS 选择器引用了不存在的元素
- **位置**: `frontend/src/components/EdgeToolsPanel.vue` 第 893-895 行
- **修复**: 删除无效 CSS 规则

### 5. ProPlanModal.vue: 缺少 div 结束标签导致编译 500
- **位置**: `frontend/src/components/ProPlanModal.vue` 模板部分
- **修复**: 添加缺失的 `</div>` 闭合标签

### 6. history.py: `save_history_entry_blocked` 重复导入 hashlib
- **位置**: `backend/history.py` 第 219 行
- **修复**: 删除局部重复 `import hashlib as hlib`，使用顶部已导入的 `hashlib`

### 7. main.py: 异常处理器缺少类型注解
- **位置**: `backend/main.py` 第 241-251 行
- **修复**: 添加 `request: Request` 和 `exc: Exception` 类型注解

### 8. database.py ↔ auth.py: 循环依赖
- **位置**: `backend/database.py` 从 `auth` 导入 `hash_password`
- **修复**: 提取 `hash_password`/`verify_password` 到新 `utils.py` 模块，打破循环依赖

### 9. models.py: History.file_hash nullable=True 但总是填充
- **位置**: `backend/models.py` 第 57 行
- **修复**: 改为 `nullable=False`

### 10. subscription.py: Webhook 未配置 secret 时安全风险（已强化）
- **位置**: `backend/subscription.py` 第 162 行
- **修复**: 非开发环境强制拒绝无签名验证的 webhook；添加幂等性检查

### 11. cleanup_test_data.py: 使用 os.path 而非 pathlib
- **位置**: `backend/cleanup_test_data.py`
- **修复**: 统一使用 `Path` / `pathlib`

### 12. 前端 ESLint：0 errors, 0 warnings
- **修复内容**:
  - 迁移 `.eslintrc.cjs` 到 ESLint v10 flat config (`eslint.config.js`)
  - 修复全部 655 个 ESLint 问题（未使用导入、non-null assertion、html-closing-bracket-spacing、no-undef、attributes-order 等）
  - 添加浏览器全局变量声明

---

## 🟠 第三轮全栈优化修复（2026-06-09）

### 13. 【严重】auth.py: 生产环境 JWT_SECRET 未设置时静默使用随机密钥
- **位置**: `backend/auth.py` 第 19-28 行
- **现象**: 生产环境未设置 JWT_SECRET 时自动生成运行时随机密钥，服务重启后所有 token 失效
- **修复**: 生产环境强制检查 JWT_SECRET，未设置时拒绝启动并抛出 RuntimeError；开发环境（ENV=dev）保持自动生成

### 14. 【严重】main.py: CORS 配置为 `*` 通配符
- **位置**: `backend/main.py` 第 61-67 行
- **现象**: 未设置 CORS_ORIGINS 时默认允许所有来源，存在 CSRF 风险
- **修复**: 开发环境保持 `*`，生产环境回退为仅允许 localhost，并支持通过环境变量配置

### 15. 【严重】main.py: IS_DEV 常量定义在使用之后
- **位置**: `backend/main.py` 第 91 行定义，第 66 行使用
- **现象**: `IS_DEV` 在 CORS 配置中先于定义被使用，导致 NameError
- **修复**: 将所有常量定义移到文件顶部（CORS 配置之前）

### 16. 【高】models.py: file_hash 列缺少索引
- **位置**: `backend/models.py` 第 57 行
- **现象**: 历史记录去重查询使用 `file_hash` 过滤条件但缺少索引，导致全表扫描
- **修复**: 添加 `index=True`

### 17. 【高】history.py: 缩略图生成和文件 I/O 缺少异常处理
- **位置**: `backend/history.py` 第 264-265, 395-397, 425-430 行
- **现象**: `Image.open()` 和 `with open()` 操作未包裹 try/except，损坏图片或磁盘空间不足时会导致未处理异常
- **修复**: 添加完整的 try/except 块，文件写入失败时回滚 DB 记录并清理部分写入的文件

### 18. 【高】WorkspacePage: trackUrl 函数未定义
- **位置**: `frontend/src/pages/WorkspacePage.vue` 第 719 行
- **现象**: `handleHistoryRestore` 中调用 `trackUrl(resultObjUrl)` 但该函数定义在 `DraftDetailPage.vue` 中，WorkspacePage 中缺失
- **修复**: 在 WorkspacePage 中添加 `trackUrl` 函数和 `_workspaceUrls` Set，`onUnmounted` 时统一释放

### 19. 【高】路由守卫：并发导航时重复调用 fetchMe
- **位置**: `frontend/src/router/index.ts` 第 47-60 行
- **现象**: 多个并发导航触发 `beforeEach` 时可能同时调用 `auth.fetchMe()`，产生竞态条件
- **修复**: 添加 `_authCheckPromise` 去重守卫，确保同一时间只有一个 `fetchMe` 在执行

### 20. 【中】database.py: 生产环境种子用户默认密码安全警告加强
- **位置**: `backend/database.py` 第 57-64 行
- **现象**: 生产环境使用默认密码时仅输出 WARNING 级别日志
- **修复**: 生产环境升级为 CRITICAL 级别，明确提示立即设置密码环境变量

### 21. 【中】subscription.py: Webhook 事件缺少幂等性处理
- **位置**: `backend/subscription.py` 第 192-207 行
- **现象**: Stripe 可能重复发送同一 webhook 事件，无去重机制会导致重复处理
- **修复**: 添加基于 `event.id` 的幂等检查

---

## 🟠 待修复问题

### 22. 【中】DraftDetailPage: handleConfirm 先跳转后删除，失败时草稿残留
- **位置**: `frontend/src/pages/DraftDetailPage.vue` 第 263-283 行
- **现象**: `handleConfirm` 中先 `router.replace('/workspace')` 跳转，再 `await drafts.remove(draftId)`。如果删除失败，用户已离开页面且无法重试，草稿永久残留在 IndexedDB 中
- **建议**: 改为先删除草稿，成功后再跳转

### 23. 【中】auth store: quotaLeft 返回 Infinity 而非 null
- **位置**: `frontend/src/stores/auth.ts` 第 23-28 行
- **现象**: 未登录时 `quotaLeft` 返回 `Infinity`，而 `useQuota` 中返回 `null`。两处不一致可能导致 UI 判断异常
- **建议**: 统一为 `null`

### 24. 【中】ProPlanModal: 管理订阅失败时错误显示位置错误
- **位置**: `frontend/src/components/ProPlanModal.vue` 第 147 行
- **现象**: 管理订阅（portal）失败时，错误信息写入 `checkoutError`，但该状态只在 CTA 区域显示，而管理订阅按钮在"已是 Pro 用户"区域，用户看不到错误
- **建议**: 为 portal 操作添加独立的 `portalError` 状态

### 25. 【中】useToast 与 useUiStore 的 toast 功能重复
- **位置**: `frontend/src/composables/useToast.ts`
- **现象**: 存在组件级 `useToast` 和全局 `useUiStore` 两套 toast 系统，调用方可能混淆
- **建议**: 明确两套 toast 的用途或废弃 `useToast`

### 26. 【中】DraftDetailPage: onUnmounted 中先 releaseAllUrls 再 remover.reset
- **位置**: `frontend/src/pages/DraftDetailPage.vue` 第 257-260 行
- **现象**: `releaseAllUrls()` 回收 URL 后再调用 `remover.reset()`，后者可能仍引用已回收的 URL
- **建议**: 调换顺序：先 `remover.reset()` 再 `releaseAllUrls()`

### 27. 【中】BackgroundColorPicker: CUSTOM_FALLBACK_HEX 硬编码
- **位置**: `frontend/src/components/BackgroundColorPicker.vue` 第 159 行
- **现象**: `#6366f1` 硬编码，注释却说"使用 CSS 变量引用，保持与主题一致"
- **建议**: 使用 CSS 变量 `var(--color-primary)` 或从主题导入

### 28. 【中】BackgroundTemplatePicker: 缩略图生成 loading 标志可能不重置
- **位置**: `frontend/src/components/BackgroundTemplatePicker.vue` 第 103-119 行
- **现象**: 循环中发生异常时 `loading` 保持 true，UI 永远显示加载中
- **建议**: 将 `loading = false` 放在 finally 块中

### 29. 【低】DraftBoxPage: URL.revokeObjectURL 在 a.click() 后立即调用
- **位置**: `frontend/src/pages/DraftBoxPage.vue` 第 108-111 行
- **现象**: 立即回收可能导致部分浏览器下载未开始
- **建议**: 使用 `setTimeout(() => URL.revokeObjectURL(url), 1000)` 延迟回收

### 30. 【低】UploadZone: 只阻止 drop 未阻止 dragover
- **位置**: `frontend/src/components/UploadZone.vue` 第 113-123 行
- **现象**: 全局 drop 阻止了浏览器默认行为，但未阻止 dragover，浏览器仍显示"禁止"光标
- **建议**: 同时阻止全局 dragover 事件

### 31. 【低】SessionFilmstrip: 缩略图加载失败后显示空白
- **位置**: `frontend/src/components/SessionFilmstrip.vue` 第 49-55 行
- **现象**: `onThumbError` 隐藏 img 但不显示备用内容
- **建议**: 加载失败时通过 emit 通知父组件置空 thumbUrl

---

## 🟠 持续关注（架构级，暂不修复）

### 32. SQLite 不适合生产级并发
- **建议**: 用户量增大后考虑迁移到 PostgreSQL

### 33. 历史文件存储无清理策略
- **建议**: 添加定时任务清理超过 N 天的历史文件

### 34. 前端 API 错误处理不一致
- **位置**: `frontend/src/services/api.ts`
- **建议**: 统一错误处理中间件，减少重复代码

### 35. ProPlanModal: 无支付成功后的计划刷新
- **建议**: 添加 `visibilitychange` 事件监听

### 36. useQuota: 与 auth store 的配额同步存在延迟
- **建议**: 在 `afterSuccessfulRequest()` 中乐观更新本地配额计数

---

## ✅ 已验证正确的功能

- ✅ 用户注册/登录/JWT 鉴权流程正常
- ✅ 每日配额重置逻辑正确（日期变更自动重置）
- ✅ 配额原子扣减（WHERE quota_used < quota_daily）防止超用
- ✅ 图片格式魔数校验（PNG/JPEG/WebP）
- ✅ AI 模型降级链路（u2net → u2netp → silueta）
- ✅ 历史记录保存/查询/删除功能正常
- ✅ Stripe 支付集成结构完整（Checkout/Portal/Webhook）
- ✅ Pro 功能门控逻辑正确（批量/历史/边缘工具）
- ✅ 前端 ProPlanModal 支付流程完整
- ✅ EdgeToolsPanel Pro 门控 UI 正确显示
- ✅ 前端注册流程（含昵称字段）正常
- ✅ 工作台路由守卫（需登录）正常
- ✅ Vite 开发服务器 + API 代理正常
- ✅ ESLint: 0 errors, 0 warnings（全项目通过）
- ✅ 后端所有 .py 文件编译通过
- ✅ 密码工具函数已提取到 utils.py，解决循环依赖
- ✅ JWT_SECRET 生产环境强制检查
- ✅ CORS 安全配置（生产环境限制来源）
- ✅ file_hash 数据库索引优化
- ✅ 历史记录缩略图/文件 I/O 异常处理
- ✅ WorkspacePage Object URL 生命周期管理
- ✅ 路由守卫并发去重
- ✅ Stripe Webhook 幂等性检查
- ✅ 18 个 API 端到端测试全部通过
- ✅ 前端 3 个主要页面无控制台错误
