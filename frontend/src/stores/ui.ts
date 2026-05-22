/**
 * UI 全局状态 — Toast 通知 / 批量进度浮窗 / 全局弹窗
 */
import { ref, readonly } from 'vue';
import { defineStore } from 'pinia';
import type { ToastOptions } from '@/types';

export const useUiStore = defineStore('ui', () => {
  // ---- Toast ----
  const toast = ref<ToastOptions | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(opts: ToastOptions): void {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = { ...opts };
    toastTimer = setTimeout(() => {
      toast.value = null;
      toastTimer = null;
    }, opts.duration ?? 4000);
  }

  function hideToast(): void {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = null;
    toastTimer = null;
  }

  // ---- 批量进度浮窗 ----
  const batchProgress = ref<{
    visible: boolean;
    done: number;
    total: number;
    percent: number;
  }>({ visible: false, done: 0, total: 0, percent: 0 });

  function showBatchProgress(done: number, total: number, percent: number): void {
    batchProgress.value = { visible: true, done, total, percent };
  }

  function updateBatchProgress(done: number, total: number, percent: number): void {
    batchProgress.value = { ...batchProgress.value, done, total, percent };
  }

  function hideBatchProgress(): void {
    batchProgress.value = { visible: false, done: 0, total: 0, percent: 0 };
  }

  // ---- 全局鉴权弹窗 ----
  const authModalVisible = ref(false);

  function openAuthModal(): void {
    authModalVisible.value = true;
  }

  function closeAuthModal(): void {
    authModalVisible.value = false;
  }

  return {
    toast: readonly(toast),
    showToast,
    hideToast,
    batchProgress: readonly(batchProgress),
    showBatchProgress,
    updateBatchProgress,
    hideBatchProgress,
    authModalVisible,
    openAuthModal,
    closeAuthModal,
  };
});
