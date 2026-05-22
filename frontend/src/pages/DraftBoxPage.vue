<template>
  <div class="draft-page">
    <AppHeader @open-auth="ui.openAuthModal()" />

    <main class="main">
      <div class="container">
        <!-- 顶部导航 -->
        <div class="draft-header">
          <router-link to="/workspace" class="btn-back-workspace">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            返回工作台
          </router-link>
          <div class="draft-title-row">
            <h1 class="draft-title">草稿箱</h1>
            <span class="draft-count" v-if="drafts.count > 0">{{ drafts.count }} 个草稿</span>
          </div>
          <button v-if="drafts.count > 0" class="btn-clear-drafts" @click="handleClearAll">
            清空草稿箱
          </button>
        </div>

        <!-- 空状态 -->
        <div v-if="drafts.count === 0" class="empty-state">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect x="10" y="10" width="36" height="36" rx="6" stroke="#d1d5db" stroke-width="1.5" fill="#f9fafb"/>
            <path d="M22 26h12M22 31h8" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <h3>暂无草稿</h3>
          <p>处理完成的图片会自动存入草稿箱</p>
          <router-link to="/workspace" class="btn-go-workspace">去工作台处理图片</router-link>
        </div>

        <!-- 草稿网格 -->
        <div v-else class="draft-grid">
          <div v-for="draft in drafts.items" :key="draft.id" class="draft-card">
            <div class="draft-preview">
              <img :src="draft.resultThumbUrl || draft.thumbnailUrl" alt="" />
              <div class="draft-overlay">
                <button class="btn-confirm" @click="handleConfirm(draft)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  确认完成
                </button>
              </div>
            </div>
            <div class="draft-meta">
              <span class="draft-name">{{ draft.filename }}</span>
              <span class="draft-dims">{{ draft.dimensions.width }} × {{ draft.dimensions.height }}</span>
            </div>
            <div class="draft-actions">
              <button class="btn-download-draft" @click="handleDownload(draft)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                下载
              </button>
              <button class="btn-delete-draft" @click="handleDelete(draft.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <AppFooter />
    <ToastMessage :toast="ui.toast" />
    <AuthModal :visible="ui.authModalVisible" @close="ui.closeAuthModal()" />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import ToastMessage from '@/components/ToastMessage.vue';
import AuthModal from '@/components/AuthModal.vue';
import { useDraftsStore, type Draft } from '@/stores/drafts';
import { useUiStore } from '@/stores/ui';

const drafts = useDraftsStore();
const ui = useUiStore();

async function handleConfirm(draft: Draft): Promise<void> {
  const blob = await drafts.getBlob(draft.id);
  if (!blob) {
    ui.showToast({ message: '草稿数据丢失，请重新上传', type: 'error' });
    return;
  }
  // 下载
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = draft.filename;
  a.click();
  URL.revokeObjectURL(a.href);
  // 移除草稿
  await drafts.remove(draft.id);
  ui.showToast({ message: `已确认: ${draft.filename}`, type: 'success' });
}

async function handleDownload(draft: Draft): Promise<void> {
  const blob = await drafts.getBlob(draft.id);
  if (!blob) {
    ui.showToast({ message: '数据不可用', type: 'error' });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = draft.filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function handleDelete(id: string): Promise<void> {
  await drafts.remove(id);
  ui.showToast({ message: '草稿已删除', type: 'success' });
}

async function handleClearAll(): Promise<void> {
  await drafts.clearAll();
  ui.showToast({ message: '草稿箱已清空', type: 'success' });
}
</script>

<style scoped>
.draft-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  padding-bottom: 48px;
}

.draft-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn-back-workspace {
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
}
.btn-back-workspace:hover { background: #f9fafb; color: #374151; }

.draft-title-row {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.draft-title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.draft-count {
  font-size: 13px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 3px 10px;
  border-radius: 20px;
}

.btn-clear-drafts {
  padding: 8px 16px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear-drafts:hover { background: #fef2f2; }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  gap: 12px;
}
.empty-state h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}
.empty-state p {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}
.btn-go-workspace {
  display: inline-flex;
  align-items: center;
  padding: 10px 22px;
  border: none;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  margin-top: 8px;
  transition: background 0.2s;
}
.btn-go-workspace:hover { background: #4f46e5; }

/* 草稿网格 */
.draft-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.draft-card {
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.2s;
}
.draft-card:hover { border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.draft-preview {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background:
    linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.draft-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.draft-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.45);
  opacity: 0;
  transition: opacity 0.2s;
}
.draft-card:hover .draft-overlay { opacity: 1; }

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: #10b981;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-confirm:hover { background: #059669; }

.draft-meta {
  padding: 10px 12px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.draft-name {
  font-size: 12px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.draft-dims {
  font-size: 11px;
  color: #9ca3af;
}

.draft-actions {
  display: flex;
  gap: 6px;
  padding: 6px 12px 12px;
}
.btn-download-draft {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  padding: 7px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  justify-content: center;
  transition: all 0.15s;
}
.btn-download-draft:hover { background: #eef2ff; color: #6366f1; border-color: #c7d2fe; }

.btn-delete-draft {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #d1d5db;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-delete-draft:hover { color: #ef4444; background: #fef2f2; border-color: #fecaca; }

@media (max-width: 900px) {
  .draft-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .draft-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .draft-header { gap: 10px; }
  .draft-title { font-size: 18px; }
}
</style>
