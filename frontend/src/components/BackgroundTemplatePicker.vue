<template>
  <div class="template-section">
    <div class="template-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
      <span class="template-title">背景模板</span>
      <span v-if="loading" class="loading-chip">生成预览中...</span>
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-tab"
        :class="{ active: activeCategory === cat }"
        @click="activeCategory = cat"
      >
        {{ cat }}
        <span class="tab-count">{{ countByCategory(cat) }}</span>
      </button>
    </div>

    <!-- 模板卡片网格 -->
    <div class="template-grid">
      <button
        v-for="tpl in filteredTemplates"
        :key="tpl.id"
        class="template-card"
        :class="{ active: modelValue === tpl.id }"
        @click="selectTemplate(tpl.id)"
      >
        <!-- 缩略图预览区 -->
        <div
          class="card-preview"
          :class="{ 'has-thumb': thumbnails[tpl.id] }"
          :style="thumbnails[tpl.id] ? undefined : tpl.previewStyle"
        >
          <img
            v-if="thumbnails[tpl.id]"
            :src="thumbnails[tpl.id]"
            class="thumb-img"
            alt=""
          />
          <!-- 阴影指示器（仅电商类） -->
          <div v-if="tpl.shadow && !thumbnails[tpl.id]" class="shadow-indicator">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" opacity="0.3"/>
              <circle cx="12" cy="12" r="6" opacity="0.6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <!-- 选中标记 -->
          <div v-if="modelValue === tpl.id" class="active-check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
        <span class="card-name">{{ tpl.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { TemplateCategory } from '@/types';
import { BACKGROUND_TEMPLATES } from '@/types';
import { renderTemplateThumbnail } from '@/composables/useTemplateRenderer';

const props = defineProps<{
  modelValue: string | null;
  subjectBlob: Blob | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const categories: TemplateCategory[] = ['电商', '渐变', '场景'];
const activeCategory = ref<TemplateCategory>('电商');
const thumbnails = ref<Record<string, string>>({});
const loading = ref(false);

const filteredTemplates = computed(() =>
  BACKGROUND_TEMPLATES.filter((t) => t.category === activeCategory.value),
);

function countByCategory(cat: TemplateCategory): number {
  return BACKGROUND_TEMPLATES.filter((t) => t.category === cat).length;
}

function selectTemplate(id: string): void {
  // 点击已选中则取消选中（回到无模板状态）
  emit('update:modelValue', props.modelValue === id ? null : id);
}

// 当主体图片变化时，生成缩略图
async function generateThumbnails(): Promise<void> {
  if (!props.subjectBlob) return;
  loading.value = true;
  const results: Record<string, string> = {};

  for (const tpl of BACKGROUND_TEMPLATES) {
    try {
      const dataUrl = await renderTemplateThumbnail(props.subjectBlob, tpl, 120);
      results[tpl.id] = dataUrl;
    } catch {
      // 缩略图生成失败则使用 CSS 预览
    }
  }

  thumbnails.value = results;
  loading.value = false;
}

watch(
  () => props.subjectBlob,
  (blob) => {
    if (blob) {
      generateThumbnails();
    } else {
      thumbnails.value = {};
    }
  },
  { immediate: false },
);

onMounted(() => {
  if (props.subjectBlob) {
    generateThumbnails();
  }
});
</script>

<style scoped>
.template-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
  padding: 18px 20px;
}

.template-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #6b7280;
}

.template-title {
  font-size: 14px;
  font-weight: 600;
}

.loading-chip {
  margin-left: auto;
  font-size: 11px;
  color: #6366f1;
  background: #eef2ff;
  padding: 3px 10px;
  border-radius: 20px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---- 分类标签 ---- */
.category-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.category-tabs::-webkit-scrollbar { display: none; }

.category-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-tab:hover {
  border-color: #d1d5db;
  color: #374151;
}

.category-tab.active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4f46e5;
  font-weight: 600;
}

.tab-count {
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 1px 7px;
  border-radius: 10px;
}

.category-tab.active .tab-count {
  background: #c7d2fe;
  color: #4f46e5;
}

/* ---- 模板卡片网格 ---- */
.template-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 600px) {
  .template-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 14px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-card:hover .card-preview {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-card.active {
  border-color: #6366f1;
}

.card-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
}

.template-card.active .card-preview {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 阴影指示器（无缩略图时显示） */
.shadow-indicator {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.3);
}

/* 选中勾选标记 */
.active-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6366f1;
  border-radius: 50%;
  color: #fff;
}

.card-name {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.template-card.active .card-name {
  color: #4f46e5;
  font-weight: 600;
}
</style>
