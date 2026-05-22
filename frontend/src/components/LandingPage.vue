<template>
  <div class="landing">
    <!-- ===== Navbar ===== -->
    <nav class="landing-nav">
      <div class="nav-inner">
        <div class="nav-logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <span>AI 背景移除</span>
        </div>
        <button class="nav-login-btn" @click="$emit('open-auth')">
          登录
        </button>
      </div>
    </nav>

    <!-- ===== Hero ===== -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <h1 class="hero-title animate-in">
          <span class="hero-title-line">AI 一键移除背景</span>
          <span class="hero-title-line hero-accent">比你想的更简单</span>
        </h1>
        <p class="hero-subtitle animate-in-delay">
          上传即处理 · 高清原分辨率输出 · 每日 5 次免费
        </p>
        <div class="hero-actions animate-in-delay-2">
          <button class="btn-cta" @click="$emit('open-auth')">
            免费开始使用
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button class="btn-cta-outline" @click="$emit('open-auth')">
            已有账号? 登录
          </button>
        </div>
      </div>
    </section>

    <!-- ===== Demo 对比 ===== -->
    <section ref="demoSection" class="demo-section">
      <div class="section-label">看效果</div>
      <h2 class="section-title">Before → After</h2>
      <div class="demo-compare">
        <div
          class="demo-slider"
          ref="demoSlider"
          @mousedown="startDrag"
          @touchstart.prevent="startDrag"
        >
          <div class="demo-before">
            <div class="demo-placeholder demo-before-bg">
              <svg class="demo-img-icon" viewBox="0 0 80 80" fill="none">
                <rect x="10" y="10" width="60" height="60" rx="12" stroke="currentColor" stroke-width="2"/>
                <circle cx="30" cy="30" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M10 55l15-15 10 10 15-15 20 20v10H10z" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>原图</span>
            </div>
          </div>
          <div
            class="demo-after"
            :style="{ clipPath: `inset(0 ${100 - sliderPercent}% 0 0)` }"
          >
            <div class="demo-placeholder demo-after-bg">
              <svg class="demo-img-icon" viewBox="0 0 80 80" fill="none">
                <rect x="10" y="10" width="60" height="60" rx="12" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>去背景</span>
            </div>
          </div>
          <div
            class="demo-handle"
            :style="{ left: sliderPercent + '%' }"
          >
            <div class="handle-line"></div>
            <div class="handle-knob">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="8" y1="6" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="12"/>
              </svg>
            </div>
          </div>
        </div>
        <p class="demo-hint">← 拖拽滑块对比效果 →</p>
      </div>
    </section>

    <!-- ===== 功能卡片 ===== -->
    <section class="features-section">
      <div class="section-label">功能亮点</div>
      <h2 class="section-title">不止是去背景</h2>
      <div class="features-grid">
        <div
          v-for="(feat, i) in features"
          :key="feat.title"
          class="feature-card"
          :class="`card-${i + 1}`"
        >
          <div class="feature-icon-wrap">
            <div class="feature-icon" v-html="feat.icon"></div>
          </div>
          <h3 class="feature-title">{{ feat.title }}</h3>
          <p class="feature-desc">{{ feat.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ===== Pro 预告 ===== -->
    <section class="pro-section">
      <div class="pro-card">
        <div class="pro-badge">即将上线</div>
        <h2 class="pro-title">Pro 专业版</h2>
        <p class="pro-desc">无限使用 · 批量处理 · 专属模板 · 优先支持</p>
        <button class="pro-btn" @click="showProToast">
          了解详情
        </button>
      </div>
    </section>

    <!-- ===== Footer ===== -->
    <footer class="landing-footer">
      <p>&copy; 2026 AI Background Remover. All rights reserved.</p>
    </footer>

    <ToastMessage :toast="toastState" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import ToastMessage from './ToastMessage.vue'

defineEmits<{ openAuth: [] }>()

const { toast: toastState, showToast } = useToast()

// ---- Features ----
const features = [
  {
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8.5" cy="10" r="1.5"/><path d="M2 16l5-5 3 3 5-5 7 7"/></svg>',
    title: '高清原分辨率',
    desc: 'AI 在小图上推理，alpha mask 放大还原到原始尺寸，不损失任何细节',
  },
  {
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>',
    title: '批量处理',
    desc: '一次性上传多张图片，排队自动处理，支持批量下载 ZIP 打包',
  },
  {
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3 6 6 1-4 4 1 7-6-3-6 3 1-7-4-4 6-1z"/></svg>',
    title: '模板背景库',
    desc: '内置 13 个电商/渐变/场景模板，纯色+阴影一键切换，Canvas 端侧合成',
  },
  {
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8l4 4-4 4"/></svg>',
    title: '边缘精修',
    desc: '羽化半径调节 + 边缘平滑 + 手动擦除/修复画笔，处理毛发和半透明物体',
  },
  {
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    title: 'PNG / WebP 下载',
    desc: '一键下载透明 PNG + WebP 格式转换 + 复制到剪贴板，灵活输出',
  },
  {
    icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
    title: '移动端适配',
    desc: '4 级响应式断点适配手机/平板，触屏增强，随时随地处理图片',
  },
]

// ---- Demo slider ----
const demoSection = ref<HTMLElement>()
const demoSlider = ref<HTMLElement>()
const sliderPercent = ref(50)
let autoPlayTimer: ReturnType<typeof setTimeout> | null = null
let dragging = false

function updateSlider(clientX: number) {
  const el = demoSlider.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  sliderPercent.value = pct
}

function onMouseMove(e: MouseEvent) {
  if (!dragging) return
  updateSlider(e.clientX)
}
function onTouchMove(e: TouchEvent) {
  if (!dragging) return
  updateSlider(e.touches[0].clientX)
}
function startDrag(e: MouseEvent | TouchEvent) {
  dragging = true
  if (autoPlayTimer) clearTimeout(autoPlayTimer)
}
function stopDrag() {
  dragging = false
}
function showProToast() {
  showToast({ message: 'Pro 计划即将上线，敬请期待！', type: 'success' })
}

// 自动演示：页面加载后 1.2s，滑块从左滑到中间
function startAutoPlay() {
  autoPlayTimer = setTimeout(() => {
    const start = performance.now()
    const duration = 1500 // 1.5s animation
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      sliderPercent.value = Math.round(eased * 65)
      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        // 回到中间位置
        setTimeout(() => {
          if (!dragging) sliderPercent.value = 50
        }, 2000)
      }
    }
    requestAnimationFrame(tick)
  }, 1200)
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onTouchMove)
  document.addEventListener('touchend', stopDrag)
  startAutoPlay()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', stopDrag)
  if (autoPlayTimer) clearTimeout(autoPlayTimer)
})
</script>

<style scoped>
/* ===== Landing Nav ===== */
.landing-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 1rem 2rem;
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}
.logo-icon {
  width: 24px;
  height: 24px;
}
.nav-login-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}
.nav-login-btn:hover {
  background: rgba(255,255,255,0.25);
}

/* ===== Hero ===== */
.hero {
  position: relative;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #6366f1 0%, #4338ca 50%, #312e81 100%);
}
.hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(99,102,241,0.4) 0%, transparent 50%);
}
.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 700px;
  padding: 0 2rem;
}
.hero-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
}
.hero-title-line {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
}
.hero-accent {
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: rgba(255,255,255,0.75);
  margin-bottom: 2.5rem;
  line-height: 1.6;
}
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* ---- Animations ---- */
.animate-in {
  animation: floatUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.animate-in-delay {
  animation: floatUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
}
.animate-in-delay-2 {
  animation: floatUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}
@keyframes floatUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- CTA Buttons ---- */
.btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
  transition: all 0.2s;
}
.btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(245, 158, 11, 0.5);
}
.btn-cta:active {
  transform: translateY(0);
}
.btn-cta-outline {
  padding: 0.875rem 2rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.35);
  color: #fff;
  transition: all 0.2s;
}
.btn-cta-outline:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.6);
}

/* ===== Demo Section ===== */
.demo-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 4rem 2rem 3rem;
  text-align: center;
}
.section-label {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  margin-bottom: 0.75rem;
}
.section-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 800;
  color: var(--text, #1f2937);
  margin-bottom: 2rem;
}
.demo-compare {
  max-width: 640px;
  margin: 0 auto;
}
.demo-slider {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  overflow: hidden;
  cursor: ew-resize;
  user-select: none;
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  background: #f9fafb;
}
.demo-before,
.demo-after {
  position: absolute;
  inset: 0;
}
.demo-after {
  z-index: 1;
}
.demo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #9ca3af;
}
.demo-before-bg {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}
.demo-after-bg {
  background: linear-gradient(135deg, #eef2ff 0%, #ddd6fe 50%, #e0e7ff 100%);
  /* 模拟透明背景的棋盘格 */
  background-image:
    linear-gradient(45deg, #c7d2fe 25%, transparent 25%),
    linear-gradient(-45deg, #c7d2fe 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #c7d2fe 75%),
    linear-gradient(-45deg, transparent 75%, #c7d2fe 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
}
.demo-img-icon {
  width: 80px;
  height: 80px;
  color: #d1d5db;
}
.demo-after-bg .demo-img-icon {
  color: #a5b4fc;
}

/* Handle */
.demo-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
.handle-line {
  flex: 1;
  width: 3px;
  background: #fff;
  box-shadow: 0 0 8px rgba(0,0,0,0.3);
}
.handle-knob {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
}
.demo-hint {
  margin-top: 1rem;
  font-size: 0.8125rem;
  color: #9ca3af;
}

/* ===== Features ===== */
.features-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 2rem;
  text-align: center;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 0.5rem;
}
.feature-card {
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  text-align: left;
  transition: all 0.3s;
  opacity: 0;
  transform: translateY(16px);
  animation: cardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.feature-card:hover {
  border-color: #e0e7ff;
  box-shadow: 0 4px 20px rgba(99,102,241,0.08);
  transform: translateY(-3px);
}

/* Staggered card animation */
.feature-card.card-1 { animation-delay: 0s; }
.feature-card.card-2 { animation-delay: 0.1s; }
.feature-card.card-3 { animation-delay: 0.2s; }
.feature-card.card-4 { animation-delay: 0.3s; }
.feature-card.card-5 { animation-delay: 0.4s; }
.feature-card.card-6 { animation-delay: 0.5s; }

@keyframes cardIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: #6366f1;
}
.feature-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.375rem;
}
.feature-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.55;
}

/* ===== Pro Section ===== */
.pro-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
}
.pro-card {
  position: relative;
  background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca);
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  color: #fff;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(67,56,202,0.3);
}
.pro-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 40% 30%, rgba(245,158,11,0.15) 0%, transparent 60%),
    radial-gradient(circle at 70% 70%, rgba(99,102,241,0.2) 0%, transparent 60%);
}
.pro-badge {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: rgba(245,158,11,0.2);
  color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.3);
}
.pro-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.pro-desc {
  font-size: 1rem;
  color: rgba(255,255,255,0.7);
  margin-bottom: 1.5rem;
}
.pro-btn {
  padding: 0.75rem 2rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  border: none;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(245,158,11,0.35);
}
.pro-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(245,158,11,0.45);
}

/* ===== Footer ===== */
.landing-footer {
  text-align: center;
  padding: 2rem;
  font-size: 0.8125rem;
  color: #9ca3af;
  border-top: 1px solid #f3f4f6;
}

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero {
    min-height: 70vh;
  }
}
@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  .hero-title-line {
    font-size: 1.75rem;
  }
  .hero {
    min-height: 60vh;
  }
  .demo-slider {
    aspect-ratio: 3 / 4;
  }
  .demo-section {
    padding: 2rem 1rem;
  }
  .features-section {
    padding: 2rem 1rem;
  }
}
</style>
