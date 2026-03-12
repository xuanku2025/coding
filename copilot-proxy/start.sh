#!/usr/bin/env bash
# Copilot Proxy — 一键启动
# 用法:
#   ./start.sh          启动代理（后台）
#   ./start.sh claude   启动代理 + 打开 Claude Code
#   ./start.sh stop     停止代理

set -euo pipefail

PORT="${PORT:-8787}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-}" in
  stop)
    PID=$(lsof -t -i :"$PORT" 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill "$PID" 2>/dev/null
      echo "✓ 代理已停止 (PID $PID)"
    else
      echo "代理未在运行"
    fi
    exit 0
    ;;
esac

# 如果已在运行，跳过启动
if lsof -i :"$PORT" >/dev/null 2>&1; then
  echo "✓ 代理已在运行 (端口 $PORT)"
else
  nohup node "$SCRIPT_DIR/proxy.mjs" > "$SCRIPT_DIR/proxy.log" 2>&1 &
  sleep 1
  if curl -sf "http://localhost:$PORT/" > /dev/null 2>&1; then
    echo "✓ 代理已启动 → http://localhost:$PORT"
  else
    echo "✗ 代理启动失败，查看日志: $SCRIPT_DIR/proxy.log"
    exit 1
  fi
fi

# 传了 claude 参数就直接打开
if [ "${1:-}" = "claude" ]; then
  exec claude
fi
