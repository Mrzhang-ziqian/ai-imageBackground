import { ref, readonly, watch } from 'vue';
import type { HistoryEntry } from '@/types';
import { MAX_HISTORY } from '@/types';
import { historyApi } from '@/services/api';
import { useAuth } from './useAuth';

/**
 * 处理历史 composable — 后端存储版。
 *
 * 每次成功处理后由后端自动保存；前端通过 API 加载/删除/清空。
 * 监听登录状态变化，自动重新加载对应账号的历史。
 */
export function useHistory() {
  const { isLoggedIn } = useAuth();
  const entries = ref<HistoryEntry[]>([]);
  const loading = ref(false);

  // ---- 从后端加载 ----
  async function load(): Promise<void> {
    loading.value = true;
    try {
      entries.value = await historyApi.list();
    } catch {
      entries.value = [];
    } finally {
      loading.value = false;
    }
  }

  // ---- 删除单条 ----
  async function remove(id: number): Promise<void> {
    try {
      await historyApi.remove(id);
      entries.value = entries.value.filter(e => e.id !== id);
    } catch {
      // 静默失败
    }
  }

  // ---- 清空全部 ----
  async function clearAll(): Promise<void> {
    try {
      await historyApi.clearAll();
      entries.value = [];
    } catch {
      // 静默失败
    }
  }

  // ---- 监听登录状态变化（登出清空，登入加载） ----
  watch(isLoggedIn, (loggedIn) => {
    if (loggedIn) {
      load();
    } else {
      entries.value = [];
    }
  }, { immediate: true });

  return {
    entries: readonly(entries),
    loading: readonly(loading),
    load,
    remove,
    clearAll,
  };
}
