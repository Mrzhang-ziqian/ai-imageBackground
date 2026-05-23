import { ref, readonly, watch } from 'vue';
import type { HistoryEntry } from '@/types';
import { historyApi } from '@/services/api';
import { useAuth } from './useAuth';

/**
 * 处理历史 composable — 后端存储版。
 *
 * 每次成功处理后由后端自动保存；前端通过 API 加载/删除/清空。
 *
 * **关键设计**：不自动加载历史（避免在确认前暴露未确认条目）。
 * 仅当用户确认草稿（DraftDetailPage.handleConfirm）后，
 * 由 WorkspacePage 通过路由 query 参数触发显式加载。
 *
 * 登出时自动清空本地数据。
 */
export function useHistory() {
  const { isLoggedIn } = useAuth();
  const entries = ref<HistoryEntry[]>([]);
  const loading = ref(false);
  const loaded = ref(false);

  // ---- 从后端加载（显式调用） ----
  async function load(): Promise<void> {
    loading.value = true;
    try {
      entries.value = await historyApi.list();
      loaded.value = true;
    } catch {
      entries.value = [];
      loaded.value = false;
    } finally {
      loading.value = false;
    }
  }

  // ---- 删除单条 ----
  async function remove(id: number): Promise<void> {
    // K12: 乐观更新 → 先调 API，成功后再更新 UI（防止静默失败导致 UI 与后端不一致）
    try {
      await historyApi.remove(id);
      entries.value = entries.value.filter(e => e.id !== id);
    } catch {
      // 静默失败（API 失败时 UI 不变，用户可重试）
    }
  }

  // ---- 清空全部 ----
  async function clearAll(): Promise<void> {
    // K12: 同上
    try {
      await historyApi.clearAll();
      entries.value = [];
    } catch {
      // 静默失败
    }
  }

  // ---- 监听登录状态变化（登出清空，登入不自动加载） ----
  watch(isLoggedIn, (loggedIn) => {
    if (!loggedIn) {
      entries.value = [];
      loaded.value = false;
    }
    // 注意：登录后不自动 load()，由各页面按需调用
  });

  return {
    entries: readonly(entries),
    loading: readonly(loading),
    loaded: readonly(loaded),
    load,
    reload: load,
    remove,
    clearAll,
  };
}
