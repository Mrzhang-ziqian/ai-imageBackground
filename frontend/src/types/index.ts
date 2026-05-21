/** 支持的图片 MIME 类型 */
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

/** 最大上传文件大小 20MB */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 后端 API 地址 */
export const API_BASE = 'http://localhost:8000';

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
