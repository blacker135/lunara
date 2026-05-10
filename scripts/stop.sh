#!/bin/bash
# ============================================================
# scripts/stop.sh — Lunara 生产环境停止脚本
# ============================================================
# 1. 读取 PID 文件并终止进程
# 2. 如无 PID 文件则查找 next start 进程并终止
# ============================================================

echo "=== Stopping Lunara ==="

if [ -f /tmp/lunara.pid ]; then
  PID=$(cat /tmp/lunara.pid)
  if kill "$PID" 2>/dev/null; then
    echo "Lunara stopped (PID: $PID)"
  else
    echo "Process not running"
  fi
  rm /tmp/lunara.pid
else
  echo "No PID file found. Checking for next process..."
  if pkill -f "next start" 2>/dev/null; then
    echo "Stopped next process"
  else
    echo "No next process found"
  fi
fi
