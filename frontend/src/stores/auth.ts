/**
 * Auth Pinia Store — 用户鉴权 + 配额状态管理
 *
 * K8: 从 useAuth/useQuota 模块级单例迁移到 Pinia Store，
 * 获得 Vue DevTools 原生支持、$reset()、测试可隔离。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, AuthApiError } from '@/services/api'
import type { UserInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // ---------- State ----------
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ---------- Computed ----------
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const userPlan = computed(() => user.value?.plan ?? 'free')
  const quotaLeft = computed(() => {
    if (!user.value) return Infinity
    const daily = user.value.quota_daily ?? 5
    const used = user.value.quota_used ?? 0
    return Math.max(0, daily - used)
  })

  // ---------- Actions ----------

  async function fetchMe(): Promise<void> {
    if (!token.value) {
      initialized.value = true
      return
    }
    loading.value = true
    error.value = null
    try {
      user.value = await authApi.getMe(token.value)
    } catch (e: unknown) {
      if (e instanceof AuthApiError && (e.status === 401 || e.status === 403)) {
        logout()
      } else {
        error.value = e instanceof Error ? e.message : '加载用户信息失败'
      }
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  /* K33: login/register 提取公共逻辑 */
  async function login(email: string, password: string): Promise<void> {
    return _authorize(authApi.login(email, password))
  }

  async function register(email: string, username: string, password: string): Promise<void> {
    return _authorize(authApi.register(email, username, password))
  }

  /** 登录/注册公共鉴权流程 */
  async function _authorize(promise: ReturnType<typeof authApi.login>) {
    loading.value = true
    error.value = null
    try {
      const res = await promise
      token.value = res.access_token
      user.value = res.user
      localStorage.setItem('auth_token', res.access_token)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '鉴权操作失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  function logout(): void {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  // 初始化：如果本地有 token，尝试恢复用户信息
  if (token.value) {
    fetchMe()
  }

  return {
    token,
    user,
    loading,
    error,
    initialized,
    isLoggedIn,
    userPlan,
    quotaLeft,
    login,
    register,
    logout,
    fetchMe,
  }
})
