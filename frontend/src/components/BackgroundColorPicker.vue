<template>
  <div class="bg-color-section">
    <div class="color-section-header">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
      <span class="color-section-title">背景颜色</span>
    </div>

    <!-- 预设颜色网格 -->
    <div class="color-grid">
      <button
        v-for="preset in PRESET_COLORS"
        :key="preset.hex"
        class="color-chip"
        :class="{
          active: modelValue === preset.hex,
          transparent: preset.hex === 'transparent',
        }"
        :title="preset.label"
        @click="selectColor(preset.hex as BgColor)"
      >
        <span
          class="chip-swatch"
          :class="{ checkerboard: preset.hex === 'transparent', 'has-border': preset.hex === '#FFFFFF' }"
          :style="{ background: preset.hex === 'transparent' ? undefined : preset.hex }"
        ></span>
        <span class="chip-label">{{ preset.label }}</span>
      </button>

      <!-- 自定义取色按钮 -->
      <button
        class="color-chip custom"
        :class="{ active: isCustomActive }"
        title="自定义颜色"
        @click="openCustomPicker"
      >
        <span
          class="chip-swatch custom-swatch"
          :style="{ background: isCustomActive ? modelValue : undefined }"
        >
          <svg v-if="!isCustomActive" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </span>
        <span class="chip-label">自定义</span>
        <input
          ref="customInputRef"
          type="color"
          :value="customHex"
          hidden
          @input="onCustomInput"
        />
      </button>
    </div>

    <!-- 最近使用 -->
    <div v-if="recentColors.length > 0" class="recent-section">
      <div class="recent-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>最近使用</span>
        <button class="clear-recent" title="清除记录" @click="clearRecent">清除</button>
      </div>
      <div class="recent-row">
        <button
          v-for="color in recentColors"
          :key="color"
          class="recent-dot"
          :class="{ active: modelValue === color }"
          :style="{ background: color }"
          :title="color"
          @click="selectColor(color)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { BgColor } from '@/types';
import { PRESET_COLORS, RECENT_COLORS_KEY, MAX_RECENT_COLORS } from '@/types';

const props = defineProps<{
  modelValue: BgColor;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: BgColor): void;
}>();

const customInputRef = ref<HTMLInputElement | null>(null);

// ---- 最近使用颜色（localStorage 持久化） ----
const recentColors = ref<`#${string}`[]>([]);

function loadRecentColors(): void {
  try {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        recentColors.value = parsed.filter((c): c is `#${string}` => typeof c === 'string' && c.startsWith('#'));
      }
    }
  } catch {
    // 忽略解析错误
  }
}

function saveRecentColors(): void {
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recentColors.value));
  } catch {
    // 忽略存储错误
  }
}

function addRecentColor(color: `#${string}`): void {
  const colors = recentColors.value.filter(c => c !== color);
  colors.unshift(color);
  recentColors.value = colors.slice(0, MAX_RECENT_COLORS);
  saveRecentColors();
}

function clearRecent(): void {
  recentColors.value = [];
  saveRecentColors();
}

onMounted(loadRecentColors);

// 监听从外部改变的颜色（如上传新图后重置为 transparent）
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== 'transparent' && !isPreset(newVal)) {
      addRecentColor(newVal);
    }
  },
);

// ---- 预设判断 ----

function isPreset(color: BgColor): boolean {
  return PRESET_COLORS.some(p => p.hex === color);
}

const isCustomActive = computed(() => !isPreset(props.modelValue));

const customHex = computed(() => {
  if (!isPreset(props.modelValue)) return props.modelValue;
  return '#6366f1';
});

// ---- 事件处理 ----

function selectColor(color: BgColor): void {
  emit('update:modelValue', color);
}

function openCustomPicker(): void {
  customInputRef.value?.click();
}

function onCustomInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  emit('update:modelValue', input.value as BgColor);
}
</script>

<style scoped>
.bg-color-section {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
  padding: 18px 20px;
}

.color-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #6b7280;
}

.color-section-title {
  font-size: 14px;
  font-weight: 600;
}

/* ---- 预设颜色网格 ---- */
.color-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

@media (max-width: 600px) {
  .color-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.color-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 4px 7px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-chip:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
}

.color-chip.active {
  border-color: #6366f1;
  background: #eef2ff;
}

.chip-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chip-swatch.checkerboard {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

.chip-swatch.has-border {
  border: 1.5px solid #d1d5db;
}

.custom-swatch {
  background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
  color: #6b7280;
}

.chip-label {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
}

.color-chip.active .chip-label {
  color: #4f46e5;
  font-weight: 600;
}

/* ---- 最近使用 ---- */
.recent-section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f3f4f6;
}

.recent-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 10px;
}

.clear-recent {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 11px;
  color: #9ca3af;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.clear-recent:hover {
  color: #ef4444;
  background: #fef2f2;
}

.recent-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.recent-dot {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-dot:hover {
  transform: scale(1.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.recent-dot.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

/* ---- 响应式 ---- */
@media (max-width: 480px) {
  .color-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }

  .recent-dot {
    width: 24px;
    height: 24px;
  }
}
</style>
