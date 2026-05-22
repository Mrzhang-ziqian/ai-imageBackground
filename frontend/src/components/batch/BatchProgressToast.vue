<template>
  <Transition name="toast-slide">
    <div v-if="visible" class="batch-progress-toast">
      <div class="toast-inner">
        <div class="toast-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span class="toast-title">正在批量处理</span>
          <span class="toast-count">{{ done }}/{{ total }}</span>
          <button class="toast-return" @click="$emit('return')">查看</button>
        </div>
        <div class="toast-progress">
          <div class="toast-progress-track">
            <div class="toast-progress-fill" :style="{ width: percent + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  done: number;
  total: number;
  percent: number;
}>();

defineEmits<{
  (e: 'return'): void;
}>();
</script>

<style scoped>
.batch-progress-toast {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 14px 18px;
  min-width: 260px;
  max-width: 340px;
  backdrop-filter: blur(8px);
}

.toast-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spin-icon {
  animation: spin 1.5s linear infinite;
  color: #6366f1;
  flex-shrink: 0;
}

.toast-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
  white-space: nowrap;
}

.toast-count {
  font-size: 12px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.toast-return {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.toast-return:hover {
  background: #f3f4f6;
  color: #374151;
}

.toast-progress {
  width: 100%;
}

.toast-progress-track {
  height: 5px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.toast-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* 滑入/滑出动画 */
.toast-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-slide-leave-active {
  transition: all 0.25s ease-in;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .batch-progress-toast {
    top: 70px;
    right: 10px;
    left: 10px;
    max-width: none;
    min-width: 0;
  }
}
</style>
