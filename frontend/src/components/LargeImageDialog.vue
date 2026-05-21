<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
        <div class="dialog-card">
          <!-- 图标 -->
          <div class="dialog-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#F59E0B" stroke-width="2" fill="#FFFBEB"/>
              <path d="M20 12v10M20 25v2" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>

          <!-- 标题 -->
          <h3 class="dialog-title">{{ isFileSizeWarning ? '文件较大' : '图片较大' }}</h3>

          <!-- 文件大小警告（仅文件过大但尺寸 OK 时显示） -->
          <div v-if="isFileSizeWarning" class="dialog-badge">
            <span class="badge-file">{{ fileSizeText }}</span>
          </div>

          <!-- 尺寸信息（尺寸超限时显示） -->
          <div v-if="!isFileSizeWarning" class="dialog-dims">
            <div class="dim-item">
              <span class="dim-label">当前尺寸</span>
              <span class="dim-value dim-warn">
                {{ width }} × {{ height }} px
              </span>
            </div>
            <div class="dim-arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
            <div class="dim-item">
              <span class="dim-label">建议尺寸</span>
              <span class="dim-value dim-ok">
                {{ recommendedW }} × {{ recommendedH }} px
              </span>
            </div>
          </div>

          <!-- 说明文字 -->
          <p class="dialog-desc">
            {{ isFileSizeWarning ? fileSizeDesc : dimDesc }}
          </p>

          <!-- 操作按钮 -->
          <div class="dialog-actions">
            <button class="btn-prefer" @click="handleResize" :disabled="resizing">
              <svg v-if="!resizing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
              <span v-if="resizing" class="spinner"></span>
              {{ resizing ? '调整中...' : '自动调优（推荐）' }}
            </button>
            <button class="btn-original" @click="handleOriginal" :disabled="resizing">
              原图上传
            </button>
          </div>

          <button class="btn-cancel" @click="handleCancel" :disabled="resizing">
            取消
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RECOMMENDED_MAX_DIM } from '@/types';
import { formatFileSize } from '@/utils/imageUtils';

const props = defineProps<{
  visible: boolean;
  width: number;
  height: number;
  resizing: boolean;
  /** 文件大小（字节），用于文件大小警告 */
  fileSize?: number;
}>();

const emit = defineEmits<{
  (e: 'resize'): void;
  (e: 'original'): void;
  (e: 'cancel'): void;
}>();

const recommendedMaxDim = RECOMMENDED_MAX_DIM;

/** 是否因文件大小触发（而非尺寸） */
const isFileSizeWarning = computed(() => {
  const dimOK = Math.max(props.width, props.height) <= RECOMMENDED_MAX_DIM;
  const fileLarge = (props.fileSize ?? 0) > 2 * 1024 * 1024;
  return dimOK && fileLarge;
});

const fileSizeText = computed(() => formatFileSize(props.fileSize ?? 0));

const fileSizeDesc = computed(() =>
  `文件 ${fileSizeText.value}，体积较大。<br/>`
  + `大文件可能导致处理失败，建议压缩后再上传。`
);

const dimDesc = computed(() =>
  `大尺寸图片可能导致处理速度变慢或失败。<br/>`
  + `建议自动调整为 ${recommendedMaxDim}px 以内，不影响视觉效果。`
);

const recommendedW = computed(() => {
  const ratio = RECOMMENDED_MAX_DIM / Math.max(props.width, props.height);
  return Math.round(props.width * ratio);
});

const recommendedH = computed(() => {
  const ratio = RECOMMENDED_MAX_DIM / Math.max(props.width, props.height);
  return Math.round(props.height * ratio);
});

function handleResize(): void {
  emit('resize');
}

function handleOriginal(): void {
  emit('original');
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.dialog-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px 24px;
  width: 400px;
  max-width: 92vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: dialog-up 0.25s ease;
}

@keyframes dialog-up {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dialog-icon {
  margin-bottom: 10px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px;
}

/* 尺寸对比 */
.dialog-dims {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.dim-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.dim-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dim-value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dim-warn {
  color: #d97706;
}

.dim-ok {
  color: #059669;
}

.dim-arrow {
  flex-shrink: 0;
  margin-top: 10px;
}

/* 说明 */
.dialog-desc {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 22px;
  max-width: 320px;
}

/* 文件大小徽章 */
.dialog-badge {
  margin-bottom: 14px;
}

.badge-file {
  display: inline-block;
  padding: 6px 14px;
  background: #FEF3C7;
  color: #92400E;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid #FCD34D;
}

/* 按钮 */
.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 280px;
}

.btn-prefer,
.btn-original {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-prefer {
  background: #6366f1;
  color: #fff;
}
.btn-prefer:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
}
.btn-prefer:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-original {
  background: #f3f4f6;
  color: #374151;
}
.btn-original:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-cancel {
  margin-top: 14px;
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: color 0.2s;
}
.btn-cancel:hover:not(:disabled) {
  color: #6b7280;
}
.btn-cancel:disabled {
  cursor: not-allowed;
}

/* 加载动画 */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transition */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

/* ---- 响应式：移动端对话框 ---- */
@media (max-width: 480px) {
  .dialog-card {
    width: 92vw;
    padding: 22px 18px 18px;
    border-radius: 16px;
  }

  .dialog-icon {
    margin-bottom: 10px;
  }

  .dialog-icon svg {
    width: 32px;
    height: 32px;
  }

  .dialog-title {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .dialog-dims {
    gap: 8px;
    margin-bottom: 12px;
  }

  .dim-item .dim-value {
    font-size: 13px;
  }

  .dialog-desc {
    font-size: 12px;
    max-width: 100%;
    margin-bottom: 16px;
  }

  .dialog-actions {
    gap: 8px;
  }

  .btn-prefer, .btn-original {
    padding: 10px 14px;
    font-size: 13px;
  }
}
</style>
