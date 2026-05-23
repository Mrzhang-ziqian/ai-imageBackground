<template>
  <div v-if="zoom.isZoomed.value" class="zoom-controls">
    <button
      class="zoom-btn"
      :disabled="zoom.scale.value < 1.25"
      @click="zoom.zoomTo(zoom.scale.value - 0.25)"
      title="缩小"
    >−</button>
    <span class="zoom-label">{{ zoom.zoomPercent.value }}</span>
    <button
      class="zoom-btn"
      :disabled="zoom.scale.value >= 4"
      @click="zoom.zoomTo(zoom.scale.value + 0.25)"
      title="放大"
    >+</button>
    <button class="zoom-btn zoom-reset" @click="zoom.resetZoom()" title="重置">1:1</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  zoom: {
    isZoomed: { value: boolean };
    scale: { value: number };
    zoomPercent: { value: string };
    zoomTo: (target: number) => void;
    resetZoom: () => void;
  };
}>();
</script>

<style scoped>
.zoom-controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  padding: 4px 6px;
  z-index: 8;
  animation: zoom-ctrl-in 0.2s ease;
}

@keyframes zoom-ctrl-in {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  line-height: 1;
}

.zoom-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.zoom-btn:active {
  background: rgba(255, 255, 255, 0.28);
}

.zoom-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: transparent;
}

.zoom-reset {
  font-size: 12px;
  font-weight: 500;
  padding: 0 8px;
  width: auto;
  margin-left: 4px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0 7px 7px 0;
}

.zoom-label {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  min-width: 38px;
  text-align: center;
  user-select: none;
}
</style>
