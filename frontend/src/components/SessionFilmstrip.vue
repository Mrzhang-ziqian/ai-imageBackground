<template>
  <div v-if="items.length > 1" class="session-filmstrip">
    <div class="filmstrip-header">
      <span class="filmstrip-label">当前会话 · {{ items.length }} 张</span>
    </div>
    <div class="filmstrip-track">
      <div
        v-for="item in items"
        :key="item.id"
        class="filmstrip-item"
        :class="{ active: item.id === activeId }"
        @click="$emit('select', item.id)"
        :title="item.filename"
      >
        <div class="filmstrip-thumb">
          <img
            v-if="item.thumbUrl"
            :src="item.thumbUrl"
            :alt="item.filename"
            class="filmstrip-img"
            @error="onThumbError($event)"
          />
          <div v-else class="filmstrip-placeholder">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="#9CA3AF" stroke-width="1"/>
              <circle cx="5" cy="6" r="1.5" fill="#9CA3AF"/>
              <path d="M1.5 12l3.5-3 2 2 3-3.5 4.5 4.5" stroke="#9CA3AF" stroke-width="1" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="filmstrip-indicator"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionItem } from '@/types';

defineProps<{
  items: SessionItem[];
  activeId: string | null;
}>();

defineEmits<{
  select: [id: string];
}>();

function onThumbError(e: Event): void {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  if (img.parentElement) {
    img.parentElement.classList.add('error');
  }
}
</script>

<style scoped>
.session-filmstrip {
  margin-top: 20px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
}

.filmstrip-header {
  margin-bottom: 10px;
}

.filmstrip-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filmstrip-track {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scroll-behavior: smooth;
}

.filmstrip-track::-webkit-scrollbar {
  height: 4px;
}

.filmstrip-track::-webkit-scrollbar-track {
  background: transparent;
}

.filmstrip-track::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 2px;
}

.filmstrip-item {
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
}

.filmstrip-thumb {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filmstrip-item.active .filmstrip-thumb {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.filmstrip-item:hover .filmstrip-thumb {
  border-color: #c4b5fd;
}

.filmstrip-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.filmstrip-thumb.error {
  background: #fef2f2;
}

.filmstrip-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.filmstrip-indicator {
  width: 100%;
  height: 3px;
  border-radius: 2px;
  margin-top: 6px;
  background: transparent;
  transition: background 0.2s ease;
}

.filmstrip-item.active .filmstrip-indicator {
  background: #6366f1;
}
</style>
