import { ref, reactive, computed, shallowRef, readonly } from 'vue';
import type { BatchItem, BatchItemStatus, BatchPhase, ImageDimensions } from '@/types';
import { uploadAndRemoveBg } from '@/services/api';
import type { HistoryEntry } from '@/types';
import JSZip from 'jszip';
import { useAuth } from './useAuth';

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
  const auth = useAuth();
  let _nextId = 0;
  function generateId(): string {
    return `batch_${Date.now()}_${++_nextId}`;
  }
  // ---- State ----
  const items = reactive<BatchItem[]>([]);
  const phase = ref<BatchPhase>('entry');
  const currentIndex = ref(-1);

  let batchAbortController: AbortController | null = null;
  let retryAbortController: AbortController | null = null;
  /** P1-7: 并发重试守卫，防止快速点击多个重试按钮导致行为不可预测 */
  let _retryInProgress = false;
  /** T39: 跟踪 getBatchResultData 创建的 Blob URL，防止泄漏 */
  const _trackedResultUrls = new Set<string>();
  /** T37: 跟踪 downloadAll 的 setTimeout ID，destroy() 时清除 */
  const _downloadTimers = new Set<ReturnType<typeof setTimeout>>();

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
   * 去重：相同 name + size + lastModified 的文件不重复添加。
   * T49: 增加 lastModified 维度，避免修改后重新选择的同一文件被误判为重复。
   */
  function addFiles(files: File[]): number {
    let added = 0;
    for (const file of files) {
      // 去重（name + size + lastModified 三重判断）
      if (items.some((i) =>
        i.file.name === file.name &&
        i.file.size === file.size &&
        i.file.lastModified === file.lastModified
      )) {
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
    // T40: resultBlob 本身不需要 revoke，但需置空触发 GC
    if (item.resultBlob) item.resultBlob = null;

    items.splice(idx, 1);
  }

  /** 清空队列 */
  function clearItems(): void {
    for (const item of items) {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      // T48: BatchItem 类型无 resultUrl 属性 → 移除死代码
      if (item.resultBlob) item.resultBlob = null;
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
        auth.token.value,  // K5: 从 Store 传入 token
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

  /** 重试单个失败项。T38: AbortController 存储在实例变量中，支持外部取消。
   *  P1-7: _retryInProgress 守卫防止并发重试。 */
  async function retryItem(id: string): Promise<void> {
    if (_retryInProgress) return;
    const item = items.find((i) => i.id === id);
    if (!item || item.status !== 'error') return;

    _retryInProgress = true;

    // 重置状态
    item.status = 'queued';
    item.progress = 0;
    item.message = '等待重试';
    item.error = null;
    item.resultBlob = null;

    // T38: 存储在实例变量中，destroy() 可通过它中止重试
    retryAbortController = new AbortController();

    try {
      await processOneItem(item, retryAbortController.signal);
    } finally {
      _retryInProgress = false;
      retryAbortController = null;
      // 如果当前不是 processing 阶段，检查是否所有项都完成了
      if (allDone.value) {
        phase.value = 'done';
      }
    }
  }

  /** 重试所有失败项。P2-4: _retryInProgress 守卫防止与 cancelProcessing 状态竞争。 */
  async function retryAllErrors(): Promise<void> {
    if (_retryInProgress) return;
    const errorItems = items.filter((i) => i.status === 'error');
    if (errorItems.length === 0) return;

    _retryInProgress = true;
    phase.value = 'processing';
    // T38: 存储在实例变量中
    retryAbortController = new AbortController();

    // 重置所有失败项状态
    for (const item of errorItems) {
      item.status = 'queued';
      item.progress = 0;
      item.message = '等待重试';
      item.error = null;
      item.resultBlob = null;
    }

    for (const item of errorItems) {
      if (retryAbortController.signal.aborted) break;
      currentIndex.value = items.indexOf(item);
      await processOneItem(item, retryAbortController.signal);
    }

    // N7: 使用 allDone 判断而非无条件设置 done
    if (!retryAbortController.signal.aborted && allDone.value) {
      phase.value = 'done';
    }
    _retryInProgress = false;
    retryAbortController = null;
  }

  /** 取消当前正在处理的批次 */
  function cancelProcessing(): void {
    if (batchAbortController) {
      batchAbortController.abort();
      batchAbortController = null;
    }
    // P1-8: 中止正在进行的重试
    if (retryAbortController) {
      retryAbortController.abort();
      retryAbortController = null;
    }
    _retryInProgress = false;
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

  /** 获取处理结果，用于传入单图模式。T39: 跟踪返回的 Blob URL，调用方需手动 revoke。 */
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

    const resultUrl = URL.createObjectURL(item.resultBlob);
    _trackedResultUrls.add(resultUrl);  // T39: 跟踪所有创建的 Blob URL

    return {
      originalDataUrl: item.originalUrl,
      resultDataUrl: resultUrl,
      filename: item.resultFilename || `removed_${item.file.name}`,
      file: item.file,
      dimensions: item.dimensions || { width: 0, height: 0 },
      modelUsed: item.modelUsed,
      resultBlob: item.resultBlob,
    };
  }

  /** 释放 getBatchResultData 返回的 Object URL */
  function revokeBatchResultUrl(url: string): void {
    URL.revokeObjectURL(url);
    _trackedResultUrls.delete(url);  // T39: 同步清理跟踪集合
  }

  // ---- Bulk Download ----

  /** 将所有成功结果打包为 ZIP 并下载 */
  async function downloadAsZip(): Promise<void> {
    const doneItems = items.filter((i) => i.status === 'done' && i.resultBlob);
    if (doneItems.length === 0) return;

    const zip = new JSZip();
    const names = new Map<string, number>();

    for (const item of doneItems) {
      const blob = item.resultBlob!;
      const baseName = item.resultFilename || `removed_bg.png`;

      // 处理重名：name (1).png, name (2).png
      let fileName = baseName;
      const count = names.get(baseName) || 0;
      if (count > 0) {
        const dot = baseName.lastIndexOf('.');
        const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
        const ext = dot > 0 ? baseName.slice(dot) : '.png';
        fileName = `${stem} (${count})${ext}`;
      }
      names.set(baseName, count + 1);

      zip.file(fileName, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `removed_bg_batch_${doneItems.length}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** 下载所有成功的结果（逐个下载，保留兼容） */
  function downloadAll(): void {
    const doneItems = items.filter((i) => i.status === 'done' && i.resultBlob);
    if (doneItems.length === 0) return;

    doneItems.forEach((item, index) => {
      const timerId = setTimeout(() => {
        _downloadTimers.delete(timerId);  // T37: 执行后从追踪集合移除
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
      _downloadTimers.add(timerId);  // T37: 存储 timer ID，destroy() 时清理
    });
  }

  // ---- Cleanup ----

  function destroy(): void {
    cancelProcessing();
    // T38: 中止正在进行的重试
    if (retryAbortController) {
      retryAbortController.abort();
      retryAbortController = null;
    }
    // T37: 清除所有未触发的 downloadAll 定时器
    for (const timerId of _downloadTimers) {
      clearTimeout(timerId);
    }
    _downloadTimers.clear();
    // T39: 释放所有 tracked Blob URL
    for (const url of _trackedResultUrls) {
      URL.revokeObjectURL(url);
    }
    _trackedResultUrls.clear();
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
    retryItem,
    retryAllErrors,
    getBatchResultData,
    revokeBatchResultUrl,
    downloadAll,
    downloadAsZip,
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
