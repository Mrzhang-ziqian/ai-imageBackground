<template>
  <div class="progress-overlay" :class="{ hidden: !visible }">
    <div class="progress-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>
    <p class="progress-text">{{ message }}</p>
    <p v-if="detail" class="progress-detail">{{ detail }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  progress: number;
  message: string;
  detail?: string;
}>();
</script>

<style scoped>
.progress-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  z-index: 10;
  padding: 30px;
  transition: opacity 0.3s;
}

.progress-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

.progress-container {
  width: 100%;
  max-width: 260px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 10px;
  transition: width 0.4s ease;
  position: relative;
}

.progress-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  font-size: 16px;
  font-weight: 600;
  color: #1e1e2e;
}

.progress-detail {
  font-size: 13px;
  color: #6b7280;
}

/* ---- 响应式 ---- */
@media (max-width: 480px) {
  .progress-container {
    width: 85%;
    max-width: 260px;
    padding: 20px;
  }

  .progress-text {
    font-size: 14px;
  }

  .progress-detail {
    font-size: 12px;
  }
}
</style>
