<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div
        v-if="toast?.visible"
        class="toast"
        :class="toast.type"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { ToastOptions } from '@/types';

defineProps<{
  toast: (ToastOptions & { visible: boolean }) | null;
}>();
</script>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - 32px);
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  pointer-events: none;
  text-align: center;
  line-height: 1.4;
}

@media (max-width: 480px) {
  .toast {
    top: 16px;
    padding: 10px 18px;
    font-size: 13px;
    border-radius: 10px;
    white-space: normal;
    word-break: break-word;
  }
}

.toast.error {
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
}

.toast.success {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
