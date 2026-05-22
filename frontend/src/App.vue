<template>
  <!-- 未登录：展示 Landing Page -->
  <LandingPage v-if="!auth.isLoggedIn.value" @open-auth="authModalVisible = true" />

  <!-- 已登录：主应用 -->
  <div v-else class="app" @paste="onPaste">
    <AppHeader @open-auth="authModalVisible = true" />

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
            @toast="handleDownloadToast"
          />
        </template>

        <!-- ========== 正常流程：5 状态模型 ========== -->
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
                <button class="btn-upgrade" @click="showToast({ message: 'Pro 计划即将上线，敬请期待！', type: 'success' })">
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

            <!-- DONE：预览 + 工具面板 -->
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
                    @toast="handleDownloadToast"
                  />
                  <DownloadPanel
                    :blob="remover.resultBlob.value"
                    :transparent-blob="remover.transparentBlob.value"
                    :filename="remover.resultFilename.value"
                    @toast="handleDownloadToast"
                  />
                  <div class="reset-row">
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
              </div>
            </div>

            <!-- ERROR：错误卡片（根据错误类型显示不同按钮） -->
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
                    <button class="btn-retry" @click="showToast({ message: 'Pro 计划即将上线，敬请期待！', type: 'success' })">
                      升级至 Pro 无限使用
                    </button>
                    <button class="btn-new-upload" @click="handleReset">
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
                    <button class="btn-new-upload" @click="handleReset">
                      重新选择文件
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </Transition>

          <!-- 处理历史：始终可见（解决"重新上传后历史消失"的问题） -->
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
    <ToastMessage :toast="toastState" />

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
  </div>

  <!-- 全局 AuthModal（Landing Page 和主应用共用） -->
  <AuthModal :visible="authModalVisible" @close="authModalVisible = false" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import ToastMessage from './components/ToastMessage.vue';
import UploadZone from './components/UploadZone.vue';
import PreviewGrid from './components/PreviewGrid.vue';
import BackgroundColorPicker from './components/BackgroundColorPicker.vue';
import BackgroundTemplatePicker from './components/BackgroundTemplatePicker.vue';
import EdgeToolsPanel from './components/EdgeToolsPanel.vue';
import DownloadPanel from './components/DownloadPanel.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import BatchPanel from './components/BatchPanel.vue';
import LargeImageDialog from './components/LargeImageDialog.vue';
import AuthModal from './components/AuthModal.vue';
import LandingPage from './components/LandingPage.vue';
import { useBackgroundRemover } from './composables/useBackgroundRemover';
import { useHistory } from './composables/useHistory';
import { useBatchProcessor } from './composables/useBatchProcessor';
import { useToast } from './composables/useToast';
import { useQuota } from './composables/useQuota';
import { useAuth } from './composables/useAuth';
import { historyApi } from './services/api';
import type { BgColor, HistoryEntry } from './types';
import { RECOMMENDED_MAX_DIM, MAX_FILE_SIZE_SOFT } from './types';
import { readImageDimensions, resizeImageClient, formatFileSize } from './utils/imageUtils';

// ---- 组合式函数 ----
const remover = useBackgroundRemover();
const auth = useAuth();
const history = useHistory();
const batch = useBatchProcessor();
const { toast: toastState, showToast } = useToast();
const quota = useQuota();

// ---- 鉴权弹窗 ----
const authModalVisible = ref(false);

// ---- 视图模式 ----
/** 'single' = 正常单图模式 | 'batch' = 批量面板 */
const viewMode = ref<'single' | 'batch'>('single');

// ---- 计算属性 ----
/** 页面视图状态（驱动模板切换） */
type ViewState = 'idle' | 'processing' | 'done' | 'error';

const viewState = computed<ViewState>(() => {
  const status = remover.processing.status;
  if (status === 'idle') return 'idle';
  if (status === 'uploading' || status === 'processing') return 'processing';
  if (status === 'done') return 'done';
  return 'error';
});

/** 是否是配额耗尽类错误（区分 429 和其他失败） */
const isQuotaError = computed(() => /已用完/.test(remover.processing.detail));

/** 当前活跃的历史条目 ID（用于高亮） */
const activeHistoryId = ref<number | null>(null);

// ---- 大图提示对话框状态 ----
const largeImageDialog = ref({
  visible: false,
  width: 0,
  height: 0,
  fileSize: 0,
  resizing: false,
  /** 原始文件（缓存） */
  file: null as File | null,
});

// ---- 事件处理 ----

async function handleFileSelected(file: File): Promise<void> {
  // 0. 配额检查（优先阻断，避免无意义上传）
  if (quota.isExhausted.value) {
    showToast({ message: `今日免费额度已用完 (${quota.quotaUsed.value}/${quota.quotaDaily.value})，明天自动重置`, type: 'error' });
    return;
  }

  // 1. 同步校验（格式、大小）
  const validation = remover.validateFile(file);
  if (!validation.valid) {
    showToast({ message: validation.error, type: 'error' });
    return;
  }

  // 2. 异步检查图片尺寸
  const dims = await readImageDimensions(file);

  // 2a. 尺寸过大 → 弹出选择对话框
  if (dims && Math.max(dims.width, dims.height) > RECOMMENDED_MAX_DIM) {
    largeImageDialog.value = {
      visible: true,
      width: dims.width,
      height: dims.height,
      fileSize: file.size,
      resizing: false,
      file,
    };
    return;
  }

  // 2b. 文件大小过大（即使尺寸 OK）→ 也弹窗警告
  if (file.size > MAX_FILE_SIZE_SOFT) {
    largeImageDialog.value = {
      visible: true,
      width: dims?.width ?? 0,
      height: dims?.height ?? 0,
      fileSize: file.size,
      resizing: false,
      file,
    };
    return;
  }

  // 3. 尺寸 + 大小均正常 → 直接处理
  await doProcessFile(file);
}

/** 多文件选择 → 进入批量模式 */
function handleFilesSelected(files: File[]): void {
  if (files.length === 0) return;
  const added = batch.addFiles(files);
  if (added > 0) {
    viewMode.value = 'batch';
    showToast({ message: `已添加 ${added} 个文件`, type: 'success' });
  }
}

/** 核心处理流程（提取为独立函数，供直通/缩放后调用） */
async function doProcessFile(file: File): Promise<void> {
  const error = await remover.processImage(file);
  if (error) {
    showToast({ message: error, type: 'error' });
    return;
  }
  if (remover.processing.status === 'done') {
    await quota.afterSuccessfulRequest();
    showToast({ message: '背景移除成功！', type: 'success' });
    // 后端已自动保存历史，前端重新加载列表
    await history.load();
  }
}

/** 对话框：自动调优 → 客户端缩放后上传 */
async function handleLargeImageResize(): Promise<void> {
  const file = largeImageDialog.value.file;
  if (!file) return;

  largeImageDialog.value.resizing = true;

  try {
    const resized = await resizeImageClient(file, RECOMMENDED_MAX_DIM);
    // 从缩放后的 Blob 重建 File 对象
    const resizedFile = new File(
      [resized],
      file.name.replace(/\.(\w+)$/, '_resized.$1') || file.name + '_resized',
      { type: 'image/jpeg' },
    );
    largeImageDialog.value.visible = false;
    await doProcessFile(resizedFile);
  } catch (err) {
    showToast({
      message: err instanceof Error ? err.message : '图片缩放失败，尝试原图上传',
      type: 'error',
    });
    largeImageDialog.value.visible = false;
    // 降级：直接原图上传
    await doProcessFile(file);
  } finally {
    largeImageDialog.value.resizing = false;
  }
}

/** 对话框：坚持原图上传 */
async function handleLargeImageOriginal(): Promise<void> {
  const file = largeImageDialog.value.file;
  if (!file) return;

  largeImageDialog.value.visible = false;
  showToast({
    message: `原图较大（${formatFileSize(file.size)}），可能需要较长时间处理`,
    type: 'success',
  });
  await doProcessFile(file);
}

/** 对话框：取消上传 */
function handleLargeImageCancel(): void {
  largeImageDialog.value.visible = false;
  largeImageDialog.value.file = null;
}

/** 从批量结果查看单图详情 → 切换到单图模式 */
function handleBatchViewDetail(itemId: string): void {
  const data = batch.getBatchResultData(itemId);
  if (!data) {
    showToast({ message: '无法加载该结果', type: 'error' });
    return;
  }

  // 将批量结果的数据注入单图 remover
  remover.reset();
  // 使用 restoreFromHistory 的相似路径，但直接设置数据
  // 由于 transparentBlob 等是 shallowRef，我们需要内部驱动
  // 我们用 URL 设置方式
  viewMode.value = 'single';
  // 延迟一下等视图切换完成
  setTimeout(() => {
    loadBatchResultIntoRemover(data);
  }, 50);
}

function loadBatchResultIntoRemover(data: {
  originalDataUrl: string;
  resultDataUrl: string;
  filename: string;
  file: File;
  dimensions: { width: number; height: number };
  modelUsed: string;
  resultBlob: Blob;
}): void {
  // 直接操作 remover 内部状态（通过 reset + 手动设置 Object URL）
  remover.reset();

  // 使用内部状态设置（这些是公开的 readonly ref，但实际值可以通过公共方法间接设置）
  // 我们通过 processImage 不行，需要手动注入。最简单的办法是用 restoreFromHistory 的模式
  // 但 history 存储的是 base64，这里我们是 blob/URL。直接用内部 hack:

  // 设置 originalUrl
  const origUrl = URL.createObjectURL(data.file);
  // 设置 transparent blob 和 result
  // 通过 remover 暴露的接口，我们只能调用 restoreFromHistory
  // 所以最好的办法是：将 blob 转成 data URL，然后调用 restoreFromHistory

  const reader = new FileReader();
  reader.onload = () => {
    const resultDataUrl = reader.result as string;
    remover.restoreFromHistory({
      originalDataUrl: origUrl,
      resultDataUrl,
      filename: data.filename,
      dimensions: data.dimensions,
      modelUsed: data.modelUsed,
    });
  };
  reader.readAsDataURL(data.resultBlob);
}

/** 从批量模式返回上传界面 */
function handleBackToUpload(): void {
  batch.destroy();
  viewMode.value = 'single';
  remover.reset();
}

async function handleRetry(): Promise<void> {
  const file = remover.currentFile.value;
  const error = await remover.retryCurrentFile();
  if (error) {
    showToast({ message: error, type: 'error' });
    return;
  }
  if (remover.processing.status === 'done') {
    await quota.afterSuccessfulRequest();
    await history.load();
    showToast({ message: '重试成功！', type: 'success' });
  }
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

async function handleTemplateChange(templateId: string | null): Promise<void> {
  const error = await remover.applyTemplate(templateId);
  if (error) {
    showToast({ message: error, type: 'error' });
  }
}

// ---- G05: 边缘后期工具 ----
function handleEdgeUpdate(blob: Blob): void {
  remover.updateTransparentBlob(blob);
}

function handleEdgeReset(): void {
  remover.resetEdgeEdits();
  showToast({ message: '已撤销边缘修改', type: 'success' });
}

function handleReset(): void {
  remover.reset();
  activeHistoryId.value = null;
  viewMode.value = 'single';
}

async function handleHistoryRestore(entry: HistoryEntry): Promise<void> {
  // 被配额拒绝的记录没有结果，不可恢复
  if (entry.status === 'blocked') return;

  try {
    // 从 API 获取结果原图 Blob
    const resultBlob = await historyApi.getResult(entry.id);

    // 转为 data URL（restoreFromHistory 要求 data URL）
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
    showToast({ message: `已恢复: ${entry.filename}`, type: 'success' });
  } catch (err) {
    showToast({
      message: err instanceof Error ? err.message : '加载历史记录失败',
      type: 'error',
    });
  }
}

// ---- 全局粘贴上传 ----
async function onPaste(event: ClipboardEvent): Promise<void> {
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
      // 统一走 handleFileSelected（含尺寸检查 + 对话框）
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

/* ============================================================
   结果区：左右两栏布局
   ============================================================ */

.result-wrapper {
  display: flex;
  flex-direction: column;
}

/* 核心两栏网格 */
.result-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 28px;
  align-items: start;
}

/* 左栏：预览区（粘性定位） */
.preview-col {
  position: sticky;
  top: 24px;
  min-width: 0; /* 防止内容溢出 */
}

/* 右栏：工具面板 */
.tools-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* 处理中：右侧无需显示，预览区全宽 */
.result-layout.no-tools {
  grid-template-columns: 1fr;
}

.result-layout.no-tools .tools-col {
  display: none;
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
  max-width: 520px;
  margin-inline: auto;
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

/* ---- 配额耗尽卡片 ---- */
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

.quota-exhausted-icon {
  flex-shrink: 0;
}

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

.btn-upgrade:hover {
  background: #4f46e5;
}

/* ---- 重新上传按钮 ---- */
.reset-row {
  display: flex;
  justify-content: center;
}

.btn-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
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
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.btn-reset svg {
  width: 14px;
  height: 14px;
}

/* ---- 批量模式返回按钮 ---- */
.back-row {
  margin-bottom: 16px;
}

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
.btn-back-mode:hover {
  background: #f9fafb;
  color: #374151;
  border-color: #d1d5db;
}

/* ---- 响应式 ---- */

/* 平板 & 小屏 ≤900px：两栏退化为单列 */
@media (max-width: 900px) {
  .result-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .preview-col {
    position: static;
  }

  .tools-col {
    gap: 14px;
  }
}

/* 手机 ≤640px：间距 + 卡片紧凑化 */
@media (max-width: 640px) {
  .main {
    padding-bottom: 32px;
  }

  .result-layout {
    gap: 14px;
  }

  .tools-col {
    gap: 10px;
  }

  .error-card {
    padding: 20px 16px;
    gap: 8px;
    margin-bottom: 16px;
    border-radius: 12px;
  }

  .error-title {
    font-size: 15px;
  }

  .error-detail {
    font-size: 12px;
  }

  .error-actions {
    gap: 8px;
  }

  .btn-retry {
    padding: 8px 16px;
    font-size: 13px;
  }

  .btn-new-upload {
    padding: 8px 16px;
    font-size: 13px;
  }

  .btn-reset {
    padding: 8px 16px;
    font-size: 12px;
  }

  .back-row {
    margin-bottom: 10px;
  }

  .btn-back-mode {
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* 小手机 ≤480px：极限紧凑 */
@media (max-width: 480px) {
  .main {
    padding-bottom: 20px;
  }

  .result-layout {
    gap: 10px;
  }

  .tools-col {
    gap: 8px;
  }

  /* result-wrapper 无工具时不需要额外间距 */
  .result-wrapper {
    margin-top: 4px;
  }

  .error-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn-retry,
  .btn-new-upload {
    width: 100%;
  }

  /* 重新上传按钮全宽 */
  .reset-row .btn-reset {
    width: 100%;
  }
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
