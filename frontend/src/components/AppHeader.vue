<template>
  <header class="header">
    <div class="container">
      <div class="header-row">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <h1>AI 背景移除</h1>
        </div>

        <!-- 用户区域 -->
        <div class="user-area">
          <template v-if="isLoggedIn && user">
            <div class="user-info">
              <span class="plan-badge" :class="user.plan">{{ planLabel }}</span>
              <span class="quota-text" v-if="user.plan === 'free'">
                剩余 {{ quotaLeft }} 次
              </span>
              <span class="username">{{ user.username }}</span>
            </div>
            <button class="auth-btn outline" @click="logout">退出</button>
          </template>
          <button v-else class="auth-btn primary" @click="$emit('open-auth')">
            登录
          </button>
        </div>
      </div>
      <p class="subtitle">拖拽上传图片，AI 自动移除背景 · 免费每日 5 张高清</p>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useQuota } from '@/composables/useQuota'

defineEmits<{ openAuth: [] }>()

const { isLoggedIn, user, userPlan, logout } = useAuth()
const { quotaLeft, isExhausted } = useQuota()

const planLabel = computed(() => {
  const map: Record<string, string> = { free: '免费', pro: 'Pro', team: 'Team' }
  return map[userPlan.value] ?? '免费'
})
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.user-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.plan-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-muted);
}
.plan-badge.pro {
  background: #ede9fe;
  border-color: #c4b5fd;
  color: #7c3aed;
}
.plan-badge.team {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}
.quota-text {
  color: var(--text-muted);
}
.username {
  font-weight: 600;
  color: var(--text);
}

.auth-btn {
  padding: 0.375rem 1rem;
  border-radius: var(--radius);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.auth-btn.primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.auth-btn.primary:hover {
  filter: brightness(1.1);
}
.auth-btn.outline {
  background: transparent;
  border-color: var(--border);
  color: var(--text-muted);
}
.auth-btn.outline:hover {
  color: var(--text);
  border-color: var(--text-muted);
}
</style>
