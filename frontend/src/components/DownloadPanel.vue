<template>
  <section class="download-section">
    <div class="download-panel">
      <!-- 主下载按钮 -->
      <button class="btn-download-primary" @click="onDownloadPng">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        下载 PNG
        <span v-if="sizes.png" class="file-size">{{ sizes.png }}</span>
      </button>

      <!-- 更多选项下拉 -->
      <div class="dropdown-wrapper" ref="dropdownRef">
        <button
          class="btn-more"
          :class="{ active: open }"
          @click="open = !open"
          aria-label="更多下载选项"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM13 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
          </svg>
        </button>

        <Transition name="dropdown">
          <div v-if="open" class="dropdown-menu">
            <!-- WebP 下载 -->
            <button class="dropdown-item" @click="onDownloadWebp" :disabled="converting">
              <div class="item-icon webp-icon">W</div>
              <div class="item-text">
                <span class="item-label">WebP 格式</span>
                <span class="item-desc">体积更小，适合网页使用</span>
              </div>
              <span v-if="sizes.webp" class="item-size">{{ sizes.webp }}</span>
              <span v-if="converting" class="item-spinner"></span>
            </button>

            <!-- 复制到剪贴板 -->
            <button class="dropdown-item" @click="onCopy">
              <div class="item-icon copy-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </div>
              <div class="item-text">
                <span class="item-label">复制到剪贴板</span>
                <span class="item-desc">{{ copied ? '已复制！' : 'Ctrl+V 即可粘贴' }}</span>
              </div>
              <span class="item-check" :class="{ show: copied }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  /** 当前显示的 Blob（可能已合成背景色） */
  blob: Blob | null;
  /** 透明底 PNG Blob */
  transparentBlob: Blob | null;
  /** 文件名基础 */
  filename: string;
}>();

const emit = defineEmits<{
  (e: 'toast', payload: { message: string; type: 'success' | 'error' }): void;
}>();

const open = ref(false);
const converting = ref(false);
const copied = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// ---- 文件大小估算 ----
const sizes = computed(() => {
  const b = props.blob;
  if (!b) return { png: '', webp: '' };
  const pngSize = formatSize(b.size);
  // WebP 一般比 PNG 小 30-60%
  const webpEst = Math.round(b.size * 0.4);
  return { png: pngSize, webp: formatSize(webpEst) };
});

// ---- 点击外部关闭 ----
function onDocClick(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

// ---- Blob → 指定格式转换 ----
function blobToFormat(
  sourceBlob: Blob,
  mimeType: string,
  quality?: number,
  bgColor?: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(sourceBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 创建失败'));

      // 如果指定了背景色，先填充
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('转换失败'))),
        mimeType,
        quality ?? 0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

// ---- 触发下载 ----
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- PNG 下载 ----
async function onDownloadPng() {
  const blob = props.blob;
  if (!blob) return;
  triggerDownload(blob, props.filename);
}

// ---- WebP 下载 ----
async function onDownloadWebp() {
  const blob = props.blob;
  if (!blob) return;
  converting.value = true;
  try {
    const webpBlob = await blobToFormat(blob, 'image/webp', 0.88);
    triggerDownload(webpBlob, props.filename.replace(/\.png$/i, '.webp'));
    open.value = false;
    emit('toast', { message: 'WebP 已下载', type: 'success' });
  } catch (err) {
    emit('toast', {
      message: 'WebP 转换失败',
      type: 'error',
    });
  } finally {
    converting.value = false;
  }
}

// ---- 复制到剪贴板 ----
async function onCopy() {
  const blob = props.blob;
  if (!blob) return;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || 'image/png']: blob }),
    ]);
    copied.value = true;
    open.value = false;
    emit('toast', { message: '已复制到剪贴板', type: 'success' });
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    emit('toast', {
      message: '复制失败，请检查浏览器权限',
      type: 'error',
    });
  }
}

// ---- 工具函数 ----
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<style scoped>
.download-section {
  margin-bottom: 32px;
}

.download-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* ---- 主下载按钮 ---- */
.btn-download-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  border: none;
  border-radius: 14px;
  background: #6366f1;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.btn-download-primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
}

.btn-download-primary:active {
  transform: translateY(0);
}

.btn-download-primary svg {
  width: 18px;
  height: 18px;
}

.file-size {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.75;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
}

/* ---- 更多按钮 ---- */
.dropdown-wrapper {
  position: relative;
}

.btn-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-more:hover,
.btn-more.active {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

/* ---- 下拉菜单 ---- */
.dropdown-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 260px;
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 12px 32px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #1f2937;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.webp-icon {
  background: #dbeafe;
  color: #2563eb;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.copy-icon {
  background: #f3f4f6;
  color: #6b7280;
}

.item-text {
  flex: 1;
  min-width: 0;
}

.item-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.item-desc {
  display: block;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

.item-size {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.item-check {
  color: #10b981;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.item-check.show {
  opacity: 1;
  transform: scale(1);
}

.item-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- 下拉动画 ---- */
.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.92);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px) scale(0.96);
}
</style>
