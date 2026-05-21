<template>
  <div v-if="entries.length > 0" class="history-section">
    <div class="history-header">
      <div class="history-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>处理历史</span>
        <span class="history-count">{{ entries.length }}</span>
      </div>
      <button class="clear-btn" @click="$emit('clear')">清空</button>
    </div>

    <div class="history-scroll">
      <button
        v-for="entry in entries"
        :key="entry.id"
        class="history-card"
        :class="{ active: activeId === entry.id }"
        @click="$emit('restore', entry)"
      >
        <div class="card-thumbs">
          <div class="thumb-box original">
            <img :src="entry.originalThumb" alt="原图" />
          </div>
          <span class="thumb-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
          <div class="thumb-box result">
            <img :src="entry.resultThumb" alt="结果" />
          </div>
        </div>
        <div class="card-meta">
          <span class="card-name" :title="entry.filename">{{ entry.filename }}</span>
          <span class="card-dims">{{ entry.dimensions.width }}×{{ entry.dimensions.height }}</span>
        </div>
        <button class="card-delete" title="删除此记录" @click.stop="$emit('remove', entry.id)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HistoryEntry } from '@/types';

defineProps<{
  entries: readonly HistoryEntry[];
  activeId?: string;
}>();

defineEmits<{
  (e: 'restore', entry: HistoryEntry): void;
  (e: 'remove', id: string): void;
  (e: 'clear'): void;
}>();
</script>

<style scoped>
.history-section {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
  padding: 18px 20px;
  margin-top: 28px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.history-title svg {
  color: #9ca3af;
}

.history-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 10px;
}

.clear-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.clear-btn:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* ---- 横向滚动 ---- */
.history-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.history-scroll::-webkit-scrollbar {
  height: 5px;
}

.history-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

.history-scroll::-webkit-scrollbar-track {
  background: transparent;
}

/* ---- 卡片 ---- */
.history-card {
  position: relative;
  flex-shrink: 0;
  width: 150px;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 14px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.history-card:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
  transform: translateY(-1px);
}

.history-card.active {
  border-color: #6366f1;
  background: #eef2ff;
}

.card-thumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.thumb-box {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  background: #e5e7eb;
  flex-shrink: 0;
}

.thumb-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-box.original {
  border: 1px solid #e5e7eb;
}

.thumb-box.result {
  border: 1px dashed #10b981;
}

.thumb-arrow {
  flex-shrink: 0;
  color: #9ca3af;
  margin: 0 -2px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-dims {
  font-size: 11px;
  color: #9ca3af;
}

.card-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
}

.history-card:hover .card-delete {
  opacity: 1;
}

.card-delete:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* ---- 响应式 ---- */
@media (max-width: 480px) {
  .history-section {
    padding: 14px 16px;
  }

  .history-header {
    padding: 0 0 10px;
  }

  .history-title {
    font-size: 13px;
  }

  .history-card {
    width: 130px;
    padding: 8px;
    border-radius: 10px;
  }

  .thumb-box {
    width: 42px;
    height: 42px;
    border-radius: 6px;
  }

  .card-name {
    font-size: 11px;
  }

  .card-dims {
    font-size: 10px;
  }

  .card-delete {
    opacity: 1;
    width: 18px;
    height: 18px;
    top: 2px;
    right: 2px;
    border-radius: 4px;
  }
}
</style>
