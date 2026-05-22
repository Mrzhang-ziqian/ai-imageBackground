<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('cancel')">
        <div class="modal-card" :class="{ exhausted: isExhausted }">

          <!-- ===== 情况 A：有剩余额度 → 确认弹窗 ===== -->
          <template v-if="!isExhausted">
            <div class="modal-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#6366F1" stroke-width="1.5" fill="#EEF2FF"/>
                <path d="M20 18v8M20 14v2" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>
            <h3 class="modal-title">重新上传？</h3>
            <p class="modal-desc">
              将清空当前已处理的 {{ sessionCount }} 张图片结果。
            </p>
            <!-- 配额进度条 -->
            <div class="quota-bar-section">
              <div class="quota-bar-label">
                <span>今日额度</span>
                <span>已用 {{ quotaUsed }} / 共 {{ quotaDaily }} 次</span>
              </div>
              <div class="quota-bar-track">
                <div
                  class="quota-bar-fill"
                  :style="{ width: quotaPercent + '%' }"
                ></div>
              </div>
              <p class="quota-bar-hint">剩余可上传：<strong>{{ quotaLeft }} 次</strong></p>
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="$emit('cancel')">取消</button>
              <button class="modal-btn confirm" @click="$emit('confirm')">确认重新上传</button>
            </div>
          </template>

          <!-- ===== 情况 B：配额已耗尽 → 升级引导 ===== -->
          <template v-else>
            <div class="modal-icon exhausted-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="#F59E0B" stroke-width="1.5" fill="#FFFBEB"/>
                <rect x="18" y="10" width="4" height="12" rx="2" fill="#F59E0B"/>
                <circle cx="20" cy="26" r="2" fill="#F59E0B"/>
              </svg>
            </div>
            <h3 class="modal-title">额度已用完</h3>
            <p class="modal-desc">
              今日 {{ quotaDaily }} 次免费额度已全部用完。<br/>
              免费版每日重置，明天可以继续使用。
            </p>
            <div class="quota-bar-section">
              <div class="quota-bar-track exhausted">
                <div class="quota-bar-fill full"></div>
              </div>
              <p class="quota-bar-hint exhausted-hint">已用 {{ quotaUsed }} / {{ quotaDaily }} 次</p>
            </div>
            <div class="pro-features">
              <div class="pro-feature" v-for="feat in proFeatures" :key="feat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5L6.5 12 13 5" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>{{ feat }}</span>
              </div>
            </div>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="$emit('cancel')">明天再说</button>
              <button class="modal-btn confirm" @click="$emit('confirm')">返回首页</button>
              <button class="modal-btn upgrade" @click="$emit('upgrade')">升级 Pro</button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  isExhausted: boolean;
  sessionCount: number;
  quotaUsed: number;
  quotaDaily: number;
  quotaLeft: number;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
  upgrade: [];
}>();

const quotaPercent = computed(() => {
  if (props.quotaDaily <= 0) return 100;
  return Math.min(100, (props.quotaUsed / props.quotaDaily) * 100);
});

const proFeatures = [
  '无限制图片处理',
  '批量下载 & 高清输出',
  '优先处理队列',
];
</script>

<style scoped>
/* ---- Overlay ---- */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}

/* ---- Card ---- */
.modal-card {
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-icon {
  margin-bottom: 12px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e1e2e;
  margin: 0 0 8px;
}

.modal-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px;
  line-height: 1.6;
}

/* ---- 配额进度条 ---- */
.quota-bar-section {
  background: #f9fafb;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
}

.quota-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.quota-bar-track {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.quota-bar-track.exhausted {
  background: #fde68a;
}

.quota-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.quota-bar-fill.full {
  width: 100% !important;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.quota-bar-hint {
  font-size: 13px;
  color: #4b5563;
  margin: 0;
}

.quota-bar-hint strong {
  color: #6366f1;
}

.exhausted-hint {
  color: #92400e;
}

/* ---- Pro Features ---- */
.pro-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  text-align: left;
  padding: 0 8px;
}

.pro-feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4b5563;
}

/* ---- Actions ---- */
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.modal-btn.cancel {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.modal-btn.cancel:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-btn.confirm {
  background: #6366f1;
  color: #fff;
}

.modal-btn.confirm:hover {
  background: #4f46e5;
}

.modal-btn.upgrade {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35);
}

.modal-btn.upgrade:hover {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
  transform: translateY(-1px);
}

/* ---- Transition ---- */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-card {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}

.modal-fade-leave-to .modal-card {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}

/* ---- Responsive ---- */
@media (max-width: 480px) {
  .modal-card {
    padding: 24px 18px;
    border-radius: 16px;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-btn {
    width: 100%;
  }
}
</style>
