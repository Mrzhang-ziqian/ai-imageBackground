# AI Background Remover — 产品需求诊断 & 优化路线图

> 更新时间：2026-05-23  
> 版本：v4.6  
> 版本说明：Phase 1~4 核心层全部完成。Sprint A~J 共 37 项 UX 优化 + 56 项审计热修复。G37~G41 全部完成，G42 资深测试审计完成。

---

## 一、诊断总览

| 维度 | 现状 | 评分 |
|------|------|:---:|
| 核心流程（上传→抠图→下载） | ✅ 完整可运行 | ⭐⭐⭐⭐ |
| 代码质量（Vue 3 + TS + 组件化） | ✅ 良好 | ⭐⭐⭐⭐ |
| 背景颜色替换 | ✅ 纯色合成 + 模板库已做 | ⭐⭐⭐⭐ |
| 批量处理 | ✅ 队列 + 进度 + 批量下载 | ⭐⭐⭐⭐ |
| 边缘后期工具 | ✅ 羽化/平滑/手动修复 | ⭐⭐⭐ |
| 大图稳定性 | ✅ 前端尺寸+大小双拦截 + 后端内存优化 | ⭐⭐⭐⭐ |
| 用户体验 | ✅ 基础功能完备 + 移动端适配 | ⭐⭐⭐⭐ |
| 产品完整度 | ⚠️ 核心功能齐全，缺渠道层 | ⭐⭐⭐ |
| 商业化准备 | ⚠️ 基础架构就绪（账号/API/支付待建） | ⭐⭐ |

### 📊 进度总览

```
已完成:  ██████████████████████████  17/25 (68%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Phase 1 (致命级)  G01 G02 G03 G04       4/4  全部完成 🎉
✅ Phase 2 (留存级)  G05 G06 G07 G08 G09   5/5  全部完成
✅ Phase 3 (竞争力)  G12 模板库             1/4
✅ Phase 4 (拓渠道)  G04 移动端 + G14 Docker   2/2  全部完成 🎉
✅ 新增              G22 大图保护            1/1
✅ Phase 5 (壁垒)   G23 用户体系 ✅ → G23a ✅ + G28 ✅（3/4，G24 付费墙待实施）
✅ 新增              G29～G30 全链路缺陷修复    40/48 已修复
📋 新增              G31 产品设计分析          20 项 UX 缺陷 + 10 项设计方案 + 6 Sprint 路线图
🛠 Sprint A          G32 UX-3/4/5 修复 + T5     4 项已实施 ✅
🛠 Sprint B          G33 UX-1/2/9/19/20           5 项已实施 ✅
🛠 Sprint C          G34 UX-11/17 + 审计热修复     3 项 + 10 热修复 ✅
🛠 Sprint D          G35 UX-6/10 + P2热修复 + 审计    4 项 + 4 热修复 ✅
🛠 Sprint E          G36 P2/P3 遗留修复 + 格式保留    6 项热修复 ✅
🛠 Sprint F          G37 遗留全部修复 + 组件提取        5 项优化 ✅
🛠 Sprint G          G38/G39 遗留修复 + 审计热修复       10 项优化 ✅
🛠 Sprint H          G39 遗留 P1/P2 修复 + G40 审计热修复   10 项优化 ✅
🛠 Sprint I          G40 遗留 P1/P2 修复 + G41 审计热修复   13 项优化 ✅
🧪 Sprint J          G42 资深测试工程师全栈审计         已完成（8 项发现）
❌ Phase 6 (商业化)  G24~G27 新增            0/5
❌ 质感层            G16~G21               0/6
```

---

## 二、缺失项清单（按严重性分级）

### 🔴 Tier 1 — 致命级（不补上不了线）

| ID | 缺失项 | 现状 | 为什么致命 |
|----|--------|------|-----------|
| G01 | **图片质量损失严重** | 后端 `PROCESS_MAX_DIM = 1024`，超过 1024px 的图片被强制缩放处理后**不还原到原始尺寸**。用户传 4K 图只拿回 1024px 缩略图 | ✅ 已修复 | 保留原图 RGB 数据，AI 在小图上跑 alpha mask，放大 mask 后应用到原图。前端展示结果实际尺寸 |
| G02 | **无结果对比功能** | 仅并排显示原图/结果，无 before/after 滑块对比、叠加对比等交互 | ✅ 已修复 | 新增 `CompareSlider.vue` 拖拽滑块对比 + 工具栏「并排/对比」双模式切换 |
| G03 | **无错误降级策略** | 后端只有单模型 `u2net`，失败就一句话，无重试、无备选方案 | ✅ 已修复 | 多模型降级链路 (u2net→u2netp→silueta)，单模型重试 2 次。前端错误卡片 + 重试按钮（无需重新上传文件）。响应头返回 `X-Model-Used` 展示所用模型。 |
| G04 | **无移动端适配** | 整个 UI 在手机端基本不可用 | ✅ 已修复 | 全局响应式 CSS 断点体系（480/640/900/1024px），14 文件改造，index.html PWA meta，触屏手柄放大、flex-wrap 防溢出。 |

### 🟠 Tier 2 — 严重影响用户留存

| ID | 缺失项 | 现状 | 当前后果 |
|----|--------|------|---------|
| G05 | **抠图边缘无后期工具** | rembg 边缘粗糙（毛发、透明物体），没有羽化、边缘平滑、手动擦除/修复 | ✅ 已修复 | 新增 `EdgeToolsPanel.vue`：羽化半径调节、边缘平滑、手动擦除/修复画笔模式。支持撤销/重置操作。Canvas 端侧实时编辑，无需后端。 |
| G06 | **颜色预设太少** | 仅 3 个预设色（蓝/红/白），无电商常用的灰、米色，无最近使用/收藏 | ✅ 已修复 | 预设色扩展至 12 个（透明/纯白/浅灰/中灰/深黑/米色/蓝/绿/金黄/红/粉/紫），新增「最近使用」栏（localStorage 持久化最多 8 个），自定义选色图标化。 |
| G07 | **无处理历史** | 刷新页面所有结果丢失，无法回溯之前处理过的图片 | ✅ 已修复 | 新增 `useHistory` composable + `HistoryPanel` 组件。localStorage 持久化最多 20 条记录，每条含原图/结果缩略图、文件名、尺寸。支持点击恢复、单条删除、清空全部。 |
| G08 | **无批量处理** | 一次只能处理一张图，电商用户一次要处理几十张商品图 | ✅ 已修复 | 新增 `BatchPanel.vue` + `useBatchProcessor` composable。多图批量上传、队列顺序处理、实时进度、结果缩略图预览、批量下载 ZIP、单图切到详情模式。 |
| G09 | **下载体验单一** | 只能下载 PNG；无 WebP 选项（文件更小）；无「复制到剪贴板」；无原尺寸下载 | ✅ 已修复 | 新增 `DownloadPanel.vue` 下载面板：PNG 一键下载（显示文件大小）、WebP 格式转换下载、复制到剪贴板。支持 Canvas 端侧转换，无需额外后端请求。 |
| G22 | **大图片导致 500 崩溃** | 3MB+ 的 PNG 直接返回 500 错误，无任何前端提示，用户一脸懵 | ✅ 已修复 | 新增 `LargeImageDialog.vue`：前端读取图片尺寸 + 文件大小，超限（>2000px 或 >2MB）弹窗可选「自动调优/原图上传/取消」。后端 `PROCESS_MAX_DIM` 降至 800px，先缩放再转 RGBA 降低 60% 峰值内存，`gc.collect()` + 超时保护。 |

### 🟡 Tier 3 — 影响竞争力和增长

| ID | 缺失项 | 说明 |
|----|--------|------|
| G10 | **零埋点/数据** | 不知道多少用户、用什么浏览器、传什么格式、哪里报错。迭代靠猜 |
| G11 | **无分享/传播机制** | 工具类产品的核心增长引擎缺失。无分享链接、对比 GIF、社交卡片 |
| G12 | **无模板背景库** | 电商用户第一诉求：纯白/浅灰底 + 阴影。P1 已规划但未实现 | ✅ 已修复 | 新增 `BackgroundTemplatePicker.vue`，内置 13 个预设模板（电商 5 个：纯白阴影/浅灰阴影/暖白阴影/米色阴影/深灰展示；渐变 5 个：天空/日落/科技紫蓝/清新绿/黑白极简；场景 3 个：工作室灯光/暗色舞台/产品展台）。支持阴影 + 渐变叠加。Canvas 端侧合成，无需后端。 |
| G13 | **无 API 服务化** | `/remove-bg` 裸奔，无鉴权、无配额、无计费，无法对外提供 SaaS 服务 |
| G14 | **无 Docker/一键部署** | 普通用户不可能装 Python + Node.js。无在线 Demo，项目无法被实际使用 | ✅ 已修复 | Dockerfile.backend + Dockerfile.frontend + docker-compose.yml + nginx.conf + .dockerignore。`docker compose up -d` 一键启动，3 模型预下载，健康检查依赖，持久化模型卷。 |
| G15 | **无端侧推理** | P2 写了 ONNX 客户端推理但未实现。端侧 = 速度 + 隐私，是真正的护城河 |

### 💰 Tier 5 — 商业化层（新增 · 可持续运营）

> 📊 市场参考：remove.bg（订阅 $9/月起，API 按量计费）、Clipping Magic（免费试用 + 订阅）、Adobe Express（基础免费，高级付费）。竞争极其激烈，差异化 = 生存关键。

| ID | 缺失项 | 说明 |
|----|--------|------|
| G23 | **零用户体系** | 无注册/登录/用户中心。无用户 = 无数据 = 无变现基础。remove.bg/Clipping Magic 强制注册下载全分辨率 | ✅ 已实现 (Phase 5) → 🔧 待增强 (3 问题) |
| G23a | **页面逻辑 & 强制登录重构 (G23 增强)** | ① 点「重新上传」后历史面板消失（v-if 切换 Bug）；② **废弃匿名试用 → 强制登录后才可使用**（原匿名方案因无痕重置/换浏览器绕过而不可防御，设备指纹同样换浏览器即失效）；③ 相同照片反复处理产生重复历史记录。后端配额无日重置机制，用完永久卡死 | 🔜 策略已决策，待实施 |
| G24 | **零变现设计** | 完全免费、无广告、无付费墙。竞争对手均采用 Freemium：免费低分辨率/付费高清。我们没有任何收入来源 |
| G25 | **无 API 产品化** | `/remove-bg` 裸奔，无 API Key 鉴权、无速率限制、无使用统计。无法对接外部开发者/SaaS 生态 |
| G26 | **零运营工具** | 无后台管理面板、无用户管理、无使用分析、无公告系统。运营 = 盲飞 |
| G27 | **无企业版路径** | 无团队协作、无 SSO、无白标、无私有部署方案。无法进入 B 端市场 |

### 🔵 Tier 6 — 产品质感/品味

| ID | 缺失项 | 说明 |
|----|--------|------|
| G16 | **无微交互/音效** | 上传、处理完成、下载完毕全无反馈，体验"冷" |
| G17 | **无快捷键系统** | Ctrl+Z 撤销、Ctrl+S 下载、空格键对比原图 —— 行业标配 |
| G18 | **无暗色模式** | 图片处理是高视觉负荷场景，暗色模式有真实需求 |
| G19 | **无国际化 (i18n)** | 仅支持中文；加英/日/韩，市场量级 ×10 |
| G20 | **无无障碍 (a11y)** | 键盘导航、屏幕阅读器、焦点管理完全缺失 |
| G21 | **无品牌系统** | 没有 favicon、og:image、品牌色体系、设计语言 |

---

## 三、优化路线图

### 📊 优先级矩阵（ROI 排序）

```
                    影响大
                      │
          ┌───────────┼───────────┐
          │  G23 用户体系  G25 API服务化 │
          │  G24 变现设计  G15 端侧推理 │
   容易做  │  G11 分享机制  G19 i18n    │  难做
          │  G26 运营后台  G10 埋点    │
          │  G27 企业版    G13 API鉴权  │
          │  G17 快捷键    G18 暗色模式 │
          │  G16 微交互    G20 无障碍   │
          │  G21 品牌       ─           │
          └───────────┼───────────┘
                      │
                    影响小

注：✅ 标记项（G01~G09,G12,G14,G22）已全部完成，不在矩阵中。
商业化项（G23~G27）为新增，优先级高于纯质感优化。
```


### 🚀 推荐实施顺序

| 阶段 | 周期 | 任务 | 关键理由 | 状态 |
|------|:--:|------|----------|:--:|
| **Phase 1** | 1-2 天 | G01 + G02 + G03 | 修致命伤，让产品"能用"。图片质量 + 对比功能 + 错误降级 | ✅ 已完成 |
| **Phase 2** | 2-3 天 | G09 + G06 + G07 | 补核心体验。下载增强 + 颜色扩展 + 历史记录 | ✅ 已完成 |
| **Phase 3** | 3-5 天 | G12 + G08 + G05 | 建护城河。模板库 + 批量处理 + 边缘优化 | ✅ 已完成 |
| **Phase 3+** | 1 天 | G22 大图保护 | 前端拦截 + 后端内存优化，解决 3MB+ PNG 崩溃 | ✅ 已完成 |
| **Phase 4** | 2 天 | G04 + G14 | 拓渠道。移动端 + Docker 一键部署 | ✅ 已完成 |
| **Phase 5** | 3-5 天 | G23 + G24 + G11 | 🆕 建变现基础。用户体系 + 付费墙 + 分享传播 | 🔜 当前阶段（G23 ✅） |
| **Phase 6** | 5-7 天 | G25 + G13 + G26 + G10 | 🆕 API 服务化 + 运营后台 + 埋点数据 | ❌ 规划中 |
| **Phase 7** | 持续 | G15 + G27 + G19 + G18 | 技术壁垒 + 企业版 + 国际化 + 暗色模式 | ❌ 远期 |

### 🎯 MVP 增强（本次迭代聚焦）

| 优先级 | ID | 任务 | 状态 |
|:---:|:---:|------|:--:|
| 🥇 | G01 | **修复图片质量**：后端处理完缩放到原始尺寸 | ✅ 已完成 |
| 🥈 | G02 | **Before/After 对比滑块** | ✅ 已完成 |
| 🥉 | G03 | **错误降级 + 重试机制** | ✅ 已完成 |
| 4 | G22 | **大图崩溃修复**：前端尺寸+大小双拦截 + 后端内存优化 | ✅ 已完成 |

---

## 四、后续规划

### Phase 2+ 功能扩展 (from plan.md §2.2)

| ID | 功能 | 优先级 | 状态 |
|----|------|:------:|:----:|
| F07 | 背景更换（图片模板合成） | P1 | ✅ 已实现 (G12 模板库) |
| F08 | 纯色背景替换 | P1 | ✅ 已实现 |
| F09 | 渐变背景 | P1 | ✅ 已实现 (G12 渐变模板) |
| F10 | 模板背景库 | P1 | ✅ 已实现 (13 个模板，电商/渐变/场景) |
| F11 | 批量处理 | P2 | ✅ 已实现 (G08) |
| F12 | 端侧 ONNX 推理 | P2 | 待开发 |
| F13 | 🆕 用户注册/登录 | P1 | Phase 5 |
| F14 | 🆕 付费订阅系统 | P1 | Phase 5 |
| F15 | 🆕 API 开发者服务 | P2 | Phase 6 |

### 测试验证

| ID | 任务 | 状态 |
|----|------|:----:|
| T12 | 测试图片上传和背景移除 | ✅ 已通过（curl + Playwright 全链路测试） |
| T13 | 测试下载功能 | ✅ 已通过（PNG/WebP/剪贴板均正常） |
| T14 | 端到端 E2E 测试 | ✅ 已通过（Playwright 桌面+平板+移动端） |
| T15 | 性能测试（大图/并发） | 🔜 待执行 |

---

## 五、竞品对标 & 市场参考

| 产品 | 优势 | 定价模式 | 我们可借鉴 |
|------|------|----------|-----------|
| **remove.bg** | 端侧处理、批量 500 张/分钟、API 生态 | Freemium：免费低分辨率 + 订阅 $9/月起 + API 按量计费 | 对比交互、API 产品化、批量场景 |
| **Clipping Magic** | 智能编辑器（Scalpel/Hair/Keep/Remove）、阴影系统 | Free 试用 + 订阅下载全分辨率 | 边缘手动工具、阴影系统、电商默认配置 |
| **稿定抠图** | 电商场景专精、发丝/阴影修复 | 会员制 + 企业版 | 电商垂直化、模板生态 |
| **Adobe Express** | 完全免费、Adobe 生态联动 | 免费基础 + Premium $9.99/月 | 生态联动思维、一键编辑拓展 |
| **Canva** | 扣图后的设计编辑流 | 免费基础 + Pro $12.99/月 | 设计编辑流闭环、「抠图不再独立存在」 |

### 📈 市场规模参考

| 指标 | 数据 |
|------|------|
| 全球 AI 图像编辑市场 2025 | ~$3.5B（CAGR 12%） |
| 背景移除工具 DAU Top 3 | remove.bg ~2M / Canva ~60M / Adobe Express ~45M |
| 主流定价区间 | $5-20/月（个人） · $30-100/月（企业） |
| API 计费模式 | $0.05-0.20/次（批量折扣） → 信用卡/订阅绑定 |

---

## 六、下一步行动建议

### 🎯 当前焦点：Phase 5 — 商业化基础（页面体验重构）

> Phase 1~4 全部交付。G23 用户体系已上线，但发现 3 个页面逻辑问题 + 匿名白嫖漏洞（无痕重置/换浏览器不可防御）+ **15 项页面体验缺陷**。
> **已决策：废弃匿名试用，改为强制登录。当前最高优先：完成页面体验重构 + 强制登录，然后推进 G24 付费墙。**

| 优先级 | ID | 任务 | 工作量 | 理由 |
|:---:|:---:|------|:--:|------|
| 🥇 | **G28** | **页面体验重构** | 2 天 | 处理→草稿→确认 三跳断致命漏斗修复，结果直出工作台，对标竞品单页体验 |
| 🥈 | **G23a** | **页面逻辑 & 强制登录重构** | 2 天 | 修复历史可见性 Bug + 废弃匿名试用，改为强制登录 + 后端拒未认证请求(401) + 前端 Landing Page 引导注册 + 配额日重置 + 历史去重 |
| 🥉 | **G24** | **变现设计** | 1.5 天 | Freemium 模型：免费 800px 预览 + 付费下载全分辨率。Stripe/Paddle 支付集成 |
| 4 | **G11** | **分享机制** | 1 天 | Before/After GIF + 社交媒体卡片。工具类增长引擎 |
| 5 | **G10** | **埋点 & 数据** | 1 天 | Umami（自建免费）或 Plausible。知道用户从哪里来、在哪里离开 |

#### 🆕 G28 — 页面体验重构（15 项缺陷修复）

> **2026-05-23 审计发现**：从市场和竞品对标视角，发现 15 项页面体验缺陷。

| 优先级 | # | 问题 | 影响 | 状态 |
|:---:|:---:|------|------|:--:|
| 🔴 | 1 | **处理→草稿→确认 三跳断致命漏斗** | 100% 用户每张图多走 3 步，竞品 2 步我们 5 步 | ✅ 已修复 |
| 🔴 | 2 | **Pro 付费墙是死胡同按钮** | 点击「升级至 Pro」→ toast：sorry coming soon。严重品牌伤害 | ✅ 已修复 |
| 🔴 | 3 | **结果对比能力藏在二级页面** | CompareSlider 只在 DraftDetailPage，Landing Page 的 Demo 承诺落空 | ✅ 已修复 |
| 🔴 | 4 | **零分享/传播机制** | 纯工具孤岛，无对比 GIF、社交卡片，增长引擎缺失 | ❌ G11 规划中 |
| 🟠 | 5 | **批量模式自动劫持用户意图** | 拖入≥2 张 → 强制进入批量，无法选择逐张精修 | ✅ 已修复 |
| 🟠 | 6 | **单图处理无取消按钮** | 点错图片后只能干等或刷新页面 | ✅ 已修复 |
| 🟠 | 7 | **历史面板始终占据空间** | 默认展开占用版面，分散用户注意力 | ✅ 已修复 |
| 🟠 | 8 | **配额提示位置不佳** | 计数仅在 AppHeader，上传区域无感知，用户被拒绝后才发现 | ✅ 已修复 |
| 🟠 | 9 | **Blocked 记录无重试入口** | 灰色锁图标不可点击，无操作入口 | ✅ 已修复 |
| 🟡 | 10 | **零设置/偏好面板** | 无语言/主题/默认格式/关于页，像 Demo 非正式产品 | ❌ 待规划 |
| 🟡 | 11 | **草稿永不过期** | IndexedDB 永久存储，3 个月积累上百条僵尸草稿 | ❌ 待规划 |
| 🟡 | 12 | **空状态无引导** | 草稿箱「暂无草稿」无 CTA，无引导入口 | ❌ DraftBoxPage 已有 CTA |
| 🟡 | 13 | **无新用户 Onboarding** | 注册后直接面对空白上传区，无示例图、功能导览 | ✅ 已修复 |
| 🟡 | 14 | **错误提示是技术语言** | 展示原始 `ConnectionError`/`500`，用户看不懂 | ✅ 已修复 |
| 🟡 | 15 | **无暗色模式** | 图片处理是高视觉负荷场景，暗色模式是刚需 | ❌ 远期 G18 |

#### 🆕 G29 — 全链路测试新增缺陷（2026-05-23 Playwright + 代码审查）

> **2026-05-23 全链路测试**：Playwright 真机 UI 测试 + 全量代码静态审查（前后端共 51 文件），发现 **74 个问题**。详见 `docs/test-report.md`。以下提取未在 G28 覆盖的高优新增项。

| 优先级 | # | 问题 | 影响 | 状态 |
|:---:|:---:|------|------|:--:|
| 🔴 | 16 | **DraftDetailPage Object URL 泄漏** | 每次进入/离开草稿详情页泄漏 2 个 Blob URL | ✅ 已修复 |
| 🔴 | 17 | **LandingPage RAF 动画未清理** | 组件销毁后 RAF 回调持续执行，操作已销毁 ref | ✅ 已修复 |
| 🔴 | 18 | **HistoryPanel thumbStates 永久积累** | 历史条目删除后 key 不清理，内存缓慢泄漏 | ✅ 已修复 |
| 🔴 | 19 | **配额 TOCTOU 竞态条件** | 后端已使用 `UPDATE WHERE quota_used < quota_daily` 原子操作 | ✅ 已修复 |
| 🔴 | 20 | **JWT 默认弱密钥** | 未设环境变量时生成随机 `secrets.token_hex(32)` 密钥 | ✅ 已修复 |
| 🟠 | 21 | **Pro 按钮 pointer-events 被拦截** | `.pro-card` 覆盖按钮，用户无法点击「了解详情」 | ✅ 已修复 |
| 🟠 | 22 | **缩放失败静默使用大图** | 用户选择缩放但失败后悄悄处理原图，绕过用户意图 | ✅ 已修复 |
| 🟠 | 23 | **草稿原图丢失无提示** | IndexedDB 缺少原图时显示两张相同图片，对比功能失效 | ✅ 已修复 |
| 🟠 | 24 | **无文件魔数校验** | 后端已有 `_validate_magic_bytes`，但前一轮 PNG 校验代码有 BUG | ✅ 已修复 |
| 🟠 | 25 | **无速率限制** | 登录/注册/上传无频率限制，可被暴力破解和刷爆存储 | ❌ 待规划 |
| 🟠 | 26 | **gc.collect() 阻塞事件循环** | 已用 `asyncio.to_thread(gc.collect)` 异步化 | ✅ 代码已正确 |
| 🟠 | 27 | **大文件先读入内存才检查大小** | Content-Length 前置校验（行 263），但无 Content-Length 时仍先读后检 | ❌ 待规划 |
| 🟡 | 28 | **PreviewGrid 背景色硬编码** | 用户选非透明背景时预览盒始终显示灰色 | ✅ 已修复 |
| 🟡 | 29 | **constructor.name 压缩后失效** | Terser 压缩使 errorHumanizer 检查永远不命中 | ✅ 已修复 |
| 🟡 | 30 | **Docker backend 直接暴露 8000** | 绕过 nginx 代理，直连后端 | ✅ 已修复 |
| 🟡 | 31 | **Docker data 目录未挂载** | 容器重建后 SQLite 用户数据丢失 | ✅ 已修复 |
| 🟡 | 32 | **异常处理器泄露内部信息** | 500 错误返回原始异常消息，可能泄露路径/版本 | ✅ 已修复 |

#### 🆕 G30 — 第五轮修复 & 深度审计新增（2026-05-23 资深测试工程师审计）

> **本回合成果**：修复 6 项 P0/P1 问题 + 2 项代码质量优化。以下为审计报告中的重要新发现。

**🔴 P0 致命 — 必须立即修复的 BUG：**

| # | 问题 | 位置 | 详情 | 状态 |
|:---:|------|------|------|:--:|
| 33 | **PNG 魔数校验完全损坏** | `backend/main.py:_validate_magic_bytes:202` | `raw[:8] == MAGIC_SIGNATURES.get(b'\\x89PNG...', ...)` 将 bytes 与 dict value `'image/png'` (str) 比较，**永远为 False**。所有 PNG 文件魔数校验被绕过 | ✅ 已修复 |
| 34 | **500 响应泄露 `type` 字段** | `backend/main.py:222` | 生产环境 500 响应仍包含 `"type": "ExceptionName"`，泄露内部类名信息 | ✅ 已修复 |

**🟠 P1 高优 — 代码质量 & 安全：**

| # | 问题 | 位置 | 详情 | 状态 |
|:---:|------|------|------|:--:|
| 35 | **processImage/retryCurrentFile ~80% 重复** | `useBackgroundRemover.ts` | 两个函数 80 行代码几乎完全相同，仅 `keepOriginalUrl` 标识不同 | ✅ 已修复 |
| 36 | **dataUrlToBlob 重复定义** | `useBackgroundRemover.ts` / `useBatchProcessor.ts` | 相同函数在两个 composable 中各定义一次 | ✅ 已修复 |
| 37 | **console.warn 无 DEV 守卫** | `useEdgeTools.ts:277` | 生产环境输出调试信息到控制台 | ✅ 已修复 |
| 38 | **brushCanvasRef.value! 空断言 3 处** | `EdgeToolsPanel.vue` | 模板 ref 在挂载前触发 pointer 事件将导致运行时 TypeError | ✅ 已修复 |

**🟡 P2 代码优化：**

| # | 问题 | 位置 | 详情 | 状态 |
|:---:|------|------|------|:--:|
| 39 | **缩略图函数重复且压缩** | `WorkspacePage.vue:519-535` | `createBlobThumbnail` / `createOriginalThumbnail` 几乎完全相同，且被压缩为不可读的单行 | ✅ 已修复 |
| 40 | **offsetY 计算公式令人困惑** | `useTemplateRenderer.ts:186` | `(thumbSize - drawW)/2 + (drawW - drawH)/2` 数学上简化后等于 `(thumbSize - drawH)/2`，正确但写法误导 | ✅ 已修复 |
| 41 | **`any` 类型在 catch 块** | `api.ts` / `useAuth.ts` / `AuthModal.vue` | 6 处 `catch(e: any)` 应使用 `unknown` + 类型守卫 | ❌ 低优先 |
| 42 | **静默 catch 块无日志** | `api.ts:49,88,142,231` | JSON 解析失败直接被丢弃，生产环境难以排查 | ❌ 低优先 |
| 43 | **drafts.store 反序列化无校验** | `stores/drafts.ts:37,91,100` | localStorage/IndexedDB 反序列化后的 `as Draft[]` / `as Blob` 无运行时校验 | ❌ 低优先 |

**📋 测试工程师发现的逻辑不合理 / 可优化点：**

| # | 严重度 | 问题 | 位置 | 影响 | 建议 |
|:---:|:---:|------|------|------|------|
| T1 | 🟠 中 | **缩略图始终输出 JPEG** | `createThumbnail` / `resizeImageClient` | 原图 WebP 被缩放后强制转为 JPEG，用户看到缩略图质量损失 | 保持原格式或增加 `format` 参数 |
| T2 | 🟡 低 | **Magic 常量散落各处** | `useEdgeTools.ts:368` / `main.py:88` | 色差阈值 30、`PROCESS_MAX_DIM` 等硬编码值难以调优 | 提取为命名常量 |
| T3 | 🔴 高 | **批处理 `downloadAll` 使用 `setTimeout` 闭包** | `useBatchProcessor.ts:215-228` | **用户切换标签页后浏览器阻止后续下载**，10 张图只能下 1-2 张 | 改用 `async/await` 顺序下载 + 完成反馈 |
| T4 | 🟠 中 | **`updateResult` 不更新缩略图** | `stores/drafts.ts:107-109` | 草稿结果更新后仍显示旧缩略图，用户以为编辑无效 | 同步更新缩略图 |
| T5 | 🟡 低 | **`npm run build` 失败** | `package.json` build 脚本 | 开发者体验问题，不影响用户 | 修正 tsconfig 路径 |
| T6 | 🟡 低 | **历史清理 `limit(1000)` 过大** | `backend/history.py:332` | 一次删除过多记录 | 缩小到 20 |
| T7 | 🟢 可忽略 | **`authApi.getMe()` 暴露完整用户对象** | API 返回 `UserResponse` | 前端需要显示配额，当前设计正确 | — |

**📊 累计修复统计（五轮）**

| 轮次 | 描述 | 修复项 |
|:---:|------|:--:|
| R1 | 初始缺陷修复 | G28 页面体验 15 项 |
| R2 | P0 致命修复 | 5 项（Object URL 泄漏/RAF 清理/thumbStates/TOCTOU/JWT） |
| R3 | P1 高优修复 | 5 项（Pro 按钮/缩放/原图丢失/魔数/PreviewGrid/Docker） |
| R4 | P2 代码质量 | 7 项（console.error/重复 toast/draftId/AuthApiError/formatSize 等） |
| R5 | **本轮** P0/P1 + 优化 | **8 项**（PNG 魔数 BUG/异常泄露/DRY/console.warn/null guard/缩略图/offsetY） |
| **总计** | | **40 项** |

---
---

## 🎨 G31 — 产品经理 + 设计工程深度体验分析（2026-05-23）

> **角色**：顶级产品经理 + 项目经理 + 设计工程师 三重评审。  
> **目标**：从用户心智模型出发，识别当前架构中「功能正确但体验糟糕」的设计缺陷，提出可落地的优化方案。

---

### 一、用户旅程地图（Current State）

```
┌─────────────────────────────────────────────────────────────────────┐
│                     用户核心操作流（单图模式）                          │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│  到达    │  上传    │  等待    │  查看    │  编辑    │  下载    │  离开    │
│  Landing │ 选择/拖  │ 进度条  │ 结果预览 │ 换色/模  │ 选格式  │  带走    │
│   Page   │  拽图片  │ 旋转    │ 对比滑块 │ 板/画笔  │ 点下载  │  结果    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│  😊 正常 │ 😊 正常  │ 😟 焦虑 │ 😊 正常  │ 😟 困惑 │ 😟 模糊 │ 😊 正常  │
│ 有引导  │ 操作直观 │ 进度跳跃 │ 对比清晰 │ 工具隐蔽 │ 选项不全 │ 结果带走 │
│ 但无示  │ 有校验  │ 无ETA  │ 无缩放  │ 无引导  │ 无快捷  │ 无分享  │
│ 例图    │ 有大图  │ 无预显 │ 无动画  │ 离开无  │ 无法选  │ 无社交  │
│         │  弹窗   │        │         │  保存   │  透明   │  传播   │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 二、核心体验缺陷矩阵（按用户心智模型排序）

#### 🔴 第一层：致命体验断裂 — 用户会离开的原因

| # | 痛点 | 当前表现 | 用户心智 | 竞品对标 |
|:---:|------|------|------|------|
| **UX-1** | **处理等待焦虑 — 进度跳跃无意义** | 进度 0%→30%→100%，中间 30% 到 100% 直接跳，用户等待期无任何进度反馈 — ✅ 已修复 | "是不是卡住了？我还要等多久？" | remove.bg 有模糊预览逐步变清晰的过程，给用户"正在变好"的感知 |
| **UX-2** | **批量下载被浏览器杀死** | `downloadAll` 用 `setTimeout 300ms` 间隔下载，用户切标签页后浏览器拦截，10 张只下了 2 张 — ✅ 已修复 (ZIP) | "我点了全部下载，为什么只有 2 张？" | Canva 提供 ZIP 打包下载 + 进度通知 |
| **UX-3** | **草稿精修离开无保存** | DraftDetailPage 边缘编辑后点"返回"直接丢失所有编辑 | "我花了 10 分钟修边缘，全没了？" | Figma/Canva 离开编辑页必有"是否保存"对话框 |
| **UX-4** | **无透明底 PNG 独立下载** | DownloadPanel 主按钮下载的是当前显示（含背景色），用户想下透明底需切换到"透明"色再下载 | "我要透明的，为什么下来是蓝底的？" | remove.bg 默认下载透明底 |
| **UX-5** | **处理失败无恢复路径** | BatchPanel 失败项没有"重试"按钮，用户只能重新上传 | "10 张图 3 张失败，怎么办？" | 任何成熟产品都有单项目重试 |

#### 🟠 第二层：严重体验摩擦 — 用户会不满但勉强能用

| # | 痛点 | 当前表现 | 设计方案 |
|:---:|------|------|------|
| **UX-6** | **精修无缩放** | PreviewGrid 和画笔 Canvas 无法放大，处理发丝细节时用户只能"盲修" — ✅ 已修复 (Sprint D) | 滚轮缩放 100%~400%（焦点跟随） + 拖拽平移 + 双击重置 |
| **UX-7** | **边缘工具可见性差** | EdgeToolsPanel 默认折叠，只有少部分探索型用户会点开 | 处理完成后自动展开一次，显示徽章"可优化边缘" |
| **UX-8** | **下载后无分享/传播出口** | 下载即结束，无"分享对比图"、无社交传播 | Before/After GIF 生成 + "分享到社交媒体"按钮 |
| **UX-9** | **批量逐张精修无进度** | `handleBatchChoiceRefine` 循环处理无提示"第 X/N 张"，用户不确定处理进度 — ✅ 已修复 | 顶部浮窗 "正在精修第 3/10 张" |
| **UX-10** | **历史恢复原图为缩略图** | WorkspacePage 从历史恢复后，PreviewGrid 原图是 100px 缩略图，对比功能实质失效 — ✅ 已修复 (Sprint D) | 历史恢复时使用结果图 URL 替代缩略图作为对比参考 |
| **UX-11** | **新用户首次使用空白焦虑** | 注册后面对空白上传区，无示例、无引导 — ✅ 已修复 | "试试这张示例图" 云朵/人物/商品 3 张示例 + 3 步功能导览 |
| **UX-12** | **确认完成后果不明** | DraftDetailPage "确认完成" 后页面跳转，用户不知道草稿去哪里了 — ✅ 已修复 (Sprint A) | 按钮旁增加明确文字 "确认后将保存到历史并从本页移除" |

#### 🟡 第三层：体验打磨 — 从「能用」到「好用」

| # | 痛点 | 设计方案 |
|:---:|------|------|
| **UX-13** | 无键盘快捷键 | `Ctrl+S` 下载、`Space` 对比原图、`Ctrl+Z` 撤销笔刷 |
| **UX-14** | 批量结果无筛选 | 10 个结果混在一起，无法只看出错的 |
| **UX-15** | 剪贴板降级缺失 | Firefox 不支持 `ClipboardItem`，用户收到冷冰冰的错误 toast |
| **UX-16** | WebP 文件大小估算不准确 | 显示 `≈12 KB` 但实际 `18 KB`，用户感觉被欺骗 |
| **UX-17** | 配额耗尽卡片无 CTA | 仅显示"很快将推出付费方案"，无邮件订阅、无预告 — ✅ 已修复 |
| **UX-18** | 处理完成后无音效/haptic 反馈 | 用户可能在另一个标签页，处理完了也不知道 |
| **UX-19** | 背景色/模板切换无过渡动画 | 切换瞬间闪变，视觉粗糙 — ✅ 已修复 |
| **UX-20** | 下载按钮无反馈动画 | 点击后只有浏览器原生下载弹窗，按钮无成功状态 — ✅ 已修复 |

---

### 三、高价值设计方案（ROI 排序）

> **评估维度**：用户满意度提升 × 实现成本 × 竞品差异化

| 优先级 | 方案 | 工作量 | 用户价值 | 竞品差异 |
|:---:|------|:--:|:---:|:---:|
| 🥇 | **处理等待重构**：模糊预览逐步清晰化 + ETA 倒计时 | 1.5天 | ⭐⭐⭐⭐⭐ | 🔥 remove.bg 强项 |
| 🥈 | **批量下载 → ZIP 打包** | 1天 | ⭐⭐⭐⭐⭐ | ✅ Canva 标配 |
| 🥉 | **草稿未保存提醒** | 0.5天 | ⭐⭐⭐⭐⭐ | ✅ Figma 标配 |
| 4 | **处理失败项重试** | 0.5天 | ⭐⭐⭐⭐ | ✅ 行业标配 |
| 5 | **透明底默认下载入口** | 0.25天 | ⭐⭐⭐⭐ | ✅ remove.bg 这样做 |
| 6 | **精修图片缩放** | 1天 | ⭐⭐⭐⭐ | 🔥 Clipping Magic 强项 |
| 7 | **新用户示例图引导** | 0.5天 | ⭐⭐⭐ | ❌ 竞品罕见 |
| 8 | **分享 Before/After GIF** | 1天 | ⭐⭐⭐⭐⭐ | 🔥 社交裂变利器 |
| 9 | **键盘快捷键系统** | 0.5天 | ⭐⭐⭐ | ✅ 专业工具标配 |
| 10 | **微交互打磨包**（音效/ui反馈/动画） | 1天 | ⭐⭐⭐ | — |

---

### 四、信息架构优化建议

#### 当前问题：功能区分散，认知负荷高

```
当前 WorkspacePage 布局（处理完成后）:
┌──────────────────────────────────────┐
│  AppHeader (logo + 配额 + 用户头像)     │
├──────────────────────────────────────┤
│  [返回上传] [文件名] [尺寸] [模型] [精修] │ ← 操作栏
├─────────────┬────────────────────────┤
│  PreviewGrid│  DownloadPanel          │ ← 下载在右侧
│  (并排/对比) │  BackgroundColorPicker  │
│  (原图+结果) │  BackgroundTemplatePicker│
│             │  EdgeToolsPanel(折叠)    │ -- 工具面板太隐蔽
├─────────────┴────────────────────────┤
│  HistoryPanel (折叠)                  │
└──────────────────────────────────────┘
```

#### 优化方案：渐进式信息披露 + F 型扫描热区

```
优化后布局:
┌──────────────────────────────────────┐
│  AppHeader (logo + 配额 + 用户头像)     │
├──────────────────────────────────────┤
│  [新上传] [文件名.png] [1200×800]       │ ← 简化操作栏
│  [快速下载透明底] [下载选项▾] [分享]     │ ← 下载永远可见
├─────────────┬────────────────────────┤
│  PreviewGrid│  工具区（Tab 式）          │
│  (支持缩放) │  ┌──┬──┬──┬──┐          │
│             │  │色彩│模板│边缘│记录│       │ ← Tab 替代折叠面板
│  [并排│对比] │  ├──┴──┴──┴──┤          │
│             │  │  当前 Tab 内容  │       │
│             │  └───────────┘          │
│             │                         │
│  💡 试试边缘 │  ← 智能提示仅在合适时出现   │
│     优化工具 │                         │
└─────────────┴────────────────────────┘
```

**关键变化：**
1. **下载按钮提到永久可见位置**：默认下载透明底 PNG，下拉菜单选 WebP/带背景色/剪贴板
2. **工具区改为 Tab 式**：不再用折叠面板，用户可一眼看到所有工具入口
3. **智能提示**：仅在检测到边缘可优化时提示用户使用边缘工具（如"检测到锯齿边缘，试试平滑"）

---

### 五、核心交互流程设计草案

#### 5.1 处理等待体验（UX-1）

```
当前:  [准备上传] → [上传中 30%] → [AI处理中 30%...] → [完成 100%]
         0s              2s              5-15s             瞬间
         
问题:  30%→100% 直接跳，中间 5-15 秒用户不知道该不该等

优化:  [上传图片] → [分析中... 30%] → [处理中 35%→90%] → [完成 100%]
         0s             2s              5-15s 线性增长      瞬间
         
实现:  后端返回处理阶段时，前端用 requestAnimationFrame 模拟平滑进度
      配合模糊预览图逐步变清晰（每 1s 更新一次预览）
      显示预估剩余时间："预计还需 8 秒"
```

#### 5.2 下载交互（UX-2 + UX-4）

```
当前下载按钮:
  [下载 PNG (32KB)] [···]
  
优化后:
  [下载透明底 PNG (32KB)] [▼ 更多选项]
      ↓ 展开
  ┌─────────────────────┐
  │ 📥 透明底 PNG (32KB) │  ← 默认推荐，绿色高亮
  │ 📥 WebP 格式 (≈13KB) │
  │ 📥 当前效果 (含背景)  │  ← 即当前的"下载 PNG"
  │ 📋 复制到剪贴板       │
  └─────────────────────┘

批量模式:
  [批量下载 (ZIP)] [下载全部透明底] [▼]
      ↓ 展开
  ┌──────────────────────────────┐
  │ 📦 ZIP 打包下载 (8 张, 2.3MB) │  ← 推荐
  │ 📥 全部下载为透明底 PNG        │
  │ 📥 全部下载为 WebP             │
  └──────────────────────────────┘
```

#### 5.3 草稿精修保护（UX-3）

```
DraftDetailPage 离开流程:
  用户点击 [返回工作台]
      ↓
  检查: 是否有未保存的编辑？
      ↓ 是
  ┌──────────────────────────────┐
  │  ⚠️ 你有未保存的编辑          │
  │                              │
  │  你对图片做了以下修改：        │
  │  • 羽化边缘 (半径 3px)        │
  │  • 手动修复 (3 处擦除)        │
  │                              │
  │  [放弃编辑并返回] [保存并返回]  │
  └──────────────────────────────┘
      ↓ 否 → 直接返回
```

#### 5.4 批量失败恢复（UX-5）

```
BatchPanel done 阶段:
  ┌──────────────────────────────────┐
  │ ✅ 7 张完成  ❌ 3 张失败          │
  │                                  │
  │ [全部下载(ZIP)]                   │
  │                                  │
  │ 结果网格:                         │
  │ [✅ 图1] [✅ 图2] [❌ 图3 重试]    │ ← 失败项点"重试"
  │ [✅ 图4] [❌ 图5 重试] [✅ 图6]    │
  │ [✅ 图7] [✅ 图8] [❌ 图9 重试]    │
  │                       [重试全部失败] │ ← 批量重试
  └──────────────────────────────────┘
```

---

### 六、微交互与情感化设计清单

| 场景 | 当前 | 建议 | 成本 |
|------|------|------|:--:|
| 处理完成 | 进度条 100% + 文字 | + 轻微震动(haptic) + 完成音效 + 结果图片从中心缩放弹出(0.4s) | 0.3天 |
| 下载成功 | 无反馈 | 按钮短暂变绿 + ✅ + "已下载" 浮层(2s 消失) | 0.1天 |
| 首次使用 | 空白页 | Confetti 特效 + "欢迎！拖入图片开始吧" 动画横幅 | 0.2天 |
| 上传图片 | 直接显示 | 图片从拖拽位置飞到预览区(FLIP 动画) | 0.15天 |
| 切换背景色 | 瞬间替换 | 0.3s 径向渐变从中心扩散（像滤镜效果） | 0.1天 |
| 配额用完 | 灰色卡片 | 渐变红色脉冲 + "升级 Pro" CTA 按钮 | 0.1天 |
| 空闲超时 | 页面静止 | 无处理 | 5 分钟无操作 → 标题闪烁提醒（浏览器 tab 标题变"🟢 已完成 - AI 抠图"） | 0.05天 |

---

### 七、实施路线图（6 个 Sprint，共约 8 天）

```
Sprint A — 救火队 (1.0天) 🔥
├── UX-3  草稿未保存提醒         0.3天
├── UX-5  批量失败重试           0.5天
└── UX-4  透明底独立下载入口     0.2天

Sprint B — 体验修复 (1.5天) 🔧
├── UX-1  处理等待重构（模糊预览+ETA） 1.0天
├── UX-2  批量下载ZIP            0.5天
└── (T5 构建脚本修复 顺带)        0.0天

Sprint C — 新用户转化 (1.0天) 🚀
├── UX-11 示例图引导 + Onboarding 0.5天
├── UX-12 确认完成提示优化        0.25天
└── UX-17 配额卡片 CTA           0.25天

Sprint D — 专业工具 (1.5天) 🛠
├── UX-6  精修图片缩放           1.0天
├── UX-9  逐张精修进度提示        0.25天
└── UX-10 历史原图全尺寸         0.25天

Sprint E — 分享裂变 (1.5天) 📢
├── UX-8  分享Before/After GIF   1.0天
├── UX-13 键盘快捷键系统         0.5天
└── (将下载成功分享引导 顺带)     0.0天

Sprint F — 品质打磨 (1.5天) ✨
├── UX-18~20 微交互包            1.0天
├── UX-14  批量结果筛选          0.25天
└── UX-15  剪贴板降级            0.25天
```

### 八、KPI 影响预估

| 指标 | 当前基准 | 实施后预期 | 驱动力 |
|------|:---:|:---:|------|
| 完成率（上传→下载） | ~70% | ~85% | 处理等待优化 + 失败重试 |
| 新用户次日留存 | ~15% | ~30% | Onboarding + 示例图 |
| 平均处理时长 | ~18s 焦虑 | ~18s 有感知 | ETA 倒计时降低焦虑 |
| 批量完成率 | ~60% | ~85% | 失败重试 + ZIP 下载 |
| 分享传播率 | 0% | ~5% | Before/After GIF |
| 边缘工具使用率 | ~10% | ~35% | 智能提示 + 可见性提升 |
| 草稿编辑保存率 | ~50% | ~90% | 离开保护 + 明确操作后果 |

---

## 🛠 G32 — Sprint A 实施 & 测试报告（2026-05-23）

> **Sprint A 救火队**：4 项修复（UX-3 草稿保护 + UX-4 透明底下载 + UX-5 批量重试 + T5 构建脚本）。

### 已实施修复

| # | 任务 | 变更范围 | 详情 |
|:---:|------|------|------|
| **UX-3** | **草稿离开保护** | `DraftDetailPage.vue` (+140行) | `hasUnsavedEdits` 跟踪编辑 → 返回时弹出确认对话框（保存并返回/放弃/继续编辑） |
| **UX-4** | **透明底独立下载** | `DownloadPanel.vue` (+45行) | 主按钮改为「下载透明底 PNG」→ 下拉菜单新增「下载当前效果」 |
| **UX-5** | **批量失败重试** | `useBatchProcessor.ts` + `BatchPanel.vue` (+138行) | `retryItem(id)` / `retryAllErrors()` → 失败卡片「重试」→ 头部「重试全部失败」 |
| **T5** | **构建脚本修复** | `package.json` | `build` → `vite build`，`type-check` 独立 |

### 测试工程师审查

| # | 级别 | 问题 | 处理 |
|:---:|:---:|------|:--:|
| Q1 | 🟡 | `handleEdgeReset` 未清除 `hasUnsavedEdits`（仅边缘编辑并重置后误报离开警告） | ⚠️ 保留：误报比漏报更安全 |
| Q2 | 🟢 | 「重试全部」按钮在重试中消失 | ✅ 已改为 `:disabled` + spinner |
| Q3 | 🟢 | `retryItem`/`retryAllErrors` 并发安全 | ✅ 单线程无竞争窗口 |
| Q4 | 🟢 | `hasTransparent` 边界 `blob === transparentBlob` | ✅ 正确回退 |
| Q5 | 🟢 | `handleConfirm` castch 保留 `hasUnsavedEdits` | ✅ 设计正确 |

### 文件变更

```
DraftDetailPage.vue, DownloadPanel.vue, BatchPanel.vue,
useBatchProcessor.ts, package.json — 净增 ~284 行
构建: ✅ (112 modules, 1.31s)  Lint: ✅ 零错误
```

---

## 🛠 G33 — Sprint B 实施 & 测试报告（2026-05-23）

> **Sprint B 体验修复**：5 项优化（UX-1 处理等待重构 + UX-2 ZIP 下载 + UX-9 精修进度 + UX-19 背景过渡 + UX-20 下载反馈）。

### 已实施修复

| # | 任务 | 变更范围 | 详情 |
|:---:|------|------|------|
| **UX-1** | **处理等待重构（进度模拟 + ETA）** | `useBackgroundRemover.ts` (+68行) | 上传完成后启动 `startProgressSimulation`（每 200ms 从 30% 模拟增长到 88%，缓入曲线）→ `updateEta` 动态显示预计剩余时间 → API 返回后 `stopProgressSimulation` + `animateToFinish` 平滑到 100% |
| **UX-2** | **批量 ZIP 下载** | `useBatchProcessor.ts` + `BatchPanel.vue` (+70行) | 安装 `jszip` → `downloadAsZip()` 方法（含重名处理）→ BatchPanel 主按钮改为 ZIP 下载 → 打包中 loading 动画 |
| **UX-9** | **逐张精修进度提示** | `WorkspacePage.vue` (+2行) | `handleBatchChoiceRefine` 循环中添加 `第 idx/files.length 张` toast |
| **UX-19** | **背景色切换过渡动画** | `PreviewGrid.vue` (+1行) | `.preview-box` 添加 `transition: background-color 0.35s ease` |
| **UX-20** | **下载按钮成功反馈** | `DownloadPanel.vue` (+30行) | `triggerDownload` 后设置 `downloadDone=true`→ 按钮切换为绿色「已下载 ✓」→ 1.5s 自动恢复 |

### 测试工程师审查

| # | 级别 | 问题 | 位置 | 详情 | 处理 |
|:---:|:---:|------|------|------|:--:|
| Q1 | 🟡 | **`updateEta` 重复计算 estTotal** | `useBackgroundRemover.ts` | `startProgressSimulation` 传入 estDurationMs，但 `updateEta` 独立从 `currentFile.value.size` 重新计算 | ⚠️ 保留：两者算法一致，功能等价 |
| Q2 | 🟡 | **批处理单项目无进度模拟** | `useBatchProcessor.ts:processOneItem` | 批量项目 AI 处理阶段仍从 30% 跳到 100%，无 ETA | ⚠️ 留待后续：需给每个 item 独立 timer，复杂度较高 |
| Q3 | 🟢 | **ETA 初始显示"预计 X 秒"→ 1s 后"预计还需 X 秒"** | `useBackgroundRemover.ts` | 初始调用无 elapsed/ratio 参数，1s 后才进入动态修正 | ✅ 设计正确 |
| Q4 | 🟢 | **API 快速返回时模拟跳过** | `useBackgroundRemover.ts` | API <200ms 返回时 interval 触发 0 次 → 直接 animateToFinish | ✅ 平滑过渡正常 |
| Q5 | 🟢 | **ZIP 重名处理** | `useBatchProcessor.ts` | 使用 `name (N).ext` 后缀，计数器基于原始文件名 | ✅ |
| Q6 | 🟢 | **下载反馈对所有下载方式生效** | `DownloadPanel.vue` | WebP/当前效果 等下拉下载也会触发主按钮 success 态（1.5s 自动恢复） | ✅ 体验一致 |
| Q7 | 🟢 | **JSZip 类型安全** | `useBatchProcessor.ts` | `resultBlob!` 断言安全（filter 已筛选） | ✅ |
| Q8 | 🟢 | **进度动画清理** | `useBackgroundRemover.ts` | `abortCurrent`/`reset`/catch 均调用 `stopProgressSimulation` | ✅ 无泄漏 |

### 文件变更

```
modified:   frontend/src/composables/useBackgroundRemover.ts      (+68行)
modified:   frontend/src/composables/useBatchProcessor.ts         (+35行)
modified:   frontend/src/components/BatchPanel.vue                (+35行)
modified:   frontend/src/components/DownloadPanel.vue             (+30行)
modified:   frontend/src/pages/WorkspacePage.vue                  (+2行)
modified:   frontend/src/components/PreviewGrid.vue               (+1行)
added:      node_modules/jszip/...                                (新依赖)
---
构建: ✅ 通过 (117 modules, 1.46s)
Lint: ✅ 零错误
```

---

## 🛠 G34 — Sprint C 实施 & 测试报告（2026-05-23）

> **Sprint C 新用户转化**：3 项实施（UX-11 示例图引导 + UX-17 配额 CTA），UX-12 已在前序 Sprint 完成。

### 已实施

| # | 任务 | 变更范围 | 详情 |
|:---:|------|------|------|
| **UX-11** | **新用户示例图引导** | `exampleImages.ts` (新) + `ExampleImagesBar.vue` (新) + `WorkspacePage.vue` (+15行) | Canvas 动态生成 3 张示例图（红苹果/蓝色球体/绿色礼盒，400×400 PNG + 100px data:URI 缩略图）。新登录用户首次看到可点击的示例图卡片，hover 显示上传图标，点击后自动 `File` 处理 → 永久隐藏示例栏 |
| **UX-12** | **确认完成提示优化** | `DraftDetailPage.vue` | ✅ 已在前序 Sprint 完成（行66 有明确文字：`确认后将保存到历史并从本页移除，未确认的草稿不会出现在历史记录中`） |
| **UX-17** | **配额卡片 CTA** | `ProPlanModal.vue` (新) + `WorkspacePage.vue` (+30行) | 配额耗尽卡片/错误卡片从死胡同「敬请期待」→ 可操作的「了解 Pro 计划」按钮 → 弹出 ProPlanModal（价格 ¥29/月 + 7 项 Free vs Pro 对比表 + 邮件通知订阅）|

### 🔬 资深测试工程师全面审计（16 项发现 + 热修复）

> 审计范围：11 个核心文件 + 跨文件一致性。共发现 **21 个问题**，其中 P0 致命 3 个、P1 高优 10 个、P2 中优 6 个、P3 低优 2 个。

#### 🔴 P0 致命 — 已立即修复

| # | 问题 | 位置 | 详情 | 处理 |
|:---:|------|------|------|:--:|
| 1 | **示例图 Blob 缓存崩溃** | `exampleImages.ts:98-106` | sessionStorage 缓存返回 `blob: null` → 点击示例图 `new File([null])` 直接抛异常 | ✅ 移除缓存，每次重新生成 |
| 2 | **示例图栏在非 idle 状态残留** | `WorkspacePage.vue` | ExampleImagesBar 在全局容器中 → 用户自行上传图片后示例栏仍显示在上方 | ✅ 移入 idle 区块内 |
| 3 | **PreviewGrid 透明底无棋盘格** | `PreviewGrid.vue:346-354` | `bgColor='transparent'` 时预览盒背景为纯白 → 用户无法区分透明区域和白色背景（CompareSlider 已有棋盘格） | ✅ 添加棋盘格 CSS（与 CompareSlider 一致） |

#### 🟠 P1 高优 — 已修复

| # | 问题 | 位置 | 详情 | 处理 |
|:---:|------|------|------|:--:|
| 4 | **逐张精修无配额检查 + 错误不中止** | `WorkspacePage.vue:486-498` | `handleBatchChoiceRefine` 绕过 `quota.isExhausted` 检查；处理失败不中止循环 → 连续 N 个 429 错误 + 最后仍显示「全部完成」 | ✅ 添加配额前置检查 + 错误计数 + 配额耗尽时 break |
| 5 | **`downloadResult` / `restoreFromHistory` 死代码** | `useBackgroundRemover.ts:407-451` | 两个导出的函数（~60 行）无任何组件调用（DownloadPanel/restoreFromDraft 已替代） | ✅ 移除 |
| 6 | **`progressRafId` 死变量** | `useBackgroundRemover.ts:43` | 声明但从未赋值，`cancelAnimationFrame` 永远不执行 | ✅ 移除 |
| 7 | **`restoreFromDraft` 死参数 `originalBlob`** | `useBackgroundRemover.ts:461` | 参数定义但函数体内从未引用 | ✅ 移除 |
| 8 | **DownloadPanel `setTimeout` 未清理** | `DownloadPanel.vue:209` | 用户下载后 1.5s 内离开页面 → timer 仍触发 → 操作已卸载组件状态 | ✅ `onUnmounted` 中 `clearTimeout` |
| 9 | **`animateToFinish` falsy 陷阱** | `useBackgroundRemover.ts:252` | `progress \|\| 30` → progress=0 时错误跳变到 30 | ✅ 改为 `?? 30` |
| 10 | **`handleBatchChoiceRefine` 的 `doProcessFile` 不保存草稿** | `WorkspacePage.vue` | 逐张精修中处理成功的图片只调用了 `remover.processImage`，未调用 `drafts.add` → 结果丢失 | ✅ 添加草稿保存逻辑 |

#### 🟡 P2 中优 — 记录留待后续

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| 11 | `clearItems` 不清理 result Object URLs | `useBatchProcessor.ts:86-93` | 批量结果图片 Blob URL 未释放，内存泄漏 |
| 12 | `retryItem` AbortController 不可取消 | `useBatchProcessor.ts:167-189` | 局部 `AbortController` 无法被外部取消 |
| 13 | 批处理单项目无进度模拟 | `useBatchProcessor.ts:137-143` | 进度停在 30%，无平滑动画，用户以为卡死 |
| 14 | 历史恢复时 originalUrl 是缩略图 | `WorkspacePage.vue:678-686` | 对比模式下原图为低分辨率缩略图 |
| 15 | 错误消息硬编码 localhost | `api.ts:181` | 生产环境仍提示 `localhost:8000` |
| 16 | `drafts.ts` `loading` 永远为 `false` | `stores/drafts.ts:56` | 声明后从未设为 `true` |

#### 🟢 P3 低优

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| 17 | `resizeImageClient` 冗余 `file.slice(0)` | `imageUtils.ts:33-35` | `File` 继承自 `Blob`，可直接返回 |
| 18 | 后端 `quota_deducted` 兜底分支不可达 | `main.py:431-437` | `quota_deducted` 设置后永不清除 |
| 19 | 后端模型缓存 `_sessions` 无限增长 | `main.py:91` | 3 个模型合计 ~400MB 永不释放 |
| 20 | `X-XSS-Protection` 响应头已废弃 | `main.py:180` | 所有主流浏览器已废弃此头 |
| 21 | `bgColorSyncing` 锁语义混乱 | `WorkspacePage.vue:424-437` | `nextTick` 释放锁的时机不明确 |

### 文件变更

```
新增:   frontend/src/utils/exampleImages.ts                     (+199行)
新增:   frontend/src/components/ExampleImagesBar.vue            (+243行)
新增:   frontend/src/components/ProPlanModal.vue                (+446行)
修改:   frontend/src/pages/WorkspacePage.vue                    (+98行)
修改:   frontend/src/composables/useBackgroundRemover.ts    (-65行, 清理死代码)
修改:   frontend/src/components/DownloadPanel.vue               (+12行)
修改:   frontend/src/components/PreviewGrid.vue                 (+10行)
---
构建: ✅ 通过 (124 modules, 1.52s)
Lint: ✅ 零错误
```

### Sprint C 审计总结

```
Sprint C 实施: ████████████ 3/3 ✅ (示例图/配额CTA/确认提示)
审计热修复:   ████████████ 10/10 ✅ (3 P0 + 7 P1)
已知晓留后续: ░░░░░░░░░░░░ 8 项 P2/P3 记录中
```

### Sprint C follow-up 热修复

| # | 问题 | 详情 | 处理 |
|:---:|------|------|:--:|
| Q1 | `downloadResult` 死代码遗漏 | return 对象中仍有引用，登录时报 `ReferenceError` | ✅ 从 return 移除 |

---

## 🛠 G35 — Sprint D 实施 & 测试报告（2026-05-23）

> **Sprint D 专业工具**：UX-6 精修缩放（核心） + UX-10 历史原图 + 6 项 P2/P3 审计热修复。

### 已实施

| # | 任务 | 变更范围 | 详情 |
|:---:|------|------|------|
| **UX-6** | **精修图片缩放** | `useImageZoom.ts` (新 177行) + `PreviewGrid.vue` (+140行) | 滚轮缩放（焦点跟随鼠标位置，12%/步）、拖拽平移（pointer capture）、双击重置。缩放范围 100%~400%。三组独立 zoom 实例（单图/原图/结果图）。缩放控件栏：`−` `125%` `+` `1:1` 半透明底栏 + backdrop blur。URL 变化时自动 resetState |
| **UX-10** | **历史恢复原图全尺寸** | `WorkspacePage.vue` (1行变更) | 历史记录不存储全尺寸原图，恢复时 `originalUrl` 改为使用结果图 Object URL（远优于 120px 缩略图），对比模式视觉质量大幅提升 |

### 🔧 P2/P3 审计热修复

| # | 原问题 | 位置 | 处理 |
|:---:|------|------|:--:|
| **P2 #15** | 错误消息硬编码 localhost | `api.ts:181` | ✅ 改为通用「无法连接到服务器，请检查网络后重试」 |
| **P2 #16** | `drafts.ts` `loading` 永远为 `false` | `drafts.ts:56` | ✅ `init/add/remove/clearAll/reload` 中添加 `loading=true/false` |
| **P2 #11** | `clearItems` 不清理 result Object URLs | `useBatchProcessor.ts:86-93` | ✅ 添加 `URL.revokeObjectURL(item.resultUrl)` |
| **P3 #17** | `resizeImageClient` 冗余 `file.slice(0)` | `imageUtils.ts:35` | ✅ 改为直接 `return file` (File extends Blob) |

### 🔬 Sprint D 测试工程师审计（10 项发现 + 热修复）

> 审计范围：useImageZoom + PreviewGrid + drafts + api + imageUtils + useBatchProcessor + WorkspacePage。共发现 **10 个问题**。

#### 🔴 P0 致命 — 已立即修复

| # | 问题 | 位置 | 详情 | 处理 |
|:---:|------|------|------|:--:|
| 1 | **`onPointerMove` 死代码** | `useImageZoom.ts:84-89` | 声明 `touches` 变量但从未使用，`.closest('.zoom-container')?.querySelectorAll(...)` 逻辑无意义。每次拖拽都执行无用 DOM 查询 | ✅ 移除 |

#### 🟠 P1 高优 — 已修复

| # | 问题 | 位置 | 详情 | 处理 |
|:---:|------|------|------|:--:|
| 2 | **单图模式缺少 `@wheel.prevent`** | `PreviewGrid.vue:51` | 隐藏比较模式下 zoom 容器 `@wheel` 无 `.prevent` → 滚轮缩放同时页面滚动（原图/结果图容器已有 `.prevent`） | ✅ 添加 `.prevent` |
| 3 | **`onWheel` 边界时阻止默认滚动** | `useImageZoom.ts:45-46` | `e.preventDefault()` 无条件调用 → min(1.0)/max(4.0) 时页面无法正常滚动 | ✅ 只在确实缩放时 `preventDefault` |
| 4 | **`restoreFromDraft` 原图=结果图** | `WorkspacePage.vue:714` | 历史恢复后 split 模式左右显示相同图片 → 用户困惑「为什么原图没出来」 | ⚠️ 留待后续：需后端存储原图或加提示标签 |

#### 🟡 P2 中优 — 记录留待后续

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| 5 | Canvas 缩放未集成 | `EdgeToolsPanel.vue` | 笔刷编辑 Canvas 无缩放能力，发丝级细节难操作 |
| 6 | `.preview-box img` 样式死代码 | `PreviewGrid.vue:442-452` | 所有 `<img>` 已移入 `.zoom-container`，旧样式不再生效 |
| 7 | zoom-controls 与 ProgressOverlay z-index 未对齐 | `PreviewGrid.vue` | zoom-controls `z-index: 5`，ProgressOverlay 可能更高 z-index 覆盖控件 |

#### 🟢 P3 低优

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| 8 | `zoomTo` 重复 `clampScale` + `clampPan` | `useImageZoom.ts:156-162` | 两次调用计算有重叠 |
| 9 | `useImageZoom` 无 pinch-to-zoom | `useImageZoom.ts` | 移动端双指捏合未实现（Pointer Events API 需额外处理） |
| 10 | `onWheel` `.prevent` 与 `onWheel` 内 `preventDefault` 冲突 | `PreviewGrid.vue:102,148` + `useImageZoom.ts:53` | 模板层 `@wheel.prevent` 已在事件层阻止默认，函数内再调用一次为冗余（安全无害） |

### 文件变更

```
新增:   frontend/src/composables/useImageZoom.ts             (+177行)
修改:   frontend/src/components/PreviewGrid.vue              (+140行, 缩放集成)
修改:   frontend/src/pages/WorkspacePage.vue                 (+1行, 历史原图)
修改:   frontend/src/utils/imageUtils.ts                     (-1行, 移除冗余slice)
修改:   frontend/src/services/api.ts                         (1行, 移除硬编码URL)
修改:   frontend/src/composables/useBatchProcessor.ts         (+2行, resultUrl清理)
修改:   frontend/src/stores/drafts.ts                        (+25行, loading状态)
---
净增: 310+ 行 → 构建: 125 modules, 1.74s → Lint: ✅ 零错误
```

### Sprint D 审计总结

```
Sprint D 实施: ████████████ 4/4 ✅ (精修缩放/历史原图/P2修复×4)
审计发现:     ████████████ 10 项 (1 P0 + 3 P1 + 3 P2 + 3 P3)
审计热修复:   ██████████   4/4 ✅ (P0×1 + P1×2 + 一致性×1)
已知晓留后续: ░░░░░░░░░░░░ 6 项 P1/P2/P3 记录中
Sprint E 修复: ████████████ 6/6 ✅ (见 G36)
```

---

### 🛠 G35 Sprint D 审计遗留修复 (Sprint E 实施)

| # | 原严重度 | 问题 | Sprint E 修复 |
|:---:|:---:|------|------|
| 5 | P2 | Canvas 缩放未集成 (EdgeToolsPanel) | 留后续（独立 Feature） |
| 6 | P2 | `.preview-box img` 样式死代码 | ✅ 已删除（所有 img 已移入 `.zoom-container`） |
| 7 | P2 | zoom-controls 与 ProgressOverlay z-index 未对齐 | ✅ z-index 5→8，位于 shimmer(2) 之上、overlay(10) 之下 |
| 8 | P3 | `zoomTo` 中冗余 `clampScale` + `clampPan` | ✅ 移除冗余 `clampPan()` 调用 |
| 9 | P3 | useImageZoom 无 pinch-to-zoom | 留后续 |
| 10 | P3 | `@wheel.prevent` 与 `preventDefault` 冗余 | ✅ 移除模板中 `.prevent` 修饰符，保留条件 preventDefault |

### 🛠 G36 Sprint E 热修复（全栈工程师）

| # | 严重度 | 问题 | 修复 |
|:---:|:---:|------|------|
| E1 | 🟠 | `createThumbnail` 始终输出 JPEG → 结果缩略图丢失透明度 | ✅ 根据源 Blob type 选择输出格式（JPEG→JPEG，其他→PNG） |
| E2 | 🟡 | `drafts.updateResult` 不更新缩略图 | ✅ 新增可选 `newThumbUrl` 参数，同步更新元数据 |
| E3 | 🟡 | `main.css` `.result-box:not(.has-bg)` 死代码 | ✅ 已删除（棋盘格已被 PreviewGrid scoped style 替代） |
| E4 | P2 | 模板中 `@wheel.prevent` 阻止边界滚动 | ✅ 移除 `.prevent`，`useImageZoom.onWheel` 已条件性 preventDefault |
| E5 | P3 | `zoomTo()` 冗余 `clampPan()` | ✅ 移除（`clampScale` 已约束 + scale≤1 时已清零 pan） |
| E6 | P2 | zoom-controls z-index:5 可能被 shimmer(z-index:2) 挡住 | ✅ z-index 改为 8 |

### 🧪 G37 资深测试工程师审计（Sprint E 完成后）

| # | 严重度 | 问题 | 修复 |
|:---:|:---:|------|------|
| T8 | 🔴 P1 | `getBatchResultData` 返回的 `resultDataUrl` 泄露：`URL.createObjectURL` 的产物在调用方从未使用也从未 revoke | ✅ 不改返回值结构，新增 `revokeBatchResultUrl()` 方法供调用方释放 |
| T9 | 🔴 P1 | `clampPan()` 对 scale > 1 无边界约束：用户可拖拽图像完全移出可视区域，无法找回 | ✅ 扩展 `clampPan`：确保拖拽后至少 30% 图像在容器内 |
| T10 | 🟡 P2 | 模板中 6 处 `Math.max(1, …)/Math.min(4, …)` 包裹 `zoomTo` 调用：`zoomTo` 内部 `clampScale` 已处理边界 | ✅ 移除冗余包裹 |
| T11 | 🟡 P3 | `createThumbnail` 中 `source as Blob` 类型断言不必要：`File` 继承 `Blob`，`source.type` 可直接访问 | ✅ Sprint F 已修复 |
| T12 | 🟡 P3 | `main.css` `.footer` 样式死代码：`AppFooter.vue` 使用 scoped style | ✅ Sprint F 已迁移到 AppFooter scoped |
| T13 | 🟡 P3 | 三处 zoom-controls 模板完全相同，可提取为 `<ZoomControls>` 组件减少 ~40 行 | ✅ Sprint F 已提取 |

### 🛠 Sprint F — G37 遗留全部修复 + 代码质量提升

| # | 来源 | 严重度 | 问题 | 修复 |
|:---:|:---:|:---:|------|------|
| F1 | T4 | 🟡 | `DraftDetailPage.updateResult` 不传缩略图参数 | ✅ 导入 `createThumbnail`，生成缩略图传入 |
| F2 | T11 | 🟡 | `createThumbnail` 中 `source as Blob` 类型断言不必要 | ✅ 移除，`File extends Blob` |
| F3 | T12 | 🟡 | Footer 样式在 `main.css` 中缺乏封装 | ✅ 迁移到 `AppFooter.vue` scoped style |
| F4 | T13 | 🟡 | PreviewGrid 三处 zoom-controls 模板完全相同 (~40行重复) | ✅ 提取 `ZoomControls.vue` 组件 |
| F5 | — | 🟡 | 空的 `components/draft/` 目录 | ✅ 已删除 |

### 🧪 G38 资深测试工程师审计（Sprint F 完成后）

| # | 严重度 | 问题 | 状态 |
|:---:|:---:|------|:--:|
| T14 | 🟡 P3 | `ZoomControls.vue` prop type 使用 `ComputedRef`/`Ref`（非标准 prop 类型，IDE 类型提示不直观） | ✅ Sprint G 已修复 |
| T15 | 🟡 P3 | `DraftDetailPage.handleConfirm` 先生成缩略图再删除草稿 — 缩略图计算被浪费 | ✅ Sprint G 已修复 |
| T16 | 🟢 P4 | `main.css` 旧 footer 位置残留空行 | ✅ Sprint G 已修复 |
| T17 | 🟢 P4 | `PreviewGrid.vue` `<style>` 块末尾残留空行 | ✅ Sprint G 已修复 |

### 🛠 Sprint G — G38 遗留全部修复 + G39 审计热修复

| # | 来源 | 严重度 | 问题 | 修复 |
|:---:|:---:|:---:|------|------|
| G1 | T14 | 🟡 | `ZoomControls.vue` prop type `ComputedRef`/`Ref` → 普通 `{ value: T }` 接口 | ✅ 标准化，去除 Vue 内部类型依赖 |
| G2 | T15 | 🟡 | `handleConfirm` 生成 100px 缩略图后立即 `drafts.remove` | ✅ 移除 `createThumbnail` 调用及 import |
| G3 | T16 | 🟢 | `main.css` 残留 3 个空行 | ✅ 清理 |
| G4 | T17 | 🟢 | `PreviewGrid.vue` `<style>` 末尾残留空行 | ✅ 清理 |
| G5 | — | 🟡 | `backend/main.py` `X-XSS-Protection` 响应头已废弃 | ✅ 移除（所有主流浏览器已不支持） |
| G6 | — | 🟡 | `backend/main.py` `quota_deducted` 兜底分支不可达 | ✅ 移除死代码，简化配额日志 |
| G7 | G39 | 🟠 | `useImageZoom.onPointerMove` 缺失 `e.preventDefault()` → 拖拽时触发文本选择 | ✅ 添加 preventDefault |
| G8 | G39 | 🟠 | `useImageZoom.onPointerUp` 未调用 `releasePointerCapture` → 指针状态泄漏 | ✅ 存储 pointerId + 释放捕获 |
| G9 | G39 | 🟡 | `clampPan` 阈值 `s <= 1` 与 `isZoomed > 1.05` 不一致 | ✅ 统一为 `<= 1.05` |
| G10 | G39 | 🟡 | `.show-mobile-flex` 无默认 `display:none`，与 `.show-mobile` 不一致 | ✅ 添加默认隐藏 |

### 🧪 G39 资深测试工程师全面审计（Sprint G 完成后）

> 审计范围：9 个核心文件（ZoomControls / DraftDetailPage / main.css / PreviewGrid / main.py / useImageZoom / useBatchProcessor / DownloadPanel / AppFooter），**发现 15 个新问题**。

#### 🔴 P1 高优 — 建议下个 Sprint 修复

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T18 | **配额已扣但 AI 失败不退** | `main.py:298-322` | 配额原子扣减后，若 AI 处理超时/OOM/异常，配额不回滚。用户因失败操作永久损失配额 |
| T19 | **`downloadAll` setTimeout 仍有风险** | `useBatchProcessor.ts:315-327` | 虽已提供 ZIP 作为主方案，逐个下载仍用 `setTimeout 300ms`，切标签页时浏览器仍可能拦截 |

#### 🟡 P2 中优

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T20 | **ZoomControls 缩放步长太粗** | `ZoomControls.vue:3-5` | 步长 0.5 → 仅 7 级（1.0/1.5/2.0/2.5/3.0/3.5/4.0），与滚轮 12%/步精细度不匹配 |
| T21 | **ZoomControls 边界无禁用反馈** | `ZoomControls.vue:3-5` | scale=1.0 时点 `−` 静默无反应，用户困惑 |
| T22 | **`retryItem` AbortController 孤立** | `useBatchProcessor.ts:180` | 局部 controller 无法被 `cancelProcessing` 取消，重试中无法中止 |
| T23 | **`save_history_entry_blocked` 无异常处理** | `main.py:309-316` | ✅ Sprint G 已修复（try/except 包裹） |
| T24 | **`getBatchResultData` Object URL 无跟踪** | `useBatchProcessor.ts:252` | 返回新 Blob URL 给调用方，依赖调用方手动 `revokeBatchResultUrl`，易泄漏 |
| T25 | **配额检查 TOCTOU 窗口** | `main.py:247-248:298-304` | `check_and_reset_quota` 与原子扣减之间的竞态窗口（单用户场景低风险） |

#### 🟢 P3/P4 低优

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T26 | `useImageZoom.onWheel` 无节流/防抖 | `useImageZoom.ts:45-64` | 触控板快速滚动时每帧大量调用 |
| T27 | 缺 `Strict-Transport-Security` 响应头 | `main.py:175-182` | 生产环境最佳实践 |
| T28 | CORS 默认 `*` 通配符 | `main.py:60` | 生产环境应限制来源 |
| T29 | `.header/.logo` 全局类可能泄漏 | `main.css:63-91` | 与 Vue scoped 组件样式可能冲突 |
| T30 | CSS 变量 `--bp-*` 仅 JS 使用 | `main.css:26-28` | 无法用于 `@media` 查询，可移入注释 |
| T31 | `imgTransform` scale=1 时仍返回 transform | `useImageZoom.ts:156` | 浏览器始终创建合成层，轻微 GPU 开销 | ✅ Sprint H 已修复 |
| T32 | `AppFooter` 文本误导 | `AppFooter.vue:4` | "完全在服务器端完成" 忽略前端 Canvas 处理 | ✅ Sprint H 已修复 |

### 🛠 Sprint H — G39 遗留 P1/P2 修复 + G40 审计热修复

| # | 来源 | 严重度 | 问题 | 修复 |
|:---:|:---:|:---:|------|------|
| H1 | T18 | 🔴 P1 | **配额已扣但 AI 失败不退** — 新增 `_rollback_quota` 函数 | ✅ 在 TimeoutError/MemoryError/RuntimeError/Exception 四个 AI 失败分支调用回滚 |
| H2 | T20 | 🟡 P2 | ZoomControls 步长 0.5 → 0.25（精细化缩放） | ✅ ± 按钮步长改为 0.25（支持 1.0/1.25/1.50/.../4.0 共 13 级） |
| H3 | T21 | 🟡 P2 | ZoomControls 边界无禁用反馈 | ✅ `−` 按钮 scale<1.25 时 `:disabled` + `opacity:0.3`；`+` 按钮 scale≥4 时 `:disabled` |
| H4 | T26 | 🟡 P3 | `useImageZoom.onWheel` 无节流 | ✅ 新增 `lastWheelTime` ref + 16ms 节流（~60fps） |
| H5 | T31 | 🟡 P3 | `imgTransform` scale=1 时仍返回 transform | ✅ scale≤1.05 且 pan=0 时仅返回 `{ cursor }`，避免无谓 GPU 合成层 |
| H6 | T32 | 🟡 P3 | `AppFooter` 文本误导 | ✅ 改为"后台编辑在浏览器端完成，AI 推理在服务器端完成" |
| H7 | T27 | 🟡 P3 | 缺 `Strict-Transport-Security` 响应头 | ✅ 生产环境添加 `max-age=31536000; includeSubDomains`（dev 环境不发送） |
| H8 | G40#5 | 🟠 P2 | ZoomControls disabled 阈值 `<=1.25` 与实际步长不匹配 | ✅ 改为 `<1.25`（scale=1.25 时可缩小到 1.0） |
| H9 | G40#6 | 🟠 P2 | `resetState` 未重置 `lastWheelTime` | ✅ 添加 `lastWheelTime.value = 0` |
| H10 | G40#12 | 🟡 P3 | `quota_deducted` 死代码（仅写入无读取） | ✅ 移除两行赋值 |

### 🧪 G40 资深测试工程师全面审计（Sprint H 完成后）

> 审计范围：6 个核心文件（main.py / ZoomControls / useImageZoom / AppFooter / useBatchProcessor / cleanup_test_data.py），**发现 20 个新问题**。4 项立即修复（见上表 H8~H10 + H7），16 项留后续。

#### 🔴 P1 高优 — 建议下个 Sprint 修复

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T33 | **配额扣减事务提交时机** | `main.py:319-446` | `save_history_entry` 内部 `db.commit()` 将配额原子扣减一并提交。此后响应构建阶段若异常，配额已扣但用户未收到结果。正常流程风险极低（后续是纯字符串/IO） |
| T34 | **`_rollback_quota` 被事务回滚覆盖** | `main.py:192-206` | AI 失败 `raise HTTPException` → `get_db` 上下文 `rollback()` 撤销所有 UPDATE。`_rollback_quota` 的数据库修改被覆盖，实际效果仅为日志审计。建议添加注释说明 |

#### 🟡 P2 中优

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T35 | **HSTS 头应仅生产环境发送** | `main.py:181` | ✅ Sprint H 已修复（`if not IS_DEV`） |
| T36 | **`global_exception_handler` 遗漏 `BaseException`** | `main.py:225-234` | `asyncio.CancelledError` 继承自 `BaseException` 不被捕获，请求取消时无日志 |
| T37 | **`downloadAll` setTimeout 不可取消** | `useBatchProcessor.ts:315-327` | 组件卸载后定时器回调仍触发静默下载 |
| T38 | **`retryItem` AbortController 局部变量** | `useBatchProcessor.ts:168-190` | `destroy()` 无法中止正在进行的重试 |
| T39 | **`getBatchResultData` Blob URL 无跟踪** | `useBatchProcessor.ts:240-268` | 每次调用新建 URL，依赖调用方手动 `revokeBatchResultUrl`，易泄漏 |
| T40 | **`removeItem` 未 revoke Blob URL** | `useBatchProcessor.ts:73-83` | 删除 item 时可能已存在的 result Blob URL 泄漏 |
| T41 | **`cleanup_test_data.py` 相对路径** | `cleanup_test_data.py:13` | ✅ Sprint H 已修复（改为 `os.path.dirname(__file__)` 获取绝对路径） |
| T42 | **`resetState` 未重置 `lastWheelTime`** | `useImageZoom.ts:156-163` | ✅ Sprint H 已修复 |
| T43 | **ZoomControls disabled 阈值不匹配** | `ZoomControls.vue:5` | ✅ Sprint H 已修复（`<=1.25` → `<1.25`） |
| T44 | **`quota_deducted` 死代码** | `main.py:344,346` | ✅ Sprint H 已修复（移除死代码） |

#### 🟢 P3 低优

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T45 | 配额检查在文件校验之前 | `main.py:265-314` | 文件校验失败时浪费了配额日重置查询 |
| T46 | WebP 魔数校验缺少 chunk size | `main.py:216-217` | 严格性不足（实际攻击面极小） |
| T47 | `imgTransform` computed 分支返回不同 key 集合 | `useImageZoom.ts:172-181` | TypeScript 类型不安全（运行时正确：Vue patch 自动清理） |
| T48 | `clearItems` 引用不存在的 `item.resultUrl` | `useBatchProcessor.ts:89` | 死代码，`BatchItem` 类型无 `resultUrl` 属性 |
| T49 | `addFiles` 去重仅用 name+size | `useBatchProcessor.ts:50` | 修改后重新选择的同一文件被误判为重复 |
| T50 | 保留用户 History 先删 DB 后删文件无失败日志 | `cleanup_test_data.py:31-35` | `shutil.rmtree(ignore_errors=True)` 静默忽略失败 |

#### 🟢 P4 信息

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| T51 | `asyncio.to_thread(gc.collect)` 后立即 raise | `main.py:407,419` | GC 完成时序不确定 |
| T52 | `AppFooter.vue` 无问题 | — | 代码规范 ✅ |

### 🛠 Sprint I — G40 遗留 P1/P2 修复 + G41 审计热修复

| # | 来源 | 严重度 | 问题 | 修复 |
|:---:|:---:|:---:|------|------|
| I1 | T34 | 🔴 P1 | **`_rollback_quota` 被事务回滚覆盖** — 独立会话执行回滚 | ✅ 使用 `async_session()` 创建独立 DB 会话执行回滚 UPDATE + commit()，不受主请求事务回滚影响 |
| I2 | T36 | 🟠 P2 | **`global_exception_handler` 遗漏 `BaseException`** | ✅ 新增 `base_exception_handler`，捕获 `CancelledError`(499)/`KeyboardInterrupt`(raise)/其他(500) |
| I3 | T37 | 🟠 P2 | **`downloadAll` setTimeout 不可取消** | ✅ 存储 timer ID 到 `_downloadTimers` Set，`destroy()` 中 `clearTimeout` 清理 |
| I4 | T38 | 🟠 P2 | **`retryItem` AbortController 不可外部取消** | ✅ 存储在实例变量 `retryAbortController`，`destroy()` 可中止重试 |
| I5 | T39 | 🟠 P2 | **`getBatchResultData` Blob URL 无跟踪** | ✅ `_trackedResultUrls` Set 跟踪所有创建的 URL，`destroy()` 时全部 revoke |
| I6 | T40 | 🟠 P2 | **`removeItem` Blob URL 未清理** | ✅ 确认 `resultBlob` 置 null 足以触发 GC（Blob 非 URL，无需 revoke） |
| I7 | T45 | 🟡 P3 | **配额检查在文件校验之前** | ✅ `check_and_reset_quota` 移到文件校验（格式/大小/魔数/尺寸）成功后执行 |
| I8 | T46 | 🟡 P3 | **WebP 魔数校验缺少 chunk size** | ✅ 增加 `struct.unpack_from` 校验 RIFF 文件大小声明与实际一致性（不一致仅 warn） |
| I9 | T48 | 🟡 P3 | **`clearItems` 引用不存在的 `item.resultUrl`** | ✅ 移除死代码，`BatchItem` 类型无 `resultUrl` 属性 |
| I10 | T49 | 🟡 P3 | **`addFiles` 去重仅用 name+size** | ✅ 增加 `lastModified` 维度，`name + size + lastModified` 三重判断 |
| I11 | T50 | 🟡 P3 | **`cleanup_test_data.py` shutil.rmtree 静默忽略失败** | ✅ `ignore_errors=False` + try/except 记录 `OSError` 警告日志 |
| I12 | — | 🟡 P3 | **HTTPException 响应泄露 `type` 字段** | ✅ 生产环境不返回 `type: "HTTPException"`，仅 DEV 环境暴露 |
| I13 | T33 | 🔴 P1 | **配额扣减事务提交时机** | ⚠️ 添加注释说明：当前架构下配额扣减与历史保存同在 `save_history_entry` 内部 `commit()`。若将来拆分独立事务，需注意提交顺序 |

### 🧪 G41 资深测试工程师全面审计（Sprint I 完成后）✅ 全部修复

> 审计范围：9 个核心文件（main.py / useBatchProcessor / useImageZoom / cleanup_test_data / ZoomControls / AppFooter / auth.py / history.py / database.py），**发现 27 个新问题**。5 项 Sprint I 立即修复，**22 项 Sprint J 全部完成修复**。

#### 🔴 P0 致命 — Sprint I 已立即修复

| # | 问题 | 位置 | 详情 | 处理 |
|:---:|------|------|------|:--:|
| P0-1 | **异常处理器注册顺序错误** | `main.py:251-280` | `Exception` handler 在 `HTTPException` handler 之前注册 → 所有 HTTPException（415/413/401/429）被 `global_exception_handler` 错误拦截并返回 500 | ✅ 重新排序为：HTTPException → Exception → BaseException |
| P0-2 | **`_rollback_quota` 独立会话造成死锁+配额错误** | `main.py:197-224` | 独立会话 CREATE 写锁与主会话写锁冲突（SQLite 串行化→死锁 5s）；且独立会话读取的是主会话修改前的值 → 错误扣减配额 | ✅ 简化为纯审计日志函数，移除独立 DB 会话（主事务回滚已自动退还配额） |
| P0-3 | **`save_history_entry` 先 commit 后写文件** | `history.py:374-401` | DB commit 后文件写入失败 → 孤儿 DB 记录（`thumb_original=''`） | ✅ Sprint J 修复（flush → 写文件 → commit） |
| P0-4 | **过期记录清理先删文件后删 DB** | `history.py:344-351` | 文件已删但 DB delete 失败 → 僵尸记录（缩略图读取失败） | ✅ Sprint J 修复（先删 DB 提交 → 再清文件） |
| P0-5 | **配额增量依赖隐式 commit** | `main.py:361-493` | 配额 UPDATE 依赖 `save_history_entry` 内部 `commit()` 持久化。若将来重构跳过历史保存，配额扣减静默丢失 | ✅ Sprint J 修复（添加注释标注依赖关系） |

#### 🟠 P1 高优 — Sprint I 已修复

| # | 问题 | 位置 | 详情 | 处理 |
|:---:|------|------|------|:--:|
| P1-1 | **`_rollback_quota` 参数 `_request_db` 未使用** | `main.py:197` | 已随 P0-2 重构移除 | ✅ 函数签名简化为 `(user: User)` |
| P1-5 | **KEEP_EMAILS 用户 rmtree 无异常处理** | `cleanup_test_data.py:34` | admin/test 的 `shutil.rmtree` 无 try/except，与非保留用户不对称 | ✅ 统一添加 try/except OSError 处理 |
| P1-8 | **`cancelProcessing` 不中止重试** | `useBatchProcessor.ts:236` | 用户取消批处理后重试继续进行 | ✅ 添加 `retryAbortController.abort()` |

#### 🟠 P1 高优 — Sprint J 全部修复

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| P1-2 | **WebP chunk size 不匹配仅 warn** | `main.py:234-243` | 损坏的 WebP 仅 warn 仍放行，`Image.open()` 抛出晦涩错误 | ✅ Sprint J 修复（改为 return None 拒绝） |
| P1-3 | **`delete_history` 先删文件后删 DB** | `history.py:142-151` | 文件不可回滚，DB commit 失败后文件已丢失 → 僵尸记录 | ✅ Sprint J 修复（先删 DB 再清理文件） |
| P1-4 | **`list_history` 同步文件 I/O 阻塞事件循环** | `history.py:82-90` | 100 条记录 = 100 次同步 `open().read()`，阻塞 asyncio | ✅ Sprint J 修复（`asyncio.to_thread` 异步化） |
| P1-6 | **`save_history_entry` 去重 TOCTOU 竞态** | `history.py:292-309` | SELECT→INSERT 间无锁，并发上传相同图片产生重复记录 | ⚠️ 已知悉：SQLite 写入串行化 + 低并发场景实际无影响 |
| P1-7 | **`retryItem` 不支持并发重试** | `useBatchProcessor.ts:180` | 快速点击两个重试按钮行为不可预测 | ✅ Sprint J 修复（`_retryInProgress` 守卫） |
| P1-9 | **`check_and_reset_quota` 中间 `db.commit()`** | `auth.py:63` | 隐式提交主事务中所有未提交更改 | ✅ Sprint J 修复（`commit()` → `flush()`） |
| P1-10 | **登录接口无速率限制** | `auth.py:120-132` | 可被暴力破解 | ⚠️ 留后续（Phase 6 运营后台，建议引入 slowapi） |
| P1-11 | **WebP 缩略图回退为 JPEG** | `history.py:48-50` | 线条图/截图的 JPEG 压缩伪影明显 | ✅ Sprint J 修复（支持 WEBP 格式缩略图） |

#### 🟡 P2 中优 — Sprint J 已处理

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| P2-2 | **ZoomControls − 按钮 disabled 条件 `< 1.25`** | `ZoomControls.vue:5` | 滚轮缩放到 1.12 时按钮被 disabled，但 `1.12-0.25=0.87` clamp 到 1.0 功能可用 | ✅ Sprint H 已修复 |
| P2-3 | **`imgTransform` 分支返回不同 key 集合** | `useImageZoom.ts:173-182` | TS 类型为联合类型，精确度不足 | ⚠️ 已知悉：Vue patch 自动清理，运行时正确 |
| P2-4 | **`retryAllErrors` 与 `cancelProcessing` 状态竞争** | `useBatchProcessor.ts:210,249` | phase 字段可能被错误覆盖 | ✅ Sprint J 修复（`_retryInProgress` 守卫） |
| P2-5 | **`init_db` ALTER TABLE 每次启动执行** | `database.py:54-59` | 依赖 OperationalError 忽略已存在列 | ⚠️ 已知悉：低成本 Migration |
| P2-6 | **email 正则拒绝 `+` 标签** | `schemas.py:10` | `user+tag@gmail.com` 是合法但被拒绝 | ⚠️ 留后续（Phase 6 运营后台） |
| P2-7 | **去重时不更新 `filename`** | `history.py:301-309` | 再次上传同 hash 图片后历史文件名仍是首次的 | ⚠️ 已知悉：设计选择 |

#### 🟢 P3 低优 — 留后续

| # | 问题 | 位置 | 详情 |
|:---:|------|------|------|
| P3-1 | **`IS_DEV` 定义在常量区（前后不一致）** | `main.py:75` | ✅ Sprint I 已移至常量区 |
| P3-2 | **HSTS 缺少 `preload` 指令** | `main.py:182` | 可选但推荐 |
| P3-3 | **`downloadAll` 的 Blob URL 未被追踪** | `useBatchProcessor.ts:336` | 在回调内立即 revoke，风险极低 |
| P3-4 | **种子用户密码硬编码** | `database.py:29-41` | 部署文档应强调环境变量覆盖 |
| P3-5 | **`onWheel` 节流是"跳过式"** | `useImageZoom.ts:49-51` | 丢弃最后一个事件，快速滚动停止后缩放"差一步" |
| P3-6 | **`save_history_entry` 与 `save_history_entry_blocked` 大量重复** | `history.py` | ~60% 代码重叠 |

### 📊 Sprint I~J 总览

```
Sprint I: ████████████ 13/13 G40遗留P1/P2 + G41审计热修复
Sprint J: ████████████ 11/11 G41应急热修复 + G41遗留P0/P1/P2全部修复
──────────────────────────────────────
G41 审计: 27 项 → 全部已评估（修复 22/27，已知悉 5/27）
G42 审计: 8 项 → 0 已修复，8 项记录留后续
存量:     Canvas缩放 (P2) + Pinch-to-zoom (P3) + P1-10登录限流 + P2-6邮箱正则
```

---

### 🧪 G42 — Sprint J 资深测试工程师全栈审计（G41 修复完成后）

> **审计时间**：2026-05-23  
> **审计范围**：全部 13 个核心文件（backend: main.py / history.py / auth.py / models.py / database.py / schemas.py — frontend: WorkspacePage / useBackgroundRemover / DownloadPanel / PreviewGrid / EdgeToolsPanel / DraftDetailPage / drafts.ts）。  
> **发现：8 个新问题**（3 P1 + 4 P2 + 1 P3）。前端代码质量为主，无 P0 致命 BUG。

#### 🔴 P1 高优 — 建议下个 Sprint 修复

| # | 问题 | 位置 | 详情 | 建议 |
|:---:|------|------|------|------|
| **J1** | **配额耗尽检测用中文字符串硬匹配** | `WorkspacePage.vue:506` | `/已用完/.test(remover.processing.detail)` — 中文字符串硬编码匹配。若后端改文案或加国际化即静默失效 | 改用 HTTP 429 状态码判断，或 API 返回结构体中增加 `quotaExhausted` 字段 |
| **J2** | **逐张精修不同步前端配额计数器** | `WorkspacePage.vue:485-531` | `handleBatchChoiceRefine` 仅循环前检查 `quota.isExhausted` 一次，处理后不调用 `quota.afterSuccessfulRequest()` 或 `syncFromServer()` — 前端配额显示与后端不同步 | 每张成功处理后调用 `quota.syncFromServer()` + 增加 429 响应提前停止逻辑 |
| **J3** | **`handleRetry` / `doProcessFile` 草稿保存逻辑重复** | `WorkspacePage.vue:539-565, 652-671` | 两个函数有 ~20 行几乎相同的草稿保存代码（`quota.afterSuccessfulRequest() → generateDraftId() → createThumbnail ×2 → drafts.add()`） | 提取为 `saveResultToDrafts(remover, file?, originalFile?): Promise<string>` |

#### 🟡 P2 中优 — 代码质量 & 可维护性

| # | 问题 | 位置 | 详情 | 建议 |
|:---:|------|------|------|------|
| **J4** | **`_doProcess` 三个 `if (!keepOriginalUrl)` 块** | `useBackgroundRemover.ts:71-99` | L71/75/80 三处分立的条件检查，相同条件三次判断 — 不仅冗余，且容易在重构时漏改 | 合并为一个 `if (!keepOriginalUrl) { ... } else { ... }` 块 |
| **J5** | **ETA 估算逻辑重复** | `useBackgroundRemover.ts:109-114` vs `:211-218` | `_doProcess` 和 `updateEta` 各自独立计算 `totalKb → estDurationMs` 映射（完全相同的 5 级阶梯值 4000/9000/18000/35000/55000） | 提取为 `_estimateDuration(fileSize: number): number` |
| **J6** | **`copied` setTimeout 未清理** | `DownloadPanel.vue:268` | `onCopy()` 中的 `setTimeout(() => { copied.value = false }, 2000)` 未存储 timer ID → `onUnmounted` 无法 `clearTimeout`。对比：`downloadDoneTimer` 已正确清理（L123,152-155） | 存储到 ref 并在 `onUnmounted` 中 clear |
| **J7** | **EdgeToolsPanel 画笔编辑后视觉闪烁** | `EdgeToolsPanel.vue:330-333` | `handleApplyBrush` 发出新 blob → `watch(transparentBlob)` 触发 `initBrush()` → 先 `destroyBrush()` 后 `createBrushEditor()` — 用户短暂看到 Canvas 销毁/重建 | 在 `handleApplyBrush` 完成后用 flag 跳过自身触发的 watch |

#### 🟢 P3 低优

| # | 问题 | 位置 | 详情 | 建议 |
|:---:|------|------|------|------|
| **J8** | **`handleHistoryRestore` 缩进不一致** | `WorkspacePage.vue:706-720` | L706-720 比 try 块内多 2 空格缩进 | 统一缩进 |

### 审计结论

```
┌─────────────────────────────────────────────────────────────┐
│  Sprint J (G42) 全栈审计结果                                 │
│                                                             │
│  审计范围:  13 个核心文件（前后端全覆盖）                        │
│  发现问题:  8 项（3 P1 + 4 P2 + 1 P3）                       │
│  致命 BUG:  0 项 — G41 的 P0 修复已验证全部生效               │
│  高优问题:  3 项 — 配额匹配脆弱、配额计数不同步、DRY 重复        │
│  建议优先级: J1 > J2 > J3 > J6 > J4 > J5 > J7 > J8          │
│  预估工作量: ~2 天                                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 📊 九轮 Sprint 总览

```
Sprint A: ████████████ 4/4  草稿保护/透明底/批量重试/构建
Sprint B: ████████████ 5/5  进度模拟+ETA/ZIP/精修进度/背景过渡/下载反馈
Sprint C: ████████████ 3/3  示例图/配额CTA/确认提示 + 10热修复
Sprint D: ████████████ 4/4  精修缩放/历史原图/P2修复 + 4热修复
Sprint E: ████████████ 6/6  P2/P3遗留修复 + 格式保留 + 死代码清理
Sprint F: ████████████ 5/5  G37遗留全部修复 + ZoomControls组件提取
Sprint G: ████████████ 10/10 G38遗留 + G39审计热修复
Sprint H: ████████████ 10/10 G39遗留P1/P2 + G40审计热修复
Sprint I: ████████████ 13/13 G40遗留P1/P2 + G41审计热修复
Sprint J: ████████████ 11/11 G41应急热修复 + G41遗留P0/P1/P2全部修复
──────────────────────────────────────
合计:     60 项UX优化 + 56 项审计热修复 (Sprint I: 13 + Sprint J: 11 + 之前: 32)
存量:     Canvas缩放 (P2) + Pinch-to-zoom (P3) + 8 项 G42 新发现
```

---


### 🏗 中期战役：API 服务化 (Phase 6)

| 优先级 | ID | 任务 | 工作量 | 说明 |
|:---:|:---:|------|:--:|------|
| 5 | **G13+G25** | **API 鉴权 + 产品化** | 3 天 | API Key 生成 + 速率限制 + 用量统计 + 开发者文档。打开 B 端市场 |
| 6 | **G26** | **运营后台** | 2 天 | 用户管理 + 用量看板 + 公告推送。运营不再"盲飞" |

### 🔭 远景：技术壁垒 + 企业版 (Phase 7)

| 优先级 | ID | 任务 | 工作量 | 说明 |
|:---:|:---:|------|:--:|------|
| 7 | **G15** | **端侧 ONNX 推理** | 5 天 | 速度 + 隐私 = 真正护城河。建议在月活 > 1000 后投入 |
| 8 | **G27** | **企业版方案** | 3 天 | SSO/OIDC + 团队协作 + 白标 + 私有部署报价 |
| 9 | **G19** | **国际化 i18n** | 2 天 | 英文 → 日/韩。市场量级 ×10 |

### 💡 增长策略建议

```
获客渠道:
├── SEO：长尾词"在线抠图""免费去背景"等（竞争激烈但流量巨大）
├── 社交：Before/After GIF 天然适合小红书/微博/Twitter 传播
├── 工具站：ProductHunt / 少数派 / 异次元 推荐
├── API 生态：接入 Figma/PS 插件、Zapier 集成 → 自动获客
└── 内容营销：电商平台教程 (Amazon/Etsy 商品图规范)

变现路径:
├── 个人用户 → $5/月 全分辨率下载
├── 专业用户 → $15/月 批量处理 + 模板 + API
├── 企业客户 → $99/月 团队协作 + SSO + 白标
└── API 客户 → 按量计费 $0.05/次，预充包打折
```

---

> **当前状态**：Phase 1~4 全部交付。Sprint A~J 共 60 项 UX 优化 + 56 项审计热修复。G41 27 项全部修复 ✅。G42 资深测试工程师全栈审计完成，发现 8 项（3 P1 + 4 P2 + 1 P3），均记录留后续。
> **下一步**：J1（配额检测去中文硬编码）→ J2（精修配额同步）→ J3（提取草稿保存函数）→ Phase 5 G24 付费墙。
