import { ref, reactive, shallowRef, readonly } from 'vue';
import type { ProcessingState, BgColor, FileValidationResult, ImageDimensions, BackgroundTemplate } from '@/types';
import { ALLOWED_TYPES, MAX_FILE_SIZE, BACKGROUND_TEMPLATES } from '@/types';
import { uploadAndRemoveBg } from '@/services/api';
import { renderWithTemplate } from './useTemplateRenderer';
import { dataUrlToBlob } from './useBatchProcessor';

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

  /** 处理阶段模拟进度定时器 */
  let progressAnimTimer: ReturnType<typeof setInterval> | null = null;

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

  /** 核心处理逻辑（processImage 和 retryCurrentFile 共用） */
  async function _doProcess(file: File, keepOriginalUrl: boolean): Promise<string | null> {
    abortCurrent();
    if (!keepOriginalUrl) {
      revokeAllUrls();
    }

    if (!keepOriginalUrl) {
      currentFile.value = file;
      originalUrl.value = URL.createObjectURL(file);
    }

    if (!keepOriginalUrl) {
      resultBlob.value = null;
      transparentBlob.value = null;
      resultUrl.value = '';
      resultDimensions.value = null;
      currentBgColor.value = 'transparent';
      currentTemplateId.value = null;
    } else {
      // 重试：清理结果但保留 originalUrl
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
    }

    processing.status = 'uploading';
    processing.progress = 0;
    processing.message = keepOriginalUrl ? '重新上传中...' : '准备上传...';
    processing.detail = `${(file.size / 1024).toFixed(0)} KB`;

    abortController = new AbortController();

    // 根据文件大小估算处理时长（毫秒）
    const totalKb = file.size / 1024;
    const estDurationMs =
      totalKb < 100 ? 4000 :
      totalKb < 500 ? 9000 :
      totalKb < 2000 ? 18000 :
      totalKb < 5000 ? 35000 : 55000;

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
            updateEta();
            // 启动平滑进度模拟（从 30% 线性增长到 ~88%，覆盖估算时长的 85%）
            startProgressSimulation(estDurationMs);
          }
        },
        abortController.signal,
      );

      stopProgressSimulation();
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
      stopProgressSimulation();
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

  async function processImage(file: File): Promise<string | null> {
    return _doProcess(file, false);
  }

  /**
   * 重试当前文件：不清除已上传的 originalUrl，直接用 currentFile 重新处理。
   * 场景：模型降级/重试后仍失败，用户点击「重试」按钮。
   */
  async function retryCurrentFile(): Promise<string | null> {
    const file = currentFile.value;
    if (!file) return '没有可重试的文件';
    return _doProcess(file, true);
  }

  /**
   * 启动处理阶段进度模拟。
   * 从 30% 缓慢增长到 88%，让用户感知到"正在工作"。
   * 如果 API 提前返回，外部会调用 stopProgressSimulation 停止。
   */
  function startProgressSimulation(estDurationMs: number): void {
    stopProgressSimulation();
    const startTime = Date.now();
    const targetDuration = estDurationMs * 0.85; // 85% 时长覆盖

    progressAnimTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / targetDuration, 1);
      // 使用缓入曲线：开始快，靠近目标放缓
      const easedRatio = 1 - Math.pow(1 - ratio, 1.5);
      processing.progress = Math.round(30 + easedRatio * 58); // 30 → 88
      updateEta(elapsed, ratio);
    }, 200);
  }

  /** 停止进度模拟 */
  function stopProgressSimulation(): void {
    if (progressAnimTimer !== null) {
      clearInterval(progressAnimTimer);
      progressAnimTimer = null;
    }
  }

  /** 更新预计剩余时间 */
  function updateEta(elapsedMs?: number, ratio?: number): void {
    const estTotal = (() => {
      const totalKb = (currentFile.value?.size ?? 0) / 1024;
      if (totalKb < 100) return 4000;
      if (totalKb < 500) return 9000;
      if (totalKb < 2000) return 18000;
      if (totalKb < 5000) return 35000;
      return 55000;
    })();

    const effectiveElapsed = elapsedMs ?? 0;
    const effectiveRatio = ratio ?? 0;

    if (effectiveRatio > 0 && effectiveElapsed > 1000) {
      // 根据实际耗时动态修正 ETA
      const correctedTotal = effectiveElapsed / effectiveRatio;
      const remaining = Math.max(0, correctedTotal - effectiveElapsed);
      const s = Math.round(remaining / 1000);
      processing.detail = s > 60
        ? `预计还需 ${Math.floor(s / 60)} 分 ${s % 60} 秒`
        : s > 0
          ? `预计还需 ${s} 秒`
          : '即将完成...';
    } else {
      const s = Math.round(estTotal / 1000);
      processing.detail = s > 60
        ? `预计 ${Math.floor(s / 60)} 分 ${s % 60} 秒`
        : `预计 ${s} 秒`;
    }
  }

  /**
   * API 返回结果后，将进度平滑过渡到 100%。
   */
  function animateToFinish(): Promise<void> {
    return new Promise((resolve) => {
      let p = processing.progress ?? 30;
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

  /**
   * 从草稿箱恢复：直接注入已有的 Object URLs 和 Blobs。
   * 此方法不使用 revokeAllUrls，因为 URLs 由调用方管理生命周期。
   */
  function restoreFromDraft(params: {
    resultUrl: string;
    resultBlob: Blob;
    originalUrl: string;
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
    stopProgressSimulation();
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
