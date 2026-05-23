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
                    <button class="btn-delete-detail" @click="handleDelete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                      删除草稿
                    </button>
                  </div>
                  <p class="action-hint">确认后将保存到处理历史，未确认的草稿不会出现在历史记录中。</p>
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

  // 创建 Object URLs
  const resultUrl = URL.createObjectURL(resultBlob);
  const originalUrl = originalBlob ? URL.createObjectURL(originalBlob) : resultUrl;

  // 恢复状态到 remover（跳过"restoreFromHistory"，手动设置）
  remover.restoreFromDraft?.({
    resultUrl,
    resultBlob,
    originalUrl,
    originalBlob,
    filename: draftMeta.filename,
    dimensions: draftMeta.dimensions,
    modelUsed: draftMeta.modelUsed,
  });

  // 如果 restoreFromDraft 不存在，用公开方法
  loading.value = false;
});

onUnmounted(() => {
  // 页面卸载时清理 Object URLs（remover.reset 会处理）
});

/** 确认完成 → 删除草稿 → 返回工作台（携带 confirmed 参数触发历史刷新） */
async function handleConfirm(): Promise<void> {
  confirming.value = true;
  try {
    // 保存当前的编辑结果到草稿（确保 IndexedDB 存储了最新版本）
    const draftId = route.params.id as string;
    if (remover.resultBlob.value) {
      await drafts.updateResult(draftId, remover.resultBlob.value);
    }
    // 同步配额
    await quota.syncFromServer();
    // 从草稿箱移除
    await drafts.remove(draftId);
    ui.showToast({ message: '已确认完成，保存到处理历史', type: 'success' });
    // 携带 confirmed 参数，WorkspacePage 检测后刷新历史
    router.replace({ path: '/workspace', query: { confirmed: '1' } });
  } catch (err) {
    console.error('Confirm error:', err);
    ui.showToast({ message: '确认失败，请重试', type: 'error' });
  } finally {
    confirming.value = false;
  }
}

/** 删除草稿 */
async function handleDelete(): Promise<void> {
  const draftId = route.params.id as string;
  await drafts.remove(draftId);
  ui.showToast({ message: '草稿已删除', type: 'success' });
  router.replace('/workspace');
}

/** 返回工作台（保留草稿） */
function handleBack(): void {
  router.push('/workspace');
}

// ---- 编辑工具事件 ----
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
.btn-delete-detail:hover { background: #fef2f2; }

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
</style>
