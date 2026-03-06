#!/usr/bin/env bash
#
# 为 confluence-mcp-deploy 安装 systemd 自启动（推荐用于虚拟机重启后自动恢复）
#
# 功能：
# - 依赖 Docker 的容器自启（mcp-atlassian 需 --restart unless-stopped）
# - 安装并启用 cloudflared quick tunnel 的 systemd 服务（默认暴露 localhost:${MCP_HOST_PORT}）
# - 将公网 URL 与 Figma 连接器 URL 写入 DEPLOY_DIR 下的文件，便于同事查看
#
# 用法（root 执行）：
#   sudo bash install-autostart-systemd.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$SCRIPT_DIR}"
MCP_HOST_PORT="${MCP_HOST_PORT:-9092}"
MCP_PATH="${MCP_PATH:-/mcp}"
TUNNEL_TYPE="${TUNNEL_TYPE:-cloudflared}" # 目前只支持 cloudflared（quick tunnel）

SERVICE_NAME="${SERVICE_NAME:-cloudflared-mcp}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

LOG_FILE="/tmp/confluence-mcp-tunnel.log"
PUBLIC_URL_FILE="${DEPLOY_DIR}/PUBLIC_URL.txt"
MCP_URL_FILE="${DEPLOY_DIR}/MCP_URL.txt"
NOTIFY_SCRIPT="${DEPLOY_DIR}/notify-dingtalk.sh"
WRAPPER_SCRIPT="${DEPLOY_DIR}/run-cloudflared-tunnel.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [[ "$MCP_PATH" != /* ]]; then
  MCP_PATH="/$MCP_PATH"
fi

if [[ "$TUNNEL_TYPE" != "cloudflared" ]]; then
  log_error "当前脚本仅支持 TUNNEL_TYPE=cloudflared（quick tunnel）。"
  exit 1
fi

if [[ ! -d "$DEPLOY_DIR" ]]; then
  log_error "DEPLOY_DIR 不存在：$DEPLOY_DIR"
  exit 1
fi

if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  log_warn "未找到 $DEPLOY_DIR/.env（不影响 tunnel service 安装，但容器侧认证需自行配置）"
fi

# 优先使用随包携带的 cloudflared（避免 VM 无法访问 GitHub）
if ! command -v cloudflared >/dev/null 2>&1; then
  BUNDLED="${DEPLOY_DIR}/cloudflared-linux-amd64"
  if [[ -f "$BUNDLED" ]]; then
    log_info "检测到随包 cloudflared，安装到 /usr/local/bin/cloudflared"
    install -m 0755 "$BUNDLED" /usr/local/bin/cloudflared
  fi
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  log_error "未找到 cloudflared，请先安装到 PATH（建议 /usr/local/bin/cloudflared）"
  exit 1
fi

if ! command -v systemctl >/dev/null 2>&1; then
  log_error "当前系统未检测到 systemd/systemctl，无法安装 service。"
  exit 1
fi

if [[ ! -f "$WRAPPER_SCRIPT" ]]; then
  log_error "未找到 $WRAPPER_SCRIPT，请确保 run-cloudflared-tunnel.sh 在部署目录中"
  exit 1
fi
chmod +x "$WRAPPER_SCRIPT"

log_info "写入 systemd service：$SERVICE_FILE"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Cloudflare Quick Tunnel for MCP Atlassian
After=network.target docker.service
Wants=network.target docker.service

[Service]
Type=simple
Environment=LOG_FILE=${LOG_FILE}
Environment=PUBLIC_URL_FILE=${PUBLIC_URL_FILE}
Environment=MCP_URL_FILE=${MCP_URL_FILE}
Environment=MCP_PATH=${MCP_PATH}
Environment=MCP_HOST_PORT=${MCP_HOST_PORT}
Environment=NOTIFY_SCRIPT=${NOTIFY_SCRIPT}
ExecStart=${WRAPPER_SCRIPT}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

log_info "刷新并启用 service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

log_info "安装完成。当前状态："
systemctl --no-pager --full status "$SERVICE_NAME" || true

echo ""
echo -e "${YELLOW}查看当前 Figma 连接地址：${NC}"
echo "  cat \"$MCP_URL_FILE\""
echo ""
echo -e "${YELLOW}查看 tunnel 日志：${NC}"
echo "  tail -n 80 \"$LOG_FILE\""
echo ""

