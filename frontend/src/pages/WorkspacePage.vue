<template>
  <div class="app" @paste="onPaste">
    <AppHeader @open-auth="ui.openAuthModal()" />

    <main class="main">
      <div class="container">
        <!-- ========== 批量模式：显示 BatchPanel ========== -->
        <template v-if="viewMode === 'batch'">
          <div class="back-row">
            <button class="btn-back-mode" @click="handleBackToUpload">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              返回上传
            </button>
          </div>
          <BatchPanel
            :batch="batch"
            @view-detail="handleBatchViewDetail"
            @toast="ui.showToast"
            @reset="handleBatchReset"
          />
        </template>

        <!-- ========== 正常流程：4 状态模型 ========== -->
        <template v-else>
          <Transition name="section-fade" mode="out-in">
            <!-- IDLE：上传区 / 配额耗尽卡片 -->
            <div v-if="viewState === 'idle'" key="idle">
              <UploadZone
                v-if="!quota.isExhausted.value"
                :validate-file="remover.validateFile"
                @file-selected="handleFileSelected"
                @files-selected="handleFilesSelected"
                @validation-error="handleValidationError"
              />
              <!-- 配额耗尽 -->
              <div v-else class="quota-exhausted-card">
                <div class="quota-exhausted-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" stroke="#F59E0B" stroke-width="2" fill="#FFFBEB"/>
                    <path d="M24 14v14M24 30v2" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <h3 class="quota-exhausted-title">今日免费额度已用完</h3>
                <p class="quota-exhausted-desc">
                  免费版每日 {{ quota.quotaDaily.value }} 次已用完，明天自动重置。
                </p>
                <button class="btn-upgrade" @click="ui.showToast({ message: 'Pro 计划即将上线，敬请期待！', type: 'success' })">
                  升级至 Pro
                </button>
              </div>
            </div>

            <!-- PROCESSING：进度预览 -->
            <div v-else-if="viewState === 'processing'" key="processing" class="result-wrapper">
              <div class="result-layout no-tools">
                <div class="preview-col">
                  <PreviewGrid
                    :original-url="remover.originalUrl.value"
                    :result-url="remover.resultUrl.value"
                    :bg-color="remover.currentBgColor.value"
                    :processing="remover.processing"
                    :result-dimensions="remover.resultDimensions.value"
                    :model-used="remover.modelUsed.value"
                  />
                </div>
              </div>
            </div>

            <!-- DONE：预览 + 工具面板（无"重新上传"按钮） -->
            <div v-else-if="viewState === 'done'" key="done" class="result-wrapper">
              <div class="result-layout">
                <div class="preview-col">
                  <PreviewGrid
                    :original-url="remover.originalUrl.value"
                    :result-url="remover.resultUrl.value"
                    :bg-color="remover.currentBgColor.value"
                    :processing="remover.processing"
                    :result-dimensions="remover.resultDimensions.value"
                    :model-used="remover.modelUsed.value"
                  />
                  <!-- 底部胶片条：当前会话多图切换 -->
                  <SessionFilmstrip
                    :items="sessionItems"
                    :active-id="activeSessionId"
                    @select="handleSessionSelect"
                  />
                </div>
                <div class="tools-col">
                  <BackgroundColorPicker
                    :model-value="remover.currentBgColor.value"
                    @update:model-value="handleBgColorChange"
                  />
                  <BackgroundTemplatePicker
                    :model-value="remover.currentTemplateId.value"
                    :subject-blob="remover.transparentBlob.value"
                    @update:model-value="handleTemplateChange"
                  />
                  <EdgeToolsPanel
                    :transparent-blob="remover.transparentBlob.value"
                    :original-url="remover.originalUrl.value"
                    @update:result-blob="handleEdgeUpdate"
                    @reset-edge="handleEdgeReset"
                    @toast="ui.showToast"
                  />
                  <DownloadPanel
                    :blob="remover.resultBlob.value"
                    :transparent-blob="remover.transparentBlob.value"
                    :filename="remover.resultFilename.value"
                    @toast="ui.showToast"
                  />
                </div>
              </div>
            </div>

            <!-- ERROR：错误卡片 -->
            <div v-else key="error" class="result-wrapper">
              <div class="error-card">
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
                  <template v-if="isQuotaError">
                    <button class="btn-retry" @click="ui.showToast({ message: 'Pro 计划即将上线，敬请期待！', type: 'success' })">
                      升级至 Pro 无限使用
                    </button>
                    <button class="btn-new-upload" @click="doReset">
                      返回上传
                    </button>
                  </template>
                  <template v-else>
                    <button class="btn-retry" @click="handleRetry">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8a6 6 0 0 1 10.47-4M14 8a6 6 0 0 1-10.47 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M12 2v4h-4M4 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      重试
                    </button>
                    <button class="btn-new-upload" @click="doReset">
                      重新选择文件
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 处理历史 -->
          <HistoryPanel
            v-if="history.entries.value.length > 0"
            :entries="history.entries.value"
            :active-id="activeHistoryId"
            @restore="handleHistoryRestore"
            @remove="history.remove"
            @clear="history.clearAll"
          />
        </template>
      </div>
    </main>

    <AppFooter />
    <ToastMessage :toast="ui.toast" />

    <!-- 批量处理后台进度浮窗 -->
    <BatchProgressToast
      :visible="batchProgressVisible"
      :done="batch.doneCount.value"
      :total="batch.totalCount.value"
      :percent="batch.overallProgress.value"
      @return="onBatchProgressReturn"
    />

    <LargeImageDialog
      :visible="largeImageDialog.visible"
      :width="largeImageDialog.width"
      :height="largeImageDialog.height"
      :resizing="largeImageDialog.resizing"
      :file-size="largeImageDialog.fileSize"
      @resize="handleLargeImageResize"
      @original="handleLargeImageOriginal"
      @cancel="handleLargeImageCancel"
    />

    <AuthModal :visible="ui.authModalVisible" @close="ui.closeAuthModal()" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import ToastMessage from '@/components/ToastMessage.vue';
import UploadZone from '@/components/UploadZone.vue';
import PreviewGrid from '@/components/PreviewGrid.vue';
import BackgroundColorPicker from '@/components/BackgroundColorPicker.vue';
import BackgroundTemplatePicker from '@/components/BackgroundTemplatePicker.vue';
import EdgeToolsPanel from '@/components/EdgeToolsPanel.vue';
import DownloadPanel from '@/components/DownloadPanel.vue';
import HistoryPanel from '@/components/HistoryPanel.vue';
import BatchPanel from '@/components/BatchPanel.vue';
import BatchProgressToast from '@/components/batch/BatchProgressToast.vue';
import LargeImageDialog from '@/components/LargeImageDialog.vue';
import AuthModal from '@/components/AuthModal.vue';
import SessionFilmstrip from '@/components/SessionFilmstrip.vue';
import { useBackgroundRemover } from '@/composables/useBackgroundRemover';
import { useHistory } from '@/composables/useHistory';
import { useBatchProcessor } from '@/composables/useBatchProcessor';
import { useQuota } from '@/composables/useQuota';
import { useAuth } from '@/composables/useAuth';
import { useUiStore } from '@/stores/ui';
import { historyApi } from '@/services/api';
import type { BgColor, HistoryEntry, SessionItem } from '@/types';
import { RECOMMENDED_MAX_DIM, MAX_FILE_SIZE_SOFT } from '@/types';
import { readImageDimensions, resizeImageClient, formatFileSize } from '@/utils/imageUtils';

// ---- 组合式函数 ----
const remover = useBackgroundRemover();
const auth = useAuth();
const history = useHistory();
const batch = useBatchProcessor();
const quota = useQuota();
const ui = useUiStore();

// ---- 视图模式 ----
const viewMode = ref<'single' | 'batch'>('single');

// ---- 批量进度浮窗可见性（仅当处理中且视图为 single 时显示） ----
const batchProgressVisible = computed(() =>
  batch.isProcessing.value && viewMode.value === 'single',
);

// ---- 批量处理完成 → 自动刷新历史 ----
watch(() => batch.allDone.value, (done) => {
  if (done) {
    history.load();
    quota.syncFromServer();
  }
});

// ---- 批量处理每完成一项 → 同步配额 ----
watch(
  () => batch.doneCount.value + batch.errorCount.value,
  (newVal, oldVal) => {
    if (newVal > oldVal) {
      quota.syncFromServer();
    }
  },
);

// ---- 计算属性 ----
type ViewState = 'idle' | 'processing' | 'done' | 'error';

const viewState = computed<ViewState>(() => {
  const status = remover.processing.status;
  if (status === 'idle') return 'idle';
  if (status === 'uploading' || status === 'processing') return 'processing';
  if (status === 'done') return 'done';
  return 'error';
});

const isQuotaError = computed(() => /已用完/.test(remover.processing.detail));

const activeHistoryId = ref<number | null>(null);

// ---- 当前会话（底部胶片条） ----
const sessionItems = ref<SessionItem[]>([]);
const activeSessionId = ref<string | null>(null);
let sessionIdCounter = 0;

// ---- 大图提示对话框 ----
const largeImageDialog = ref({
  visible: false,
  width: 0,
  height: 0,
  fileSize: 0,
  resizing: false,
  file: null as File | null,
});

// ================================================================
//  会话管理（胶片条 + Blob 工具）
// ================================================================

async function captureSessionItem(): Promise<void> {
  const blob = remover.resultBlob.value;
  const file = remover.currentFile.value;
  if (!blob || !remover.resultUrl.value) return;

  const resultDataUrl = await blobToDataUrl(blob);
  const originalThumb = file ? await createThumbnail(file) : resultDataUrl;
  const thumbDataUrl = await createBlobThumbnail(blob, 80);

  const id = `session_${++sessionIdCounter}`;
  const item: SessionItem = {
    id,
    filename: remover.resultFilename.value,
    originalThumb,
    resultDataUrl,
    thumbUrl: thumbDataUrl,
    dimensions: remover.resultDimensions.value ?? { width: 0, height: 0 },
    modelUsed: remover.modelUsed.value,
    resultBlob: blob,
    transparentBlob: remover.transparentBlob.value ?? blob,
  };

  sessionItems.value.push(item);
  activeSessionId.value = id;
}

function createThumbnail(file: File, maxDim: number = 100): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const scale = maxDim / Math.max(img.width, img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

function createBlobThumbnail(blob: Blob, maxDim: number = 80): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const scale = maxDim / Math.max(img.width, img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Blob 读取失败'));
    reader.readAsDataURL(blob);
  });
}

async function handleSessionSelect(id: string): Promise<void> {
  if (id === activeSessionId.value) return;

  const currentItem = sessionItems.value.find((s) => s.id === activeSessionId.value);
  if (currentItem && remover.resultBlob.value) {
    currentItem.resultDataUrl = await blobToDataUrl(remover.resultBlob.value);
    currentItem.transparentBlob = remover.transparentBlob.value ?? remover.resultBlob.value;
  }

  const item = sessionItems.value.find((s) => s.id === id);
  if (!item) return;

  remover.restoreFromHistory({
    originalDataUrl: item.originalThumb,
    resultDataUrl: item.resultDataUrl,
    filename: item.filename,
    dimensions: item.dimensions,
    modelUsed: item.modelUsed,
  });

  activeSessionId.value = id;
  activeHistoryId.value = null;
}

// ================================================================
//  文件上传 & 处理
// ================================================================

async function handleFileSelected(file: File): Promise<void> {
  if (quota.isExhausted.value) {
    ui.showToast({ message: `今日免费额度已用完 (${quota.quotaUsed.value}/${quota.quotaDaily.value})，明天自动重置`, type: 'error' });
    return;
  }

  const validation = remover.validateFile(file);
  if (!validation.valid) {
    ui.showToast({ message: validation.error, type: 'error' });
    return;
  }

  const dims = await readImageDimensions(file);

  if (dims && Math.max(dims.width, dims.height) > RECOMMENDED_MAX_DIM) {
    largeImageDialog.value = { visible: true, width: dims.width, height: dims.height, fileSize: file.size, resizing: false, file };
    return;
  }

  if (file.size > MAX_FILE_SIZE_SOFT) {
    largeImageDialog.value = { visible: true, width: dims?.width ?? 0, height: dims?.height ?? 0, fileSize: file.size, resizing: false, file };
    return;
  }

  await doProcessFile(file);
}

function handleFilesSelected(files: File[]): void {
  if (files.length === 0) return;
  const added = batch.addFiles(files);
  if (added > 0) {
    viewMode.value = 'batch';
    ui.showToast({ message: `已添加 ${added} 个文件`, type: 'success' });
  }
}

async function doProcessFile(file: File): Promise<void> {
  const error = await remover.processImage(file);
  if (error) {
    ui.showToast({ message: error, type: 'error' });
    return;
  }
  if (remover.processing.status === 'done') {
    await quota.afterSuccessfulRequest();
    ui.showToast({ message: '背景移除成功！', type: 'success' });
    await history.load();
    await captureSessionItem();
  }
}

async function handleLargeImageResize(): Promise<void> {
  const file = largeImageDialog.value.file;
  if (!file) return;
  largeImageDialog.value.resizing = true;
  try {
    const resized = await resizeImageClient(file, RECOMMENDED_MAX_DIM);
    const resizedFile = new File([resized], file.name.replace(/\.(\w+)$/, '_resized.$1') || file.name + '_resized', { type: 'image/jpeg' });
    largeImageDialog.value.visible = false;
    await doProcessFile(resizedFile);
  } catch (err) {
    ui.showToast({ message: err instanceof Error ? err.message : '图片缩放失败', type: 'error' });
    largeImageDialog.value.visible = false;
    await doProcessFile(file);
  } finally {
    largeImageDialog.value.resizing = false;
  }
}

async function handleLargeImageOriginal(): Promise<void> {
  const file = largeImageDialog.value.file;
  if (!file) return;
  largeImageDialog.value.visible = false;
  ui.showToast({ message: `原图较大（${formatFileSize(file.size)}），可能需要较长时间处理`, type: 'success' });
  await doProcessFile(file);
}

function handleLargeImageCancel(): void {
  largeImageDialog.value.visible = false;
  largeImageDialog.value.file = null;
}

// ================================================================
//  批量 → 单图桥接
// ================================================================

function handleBatchViewDetail(itemId: string): void {
  const data = batch.getBatchResultData(itemId);
  if (!data) {
    ui.showToast({ message: '无法加载该结果', type: 'error' });
    return;
  }
  remover.reset();
  viewMode.value = 'single';
  history.load();
  quota.syncFromServer();
  setTimeout(() => loadBatchResultIntoRemover(data), 50);
}

function loadBatchResultIntoRemover(data: {
  originalDataUrl: string; resultDataUrl: string; filename: string;
  file: File; dimensions: { width: number; height: number };
  modelUsed: string; resultBlob: Blob;
}): void {
  remover.reset();
  const origUrl = URL.createObjectURL(data.file);
  const reader = new FileReader();
  reader.onload = () => {
    remover.restoreFromHistory({
      originalDataUrl: origUrl,
      resultDataUrl: reader.result as string,
      filename: data.filename,
      dimensions: data.dimensions,
      modelUsed: data.modelUsed,
    });
  };
  reader.readAsDataURL(data.resultBlob);
}

// ================================================================
//  返回上传 / 批量重置 / 重置
// ================================================================

async function handleBackToUpload(): Promise<void> {
  // 处理中 → 切换视图，显示后台进度浮窗
  if (batch.isProcessing.value) {
    viewMode.value = 'single';
    remover.reset();
    ui.showToast({ message: '文件仍在后台处理中，完成后可在历史记录查看', type: 'success' });
    return;
  }
  // 已完成 → 保留结果，仅切换
  if (batch.phase.value === 'done') {
    viewMode.value = 'single';
    remover.reset();
    await Promise.all([history.load(), quota.syncFromServer()]);
    return;
  }
  // 入口阶段 → 销毁
  batch.destroy();
  viewMode.value = 'single';
  remover.reset();
}

function handleBatchReset(): void {
  batch.destroy();
  viewMode.value = 'single';
  remover.reset();
  history.load();
  quota.syncFromServer();
}

function doReset(): void {
  remover.reset();
  activeHistoryId.value = null;
  activeSessionId.value = null;
  sessionItems.value = [];
  viewMode.value = 'single';
}

function onBatchProgressReturn(): void {
  viewMode.value = 'batch';
}

// ================================================================
//  其他事件处理
// ================================================================

async function handleRetry(): Promise<void> {
  const error = await remover.retryCurrentFile();
  if (error) {
    ui.showToast({ message: error, type: 'error' });
    return;
  }
  if (remover.processing.status === 'done') {
    await quota.afterSuccessfulRequest();
    await history.load();
    await captureSessionItem();
    ui.showToast({ message: '重试成功！', type: 'success' });
  }
}

function handleValidationError(error: string): void {
  ui.showToast({ message: error, type: 'error' });
}

async function handleBgColorChange(color: BgColor): Promise<void> {
  const err = await remover.applyBackgroundColor(color);
  if (err) ui.showToast({ message: err, type: 'error' });
}

async function handleTemplateChange(templateId: string | null): Promise<void> {
  const err = await remover.applyTemplate(templateId);
  if (err) ui.showToast({ message: err, type: 'error' });
}

function handleEdgeUpdate(blob: Blob): void {
  remover.updateTransparentBlob(blob);
}

function handleEdgeReset(): void {
  remover.resetEdgeEdits();
  ui.showToast({ message: '已撤销边缘修改', type: 'success' });
}

async function handleHistoryRestore(entry: HistoryEntry): Promise<void> {
  if (entry.status === 'blocked') return;
  try {
    const resultBlob = await historyApi.getResult(entry.id);
    const resultDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取结果失败'));
      reader.readAsDataURL(resultBlob);
    });
    remover.restoreFromHistory({
      originalDataUrl: entry.originalThumb,
      resultDataUrl,
      filename: entry.filename,
      dimensions: { width: entry.width, height: entry.height },
      modelUsed: entry.modelUsed,
    });
    activeHistoryId.value = entry.id;
    activeSessionId.value = null;
    ui.showToast({ message: `已恢复: ${entry.filename}`, type: 'success' });
  } catch (err) {
    ui.showToast({ message: err instanceof Error ? err.message : '加载历史记录失败', type: 'error' });
  }
}

// ---- 粘贴上传 ----
async function onPaste(event: ClipboardEvent): Promise<void> {
  const clipboardItems = event.clipboardData?.items;
  if (!clipboardItems) return;
  for (const item of clipboardItems) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      const validation = remover.validateFile(file);
      if (!validation.valid) {
        ui.showToast({ message: validation.error, type: 'error' });
        return;
      }
      await handleFileSelected(file);
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

.result-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 28px;
  align-items: start;
}

.preview-col {
  position: sticky;
  top: 24px;
  min-width: 0;
}

.tools-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.result-layout.no-tools {
  grid-template-columns: 1fr;
}

.result-layout.no-tools .tools-col {
  display: none;
}

/* 错误卡片 */
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
  max-width: 520px;
  margin-inline: auto;
}

.error-icon { flex-shrink: 0; }
.error-content { max-width: 420px; }

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
.btn-retry:hover { background: #4f46e5; }

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
.btn-new-upload:hover { background: #f9fafb; border-color: #9ca3af; }

/* 配额耗尽 */
.quota-exhausted-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #fde68a;
  border-radius: 16px;
  padding: 32px 24px;
  margin-bottom: 24px;
  text-align: center;
  max-width: 520px;
  margin-inline: auto;
}

.quota-exhausted-icon { flex-shrink: 0; }

.quota-exhausted-title {
  font-size: 17px;
  font-weight: 700;
  color: #92400e;
  margin: 0;
}

.quota-exhausted-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  max-width: 360px;
}

.btn-upgrade {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 24px;
  border: none;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-upgrade:hover { background: #4f46e5; }

/* 批量返回 */
.back-row { margin-bottom: 16px; }

.btn-back-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-back-mode:hover { background: #f9fafb; color: #374151; border-color: #d1d5db; }

/* 响应式 */
@media (max-width: 900px) {
  .result-layout { grid-template-columns: 1fr; gap: 20px; }
  .preview-col { position: static; }
  .tools-col { gap: 14px; }
}

@media (max-width: 640px) {
  .main { padding-bottom: 32px; }
  .result-layout { gap: 14px; }
  .tools-col { gap: 10px; }
  .error-card { padding: 20px 16px; gap: 8px; margin-bottom: 16px; border-radius: 12px; }
  .error-title { font-size: 15px; }
  .error-detail { font-size: 12px; }
  .error-actions { gap: 8px; }
  .btn-retry, .btn-new-upload { padding: 8px 16px; font-size: 13px; }
  .back-row { margin-bottom: 10px; }
  .btn-back-mode { padding: 6px 12px; font-size: 12px; }
}

@media (max-width: 480px) {
  .main { padding-bottom: 20px; }
  .result-layout { gap: 10px; }
  .tools-col { gap: 8px; }
  .error-actions { flex-direction: column; width: 100%; }
  .btn-retry, .btn-new-upload { width: 100%; }
}

/* 动画 */
.section-fade-enter-active,
.section-fade-leave-active { transition: opacity 0.3s ease; }
.section-fade-enter-from,
.section-fade-leave-to { opacity: 0; }
</style>
