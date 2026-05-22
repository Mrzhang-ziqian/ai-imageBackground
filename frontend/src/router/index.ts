/**
 * Vue Router 路由配置
 *
 * /            → 首页（根据登录状态显示 LandingPage 或重定向到 /workspace）
 * /workspace   → 工作台（需登录）
 * /drafts      → 草稿箱（需登录）
 */
import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/workspace',
      name: 'workspace',
      component: () => import('@/pages/WorkspacePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/drafts',
      name: 'drafts',
      component: () => import('@/pages/DraftBoxPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// 路由守卫：未登录跳回首页
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    const auth = useAuth();
    if (!auth.isLoggedIn.value) {
      next('/');
      return;
    }
  }
  next();
});

export default router;
