<template>
  <div class="app" @paste="onPaste">
    <AppHeader @open-auth="ui.openAuthModal()" />

    <main class="main">
      <div class="container">
        <!-- ========== 新用户引导提示 ========== -->
        <Transition name="onboarding-fade">
          <div v-if="showOnboarding" class="onboarding-banner">
            <div class="onboarding-content">
              <span class="onboarding-icon">👋</span>
              <div class="onboarding-text">
                <strong>欢迎使用 AI 背景移除！</strong>
                <span>拖拽图片到下方区域，AI 将自动移除背景</span>
              </div>
              <button class="onboarding-close" @click="dismissOnboarding" title="知道了">✕</button>
            </div>
          </div>
        </Transition>

        <!-- ========== 批量模式选择对话框 ========== -->
        <Transition name="modal-fade">
          <div v-if="batchChoiceVisible" class="batch-choice-overlay" @click.self="handleBatchChoiceCancel">
            <div class="batch-choice-dialog">
              <div class="batch-choice-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="4" y="4" width="17" height="17" rx="4" stroke="#6366f1" stroke-width="2"/>
                  <rect x="27" y="4" width="17" height="17" rx="4" stroke="#6366f1" stroke-width="2"/>
                  <rect x="4" y="27" width="17" height="17" rx="4" stroke="#d1d5db" stroke-width="2"/>
                  <rect x="27" y="27" width="17" height="17" rx="4" stroke="#d1d5db" stroke-width="2"/>
                </svg>
              </div>
              <h3 class="batch-choice-title">已选择 {{ batchChoiceCount }} 张图片</h3>
              <p class="batch-choice-desc">请选择处理方式：</p>
              <div class="batch-choice-actions">
                <button class="batch-choice-btn batch-choice-primary" @click="handleBatchChoiceQuick">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span class="batch-choice-label">
                    <strong>批量快速处理</strong>
                    <small>全部同时处理，完成后一次性下载</small>
                  </span>
                </button>
                <button class="batch-choice-btn batch-choice-secondary" @click="handleBatchChoiceRefine">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span class="batch-choice-label">
                    <strong>逐张精修</strong>
                    <small>每张可单独设置背景颜色和模板</small>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- ========== 批量模式 ========== -->
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

        <!-- ========== 单图模式 ========== -->
        <template v-else>
          <Transition name="section-fade" mode="out-in">
            <!-- IDLE：上传区 -->
            <div v-if="viewState === 'idle'" key="idle">
              <!-- 示例图引导（新用户） -->
              <ExampleImagesBar
                v-if="showExamples"
                @select="handleExampleSelect"
              />
              <UploadZone
                v-if="!quota.isExhausted.value"
                :validate-file="remover.validateFile"
                :quota-text="quotaText"
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
                <div class="quota-exhausted-actions">
                  <button class="btn-upgrade-pro" @click="showProModal = true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    了解 Pro 计划
                  </button>
                </div>
              </div>
            </div>

            <!-- PROCESSING：处理中 + 取消按钮 -->
            <div v-else-if="viewState === 'processing'" key="processing" class="result-wrapper">
              <div class="processing-top-bar">
                <span class="processing-label">AI 正在处理...</span>
                <button class="btn-cancel-process" @click="handleCancelProcess">
                  取消
                </button>
              </div>
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

            <!-- DONE：结果直出工作台 -->
            <div v-else-if="viewState === 'done'" key="done" class="result-wrapper">
              <!-- 顶部操作栏 -->
              <div class="done-top-bar">
                <button class="btn-back-upload" @click="doReset">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                  重新上传
                </button>
                <div class="done-file-info">
                  <span class="done-filename">{{ remover.resultFilename.value }}</span>
                  <span v-if="resultSizeText" class="done-dims">{{ resultSizeText }}</span>
                  <span v-if="remover.modelUsed.value" class="done-model-chip">{{ remover.modelUsed.value }}</span>
                </div>
                <button class="btn-refine" @click="handleRefine">
                  精修
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>

              <!-- 预览区 -->
              <div class="done-preview-area">
                <PreviewGrid
                  :original-url="remover.originalUrl.value"
                  :result-url="remover.resultUrl.value"
                  :bg-color="selectedBgColor"
                  :processing="remover.processing"
                  :result-dimensions="remover.resultDimensions.value"
                  :model-used="remover.modelUsed.value"
                />
              </div>

              <!-- 工具行 -->
              <div class="done-tools">
                <DownloadPanel
                  :blob="remover.resultBlob.value"
                  :transparent-blob="remover.transparentBlob.value"
                  :filename="remover.resultFilename.value"
                  @toast="ui.showToast"
                />
                <BackgroundColorPicker v-model="selectedBgColor" />
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
                  <p class="error-detail">{{ humanizeError(remover.processing.detail) }}</p>
                </div>
                <div class="error-actions">
                  <template v-if="isQuotaError">
                    <button class="btn-upgrade-pro-inline" @click="showProModal = true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      了解 Pro 计划，解除限制
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

          <!-- 处理历史（可折叠） -->
          <div v-if="history.entries.value.length > 0" class="history-wrapper">
            <button class="history-toggle" @click="historyCollapsed = !historyCollapsed">
              <div class="history-toggle-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>处理历史</span>
                <span class="history-count">{{ history.entries.value.length }}</span>
              </div>
              <span class="history-toggle-arrow" :class="{ collapsed: historyCollapsed }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </button>
            <Transition name="collapse">
              <div v-show="!historyCollapsed">
                <HistoryPanel
                  :entries="history.entries.value"
                  :active-id="activeHistoryId"
                  @restore="handleHistoryRestore"
                  @remove="history.remove"
                  @clear="history.clearAll"
                  @retry-blocked="handleRetryBlocked"
                />
              </div>
            </Transition>
          </div>
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
    <ProPlanModal :visible="showProModal" @close="showProModal = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
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
import BackgroundColorPicker from '@/components/BackgroundColorPicker.vue';
import DownloadPanel from '@/components/DownloadPanel.vue';
import ExampleImagesBar from '@/components/ExampleImagesBar.vue';
import ProPlanModal from '@/components/ProPlanModal.vue';
import { useBackgroundRemover } from '@/composables/useBackgroundRemover';
import { useHistory } from '@/composables/useHistory';
import { useBatchProcessor } from '@/composables/useBatchProcessor';
import { useQuota } from '@/composables/useQuota';
import { useAuth } from '@/composables/useAuth';
import { useUiStore } from '@/stores/ui';
import { useDraftsStore } from '@/stores/drafts';
import { historyApi } from '@/services/api';
import type { HistoryEntry, BgColor } from '@/types';
import { RECOMMENDED_MAX_DIM, MAX_FILE_SIZE_SOFT } from '@/types';
import { readImageDimensions, resizeImageClient, formatFileSize, createThumbnail } from '@/utils/imageUtils';
import { humanizeError } from '@/utils/errorHumanizer';

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
const historyCollapsed = ref(false);

// ---- 新用户引导 ----
const ONBOARDING_KEY = 'ai-bg-remover-onboarding-shown';
const EXAMPLES_KEY = 'ai-bg-remover-examples-used';
const showOnboarding = ref(false);
const showExamples = ref(false);

// ---- Pro 弹窗 ----
const showProModal = ref(false);

// ---- 配额文案 ----
const quotaText = computed(() => {
  if (!auth.isLoggedIn.value) return '';
  const user = auth.user.value;
  if (!user || user.plan !== 'free') return '';
  const left = quota.quotaLeft.value;
  if (left <= 0) return '今日次数已用完';
  return `今日剩余 ${left} 次免费处理`;
});

const batchProgressVisible = computed(() =>
  batch.isProcessing.value && viewMode.value === 'single',
);

// ---- 批量模式选择对话框 ----
const batchChoiceVisible = ref(false);
const batchChoiceFiles = ref<File[]>([]);
const batchChoiceCount = computed(() => batchChoiceFiles.value.length);

// ---- 首次挂载：引导 + 示例图 + 历史加载 ----
onMounted(async () => {
  // 新用户引导横幅
  if (!localStorage.getItem(ONBOARDING_KEY) && auth.isLoggedIn.value) {
    showOnboarding.value = true;
    localStorage.setItem(ONBOARDING_KEY, '1');
  }
  // 示例图（仅首次登录用户可见，用过一次后永久隐藏）
  if (!localStorage.getItem(EXAMPLES_KEY) && auth.isLoggedIn.value) {
    showExamples.value = true;
  }
  // 草稿箱初始化
  drafts.init();
  // 历史加载
  if (route.query.confirmed === '1') {
    await history.reload();
    await quota.syncFromServer();
    router.replace({ query: {} });
  } else if (!history.loaded.value) {
    history.load();
  }
});

// ---- 组件卸载时清理资源 ----
onUnmounted(() => {
  remover.reset();
  batch.destroy();
});

// ---- 批量处理完成 → 自动刷新历史 ----
watch(() => batch.allDone.value, (done) => {
  if (done) { history.reload(); quota.syncFromServer(); }
});

watch(
  () => batch.doneCount.value + batch.errorCount.value,
  (newVal, oldVal) => { if (newVal > oldVal) quota.syncFromServer(); },
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

const resultSizeText = computed(() => {
  const d = remover.resultDimensions.value;
  if (!d) return '';
  return `${d.width}×${d.height}`;
});

const activeHistoryId = ref<number | null>(null);

// ---- 背景色双向绑定 ----
const selectedBgColor = ref<BgColor>('transparent');
let bgColorSyncing = false;

watch(selectedBgColor, async (newColor) => {
  if (bgColorSyncing) return;
  const err = await remover.applyBackgroundColor(newColor);
  if (err) ui.showToast({ message: humanizeError(err), type: 'error' });
});

watch(() => remover.currentBgColor.value, (newColor) => {
  bgColorSyncing = true;
  selectedBgColor.value = newColor;
  // 使用 nextTick 代替 setTimeout，更可靠
  nextTick(() => { bgColorSyncing = false; });
});

// ---- 当前草稿 ID（用于精修跳转） ----
const currentDraftId = ref<string | null>(null);

// ---- 大图提示对话框 ----
const largeImageDialog = ref({
  visible: false, width: 0, height: 0, fileSize: 0, resizing: false, file: null as File | null,
});

// ================================================================
//  文件上传 & 处理 → 结果直出工作台
// ================================================================

async function handleFileSelected(file: File): Promise<void> {
  if (quota.isExhausted.value) {
    ui.showToast({ message: `今日免费额度已用完 (${quota.quotaUsed.value}/${quota.quotaDaily.value})，明天自动重置`, type: 'error' });
    return;
  }
  const validation = remover.validateFile(file);
  if (!validation.valid) { ui.showToast({ message: validation.error, type: 'error' }); return; }

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

/** 多文件拖入 → 弹出选择对话框（批量 vs 逐张精修） */
function handleFilesSelected(files: File[]): void {
  if (files.length === 0) return;
  batchChoiceFiles.value = files;
  batchChoiceVisible.value = true;
}

/** 用户选择「批量快速处理」 */
function handleBatchChoiceQuick(): void {
  batchChoiceVisible.value = false;
  const added = batch.addFiles(batchChoiceFiles.value);
  if (added > 0) { viewMode.value = 'batch'; ui.showToast({ message: `已添加 ${added} 个文件`, type: 'success' }); }
}

/** 用户选择「逐张精修」：按顺序一张一张处理 */
async function handleBatchChoiceRefine(): void {
  batchChoiceVisible.value = false;
  const files = batchChoiceFiles.value;
  if (files.length === 0) return;
  if (quota.isExhausted.value) {
    ui.showToast({ message: `今日免费额度已用完 (${quota.quotaUsed.value}/${quota.quotaDaily.value})，明天自动重置`, type: 'error' });
    return;
  }
  ui.showToast({ message: `开始逐张处理 ${files.length} 张图片`, type: 'success' });
  let idx = 0;
  let errorCount = 0;
  const total = files.length;
  for (const file of files) {
    idx++;
    ui.showToast({ message: `正在处理第 ${idx}/${total} 张`, type: 'success' });
    const error = await remover.processImage(file);
    if (error) {
      errorCount++;
      ui.showToast({ message: `第 ${idx}/${total} 张处理失败: ${humanizeError(error)}`, type: 'error' });
      // 配额耗尽时中止后续
      if (remover.processing.status === 'error' && /已用完/.test(remover.processing.detail)) {
        ui.showToast({ message: `额度用完，已处理 ${idx}/${total} 张，${errorCount} 张失败`, type: 'error' });
        break;
      }
      continue;
    }
    if (remover.processing.status === 'done') {
      const resultBlob = remover.resultBlob.value;
      if (resultBlob) {
        await quota.afterSuccessfulRequest();
        const draftId = generateDraftId();
        const thumbUrl = await createThumbnail(resultBlob, 100);
        const origThumbUrl = await createThumbnail(file, 100);
        await drafts.add({
          id: draftId, filename: remover.resultFilename.value,
          thumbnailUrl: origThumbUrl, resultThumbUrl: thumbUrl,
          dimensions: remover.resultDimensions.value ?? { width: 0, height: 0 },
          modelUsed: remover.modelUsed.value, createdAt: Date.now(),
        }, resultBlob, file);
      }
    }
    remover.reset();
  }
  const doneCount = total - errorCount;
  ui.showToast({ message: `${total} 张图片处理完成 (${doneCount} 张成功${errorCount > 0 ? `, ${errorCount} 张失败` : ''})`, type: errorCount > 0 ? 'error' : 'success' });
}

/** 关闭批量选择对话框 */
function handleBatchChoiceCancel(): void {
  batchChoiceVisible.value = false;
  batchChoiceFiles.value = [];
}

async function doProcessFile(file: File): Promise<void> {
  selectedBgColor.value = 'transparent';
  currentDraftId.value = null;
  const error = await remover.processImage(file);
  if (error) { ui.showToast({ message: humanizeError(error), type: 'error' }); return; }
  if (remover.processing.status === 'done') {
    // 后台保存到草稿箱（不跳转）
    const draftId = generateDraftId();
    currentDraftId.value = draftId;
    const resultBlob = remover.resultBlob.value;
    if (!resultBlob) return;

    await quota.afterSuccessfulRequest();
    const thumbUrl = await createThumbnail(resultBlob, 100);
    const origThumbUrl = await createThumbnail(file, 100);

    await drafts.add({
      id: draftId, filename: remover.resultFilename.value,
      thumbnailUrl: origThumbUrl, resultThumbUrl: thumbUrl,
      dimensions: remover.resultDimensions.value ?? { width: 0, height: 0 },
      modelUsed: remover.modelUsed.value, createdAt: Date.now(),
    }, resultBlob, file);

    // 结果已在工作台展示，不跳转。展开历史面板。
    historyCollapsed.value = false;
    history.reload();
  }
}

// ---- 精修按钮：跳转到草稿详情页 ----
function handleRefine(): void {
  if (currentDraftId.value) {
    router.push(`/workspace/draft/${currentDraftId.value}`);
  }
}

// ---- 取消处理 ----
function handleCancelProcess(): void {
  remover.abortCurrent();
  doReset();
}

let draftIdCounter = 0;
function generateDraftId(): string { return `draft_${Date.now()}_${++draftIdCounter}`; }

async function handleLargeImageResize(): Promise<void> {
  const file = largeImageDialog.value.file; if (!file) return;
  largeImageDialog.value.resizing = true;
  try {
    const resized = await resizeImageClient(file, RECOMMENDED_MAX_DIM);
    const resizedFile = new File([resized], file.name.replace(/\.(\w+)$/, '_resized.$1') || file.name + '_resized', { type: 'image/jpeg' });
    largeImageDialog.value.visible = false;
    await doProcessFile(resizedFile);
  } catch (err) {
    const msg = humanizeError(err instanceof Error ? err.message : '图片缩放失败');
    largeImageDialog.value.visible = false;
    ui.showToast({ message: `${msg}，已取消处理`, type: 'error' });
    // 不静默使用原图——尊重用户选择
  } finally { largeImageDialog.value.resizing = false; }
}

async function handleLargeImageOriginal(): Promise<void> {
  const file = largeImageDialog.value.file; if (!file) return;
  largeImageDialog.value.visible = false;
  ui.showToast({ message: `原图较大（${formatFileSize(file.size)}），可能需要较长时间处理`, type: 'success' });
  await doProcessFile(file);
}

function handleLargeImageCancel(): void { largeImageDialog.value.visible = false; largeImageDialog.value.file = null; }

// ================================================================
//  批量 → 单图桥接
// ================================================================

async function handleBatchViewDetail(itemId: string): Promise<void> {
  const data = batch.getBatchResultData(itemId);
  if (!data) { ui.showToast({ message: '无法加载该结果', type: 'error' }); return; }
  const draftId = generateDraftId();
  const resultThumbUrl = await createThumbnail(data.resultBlob, 120);
  const origThumbUrl = await createThumbnail(data.file, 120);
  await drafts.add({
    id: draftId, filename: data.filename, thumbnailUrl: origThumbUrl, resultThumbUrl: resultThumbUrl,
    dimensions: data.dimensions, modelUsed: data.modelUsed, createdAt: Date.now(),
  }, data.resultBlob, data.file);
  router.push(`/workspace/draft/${draftId}`);
}

// ================================================================
//  返回上传 / 批量重置 / 重置
// ================================================================

async function handleBackToUpload(): Promise<void> {
  if (batch.isProcessing.value) { viewMode.value = 'single'; remover.reset(); ui.showToast({ message: '文件仍在后台处理中，完成后可在历史记录查看', type: 'success' }); return; }
  if (batch.phase.value === 'done') { viewMode.value = 'single'; remover.reset(); await Promise.all([history.reload(), quota.syncFromServer()]); return; }
  batch.destroy(); viewMode.value = 'single'; remover.reset();
}

function handleBatchReset(): void { batch.destroy(); viewMode.value = 'single'; remover.reset(); history.reload(); quota.syncFromServer(); }

function doReset(): void {
  remover.reset();
  activeHistoryId.value = null;
  viewMode.value = 'single';
  currentDraftId.value = null;
  selectedBgColor.value = 'transparent';
}

function onBatchProgressReturn(): void { viewMode.value = 'batch'; }

// ================================================================
//  其他事件处理
// ================================================================

async function handleRetry(): Promise<void> {
  const error = await remover.retryCurrentFile();
  if (error) { ui.showToast({ message: humanizeError(error), type: 'error' }); return; }
  if (remover.processing.status === 'done') {
    const resultBlob = remover.resultBlob.value; if (!resultBlob) return;
    await quota.afterSuccessfulRequest();
    const draftId = generateDraftId();
    currentDraftId.value = draftId;
    const thumbUrl = await createThumbnail(resultBlob, 100);
    const file = remover.currentFile.value;
    const origThumb = file ? await createThumbnail(file, 100) : thumbUrl;
    await drafts.add({
      id: draftId, filename: remover.resultFilename.value, thumbnailUrl: origThumb, resultThumbUrl: thumbUrl,
      dimensions: remover.resultDimensions.value ?? { width: 0, height: 0 },
      modelUsed: remover.modelUsed.value, createdAt: Date.now(),
    }, resultBlob, file ?? undefined);
    historyCollapsed.value = false;
    history.reload();
    ui.showToast({ message: '重试成功！', type: 'success' });
  }
}

function handleValidationError(error: string): void { ui.showToast({ message: humanizeError(error), type: 'error' }); }

// ---- 新用户引导 ----
function dismissOnboarding(): void {
  showOnboarding.value = false;
}

/** 点击示例图 → 隐藏示例栏 + 直接处理 */
async function handleExampleSelect(blob: Blob, filename: string): Promise<void> {
  showExamples.value = false;
  localStorage.setItem(EXAMPLES_KEY, '1');
  const file = new File([blob], filename, { type: 'image/png' });
  await handleFileSelected(file);
}

async function handleHistoryRestore(entry: HistoryEntry): Promise<void> {
  if (remover.processing.status !== 'idle') remover.reset();
  if (entry.status === 'blocked') {
    ui.showToast({ message: '该记录处理时额度不足，请等待配额重置后重试', type: 'error' });
    return;
  }
  try {
    ui.showToast({ message: '正在加载历史记录...', type: 'success' });
    const resultBlob = await historyApi.getResult(entry.id);
    if (!resultBlob || resultBlob.size === 0) { ui.showToast({ message: '历史记录文件已丢失，请重新上传', type: 'error' }); return; }
    const resultThumbUrl = await createThumbnail(resultBlob, 120);
    const draftId = generateDraftId();
    currentDraftId.value = draftId;
    // 将结果 Blob 保存到草稿箱
    await drafts.add({
      id: draftId, filename: entry.filename, thumbnailUrl: entry.originalThumb, resultThumbUrl: resultThumbUrl,
      dimensions: { width: entry.width, height: entry.height }, modelUsed: entry.modelUsed, createdAt: Date.now(),
    }, resultBlob);
      activeHistoryId.value = entry.id;

      // 历史恢复 → 在结果页展示（使用 restoreFromDraft 加载完整原图）
      selectedBgColor.value = 'transparent';
      const resultObjUrl = URL.createObjectURL(resultBlob);
      // 历史记录不存储全尺寸原图，使用结果图作为对比参考（远优于 120px 缩略图）
      remover.restoreFromDraft({
        resultUrl: resultObjUrl,
        resultBlob: resultBlob,
        originalUrl: resultObjUrl,
        filename: entry.filename,
        dimensions: { width: entry.width, height: entry.height },
        modelUsed: entry.modelUsed,
      });
      historyCollapsed.value = true;
      ui.showToast({ message: `已恢复: ${entry.filename}`, type: 'success' });
    } catch (err) {
    if (import.meta.env.DEV) {
      console.error('History restore error:', err);
    }
    ui.showToast({ message: humanizeError(err instanceof Error ? err.message : '加载历史记录失败'), type: 'error' });
  }
}

/** blocked 记录重试：引导用户重新上传并从历史中移除该条目 */
function handleRetryBlocked(entryId: number): void {
  history.remove(entryId);
  ui.showToast({ message: '请重新上传图片', type: 'success' });
  doReset();
}

// ---- 粘贴上传 ----
async function onPaste(event: ClipboardEvent): Promise<void> {
  const clipboardItems = event.clipboardData?.items; if (!clipboardItems) return;
  for (const item of clipboardItems) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile(); if (!file) return;
      const validation = remover.validateFile(file);
      if (!validation.valid) { ui.showToast({ message: validation.error, type: 'error' }); return; }
      await handleFileSelected(file);
      break;
    }
  }
}
</script>

<style scoped>
.app { min-height: 100vh; display: flex; flex-direction: column; }
.main { flex: 1; padding-bottom: 48px; }
.result-wrapper { display: flex; flex-direction: column; }

/* ---- 处理中顶部栏 ---- */
.processing-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.processing-label { font-size: 14px; font-weight: 600; color: #6366f1; }
.btn-cancel-process {
  padding: 8px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel-process:hover { background: #fef2f2; border-color: #fca5a5; color: #ef4444; }

.processing-section { max-width: 720px; margin: 0 auto; }

/* ---- DONE：结果直出工作台 ---- */
.done-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.btn-back-upload {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 10px;
  background: #fff; color: #6b7280; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all .2s;
  flex-shrink: 0;
}
.btn-back-upload:hover { background: #f9fafb; border-color: #d1d5db; color: #374151; }

.done-file-info {
  display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
}
.done-filename { font-size: 14px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.done-dims { font-size: 12px; font-weight: 500; color: #059669; background: #ecfdf5; padding: 3px 10px; border-radius: 8px; white-space: nowrap; }
.done-model-chip { font-size: 12px; font-weight: 500; color: #7c3aed; background: #f5f3ff; padding: 3px 10px; border-radius: 8px; white-space: nowrap; }

.btn-refine {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border: none; border-radius: 10px;
  background: #6366f1; color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .2s; flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(99,102,241,.3);
}
.btn-refine:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,.4); }

.done-preview-area { max-width: 800px; margin: 0 auto 16px; }

.done-tools {
  display: flex; gap: 16px; max-width: 800px; margin: 0 auto; flex-wrap: wrap;
}

/* ---- 历史面板可折叠 ---- */
.history-wrapper { margin-top: 28px; }
.history-toggle {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 14px 18px; border: none; border-radius: 16px 16px 0 0;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06);
  cursor: pointer; transition: background .15s;
}
.history-toggle:hover { background: #f9fafb; }
.history-toggle-left { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #6b7280; }
.history-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; font-size: 11px; font-weight: 600; color: #6366f1; background: #eef2ff; border-radius: 10px; }
.history-toggle-arrow { color: #9ca3af; transition: transform .25s ease; }
.history-toggle-arrow.collapsed { transform: rotate(-90deg); }

/* 折叠动画 */
.collapse-enter-active, .collapse-leave-active { transition: all .25s ease; overflow: hidden; }
.collapse-enter-from, .collapse-leave-to { opacity: 0; max-height: 0; }
.collapse-enter-to, .collapse-leave-from { opacity: 1; max-height: 500px; }

/* ---- 错误卡片 ---- */
.error-card {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: #fff; border: 1px solid #fee2e2; border-radius: 16px;
  padding: 28px 24px; margin-bottom: 24px; text-align: center;
  max-width: 520px; margin-inline: auto;
}
.error-icon { flex-shrink: 0; }
.error-content { max-width: 420px; }
.error-title { font-size: 16px; font-weight: 600; color: #991b1b; margin: 0 0 6px; }
.error-detail { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; word-break: break-word; }
.error-actions { display: flex; gap: 10px; margin-top: 4px; }
.quota-error-tip { font-size: 12px; color: #9ca3af; margin: 0; }

.btn-retry {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 20px; border: none; border-radius: 10px;
  background: #6366f1; color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background .2s;
}
.btn-retry:hover { background: #4f46e5; }

.btn-new-upload {
  padding: 10px 20px; border: 1px solid #d1d5db; border-radius: 10px;
  background: #fff; color: #374151; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all .2s;
}
.btn-new-upload:hover { background: #f9fafb; border-color: #9ca3af; }

/* ---- 配额耗尽 ---- */
.quota-exhausted-card {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  background: #fff; border: 1px solid #fde68a; border-radius: 16px;
  padding: 32px 24px; margin-bottom: 24px; text-align: center;
  max-width: 520px; margin-inline: auto;
}
.quota-exhausted-icon { flex-shrink: 0; }
.quota-exhausted-title { font-size: 17px; font-weight: 700; color: #92400e; margin: 0; }
.quota-exhausted-desc { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; max-width: 360px; }
.quota-exhausted-tip { font-size: 12px; color: #9ca3af; margin: 0; }
.quota-exhausted-actions { display: flex; gap: 10px; margin-top: 4px; }

.btn-upgrade-pro {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.35);
}
.btn-upgrade-pro:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
}
.btn-upgrade-pro:active {
  transform: translateY(0);
}

.btn-upgrade-pro-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}
.btn-upgrade-pro-inline:hover {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* ---- 批量返回 ---- */
.back-row { margin-bottom: 16px; }
.btn-back-mode {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 10px;
  background: #fff; color: #6b7280; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all .2s;
}
.btn-back-mode:hover { background: #f9fafb; color: #374151; border-color: #d1d5db; }

/* ---- 新增：新用户引导横幅 ---- */
.onboarding-banner {
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
  border: 1px solid #d4d4f7;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
.onboarding-content {
  display: flex; align-items: center; gap: 10px;
}
.onboarding-icon { font-size: 22px; flex-shrink: 0; }
.onboarding-text {
  display: flex; flex-direction: column; gap: 2px;
  flex: 1; min-width: 0;
}
.onboarding-text strong { font-size: 13px; color: #4f46e5; }
.onboarding-text span { font-size: 12px; color: #6b7280; }
.onboarding-close {
  flex-shrink: 0;
  width: 26px; height: 26px;
  border: none; border-radius: 50%;
  background: rgba(99,102,241,.1);
  color: #6366f1; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.onboarding-close:hover { background: rgba(99,102,241,.2); }

.onboarding-fade-enter-active { transition: all .4s ease; }
.onboarding-fade-leave-active { transition: all .2s ease; }
.onboarding-fade-enter-from { opacity: 0; transform: translateY(-8px); }
.onboarding-fade-leave-to { opacity: 0; }

/* ---- 新增：批量模式选择对话框 ---- */
.batch-choice-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.batch-choice-dialog {
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px;
  max-width: 440px; width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
}
.batch-choice-icon { margin-bottom: 12px; color: #6366f1; }
.batch-choice-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 4px; }
.batch-choice-desc { font-size: 13px; color: #6b7280; margin: 0 0 20px; }
.batch-choice-actions { display: flex; flex-direction: column; gap: 10px; }
.batch-choice-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 16px 18px;
  border-radius: 14px; cursor: pointer;
  transition: all .2s; text-align: left;
}
.batch-choice-primary {
  border: 2px solid #6366f1;
  background: #eef2ff;
  color: #4f46e5;
}
.batch-choice-primary:hover { background: #e0e7ff; border-color: #4f46e5; }
.batch-choice-secondary {
  border: 2px solid #e5e7eb;
  background: #fff;
  color: #374151;
}
.batch-choice-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
.batch-choice-label {
  display: flex; flex-direction: column; gap: 2px;
}
.batch-choice-label strong { font-size: 14px; }
.batch-choice-label small { font-size: 12px; color: inherit; opacity: .7; }

.modal-fade-enter-active { transition: all .25s ease; }
.modal-fade-leave-active { transition: all .15s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .batch-choice-dialog { transform: scale(.95); }

/* ---- 响应式 ---- */
@media (max-width: 640px) {
  .main { padding-bottom: 32px; }
  .done-top-bar { padding: 10px 12px; gap: 8px; border-radius: 12px; }
  .btn-back-upload { padding: 6px 12px; font-size: 12px; }
  .btn-refine { padding: 6px 14px; font-size: 12px; }
  .done-filename { font-size: 13px; max-width: 120px; }
  .done-dims, .done-model-chip { font-size: 11px; padding: 2px 8px; }
  .done-tools { flex-direction: column; gap: 12px; }
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
  .done-top-bar { flex-direction: column; align-items: stretch; gap: 8px; }
  .done-file-info { justify-content: center; }
  .error-actions { flex-direction: column; width: 100%; }
  .btn-retry, .btn-new-upload { width: 100%; }
}

/* 动画 */
.section-fade-enter-active, .section-fade-leave-active { transition: opacity .3s ease; }
.section-fade-enter-from, .section-fade-leave-to { opacity: 0; }
</style>
