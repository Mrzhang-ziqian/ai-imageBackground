<template>
  <footer class="footer">
    <div class="container">
      <p>基于 rembg 模型 | 后台编辑在浏览器端完成，AI 推理在服务器端完成</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
// 纯展示组件
</script>

<style scoped>
.footer {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 13px;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 480px) {
  .footer {
    padding: 16px 12px;
    font-size: 12px;
  }
}
</style>
