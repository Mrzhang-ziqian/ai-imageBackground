/**
 * 草稿箱 Pinia Store
 *
 * 保存用户处理完成但尚未确认的图片。
 * 缩略图/元数据存 localStorage，Blob 存 IndexedDB（通过 idb-keyval）。
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';

export interface Draft {
  id: string;
  filename: string;
  thumbnailUrl: string;        // 原图缩略图 data URL（small）
  resultThumbUrl: string;       // 结果缩略图 data URL（small）
  dimensions: { width: number; height: number };
  modelUsed: string;
  createdAt: number;            // timestamp ms
}

const DRAFTS_META_KEY = 'drafts:meta';

/** 从 localStorage 读取草稿元数据列表 */
function loadMeta(): Draft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 将草稿元数据列表写入 localStorage */
function saveMeta(list: Draft[]): void {
  localStorage.setItem(DRAFTS_META_KEY, JSON.stringify(list));
}

export const useDraftsStore = defineStore('drafts', () => {
  const items = ref<Draft[]>(loadMeta());
  const loading = ref(false);

  const count = computed(() => items.value.length);

  /** 添加一个草稿 */
  async function add(draft: Draft, resultBlob: Blob): Promise<void> {
    // Blob 存 IndexedDB
    await idbSet(`draft:${draft.id}`, resultBlob);
    // 元数据存 localStorage
    items.value.unshift(draft);
    saveMeta(items.value);
  }

  /** 删除一个草稿 */
  async function remove(id: string): Promise<void> {
    await idbDel(`draft:${id}`);
    items.value = items.value.filter((d) => d.id !== id);
    saveMeta(items.value);
  }

  /** 获取草稿的 Blob（用于恢复/下载） */
  async function getBlob(id: string): Promise<Blob | null> {
    try {
      return (await idbGet(`draft:${id}`)) as Blob | null;
    } catch {
      return null;
    }
  }

  /** 清空所有草稿 */
  async function clearAll(): Promise<void> {
    const allKeys = (await idbKeys()).filter(
      (k) => typeof k === 'string' && (k as string).startsWith('draft:'),
    );
    await Promise.all(allKeys.map((k) => idbDel(k)));
    items.value = [];
    saveMeta([]);
  }

  /** 从缓存重新加载 */
  function reload(): void {
    items.value = loadMeta();
  }

  return {
    items,
    count,
    loading,
    add,
    remove,
    getBlob,
    clearAll,
    reload,
  };
});
