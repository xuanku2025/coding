#!/usr/bin/env bash
#
# Confluence MCP 一键启动脚本
# 虚拟机重启后执行此脚本，可启动服务并获取 Figma 配置所需的公网地址
#
# 用法: ./start-and-get-url.sh
# 或:   bash ~/confluence-mcp-deploy/start-and-get-url.sh
#

set -e

# ============ 配置区（按需修改） ============
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/confluence-mcp-deploy}"
MCP_HOST_PORT="${MCP_HOST_PORT:-9092}"   # 宿主机映射端口，若 9090 被占用可改为 9092
TUNNEL_TYPE="${TUNNEL_TYPE:-cloudflared}" # cloudflared 或 ngrok
# MCP 端点路径：默认使用 streamable-http 的 /mcp；如需 SSE 改为 /sse
MCP_PATH="${MCP_PATH:-/mcp}"              # /mcp (streamable-http) 或 /sse (sse)
HEALTH_PATH="${HEALTH_PATH:-/healthz}"    # 就绪检测路径（推荐 /healthz）
# ===========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 标准化 MCP_PATH
if [[ "$MCP_PATH" != /* ]]; then
  MCP_PATH="/$MCP_PATH"
fi

# 标准化 HEALTH_PATH
if [[ "$HEALTH_PATH" != /* ]]; then
  HEALTH_PATH="/$HEALTH_PATH"
fi

# 检查 .env
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  log_error "未找到 $DEPLOY_DIR/.env，请先创建并配置 .env"
  exit 1
fi

# ---------- 1. 启动 mcp-atlassian 容器 ----------
log_info "检查 mcp-atlassian 容器..."

if docker ps -a --format '{{.Names}}' | grep -qx 'mcp-atlassian'; then
  if docker ps --format '{{.Names}}' | grep -qx 'mcp-atlassian'; then
    log_info "mcp-atlassian 已在运行"
  else
    log_info "启动 mcp-atlassian 容器..."
    docker start mcp-atlassian
  fi
else
  log_info "创建并启动 mcp-atlassian 容器..."
  docker run -d \
    --name mcp-atlassian \
    --restart unless-stopped \
    --env-file "$DEPLOY_DIR/.env" \
    -e MCP_VERBOSE=true \
    -p "${MCP_HOST_PORT}:9090" \
    ghcr.io/sooperset/mcp-atlassian:latest \
    --transport streamable-http --port 9090
fi

# 等待 MCP 就绪
MCP_READY_RETRIES="${MCP_READY_RETRIES:-30}"
MCP_READY_SLEEP="${MCP_READY_SLEEP:-1}"

log_info "等待 MCP 服务就绪：http://localhost:${MCP_HOST_PORT}${HEALTH_PATH}"
for ((i=1; i<=MCP_READY_RETRIES; i++)); do
  code="$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${MCP_HOST_PORT}${HEALTH_PATH}" 2>/dev/null || true)"
  if [[ "$code" == "200" ]]; then
    log_info "MCP 服务已就绪（healthz=200）"
    break
  fi
  if [[ $i -eq 1 || $(( i % 5 )) -eq 0 ]]; then
    log_info "等待中（${i}/${MCP_READY_RETRIES}，healthz=${code:-N/A}）"
  fi
  sleep "$MCP_READY_SLEEP"
  [[ $i -eq $MCP_READY_RETRIES ]] && log_error "MCP 服务启动超时（/healthz 未得到 200）" && exit 1
done

# ---------- 2. 启动内网穿透并获取地址 ----------
LOG_FILE="/tmp/confluence-mcp-tunnel.log"
PUBLIC_URL_FILE="${DEPLOY_DIR}/PUBLIC_URL.txt"
MCP_URL_FILE="${DEPLOY_DIR}/MCP_URL.txt"

get_cloudflared_url() {
  if ! command -v cloudflared >/dev/null 2>&1; then
    log_error "未找到 cloudflared（请先运行 bootstrap-deploy.sh 完成安装，或手动安装）"
    return 1
  fi

  # 结束可能存在的旧 cloudflared 进程（同端口）
  pkill -f "cloudflared tunnel --url http://localhost:${MCP_HOST_PORT}" 2>/dev/null || true
  sleep 2

  log_info "启动 cloudflared 隧道（后台常驻）..."
  : > "$LOG_FILE"
  nohup cloudflared tunnel --url "http://localhost:${MCP_HOST_PORT}" >> "$LOG_FILE" 2>&1 &
  disown

  # 等待 URL 出现在日志中
  TUNNEL_URL_RETRIES="${TUNNEL_URL_RETRIES:-45}"
  TUNNEL_URL_SLEEP="${TUNNEL_URL_SLEEP:-2}"
  for ((i=1; i<=TUNNEL_URL_RETRIES; i++)); do
    sleep "$TUNNEL_URL_SLEEP"
    URL="$(
      grep -oE 'https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.(trycloudflare\.com|cfargotunnel\.com)' \
        "$LOG_FILE" 2>/dev/null | head -1
    )"
    if [[ -n "$URL" ]]; then
      echo "$URL"
      return 0
    fi
  done

  log_error "未能从 cloudflared 输出中解析到 URL，请查看 $LOG_FILE"
  log_info "cloudflared 最近日志（最后 80 行）："
  tail -n 80 "$LOG_FILE" 2>/dev/null || true
  echo ""
  log_warn "常见原因：出网/DNS 受限、trycloudflare.com 被拦、或 cloudflared 无法建立隧道。可先测："
  echo "  - getent hosts trycloudflare.com || nslookup trycloudflare.com"
  echo "  - curl -I https://trycloudflare.com"
  return 1
}

get_ngrok_url() {
  NGROK_BIN=""
  for p in "$HOME/ngrok" "$DEPLOY_DIR/ngrok" "/usr/local/bin/ngrok"; do
    [[ -x "$p" ]] && NGROK_BIN="$p" && break
  done
  [[ -z "$NGROK_BIN" ]] && log_error "未找到 ngrok 可执行文件" && return 1

  # 结束可能存在的旧 ngrok
  pkill -f "ngrok http" 2>/dev/null || true
  sleep 2

  log_info "启动 ngrok 隧道（后台常驻）..."
  : > "$LOG_FILE"
  nohup $NGROK_BIN http "$MCP_HOST_PORT" --log=stdout >> "$LOG_FILE" 2>&1 &
  disown

  # ngrok 启动后会在 127.0.0.1:4040 提供 API
  for i in {1..15}; do
    sleep 2
    URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oE 'https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.ngrok-free\.app' | head -1)
    if [[ -n "$URL" ]]; then
      echo "$URL"
      return 0
    fi
  done

  # 若 API 不可用，尝试从日志解析
  URL=$(grep -oE 'https://[a-zA-Z0-9][a-zA-Z0-9.-]*\.ngrok-free\.app' "$LOG_FILE" 2>/dev/null | head -1)
  if [[ -n "$URL" ]]; then
    echo "$URL"
    return 0
  fi

  log_error "未能从 ngrok 获取 URL"
  return 1
}

PUBLIC_URL=""
case "$TUNNEL_TYPE" in
  cloudflared)
    PUBLIC_URL=$(get_cloudflared_url)
    ;;
  ngrok)
    PUBLIC_URL=$(get_ngrok_url)
    ;;
  *)
    log_error "不支持的 TUNNEL_TYPE: $TUNNEL_TYPE，请使用 cloudflared 或 ngrok"
    exit 1
    ;;
esac

if [[ -z "$PUBLIC_URL" ]]; then
  log_error "未能获取公网地址"
  exit 1
fi

# ---------- 3. 输出结果 ----------
MCP_URL="${PUBLIC_URL}${MCP_PATH}"

# 写入文件，便于重启后/同事快速查看
echo "$PUBLIC_URL" > "$PUBLIC_URL_FILE"
echo "$MCP_URL" > "$MCP_URL_FILE"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  Confluence MCP 已启动${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  请在 Figma Make 的 Custom Connector 中配置："
echo ""
echo -e "  ${YELLOW}MCP server URL:${NC}"
echo -e "  ${GREEN}${MCP_URL}${NC}"
echo ""
echo -e "  ${YELLOW}已写入：${NC}"
echo -e "  - ${GREEN}${MCP_URL_FILE}${NC}"
echo -e "  - ${GREEN}${PUBLIC_URL_FILE}${NC}"
echo ""
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  ${YELLOW}提示：${NC}"
echo -e "  - 内网穿透进程已在后台运行（nohup），建议后续改用 systemd 保障重启自启"
echo -e "  - 若需停止 tunnel：pkill -f 'cloudflared tunnel' 或 pkill -f ngrok"
echo -e "  - 若需查看 tunnel 日志：tail -f $LOG_FILE"
echo ""

# ---------- 4. 可选：发送通知（钉钉） ----------
if [[ -x "${DEPLOY_DIR}/notify-dingtalk.sh" ]]; then
  log_info "尝试发送钉钉通知（如不需要可忽略）..."
  "${DEPLOY_DIR}/notify-dingtalk.sh" || log_warn "钉钉通知发送失败（不影响服务运行）"
fi
