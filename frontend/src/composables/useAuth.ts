/**
 * useAuth — 用户鉴权状态管理（Pinia Store 包装器）
 *
 * K8: 已迁移到 Pinia Store (stores/auth.ts)。
 * 保留此文件以保持现有导入路径向后兼容。
 * 所有状态 = 模块级单例共享（Pinia 原生保证）。
 */
export { useAuthStore as useAuth } from '@/stores/auth'
