/**
 * useAuth — 用户鉴权状态管理
 *
 * 存储 token 到 localStorage，提供注册/登录/登出/获取当前用户。
 */
import { ref, computed } from 'vue'
import { authApi, AuthApiError } from '@/services/api'
import type { UserInfo } from '@/types'

// ---------- State ----------
const token = ref<string | null>(localStorage.getItem('auth_token'))
const user = ref<UserInfo | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

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
  if (!token.value) return
  loading.value = true
  error.value = null
  try {
    user.value = await authApi.getMe(token.value)
  } catch (e) {
    // 仅在真正的鉴权失败（401/403）时登出；网络抖动/超时不登出
    if (e instanceof AuthApiError && (e.status === 401 || e.status === 403)) {
      logout()
    }
  } finally {
    loading.value = false
  }
}

async function login(email: string, password: string): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await authApi.login(email, password)
    token.value = res.access_token
    user.value = res.user
    localStorage.setItem('auth_token', res.access_token)
  } catch (e: any) {
    error.value = e?.message ?? '登录失败'
    throw e
  } finally {
    loading.value = false
  }
}

async function register(email: string, username: string, password: string): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await authApi.register(email, username, password)
    token.value = res.access_token
    user.value = res.user
    localStorage.setItem('auth_token', res.access_token)
  } catch (e: any) {
    error.value = e?.message ?? '注册失败'
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

export function useAuth() {
  return {
    // State
    token,
    user,
    loading,
    error,
    isLoggedIn,
    userPlan,
    quotaLeft,

    // Actions
    login,
    register,
    logout,
    fetchMe,
  }
}
