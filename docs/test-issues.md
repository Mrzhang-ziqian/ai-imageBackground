# 测试发现的问题与优化建议

> 记录于 2026-06-08 全栈测试阶段
> 最终清理完成于 2026-06-08，数据库仅保留 admin@admin.com 和 test@test.com 用户

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

## 🟡 中等 Bug

### 3. auth.py: 登录后配额刷新未 commit（已修复）
- **位置**: `backend/auth.py` 第 131 行
- **现象**: `login()` 函数中调用 `check_and_reset_quota(user, db)` 使用 `flush()` 而非 `commit()`。登录后立即调用 `/me` 会触发另一个 `check_and_reset_quota`，但如果 `/me` 未调用，配额可能未持久化
- **修复**: 在 `login()` 和 `/me` 中调用 `check_and_reset_quota` 后添加 `await db.commit()`

### 4. EdgeToolsPanel.vue: CSS 选择器引用了不存在的元素（已修复）
- **位置**: `frontend/src/components/EdgeToolsPanel.vue` 第 893-895 行
- **现象**: `.panel-header h4` 选择器无对应 `<h4>` 元素（实际使用 `.header-title` 类名）
- **修复**: 删除无效 CSS 规则

### 5. subscription.py: 降级时未清理 stripe_customer_id
- **位置**: `backend/subscription.py` `_handle_subscription_deleted()`
- **现象**: 订阅取消时 `stripe_subscription_id` 被设为 None，但 `stripe_customer_id` 保留。如果用户重新订阅，旧的 customer_id 可能导致 Stripe 冲突
- **建议**: 考虑是否需要在降级时保留或清理 `stripe_customer_id`

### 6. subscription.py: past_due 状态可能导致 plan 不一致
- **位置**: `backend/subscription.py` `_handle_subscription_updated()`
- **现象**: 当 `status == "past_due"` 时，代码只更新 `subscription_status` 但保留了 `plan = "pro"`。这意味着用户可以在不付费的情况下继续享受 Pro 功能
- **建议**: past_due 时考虑设置宽限期（如 7 天），过期后自动降级

---

## 🟠 优化建议

### 7. 历史记录查询性能优化
- **位置**: `backend/history.py` `list_history()`
- **现象**: 每次查询返回所有记录的 base64 缩略图嵌入在 JSON 中，用户记录多时响应体可能很大（>1MB）
- **建议**: 考虑分页支持或使用缩略图 URL 替代 base64 嵌入

### 8. 前端 API 错误处理不一致
- **位置**: `frontend/src/services/api.ts`
- **现象**: `uploadAndRemoveBg` 使用 XHR，`authApi` 使用 fetch，`subscriptionApi` 也使用 fetch，但错误处理逻辑各不相同
- **建议**: 统一错误处理中间件，减少重复代码

### 9. ProPlanModal: 无支付成功后的计划刷新
- **位置**: `frontend/src/components/ProPlanModal.vue`
- **现象**: `handleCheckout` 直接跳转到 Stripe Checkout 页面，依赖 `WorkspacePage` 的 `?checkout=success` 回调刷新用户状态。如果用户在新标签页完成支付，原页面可能不会刷新
- **建议**: 添加 `visibilitychange` 事件监听，在用户切换回标签页时自动刷新用户信息

### 10. useQuota: 与 auth store 的配额同步存在延迟
- **位置**: `frontend/src/composables/useQuota.ts`
- **现象**: `afterSuccessfulRequest()` 调用 `fetchMe()` 刷新配额，但存在网络延迟。在此期间 `quotaLeft` 显示的是旧值
- **建议**: 在 `afterSuccessfulRequest()` 中乐观更新本地配额计数，网络请求作为校验

### 11. _read_thumb_async 死代码（已修复）
- **位置**: `backend/history.py` 第 73-81 行
- **现象**: `_read_thumb_async()` 函数已定义但未被任何地方调用
- **修复**: 已删除该死代码

### 12. 缺少输入验证的 Pro 功能提示
- **位置**: 前端多处
- **现象**: 当 Pro 门控阻止功能时，错误提示不够明确。例如批量处理超过 1 张时的错误信息
- **建议**: 添加更友好的"升级 Pro 解锁"提示，带有直接跳转 ProPlanModal 的按钮

---

## 🔵 架构建议

### 13. SQLite 不适合生产级并发
- **现象**: SQLite 的写锁限制可能导致高并发下配额扣减失败。虽然代码中有 `WHERE quota_used < quota_daily` 的原子保护，但 SQLite 的串行化特性仍是瓶颈
- **建议**: 用户量增大后考虑迁移到 PostgreSQL

### 14. JWT_SECRET 随机生成的安全隐患
- **位置**: `backend/auth.py` 第 19-28 行
- **现象**: 未设置 `JWT_SECRET` 时使用随机密钥，服务重启后所有 token 失效
- **建议**: 添加更明确的启动检查，在非开发环境下强制要求设置 JWT_SECRET

### 15. 历史文件存储无清理策略
- **现象**: `data/history/` 下的文件会持续增长，没有定期清理机制
- **建议**: 添加定时任务清理超过 N 天的历史文件，或基于用户配额自动清理

---

### 16. ProPlanModal.vue: 缺少 div 结束标签导致编译 500（已修复）
- **位置**: `frontend/src/components/ProPlanModal.vue` 模板部分
- **现象**: `modal-overlay` div 缺少闭合标签，Vite 编译时返回 500，导致 WorkspacePage 懒加载失败，整个工作台无法渲染
- **修复**: 添加缺失的 `</div>` 闭合标签

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
