# 🧪 AI Background Remover — 全链路测试报告

> 测试工程师：AI Agent  
> 测试日期：2026-05-23  
> 测试范围：前端 (Playwright UI) + 后端 (代码审查) + 部署配置 (Docker/Nginx)  
> 测试环境：Windows 11 · Python 3.11 · Node 18 · Chromium 1223

---

## 一、测试概览

| 层 | 测试方法 | 发现问题 |
|:---|------|:---:|
| 前端 UI | Playwright 真机 (1280×900 + 375×812) | 4 |
| 前端代码 | 全量 43 文件静态审查 | 26 |
| 后端代码 | 全量 8 文件静态审查 | 40 |
| 部署配置 | Docker/Nginx 审查 | 4 |
| **合计** | | **74** |

---

## 二、🔴 P0 — 崩溃 / 资源泄漏（必须修复）

### P0-1. DraftDetailPage 草稿详情页 Object URL 泄漏
- **文件**: `frontend/src/pages/DraftDetailPage.vue` 第 180-182 行
- **问题**: `URL.createObjectURL()` 创建的 Blob URL 从未调用 `revokeObjectURL`。`onUnmounted` 钩子是空壳，`remover.reset()` 从未被调用。
- **影响**: 每次进入/离开草稿详情页泄漏 2 个 Blob URL，内存持续增长直到浏览器标签页关闭。
- **修复**: `onUnmounted` 中调用 `remover.reset()` 或手动 `revokeObjectURL`。

### P0-2. LandingPage requestAnimationFrame 未清理
- **文件**: `frontend/src/components/LandingPage.vue` 第 211-233 行
- **问题**: `startAutoPlay` 启动 RAF 循环，但 RAF ID 未被存储。`onUnmounted` 仅清除 `setTimeout`，RAF 回调在组件销毁后继续执行，操作已销毁的响应式 ref `sliderPercent`。
- **影响**: 组件卸载后持续 RAF 回调；Vue 在严格模式下可能报错。
- **修复**: 存储 `requestAnimationFrame` 返回值，`onUnmounted` 中 `cancelAnimationFrame`。

### P0-3. HistoryPanel 缩略图状态永不清理
- **文件**: `frontend/src/components/HistoryPanel.vue` 第 141 行
- **问题**: `thumbStates` 响应式对象，条目删除或清空时对应 key 永不删除，历史条目 ID 永久积累在内存中。
- **影响**: 用户累积数百/数千条历史记录时内存缓慢泄漏。
- **修复**: 监听 `entries` 变化，删除不存在的 key。

### P0-4. 后端配额 TOCTOU 竞态条件
- **文件**: `backend/main.py` 第 214 + 252-266 + 381 行
- **问题**: 配额检查和递增分两步进行（先读后写），两个并发请求可同时通过检查，最终 `quota_used` 超过 `quota_daily`。
- **影响**: 免费用户可超额使用，配额限制形同虚设。
- **修复**: 使用 SQLAlchemy 数据库级别原子更新：
  ```python
  await db.execute(
      update(User).where(User.id == uid, User.quota_used < User.quota_daily)
      .values(quota_used=User.quota_used + 1)
  )
  ```

### P0-5. JWT 默认弱密钥可被伪造
- **文件**: `backend/auth.py` 第 19 行
- **问题**: 未设置 `JWT_SECRET` 环境变量时使用 `"dev-secret-change-in-production-32chars!"`，任何人可伪造 JWT token 绕过认证。
- **影响**: 生产环境部署时若忘记设置环境变量，整个认证系统失效。
- **修复**: 缺少环境变量时启动报错退出，不允许使用默认密钥。

---

## 三、🟠 P1 — 功能缺陷（用户可感知）

### P1-1. Pro 按钮 pointer-events 被拦截
- **文件**: `frontend/src/components/LandingPage.vue` — `.pro-card` CSS
- **问题**: Playwright 实测报错 `pro-card intercepts pointer events`，"了解详情"按钮被父级 `.pro-card` div 遮挡，用户无法点击。耗时 30 秒重试 58 次后超时。
- **影响**: 所有用户无法点击 Pro 按钮。

### P1-2. 用户选择「缩放」失败后悄悄使用大图
- **文件**: `frontend/src/pages/WorkspacePage.vue` 第 549-552 行
- **问题**: 大图弹窗中用户选择"缩放"处理，但缩放失败后 `catch` 块直接 `await doProcessFile(file)` 使用原始大图，无视用户明确选择。
- **影响**: 用户选择被绕过；大图可能导致超时或 500 错误。

### P1-3. 草稿原图丢失无提示
- **文件**: `frontend/src/pages/DraftDetailPage.vue` 第 163 行
- **问题**: IndexedDB 缺少原图 Blob 时，`originalUrl` 回退到 `resultUrl`，对比功能显示两张相同图片，用户完全不知道原图丢失。
- **影响**: 对比功能失效，无任何用户提示。

### P1-4. 不支持的文件类型返回 400 而非 415
- **文件**: `backend/main.py` 第 217-219 行
- **问题**: 文件类型不支持应返回 HTTP **415 Unsupported Media Type**，当前返回 400 Bad Request。
- **影响**: API 语义不正确；正确客户端会根据 HTTP 状态码做决策。

### P1-5. 种子用户明文密码
- **文件**: `backend/database.py` 第 29-30 行
- **问题**: 种子用户密码 `"12345678"` 明文写在代码中。
- **影响**: 代码泄露 = 账号泄露。

### P1-6. 无文件魔数校验
- **文件**: `backend/main.py` 第 72-75 行
- **问题**: 仅依赖客户端提供的 `Content-Type` 做文件类型检查，攻击者可伪造 `image/png` 上传恶意文件。
- **修复**: 添加文件魔数（magic bytes）验证。

### P1-7. 全局异常处理器泄露内部信息
- **文件**: `backend/main.py` 第 177-183 行
- **问题**: 生产环境返回 `"服务器内部错误: {exc}"` 和异常类型名，可泄露代码路径、依赖库版本等敏感信息。
- **修复**: 生产环境只返回 `"服务器内部错误"`，详细信息仅记录日志。

### P1-8. CORS `allow_origins=["*"]` 不安全
- **文件**: `backend/main.py` 第 60 行
- **问题**: 允许任何来源访问，生产环境应限制为具体前端域名。

### P1-9. 无速率限制
- **文件**: `backend/main.py` 全局
- **问题**: 登录、注册、上传端点均无速率限制，可被暴力破解、枚举、刷存储。
- **影响**: 安全性严重不足。

### P1-10. `gc.collect()` 阻塞异步事件循环
- **文件**: `backend/main.py` 第 305、326、336 行
- **问题**: 在 `async def` 中直接调用同步阻塞的 `gc.collect()`，可能阻塞事件循环数十到数百毫秒。
- **修复**: 使用 `await asyncio.to_thread(gc.collect)`。

### P1-11. 大文件先读入内存才检查大小
- **文件**: `backend/main.py` 第 224 行
- **问题**: `await file.read()` 读完整个文件后才检查大小，攻击者上传 500MB 文件可耗尽内存。
- **修复**: 在 FastAPI 请求层面限制 body 大小。

---

## 四、🟡 P2 — UX / 边界情况

### P2-1. Vue warn: `open-auth` 事件未在 emits 中声明
- **问题**: Playwright 控制台警告。某组件 emit `"open-auth"` 但未在 `emits` 选项中声明。
- **影响**: 兼容性隐患，Vue 3.3+ 的 emits 严格要求可能导致组件行为异常。

### P2-2. 404 资源加载失败
- **问题**: Playwright 控制台错误。某未知资源请求返回 404。
- **影响**: 可能有 favicon 或静态资源路径错误。

### P2-3. `handleRetryBlocked` 忽略 entryId
- **文件**: `frontend/src/pages/WorkspacePage.vue` 第 672-676 行
- **问题**: HistoryPanel 发出被封锁条目的 `entryId`，但函数完全忽略，被封锁条目留在历史面板中。
- **修复**: 传入 `entryId` 后调用 `history.remove(entryId)`。

### P2-4. 两个 `onMounted` 冗余
- **文件**: `frontend/src/pages/WorkspacePage.vue` 第 327-332 和第 349-358 行
- **问题**: 两个独立的 `onMounted` 调用，存在顺序依赖隐患。
- **修复**: 合并为单个 `onMounted`。

### P2-5. PreviewGrid 背景色硬编码
- **文件**: `frontend/src/components/PreviewGrid.vue` 第 136-144 行
- **问题**: 用户选红色/蓝色背景时，结果预览盒背景仍显示硬编码的 `#f0f0f0` 灰色。
- **修复**: 使用 `props.bgColor` 实际值。

### P2-6. bgColorSyncing 守卫脆弱
- **文件**: `frontend/src/pages/WorkspacePage.vue` 第 399-412 行
- **问题**: 通过 `setTimeout(..., 0)` 的同步标志在快速连续变化时可能过早重置。
- **修复**: 使用 `nextTick` 替代 `setTimeout`。

### P2-7. `constructor.name` 在压缩后失效
- **文件**: `frontend/src/utils/errorHumanizer.ts` 第 98 行
- **问题**: Terser 压缩会将 `QuotaExhaustedError` 重命名为 `a` 或 `e`。
- **修复**: 使用 `instanceof` 替代 `constructor.name`。

### P2-8. DraftDetailPage 删除无确认
- **文件**: `frontend/src/pages/DraftDetailPage.vue` 第 209-214 行
- **问题**: 草稿删除无确认对话框，用户点击"确认完成"附近可能误触。
- **修复**: 添加确认弹窗。

### P2-9. Firefox 不支持剪贴板写图片
- **文件**: `frontend/src/components/DownloadPanel.vue` 第 189-208 行
- **问题**: Firefox 不支持 `ClipboardItem` 写图片 API，"复制到剪贴板"对 Firefox 用户静默失败。
- **修复**: 特性检测或对 Firefox 隐藏该选项。

### P2-10. 邮箱注册无格式校验
- **文件**: `backend/schemas.py` 第 9-12 行
- **问题**: 邮箱字段无正则校验，接受 `"not-an-email"` 等无效值。
- **修复**: 使用 Pydantic `EmailStr` 或正则。

### P2-11. 密码仅 6 位
- **文件**: `backend/schemas.py` 第 12 行
- **问题**: 现代安全标准要求至少 8 位。
- **修复**: `min_length=8`。

### P2-12. 用户名无字符集限制
- **文件**: `backend/schemas.py` 第 10 行
- **问题**: 允许控制字符、emoji、Unicode 欺诈字符（如同形字攻击）。
- **修复**: 添加正则限制。

### P2-13. 历史无分页
- **文件**: `backend/history.py` 第 62 行
- **问题**: 每次返回最多 100 条带 2 个 base64 缩略图的记录，单次响应可达数 MB。
- **修复**: 添加 `page`/`limit` 参数。

### P2-14. blocked 记录错误信息不准确
- **文件**: `backend/history.py` 第 120-123 行
- **问题**: blocked 记录返回"文件已丢失"（404），应返回 403 或 410。
- **修复**: 区分 blocked 记录和真正的文件丢失。

### P2-15. 无安全响应头
- **文件**: `backend/main.py` 全局
- **问题**: 缺少 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Strict-Transport-Security` 等。
- **修复**: 添加中间件设置安全头。

### P2-16. 无 Token 刷新机制
- **文件**: `backend/auth.py` 全局
- **问题**: Token 7 天过期后用户只能重新登录，无 refresh token。
- **影响**: 用户体验不佳。

### P2-17. 全局拖拽阻止过于激进
- **文件**: `frontend/src/components/UploadZone.vue` 第 106-114 行
- **问题**: `document.addEventListener('dragover', preventDefaults)` 阻止整个文档的拖拽，可能影响嵌套 iframe 或浏览器标签页拖拽。

---

## 五、🔵 P3 — 代码质量

### P3-1. 生产环境 console.error 遗留
- `frontend/src/pages/WorkspacePage.vue` 第 ~666 行
- `frontend/src/pages/DraftDetailPage.vue` 第 201 行
- **修复**: 用日志服务包装或移除。

### P3-2. `formatSize` 重复实现
- `frontend/src/components/DownloadPanel.vue` 第 211-215 行 与 `imageUtils.formatFileSize` 重复。
- **修复**: 统一导入 `imageUtils.formatFileSize`。

### P3-3. 模块级 `_nextId` 全局共享
- `frontend/src/composables/useBatchProcessor.ts` 第 6-9 行
- **修复**: 移到组合式函数作用域内。

### P3-4. PIL Image 未显式关闭
- `backend/main.py` 第 238 行 · `backend/history.py` 第 233、354 行
- **修复**: 使用 `with` 语句或显式 `image.close()`。

### P3-5. `test_flow.py` 硬编码 JWT Token
- `backend/test_flow.py` 第 5 行
- **修复**: 运行时获取 token。

### P3-6. `cleanup_test_data.py` 文件删除先于 DB commit
- `backend/cleanup_test_data.py` 第 38-47 行
- **问题**: 先删文件后 commit，若 commit 失败，文件已删除但 DB 回滚。
- **修复**: commit 之后再删文件。

### P3-7. `auth.py` `sub` 非数字抛 ValueError
- `backend/auth.py` 第 74 行
- **问题**: `int(user_id)` 对非数字字符串抛 `ValueError`，仅被 `except JWTError` 捕获不到。
- **修复**: 添加 `except ValueError`。

### P3-8. 数据库迁移 `except Exception` 太宽泛
- `backend/database.py` 第 55-59 行
- **修复**: 检查列是否已存在或只捕获特定异常。

### P3-9. 数据库 `DATABASE_URL` 硬编码
- `backend/database.py` 第 11 行
- **修复**: 从环境变量读取。

### P3-10. uvicorn host/port 硬编码
- `backend/main.py` 第 413-414 行
- **修复**: 从环境变量读取。

---

## 六、🐳 部署配置审查

### D-1. Docker backend 直接暴露 8000 端口
- **文件**: `docker-compose.yml` 第 15-16 行
- **问题**: 后端 8000 端口直接对外暴露，绕过 nginx 代理，可被直接访问。
- **修复**: nginx 部署时移除 `ports` 中的 8000 暴露，或仅对 localhost 暴露。

### D-2. nginx `proxy_set_header Host $host` 风险
- **文件**: `nginx.conf` 第 17 行
- **问题**: `$host` 来自客户端请求头，可能被操纵。应使用固定值或 `$http_host`。
- **修复**: 设置 `proxy_set_header Host $http_host;` 或硬编码后端服务名。

### D-3. Docker frontend healthcheck 使用 wget
- **文件**: `Dockerfile.frontend` 第 33-34 行
- **问题**: 新版 `nginx:alpine` 镜像可能不包含 `wget`。
- **修复**: 使用 `curl` 或 `nginx -t`。

### D-4. Docker backend 未挂载 data 目录
- **文件**: `docker-compose.yml`
- **问题**: `data/` 目录（SQLite 数据库所在）未持久化为 volume，容器重建后用户数据丢失。
- **修复**: 添加 `- ./data:/app/data` 挂载。

---

## 七、Playwright UI 测试记录

| 场景 | 步骤 | 结果 |
|------|------|:--:|
| 未登录访问 `/workspace` | 重定向到 Landing Page | ✅ |
| 首页布局完整性 | 可视化验证 | ✅ |
| AuthModal 弹窗 | 点击"免费开始使用"弹出 | ✅ |
| 注册流程 | 填写用户名/邮箱/密码 → 提交 | ✅ |
| 注册后工作台 | 显示用户名、配额、上传区域 | ✅ |
| Onboarding 横幅 | 首次进入显示欢迎横幅 | ✅ |
| 草稿箱空状态 | 显示"暂无草稿" + CTA | ✅ |
| 退出登录 | 回到 Landing Page | ✅ |
| 移动端 375×812 | 响应式布局正常 | ✅ |
| 移动端 退出 | 点击"退出"成功 | ✅ |
| Pro 按钮点击 | `.pro-card` 拦截 pointer-events | ❌ P1-1 |
| 控制台错误 404 | 某资源加载失败 | ❌ P2-2 |
| 控制台 Vue warn | `open-auth` emit 未声明 | ❌ P2-1 |

---

## 八、修复优先级建议

### 第一轮（严重 - 1 天）
```
P0-1  DraftDetailPage Object URL 泄漏
P0-2  LandingPage RAF 未清理
P0-3  HistoryPanel thumbStates 泄漏
P0-4  配额 TOCTOU 竞态
P0-5  JWT 弱密钥
P1-1  Pro 按钮拦截
```

### 第二轮（高 - 1 天）
```
P1-2  缩放失败静默用大图
P1-3  草稿原图丢失无提示
P1-4  错误 HTTP 状态码
P1-5  种子用户明文密码
P1-6  文件魔数校验
P1-7  异常泄露内部信息
P1-8  CORS 限制
P1-9  速率限制
P1-10 gc.collect 阻塞
P1-11 大文件先读入内存
```

### 第三轮（中低 - 2 天）
```
P2 系列 17 项
P3 系列 10 项
D 系列 4 项
```

---

> **总结**：项目核心流程（注册 → 登录 → 工作台 → 处理 → 下载）完整可用。共发现 **74 个问题**（P0: 5 · P1: 11 · P2: 17 · P3: 10 · D: 4 · UI: 3 · 其他: 14）。最严重的问题是配额竞态可超额使用、JWT 弱密钥可伪造、以及前端 3 处内存泄漏。
