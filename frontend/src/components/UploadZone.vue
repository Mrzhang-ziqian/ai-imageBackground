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
        multiple
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
        <p v-if="quotaText" class="quota-hint">{{ quotaText }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { FileValidationResult } from '@/types';

const emit = defineEmits<{
  (e: 'file-selected', file: File): void;
  (e: 'files-selected', files: File[]): void;
  (e: 'validation-error', error: string): void;
}>();

const props = defineProps<{
  validateFile: (file: File | null) => FileValidationResult;
  quotaText?: string;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

function openFilePicker(): void {
  fileInputRef.value?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  handleFiles(input.files);
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
  handleFiles(event.dataTransfer?.files ?? null);
}

function handleFiles(fileList: FileList | null): void {
  if (!fileList || fileList.length === 0) return;

  // 过滤出有效的图片文件
  const validFiles: File[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const validation = props.validateFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      emit('validation-error', `${file.name}: ${validation.error}`);
    }
  }

  if (validFiles.length === 0) return;

  // 单文件 → 走原有单图流程；多文件 → 走批量流程
  if (validFiles.length === 1) {
    emit('file-selected', validFiles[0]);
  } else {
    emit('files-selected', validFiles);
  }
}

// K17: 全局阻止 browser 默认 drop 行为（防止拖拽文件时跳转），保留 dragover 给组件内部处理
function preventGlobalDrop(e: DragEvent): void {
  e.preventDefault();
}

onMounted(() => {
  document.addEventListener('drop', preventGlobalDrop);
});

onUnmounted(() => {
  document.removeEventListener('drop', preventGlobalDrop);
});
</script>
