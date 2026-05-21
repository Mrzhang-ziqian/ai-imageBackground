<template>
  <div
    ref="containerRef"
    class="compare-slider"
    :class="{ dragging: isDragging }"
    @mousedown="onHandleDown"
    @touchstart.prevent="onHandleDown"
    @keydown.left="moveBy(-2)"
    @keydown.right="moveBy(2)"
    tabindex="0"
    role="slider"
    :aria-valuenow="sliderPos"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="对比滑块"
  >
    <!-- 结果图（底图） -->
    <div class="compare-layer compare-result" :style="{ background: resultBgStyle }">
      <img v-if="resultUrl" :src="resultUrl" alt="处理结果" draggable="false" />
    </div>

    <!-- 原图覆盖层（左半部分可见） -->
    <div class="compare-layer compare-original" :style="{ width: sliderPos + '%' }">
      <img v-if="originalUrl" :src="originalUrl" alt="原图" draggable="false" />
    </div>

    <!-- 分割线 + 拖拽手柄 -->
    <div class="compare-line" :style="{ left: sliderPos + '%' }">
      <div class="compare-handle" @mousedown.stop="onHandleDown" @touchstart.stop.prevent="onHandleDown">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 2L5 8L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 2L11 8L6 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
        </svg>
      </div>
    </div>

    <!-- 浮标标签 -->
    <span class="compare-label label-original" :style="{ opacity: sliderPos > 10 ? 1 : 0 }">原图</span>
    <span class="compare-label label-result" :style="{ opacity: sliderPos < 90 ? 1 : 0 }">结果</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import type { BgColor } from '@/types';

const props = defineProps<{
  originalUrl: string;
  resultUrl: string;
  bgColor: BgColor;
}>();

const containerRef = ref<HTMLElement | null>(null);
const sliderPos = ref(50);
const isDragging = ref(false);

const resultBgStyle = computed(() => {
  if (props.bgColor !== 'transparent') {
    return props.bgColor;
  }
  // transparent → CSS chessboard pattern in <style>
  return '';
});

// ---- 拖拽逻辑 ----

function getClientX(e: MouseEvent | TouchEvent): number {
  if ('touches' in e) return e.touches[0].clientX;
  return e.clientX;
}

function updatePosition(clientX: number): void {
  const el = containerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const pct = ((clientX - rect.left) / rect.width) * 100;
  sliderPos.value = Math.max(2, Math.min(98, pct));
}

function onHandleDown(e: MouseEvent | TouchEvent): void {
  isDragging.value = true;
  updatePosition(getClientX(e));

  if ('touches' in e) {
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  } else {
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}

function onMove(e: MouseEvent | TouchEvent): void {
  if (!isDragging.value) return;
  e.preventDefault();
  updatePosition(getClientX(e));
}

function onUp(): void {
  isDragging.value = false;
  document.removeEventListener('mousemove', onMove);
  document.removeEventListener('mouseup', onUp);
  document.removeEventListener('touchmove', onMove);
  document.removeEventListener('touchend', onUp);
}

function moveBy(delta: number): void {
  sliderPos.value = Math.max(2, Math.min(98, sliderPos.value + delta));
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMove);
  document.removeEventListener('mouseup', onUp);
  document.removeEventListener('touchmove', onMove);
  document.removeEventListener('touchend', onUp);
});
</script>

<style scoped>
.compare-slider {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 16px;
  user-select: none;
  cursor: col-resize;
  outline: none;
  background:
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}

.compare-slider:focus-visible {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5);
}

.compare-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compare-layer img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.compare-original {
  overflow: hidden;
  z-index: 2;
  border-right: none;
}

.compare-result {
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}

/* 分割线 */
.compare-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: none;
}

.compare-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  pointer-events: auto;
  cursor: col-resize;
  transition: transform 0.15s ease;
}

.dragging .compare-handle {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

/* 浮标标签 */
.compare-label {
  position: absolute;
  top: 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 4px 12px;
  border-radius: 8px;
  z-index: 5;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.label-original {
  left: 16px;
}

.label-result {
  right: 16px;
}
</style>
