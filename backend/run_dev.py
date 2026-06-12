"""开发环境启动脚本"""
import os
os.environ["ENV"] = "dev"
os.environ["JWT_SECRET"] = os.environ.get("JWT_SECRET", "dev-secret-key-not-for-production")

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
