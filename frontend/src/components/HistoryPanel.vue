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
        :class="{
          active: activeId === entry.id,
          blocked: entry.status === 'blocked',
        }"
        @click="entry.status === 'blocked' ? $emit('retry-blocked', entry) : $emit('restore', entry)"
      >
        <div class="card-thumbs">
          <!-- 原图缩略图 -->
          <div class="thumb-box original">
            <div v-if="thumbState(entry.id)?.originalLoading !== false" class="thumb-shimmer" />
            <img
              v-if="entry.originalThumb"
              :src="entry.originalThumb"
              alt="原图"
              @load="onThumbLoad(entry.id, 'original')"
              @error="onThumbError(entry.id, 'original')"
              :class="{ loaded: !thumbState(entry.id)?.originalLoading }"
            />
            <div v-if="thumbState(entry.id)?.originalError" class="thumb-broken">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </div>
          </div>

          <!-- 箭头 -->
          <span class="thumb-arrow" :class="{ dimmed: entry.status === 'blocked' }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>

          <!-- 结果缩略图 -->
          <div class="thumb-box result">
            <template v-if="entry.status === 'blocked'">
              <!-- blocked: 显示锁图标 + 重试提示 -->
              <div class="thumb-blocked">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span class="thumb-blocked-label">点击重试</span>
              </div>
            </template>
            <template v-else>
              <div v-if="thumbState(entry.id)?.resultLoading !== false" class="thumb-shimmer" />
              <img
                v-if="entry.resultThumb"
                :src="entry.resultThumb"
                alt="结果"
                @load="onThumbLoad(entry.id, 'result')"
                @error="onThumbError(entry.id, 'result')"
                :class="{ loaded: !thumbState(entry.id)?.resultLoading }"
              />
              <div v-if="thumbState(entry.id)?.resultError" class="thumb-broken">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
              </div>
            </template>
          </div>
        </div>

        <!-- 文件名 & 尺寸 -->
        <div class="card-meta">
          <span class="card-name" :title="entry.filename">{{ entry.filename }}</span>
          <span class="card-dims">
            <template v-if="entry.status === 'blocked'">
              <span class="blocked-badge">今日已满·可重试</span>
            </template>
            <template v-else>
              {{ entry.width }}×{{ entry.height }}
            </template>
          </span>
        </div>

        <!-- 删除按钮 -->
        <button
          class="card-delete"
          title="删除此记录"
          @click.stop="$emit('remove', entry.id)"
        >
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
import { reactive, watch, onUnmounted } from 'vue';
import type { HistoryEntry } from '@/types';

const props = defineProps<{
  entries: readonly HistoryEntry[];
  activeId?: number | null;
}>();

defineEmits<{
  (e: 'restore', entry: HistoryEntry): void;
  (e: 'remove', id: number): void;
  (e: 'clear'): void;
  (e: 'retry-blocked', entry: HistoryEntry): void;
}>();

// ---- 图片加载状态追踪 ----
interface ThumbLoadingState {
  originalLoading: boolean;
  resultLoading: boolean;
  originalError: boolean;
  resultError: boolean;
}

const thumbStates = reactive<Record<number, ThumbLoadingState>>({});

/** 监听 entries 变化，清理已删除条目的 thumbState */
watch(
  () => props.entries.map((e) => e.id),
  (currentIds) => {
    const idSet = new Set(currentIds);
    for (const key of Object.keys(thumbStates)) {
      if (!idSet.has(Number(key))) {
        delete thumbStates[Number(key)];
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  for (const key of Object.keys(thumbStates)) {
    delete thumbStates[Number(key)];
  }
});

function thumbState(id: number): ThumbLoadingState | undefined {
  return thumbStates[id];
}

function ensureState(id: number): ThumbLoadingState {
  if (!thumbStates[id]) {
    // K18: blocked 条目设 resultLoading: false，避免 shimmer 永不停止
    const entry = props.entries.find(e => e.id === id);
    const isBlocked = entry?.status === 'blocked';
    thumbStates[id] = {
      originalLoading: true,
      resultLoading: isBlocked ? false : true,
      originalError: false,
      resultError: false,
    };
  }
  return thumbStates[id];
}

function onThumbLoad(id: number, type: 'original' | 'result') {
  _updateThumbState(id, type, { loading: false, error: false });
}

function onThumbError(id: number, type: 'original' | 'result') {
  _updateThumbState(id, type, { loading: false, error: true });
}

/** K37: 提取重复的 thumb 状态更新逻辑 */
function _updateThumbState(id: number, type: 'original' | 'result', patch: { loading: boolean; error: boolean }) {
  const s = ensureState(id);
  if (type === 'original') {
    s.originalLoading = patch.loading;
    s.originalError = patch.error;
  } else {
    s.resultLoading = patch.loading;
    s.resultError = patch.error;
  }
}
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

/* ---- blocked 状态 ---- */
.history-card.blocked {
  cursor: not-allowed;
  opacity: 0.65;
  background: #f9fafb;
}

.history-card.blocked:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
  transform: none;
}

.blocked-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #dc2626;
  background: #fef2f2;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.2px;
}

/* 锁图标容器 */
.thumb-blocked {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #d1d5db;
  background: #f3f4f6;
}

.thumb-blocked-label {
  font-size: 8px;
  font-weight: 600;
  color: #9ca3af;
  line-height: 1;
}

.dimmed {
  opacity: 0.3;
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
  position: relative;
}

.thumb-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.thumb-box img.loaded {
  opacity: 1;
}

/* ---- 流光加载动画 (shimmer) ---- */
.thumb-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #e5e7eb 0%,
    #f3f4f6 40%,
    #e5e7eb 80%
  );
  background-size: 200% 100%;
  animation: shimmer-slide 1.6s ease-in-out infinite;
  z-index: 1;
}

@keyframes shimmer-slide {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- 加载失败图标 ---- */
.thumb-broken {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
  background: #f3f4f6;
}

.thumb-box.original {
  border: 1px solid #e5e7eb;
}

.thumb-box.result {
  border: 1px dashed #10b981;
}

.history-card.blocked .thumb-box.result {
  border: 1px dashed #e5e7eb;
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

.history-card.blocked:hover .card-delete {
  opacity: 0.4;
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
