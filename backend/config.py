"""
统一环境配置模块。

集中管理环境判断逻辑，避免在多个模块中重复定义 IS_DEV/IS_PROD。
"""
import os

# 环境判断：ENV 为 "dev" 或 "development" 时视为开发环境，其余视为生产环境。
ENV = os.environ.get("ENV", "production").lower()
IS_DEV = ENV in ("dev", "development")
IS_PROD = not IS_DEV

# 日志级别配置
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
