import { ref, reactive, shallowRef, readonly } from 'vue';
import type { ProcessingState, BgColor, FileValidationResult, ImageDimensions } from '@/types';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '@/types';
import { uploadAndRemoveBg } from '@/services/api';

/**
 * 图片背景移除核心逻辑 —— 组合式函数。
 *
 * 职责：
 * - 文件校验
 * - 上传 & AI 处理（通过 XHR 获取进度）
 * - 背景颜色合成（Canvas）
 * - 下载结果
 * - 状态重置
 */
export function useBackgroundRemover() {
  // ---- Reactive State ----
  const currentFile = shallowRef<File | null>(null);
  const originalUrl = ref<string>('');
  const resultBlob = shallowRef<Blob | null>(null);
  const transparentBlob = shallowRef<Blob | null>(null);
  const resultUrl = ref<string>('');
  const resultFilename = ref<string>('removed_bg.png');
  const currentBgColor = ref<BgColor>('transparent');
  const resultDimensions = ref<ImageDimensions | null>(null);
  const modelUsed = ref<string>('');

  const processing = reactive<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: '',
    detail: '',
  });

  let abortController: AbortController | null = null;

  // ---- File Validation ----

  function validateFile(file: File | null): FileValidationResult {
    if (!file) return { valid: false, error: '请选择图片文件' };
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      return {
        valid: false,
        error: '不支持的文件格式，请上传 PNG、JPEG 或 WebP 图片',
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `文件过大 (最大 20MB)，当前文件: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      };
    }
    return { valid: true };
  }

  // ---- Process Image ----

  async function processImage(file: File): Promise<string | null> {
    // 中止旧请求、清理旧资源
    abortCurrent();
    revokeAllUrls();

    currentFile.value = file;
    resultBlob.value = null;
    transparentBlob.value = null;
    resultUrl.value = '';
    resultDimensions.value = null;
    currentBgColor.value = 'transparent';

    originalUrl.value = URL.createObjectURL(file);

    processing.status = 'uploading';
    processing.progress = 0;
    processing.message = '准备上传...';
    processing.detail = `${(file.size / 1024).toFixed(0)} KB`;

    abortController = new AbortController();

    try {
      const result = await uploadAndRemoveBg(
        file,
        // 上传进度
        (pct, loaded, total) => {
          processing.progress = pct;
          processing.message = '上传中...';
          const loadedKb = (loaded / 1024).toFixed(0);
          const totalKb = (total / 1024).toFixed(0);
          processing.detail = `${loadedKb} / ${totalKb} KB`;
        },
        // 阶段切换
        (phase) => {
          if (phase === 'processing') {
            processing.status = 'processing';
            processing.message = 'AI 正在移除背景...';
            processing.progress = 30;
            const totalKb = file.size / 1024;
            processing.detail =
              totalKb < 100
                ? '约 2-5 秒'
                : totalKb < 500
                  ? '约 5-10 秒'
                  : totalKb < 2000
                    ? '约 10-20 秒'
                    : '约 20-60 秒';
          }
        },
        abortController.signal,
      );

      // API 已返回 → 平滑过渡进度到 100% 再显示结果
      await animateToFinish();

      processing.status = 'done';
      processing.progress = 100;
      processing.message = '处理完成！';

      transparentBlob.value = result.blob;
      resultBlob.value = result.blob;
      resultUrl.value = URL.createObjectURL(result.blob);
      resultFilename.value = result.filename;
      resultDimensions.value = result.dimensions ?? null;
      modelUsed.value = result.modelUsed ?? '';

      return null;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null; // 用户主动取消
      }
      const message = err instanceof Error ? err.message : '处理失败';
      processing.status = 'error';
      processing.message = '处理失败';
      processing.detail = message;
      return message;
    }
  }

  /**
   * 重试当前文件：不清除已上传的 originalUrl，直接用 currentFile 重新处理。
   * 场景：模型降级/重试后仍失败，用户点击「重试」按钮。
   */
  async function retryCurrentFile(): Promise<string | null> {
    const file = currentFile.value;
    if (!file) return '没有可重试的文件';

    // 清理上次结果资源但保留 originalUrl
    abortCurrent();
    if (resultUrl.value && resultUrl.value !== originalUrl.value) {
      URL.revokeObjectURL(resultUrl.value);
    }
    resultUrl.value = '';
    resultBlob.value = null;
    transparentBlob.value = null;
    resultDimensions.value = null;
    modelUsed.value = '';
    currentBgColor.value = 'transparent';

    processing.status = 'uploading';
    processing.progress = 0;
    processing.message = '重新上传中...';
    processing.detail = `${(file.size / 1024).toFixed(0)} KB`;

    abortController = new AbortController();

    try {
      const result = await uploadAndRemoveBg(
        file,
        (pct, loaded, total) => {
          processing.progress = pct;
          processing.message = '上传中...';
          const loadedKb = (loaded / 1024).toFixed(0);
          const totalKb = (total / 1024).toFixed(0);
          processing.detail = `${loadedKb} / ${totalKb} KB`;
        },
        (phase) => {
          if (phase === 'processing') {
            processing.status = 'processing';
            processing.message = 'AI 正在移除背景...';
            processing.progress = 30;
            const totalKb = file.size / 1024;
            processing.detail =
              totalKb < 100
                ? '约 2-5 秒'
                : totalKb < 500
                  ? '约 5-10 秒'
                  : totalKb < 2000
                    ? '约 10-20 秒'
                    : '约 20-60 秒';
          }
        },
        abortController.signal,
      );

      await animateToFinish();

      processing.status = 'done';
      processing.progress = 100;
      processing.message = '处理完成！';

      transparentBlob.value = result.blob;
      resultBlob.value = result.blob;
      resultUrl.value = URL.createObjectURL(result.blob);
      resultFilename.value = result.filename;
      resultDimensions.value = result.dimensions ?? null;
      modelUsed.value = result.modelUsed ?? '';

      return null;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null;
      }
      const message = err instanceof Error ? err.message : '处理失败';
      processing.status = 'error';
      processing.message = '处理失败';
      processing.detail = message;
      return message;
    }
  }

  /**
   * API 返回结果后，将进度平滑过渡到 100%。
   * 不再做长时间模拟 —— 因为服务端已返回数据，没有必要阻塞 UI。
   */
  function animateToFinish(): Promise<void> {
    return new Promise((resolve) => {
      let p = processing.progress || 30;
      const timer = setInterval(() => {
        p += (100 - p) * 0.35;
        if (p >= 99.5) {
          processing.progress = 100;
          clearInterval(timer);
          resolve();
        } else {
          processing.progress = Math.round(p);
        }
      }, 50);
    });
  }

  // ---- Background Color Compositing ----

  /**
   * 将透明 PNG 合成到指定纯色背景上。
   */
  function compositeWithColor(blob: Blob, color: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 上下文创建失败'));

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob 失败'))),
          'image/png',
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };

      img.src = url;
    });
  }

  /**
   * 应用背景色：transparent 用原始图，其它用 Canvas 合成。
   * @returns 错误消息，无错误返回 null
   */
  async function applyBackgroundColor(color: BgColor): Promise<string | null> {
    currentBgColor.value = color;
    const tBlob = transparentBlob.value;
    if (!tBlob) return null;

    if (color === 'transparent') {
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
      resultUrl.value = URL.createObjectURL(tBlob);
      resultBlob.value = tBlob;
      return null;
    }

    try {
      const compositeBlob = await compositeWithColor(tBlob, color);
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
      resultUrl.value = URL.createObjectURL(compositeBlob);
      resultBlob.value = compositeBlob;
      return null;
    } catch (err: unknown) {
      return err instanceof Error ? err.message : '背景颜色合成失败';
    }
  }

  // ---- Download ----

  function downloadResult(): void {
    const blob = resultBlob.value;
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFilename.value;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Cleanup ----

  function abortCurrent(): void {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function revokeAllUrls(): void {
    if (originalUrl.value) {
      URL.revokeObjectURL(originalUrl.value);
      originalUrl.value = '';
    }
    if (resultUrl.value && resultUrl.value !== originalUrl.value) {
      URL.revokeObjectURL(resultUrl.value);
      resultUrl.value = '';
    }
  }

  function reset(): void {
    abortCurrent();
    revokeAllUrls();
    currentFile.value = null;
    resultBlob.value = null;
    transparentBlob.value = null;
    resultUrl.value = '';
    resultDimensions.value = null;
    modelUsed.value = '';
    resultFilename.value = 'removed_bg.png';
    currentBgColor.value = 'transparent';
    Object.assign(processing, {
      status: 'idle' as const,
      progress: 0,
      message: '',
      detail: '',
    });
  }

  // ---- Return ----

  return {
    // 只读状态
    currentFile: readonly(currentFile),
    originalUrl: readonly(originalUrl),
    resultBlob: readonly(resultBlob),
    resultUrl: readonly(resultUrl),
    resultFilename: readonly(resultFilename),
    resultDimensions: readonly(resultDimensions),
    modelUsed: readonly(modelUsed),
    currentBgColor: readonly(currentBgColor),
    processing: readonly(processing) as ProcessingState,

    // 方法
    validateFile,
    processImage,
    retryCurrentFile,
    reset,
    abortCurrent,
    applyBackgroundColor,
    downloadResult,
  };
}
