<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="auth-overlay" @click.self="$emit('close')">
        <div class="auth-modal" role="dialog" aria-label="用户登录/注册">
          <!-- ==================== 左栏：品牌区 ==================== -->
          <div class="brand-panel">
            <!-- 装饰图案 -->
            <div class="brand-decor">
              <div class="decor-circle c1"></div>
              <div class="decor-circle c2"></div>
              <div class="decor-circle c3"></div>
            </div>

            <div class="brand-content">
              <div class="brand-logo">
                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)"/>
                  <path d="M18 6L6 12v12l12 6 12-6V12L18 6z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M18 18l-8-4m8 4l8-4m-8 4v10" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-dasharray="2 2"/>
                  <circle cx="18" cy="10" r="2" fill="currentColor"/>
                </svg>
                <span class="brand-name">BG Remover</span>
              </div>

              <h2 class="brand-tagline">
                {{ isLogin ? '欢迎回来' : '开始你的创意之旅' }}
              </h2>
              <p class="brand-desc">
                AI 驱动的背景移除工具，秒级出图、全分辨率保留、完全免费试用。
              </p>

              <ul class="feature-list">
                <li class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 12L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span>每日 5 次免费额度</span>
                </li>
                <li class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 12L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span>全高清分辨率输出</span>
                </li>
                <li class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 12L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span>批量处理 &amp; 历史记录</span>
                </li>
                <li class="feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 12L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <span>无需下载软件，浏览器直用</span>
                </li>
              </ul>
            </div>

            <!-- 底部装饰线 -->
            <div class="brand-footer-line"></div>
          </div>

          <!-- ==================== 右栏：表单区 ==================== -->
          <div class="form-panel">
            <!-- 关闭按钮 -->
            <button class="close-btn" @click="$emit('close')" aria-label="关闭">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4L14 14M4 14L14 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>

            <!-- Tab 切换 -->
            <div class="tab-bar">
              <button
                class="tab-btn"
                :class="{ active: isLogin }"
                @click="switchToMode(true)"
                type="button"
              >
                登录
              </button>
              <button
                class="tab-btn"
                :class="{ active: !isLogin }"
                @click="switchToMode(false)"
                type="button"
              >
                注册
              </button>
              <div class="tab-indicator" :class="{ right: !isLogin }"></div>
            </div>

            <!-- 错误提示 -->
            <Transition name="error-slide">
              <div v-if="errorMsg" class="error-msg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="error-icon">
                  <circle cx="8" cy="8" r="7" stroke="#DC2626" stroke-width="1.5"/>
                  <path d="M8 5v3M8 10v1" stroke="#DC2626" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                {{ errorMsg }}
              </div>
            </Transition>

            <!-- 表单 -->
            <form @submit.prevent="handleSubmit" class="auth-form" :key="isLogin ? 'login' : 'register'">
              <!-- 用户名（仅注册） -->
              <Transition name="field-expand">
                <div v-if="!isLogin" class="form-group">
                  <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M3 15c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <input
                      id="username"
                      v-model="username"
                      type="text"
                      placeholder="你的昵称"
                      required
                      minlength="2"
                      :disabled="submitting"
                      autocomplete="username"
                    />
                  </div>
                </div>
              </Transition>

              <div class="form-group">
                <div class="input-wrapper">
                  <svg class="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M2 5l7 5 7-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    :disabled="submitting"
                    autocomplete="email"
                  />
                </div>
              </div>

              <div class="form-group">
                <div class="input-wrapper">
                  <svg class="input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="7" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="9" cy="11" r="1.2" fill="currentColor"/>
                    <path d="M9 4v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="至少 6 位密码"
                    required
                    minlength="6"
                    :disabled="submitting"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="toggle-password"
                    @click="showPassword = !showPassword"
                    :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                    tabindex="-1"
                  >
                    <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="9" cy="9" r="2" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M3 3L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button type="submit" class="submit-btn" :disabled="submitting">
                <span v-if="submitting" class="spinner"></span>
                <template v-else>
                  <span>{{ isLogin ? '登录' : '创建免费账号' }}</span>
                  <svg class="btn-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M5 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </template>
              </button>
            </form>

            <!-- 底部提示 -->
            <p class="switch-text">
              {{ isLogin ? '还没有账号？' : '已有账号？' }}
              <button class="switch-btn" @click="toggleMode" type="button">
                {{ isLogin ? '免费注册' : '去登录' }}
              </button>
            </p>
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
const showPassword = ref(false)

/** 安全切换模式 — 防止重复切换，始终清理表单状态 */
function switchToMode(loginMode: boolean) {
  if (isLogin.value === loginMode) return
  toggleMode()
}

function toggleMode() {
  isLogin.value = !isLogin.value
  errorMsg.value = ''
  showPassword.value = false
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
    showPassword.value = false
  } catch (e: any) {
    errorMsg.value = e?.message ?? (isLogin.value ? '登录失败' : '注册失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* ============================
   Overlay
   ============================ */
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

/* ============================
   Modal 容器 — 双栏布局
   ============================ */
.auth-modal {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 780px;
  min-height: 480px;
  background: var(--surface, #fff);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 25px 60px rgba(0, 0, 0, 0.18),
    0 8px 20px rgba(0, 0, 0, 0.08);
}

/* ============================
   左栏 — 品牌区
   ============================ */
.brand-panel {
  position: relative;
  flex: 0 0 44%;
  background: linear-gradient(160deg, #6366f1 0%, #4f46e5 40%, #4338ca 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 32px;
  overflow: hidden;
  color: #fff;
}

/* 装饰圆圈 */
.brand-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.decor-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}
.c1 {
  width: 120px;
  height: 120px;
  top: -20px;
  right: 30px;
}
.c2 {
  width: 80px;
  height: 80px;
  bottom: 60px;
  right: -10px;
  background: rgba(255, 255, 255, 0.12);
}
.c3 {
  width: 200px;
  height: 200px;
  bottom: -60px;
  left: -30px;
  background: rgba(255, 255, 255, 0.05);
}

/* 品牌内容 */
.brand-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-logo svg {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}
.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.brand-tagline {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.25;
  margin: 0;
}

.brand-desc {
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.85;
  margin: 0;
}

/* 卖点列表 */
.feature-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.9;
}
.feature-item svg {
  flex-shrink: 0;
  opacity: 0.85;
}

/* 底部装饰线 */
.brand-footer-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05));
  border-radius: 999px;
}

/* ============================
   右栏 — 表单区
   ============================ */
.form-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 36px;
  position: relative;
  background: var(--surface, #fff);
}

/* ---- 关闭按钮 ---- */
.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.close-btn:hover {
  background: var(--hover, #f3f4f6);
  color: var(--text, #111827);
}

/* ---- Tab 切换 ---- */
.tab-bar {
  position: relative;
  display: flex;
  margin-bottom: 24px;
  background: var(--bg, #f9fafb);
  border-radius: 10px;
  padding: 4px;
  isolation: isolate;
}
.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted, #9ca3af);
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.25s ease;
  position: relative;
  z-index: 1;
  user-select: none;
}
.tab-btn.active {
  color: var(--text, #111827);
}
.tab-btn:hover:not(.active) {
  color: var(--text-secondary, #6b7280);
}

.tab-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  background: var(--surface, #fff);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-indicator.right {
  /* translateX(100%) = 移动自身宽度的 100%，即恰好跨过一个 Tab */
  transform: translateX(100%);
}

/* ---- 错误提示 ---- */
.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  line-height: 1.4;
}
.error-icon {
  flex-shrink: 0;
}

/* ---- 表单 ---- */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted, #9ca3af);
  pointer-events: none;
  flex-shrink: 0;
}

.input-wrapper input {
  width: 100%;
  padding: 11px 12px 11px 38px;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 10px;
  font-size: 14px;
  background: var(--bg, #f9fafb);
  color: var(--text, #111827);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.input-wrapper input:focus {
  border-color: var(--primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  background: var(--surface, #fff);
}
.input-wrapper input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 密码可见切换 */
.toggle-password {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted, #9ca3af);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.toggle-password:hover {
  color: var(--text, #111827);
}

/* ---- 提交按钮 ---- */
.submit-btn {
  margin-top: 6px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--primary, #6366f1);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 46px;
}
.submit-btn:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.submit-btn:active:not(:disabled) {
  transform: scale(0.98) translateY(0);
}
.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-arrow {
  transition: transform 0.2s;
}
.submit-btn:hover:not(:disabled) .btn-arrow {
  transform: translateX(2px);
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

/* ---- 底部切换提示 ---- */
.switch-text {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted, #9ca3af);
}
.switch-btn {
  background: none;
  border: none;
  color: var(--primary, #6366f1);
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
}
.switch-btn:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ============================
   Transitions
   ============================ */
/* ---- 弹窗进出 ---- */
.modal-enter-active {
  transition: opacity 0.3s ease;
}
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .auth-modal,
.modal-leave-to .auth-modal {
  transform: scale(0.94);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

/* ---- 错误消息滑入 ---- */
.error-slide-enter-active {
  transition: all 0.25s ease;
}
.error-slide-leave-active {
  transition: all 0.15s ease;
}
.error-slide-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.error-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---- 注册字段展开 ---- */
.field-expand-enter-active {
  transition: all 0.3s ease;
}
.field-expand-leave-active {
  transition: all 0.2s ease;
}
.field-expand-enter-from,
.field-expand-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

/* ============================
   响应式 — 小屏折叠为单栏
   ============================ */
@media (max-width: 640px) {
  .auth-modal {
    flex-direction: column;
    max-width: 420px;
    min-height: auto;
    border-radius: 16px;
  }

  .brand-panel {
    flex: none;
    padding: 28px 24px 20px;
  }

  .brand-tagline {
    font-size: 18px;
  }

  .brand-desc {
    font-size: 12px;
  }

  .feature-list {
    display: none;
  }

  .form-panel {
    padding: 24px 24px 32px;
  }
}
</style>
