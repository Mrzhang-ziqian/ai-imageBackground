<template>
  <div class="bg-color-section">
    <span class="bg-color-label">背景颜色</span>
    <div class="bg-color-picker">
      <!-- 透明 -->
      <button
        class="color-swatch"
        :class="{ active: modelValue === 'transparent' }"
        title="透明背景"
        @click="select('transparent')"
      >
        <span class="color-fill checkerboard"></span>
      </button>

      <!-- 预设颜色 -->
      <button
        v-for="color in presetColors"
        :key="color"
        class="color-swatch"
        :class="{ active: modelValue === color }"
        :title="color"
        @click="select(color)"
      >
        <span class="color-fill" :style="{ background: color }" :class="{ 'color-white': color === '#FFFFFF' }"></span>
      </button>

      <!-- 自定义颜色 -->
      <button
        class="color-swatch custom"
        :class="{ active: isCustomActive }"
        title="自定义颜色"
        @click="openCustomPicker"
      >
        <span class="color-fill" :style="{ background: customColor }"></span>
        <input
          ref="customInputRef"
          type="color"
          :value="customHex"
          hidden
          @input="onCustomInput"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BgColor, PresetColor } from '@/types';
import { PRESET_COLORS } from '@/types';

const props = defineProps<{
  modelValue: BgColor;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: BgColor): void;
}>();

const customInputRef = ref<HTMLInputElement | null>(null);

const presetColors = computed(() =>
  PRESET_COLORS.slice(1) as readonly Exclude<PresetColor, 'transparent'>[],
);

function isPreset(color: BgColor): color is PresetColor {
  return (PRESET_COLORS as readonly string[]).includes(color);
}

const isCustomActive = computed(() => !isPreset(props.modelValue));

const customColor = computed(() => {
  if (isPreset(props.modelValue)) {
    return 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)';
  }
  return props.modelValue;
});

const customHex = computed(() => {
  return isPreset(props.modelValue) ? '#6366f1' : props.modelValue;
});

function select(color: BgColor): void {
  emit('update:modelValue', color);
}

function openCustomPicker(): void {
  customInputRef.value?.click();
}

function onCustomInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const color = input.value as BgColor;
  emit('update:modelValue', color);
}
</script>

<style scoped>
.bg-color-section {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.bg-color-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}

.bg-color-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid transparent;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  background: none;
  overflow: hidden;
}

.color-swatch:hover {
  transform: scale(1.15);
}

.color-swatch.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

.color-swatch .color-fill {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.color-swatch .color-fill.checkerboard {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
}

.color-swatch .color-fill.color-white {
  border: 1px solid #d1d5db;
}
</style>
