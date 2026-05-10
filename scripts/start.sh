#!/bin/bash
# ============================================================
# scripts/start.sh — Lunara 生产环境启动脚本
# ============================================================
# 1. 检查 .env.local 文件，不存在则从模板创建
# 2. 安装依赖
# 3. 构建项目
# 4. 启动生产服务器（端口 3000）
# ============================================================

set -e
echo "=== Starting Lunara ==="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查环境变量文件
if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.local.example .env.local
  echo "⚠️  Please edit .env.local with your keys before proceeding."
  exit 1
fi

# 安装依赖
echo "Installing dependencies..."
npm install --silent

# 构建项目
echo "Building application..."
npm run build

# 启动生产服务器
echo "Starting production server on port 3000..."
npx next start -p 3000 &
echo $! > /tmp/lunara.pid

echo "Lunara started (PID: $(cat /tmp/lunara.pid))"
