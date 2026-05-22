import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      // Keep App.vue as the main view (no lazy-load needed for SPA)
      component: () => import('@/App.vue'),
    },
  ],
})

export default router
