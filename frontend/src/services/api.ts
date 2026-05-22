import type { RemoveBgResult, ImageDimensions, AuthTokenResponse } from '@/types';
import { API_BASE } from '@/types';

// ============ Phase 5: Auth API ============

/** 后端返回的错误结构 */
interface ApiError {
  detail?: string;
}

class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

/** 配额耗尽错误（HTTP 429） */
export class QuotaExhaustedError extends Error {
  constructor(message?: string) {
    super(message || '配额已用完');
    this.name = 'QuotaExhaustedError';
  }
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let msg = `请求失败 (${res.status})`;
    try {
      const err: ApiError = await res.json();
      msg = err.detail ?? msg;
    } catch { /* ignore */ }
    throw new AuthApiError(msg, res.status);
  }

  return res.json();
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthTokenResponse> {
    return authFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, username: string, password: string): Promise<AuthTokenResponse> {
    return authFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  },

  async getMe(token: string): Promise<AuthTokenResponse['user']> {
    // fetch + Authorization header
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      let msg = `鉴权失败 (${res.status})`;
      try {
        const err: ApiError = await res.json();
        msg = err.detail ?? msg;
      } catch { /* ignore */ }
      throw new AuthApiError(msg, res.status);
    }
    return res.json();
  },
};

// ============ Remove BG API ============

/**
 * 上传图片并调用后端移除背景。
 *
 * @param file         要处理的图片文件
 * @param onProgress   上传进度回调 (百分比 0-25, 已上传字节, 总字节)
 * @param onPhaseChange 阶段变更回调：'uploading' -> 'processing'
 * @param signal       可选的 AbortSignal，用于取消请求
 * @returns 返回去背景后的 Blob 及推荐文件名
 */
export function uploadAndRemoveBg(
  file: File,
  onProgress: (percent: number, loaded: number, total: number) => void,
  onPhaseChange: (phase: 'uploading' | 'processing') => void,
  signal?: AbortSignal,
): Promise<RemoveBgResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    // 上传进度（占总进度 0-25%）
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 25);
        onProgress(pct, e.loaded, e.total);
      }
    });

    // 服务器开始响应头部 = 上传完成，进入 AI 处理阶段
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        onPhaseChange('processing');
      }
    });

    xhr.addEventListener('load', async () => {
      // 429 — 配额耗尽
      if (xhr.status === 429) {
        let errMsg = '请求次数已用完';
        try {
          const errorBlob = xhr.response as Blob;
          const text = await errorBlob.text();
          const err = JSON.parse(text);
          errMsg = err.detail || errMsg;
        } catch { /* ignore */ }
        reject(new QuotaExhaustedError(errMsg));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        const filename = `removed_bg_${file.name.replace(/\.[^.]+$/, '')}.png`;

        // 从响应头提取结果图片的真实尺寸
        let dimensions: ImageDimensions | undefined;
        const w = xhr.getResponseHeader('X-Image-Width');
        const h = xhr.getResponseHeader('X-Image-Height');
        if (w && h) {
          dimensions = { width: parseInt(w, 10), height: parseInt(h, 10) };
        }

        // 从响应头提取使用的 AI 模型
        const modelUsed = xhr.getResponseHeader('X-Model-Used') || undefined;

        resolve({ blob, filename, dimensions, modelUsed });
      } else {
        // 错误响应：从 Blob 响应体中读取 JSON 错误消息
        let errMsg = `服务器错误 (${xhr.status})`;
        try {
          const errorBlob = xhr.response as Blob;
          const text = await errorBlob.text();
          const err = JSON.parse(text);
          errMsg = err.detail || errMsg;
        } catch {
          // 无法解析，使用默认错误消息
        }
        reject(new Error(errMsg));
      }
    });

    xhr.addEventListener('error', () => {
      // 如果因 abort 触发，忽略（abort handler 已 reject）
      if (signal?.aborted) return;
      reject(new Error('无法连接到服务器，请确认后端已启动（http://localhost:8000）'));
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('请求已取消', 'AbortError'));
      });
    }

    // 发起请求
    xhr.open('POST', `${API_BASE}/remove-bg?_t=${Date.now()}`);
    xhr.responseType = 'blob';
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    // Phase 5: 若已登录，携带 JWT token
    const token = localStorage.getItem('auth_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}
