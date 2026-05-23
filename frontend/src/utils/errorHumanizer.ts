/**
 * 用户友好的错误消息映射器。
 *
 * 将技术错误（API 状态码、网络异常、连接错误）翻译为普通用户能理解的中文提示。
 */

/** 错误翻译映射表 */
const ERROR_TRANSLATIONS: [RegExp, string][] = [
  // -- 网络 / 连接相关 --
  [/无法连接到服务器|Failed to fetch|NetworkError|ERR_CONNECTION/i, '网络连接失败，请检查您的网络后重试'],
  [/timeout|超时/i, '服务器响应超时，请稍后重试'],

  // -- 服务端错误 --
  [/服务器错误.*500|Internal Server Error/i, '服务器繁忙，请稍后重试'],
  [/服务器错误.*413|Request Entity Too Large/i, '图片文件过大（超过 20MB），请压缩后重新上传'],
  [/服务器错误.*422|Unprocessable/i, '文件格式不支持，请上传 PNG、JPEG 或 WebP 图片'],
  [/服务器错误.*403|Forbidden/i, '无权限访问，请检查登录状态'],
  [/服务器错误.*401|Unauthorized/i, '登录已过期，请重新登录'],
  [/服务器错误.*429|Too Many Requests/i, '请求过于频繁，请稍后重试'],
  [/服务器错误.*(\d{3})/i, '服务器返回异常（状态码 $1），请稍后重试'],

  // -- 请求相关 --
  [/请求失败.*(\d{3})/i, '请求失败（状态码 $1），请稍后重试'],

  // -- 文件相关 --
  [/文件过大.*最大 (\d+)MB/i, (_, max) => `文件过大（最大允许 ${max}MB），请压缩后重试`],
  [/不支持的文件格式/i, '不支持的图片格式，请上传 PNG、JPEG 或 WebP 文件'],

  // -- Canvas / 渲染相关 --
  [/Canvas.*失败|canvas.*fail/i, '图像合成失败，请尝试更换背景色后重试'],
  [/图片加载失败|image.*fail/i, '图片数据读取失败，请重试或更换图片'],

  // -- 合成相关 --
  [/背景颜色合成失败/i, '背景颜色应用失败，请稍后重试或选择其他颜色'],
  [/模板渲染失败/i, '模板应用失败，请尝试其他模板或背景色'],
  [/未找到模板/i, '该模板不可用，请选择其他模板'],

  // -- 笔刷 / 地图相关 --
  [/羽毛化|羽化处理失败/i, '边缘羽化处理失败，请重试'],
  [/平滑处理失败/i, '边缘平滑处理失败，请重试'],
  [/画布初始化失败/i, '画笔工具初始化失败，请刷新页面后重试'],
  [/笔刷导出失败/i, '编辑器数据导出失败，请重试'],

  // -- 下载相关 --
  [/WebP 转换失败/i, '格式转换失败，已自动切换为 PNG 格式。您可下载原图后自行转换'],
  [/复制失败/i, '复制到剪贴板失败，请右键下载图片'],

  // -- 登录 / 注册相关 --
  [/鉴权失败.*401/i, '用户名或密码错误，请重新输入'],
  [/鉴权失败.*409/i, '该邮箱已被注册，请使用其他邮箱'],
  [/鉴权失败.*(\d{3})/i, '鉴权失败（状态码 $1），请重新登录'],
  [/登录失败/i, '登录失败，请检查邮箱和密码'],
  [/注册失败/i, '注册失败，请稍后重试'],

  // -- 通用 --
  [/未知错误/i, '处理过程中发生未知错误，请重试或更换图片'],
  [/处理失败$/i, '图片处理失败，请重试或尝试其他图片'],
];

/**
 * 将原始错误消息转换为用户友好的中文提示。
 *
 * @param rawMessage 原始错误消息（来自 Error.message 或 API 响应）
 * @returns 用户友好的中文提示文本
 *
 * @example
 * humanizeError('无法连接到服务器，请确认后端已启动（http://localhost:8000）')
 * // => '网络连接失败，请检查您的网络后重试'
 *
 * humanizeError('服务器错误 (500)')
 * // => '服务器繁忙，请稍后重试'
 */
export function humanizeError(rawMessage: string): string {
  if (!rawMessage) return '处理失败，请重试';

  for (const [pattern, replacement] of ERROR_TRANSLATIONS) {
    if (pattern.test(rawMessage)) {
      if (typeof replacement === 'function') {
        const match = rawMessage.match(pattern);
        return replacement(rawMessage, match?.[1] || '');
      }
      return replacement;
    }
  }

  // 没有匹配到 → 保留原始消息但截断过长内容
  if (rawMessage.length > 120) {
    return rawMessage.slice(0, 117) + '...';
  }
  return rawMessage;
}

/**
 * 边缘情况专用：从多种错误来源提取可读消息并友好化。
 */
export function humanizeCatch(err: unknown): string {
  if (err instanceof Error) {
    // 特殊处理 QuotaExhaustedError — 通过类名判断（兼容压缩前/后）
    const name = err.name || err.constructor?.name || '';
    if (name === 'QuotaExhaustedError') {
      return humanizeError(err.message || '今日额度已用完');
    }
    return humanizeError(err.message || '未知错误');
  }
  if (typeof err === 'string') return humanizeError(err);
  return humanizeError('未知错误');
}
