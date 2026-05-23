/**
 * useQuota — 配额状态管理
 *
 * 仅追踪已登录用户的每日配额，从 /auth/me 同步。
 * 匿名使用已废弃（v2.0 强制登录）。
 */
import { computed, readonly } from 'vue';
import { useAuth } from './useAuth';

/**
 * 配额状态管理 —— 组合式函数。
 */
export function useQuota() {
  const { isLoggedIn, user, fetchMe } = useAuth();

  /** 已使用次数（仅登录用户有效） */
  const quotaUsed = computed(() => {
    if (!isLoggedIn.value || !user.value) {
      return 0;
    }
    return user.value.quota_used ?? 0;
  });

  /** 每日总额度（仅登录用户有效） */
  const quotaDaily = computed(() => {
    if (!isLoggedIn.value || !user.value) {
      return null;
    }
    return user.value.quota_daily ?? 5;
  });

  /** 剩余次数（K14: 未登录时返回 null 让 UI 显示加载态） */
  const quotaLeft = computed(() => {
    if (quotaDaily.value === null) return null;
    return Math.max(0, quotaDaily.value - quotaUsed.value);
  });

  /** 是否已用完 */
  const isExhausted = computed(() => quotaLeft.value !== null && quotaLeft.value <= 0);

  /**
   * 成功处理一张图片后调用：从服务端重新拉取最新 quota。
   */
  async function afterSuccessfulRequest(): Promise<void> {
    await fetchMe();
  }

  return {
    quotaUsed: readonly(quotaUsed),
    quotaDaily: readonly(quotaDaily),
    quotaLeft: readonly(quotaLeft),
    isExhausted: readonly(isExhausted),
    /** 手动从服务端同步配额（登录/注册后调用） */
    syncFromServer: fetchMe,
    afterSuccessfulRequest,
  };
}
