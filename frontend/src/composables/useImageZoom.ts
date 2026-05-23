/**
 * useImageZoom — 图片缩放/拖拽 composable
 *
 * 用法：在 .preview-box 容器上用 :ref="zoom.initContainer" 绑定容器，
 * 然后绑定事件处理器。返回 imgTransform style 直接应用到 img 标签。
 *
 * 支持：滚轮缩放（焦点跟随）、拖拽平移、双击重置
 * 缩放范围：100% ~ 400%
 */
import { ref, computed, shallowRef } from 'vue';

export function useImageZoom() {
  const containerEl = shallowRef<HTMLElement | null>(null);
  const scale = ref(1);
  const panX = ref(0);
  const panY = ref(0);
  const isDragging = ref(false);
  const lastPointer = ref<{ x: number; y: number } | null>(null);
  const capturedPointerId = ref(-1);
  const lastWheelTime = ref(0);

  // 缩放边界
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  /** 绑定容器元素（用作 :ref callback） */
  function initContainer(el: unknown): void {
    containerEl.value = el as HTMLElement | null;
  }

  /** 限制缩放范围 */
  function clampScale(v: number): number {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));
  }

  /** 获取鼠标/触摸点在容器内的坐标 */
  function getContainerCoords(e: MouseEvent | PointerEvent): { x: number; y: number } {
    const rect = containerEl.value?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /** 滚轮缩放（焦点跟随鼠标位置）。到达边界时不阻止默认滚动。T26: 16ms 节流 */
  function onWheel(e: WheelEvent): void {
    // 节流：高频率触控板滚动时限制为每 16ms 一次（~60fps）
    const now = performance.now();
    if (now - lastWheelTime.value < 16) return;
    lastWheelTime.value = now;

    const oldScale = scale.value;
    const coords = getContainerCoords(e);
    const dir = e.deltaY < 0 ? 1 : -1;
    const step = 0.12;
    const newScale = clampScale(oldScale * (1 + dir * step));

    // 到达边界：允许页面正常滚动
    if (newScale === oldScale) return;

    e.preventDefault();

    // 保持鼠标指向的点不动
    const ratio = newScale / oldScale;
    panX.value = coords.x - ratio * (coords.x - panX.value);
    panY.value = coords.y - ratio * (coords.y - panY.value);

    scale.value = newScale;
    clampPan();
  }

  /** 拖拽平移边界约束：确保至少 30% 的图像在容器内可见 */
  function clampPan(): void {
    const s = scale.value;
    if (s <= 1.05) {
      panX.value = 0;
      panY.value = 0;
      return;
    }
    // 容器尺寸（若未绑定则跳过）
    const rect = containerEl.value?.getBoundingClientRect();
    if (!rect) return;
    const cw = rect.width;
    const ch = rect.height;
    // 缩放后的图像尺寸（假设 img 宽高填充容器 100%）
    const iw = cw * s;
    const ih = ch * s;
    // 允许拖出边界的最大距离（图像至少 30% 可见）
    const margin = 0.3;
    const maxPanX = Math.max(0, iw - cw * (1 - margin));
    const maxPanY = Math.max(0, ih - ch * (1 - margin));
    panX.value = Math.max(-maxPanX, Math.min(maxPanX, panX.value));
    panY.value = Math.max(-maxPanY, Math.min(maxPanY, panY.value));
  }

  // ---- Pointer Events（拖拽 + 双指） ----

  function onPointerDown(e: PointerEvent): void {
    if (scale.value <= 1) return;
    containerEl.value?.setPointerCapture(e.pointerId);
    capturedPointerId.value = e.pointerId;
    lastPointer.value = { x: e.clientX, y: e.clientY };
    isDragging.value = true;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging.value || !lastPointer.value) return;

    e.preventDefault();

    const dx = e.clientX - lastPointer.value.x;
    const dy = e.clientY - lastPointer.value.y;

    panX.value += dx;
    panY.value += dy;

    lastPointer.value = { x: e.clientX, y: e.clientY };
    clampPan();
  }

  function onPointerUp(): void {
    if (!isDragging.value) return;
    if (containerEl.value && capturedPointerId.value >= 0) {
      try { containerEl.value.releasePointerCapture(capturedPointerId.value); } catch { /* 已被隐式释放 */ }
    }
    isDragging.value = false;
    lastPointer.value = null;
    capturedPointerId.value = -1;
    clampPan();
  }

  function onPointerLeave(): void {
    if (isDragging.value) {
      isDragging.value = false;
      lastPointer.value = null;
      clampPan();
    }
  }

  /** 双击重置 */
  function onDoubleClick(): void {
    scale.value = 1;
    panX.value = 0;
    panY.value = 0;
  }

  /** 按钮重置 */
  function resetZoom(): void {
    scale.value = 1;
    panX.value = 0;
    panY.value = 0;
  }

  /** 重置缩放并清理状态（切换图片时调用） */
  function resetState(): void {
    scale.value = 1;
    panX.value = 0;
    panY.value = 0;
    isDragging.value = false;
    lastPointer.value = null;
    capturedPointerId.value = -1;
    lastWheelTime.value = 0;
  }

  // ---- Computed ----

  const isZoomed = computed(() => scale.value > 1.05);

  const zoomPercent = computed(() => Math.round(scale.value * 100) + '%');

  /** 直接应用于 img 标签的 style 对象。T31: scale=1 时不生成 transform 避免无谓合成层 */
  const imgTransform = computed(() => {
    if (scale.value <= 1.05 && panX.value === 0 && panY.value === 0) {
      return { cursor: 'default' as const };
    }
    return {
      transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
      transformOrigin: '0 0',
      cursor: scale.value > 1.05 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
    };
  });

  const containerCursor = computed(() =>
    scale.value > 1.05 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
  );

  /** 缩放到指定级别 */
  function zoomTo(target: number): void {
    scale.value = clampScale(target);
    if (target <= 1) {
      panX.value = 0;
      panY.value = 0;
    }
    // 缩放>1 时 clampPan 已在内部处理边界，无需重复调用
  }

  return {
    initContainer,
    scale,
    isZoomed,
    zoomPercent,
    imgTransform,
    containerCursor,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onDoubleClick,
    resetZoom,
    resetState,
    zoomTo,
  };
}
