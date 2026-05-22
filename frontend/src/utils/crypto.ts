/**
 * 图片/文件哈希工具。
 * 使用 Web Crypto API 的 SHA-256 计算文件内容指纹，用于历史记录去重。
 */

/**
 * 计算 Blob 的 SHA-256 哈希（hex 格式）。
 * 注意：大文件可能耗时，仅用于去重（非实时场景）。
 */
export async function computeSHA256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
