import { ref, readonly } from 'vue';
import type { HistoryEntry } from '@/types';
import { HISTORY_KEY, MAX_HISTORY } from '@/types';

/**
 * 生成压缩缩略图 (base64 data URL)。
 * @param blob 原始图片 Blob
 * @param maxSide 缩略图最大边长（默认 120px）
 * @param fmt 输出格式
 */
function generateThumbnail(blob: Blob, maxSide = 120, fmt: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 上下文创建失败'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const quality = fmt === 'jpeg' ? 0.6 : undefined;
      const dataUrl = canvas.toDataURL(`image/${fmt}`, quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('缩略图生成失败'));
    };

    img.src = url;
  });
}

/**
 * 处理历史 composable。
 * 使用 localStorage 持久化，最多 MAX_HISTORY 条记录。
 */
export function useHistory() {
  const entries = ref<HistoryEntry[]>([]);

  // ---- 从 localStorage 加载 ----
  function load(): void {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          entries.value = parsed;
        }
      }
    } catch {
      entries.value = [];
    }
  }

  // ---- 持久化到 localStorage ----
  function persist(): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.value));
    } catch {
      // localStorage 满了 —— 尝试删除最旧条目
      if (entries.value.length > 1) {
        entries.value = entries.value.slice(0, Math.floor(entries.value.length * 0.7));
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.value));
        } catch {
          // 仍然失败，放弃
        }
      }
    }
  }

  // ---- 添加条目 ----
  async function add(params: {
    filename: string;
    originalBlob: Blob;
    resultBlob: Blob;
    dimensions: { width: number; height: number };
    modelUsed: string;
  }): Promise<void> {
    const { filename, originalBlob, resultBlob, dimensions, modelUsed } = params;

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    try {
      const [originalThumb, resultThumb] = await Promise.all([
        generateThumbnail(originalBlob, 120, 'jpeg'),
        generateThumbnail(resultBlob, 120, 'png'),
      ]);

      // 结果大图的 data URL
      const resultDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('读取结果图片失败'));
        reader.readAsDataURL(resultBlob);
      });

      const entry: HistoryEntry = {
        id,
        filename,
        timestamp: Date.now(),
        originalThumb,
        resultThumb,
        resultDataUrl,
        dimensions,
        modelUsed,
      };

      entries.value.unshift(entry);

      // 超过上限则裁剪
      if (entries.value.length > MAX_HISTORY) {
        entries.value = entries.value.slice(0, MAX_HISTORY);
      }

      persist();
    } catch {
      // 缩略图生成/存储失败 —— 静默跳过，不影响主流程
    }
  }

  // ---- 删除单条 ----
  function remove(id: string): void {
    entries.value = entries.value.filter(e => e.id !== id);
    persist();
  }

  // ---- 清空全部 ----
  function clearAll(): void {
    entries.value = [];
    persist();
  }

  // ---- 初始化加载 ----
  load();

  return {
    entries: readonly(entries),
    add,
    remove,
    clearAll,
    load,
  };
}
