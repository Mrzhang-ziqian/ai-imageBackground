<template>
  <div class="edge-panel">
    <!-- 面板头部 -->
    <div class="panel-header" @click="expanded = !expanded">
      <div class="header-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span class="header-title">边缘优化</span>
      </div>
      <div class="header-right">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          :class="{ rotated: expanded }"
          class="chevron"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>

    <!-- 面板内容 -->
    <Transition name="collapse">
      <div v-if="expanded" class="panel-body">
        <!-- Tab 切换 -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <span class="tab-icon" v-html="tab.icon"></span>
            {{ tab.label }}
          </button>
        </div>

        <!-- ======== 羽化面板 ======== -->
        <div v-if="activeTab === 'feather'" class="tool-section">
          <p class="tool-desc">柔化抠图边缘，使主体与背景过渡更自然</p>
          <div class="slider-row">
            <label class="slider-label">羽化半径</label>
            <span class="slider-value">{{ featherRadius }}px</span>
          </div>
          <input
            v-model.number="featherRadius"
            type="range"
            min="0"
            max="20"
            step="0.5"
            class="slider"
          />
          <div class="slider-ticks">
            <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span>
          </div>
          <div class="btn-row">
            <button
              class="btn-apply"
              :disabled="featherRadius === 0 || isProcessing"
              @click="handleApplyFeather"
            >
              <svg v-if="isProcessing" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              {{ isProcessing ? '处理中...' : '应用羽化' }}
            </button>
            <button
              v-if="hasEdgeEdit"
              class="btn-undo"
              @click="$emit('resetEdge')"
            >
              撤销修改
            </button>
          </div>
        </div>

        <!-- ======== 平滑面板 ======== -->
        <div v-if="activeTab === 'smooth'" class="tool-section">
          <p class="tool-desc">填补边缘小空洞，平滑锯齿状边缘</p>
          <div class="slider-row">
            <label class="slider-label">平滑强度</label>
            <span class="slider-value">{{ smoothStrength }}</span>
          </div>
          <input
            v-model.number="smoothStrength"
            type="range"
            min="1"
            max="10"
            step="1"
            class="slider"
          />
          <div class="slider-ticks">
            <span>1</span><span>3</span><span>5</span><span>7</span><span>10</span>
          </div>
          <div class="btn-row">
            <button
              class="btn-apply"
              :disabled="isProcessing"
              @click="handleApplySmooth"
            >
              <svg v-if="isProcessing" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              {{ isProcessing ? '处理中...' : '应用平滑' }}
            </button>
            <button
              v-if="hasEdgeEdit"
              class="btn-undo"
              @click="$emit('resetEdge')"
            >
              撤销修改
            </button>
          </div>
        </div>

        <!-- ======== 手动画笔修复 ======== -->
        <div v-if="activeTab === 'brush'" class="tool-section">
          <p class="tool-desc">手动擦除多余区域或恢复被误删的部分</p>

          <!-- 模式切换 -->
          <div class="brush-modes">
            <button
              class="mode-btn"
              :class="{ active: brushMode === 'erase' }"
              @click="brushMode = 'erase'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              擦除
            </button>
            <button
              class="mode-btn"
              :class="{ active: brushMode === 'restore' }"
              @click="brushMode = 'restore'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              <span v-if="props.originalUrl">从原图恢复</span>
              <span v-else>恢复</span>
            </button>
          </div>

          <!-- 原图参考叠加层开关（仅当有原图时显示） -->
          <label v-if="props.originalUrl" class="overlay-toggle">
            <input type="checkbox" v-model="showOriginalOverlay" />
            <span class="toggle-label">显示原图参考</span>
          </label>

          <!-- 笔刷大小 -->
          <div class="slider-row">
            <label class="slider-label">笔刷大小</label>
            <span class="slider-value">{{ brushSize }}px</span>
          </div>
          <input
            v-model.number="brushSize"
            type="range"
            min="2"
            max="80"
            step="1"
            class="slider"
          />

          <!-- 画笔 Canvas -->
          <div
            class="brush-canvas-wrap"
            :style="{ maxWidth: canvasDisplayWidth + 'px' }"
          >
            <canvas
              ref="brushCanvasRef"
              class="brush-canvas"
              :class="{ 'cursor-erase': brushMode === 'erase', 'cursor-restore': brushMode === 'restore', 'is-drawing': isDrawing }"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointerleave="onPointerUp"
              @pointercancel="onPointerUp"
            />
            <!-- 原图参考叠加层 -->
            <img
              v-if="showOriginalOverlay && props.originalUrl"
              :src="props.originalUrl"
              class="original-overlay"
              alt="原图参考"
            />
            <!-- 画笔预览圆圈 -->
            <div
              v-if="canvasReady && !isDrawing"
              class="brush-cursor-preview"
              :style="cursorPreviewStyle"
            >
              <div class="cursor-dot" :class="brushMode"></div>
            </div>
          </div>

          <!-- 笔刷操作按钮 -->
          <div class="btn-row brush-actions">
            <button
              class="btn-apply btn-sm"
              :disabled="!brushEditor || brushEditor.undoCount === 0"
              @click="handleBrushUndo"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              撤销 ({{ brushEditor?.undoCount ?? 0 }})
            </button>
            <button
              class="btn-apply btn-sm btn-reset-brush"
              @click="handleBrushReset"
            >
              重置
            </button>
            <button
              class="btn-apply"
              :disabled="!brushEditor || isProcessing"
              @click="handleApplyBrush"
            >
              <svg v-if="isProcessing" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              应用修改
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, nextTick, computed, onBeforeUnmount } from 'vue';
import { useEdgeTools, createBrushEditor } from '../composables/useEdgeTools';
import type { BrushEditor, BrushMode } from '../composables/useEdgeTools';

const props = defineProps<{
  transparentBlob: Blob | null;
  /** 原始图片 URL，用于"从原图恢复"画笔模式 */
  originalUrl?: string;
}>();

const emit = defineEmits<{
  (e: 'update:resultBlob', blob: Blob): void;
  (e: 'resetEdge'): void;
  (e: 'toast', payload: { message: string; type: 'success' | 'error' }): void;
}>();

const { featherAlpha, smoothAlpha } = useEdgeTools();

// ---- UI 状态 ----
const expanded = ref(false);
const activeTab = ref<'feather' | 'smooth' | 'brush'>('feather');
const isProcessing = ref(false);
const hasEdgeEdit = ref(false);

// ---- 羽化参数 ----
const featherRadius = ref(3);

// ---- 平滑参数 ----
const smoothStrength = ref(3);

// ---- 笔刷参数 ----
const brushMode = ref<BrushMode>('erase');
const brushSize = ref(20);
const brushCanvasRef = shallowRef<HTMLCanvasElement | null>(null);
const brushEditor = shallowRef<BrushEditor | null>(null);
const canvasReady = ref(false);
const isDrawing = ref(false);
const cursorPos = ref({ x: -100, y: -100 });
const showOriginalOverlay = ref(false);

// Tab 配置
const tabs = [
  {
    key: 'feather' as const,
    label: '羽化',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/></svg>',
  },
  {
    key: 'smooth' as const,
    label: '平滑',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17c3.33-3.33 7.67-5 13-5"/><path d="M3 12c3.33-2 7.67-3 13-3"/><path d="M3 7c3.33-.67 7.67-1 13-1"/></svg>',
  },
  {
    key: 'brush' as const,
    label: '手动修复',
    icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  },
];

// Canvas 显示宽度（限制最大 600px）
const canvasDisplayWidth = computed(() => {
  const canvas = brushCanvasRef.value;
  if (!canvas || !canvas.width) return 600;
  return Math.min(canvas.width, 600);
});

const cursorPreviewStyle = computed(() => {
  const size = brushSize.value;
  const canvas = brushCanvasRef.value;
  if (!canvas) return { display: 'none' };

  // 计算 Canvas 缩放比
  const displayW = canvasDisplayWidth.value;
  const scale = displayW / canvas.width;
  const displaySize = size * scale;

  return {
    width: displaySize + 'px',
    height: displaySize + 'px',
    left: cursorPos.value.x - displaySize / 2 + 'px',
    top: cursorPos.value.y - displaySize / 2 + 'px',
  };
});

// ---- Tab 切换时初始化/销毁笔刷 ----
watch(activeTab, async (tab) => {
  if (tab === 'brush') {
    await initBrush();
  } else {
    destroyBrush();
  }
});

// 监听透明 Blob 变化时重新初始化笔刷
watch(() => props.transparentBlob, async (blob) => {
  if (blob && activeTab.value === 'brush' && expanded.value) {
    await initBrush();
  }
});

// ---- 羽化 ----
async function handleApplyFeather(): Promise<void> {
  if (!props.transparentBlob || isProcessing.value || featherRadius.value <= 0) return;
  isProcessing.value = true;
  try {
    const result = await featherAlpha(props.transparentBlob, featherRadius.value);
    emit('update:resultBlob', result);
    hasEdgeEdit.value = true;
    emit('toast', { message: '羽化已应用', type: 'success' });
  } catch (err) {
    emit('toast', { message: '羽化处理失败', type: 'error' });
  } finally {
    isProcessing.value = false;
  }
}

// ---- 平滑 ----
async function handleApplySmooth(): Promise<void> {
  if (!props.transparentBlob || isProcessing.value) return;
  isProcessing.value = true;
  try {
    const result = await smoothAlpha(props.transparentBlob, smoothStrength.value);
    emit('update:resultBlob', result);
    hasEdgeEdit.value = true;
    emit('toast', { message: '平滑已应用', type: 'success' });
  } catch (err) {
    emit('toast', { message: '平滑处理失败', type: 'error' });
  } finally {
    isProcessing.value = false;
  }
}

// ---- 手动画笔 ----
async function initBrush(): Promise<void> {
  destroyBrush();

  await nextTick();
  const canvas = brushCanvasRef.value;
  if (!canvas || !props.transparentBlob) return;

  try {
    const editor = await createBrushEditor({
      blob: props.transparentBlob,
      canvas,
      originalUrl: props.originalUrl,
    });
    brushEditor.value = editor;
    canvasReady.value = true;
  } catch {
    emit('toast', { message: '画布初始化失败', type: 'error' });
  }
}

function destroyBrush(): void {
  brushEditor.value?.destroy();
  brushEditor.value = null;
  canvasReady.value = false;
}

function getCanvasCoords(e: PointerEvent): { x: number; y: number } {
  const canvas = brushCanvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function onPointerDown(e: PointerEvent): void {
  if (!brushEditor.value) return;
  e.preventDefault();
  const canvas = brushCanvasRef.value!;
  canvas.setPointerCapture(e.pointerId);
  isDrawing.value = true;
  brushEditor.value.beginStroke();
  const { x, y } = getCanvasCoords(e);
  brushEditor.value.drawBrush(x, y, brushSize.value, brushMode.value);
}

function onPointerMove(e: PointerEvent): void {
  const canvas = brushCanvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  cursorPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };

  if (!isDrawing.value || !brushEditor.value) return;
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);
  brushEditor.value.drawBrush(x, y, brushSize.value, brushMode.value);
}

function onPointerUp(e: PointerEvent): void {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  try {
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
  } catch { /* noop */ }
}

function handleBrushUndo(): void {
  brushEditor.value?.undo();
}

function handleBrushReset(): void {
  brushEditor.value?.reset();
}

async function handleApplyBrush(): Promise<void> {
  if (!brushEditor.value || isProcessing.value) return;
  isProcessing.value = true;
  try {
    const blob = await brushEditor.value.getBlob();
    emit('update:resultBlob', blob);
    hasEdgeEdit.value = true;
    emit('toast', { message: '手动修复已应用', type: 'success' });
    // 编辑后重新初始化笔刷（因为 transparentBlob 会更新触发 watch）
  } catch {
    emit('toast', { message: '笔刷导出失败', type: 'error' });
  } finally {
    isProcessing.value = false;
  }
}

// 清理
onBeforeUnmount(() => {
  destroyBrush();
});
</script>

<style scoped>
/* ---- 面板容器 ---- */
.edge-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
}

/* ---- 头部 ---- */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.panel-header:hover {
  background: #f9fafb;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
}
.header-title {
  font-size: 14px;
  font-weight: 600;
}
.header-right {
  color: #9ca3af;
}
.chevron {
  transition: transform 0.25s ease;
}
.chevron.rotated {
  transform: rotate(180deg);
}

/* ---- 面板内容过渡 ---- */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 800px;
}

.panel-body {
  padding: 0 18px 18px;
}

/* ---- Tab 切换 ---- */
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 10px;
  margin-bottom: 16px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #374151;
}
.tab-btn.active {
  background: #fff;
  color: #6366f1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.tab-icon {
  display: flex;
  align-items: center;
}

/* ---- 工具区域 ---- */
.tool-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tool-desc {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
}

/* ---- 滑块 ---- */
.slider-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.slider-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}
.slider-value {
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 10px;
  border-radius: 6px;
}
.slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #6366f1;
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  cursor: pointer;
}
.slider-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #d1d5db;
  padding: 0 2px;
  margin-top: -8px;
}

/* ---- 按钮行 ---- */
.btn-row {
  display: flex;
  gap: 8px;
}
.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border: none;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-apply:hover:not(:disabled) {
  background: #4f46e5;
}
.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-apply.btn-sm {
  padding: 7px 14px;
  font-size: 12px;
}
.btn-apply.btn-reset-brush {
  background: #f3f4f6;
  color: #6b7280;
}
.btn-apply.btn-reset-brush:hover {
  background: #e5e7eb;
}
.btn-undo {
  padding: 9px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-undo:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* ---- 笔刷模式 ---- */
.brush-modes {
  display: flex;
  gap: 8px;
}
.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn:hover {
  border-color: #c4b5fd;
  color: #6366f1;
}
.mode-btn.active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #6366f1;
}

/* ---- 画笔 Canvas ---- */
.brush-canvas-wrap {
  position: relative;
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #f9fafb;
}
.brush-canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
}
.brush-canvas.cursor-erase {
  cursor: none;
}
.brush-canvas.cursor-restore {
  cursor: none;
}
.brush-cursor-preview {
  position: absolute;
  pointer-events: none;
  border: 2px dashed;
  border-radius: 50%;
  transition: none;
}
.cursor-dot.erase {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.cursor-dot.restore {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}
.brush-cursor-preview .erase,
.brush-cursor-preview .restore {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.brush-actions {
  flex-wrap: wrap;
}

/* ---- 原图参考叠加层 ---- */
.overlay-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
  user-select: none;
}
.overlay-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #6366f1;
  cursor: pointer;
  margin: 0;
}
.toggle-label {
  font-size: 12px;
}

.original-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.35;
  pointer-events: none;
  z-index: 2;
  mix-blend-mode: normal;
}

/* ---- 旋转动画 ---- */
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
