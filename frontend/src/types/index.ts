/** 支持的图片 MIME 类型 */
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

/** 最大上传文件大小 20MB */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 后端 API 地址 */
export const API_BASE = 'http://localhost:8000';

/** 预设背景色选项 */
export const PRESET_COLORS = ['transparent', '#3B82F6', '#EF4444', '#FFFFFF'] as const;
export type PresetColor = (typeof PRESET_COLORS)[number];
export type BgColor = PresetColor | `#${string}`;

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
