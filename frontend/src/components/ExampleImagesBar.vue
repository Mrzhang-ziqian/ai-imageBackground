<template>
  <Transition name="example-fade">
    <section v-if="visible && examples.length > 0" class="example-bar">
      <div class="example-header">
        <span class="example-icon">🎨</span>
        <span class="example-title">试试示例图片</span>
        <span class="example-sub">选择一张开始体验</span>
      </div>
      <div class="example-cards">
        <button
          v-for="ex in examples"
          :key="ex.id"
          class="example-card"
          @click="onSelect(ex)"
        >
          <div class="example-thumb-wrap">
            <img :src="ex.thumbUrl" :alt="ex.title" class="example-thumb" loading="eager" />
            <div class="example-overlay">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
          <div class="example-info">
            <span class="example-name">{{ ex.title }}</span>
            <span class="example-desc">{{ ex.description }}</span>
          </div>
        </button>
      </div>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getExampleImages, revokeExampleThumbUrls } from '@/utils/exampleImages';
import type { ExampleImage } from '@/utils/exampleImages';

const emit = defineEmits<{
  (e: 'select', blob: Blob, filename: string): void;
}>();

const examples = ref<ExampleImage[]>([]);
const visible = ref(false);

onMounted(async () => {
  try {
    examples.value = await getExampleImages();
    // 延迟一帧显示，确保动画触发
    requestAnimationFrame(() => {
      visible.value = true;
    });
  } catch {
    // 生成失败则静默隐藏
  }
});

onUnmounted(() => {
  revokeExampleThumbUrls(examples.value);
});

function onSelect(ex: ExampleImage): void {
  emit('select', ex.blob, ex.filename);
}
</script>

<style scoped>
.example-bar {
  background: linear-gradient(135deg, #fafafe 0%, #f5f3ff 100%);
  border: 1px solid #e0e0f0;
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 20px;
}

.example-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.example-icon {
  font-size: 20px;
}

.example-title {
  font-size: 14px;
  font-weight: 700;
  color: #4f46e5;
}

.example-sub {
  font-size: 12px;
  color: #9ca3af;
  margin-left: auto;
}

.example-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.example-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  flex: 1;
}

.example-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);
  transform: translateY(-2px);
}

.example-card:active {
  transform: translateY(0);
}

.example-thumb-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  background: #f3f4f6;
}

.example-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.example-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0);
  color: transparent;
  transition: all 0.2s;
  border-radius: 10px;
}

.example-card:hover .example-overlay {
  background: rgba(99, 102, 241, 0.25);
  color: #fff;
}

.example-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.example-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.example-desc {
  font-size: 11px;
  color: #9ca3af;
}

/* fade + slide 动画 */
.example-fade-enter-active {
  transition: all 0.45s ease;
}

.example-fade-leave-active {
  transition: all 0.2s ease;
}

.example-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.example-fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .example-bar {
    padding: 14px 12px;
    border-radius: 12px;
  }
  .example-cards {
    gap: 8px;
  }
  .example-card {
    padding: 8px;
    min-width: 100px;
    border-radius: 10px;
  }
  .example-thumb-wrap {
    width: 60px;
    height: 60px;
    border-radius: 8px;
  }
  .example-name {
    font-size: 11px;
  }
  .example-desc {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .example-cards {
    flex-direction: column;
  }
  .example-card {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }
  .example-thumb-wrap {
    width: 48px;
    height: 48px;
  }
}
</style>
