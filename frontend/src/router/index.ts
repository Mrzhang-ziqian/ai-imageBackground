/**
 * Vue Router 路由配置
 *
 * /                     → 首页（未登录→LandingPage，已登录→/workspace）
 * /workspace            → 工作台上传页（需登录）
 * /workspace/draft/:id  → 草稿详情编辑页（需登录）
 * /drafts               → 草稿箱列表（需登录）
 */
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

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
      path: '/workspace/draft/:id',
      name: 'draft-detail',
      component: () => import('@/pages/DraftDetailPage.vue'),
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
router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAuth) {
    const auth = useAuthStore();
    // 等待初始化完成，避免应用刚加载时 fetchMe() 未返回导致误判
    if (!auth.initialized) {
      await auth.fetchMe();
    }
    const loggedIn = !!auth.token && !!auth.user;
    if (!loggedIn) {
      const ui = useUiStore();
      ui.setPendingRoute(to.fullPath);
      next('/');
      return;
    }
  }
  next();
});

export default router;
