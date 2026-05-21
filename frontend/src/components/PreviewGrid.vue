<template>
  <section class="preview-section">
    <!-- 模式切换 -->
    <div class="preview-toolbar">
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

    <!-- 并排模式 -->
    <div v-if="mode === 'split'" class="preview-grid">
      <div class="preview-card">
        <div class="preview-label">原图</div>
        <div class="preview-box">
          <img v-if="originalUrl" :src="originalUrl" alt="原图" />
        </div>
      </div>

      <div class="preview-card">
        <div class="preview-label">处理结果</div>
        <div
          class="preview-box"
          :style="resultBoxStyle"
        >
          <img v-if="resultUrl" :src="resultUrl" alt="处理结果" />
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
import { ref, computed } from 'vue';
import type { ProcessingState, BgColor, ImageDimensions } from '@/types';
import ProgressOverlay from './ProgressOverlay.vue';
import CompareSlider from './CompareSlider.vue';

const props = defineProps<{
  originalUrl: string;
  resultUrl: string;
  bgColor: BgColor;
  processing: ProcessingState;
  resultDimensions?: ImageDimensions | null;
  modelUsed?: string;
}>();

const mode = ref<'split' | 'compare'>('split');

const resultSize = computed(() => {
  const dim = props.resultDimensions;
  if (!dim) return '';
  return `${dim.width}×${dim.height}`;
});

const resultBoxStyle = computed(() => {
  if (props.bgColor !== 'transparent') {
    return {
      backgroundImage: 'none',
      backgroundColor: '#f0f0f0',
    };
  }
  return {};
});
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
}

.preview-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
