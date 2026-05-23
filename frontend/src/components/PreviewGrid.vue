<template>
  <section class="preview-section">
    <!-- 模式切换（仅在可对比时显示） -->
    <div v-if="!hideCompare" class="preview-toolbar">
      <div class="mode-tabs">
        <button
          class="mode-tab"
          :class="{ active: mode === 'split' }"
          @click="mode = 'split'"
          title="并排对比"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="0.5" y="0.5" width="5.5" height="13" rx="1" stroke="currentColor" stroke-width="1.2"/>
            <rect x="8" y="0.5" width="5.5" height="13" rx="1" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          <span>并排</span>
        </button>
        <button
          class="mode-tab"
          :class="{ active: mode === 'compare' }"
          @click="mode = 'compare'"
          title="滑动对比"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <polygon points="4,4 7,1 10,4" fill="currentColor"/>
            <polygon points="4,10 7,13 10,10" fill="currentColor"/>
          </svg>
          <span>对比</span>
        </button>
      </div>
      <div class="toolbar-right">
        <span v-if="modelUsed" class="model-chip">{{ modelUsed }}</span>
        <span v-if="resultSize" class="dimension-chip">{{ resultSize }}</span>
      </div>
    </div>

    <!-- 无对比：仅显示处理结果 -->
    <div v-if="hideCompare" class="preview-card">
      <div class="preview-label">处理结果</div>
      <div
        class="preview-box"
        :style="resultBoxStyle"
      >
        <div v-if="imgState.resultLoading" class="shimmer-box" />
        <!-- 缩放容器 -->
        <div
          :ref="singleZoom.initContainer"
          class="zoom-container"
          :style="{ cursor: singleZoom.containerCursor.value }"
          @wheel="singleZoom.onWheel"
          @pointerdown="singleZoom.onPointerDown"
          @pointermove="singleZoom.onPointerMove"
          @pointerup="singleZoom.onPointerUp"
          @pointerleave="singleZoom.onPointerLeave"
          @dblclick.prevent="singleZoom.onDoubleClick"
        >
          <img
            v-if="resultUrl"
            :src="resultUrl"
            alt="处理结果"
            @load="onLoad('result')"
            @error="onError('result')"
            :class="{ loaded: !imgState.resultLoading && !imgState.resultError }"
            :style="singleZoom.imgTransform.value"
          />
        </div>
        <ZoomControls :zoom="singleZoom" />
        <div v-if="imgState.resultError" class="broken-box">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
          <span class="broken-text">图片加载失败</span>
        </div>
        <ProgressOverlay
          :visible="processing.status === 'uploading' || processing.status === 'processing'"
          :progress="processing.progress"
          :message="processing.message"
          :detail="processing.detail"
        />
      </div>
    </div>

    <!-- 并排模式 -->
    <div v-else-if="mode === 'split'" class="preview-grid">
      <div class="preview-card">
        <div class="preview-label">原图</div>
        <div class="preview-box">
          <div v-if="imgState.originalLoading" class="shimmer-box" />
          <div
            :ref="originalZoom.initContainer"
            class="zoom-container"
            :style="{ cursor: originalZoom.containerCursor.value }"
            @wheel="originalZoom.onWheel"
            @pointerdown="originalZoom.onPointerDown"
            @pointermove="originalZoom.onPointerMove"
            @pointerup="originalZoom.onPointerUp"
            @pointerleave="originalZoom.onPointerLeave"
            @dblclick.prevent="originalZoom.onDoubleClick"
          >
            <img
              v-if="originalUrl"
              :src="originalUrl"
              alt="原图"
              @load="onLoad('original')"
              @error="onError('original')"
              :class="{ loaded: !imgState.originalLoading && !imgState.originalError }"
              :style="originalZoom.imgTransform.value"
            />
          </div>
          <ZoomControls :zoom="originalZoom" />
          <div v-if="imgState.originalError" class="broken-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            <span class="broken-text">图片加载失败</span>
          </div>
        </div>
      </div>

      <div class="preview-card">
        <div class="preview-label">处理结果</div>
        <div
          class="preview-box"
          :style="resultBoxStyle"
        >
          <div v-if="imgState.resultLoading" class="shimmer-box" />
          <div
            :ref="splitResultZoom.initContainer"
            class="zoom-container"
            :style="{ cursor: splitResultZoom.containerCursor.value }"
            @wheel="splitResultZoom.onWheel"
            @pointerdown="splitResultZoom.onPointerDown"
            @pointermove="splitResultZoom.onPointerMove"
            @pointerup="splitResultZoom.onPointerUp"
            @pointerleave="splitResultZoom.onPointerLeave"
            @dblclick.prevent="splitResultZoom.onDoubleClick"
          >
            <img
              v-if="resultUrl"
              :src="resultUrl"
              alt="处理结果"
              @load="onLoad('result')"
              @error="onError('result')"
              :class="{ loaded: !imgState.resultLoading && !imgState.resultError }"
              :style="splitResultZoom.imgTransform.value"
            />
          </div>
          <ZoomControls :zoom="splitResultZoom" />
          <div v-if="imgState.resultError" class="broken-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            <span class="broken-text">图片加载失败</span>
          </div>
          <ProgressOverlay
            :visible="processing.status === 'uploading' || processing.status === 'processing'"
            :progress="processing.progress"
            :message="processing.message"
            :detail="processing.detail"
          />
        </div>
      </div>
    </div>

    <!-- 对比滑块模式 -->
    <div v-else class="preview-card">
      <CompareSlider
        :original-url="originalUrl"
        :result-url="resultUrl"
        :bg-color="bgColor"
      />
      <ProgressOverlay
        :visible="processing.status === 'uploading' || processing.status === 'processing'"
        :progress="processing.progress"
        :message="processing.message"
        :detail="processing.detail"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { ProcessingState, BgColor, ImageDimensions } from '@/types';
import ProgressOverlay from './ProgressOverlay.vue';
import CompareSlider from './CompareSlider.vue';
import ZoomControls from './ZoomControls.vue';
import { useImageZoom } from '@/composables/useImageZoom';

const props = defineProps<{
  originalUrl: string;
  resultUrl: string;
  bgColor: BgColor;
  processing: ProcessingState;
  resultDimensions?: ImageDimensions | null;
  modelUsed?: string;
  /** 隐藏并排/对比切换（原图丢失时使用，仅显示处理结果） */
  hideCompare?: boolean;
}>();

const mode = ref<'split' | 'compare'>('split');

// ---- 图片缩放（三个独立实例，对应三种布局） ----
const singleZoom = useImageZoom();
const originalZoom = useImageZoom();
const splitResultZoom = useImageZoom();

// URL 变化时重置缩放
watch(() => props.resultUrl, () => {
  singleZoom.resetState();
  splitResultZoom.resetState();
});
watch(() => props.originalUrl, () => {
  originalZoom.resetState();
});

const resultSize = computed(() => {
  const dim = props.resultDimensions;
  if (!dim) return '';
  return `${dim.width}×${dim.height}`;
});

const resultBoxStyle = computed(() => {
  if (props.bgColor !== 'transparent') {
    return {
      backgroundImage: 'none',
      backgroundColor: props.bgColor,
    };
  }
  return {};
});

// ---- 图片加载状态 ----
interface ImgLoadingState {
  originalLoading: boolean;
  resultLoading: boolean;
  originalError: boolean;
  resultError: boolean;
}
const imgState = reactive<ImgLoadingState>({
  originalLoading: false,
  resultLoading: false,
  originalError: false,
  resultError: false,
});

// 监听 URL 变化重置状态（分别跟踪，避免改 result 时原图也闪） */
watch(
  () => props.originalUrl,
  (newUrl, oldUrl) => {
    if (newUrl !== oldUrl) {
      imgState.originalLoading = !!newUrl;
      imgState.originalError = false;
    }
  },
  { immediate: true }
);

watch(
  () => props.resultUrl,
  (newUrl, oldUrl) => {
    if (newUrl !== oldUrl) {
      imgState.resultLoading = !!newUrl;
      imgState.resultError = false;
    }
  },
  { immediate: true }
);

function onLoad(type: 'original' | 'result') {
  if (type === 'original') { imgState.originalLoading = false; imgState.originalError = false; }
  else { imgState.resultLoading = false; imgState.resultError = false; }
}
function onError(type: 'original' | 'result') {
  if (type === 'original') { imgState.originalLoading = false; imgState.originalError = true; }
  else { imgState.resultLoading = false; imgState.resultError = true; }
}
</script>

<style scoped>
.preview-section {
  /* margin removed — handled by parent grid layout */
}

/* ---- 工具栏 ---- */
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.mode-tabs {
  display: flex;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  color: #374151;
}

.mode-tab.active {
  background: #fff;
  color: #6366f1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dimension-chip {
  font-size: 12px;
  font-weight: 500;
  color: #059669;
  background: #ecfdf5;
  padding: 5px 10px;
  border-radius: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-chip {
  font-size: 12px;
  font-weight: 500;
  color: #7c3aed;
  background: #f5f3ff;
  padding: 5px 10px;
  border-radius: 8px;
}

/* ---- 并排模式 ---- */
.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 700px) {
  .preview-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .preview-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .preview-label {
    font-size: 12px;
    padding: 10px 14px;
  }

  .preview-card {
    border-radius: 14px;
  }
}

.preview-card {
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
  position: relative;
}

.preview-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  padding: 14px 20px;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-box {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background-color 0.35s ease;
  background-color: #fff;
  /* 透明底棋盘格 (与 CompareSlider 一致) */
  background-image:
    linear-gradient(45deg, #e8e8e8 25%, transparent 25%),
    linear-gradient(-45deg, #e8e8e8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e8e8e8 75%),
    linear-gradient(-45deg, transparent 75%, #e8e8e8 75%);
  background-size: 16px 16px;
  background-position:
    0 0, 0 8px, 8px -8px, -8px 0px;
}

/* ---- shimmer 流光骨架 ---- */
.shimmer-box {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 40%, #f3f4f6 80%);
  background-size: 200% 100%;
  animation: shimmer-slide 1.6s ease-in-out infinite;
  z-index: 2;
}

@keyframes shimmer-slide {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- 加载失败占位 ---- */
.broken-box {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #d1d5db;
  background: #f9fafb;
}

.broken-text {
  font-size: 13px;
  font-weight: 500;
  color: #9ca3af;
}

/* ---- 图片缩放 ---- */
.zoom-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
}

.zoom-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.4s ease;
  will-change: transform;
}

.zoom-container img.loaded {
  opacity: 1;
}
</style>
