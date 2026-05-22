<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="auth-overlay" @click.self="$emit('close')">
        <div class="auth-modal" role="dialog" aria-label="用户登录/注册">
          <!-- 关闭按钮 -->
          <button class="close-btn" @click="$emit('close')" aria-label="关闭">✕</button>

          <!-- Logo -->
          <div class="modal-header">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <h2>{{ isLogin ? '登录' : '注册' }}</h2>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

          <!-- 表单 -->
          <form @submit.prevent="handleSubmit" class="auth-form">
            <div v-if="!isLogin" class="form-group">
              <label for="username">用户名</label>
              <input
                id="username"
                v-model="username"
                type="text"
                placeholder="输入用户名"
                required
                minlength="2"
                :disabled="submitting"
              />
            </div>

            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="your@email.com"
                required
                :disabled="submitting"
              />
            </div>

            <div class="form-group">
              <label for="password">密码</label>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="至少 6 位"
                required
                minlength="6"
                :disabled="submitting"
              />
            </div>

            <button type="submit" class="submit-btn" :disabled="submitting">
              <span v-if="submitting" class="spinner"></span>
              <span v-else>{{ isLogin ? '登录' : '创建账号' }}</span>
            </button>
          </form>

          <!-- 切换 -->
          <p class="switch-text">
            {{ isLogin ? '还没有账号？' : '已有账号？' }}
            <button class="switch-btn" @click="toggleMode">
              {{ isLogin ? '免费注册' : '去登录' }}
            </button>
          </p>

          <!-- 免费提示 -->
          <div v-if="isLogin" class="free-hint">
            🎉 注册即享每日 5 张全分辨率免费抠图
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { login, register, error } = useAuth()

const isLogin = ref(true)
const email = ref('')
const username = ref('')
const password = ref('')
const submitting = ref(false)
const errorMsg = ref('')

function toggleMode() {
  isLogin.value = !isLogin.value
  errorMsg.value = ''
  email.value = ''
  username.value = ''
  password.value = ''
}

async function handleSubmit() {
  errorMsg.value = ''
  submitting.value = true

  try {
    if (isLogin.value) {
      await login(email.value.trim(), password.value)
    } else {
      await register(email.value.trim(), username.value.trim(), password.value)
    }
    emit('close')
    // 重置表单
    email.value = ''
    username.value = ''
    password.value = ''
  } catch (e: any) {
    errorMsg.value = e?.message ?? (isLogin.value ? '登录失败' : '注册失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ---- Overlay ---- */
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* ---- Modal ---- */
.auth-modal {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.25rem;
  border-radius: var(--radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.close-btn:hover {
  background: var(--hover);
  color: var(--text);
}

/* ---- Header ---- */
.modal-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1.5rem;
}
.logo-icon {
  width: 28px;
  height: 28px;
  color: var(--primary);
}
.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

/* ---- Error ---- */
.error-msg {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius);
  font-size: 0.8125rem;
  margin-bottom: 1rem;
}

/* ---- Form ---- */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.form-group label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text);
}
.form-group input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.9375rem;
  background: var(--bg);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---- Submit ---- */
.submit-btn {
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: var(--radius);
  background: var(--primary);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}
.submit-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}
.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- Switch ---- */
.switch-text {
  margin-top: 1.25rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}
.switch-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
}
.switch-btn:hover {
  text-decoration: underline;
}

/* ---- Hint ---- */
.free-hint {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-muted);
  background: var(--bg);
  padding: 0.5rem;
  border-radius: var(--radius);
}

/* ---- Transition ---- */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .auth-modal,
.modal-leave-to .auth-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
