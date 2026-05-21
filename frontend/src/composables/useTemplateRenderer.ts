import type { BackgroundTemplate } from '@/types';

/**
 * 模板背景渲染器 —— Canvas 合成核心。
 *
 * 将 AI 抠图后的透明 PNG 合成到模板背景上，包括：
 * - 纯色 / 渐变背景填充
 * - 投影阴影（电商场景核心）
 * - 展台地平面效果
 */

/** 默认内边距（为阴影留空间） */
const DEFAULT_PADDING = 48;
/** 最大输出尺寸上限（防止超大图） */
const MAX_OUTPUT_DIM = 4096;

/**
 * 计算 Canvas 画布尺寸。
 * 根据原图尺寸 + 内边距，如果超过上限则等比缩放。
 */
function calcCanvasSize(
  imgW: number,
  imgH: number,
  padding: number,
): { w: number; h: number; scale: number } {
  const rawW = imgW + padding * 2;
  const rawH = imgH + padding * 2;

  if (rawW <= MAX_OUTPUT_DIM && rawH <= MAX_OUTPUT_DIM) {
    return { w: rawW, h: rawH, scale: 1 };
  }

  const scale = Math.min(MAX_OUTPUT_DIM / rawW, MAX_OUTPUT_DIM / rawH);
  return {
    w: Math.round(rawW * scale),
    h: Math.round(rawH * scale),
    scale,
  };
}

/**
 * 在 Canvas 上绘制渐变背景。
 */
function fillGradient(
  ctx: CanvasRenderingContext2D,
  gradient: BackgroundTemplate['gradient'],
  w: number,
  h: number,
): void {
  if (!gradient) return;

  if (gradient.type === 'linear') {
    const angle = gradient.angle ?? 180;
    const rad = (angle * Math.PI) / 180;
    const x0 = w / 2 - (Math.cos(rad) * w) / 2;
    const y0 = h / 2 - (Math.sin(rad) * h) / 2;
    const x1 = w / 2 + (Math.cos(rad) * w) / 2;
    const y1 = h / 2 + (Math.sin(rad) * h) / 2;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.colors.forEach((color, i) => {
      grad.addColorStop(i / (gradient.colors.length - 1 || 1), color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    // radial
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.max(w, h) * 0.65;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    gradient.colors.forEach((color, i) => {
      grad.addColorStop(i / (gradient.colors.length - 1 || 1), color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * 将透明主体图合成到模板背景上，返回合成后的 PNG Blob。
 */
export async function renderWithTemplate(
  subjectBlob: Blob,
  template: BackgroundTemplate,
  padding: number = DEFAULT_PADDING,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(subjectBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { w, h, scale } = calcCanvasSize(img.naturalWidth, img.naturalHeight, padding);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 上下文创建失败'));

      // 1. 绘制背景（纯色优先，再覆盖渐变）
      ctx.fillStyle = template.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      fillGradient(ctx, template.gradient, w, h);

      // 2. 计算主体绘制区域
      const offsetX = Math.round(padding * scale);
      const offsetY = Math.round(padding * scale);
      const drawW = Math.round(img.naturalWidth * scale);
      const drawH = Math.round(img.naturalHeight * scale);

      // 3. 特殊处理：产品展台
      if (template.id === 'product-pedestal') {
        const floorY = offsetY + drawH * 0.78;
        // 地平面线
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, floorY);
        ctx.lineTo(w, floorY);
        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 地平面填充（浅灰）
        ctx.beginPath();
        ctx.rect(0, floorY, w, h - floorY);
        ctx.fillStyle = 'rgba(0,0,0,0.02)';
        ctx.fill();
        ctx.restore();
      }

      // 4. 绘制主体 + 阴影
      if (template.shadow) {
        ctx.save();
        ctx.shadowColor = template.shadow.color;
        ctx.shadowBlur = template.shadow.blur * scale;
        ctx.shadowOffsetX = template.shadow.offsetX * scale;
        ctx.shadowOffsetY = template.shadow.offsetY * scale;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      }

      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob 失败'))),
        'image/png',
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

/**
 * 生成模板卡片的缩略图预览（Data URL，小尺寸）。
 * 用于模板选择器的视觉预览。
 */
export async function renderTemplateThumbnail(
  subjectBlob: Blob,
  template: BackgroundTemplate,
  thumbSize: number = 100,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(subjectBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const padding = 8;
      const scale = Math.min(
        (thumbSize - padding * 2) / img.naturalWidth,
        (thumbSize - padding * 2) / img.naturalHeight,
      );
      const drawW = Math.round(img.naturalWidth * scale);
      const drawH = Math.round(img.naturalHeight * scale);
      const offsetX = Math.round((thumbSize - drawW) / 2);
      const offsetY = Math.round((thumbSize - drawW) / 2 + (drawW - drawH) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = thumbSize;
      canvas.height = thumbSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 创建失败'));

      // 背景
      ctx.fillStyle = template.backgroundColor;
      ctx.fillRect(0, 0, thumbSize, thumbSize);

      // 渐变（如果有）
      fillGradient(ctx, template.gradient, thumbSize, thumbSize);

      // 阴影 + 主体
      if (template.shadow) {
        ctx.save();
        ctx.shadowColor = template.shadow.color;
        ctx.shadowBlur = template.shadow.blur * scale;
        ctx.shadowOffsetX = template.shadow.offsetX * scale;
        ctx.shadowOffsetY = template.shadow.offsetY * scale;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      }

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('缩略图生成失败'));
    };

    img.src = url;
  });
}
