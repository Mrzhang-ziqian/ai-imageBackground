/**
 * 示例图生成器 — 使用 Canvas 动态生成演示图片。
 * 新用户可点击这些示例图直接试用背景移除功能。
 */

export interface ExampleImage {
  /** 唯一 ID */
  id: string;
  /** 显示标题 */
  title: string;
  /** 一句话描述 */
  description: string;
  /** 生成的 Blob (PNG) */
  blob: Blob;
  /** 缩略图 Object URL */
  thumbUrl: string;
  /** 文件名 */
  filename: string;
}

/** 创建纯色圆 */
function drawCircleShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** 创建圆角矩形 */
function drawRoundedRectShape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * 生成一张示例图：彩色形状 + 浅灰渐变背景。
 * 返回 PNG Blob + 缩略图 Object URL。
 */
async function makeExampleImage(
  id: string,
  title: string,
  description: string,
  filename: string,
  shapeFn: (ctx: CanvasRenderingContext2D, size: number) => void,
): Promise<ExampleImage> {
  const SIZE = 400;
  const THUMB_SIZE = 100;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // 浅灰渐变背景
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, '#f0f0f0');
  grad.addColorStop(0.5, '#e8e8e8');
  grad.addColorStop(1, '#dcdcdc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 绘制形状
  shapeFn(ctx, SIZE);

  // 转 Blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });

  // 缩略图
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = THUMB_SIZE;
  thumbCanvas.height = THUMB_SIZE;
  const thumbCtx = thumbCanvas.getContext('2d')!;
  thumbCtx.drawImage(canvas, 0, 0, THUMB_SIZE, THUMB_SIZE);
  const thumbUrl = thumbCanvas.toDataURL('image/png');

  return { id, title, description, blob, thumbUrl, filename };
}

/**
 * 生成 3 张内置示例图。
 * 每次调用重新生成（Canvas 绘制极快，无需缓存）。
 */
export async function getExampleImages(): Promise<ExampleImage[]> {

  const examples: ExampleImage[] = [
    await makeExampleImage(
      'ex1', '红苹果', '单个商品图',
      'example_apple.png',
      (ctx, size) => {
        // 添加阴影
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        drawCircleShape(ctx, size * 0.5, size * 0.45, size * 0.18, '#ef4444');
        drawCircleShape(ctx, size * 0.48, size * 0.39, size * 0.03, '#b91c1c');
        ctx.restore();
        // 小茎
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(size * 0.49, size * 0.29);
        ctx.lineTo(size * 0.51, size * 0.2);
        ctx.stroke();
        // 叶子
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(size * 0.53, size * 0.21, 12, 6, 0.4, 0, Math.PI * 2);
        ctx.fill();
      },
    ),
    await makeExampleImage(
      'ex2', '蓝色球体', '产品渲染图',
      'example_ball.png',
      (ctx, size) => {
        // 球体渐变
        const cx = size * 0.5;
        const cy = size * 0.46;
        const r = size * 0.18;
        const radial = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
        radial.addColorStop(0, '#93c5fd');
        radial.addColorStop(0.5, '#3b82f6');
        radial.addColorStop(1, '#1d4ed8');
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = radial;
        ctx.fill();
        ctx.restore();
        // 高光
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fill();
      },
    ),
    await makeExampleImage(
      'ex3', '绿色礼盒', '电商拍照图',
      'example_box.png',
      (ctx, size) => {
        const bw = size * 0.32;
        const bh = size * 0.32;
        const bx = (size - bw) / 2;
        const by = size * 0.38;
        const radius = 16;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        drawRoundedRectShape(ctx, bx, by, bw, bh, radius, '#22c55e');
        ctx.restore();
        // 丝带横条
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(bx, by + bh * 0.42, bw, bh * 0.16);
        // 丝带纵条
        ctx.fillRect(bx + bw * 0.42, by, bw * 0.16, bh);
        // 蝴蝶结中心
        ctx.beginPath();
        ctx.arc(bx + bw * 0.5, by + bh * 0.5, bw * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
      },
    ),
  ];

  return examples;
}

/**
 * 清理示例图的 Object URL。
 */
export function revokeExampleThumbUrls(examples: ExampleImage[]): void {
  for (const ex of examples) {
    if (ex.thumbUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(ex.thumbUrl);
    }
  }
}
