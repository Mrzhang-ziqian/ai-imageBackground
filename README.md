# AI 背景移除工具

拖拽上传图片，AI 自动移除背景，支持预览、编辑和下载透明 PNG。

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| 🎯 AI 抠图 | rembg (U2-Net) + 多模型降级（u2net → u2netp → silueta）+ 智能重试 |
| 🔄 Before/After 对比 | 拖拽滑块实时对比原图与去背景结果，支持并排/对比双模式 |
| 🎨 背景替换 | 12 个预设纯色 + 13 个模板背景（电商/渐变/场景），支持阴影 + 渐变叠加 |
| ✂️ 边缘后期 | 羽化半径调节、边缘平滑、手动擦除/修复画笔，Canvas 端侧实时编辑 |
| 📦 批量处理 | 多图队列批量上传，进度显示，批量下载，单图详情查看 |
| 📥 多格式下载 | PNG 原图 / WebP 压缩 / 复制到剪贴板，Canvas 端侧格式转换 |
| 📋 处理历史 | 最多 20 条历史记录，localStorage 持久化，支持恢复/删除 |
| 🛡️ 大图保护 | 自动检测图片尺寸 + 文件大小，超限弹窗可选自动调优/原图上传/取消 |

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite (组件化架构，17 个组件)
- **后端**: Python + FastAPI
- **AI 模型**: rembg (U2-Net) + 多模型降级 (u2net → u2netp → silueta)

## 快速开始

### 🐳 Docker 一键部署（推荐）

```bash
git clone <repo-url>
cd ai-background-remover
docker compose up -d
```

浏览器打开 **http://localhost:3000** 即可使用。

> 首次构建会下载 rembg AI 模型（~170MB），约需 3-5 分钟。后续启动秒级完成。

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 | http://localhost:3000 | Vue 3 应用（Nginx 静态服务） |
| 后端 | http://localhost:8000 | FastAPI API 服务 |
| API 文档 | http://localhost:8000/docs | Swagger 交互文档 |

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重建（代码更新后）
docker compose up -d --build
```

### 本地开发

#### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 启动后端服务

```bash
python main.py
# 或
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

首次启动会自动下载 rembg 模型 (约 170MB)，请耐心等待。

### 4. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

浏览器打开 http://localhost:3000 即可使用。

## 使用方式

1. **拖拽上传**：将图片拖入虚线区域
2. **点击上传**：点击虚线区域选择图片
3. **粘贴上传**：复制图片后 Ctrl+V 粘贴
4. **批量上传**：多选文件或拖入多张图片，进入批量处理模式
5. **对比效果**：处理完成后拖拽滑块对比 Before/After
6. **背景编辑**：选择纯色背景或模板背景（电商/渐变/场景），支持阴影
7. **边缘修复**：使用羽化、平滑或手动画笔微调抠图边缘
8. **下载结果**：支持 PNG 原图 / WebP 压缩 / 复制到剪贴板

## 项目结构

```
├── backend/
│   ├── main.py              # FastAPI 后端服务（尺寸校验、AI 推理、alpha mask 还原）
│   └── requirements.txt     # Python 依赖
├── frontend/                 # Vue 3 + TypeScript
│   ├── index.html           # Vite 入口
│   ├── package.json         # 依赖与脚本
│   ├── vite.config.ts       # Vite 配置
│   └── src/
│       ├── main.ts          # 应用入口
│       ├── App.vue          # 根组件（路由/状态/全局事件）
│       ├── types/           # 全局类型定义（模板/批量/历史/颜色）
│       ├── services/        # API 请求服务
│       ├── utils/           # 工具函数（图片尺寸/缩放/格式化）
│       ├── composables/     # 组合式函数
│       │   ├── useBackgroundRemover.ts  # 核心抠图逻辑
│       │   ├── useHistory.ts            # 处理历史管理
│       │   ├── useBatchProcessor.ts     # 批量处理管理
│       │   └── useToast.ts              # Toast 通知
│       ├── components/      # Vue 组件（17 个）
│       │   ├── AppHeader.vue              # 页头
│       │   ├── AppFooter.vue              # 页脚
│       │   ├── UploadZone.vue             # 上传区域（拖拽/点击/粘贴）
│       │   ├── PreviewGrid.vue            # 原图 & 结果预览
│       │   ├── CompareSlider.vue          # Before/After 对比滑块 (G02)
│       │   ├── ProgressOverlay.vue        # 进度条遮罩
│       │   ├── BackgroundColorPicker.vue  # 背景颜色选择器（12 色 + 最近使用）
│       │   ├── BackgroundTemplatePicker.vue # 模板背景选择器（13 个模板）(G12)
│       │   ├── EdgeToolsPanel.vue         # 边缘后期工具（羽化/平滑/画笔）(G05)
│       │   ├── DownloadPanel.vue          # 下载面板（PNG/WebP/剪贴板）(G09)
│       │   ├── HistoryPanel.vue           # 处理历史面板（最多 20 条）(G07)
│       │   ├── BatchPanel.vue             # 批量处理面板 (G08)
│       │   ├── LargeImageDialog.vue       # 大图提示对话框 (G22)
│       │   ├── ToastMessage.vue           # 全局 Toast 通知
│       │   └── ActionBar.vue              # 下载 & 重置按钮（Legacy）
│       └── styles/
│           └── main.css
├── docs/
│   ├── plan.md              # 项目计划 & 技术方案
│   └── product-gaps.md      # 产品差距分析 & 优化路线图
└── README.md
```

## 接口文档

| 接口 | 方法 | 说明 | 响应头 |
|------|------|------|--------|
| `/remove-bg` | POST | 上传图片，返回去背景 PNG | `X-Model-Used` 所用模型、`X-Image-Width/Height` 结果尺寸 |
| `/health` | GET | 健康检查 | - |

启动后可访问 http://localhost:8000/docs 查看 Swagger 交互文档。

### 后端处理参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 允许格式 | PNG / JPEG / WebP | - |
| 文件大小上限 | 20MB | 超过直接拒绝 |
| 图片尺寸上限 | 3000px | 超过直接拒绝，前端建议 ≤2000px |
| AI 推理尺寸 | 800px | 原图缩放到 800px 推理，alpha mask 放大还原原尺寸 |
| AI 超时 | 90s | 超时返回友好错误提示 |
| 模型降级 | u2net → u2netp → silueta | 每模型重试 2 次 |

---

> 📋 详细信息见 [项目计划](docs/plan.md)、[产品差距分析](docs/product-gaps.md)。

