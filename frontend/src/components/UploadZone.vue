<template>
  <section class="upload-section">
    <div
      class="dropzone"
      :class="{ 'drag-over': isDragOver }"
      @click="openFilePicker"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        @change="onFileChange"
      />
      <div class="dropzone-content">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <h3>拖拽图片到此处</h3>
        <p>或 <span class="link">点击选择文件</span></p>
        <p class="hint">支持 PNG、JPEG、WebP 格式，最大 20MB</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { FileValidationResult } from '@/types';

const emit = defineEmits<{
  (e: 'file-selected', file: File): void;
  (e: 'validation-error', error: string): void;
}>();

const props = defineProps<{
  validateFile: (file: File | null) => FileValidationResult;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

function openFilePicker(): void {
  fileInputRef.value?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  handleFile(file);
  // 重置 input 以允许重复选择同一文件
  if (input) input.value = '';
}

function onDragOver(): void {
  isDragOver.value = true;
}

function onDragLeave(): void {
  isDragOver.value = false;
}

function onDrop(event: DragEvent): void {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0] ?? null;
  handleFile(file);
}

function handleFile(file: File | null): void {
  const validation = props.validateFile(file);
  if (!validation.valid) {
    emit('validation-error', validation.error);
    return;
  }
  emit('file-selected', file!);
}

// 全局拖拽：阻止浏览器默认打开文件
function preventDefaults(e: DragEvent): void {
  e.preventDefault();
}

onMounted(() => {
  document.addEventListener('dragover', preventDefaults);
  document.addEventListener('drop', preventDefaults);
});

onUnmounted(() => {
  document.removeEventListener('dragover', preventDefaults);
  document.removeEventListener('drop', preventDefaults);
});
</script>
