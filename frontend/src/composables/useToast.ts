import { ref, onUnmounted } from 'vue';
import type { ToastOptions } from '@/types';

/**
 * Toast 通知组合式函数。
 *
 * 使用方式：
 * ```ts
 * const { toast, showToast } = useToast();
 * showToast({ message: '成功', type: 'success' });
 * ```
 */
export function useToast() {
  const toast = ref<
    (ToastOptions & { visible: boolean }) | null
  >(null);

  let timer: ReturnType<typeof setTimeout> | null = null;

  function showToast(options: ToastOptions): void {
    if (timer) clearTimeout(timer);
    toast.value = { ...options, visible: true };
    timer = setTimeout(() => {
      if (toast.value) toast.value.visible = false;
    }, options.duration ?? 4000);
  }

  function hideToast(): void {
    if (toast.value) toast.value.visible = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  onUnmounted(() => {
    if (timer) clearTimeout(timer);
  });

  return { toast, showToast, hideToast };
}
