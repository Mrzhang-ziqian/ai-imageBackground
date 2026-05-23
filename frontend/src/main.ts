import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);

// T1: 在挂载前触发 auth store 实例化，使其尽早执行 token 恢复（fetchMe）
// 避免路由守卫在 fetchMe 完成前误判 isLoggedIn 为 false。
import { useAuthStore } from '@/stores/auth';
useAuthStore();

app.mount('#app');
