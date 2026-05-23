import { RECOMMENDED_MAX_DIM } from '@/types';

/**
 * 从 File 对象中读取图片的原始尺寸。
 * 返回 { width, height }，失败返回 null。
 */
export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null); // 无法读取尺寸，静默放行
    };
    img.src = url;
  });
}

/**
 * 使用 Canvas 在客户端将图片缩放到指定最大边长。
 * 保持原始宽高比，JPEG 输出质量为 0.92。
 *
 * @param file    原始图片文件
 * @param maxDim  目标最大边长
 * @returns 缩放后的 Blob（image/jpeg）或原始 file（如果无需缩放）
 */
export async function resizeImageClient(file: File, maxDim: number = RECOMMENDED_MAX_DIM): Promise<Blob> {
  const dims = await readImageDimensions(file);
  if (!dims || Math.max(dims.width, dims.height) <= maxDim) {
    // 尺寸在范围内，返回原始文件内容
    return file;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放比例
      const ratio = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
      const newW = Math.round(img.naturalWidth * ratio);
      const newH = Math.round(img.naturalHeight * ratio);

      // Canvas 绘制缩放
      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 上下文创建失败'));
        return;
      }
      ctx.drawImage(img, 0, 0, newW, newH);

      // 输出为 JPEG（比 PNG 小很多，对 AI 抠图质量无影响）
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas 缩放失败'));
          }
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败，无法缩放'));
    };
    img.src = url;
  });
}

/**
 * 格式化文件尺寸为人类可读字符串。
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 从图片 Blob/File 生成缩略图 Data URL。
 * @param source  图片源（Blob 或 File，通过 URL.createObjectURL 加载）
 * @param maxDim  缩略图最大边长，默认 100px
 * @returns JPEG data URL，加载失败返回空字符串
 */
export function createThumbnail(source: Blob | File, maxDim: number = 100): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(source);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const scale = maxDim / Math.max(img.width, img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}
