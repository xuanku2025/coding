#!/usr/bin/env bash
#
# cloudflared quick tunnel 启动脚本（供 systemd 调用）
# 启动 tunnel、解析 URL、写入文件、可选钉钉通知，然后常驻
#
set -euo pipefail

: "${LOG_FILE:?}"
: "${PUBLIC_URL_FILE:?}"
: "${MCP_URL_FILE:?}"
: "${MCP_PATH:=/mcp}"
: "${MCP_HOST_PORT:=9092}"
: "${NOTIFY_SCRIPT:=}"

: > "$LOG_FILE"
cloudflared tunnel --url "http://localhost:${MCP_HOST_PORT}" >> "$LOG_FILE" 2>&1 &
CF_PID=$!

last_url=""

# cloudflared 可能在网络抖动/限流时延迟返回 URL；保持轮询，URL 一旦出现就写入文件并通知。
while kill -0 "$CF_PID" 2>/dev/null; do
  URL="$(
    grep -oE 'https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.(trycloudflare\.com|cfargotunnel\.com)' \
      "$LOG_FILE" 2>/dev/null | head -1
  )"

  if [[ -n "$URL" && "$URL" != "$last_url" ]]; then
    echo "$URL" > "$PUBLIC_URL_FILE"
    echo "${URL}${MCP_PATH}" > "$MCP_URL_FILE"
    last_url="$URL"

    if [[ -n "$NOTIFY_SCRIPT" && -x "$NOTIFY_SCRIPT" ]]; then
      "$NOTIFY_SCRIPT" || true
    fi
  fi

  sleep 2
done

wait "$CF_PID"
