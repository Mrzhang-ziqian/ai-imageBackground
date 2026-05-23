/**
 * 草稿箱 Pinia Store
 *
 * 保存用户处理完成但尚未确认的图片。
 * 元数据和 Blob 均存 IndexedDB（idb-keyval），避免 localStorage 5MB 限额。
 *
 * IndexedDB keys:
 *   drafts:meta              → Draft[] 元数据 JSON
 *   draft:result:{id}        → 去底结果 PNG Blob
 *   draft:original:{id}      → 原始图片 Blob（全尺寸，用于对比）
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';

export interface Draft {
  id: string;
  filename: string;
  /** 原图缩略图 data URL（small，仅用于草稿箱列表） */
  thumbnailUrl: string;
  /** 结果缩略图 data URL（small，仅用于草稿箱列表） */
  resultThumbUrl: string;
  dimensions: { width: number; height: number };
  modelUsed: string;
  createdAt: number;
}

const DRAFTS_META_KEY = 'drafts:meta';

async function loadMeta(): Promise<Draft[]> {
  try {
    const raw = await idbGet<string>(DRAFTS_META_KEY);
    if (raw) return JSON.parse(raw);
    // 回退：尝试从 localStorage 迁移旧数据
    const legacy = localStorage.getItem('drafts:meta');
    if (legacy) {
      const parsed = JSON.parse(legacy) as Draft[];
      // 迁移到 IndexedDB 后清除 localStorage
      await idbSet(DRAFTS_META_KEY, legacy);
      localStorage.removeItem('drafts:meta');
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveMeta(list: Draft[]): Promise<void> {
  // 始终写入 IndexedDB，不再使用 localStorage
  await idbSet(DRAFTS_META_KEY, JSON.stringify(list));
}

export const useDraftsStore = defineStore('drafts', () => {
  const items = ref<Draft[]>([]);
  const loading = ref(false);

  const count = computed(() => items.value.length);

  function idbResultKey(id: string) { return `draft:result:${id}`; }
  function idbOriginalKey(id: string) { return `draft:original:${id}`; }

  /** 初始化：从 IndexedDB 加载元数据 */
  async function init(): Promise<void> {
    items.value = await loadMeta();
  }

  /** 添加一个草稿，同时存储结果 Blob 和原图 Blob */
  async function add(draft: Draft, resultBlob: Blob, originalBlob?: Blob): Promise<void> {
    await Promise.all([
      idbSet(idbResultKey(draft.id), resultBlob),
      originalBlob ? idbSet(idbOriginalKey(draft.id), originalBlob) : Promise.resolve(),
    ]);
    items.value.unshift(draft);
    await saveMeta(items.value);
  }

  /** 删除一个草稿（含 IndexedDB 中的 Blob） */
  async function remove(id: string): Promise<void> {
    await Promise.all([
      idbDel(idbResultKey(id)),
      idbDel(idbOriginalKey(id)),
    ]);
    items.value = items.value.filter((d) => d.id !== id);
    await saveMeta(items.value);
  }

  /** 获取草稿的结果 Blob */
  async function getResultBlob(id: string): Promise<Blob | null> {
    try {
      return (await idbGet(idbResultKey(id))) as Blob | null;
    } catch {
      return null;
    }
  }

  /** 获取草稿的原图 Blob */
  async function getOriginalBlob(id: string): Promise<Blob | null> {
    try {
      return (await idbGet(idbOriginalKey(id))) as Blob | null;
    } catch {
      return null;
    }
  }

  /** 更新草稿的结果 Blob（编辑后保存） */
  async function updateResult(id: string, newResultBlob: Blob): Promise<void> {
    await idbSet(idbResultKey(id), newResultBlob);
  }

  /** 清空所有草稿 */
  async function clearAll(): Promise<void> {
    const allKeys = (await idbKeys()).filter(
      (k) => typeof k === 'string' &&
        ((k as string).startsWith('draft:result:') ||
         (k as string).startsWith('draft:original:') ||
         (k as string) === 'drafts:meta'),
    );
    await Promise.all(allKeys.map((k) => idbDel(k)));
    items.value = [];
  }

  /** 从 IndexedDB 重新加载 */
  async function reload(): Promise<void> {
    items.value = await loadMeta();
  }

  return {
    items,
    count,
    loading,
    init,
    add,
    remove,
    getResultBlob,
    getOriginalBlob,
    updateResult,
    clearAll,
    reload,
  };
});
