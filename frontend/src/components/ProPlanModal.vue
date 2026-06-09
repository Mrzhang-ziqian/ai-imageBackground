<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="onClose">
      <div class="pro-modal" role="dialog" aria-modal="true" aria-label="Pro 计划详情">
        <!-- 头部 -->
        <div class="pro-header">
          <span class="pro-badge">PRO</span>
          <h3 class="pro-title">升级至 Pro 计划</h3>
          <p class="pro-subtitle">解锁全部功能，提升工作效率</p>
          <button class="btn-close" @click="onClose" aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- 价格 -->
        <div class="pro-price-section">
          <span class="pro-currency">¥</span>
          <span class="pro-amount">29</span>
          <span class="pro-period">/月</span>
        </div>

        <!-- 功能对比 -->
        <div class="pro-compare">
          <div class="compare-header">
            <span class="compare-col-feature">功能</span>
            <span class="compare-col-plan free-plan">免费版</span>
            <span class="compare-col-plan pro-plan-col">Pro</span>
          </div>
          <div v-for="row in compareRows" :key="row.feature" class="compare-row">
            <span class="compare-col-feature">{{ row.feature }}</span>
            <span class="compare-col-plan free-plan">{{ row.free }}</span>
            <span class="compare-col-plan pro-plan-col">
              <svg v-if="row.proCheck" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ row.pro }}</span>
            </span>
          </div>
        </div>

        <!-- 已是 Pro 用户 -->
        <div v-if="isPro" class="pro-already">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>你已是 Pro 用户</span>
          <button class="btn-manage" @click="handleManageSubscription" :disabled="portalLoading">
            <span v-if="!portalLoading">管理订阅</span>
            <span v-else class="mini-spinner"></span>
          </button>
          <p v-if="portalError" class="cta-error">{{ portalError }}</p>
        </div>

        <!-- CTA：升级按钮 -->
        <div v-else class="pro-cta">
          <button class="btn-upgrade" :disabled="checkoutLoading" @click="handleCheckout">
            <span v-if="!checkoutLoading">立即升级</span>
            <span v-else class="mini-spinner"></span>
          </button>
          <p class="cta-note">安全支付，由 Stripe 提供支持。可随时取消。</p>
          <p v-if="checkoutError" class="cta-error">{{ checkoutError }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { subscriptionApi } from '@/services/api';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const auth = useAuthStore();
const { userPlan, token } = storeToRefs(auth);

const isPro = computed(() => userPlan.value === 'pro');

const checkoutLoading = ref(false);
const checkoutError = ref('');
const portalLoading = ref(false);
const portalError = ref('');

// 重置状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    checkoutError.value = '';
    portalError.value = '';
    checkoutLoading.value = false;
    portalLoading.value = false;
  }
});

const compareRows = [
  { feature: '全分辨率下载', free: '800px 预览', pro: '原图尺寸', proCheck: true },
  { feature: '每日处理次数', free: '5 次/天', pro: '无限次', proCheck: true },
  { feature: '批量处理', free: '×', pro: '50 张/批次', proCheck: true },
  { feature: '背景模板库', free: '基础模板', pro: '全部 20+ 模板', proCheck: true },
  { feature: '边缘精修工具', free: '×', pro: '全部工具', proCheck: true },
  { feature: '处理历史', free: '20 条', pro: '无限条', proCheck: true },
  { feature: '优先处理通道', free: '×', pro: '✓', proCheck: true },
];

function onClose(): void {
  emit('close');
}

async function handleCheckout(): Promise<void> {
  checkoutError.value = '';
  checkoutLoading.value = true;

  try {
    if (!token.value) {
      checkoutError.value = '请先登录后再升级';
      return;
    }
    const res = await subscriptionApi.createCheckout(token.value);
    // 跳转到 Stripe Checkout 页面
    window.location.href = res.checkout_url;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建支付会话失败';
    // 如果 Stripe 未配置，显示更友好的提示
    if (msg.includes('503') || msg.includes('尚未配置')) {
      checkoutError.value = '支付系统正在配置中，请稍后再试';
    } else {
      checkoutError.value = msg;
    }
  } finally {
    checkoutLoading.value = false;
  }
}

async function handleManageSubscription(): Promise<void> {
  portalLoading.value = true;
  portalError.value = null;
  try {
    if (!token.value) {
      portalError.value = '请先登录';
      return;
    }
    const res = await subscriptionApi.createPortal(token.value);
    window.location.href = res.portal_url;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建管理页面失败';
    portalError.value = msg;
  } finally {
    portalLoading.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.pro-modal {
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px 28px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16);
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.pro-header {
  text-align: center;
  margin-bottom: 20px;
}

.pro-badge {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.pro-title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px;
}

.pro-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.btn-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.btn-close:hover {
  background: #e5e7eb;
  color: #374151;
}

/* 价格 */
.pro-price-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  padding: 16px 0;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #eef2ff, #f5f3ff);
  border-radius: 14px;
}

.pro-currency {
  font-size: 18px;
  font-weight: 600;
  color: #4f46e5;
  margin-right: 2px;
}

.pro-amount {
  font-size: 40px;
  font-weight: 800;
  color: #4f46e5;
  line-height: 1;
}

.pro-period {
  font-size: 14px;
  color: #6b7280;
  margin-left: 2px;
}

/* 功能对比 */
.pro-compare {
  margin-bottom: 20px;
}

.compare-header,
.compare-row {
  display: grid;
  grid-template-columns: 1fr 80px 90px;
  gap: 8px;
  padding: 8px 10px;
  align-items: center;
}

.compare-header {
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 10px;
  margin-bottom: 4px;
}

.compare-col-feature {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.compare-row .compare-col-feature {
  font-weight: 400;
  font-size: 12px;
  color: #4b5563;
}

.compare-row {
  border-bottom: 1px solid #f3f4f6;
}

.compare-col-plan {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
}

.free-plan {
  color: #9ca3af;
}

.pro-plan-col {
  color: #4f46e5;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

/* 已是 Pro 用户 */
.pro-already {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px solid #e5e7eb;
  color: #059669;
  font-weight: 600;
  font-size: 14px;
}

.btn-manage {
  padding: 6px 16px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-manage:hover:not(:disabled) {
  border-color: #6366f1;
  color: #6366f1;
}
.btn-manage:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* CTA */
.pro-cta {
  text-align: center;
  border-top: 1px solid #e5e7eb;
  padding-top: 18px;
}

.btn-upgrade {
  width: 100%;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}
.btn-upgrade:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
.btn-upgrade:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cta-note {
  font-size: 11px;
  color: #9ca3af;
  margin: 10px 0 0;
}

.cta-error {
  font-size: 12px;
  color: #ef4444;
  margin: 8px 0 0;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 动画 */
.modal-fade-enter-active {
  transition: all 0.25s ease;
}
.modal-fade-leave-active {
  transition: all 0.15s ease-in;
}
.modal-fade-enter-from {
  opacity: 0;
}
.modal-fade-enter-from .pro-modal {
  transform: scale(0.95) translateY(8px);
}
.modal-fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 480px) {
  .pro-modal {
    padding: 24px 16px 20px;
    border-radius: 16px;
  }
  .pro-title {
    font-size: 18px;
  }
  .pro-amount {
    font-size: 32px;
  }
  .compare-header,
  .compare-row {
    grid-template-columns: 1fr 65px 75px;
    gap: 4px;
    padding: 6px 6px;
    font-size: 11px;
  }
  .compare-col-feature {
    font-size: 11px;
  }
  .compare-col-plan {
    font-size: 11px;
  }
}
</style>
