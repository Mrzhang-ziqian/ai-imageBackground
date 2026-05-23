/**
 * History Pinia Store — 后端历史记录管理
 *
 * K8: 从 useHistory 模块级单例迁移到 Pinia Store。
 */
import { defineStore } from 'pinia'
import { ref, readonly, watch } from 'vue'
import type { HistoryEntry } from '@/types'
import { historyApi } from '@/services/api'
import { useAuthStore } from './auth'

export const useHistoryStore = defineStore('history', () => {
  const auth = useAuthStore()
  const entries = ref<HistoryEntry[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  // ---- 从后端加载（显式调用） ----
  async function load(): Promise<void> {
    loading.value = true
    try {
      entries.value = await historyApi.list(auth.token)
      loaded.value = true
    } catch {
      entries.value = []
      loaded.value = false
    } finally {
      loading.value = false
    }
  }

  // ---- 删除单条 ----
  async function remove(id: number): Promise<void> {
    try {
      await historyApi.remove(id, auth.token)
      entries.value = entries.value.filter(e => e.id !== id)
    } catch {
      // 静默失败（API 失败时 UI 不变）
    }
  }

  // ---- 清空全部 ----
  async function clearAll(): Promise<void> {
    try {
      await historyApi.clearAll(auth.token)
      entries.value = []
    } catch {
      // 静默失败
    }
  }

  // ---- 监听登录状态变化（登出清空，登入不自动加载） ----
  watch(() => auth.isLoggedIn, (loggedIn) => {
    if (!loggedIn) {
      entries.value = []
      loaded.value = false
    }
  })

  return {
    entries: readonly(entries),
    loading: readonly(loading),
    loaded: readonly(loaded),
    load,
    reload: load,
    remove,
    clearAll,
  }
})
