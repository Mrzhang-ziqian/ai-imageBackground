import { ref, reactive, computed, shallowRef, readonly } from 'vue';
import type { BatchItem, BatchItemStatus, BatchPhase, ImageDimensions } from '@/types';
import { uploadAndRemoveBg } from '@/services/api';
import type { HistoryEntry } from '@/types';

let _nextId = 0;
function generateId(): string {
  return `batch_${Date.now()}_${++_nextId}`;
}

/**
 * 批量处理组合式函数。
 *
 * 职责：
 * - 管理文件队列（添加/删除/清空）
 * - 顺序处理文件（一个一个调 API）
 * - 跟踪每个文件的处理状态
 * - 支持取消全部
 */
export function useBatchProcessor() {
  // ---- State ----
  const items = reactive<BatchItem[]>([]);
  const phase = ref<BatchPhase>('entry');
  const currentIndex = ref(-1);

  let batchAbortController: AbortController | null = null;

  // ---- Computed ----
  const totalCount = computed(() => items.length);
  const doneCount = computed(() => items.filter((i) => i.status === 'done').length);
  const errorCount = computed(() => items.filter((i) => i.status === 'error').length);
  const overallProgress = computed(() => {
    if (items.length === 0) return 0;
    const done = doneCount.value + errorCount.value;
    return Math.round((done / items.length) * 100);
  });
  const isProcessing = computed(() => phase.value === 'processing');
  const allDone = computed(() => doneCount.value + errorCount.value === items.length && items.length > 0);

  // ---- File Management ----

  /**
   * 向队列添加文件。
   * 去重：相同 name + size 的文件不重复添加。
   */
  function addFiles(files: File[]): number {
    let added = 0;
    for (const file of files) {
      // 去重
      if (items.some((i) => i.file.name === file.name && i.file.size === file.size)) {
        continue;
      }
      const item: BatchItem = {
        id: generateId(),
        file,
        originalUrl: URL.createObjectURL(file),
        status: 'queued',
        progress: 0,
        message: '等待处理',
        resultBlob: null,
        resultFilename: '',
        dimensions: null,
        modelUsed: '',
        error: null,
      };
      items.push(item);
      added++;
    }
    return added;
  }

  /** 从队列移除单个文件 */
  function removeItem(id: string): void {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const item = items[idx];
    // 清理资源
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    if (item.resultBlob) item.resultBlob = null;

    items.splice(idx, 1);
  }

  /** 清空队列 */
  function clearItems(): void {
    for (const item of items) {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    }
    items.length = 0;
    currentIndex.value = -1;
    phase.value = 'entry';
  }

  // ---- Batch Processing ----

  async function startProcessing(): Promise<void> {
    if (items.length === 0) return;
    if (phase.value === 'processing') return;

    phase.value = 'processing';
    currentIndex.value = -1;
    batchAbortController = new AbortController();

    for (let i = 0; i < items.length; i++) {
      // 检查是否已取消
      if (batchAbortController.signal.aborted) break;

      const item = items[i];
      if (item.status === 'done' || item.status === 'error') continue;

      currentIndex.value = i;
      await processOneItem(item, batchAbortController.signal);
    }

    if (!batchAbortController.signal.aborted) {
      phase.value = 'done';
    }
  }

  async function processOneItem(item: BatchItem, signal: AbortSignal): Promise<void> {
    item.status = 'uploading';
    item.progress = 0;
    item.message = '上传中...';
    item.error = null;

    try {
      const result = await uploadAndRemoveBg(
        item.file,
        // 上传进度
        (pct) => {
          if (signal.aborted) return;
          item.progress = Math.min(pct, 25);
          item.message = '上传中...';
        },
        // 阶段切换
        (phase) => {
          if (signal.aborted) return;
          if (phase === 'processing') {
            item.status = 'processing';
            item.progress = 30;
            item.message = 'AI 处理中...';
          }
        },
        signal,
      );

      if (signal.aborted) return;

      // 模拟平滑完成
      item.progress = 100;
      item.status = 'done';
      item.message = '完成';
      item.resultBlob = result.blob;
      item.resultFilename = result.filename;
      item.dimensions = result.dimensions ?? null;
      item.modelUsed = result.modelUsed ?? '';
    } catch (err: unknown) {
      if (signal.aborted) return;
      item.status = 'error';
      item.message = '处理失败';
      item.error = err instanceof Error ? err.message : '未知错误';
    }
  }

  /** 取消当前正在处理的批次 */
  function cancelProcessing(): void {
    if (batchAbortController) {
      batchAbortController.abort();
      batchAbortController = null;
    }
    // 将队列中未开始的项目标记为 queued（保留已完成的）
    for (const item of items) {
      if (item.status === 'uploading' || item.status === 'processing') {
        item.status = 'queued';
        item.progress = 0;
        item.message = '已取消';
      }
    }
    phase.value = 'entry';
  }

  // ---- Result Access ----

  /** 获取处理结果，用于传入单图模式 */
  function getBatchResultData(id: string): {
    originalDataUrl: string;
    resultDataUrl: string;
    filename: string;
    file: File;
    dimensions: ImageDimensions;
    modelUsed: string;
    resultBlob: Blob;
  } | null {
    const item = items.find((i) => i.id === id);
    if (!item || item.status !== 'done' || !item.resultBlob) return null;

    return {
      originalDataUrl: item.originalUrl,
      resultDataUrl: URL.createObjectURL(item.resultBlob),
      filename: item.resultFilename || `removed_${item.file.name}`,
      file: item.file,
      dimensions: item.dimensions || { width: 0, height: 0 },
      modelUsed: item.modelUsed,
      resultBlob: item.resultBlob,
    };
  }

  // ---- Bulk Download ----

  /** 下载所有成功的结果 */
  function downloadAll(): void {
    const doneItems = items.filter((i) => i.status === 'done' && i.resultBlob);
    if (doneItems.length === 0) return;

    doneItems.forEach((item, index) => {
      setTimeout(() => {
        if (!item.resultBlob) return;
        const url = URL.createObjectURL(item.resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.resultFilename || `removed_bg_${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, index * 300); // 逐个下载，间隔 300ms
    });
  }

  // ---- Cleanup ----

  function destroy(): void {
    cancelProcessing();
    for (const item of items) {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
    }
    items.length = 0;
  }

  return {
    // state
    items,
    phase,
    currentIndex: readonly(currentIndex),
    totalCount,
    doneCount,
    errorCount,
    overallProgress,
    isProcessing,
    allDone,

    // methods
    addFiles,
    removeItem,
    clearItems,
    startProcessing,
    cancelProcessing,
    getBatchResultData,
    downloadAll,
    destroy,
  };
}

/** 将数据 URL 转为 Blob 的工具函数 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
