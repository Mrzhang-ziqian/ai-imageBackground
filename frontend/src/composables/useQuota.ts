/**
 * useQuota — 配额状态管理（Pinia Store 包装器）
 *
 * K8: 已迁移到 Pinia Store (stores/auth.ts 中的 quotaLeft 等计算属性)。
 * 保留此文件以保持现有导入路径向后兼容。
 * 配额现在直接从 auth store 计算。
 */
import { computed, readonly } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from './useAuth'

export function useQuota() {
  const auth = useAuthStore()
  const { user, isLoggedIn, fetchMe } = useAuth()

  const quotaUsed = computed(() => {
    if (!isLoggedIn.value || !user.value) return 0
    return user.value.quota_used ?? 0
  })

  const quotaDaily = computed(() => {
    if (!isLoggedIn.value || !user.value) return null
    return user.value.quota_daily ?? 5
  })

  const quotaLeft = computed(() => {
    if (quotaDaily.value === null) return null
    return Math.max(0, quotaDaily.value - quotaUsed.value)
  })

  const isExhausted = computed(() => quotaLeft.value !== null && quotaLeft.value <= 0)

  async function afterSuccessfulRequest(): Promise<void> {
    await auth.fetchMe()
  }

  return {
    quotaUsed: readonly(quotaUsed),
    quotaDaily: readonly(quotaDaily),
    quotaLeft: readonly(quotaLeft),
    isExhausted: readonly(isExhausted),
    syncFromServer: fetchMe,
    afterSuccessfulRequest,
  }
}
