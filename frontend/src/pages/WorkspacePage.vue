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

        <!-- ========== 正常流程：上传 / 处理 / 错误 ========== -->
        <template v-else>
          <Transition name="section-fade" mode="out-in">
            <!-- IDLE：上传区 -->
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

            <!-- PROCESSING：进度预览（仅显示处理状态，无工具面板） -->
            <div v-else-if="viewState === 'processing'" key="processing" class="result-wrapper">
              <div class="processing-section">
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
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import ToastMessage from '@/components/ToastMessage.vue';
import UploadZone from '@/components/UploadZone.vue';
import PreviewGrid from '@/components/PreviewGrid.vue';
import HistoryPanel from '@/components/HistoryPanel.vue';
import BatchPanel from '@/components/BatchPanel.vue';
import BatchProgressToast from '@/components/batch/BatchProgressToast.vue';
import LargeImageDialog from '@/components/LargeImageDialog.vue';
import AuthModal from '@/components/AuthModal.vue';
import { useBackgroundRemover } from '@/composables/useBackgroundRemover';
import { useHistory } from '@/composables/useHistory';
import { useBatchProcessor } from '@/composables/useBatchProcessor';
import { useQuota } from '@/composables/useQuota';
import { useAuth } from '@/composables/useAuth';
import { useUiStore } from '@/stores/ui';
import { useDraftsStore } from '@/stores/drafts';
import { historyApi } from '@/services/api';
import type { HistoryEntry } from '@/types';
import { RECOMMENDED_MAX_DIM, MAX_FILE_SIZE_SOFT } from '@/types';
import { readImageDimensions, resizeImageClient, formatFileSize } from '@/utils/imageUtils';

// ---- 组合式函数 ----
const remover = useBackgroundRemover();
const auth = useAuth();
const history = useHistory();
const batch = useBatchProcessor();
const quota = useQuota();
const ui = useUiStore();
const drafts = useDraftsStore();
const router = useRouter();
const route = useRoute();

// ---- 视图模式 ----
const viewMode = ref<'single' | 'batch'>('single');

const batchProgressVisible = computed(() =>
  batch.isProcessing.value && viewMode.value === 'single',
);

// ---- 首次挂载 & 从草稿确认返回时加载历史 ----
onMounted(() => {
  // 初始化草稿箱 IndexedDB 元数据（WorkspacePage 需要 drafts.add）
  drafts.init();

  // 如果从草稿详情页确认后返回，query 会带 ?confirmed=1
  if (route.query.confirmed === '1') {
    history.reload();
    quota.syncFromServer();
    // 清除 query 参数，避免下次挂载重复加载
    router.replace({ query: {} });
  } else if (!history.loaded.value) {
    // 首次加载历史（仅加载一次，避免反复拉取）
    history.load();
  }
});

// ---- 批量处理完成 → 自动刷新历史 ----
watch(() => batch.allDone.value, (done) => {
  if (done) {
    history.reload();
    quota.syncFromServer();
  }
});

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
//  文件上传 & 处理 → 跳转到草稿详情页
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
    // 保存到草稿箱
    const draftId = generateDraftId();
    const resultBlob = remover.resultBlob.value;
    if (!resultBlob) return;

    await quota.afterSuccessfulRequest();

    // 创建缩略图
    const thumbUrl = await createBlobThumbnail(resultBlob, 100);
    const origThumbUrl = await createOriginalThumbnail(file, 100);

    await drafts.add(
      {
        id: draftId,
        filename: remover.resultFilename.value,
        thumbnailUrl: origThumbUrl,
        resultThumbUrl: thumbUrl,
        dimensions: remover.resultDimensions.value ?? { width: 0, height: 0 },
        modelUsed: remover.modelUsed.value,
        createdAt: Date.now(),
      },
      resultBlob,
      file, // 原图 Blob 存 IndexedDB 用于对比
    );

    // 跳转到草稿详情页
    router.push(`/workspace/draft/${draftId}`);
  }
}

let draftIdCounter = 0;
function generateDraftId(): string {
  return `draft_${Date.now()}_${++draftIdCounter}`;
}

function createBlobThumbnail(blob: Blob, maxDim: number = 100): Promise<string> {
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
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
    img.src = url;
  });
}

function createOriginalThumbnail(file: File, maxDim: number = 100): Promise<string> {
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
//  批量 → 单图桥接（现在跳转到草稿详情页）
// ================================================================

function handleBatchViewDetail(itemId: string): void {
  const data = batch.getBatchResultData(itemId);
  if (!data) {
    ui.showToast({ message: '无法加载该结果', type: 'error' });
    return;
  }

  // 批量处理结果也保存为草稿
  const draftId = generateDraftId();
  const reader = new FileReader();
  reader.onload = async () => {
    const thumbUrl = reader.result as string;
    await drafts.add(
      {
        id: draftId,
        filename: data.filename,
        thumbnailUrl: thumbUrl,
        resultThumbUrl: thumbUrl,
        dimensions: data.dimensions,
        modelUsed: data.modelUsed,
        createdAt: Date.now(),
      },
      data.resultBlob,
      data.file,
    );
    router.push(`/workspace/draft/${draftId}`);
  };
  reader.readAsDataURL(data.resultBlob);
}

// ================================================================
//  返回上传 / 批量重置 / 重置
// ================================================================

async function handleBackToUpload(): Promise<void> {
  if (batch.isProcessing.value) {
    viewMode.value = 'single';
    remover.reset();
    ui.showToast({ message: '文件仍在后台处理中，完成后可在历史记录查看', type: 'success' });
    return;
  }
  if (batch.phase.value === 'done') {
    viewMode.value = 'single';
    remover.reset();
    await Promise.all([history.reload(), quota.syncFromServer()]);
    return;
  }
  batch.destroy();
  viewMode.value = 'single';
  remover.reset();
}

function handleBatchReset(): void {
  batch.destroy();
  viewMode.value = 'single';
  remover.reset();
  history.reload();
  quota.syncFromServer();
}

function doReset(): void {
  remover.reset();
  activeHistoryId.value = null;
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
    // 重试成功后也保存为草稿并跳转
    const resultBlob = remover.resultBlob.value;
    if (!resultBlob) return;

    await quota.afterSuccessfulRequest();

    const draftId = generateDraftId();
    const thumbUrl = await createBlobThumbnail(resultBlob, 100);
    const file = remover.currentFile.value;
    const origThumb = file ? await createOriginalThumbnail(file, 100) : thumbUrl;

    await drafts.add(
      {
        id: draftId,
        filename: remover.resultFilename.value,
        thumbnailUrl: origThumb,
        resultThumbUrl: thumbUrl,
        dimensions: remover.resultDimensions.value ?? { width: 0, height: 0 },
        modelUsed: remover.modelUsed.value,
        createdAt: Date.now(),
      },
      resultBlob,
      file ?? undefined,
    );

    router.push(`/workspace/draft/${draftId}`);
    ui.showToast({ message: '重试成功！', type: 'success' });
  }
}

function handleValidationError(error: string): void {
  ui.showToast({ message: error, type: 'error' });
}

async function handleHistoryRestore(entry: HistoryEntry): Promise<void> {
  // 若正在处理中，先重置
  if (remover.processing.status !== 'idle') {
    remover.reset();
  }

  if (entry.status === 'blocked') {
    ui.showToast({ message: '该记录因配额耗尽而被阻止，无法恢复', type: 'error' });
    return;
  }

  try {
    ui.showToast({ message: '正在加载历史记录...', type: 'success' });

    const resultBlob = await historyApi.getResult(entry.id);
    if (!resultBlob || resultBlob.size === 0) {
      ui.showToast({ message: '历史记录文件已丢失，请重新上传', type: 'error' });
      return;
    }

    const resultDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取结果失败'));
      reader.readAsDataURL(resultBlob);
    });

    // 历史恢复也保存为草稿（方便编辑后再确认）
    const draftId = generateDraftId();
    await drafts.add(
      {
        id: draftId,
        filename: entry.filename,
        thumbnailUrl: entry.originalThumb,
        resultThumbUrl: resultDataUrl,
        dimensions: { width: entry.width, height: entry.height },
        modelUsed: entry.modelUsed,
        createdAt: Date.now(),
      },
      resultBlob,
    );

    activeHistoryId.value = entry.id;
    router.push(`/workspace/draft/${draftId}`);
    ui.showToast({ message: `已恢复: ${entry.filename}`, type: 'success' });
  } catch (err) {
    console.error('History restore error:', err);
    ui.showToast({
      message: err instanceof Error ? `加载失败: ${err.message}` : '加载历史记录失败，请检查网络连接后重试',
      type: 'error',
    });
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

.processing-section {
  max-width: 720px;
  margin: 0 auto;
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
@media (max-width: 640px) {
  .main { padding-bottom: 32px; }
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
  .error-actions { flex-direction: column; width: 100%; }
  .btn-retry, .btn-new-upload { width: 100%; }
}

/* 动画 */
.section-fade-enter-active,
.section-fade-leave-active { transition: opacity 0.3s ease; }
.section-fade-enter-from,
.section-fade-leave-to { opacity: 0; }
</style>
