/**
 * G05: 边缘后期工具 — 羽化、边缘平滑、Alpha 通道处理
 *
 * 纯工具函数，不包含 UI 状态。所有操作基于 Canvas 像素级 Alpha 通道处理。
 */

/** 将 Blob 加载到 Image 元素 */
function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

/** 从 Canvas 导出 Blob */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob 失败'))),
      'image/png',
    );
  });
}

/** 将图片绘制到 Canvas 并返回 ImageData */
function getImageDataFromBlob(blob: Blob): Promise<{
  imageData: ImageData;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}> {
  return blobToImage(blob).then((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { imageData, canvas, ctx };
  });
}

// ============================================================
// 1. 羽化 (Feather) — 对 Alpha 通道做盒式模糊
// ============================================================

/**
 * 对透明 PNG 的 Alpha 通道进行羽化处理。
 * @param blob  透明 PNG Blob
 * @param radius 羽化半径（px），范围 0.5 ~ 30
 * @returns 羽化后的 PNG Blob
 */
export async function featherAlpha(blob: Blob, radius: number): Promise<Blob> {
  if (radius <= 0) return blob;

  const { imageData, canvas, ctx } = await getImageDataFromBlob(blob);
  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data);

  const r = Math.max(1, Math.round(radius));

  // 对 Alpha 通道（索引 3, 7, 11, ...即偏移量 3）做盒式模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      const yMin = Math.max(0, y - r);
      const yMax = Math.min(height - 1, y + r);
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(width - 1, x + r);

      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          sum += data[(ny * width + nx) * 4 + 3];
          count++;
        }
      }

      const idx = (y * width + x) * 4;
      out[idx + 3] = Math.round(sum / count);
    }
  }

  // 写回 Canvas
  const outData = new ImageData(out, width, height);
  ctx.putImageData(outData, 0, 0);
  return canvasToBlob(canvas);
}

// ============================================================
// 2. 边缘平滑 (Smooth) — 形态学闭运算 (先膨胀后腐蚀)
// ============================================================

/**
 * 对 Alpha 通道进行形态学平滑。
 *
 * 闭运算（Dilate → Erode）：填补小空洞、平滑凹凸边缘。
 * 开运算（Erode → Dilate）：去除小噪点。
 * 这里默认使用闭运算（更适合修复抠图粗糙边缘）。
 *
 * @param blob     透明 PNG Blob
 * @param strength 平滑强度（核大小），范围 1 ~ 10
 * @returns 平滑后的 PNG Blob
 */
export async function smoothAlpha(blob: Blob, strength: number): Promise<Blob> {
  if (strength <= 0) return blob;

  const { imageData, canvas, ctx } = await getImageDataFromBlob(blob);
  const { data, width, height } = imageData;

  const k = Math.max(1, Math.min(10, Math.round(strength)));

  // 提取 alpha
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  // 膨胀
  const dilated = morphDilate(alpha, width, height, k);
  // 腐蚀（完成闭运算）
  const closed = morphErode(dilated, width, height, k);

  // 写回 alpha
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < width * height; i++) {
    out[i * 4 + 3] = closed[i];
  }

  const outData = new ImageData(out, width, height);
  ctx.putImageData(outData, 0, 0);
  return canvasToBlob(canvas);
}

/** 形态学膨胀：取核内最大 alpha */
function morphDilate(
  src: Float32Array,
  w: number,
  h: number,
  k: number,
): Float32Array {
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let maxVal = 0;
      for (let dy = -k; dy <= k; dy++) {
        for (let dx = -k; dx <= k; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            maxVal = Math.max(maxVal, src[ny * w + nx]);
          }
        }
      }
      dst[y * w + x] = maxVal;
    }
  }
  return dst;
}

/** 形态学腐蚀：取核内最小 alpha */
function morphErode(
  src: Float32Array,
  w: number,
  h: number,
  k: number,
): Float32Array {
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minVal = 255;
      for (let dy = -k; dy <= k; dy++) {
        for (let dx = -k; dx <= k; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            minVal = Math.min(minVal, src[ny * w + nx]);
          }
        }
      }
      dst[y * w + x] = minVal;
    }
  }
  return dst;
}

// ============================================================
// 3. 手动画笔修复 — 擦除/还原
// ============================================================

/** 画笔模式 */
export type BrushMode = 'erase' | 'restore';

export interface BrushInitOptions {
  /** 透明 PNG Blob */
  blob: Blob;
  /** 目标 Canvas 元素 */
  canvas: HTMLCanvasElement;
}

/** 画笔编辑器实例 */
export interface BrushEditor {
  /** 当前编辑后的 Blob */
  getBlob(): Promise<Blob>;
  /** 开始一笔新笔画（保存当前状态到撤销栈） */
  beginStroke(): void;
  /** 在指定位置绘制画笔 */
  drawBrush(x: number, y: number, size: number, mode: BrushMode): void;
  /** 撤销上一笔 */
  undo(): boolean;
  /** 撤销栈深度 */
  undoCount: number;
  /** 重置到初始状态 */
  reset(): void;
  /** 销毁实例 */
  destroy(): void;
}

/**
 * 创建画笔编辑器实例。
 *
 * 在 Canvas 上提供擦除/恢复画笔功能，支持撤销。
 * 使用 Canvas composite 操作实现高性能画笔。
 */
export async function createBrushEditor(options: BrushInitOptions): Promise<BrushEditor> {
  const { blob, canvas } = options;

  // 加载图片
  const img = await blobToImage(blob);

  // 设置 Canvas 尺寸
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  // 绘制棋盘格背景（显示透明度）
  drawCheckerboard(ctx, canvas.width, canvas.height);

  // 保存原始图片数据（用于恢复画笔）
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = canvas.width;
  originalCanvas.height = canvas.height;
  const origCtx = originalCanvas.getContext('2d')!;
  origCtx.drawImage(img, 0, 0);

  // 在主 Canvas 上绘制图片
  ctx.drawImage(img, 0, 0);

  // 撤销栈：存储 ImageData 快照
  const MAX_UNDO = 15;
  const undoStack: ImageData[] = [];

  /** 获取当前 Canvas 快照 */
  function takeSnapshot(): ImageData {
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /** 保存当前状态到撤销栈 */
  function beginStroke(): void {
    undoStack.push(takeSnapshot());
    if (undoStack.length > MAX_UNDO) {
      undoStack.shift();
    }
  }

  /** 在指定位置绘制画笔 */
  function drawBrush(x: number, y: number, size: number, mode: BrushMode): void {
    const half = size / 2;
    ctx.save();

    if (mode === 'erase') {
      // 擦除：使用 destination-out 将画笔区域 alpha 置零
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 恢复：从原始图片恢复画笔区域的像素
      // 先清除画笔区域，再从原始图片绘制
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalCanvas, 0, 0);
    }

    ctx.restore();
  }

  /** 撤销上一笔 */
  function undo(): boolean {
    const snap = undoStack.pop();
    if (!snap) return false;
    ctx.putImageData(snap, 0, 0);
    // 棋盘格可能被覆盖，重新绘制最底层
    return true;
  }

  /** 重置到初始状态 */
  function reset(): void {
    undoStack.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCheckerboard(ctx, canvas.width, canvas.height);
    ctx.drawImage(originalCanvas, 0, 0);
  }

  /** 获取当前编辑结果 Blob */
  async function getBlob(): Promise<Blob> {
    // 创建临时 Canvas 导出（不含棋盘格背景）
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tmpCtx = tmp.getContext('2d')!;

    // 获取主 Canvas 的当前内容
    const mainData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // 恢复棋盘格覆盖的 alpha（棋盘格本身设置了 alpha，需要修正）
    // 实际上 destination-out 不会影响棋盘格像素，因为 destination-out
    // 只对已存在的像素起作用。但棋盘格灰度可能混入。
    // 更安全的做法：从 originalCanvas 获取 RGB，从 mainCanvas 获取 alpha

    const origData = origCtx.getImageData(0, 0, canvas.width, canvas.height);

    // 合并：orig 的 RGB + main 的 alpha
    const merged = new Uint8ClampedArray(mainData.data.length);
    for (let i = 0; i < mainData.data.length; i += 4) {
      merged[i] = origData.data[i];       // R
      merged[i + 1] = origData.data[i + 1]; // G
      merged[i + 2] = origData.data[i + 2]; // B
      merged[i + 3] = mainData.data[i + 3]; // A (从编辑后的 main canvas)
    }

    tmpCtx.putImageData(new ImageData(merged, canvas.width, canvas.height), 0, 0);
    return canvasToBlob(tmp);
  }

  return {
    getBlob,
    beginStroke,
    drawBrush,
    undo,
    get undoCount() {
      return undoStack.length;
    },
    reset,
    destroy() {
      undoStack.length = 0;
    },
  };
}

/** 在 Canvas 上绘制棋盘格（用于可视化透明区域） */
function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cellSize = 12,
): void {
  const light = '#F0F0F0';
  const dark = '#CCCCCC';
  for (let y = 0; y < h; y += cellSize) {
    for (let x = 0; x < w; x += cellSize) {
      ctx.fillStyle = ((x / cellSize + y / cellSize) % 2 === 0) ? light : dark;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

export function useEdgeTools() {
  return {
    featherAlpha,
    smoothAlpha,
    createBrushEditor,
  };
}
