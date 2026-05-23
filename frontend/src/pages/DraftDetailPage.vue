<template>
  <div class="app">
    <AppHeader @open-auth="ui.openAuthModal()" />

    <main class="main">
      <div class="container">
        <!-- 顶部导航 -->
        <div class="detail-header">
          <button class="btn-back" @click="handleBack">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            返回工作台
          </button>
          <span class="draft-filename">{{ remover.resultFilename.value }}</span>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="loading-state">
          <div class="home-spinner"></div>
          <p>正在加载草稿...</p>
        </div>

        <!-- 已加载 -->
        <template v-else>
          <div class="result-wrapper">
            <div class="result-layout">
              <!-- 预览区 -->
              <div class="preview-col">
                <PreviewGrid
                  :original-url="remover.originalUrl.value"
                  :result-url="remover.resultUrl.value"
                  :bg-color="remover.currentBgColor.value"
                  :processing="remover.processing"
                  :result-dimensions="remover.resultDimensions.value"
                  :model-used="remover.modelUsed.value"
                  :hide-compare="!hasOriginal"
                />
              </div>

              <!-- 工具面板 -->
              <div class="tools-col">
                <!-- 确认 & 下载 操作区 -->
                <div class="action-card">
                  <h4 class="action-title">操作</h4>
                  <div class="action-buttons">
                    <button class="btn-confirm" @click="handleConfirm" :disabled="confirming">
                      <svg v-if="!confirming" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span v-else class="mini-spinner"></span>
                      {{ confirming ? '确认中...' : '确认完成' }}
                    </button>
                    <button
                      class="btn-delete-detail"
                      :class="{ 'delete-confirm': showDeleteConfirm }"
                      @click="handleDelete"
                      :disabled="deleting"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                      {{ showDeleteConfirm ? '确认删除?' : '删除草稿' }}
                    </button>
                  </div>
                  <p class="action-hint">确认后将保存到历史并从本页移除，未确认的草稿不会出现在历史记录中。</p>
                </div>

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
        </template>
      </div>
    </main>

    <AppFooter />
    <ToastMessage :toast="ui.toast" />
    <AuthModal :visible="ui.authModalVisible" @close="ui.closeAuthModal()" />

    <!-- 离开确认对话框 -->
    <Transition name="modal-fade">
      <div v-if="showLeaveConfirm" class="modal-overlay" @click.self="handleCancelLeave">
        <div class="leave-confirm-dialog">
          <div class="leave-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 9v2m0 4h.01"/>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h3 class="leave-title">你有未保存的编辑</h3>
          <p class="leave-desc">
            你对图片做了修改（如背景色、模板、边缘编辑），离开本页将丢失这些修改。
          </p>
          <div class="leave-actions">
            <button class="btn-leave-save" @click="handleLeaveWithSaving" :disabled="confirming">
              <template v-if="!confirming">保存并返回</template>
              <span v-else class="mini-spinner"></span>
            </button>
            <button class="btn-leave-discard" @click="handleLeaveWithoutSaving" :disabled="confirming">
              放弃编辑
            </button>
            <button class="btn-leave-cancel" @click="handleCancelLeave">
              继续编辑
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import ToastMessage from '@/components/ToastMessage.vue';
import PreviewGrid from '@/components/PreviewGrid.vue';
import BackgroundColorPicker from '@/components/BackgroundColorPicker.vue';
import BackgroundTemplatePicker from '@/components/BackgroundTemplatePicker.vue';
import EdgeToolsPanel from '@/components/EdgeToolsPanel.vue';
import DownloadPanel from '@/components/DownloadPanel.vue';
import AuthModal from '@/components/AuthModal.vue';
import { useBackgroundRemover } from '@/composables/useBackgroundRemover';
import { useHistory } from '@/composables/useHistory';
import { useQuota } from '@/composables/useQuota';
import { useUiStore } from '@/stores/ui';
import { useDraftsStore } from '@/stores/drafts';
import type { BgColor } from '@/types';

const route = useRoute();
const router = useRouter();
const remover = useBackgroundRemover();
const history = useHistory();
const quota = useQuota();
const ui = useUiStore();
const drafts = useDraftsStore();

const loading = ref(true);
const confirming = ref(false);
const deleting = ref(false);
const hasOriginal = ref(true);

/** 跟踪是否有未保存的编辑 */
const hasUnsavedEdits = ref(false);
/** 离开确认对话框 */
const showLeaveConfirm = ref(false);

/** 跟踪本组件创建的 Object URL，组件卸载时统一回收 */
const trackedUrls: string[] = [];

function trackUrl(url: string): string {
  trackedUrls.push(url);
  return url;
}

function releaseAllUrls(): void {
  for (const url of trackedUrls) {
    URL.revokeObjectURL(url);
  }
  trackedUrls.length = 0;
}

/** 从 IndexedDB 加载草稿数据并初始化 remover */
onMounted(async () => {
  // 确保元数据已从 IndexedDB 加载
  await drafts.init();

  const draftId = route.params.id as string | undefined;
  if (!draftId) {
    ui.showToast({ message: '草稿 ID 无效', type: 'error' });
    router.replace('/workspace');
    return;
  }

  // 查找草稿元数据
  const draftMeta = drafts.items.find((d) => d.id === draftId);
  if (!draftMeta) {
    ui.showToast({ message: '草稿不存在或已被删除', type: 'error' });
    router.replace('/workspace');
    return;
  }

  // 从 IndexedDB 加载 Blob
  const [resultBlob, originalBlob] = await Promise.all([
    drafts.getResultBlob(draftId),
    drafts.getOriginalBlob(draftId),
  ]);

  if (!resultBlob) {
    ui.showToast({ message: '草稿数据丢失，请重新上传', type: 'error' });
    drafts.remove(draftId);
    router.replace('/workspace');
    return;
  }

  // 原图丢失时提示用户（对比功能将禁用）
  hasOriginal.value = !!originalBlob;
  if (!hasOriginal.value) {
    ui.showToast({
      message: '原始图片数据已丢失，对比功能已禁用',
      type: 'error',
    });
  }

  // 创建 Object URLs（track 以便卸载时自动回收）
  const resultUrl = trackUrl(URL.createObjectURL(resultBlob));
  const originalUrl = hasOriginal.value
    ? trackUrl(URL.createObjectURL(originalBlob!))
    : '';

  // 恢复状态到 remover
  // N3: originalBlob 不在 restoreFromDraft 签名中，移除冗余参数
  remover.restoreFromDraft({
    resultUrl,
    resultBlob,
    originalUrl,
    filename: draftMeta.filename,
    dimensions: draftMeta.dimensions,
    modelUsed: draftMeta.modelUsed,
  });

  loading.value = false;
});

onUnmounted(() => {
  releaseAllUrls();
  remover.reset();
});

/** 确认完成 → 删除草稿 → 返回工作台（携带 confirmed 参数触发历史刷新） */
async function handleConfirm(): Promise<void> {
  confirming.value = true;
  const draftId = route.params.id as string;
  try {
    // K7: 跳过 updateResult — 即将删除草稿，无需保存
    // 同步配额
    await quota.syncFromServer();
    hasUnsavedEdits.value = false;
    ui.showToast({ message: '已确认完成，保存到处理历史', type: 'success' });
    // K6: 先跳转再删草稿（避免 router 失败导致草稿永久丢失）
    router.replace({ path: '/workspace', query: { confirmed: '1' } });
    await drafts.remove(draftId);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Confirm error:', err);
    }
    ui.showToast({ message: '确认失败，请重试', type: 'error' });
  } finally {
    confirming.value = false;
  }
}

/** 删除草稿 - 含确认防误触 */
const showDeleteConfirm = ref(false);

async function handleDelete(): Promise<void> {
  if (!showDeleteConfirm.value) {
    showDeleteConfirm.value = true;
    return;
  }
  // 二次确认后执行删除
  deleting.value = true;
  try {
    const draftId = route.params.id as string;
    await drafts.remove(draftId);
    releaseAllUrls();
    ui.showToast({ message: '草稿已删除', type: 'success' });
    router.replace('/workspace');
  } catch (err) {
    ui.showToast({ message: '删除失败，请重试', type: 'error' });
  } finally {
    deleting.value = false;
    showDeleteConfirm.value = false;
  }
}

/** 返回工作台（保留草稿） */
function handleBack(): void {
  if (hasUnsavedEdits.value) {
    showLeaveConfirm.value = true;
    return;
  }
  router.push('/workspace');
}

/** 放弃编辑并返回 */
function handleLeaveWithoutSaving(): void {
  showLeaveConfirm.value = false;
  router.push('/workspace');
}

/** 保存并返回 */
function handleLeaveWithSaving(): void {
  showLeaveConfirm.value = false;
  handleConfirm();
}

/** 取消离开 */
function handleCancelLeave(): void {
  showLeaveConfirm.value = false;
}

// ---- 编辑工具事件 ----
async function handleBgColorChange(color: BgColor): Promise<void> {
  const err = await remover.applyBackgroundColor(color);
  if (err) ui.showToast({ message: err, type: 'error' });
  else hasUnsavedEdits.value = true;
}

async function handleTemplateChange(templateId: string | null): Promise<void> {
  const err = await remover.applyTemplate(templateId);
  if (err) ui.showToast({ message: err, type: 'error' });
  else hasUnsavedEdits.value = true;
}

function handleEdgeUpdate(blob: Blob): void {
  remover.updateTransparentBlob(blob);
  hasUnsavedEdits.value = true;
}

function handleEdgeReset(): void {
  remover.resetEdgeEdits();
  // 注意：不重置 hasUnsavedEdits，因为用户可能同时修改了背景色/模板
  // 边缘情况的误报（仅做了边缘修改并重置）比漏报（数据丢失）更安全
  ui.showToast({ message: '已撤销边缘修改', type: 'success' });
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

.detail-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.btn-back {
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
  text-decoration: none;
  transition: all 0.2s;
  flex-shrink: 0;
}
.btn-back:hover { background: #f9fafb; color: #374151; }

.draft-filename {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 加载 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  color: #6b7280;
  font-size: 14px;
}
.home-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 布局 */
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

/* 操作卡片 */
.action-card {
  background: #fff;
  border: 1.5px solid #d1d5db;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-confirm {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #10b981;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-confirm:hover:not(:disabled) { background: #059669; }
.btn-confirm:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-delete-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-delete-detail:hover:not(:disabled) { background: #fef2f2; }
.btn-delete-detail.delete-confirm { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
.btn-delete-detail:disabled { opacity: 0.6; cursor: not-allowed; }

.action-hint {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.4;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

/* 响应式 */
@media (max-width: 900px) {
  .result-layout { grid-template-columns: 1fr; gap: 20px; }
  .preview-col { position: static; }
  .tools-col { gap: 14px; }
}

@media (max-width: 480px) {
  .main { padding-bottom: 20px; }
  .result-layout { gap: 10px; }
  .tools-col { gap: 8px; }
  .action-buttons { flex-direction: column; }
}

/* 离开确认对话框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.leave-confirm-dialog {
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px 24px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16);
}

.leave-icon {
  color: #f59e0b;
  margin-bottom: 12px;
}

.leave-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.leave-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 24px;
  line-height: 1.5;
}

.leave-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-leave-save {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #10b981;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-leave-save:hover:not(:disabled) { background: #059669; }
.btn-leave-save:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-leave-discard {
  padding: 10px 24px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fff;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-leave-discard:hover:not(:disabled) { background: #fef2f2; }
.btn-leave-discard:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-leave-cancel {
  padding: 10px 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-leave-cancel:hover { background: #f9fafb; }

/* 模态框动画 */
.modal-fade-enter-active { transition: all 0.2s ease; }
.modal-fade-leave-active { transition: all 0.15s ease-in; }
.modal-fade-enter-from { opacity: 0; }
.modal-fade-enter-from .leave-confirm-dialog { transform: scale(0.95) translateY(8px); }
.modal-fade-leave-to { opacity: 0; }
</style>
