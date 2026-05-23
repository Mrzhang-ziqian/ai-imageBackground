<template>
  <router-view />
</template>

<script setup lang="ts">
/**
 * App.vue — 全局根组件
 *
 * 处理鉴权状态变更时的自动重定向：
 * - 登出（包括 token 过期）→ 若在需登录页面，跳转首页
 * - 首页已登录用户 → 跳转工作台（或 pending 路由）
 * - 登录成功 / fetchMe 恢复 → 跳转工作台或 pending 路由
 */
import { watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const ui = useUiStore();

/** 已登录用户从首页跳转 */
function redirectFromHome(): void {
  const pending = ui.consumePendingRoute();
  router.replace(pending || '/workspace');
}

/**
 * 场景 A：页面首次加载时已登录（token + fetchMe 已完成）
 * 此时 watch(immediate) 不会触发（值已经为 true，无变化事件）
 */
onMounted(() => {
  if (auth.isLoggedIn && route.path === '/') {
    redirectFromHome();
  }
});

/**
 * 场景 B：登录成功 / fetchMe 恢复 / 任何 isLoggedIn 从 false → true
 * 注意：Pinia store 已通过 reactive() 解包 ref，无需 .value
 */
watch(
  () => auth.isLoggedIn,
  (loggedIn) => {
    if (loggedIn && route.path === '/') {
      redirectFromHome();
    }
  },
);

/**
 * 场景 C：登出（token 过期 / 手动退出） → 若在需登录页面，跳转首页
 */
watch(
  () => auth.isLoggedIn,
  (loggedIn, wasLoggedIn) => {
    if (!loggedIn && wasLoggedIn && route.meta.requiresAuth) {
      router.replace('/');
    }
  },
);
</script>
