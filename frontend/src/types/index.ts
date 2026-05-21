/** 支持的图片 MIME 类型 */
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

// ============================================================
// G08: 批量处理
// ============================================================

/** 批量队列中单个文件的状态 */
export type BatchItemStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error';

/** 批量处理的单个文件项 */
export interface BatchItem {
  /** 唯一 ID */
  id: string;
  /** 原始文件 */
  file: File;
  /** 原图 Object URL */
  originalUrl: string;
  /** 处理状态 */
  status: BatchItemStatus;
  /** 当前进度 0-100 */
  progress: number;
  /** 状态描述文本 */
  message: string;
  /** 透明底结果 Blob（处理完成后） */
  resultBlob: Blob | null;
  /** 结果文件名 */
  resultFilename: string;
  /** 结果尺寸 */
  dimensions: ImageDimensions | null;
  /** 使用的 AI 模型 */
  modelUsed: string;
  /** 错误信息（status === 'error' 时） */
  error: string | null;
}

/** 批量处理的整体阶段 */
export type BatchPhase = 'entry' | 'processing' | 'done';

/** 批量下载任务 */
export interface BatchDownloadTask {
  blob: Blob;
  filename: string;
}

// ============================================================
// G05: 边缘后期工具
// ============================================================

/** 手动画笔模式 */
export type BrushMode = 'erase' | 'restore';

export type AllowedType = (typeof ALLOWED_TYPES)[number];

/** 最大上传文件大小 20MB */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 建议最大图片边长：超过此值前端会提示用户（后端硬限制 3000px） */
export const RECOMMENDED_MAX_DIM = 2000;

/** 文件大小软限制（2MB）：超过此值前端会弹出提示（后端硬限制 20MB） */
export const MAX_FILE_SIZE_SOFT = 2 * 1024 * 1024;

/**
 * 后端 API 地址
 * - 开发模式：Vite proxy 自动转发 /api/* → http://localhost:8000/*
 * - Docker 生产：Nginx proxy 自动转发 /api/* → http://backend:8000/*
 */
export const API_BASE = '/api';

/** 预设背景色选项（带标签） */
export interface ColorPreset {
  hex: string;
  label: string;
}

export const PRESET_COLORS: readonly ColorPreset[] = [
  { hex: 'transparent', label: '透明' },
  { hex: '#FFFFFF', label: '纯白' },
  { hex: '#F3F4F6', label: '浅灰' },
  { hex: '#D1D5DB', label: '中灰' },
  { hex: '#1F2937', label: '深黑' },
  { hex: '#F5F0E8', label: '米色' },
  { hex: '#3B82F6', label: '蓝色' },
  { hex: '#10B981', label: '绿色' },
  { hex: '#F59E0B', label: '金黄' },
  { hex: '#EF4444', label: '红色' },
  { hex: '#EC4899', label: '粉色' },
  { hex: '#8B5CF6', label: '紫色' },
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number]['hex'];
export type BgColor = PresetColor | `#${string}`;

/** 最近使用颜色的 localStorage key */
export const RECENT_COLORS_KEY = 'ai-bg-remover-recent-colors';
export const MAX_RECENT_COLORS = 8;

/** 处理状态 */
export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;  // 0-100
  message: string;
  detail: string;
}

/** Toast 通知选项 */
export interface ToastOptions {
  message: string;
  type: 'success' | 'error';
  duration?: number;
}

/** 文件校验结果 */
export type FileValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/** 图片尺寸信息 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** 背景移除 API 返回 */
export interface RemoveBgResult {
  blob: Blob;
  filename: string;
  /** 结果图片实际尺寸（来自后端 X-Image-Width / X-Image-Height 响应头） */
  dimensions?: ImageDimensions;
  /** AI 处理所用的模型名称（来自后端 X-Model-Used 响应头） */
  modelUsed?: string;
}

/** 处理历史记录项 */
export interface HistoryEntry {
  id: string;
  filename: string;
  timestamp: number;
  /** 原图缩略图 (base64 data URL, JPEG 压缩) */
  originalThumb: string;
  /** 结果缩略图 (base64 data URL, PNG) */
  resultThumb: string;
  /** 透明结果大图 (base64 data URL, PNG) — 用于恢复 */
  resultDataUrl: string;
  dimensions: ImageDimensions;
  modelUsed: string;
}

/** 处理历史的 localStorage key */
export const HISTORY_KEY = 'ai-bg-remover-history';
export const MAX_HISTORY = 20;

// ============================================================
// G12: 模板背景库
// ============================================================

/** 模板分类 */
export type TemplateCategory = '电商' | '渐变' | '场景';

/** 阴影配置 */
export interface ShadowConfig {
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
}

/** 渐变配置 */
export interface GradientConfig {
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number;
}

/** 背景模板定义 */
export interface BackgroundTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** CSS 预览样式（用于卡片缩略图） */
  previewStyle: Record<string, string>;
  /** 背景色（非透明） */
  backgroundColor: string;
  /** 阴影配置（可选，无则不渲染） */
  shadow?: ShadowConfig;
  /** 渐变叠加（可选） */
  gradient?: GradientConfig;
}

/** 全部预设模板 */
export const BACKGROUND_TEMPLATES: BackgroundTemplate[] = [
  // ---- 电商 ----
  {
    id: 'white-shadow',
    name: '纯白阴影',
    category: '电商',
    previewStyle: { background: '#FFFFFF' },
    backgroundColor: '#FFFFFF',
    shadow: { blur: 28, offsetX: 0, offsetY: 8, color: 'rgba(0,0,0,0.10)' },
  },
  {
    id: 'light-gray-shadow',
    name: '浅灰阴影',
    category: '电商',
    previewStyle: { background: '#F3F4F6' },
    backgroundColor: '#F3F4F6',
    shadow: { blur: 24, offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.10)' },
  },
  {
    id: 'warm-white-shadow',
    name: '暖白阴影',
    category: '电商',
    previewStyle: { background: '#FAF7F2' },
    backgroundColor: '#FAF7F2',
    shadow: { blur: 26, offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.08)' },
  },
  {
    id: 'beige-shadow',
    name: '米色阴影',
    category: '电商',
    previewStyle: { background: '#F5F0E8' },
    backgroundColor: '#F5F0E8',
    shadow: { blur: 24, offsetX: 0, offsetY: 5, color: 'rgba(0,0,0,0.09)' },
  },
  {
    id: 'dark-display',
    name: '深灰展示',
    category: '电商',
    previewStyle: { background: '#374151' },
    backgroundColor: '#374151',
    shadow: { blur: 32, offsetX: 0, offsetY: 10, color: 'rgba(0,0,0,0.22)' },
  },

  // ---- 渐变 ----
  {
    id: 'sky-gradient',
    name: '天空渐变',
    category: '渐变',
    previewStyle: { background: 'linear-gradient(180deg, #E0F2FE 0%, #FFFFFF 100%)' },
    backgroundColor: '#FFFFFF',
    gradient: { type: 'linear', colors: ['#E0F2FE', '#FFFFFF'], angle: 180 },
  },
  {
    id: 'sunset-warm',
    name: '日落暖调',
    category: '渐变',
    previewStyle: { background: 'linear-gradient(135deg, #FDE68A 0%, #F9A8D4 100%)' },
    backgroundColor: '#F9A8D4',
    gradient: { type: 'linear', colors: ['#FDE68A', '#F9A8D4'], angle: 135 },
  },
  {
    id: 'tech-purple',
    name: '科技紫蓝',
    category: '渐变',
    previewStyle: { background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)' },
    backgroundColor: '#3B82F6',
    gradient: { type: 'linear', colors: ['#8B5CF6', '#3B82F6'], angle: 135 },
  },
  {
    id: 'fresh-green',
    name: '清新绿',
    category: '渐变',
    previewStyle: { background: 'linear-gradient(180deg, #D1FAE5 0%, #FFFFFF 100%)' },
    backgroundColor: '#FFFFFF',
    gradient: { type: 'linear', colors: ['#D1FAE5', '#FFFFFF'], angle: 180 },
  },
  {
    id: 'monochrome',
    name: '黑白极简',
    category: '渐变',
    previewStyle: { background: 'linear-gradient(135deg, #F9FAFB 0%, #1F2937 100%)' },
    backgroundColor: '#F9FAFB',
    gradient: { type: 'linear', colors: ['#F9FAFB', '#1F2937'], angle: 135 },
  },

  // ---- 场景 ----
  {
    id: 'studio-light',
    name: '工作室灯光',
    category: '场景',
    previewStyle: { background: 'radial-gradient(ellipse at center, #FFFFFF 30%, #E5E7EB 100%)' },
    backgroundColor: '#E5E7EB',
    gradient: { type: 'radial', colors: ['#FFFFFF', '#E5E7EB'] },
    shadow: { blur: 20, offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.08)' },
  },
  {
    id: 'dark-stage',
    name: '暗色舞台',
    category: '场景',
    previewStyle: { background: 'radial-gradient(ellipse at center, #4B5563 0%, #111827 100%)' },
    backgroundColor: '#111827',
    gradient: { type: 'radial', colors: ['#4B5563', '#111827'] },
  },
  {
    id: 'product-pedestal',
    name: '产品展台',
    category: '场景',
    previewStyle: {
      background: '#FFFFFF',
      borderBottom: '4px solid #E5E7EB',
    },
    backgroundColor: '#FFFFFF',
    shadow: { blur: 30, offsetX: 0, offsetY: 12, color: 'rgba(0,0,0,0.12)' },
  },
] as const;

