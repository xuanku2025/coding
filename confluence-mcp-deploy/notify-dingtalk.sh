#!/usr/bin/env bash
#
# 钉钉机器人通知：把当前 MCP URL 发到群里
#
# 约定：
# - MCP URL 默认从同目录下 MCP_URL.txt 读取
# - 钉钉配置从环境变量读取，或自动读取同目录 notify.env
#
# notify.env 示例（不要提交到 Git）：
#   DINGTALK_WEBHOOK="https://oapi.dingtalk.com/robot/send?access_token=xxx"
#   # 可选：机器人开启“加签”时需要
#   DINGTALK_SECRET="SECxxxx"
#
# 用法：
#   ./notify-dingtalk.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$SCRIPT_DIR}"

MCP_URL_FILE="${MCP_URL_FILE:-$DEPLOY_DIR/MCP_URL.txt}"
NOTIFY_ENV_FILE="${NOTIFY_ENV_FILE:-$DEPLOY_DIR/notify.env}"

if [[ -f "$NOTIFY_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$NOTIFY_ENV_FILE"
fi

: "${DINGTALK_WEBHOOK:?未设置 DINGTALK_WEBHOOK（可写入 $NOTIFY_ENV_FILE）}"

if [[ ! -f "$MCP_URL_FILE" ]]; then
  echo "[ERROR] 未找到 $MCP_URL_FILE，无法发送通知" >&2
  exit 1
fi

MCP_URL="$(cat "$MCP_URL_FILE" | tr -d '\r\n')"
if [[ -z "$MCP_URL" ]]; then
  echo "[ERROR] $MCP_URL_FILE 内容为空" >&2
  exit 1
fi

HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"
NOW="$(date '+%F %T' 2>/dev/null || true)"

MESSAGE="【MCP 地址更新】\n主机：${HOSTNAME_SHORT}\n时间：${NOW}\nMCP：${MCP_URL}"

urlencode() {
  # 尽量少依赖：优先 python3
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.stdin.read().strip(), safe=""))
PY
    return 0
  fi
  # 退化：没有 python3 就原样输出（加签场景可能失败）
  cat
}

build_signed_webhook() {
  local base="$1"
  local secret="$2"

  if [[ -z "$secret" ]]; then
    echo "$base"
    return 0
  fi

  if ! command -v openssl >/dev/null 2>&1; then
    echo "[WARN] 未找到 openssl，无法生成钉钉加签参数，将尝试不加签发送" >&2
    echo "$base"
    return 0
  fi

  local ts
  ts="$(($(date +%s%3N 2>/dev/null || date +%s)*1000))"

  local string_to_sign
  string_to_sign="${ts}\n${secret}"

  local sign_raw
  sign_raw="$(printf "%b" "$string_to_sign" | openssl dgst -sha256 -hmac "$secret" -binary | openssl base64)"

  local sign_enc
  sign_enc="$(printf "%s" "$sign_raw" | urlencode)"

  if [[ "$base" == *\?* ]]; then
    echo "${base}&timestamp=${ts}&sign=${sign_enc}"
  else
    echo "${base}?timestamp=${ts}&sign=${sign_enc}"
  fi
}

WEBHOOK_URL="$(build_signed_webhook "$DINGTALK_WEBHOOK" "${DINGTALK_SECRET:-}")"

payload="$(cat <<EOF
{"msgtype":"text","text":{"content":"$MESSAGE"}}
EOF
)"

curl -sS -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  --data "$payload" >/dev/null

echo "[OK] 已发送钉钉通知"

