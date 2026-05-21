<template>
  <div class="app" @paste="onPaste">
    <AppHeader />

    <main class="main">
      <div class="container">
        <!-- 上传区 -->
        <Transition name="section-fade" mode="out-in">
          <UploadZone
            v-if="showUpload"
            key="upload"
            :validate-file="remover.validateFile"
            @file-selected="handleFileSelected"
            @validation-error="handleValidationError"
          />
          <div v-else key="result" class="result-wrapper">
            <!-- 错误状态：显示重试界面 -->
            <div v-if="remover.processing.status === 'error'" class="error-card">
              <div class="error-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="18" stroke="#EF4444" stroke-width="2" fill="#FEF2F2"/>
                  <path d="M20 12v10M20 25v2" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="error-content">
                <h3 class="error-title">处理失败</h3>
                <p class="error-detail">{{ remover.processing.detail }}</p>
              </div>
              <div class="error-actions">
                <button class="btn-retry" @click="handleRetry">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8a6 6 0 0 1 10.47-4M14 8a6 6 0 0 1-10.47 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M12 2v4h-4M4 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  重试
                </button>
                <button class="btn-new-upload" @click="handleReset">
                  重新选择文件
                </button>
              </div>
            </div>

            <!-- 预览区 -->
            <PreviewGrid
              :original-url="remover.originalUrl.value"
              :result-url="remover.resultUrl.value"
              :bg-color="remover.currentBgColor.value"
              :processing="remover.processing"
              :result-dimensions="remover.resultDimensions.value"
              :model-used="remover.modelUsed.value"
            />

            <!-- 背景颜色选择器（处理完成后显示） -->
            <BackgroundColorPicker
              v-if="remover.processing.status === 'done'"
              :model-value="remover.currentBgColor.value"
              @update:model-value="handleBgColorChange"
            />

            <!-- 下载面板 -->
            <DownloadPanel
              v-if="remover.processing.status === 'done'"
              :blob="remover.resultBlob.value"
              :transparent-blob="remover.transparentBlob.value"
              :filename="remover.resultFilename.value"
              @toast="handleDownloadToast"
            />

            <!-- 重新上传 -->
            <div
              v-if="remover.processing.status === 'done' || remover.processing.status === 'error'"
              class="reset-row"
            >
              <button class="btn-reset" @click="handleReset">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"/>
                  <path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                重新上传
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </main>

    <AppFooter />
    <ToastMessage :toast="toastState" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import ToastMessage from './components/ToastMessage.vue';
import UploadZone from './components/UploadZone.vue';
import PreviewGrid from './components/PreviewGrid.vue';
import BackgroundColorPicker from './components/BackgroundColorPicker.vue';
import DownloadPanel from './components/DownloadPanel.vue';
import { useBackgroundRemover } from './composables/useBackgroundRemover';
import { useToast } from './composables/useToast';
import type { BgColor } from './types';

// ---- 组合式函数 ----
const remover = useBackgroundRemover();
const { toast: toastState, showToast } = useToast();

// ---- 计算属性 ----
const showUpload = computed(() => remover.processing.status === 'idle');

// ---- 事件处理 ----

function handleFileSelected(file: File): void {
  remover.processImage(file).then((error) => {
    if (error) {
      showToast({ message: error, type: 'error' });
    } else if (remover.processing.status === 'done') {
      showToast({ message: '背景移除成功！', type: 'success' });
    }
  });
}

function handleRetry(): void {
  remover.retryCurrentFile().then((error) => {
    if (error) {
      showToast({ message: error, type: 'error' });
    } else if (remover.processing.status === 'done') {
      showToast({ message: '重试成功！', type: 'success' });
    }
  });
}

function handleValidationError(error: string): void {
  showToast({ message: error, type: 'error' });
}

function handleDownloadToast(payload: { message: string; type: 'success' | 'error' }): void {
  showToast(payload);
}

async function handleBgColorChange(color: BgColor): Promise<void> {
  const error = await remover.applyBackgroundColor(color);
  if (error) {
    showToast({ message: error, type: 'error' });
  }
}

function handleReset(): void {
  remover.reset();
}

// ---- 全局粘贴上传 ----
function onPaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (!file) return;

      const validation = remover.validateFile(file);
      if (!validation.valid) {
        showToast({ message: validation.error, type: 'error' });
        return;
      }
      handleFileSelected(file);
      break;
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding-bottom: 48px;
}

.result-wrapper {
  display: flex;
  flex-direction: column;
}

/* ---- 错误重试卡片 ---- */
.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #fee2e2;
  border-radius: 16px;
  padding: 28px 24px;
  margin-bottom: 24px;
  text-align: center;
}

.error-icon {
  flex-shrink: 0;
}

.error-content {
  max-width: 420px;
}

.error-title {
  font-size: 16px;
  font-weight: 600;
  color: #991b1b;
  margin: 0 0 6px;
}

.error-detail {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
}

.error-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.btn-retry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #4f46e5;
}

.btn-new-upload {
  padding: 10px 20px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-new-upload:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* ---- 重新上传按钮 ---- */
.reset-row {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset:hover {
  background: #f9fafb;
  color: #374151;
  border-color: #d1d5db;
}

.btn-reset svg {
  width: 14px;
  height: 14px;
}

/* Section 切换动画 */
.section-fade-enter-active,
.section-fade-leave-active {
  transition: opacity 0.3s ease;
}

.section-fade-enter-from,
.section-fade-leave-to {
  opacity: 0;
}
</style>
