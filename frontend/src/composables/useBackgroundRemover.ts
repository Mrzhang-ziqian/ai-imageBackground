import { ref, reactive, shallowRef, readonly } from 'vue';
import type { ProcessingState, BgColor, FileValidationResult, ImageDimensions, BackgroundTemplate } from '@/types';
import { ALLOWED_TYPES, MAX_FILE_SIZE, BACKGROUND_TEMPLATES } from '@/types';
import { uploadAndRemoveBg } from '@/services/api';
import { renderWithTemplate } from './useTemplateRenderer';

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

  const currentTemplateId = ref<string | null>(null);

  const processing = reactive<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: '',
    detail: '',
  });

  let abortController: AbortController | null = null;

  /** 边缘编辑前的透明 Blob 快照（用于撤销边缘修改） */
  let preEditTransparentBlob: Blob | null = null;

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
    currentTemplateId.value = null;

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
    currentTemplateId.value = null;

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
   * 注意：应用背景色会清除模板选择。
   * @returns 错误消息，无错误返回 null
   */
  async function applyBackgroundColor(color: BgColor): Promise<string | null> {
    currentBgColor.value = color;
    currentTemplateId.value = null; // 清除模板
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

  // ---- Template Background ----

  /**
   * 应用模板背景：使用 Canvas 合成模板背景（渐变/阴影等）。
   * 注意：应用模板会清除纯色背景选择。
   * @param templateId 模板 ID，传 null 则移除模板（回退到透明底）
   * @returns 错误消息，无错误返回 null
   */
  async function applyTemplate(templateId: string | null): Promise<string | null> {
    const tBlob = transparentBlob.value;
    if (!tBlob) return null;

    if (!templateId) {
      // 移除模板 → 回到透明背景
      currentTemplateId.value = null;
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
      resultUrl.value = URL.createObjectURL(tBlob);
      resultBlob.value = tBlob;
      currentBgColor.value = 'transparent';
      return null;
    }

    const template = BACKGROUND_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return `未找到模板: ${templateId}`;

    try {
      const rendered = await renderWithTemplate(tBlob, template);
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
      resultUrl.value = URL.createObjectURL(rendered);
      resultBlob.value = rendered;
      currentTemplateId.value = templateId;
      // 模板与纯色互斥：清除纯色状态
      currentBgColor.value = 'transparent';
      return null;
    } catch (err: unknown) {
      return err instanceof Error ? err.message : '模板渲染失败';
    }
  }

  // ---- Edge Tools Integration (G05) ----

  /**
   * 边缘工具产出的新透明 Blob：替换透明底和显示结果。
   * 首次调用时保存原始透明 Blob 作为撤销快照。
   */
  function updateTransparentBlob(newBlob: Blob): void {
    // 保存原始（仅在首次编辑时）
    if (!preEditTransparentBlob && transparentBlob.value) {
      preEditTransparentBlob = transparentBlob.value;
    }
    // 清理旧 URL
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    transparentBlob.value = newBlob;
    resultBlob.value = newBlob;
    resultUrl.value = URL.createObjectURL(newBlob);
    currentBgColor.value = 'transparent';
    currentTemplateId.value = null;
  }

  /**
   * 撤销所有边缘编辑：恢复到抠图完成后的原始透明底。
   */
  function resetEdgeEdits(): void {
    if (!preEditTransparentBlob) return;
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    transparentBlob.value = preEditTransparentBlob;
    resultBlob.value = preEditTransparentBlob;
    resultUrl.value = URL.createObjectURL(preEditTransparentBlob);
    currentBgColor.value = 'transparent';
    currentTemplateId.value = null;
    preEditTransparentBlob = null;
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

  /**
   * 从历史记录恢复：直接用 data URL 设置结果，跳过上传/处理流程。
   */
  function restoreFromHistory(params: {
    originalDataUrl: string;
    resultDataUrl: string;
    filename: string;
    dimensions: ImageDimensions;
    modelUsed: string;
  }): void {
    abortCurrent();
    revokeAllUrls();

    // 从 data URL 构建 Blob
    const dataUrlToBlob = (dataUrl: string): Blob => {
      const [header, b64] = dataUrl.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    };

    const resultBlobData = dataUrlToBlob(params.resultDataUrl);
    transparentBlob.value = resultBlobData;
    resultBlob.value = resultBlobData;
    resultUrl.value = URL.createObjectURL(resultBlobData);
    originalUrl.value = params.originalDataUrl;
    resultFilename.value = params.filename;
    resultDimensions.value = params.dimensions;
    modelUsed.value = params.modelUsed;
    currentBgColor.value = 'transparent';
    currentTemplateId.value = null;

    Object.assign(processing, {
      status: 'done' as const,
      progress: 100,
      message: '已恢复',
      detail: '',
    });
  }

  /**
   * 从草稿箱恢复：直接注入已有的 Object URLs 和 Blobs。
   * 此方法不使用 revokeAllUrls，因为 URLs 由调用方管理生命周期。
   */
  function restoreFromDraft(params: {
    resultUrl: string;
    resultBlob: Blob;
    originalUrl: string;
    originalBlob?: Blob;
    filename: string;
    dimensions: ImageDimensions;
    modelUsed: string;
  }): void {
    abortCurrent();
    // 不调用 revokeAllUrls：URLs 由调用方（DraftDetailPage）通过 onUnmounted 管理
    // 只清理可能存在的旧状态（初始状态通常为空）
    if (originalUrl.value && originalUrl.value !== params.originalUrl) {
      URL.revokeObjectURL(originalUrl.value);
    }
    if (resultUrl.value && resultUrl.value !== params.resultUrl) {
      URL.revokeObjectURL(resultUrl.value);
    }
    currentFile.value = null;
    transparentBlob.value = params.resultBlob;
    resultBlob.value = params.resultBlob;
    resultUrl.value = params.resultUrl;
    originalUrl.value = params.originalUrl;
    resultFilename.value = params.filename;
    resultDimensions.value = params.dimensions;
    modelUsed.value = params.modelUsed;
    currentBgColor.value = 'transparent';
    currentTemplateId.value = null;
    preEditTransparentBlob = null;
    Object.assign(processing, {
      status: 'done' as const,
      progress: 100,
      message: '处理完成',
      detail: '',
    });
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
    currentTemplateId.value = null;
    preEditTransparentBlob = null;
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
    transparentBlob: readonly(transparentBlob),
    resultUrl: readonly(resultUrl),
    resultFilename: readonly(resultFilename),
    resultDimensions: readonly(resultDimensions),
    modelUsed: readonly(modelUsed),
    currentBgColor: readonly(currentBgColor),
    currentTemplateId: readonly(currentTemplateId),
    processing: readonly(processing) as ProcessingState,

    // 方法
    validateFile,
    processImage,
    retryCurrentFile,
    restoreFromHistory,
    restoreFromDraft,
    reset,
    abortCurrent,
    applyBackgroundColor,
    applyTemplate,
    updateTransparentBlob,
    resetEdgeEdits,
    downloadResult,
  };
}
