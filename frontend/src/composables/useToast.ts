/**
 * 组件级 Toast 通知组合式函数。
 *
 * 与 useUiStore 全局 toast 的区别：
 * - useToast（此处）：组件级别，生命周期随组件绑定，卸载自动清理，适合页面/组件内部通知
 * - useUiStore：全局单例，适合跨组件或中间件层（如 API 拦截器）的通知
 *
 * 使用方式：
 * ```ts
 * const { toast, showToast } = useToast();
 * showToast({ message: '成功', type: 'success' });
 * ```
 */
import { ref, onUnmounted } from 'vue';
import type { ToastOptions } from '@/types';
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
