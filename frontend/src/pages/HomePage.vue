<template>
  <!-- 未登录 → Landing Page -->
  <LandingPage
    v-if="!auth.isLoggedIn.value"
    @open-auth="ui.openAuthModal()"
  />

  <!-- 已登录 → 自动重定向到工作台 -->
  <div v-else class="home-redirect">
    <div class="home-spinner"></div>
    <p>正在加载工作台...</p>
  </div>

  <!-- 全局 AuthModal -->
  <AuthModal :visible="ui.authModalVisible" @close="ui.closeAuthModal()" />
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import LandingPage from '@/components/LandingPage.vue';
import AuthModal from '@/components/AuthModal.vue';
import { useAuth } from '@/composables/useAuth';
import { useUiStore } from '@/stores/ui';

const auth = useAuth();
const ui = useUiStore();
const router = useRouter();

// 已登录自动跳转
watch(
  () => auth.isLoggedIn.value,
  (val) => {
    if (val) {
      router.replace('/workspace');
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.home-redirect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  color: #6b7280;
  font-size: 14px;
}

.home-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
