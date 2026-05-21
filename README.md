# AI 背景移除工具

拖拽上传图片，AI 自动移除背景，支持预览和下载透明 PNG。

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite (组件化架构)
- **后端**: Python + FastAPI
- **AI 模型**: rembg (U2-Net)

## 快速开始

### 1. 安装后端依赖

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

1. **拖拽上传**: 将图片拖入虚线区域
2. **点击上传**: 点击虚线区域选择图片
3. **粘贴上传**: 复制图片后 Ctrl+V 粘贴
4. **下载结果**: 处理完成后点击「下载 PNG」

## 项目结构

```
├── backend/
│   ├── main.py              # FastAPI 后端服务
│   └── requirements.txt     # Python 依赖
├── frontend/                 # Vue 3 + TypeScript
│   ├── index.html           # Vite 入口
│   ├── package.json         # 依赖与脚本
│   ├── vite.config.ts       # Vite 配置
│   └── src/
│       ├── main.ts          # 应用入口
│       ├── App.vue          # 根组件
│       ├── types/           # 全局类型
│       ├── services/        # API 服务
│       ├── composables/     # 组合式函数
│       ├── components/      # Vue 组件
│       │   ├── AppHeader.vue
│       │   ├── UploadZone.vue
│       │   ├── PreviewGrid.vue
│       │   ├── ProgressOverlay.vue
│       │   ├── BackgroundColorPicker.vue
│       │   ├── ActionBar.vue
│       │   ├── ToastMessage.vue
│       │   └── AppFooter.vue
│       └── styles/
│           └── main.css
├── docs/
│   └── plan.md              # 需求文档
└── README.md
```

## 接口文档

| 接口 | 方法 | 说明 |
|------|------|------|
| `/remove-bg` | POST | 上传图片，返回去背景 PNG |
| `/health` | GET | 健康检查 |

启动后可访问 http://localhost:8000/docs 查看 Swagger 文档。
