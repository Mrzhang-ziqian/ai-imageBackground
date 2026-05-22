/**
 * useQuota — 配额状态管理
 *
 * 统一处理匿名试用计数（localStorage）和登录用户配额（API 同步）。
 * 匿名用户：2 次免费试用，localStorage 按日计数，日期变更自动重置。
 * 登录用户：从 /auth/me 同步每日配额，每次成功处理后刷新。
 */
import { ref, computed, readonly } from 'vue';
import { useAuth } from './useAuth';

/** 匿名用户免费试用次数 */
const ANON_TRIAL_LIMIT = 2;

/** localStorage 键 */
const ANON_KEY = 'ai-bg-remover-anon-trial';

interface AnonTrial {
  date: string; // YYYY-MM-DD
  count: number;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function loadAnonTrial(): AnonTrial {
  try {
    const raw = localStorage.getItem(ANON_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.date === 'string' && typeof parsed.count === 'number') {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return { date: '', count: 0 };
}

function saveAnonTrial(trial: AnonTrial): void {
  try {
    localStorage.setItem(ANON_KEY, JSON.stringify(trial));
  } catch { /* ignore */ }
}

/**
 * 配额状态管理 —— 组合式函数。
 */
export function useQuota() {
  const { isLoggedIn, user, fetchMe } = useAuth();

  const anonTrial = ref<AnonTrial>(loadAnonTrial());

  /** 确保匿名计数日期正确（跨天自动重置） */
  function checkAnonDate(): void {
    const today = getToday();
    if (anonTrial.value.date !== today) {
      anonTrial.value = { date: today, count: 0 };
      saveAnonTrial(anonTrial.value);
    }
  }

  // ---- Computed ----

  /** 已使用次数 */
  const quotaUsed = computed(() => {
    if (isLoggedIn.value && user.value) {
      return user.value.quota_used;
    }
    checkAnonDate();
    return anonTrial.value.count;
  });

  /** 每日总额度 */
  const quotaDaily = computed(() => {
    if (isLoggedIn.value && user.value) {
      return user.value.quota_daily;
    }
    return ANON_TRIAL_LIMIT;
  });

  /** 剩余次数 */
  const quotaLeft = computed(() => Math.max(0, quotaDaily.value - quotaUsed.value));

  /** 是否已用完 */
  const isExhausted = computed(() => quotaLeft.value <= 0);

  // ---- Actions ----

  /**
   * 成功处理一张图片后调用：增加已用计数。
   * - 匿名：localStorage 计数 +1
   * - 登录：从服务端重新拉取最新 quota
   */
  async function afterSuccessfulRequest(): Promise<void> {
    checkAnonDate();
    if (isLoggedIn.value) {
      await fetchMe();
    } else {
      anonTrial.value.count += 1;
      // 防止 localStorage 被篡改
      if (anonTrial.value.count > ANON_TRIAL_LIMIT) {
        anonTrial.value.count = ANON_TRIAL_LIMIT;
      }
      saveAnonTrial(anonTrial.value);
    }
  }

  return {
    quotaUsed: readonly(quotaUsed),
    quotaDaily: readonly(quotaDaily),
    quotaLeft: readonly(quotaLeft),
    isExhausted: readonly(isExhausted),
    isLoggedIn,
    afterSuccessfulRequest,
    /** 手动从服务端同步配额（登录/注册后调用） */
    syncFromServer: fetchMe,
  };
}
