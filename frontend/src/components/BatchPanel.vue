<template>
  <div class="batch-panel" v-if="batch.items.length > 0">
    <!-- ========== 入口阶段：文件列表 + 开始按钮 ========== -->
    <template v-if="batch.phase.value === 'entry'">
      <div class="batch-header">
        <div class="batch-title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <span class="batch-title">批量处理</span>
          <span class="file-count">{{ batch.items.length }} 个文件</span>
        </div>
        <div class="batch-actions">
          <button class="btn-clear" @click="batch.clearItems()" :disabled="batch.isProcessing.value">
            全部移除
          </button>
          <button class="btn-start" @click="batch.startProcessing()" :disabled="batch.items.length === 0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            开始批量处理
          </button>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="file-list">
        <div
          v-for="item in batch.items"
          :key="item.id"
          class="file-row"
        >
          <img :src="item.originalUrl" class="file-thumb" alt="" />
          <div class="file-info">
            <span class="file-name">{{ item.file.name }}</span>
            <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
          </div>
          <button
            class="btn-remove-file"
            @click="batch.removeItem(item.id)"
            title="移除此文件"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </template>

    <!-- ========== 处理阶段：进度面板 ========== -->
    <template v-if="batch.phase.value === 'processing'">
      <div class="batch-header">
        <div class="batch-title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span class="batch-title">处理中</span>
          <span class="file-count">{{ batch.doneCount.value }} / {{ batch.totalCount.value }}</span>
        </div>
        <div class="batch-actions">
          <button class="btn-cancel" @click="batch.cancelProcessing()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
            取消
          </button>
        </div>
      </div>

      <!-- 整体进度条 -->
      <div class="overall-progress-bar">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: batch.overallProgress.value + '%' }"></div>
        </div>
      </div>

      <!-- 每个文件的处理状态 -->
      <div class="file-list">
        <div
          v-for="(item, idx) in batch.items"
          :key="item.id"
          class="file-row"
          :class="{
            'row-active': idx === batch.currentIndex.value,
            'row-done': item.status === 'done',
            'row-error': item.status === 'error',
            'row-queued': item.status === 'queued',
          }"
        >
          <div class="file-thumb-box">
            <img :src="item.originalUrl" class="file-thumb" alt="" />
            <!-- 状态图标 -->
            <div v-if="item.status === 'done'" class="status-badge done">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div v-else-if="item.status === 'error'" class="status-badge error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div v-else-if="item.status === 'uploading' || item.status === 'processing'" class="status-badge spinning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <div class="file-info">
            <span class="file-name">{{ item.file.name }}</span>
            <span class="file-status" :class="item.status">{{ item.message }}</span>
            <!-- 正在处理中的进度条 -->
            <div
              v-if="item.status === 'uploading' || item.status === 'processing'"
              class="item-progress"
            >
              <div class="item-progress-track">
                <div class="item-progress-fill" :style="{ width: item.progress + '%' }"></div>
              </div>
            </div>
            <!-- 错误详情 -->
            <span v-if="item.status === 'error' && item.error" class="item-error">{{ item.error }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== 结果阶段：网格展示 + 下载 ========== -->
    <template v-if="batch.phase.value === 'done'">
      <div class="batch-header">
        <div class="batch-title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span class="batch-title">处理完成</span>
          <span class="file-count">
            {{ batch.doneCount.value }} 成功
            <template v-if="batch.errorCount.value > 0">
              · {{ batch.errorCount.value }} 失败
            </template>
          </span>
        </div>
        <div class="batch-actions">
          <button class="btn-download-all" @click="batch.downloadAll()" v-if="batch.doneCount.value > 0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            全部下载 ({{ batch.doneCount.value }})
          </button>
          <button class="btn-back" @click="$emit('reset')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            上传图片
          </button>
        </div>
      </div>

      <!-- 结果网格 -->
      <div class="result-grid">
        <div
          v-for="item in batch.items"
          :key="item.id"
          class="result-card"
          :class="{ 'has-error': item.status === 'error' }"
          @click="item.status === 'done' && onViewDetail(item.id)"
        >
          <!-- 成功结果 -->
          <template v-if="item.status === 'done' && item.resultBlob">
            <div class="result-preview">
              <img
                :src="getResultUrl(item)"
                class="result-img"
                alt=""
                @error="onImgError(item)"
              />
              <div class="result-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span>查看详情</span>
              </div>
            </div>
            <div class="result-info">
              <span class="result-name">{{ item.file.name }}</span>
              <span class="result-size">{{ formatFileSize(item.resultBlob.size) }}</span>
            </div>
            <button class="btn-download-single" @click.stop="onDownloadSingle(item)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              下载
            </button>
          </template>

          <!-- 失败结果 -->
          <template v-else-if="item.status === 'error'">
            <div class="result-preview error-preview">
              <img :src="item.originalUrl" class="result-img" alt="" />
              <div class="error-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10" opacity="0.3"/>
                  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
            </div>
            <div class="result-info">
              <span class="result-name">{{ item.file.name }}</span>
              <span class="result-error">{{ item.error || '处理失败' }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { BatchItem } from '@/types';
import { formatFileSize } from '@/utils/imageUtils';

const props = defineProps<{
  batch: ReturnType<typeof import('@/composables/useBatchProcessor').useBatchProcessor>;
}>();

const emit = defineEmits<{
  (e: 'view-detail', itemId: string): void;
  (e: 'toast', payload: { message: string; type: 'success' | 'error' }): void;
  (e: 'reset'): void;
}>();

// 结果图 URL 缓存
const resultUrls = ref<Map<string, string>>(new Map());

function getResultUrl(item: BatchItem): string {
  if (!item.resultBlob) return '';
  const existing = resultUrls.value.get(item.id);
  if (existing) return existing;
  const url = URL.createObjectURL(item.resultBlob);
  resultUrls.value.set(item.id, url);
  return url;
}

function onImgError(item: BatchItem): void {
  // 图片加载失败时使用原图
  resultUrls.value.set(item.id, item.originalUrl);
}

function onViewDetail(id: string): void {
  emit('view-detail', id);
}

function onDownloadSingle(item: BatchItem): void {
  if (!item.resultBlob) return;
  const url = URL.createObjectURL(item.resultBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.resultFilename || `removed_${item.file.name}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  emit('toast', { message: `已下载: ${item.file.name}`, type: 'success' });
}
</script>

<style scoped>
.batch-panel {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 24px;
}

/* ---- 头部 ---- */
.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 16px 24px;
  border-bottom: 1px solid #f3f4f6;
  gap: 12px;
}

.batch-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  min-width: 0;
}

.batch-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.file-count {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 3px 10px;
  border-radius: 20px;
}

.batch-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-start {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border: none;
  border-radius: 12px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}
.btn-start:hover { background: #4f46e5; }
.btn-start:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-clear, .btn-cancel {
  padding: 10px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear:hover, .btn-cancel:hover { background: #f9fafb; border-color: #d1d5db; }

.btn-download-all {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border: none;
  border-radius: 12px;
  background: #10b981;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
}
.btn-download-all:hover { background: #059669; }

.btn-back {
  padding: 10px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-back:hover { background: #f9fafb; }

/* ---- 文件列表 ---- */
.file-list {
  padding: 12px 24px;
  max-height: 420px;
  overflow-y: auto;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.15s;
}
.file-row.row-active { background: #eef2ff; }
.file-row.row-done { background: #f0fdf4; }
.file-row.row-error { background: #fef2f2; }
.file-row:hover { background: #f9fafb; }

.file-thumb-box {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.file-thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
}

.status-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}
.status-badge.done { background: #10b981; color: #fff; }
.status-badge.error { background: #ef4444; color: #fff; }
.status-badge.spinning {
  background: #6366f1; color: #fff;
  animation: spin 1s linear infinite;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #9ca3af;
}

.file-status {
  font-size: 12px;
}
.file-status.queued { color: #9ca3af; }
.file-status.uploading { color: #6366f1; }
.file-status.processing { color: #6366f1; }
.file-status.done { color: #10b981; }
.file-status.error { color: #ef4444; }

/* ---- 处理中的小进度条 ---- */
.item-progress {
  margin-top: 6px;
  width: 100%;
  max-width: 200px;
}
.item-progress-track {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}
.item-progress-fill {
  height: 100%;
  background: #6366f1;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.item-error {
  font-size: 11px;
  color: #ef4444;
  margin-top: 2px;
}

.btn-remove-file {
  padding: 6px;
  border: none;
  background: none;
  color: #d1d5db;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.btn-remove-file:hover { color: #ef4444; background: #fef2f2; }

/* ---- 整体进度条 ---- */
.overall-progress-bar {
  padding: 0 24px 12px;
}
.progress-track {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* ---- 结果网格 ---- */
.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 24px 24px;
}

@media (max-width: 700px) {
  .result-grid { grid-template-columns: repeat(2, 1fr); }
  .batch-header { padding: 12px 16px; }
  .file-list { padding: 8px 16px; }
  .result-grid { padding: 12px 16px 16px; gap: 8px; }
  .overall-progress-bar { padding: 0 16px 8px; }
  .btn-download-all { padding: 8px 16px; font-size: 13px; }
}

@media (max-width: 480px) {
  .batch-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px 12px;
  }

  .batch-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .btn-start, .btn-clear, .btn-cancel, .btn-back {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    font-size: 12px;
    text-align: center;
    justify-content: center;
  }

  .btn-download-all {
    width: 100%;
    justify-content: center;
  }

  .file-list {
    padding: 8px 12px;
    max-height: 280px;
  }

  .file-row {
    padding: 8px;
    gap: 8px;
  }

  .file-thumb-box, .file-thumb {
    width: 36px;
    height: 36px;
  }

  .result-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 10px 12px 12px;
    gap: 6px;
  }

  .result-card {
    border-radius: 10px;
  }

  .btn-download-single {
    margin: 6px 10px 10px;
    padding: 6px;
    font-size: 11px;
  }
}

.result-card {
  display: flex;
  flex-direction: column;
  border: 1px solid #f3f4f6;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.result-card:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.result-card.has-error { cursor: default; opacity: 0.6; }

.result-preview {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background:
    linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}

.result-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.2s;
}
.result-card:hover .result-overlay { opacity: 1; }

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.result-info {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-name {
  font-size: 12px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-size {
  font-size: 11px;
  color: #9ca3af;
}

.result-error {
  font-size: 11px;
  color: #ef4444;
}

.btn-download-single {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 8px 12px 12px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-download-single:hover { background: #eef2ff; color: #6366f1; border-color: #c7d2fe; }

/* ---- 旋转动画 ---- */
.spin-icon { animation: spin 1.5s linear infinite; }
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
