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
import { useUiStore } from './ui'

export const useHistoryStore = defineStore('history', () => {
  const auth = useAuthStore()
  const ui = useUiStore()
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

  // ---- 删除单条（乐观更新 + 失败回滚） ----
  async function remove(id: number): Promise<void> {
    const snapshot = [...entries.value]
    entries.value = entries.value.filter(e => e.id !== id)
    try {
      await historyApi.remove(id, auth.token)
    } catch {
      entries.value = snapshot
      ui.showToast({ message: '删除失败，请重试', type: 'error' })
    }
  }

  // ---- 清空全部（乐观更新 + 失败回滚） ----
  async function clearAll(): Promise<void> {
    const snapshot = [...entries.value]
    entries.value = []
    try {
      await historyApi.clearAll(auth.token)
    } catch {
      entries.value = snapshot
      ui.showToast({ message: '清空失败，请重试', type: 'error' })
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
