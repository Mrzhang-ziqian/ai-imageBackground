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

  /** 滚轮缩放（焦点跟随鼠标位置）。到达边界时不阻止默认滚动。 */
  function onWheel(e: WheelEvent): void {
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

  /** 缩放超出边界时回弹 */
  function clampPan(): void {
    if (scale.value <= 1) {
      panX.value = 0;
      panY.value = 0;
    }
  }

  // ---- Pointer Events（拖拽 + 双指） ----

  function onPointerDown(e: PointerEvent): void {
    if (scale.value <= 1) return;
    containerEl.value?.setPointerCapture(e.pointerId);
    lastPointer.value = { x: e.clientX, y: e.clientY };
    isDragging.value = true;
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging.value || !lastPointer.value) return;

    const dx = e.clientX - lastPointer.value.x;
    const dy = e.clientY - lastPointer.value.y;

    panX.value += dx;
    panY.value += dy;

    lastPointer.value = { x: e.clientX, y: e.clientY };
    clampPan();
  }

  function onPointerUp(): void {
    isDragging.value = false;
    lastPointer.value = null;
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
  }

  // ---- Computed ----

  const isZoomed = computed(() => scale.value > 1.05);

  const zoomPercent = computed(() => Math.round(scale.value * 100) + '%');

  /** 直接应用于 img 标签的 style 对象 */
  const imgTransform = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
    cursor: scale.value > 1.05 ? (isDragging.value ? 'grabbing' : 'grab') : 'default',
  }));

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
    clampPan();
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
