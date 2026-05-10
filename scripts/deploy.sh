#!/bin/bash
# ============================================================
# scripts/deploy.sh — Lunara Vercel 部署脚本
# ============================================================
# 1. 验证 git remote origin 已配置
# 2. 推送代码到 GitHub
# 3. 通过 Vercel CLI 部署到生产环境
# ============================================================

set -e
echo "=== Deploying Lunara to Vercel ==="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 验证 git remote
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "⚠️  No git remote 'origin' configured."
  exit 1
fi

# 推送当前分支到 GitHub
CURRENT_BRANCH=$(git branch --show-current)
echo "Pushing to GitHub (branch: $CURRENT_BRANCH)..."
git push origin "$CURRENT_BRANCH"

# 部署到 Vercel 生产环境
echo "Deploying to Vercel (production)..."
vercel --prod

echo "=== Deployment complete! ==="
