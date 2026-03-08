#!/usr/bin/env bash
#
# Confluence MCP 卸载/清理脚本
# 停止并删除 mcp-atlassian 容器、移除 cloudflared-mcp systemd 服务，
# 并清理生成的配置文件和日志。
#
# 用法（root 权限执行）：
#   sudo ./uninstall.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$SCRIPT_DIR}"

SERVICE_NAME="cloudflared-mcp"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查权限
if [[ "$(id -u)" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    exec sudo bash "$0" "$@"
  else
    log_error "当前需使用 root 权限执行卸载（如 sudo ./uninstall.sh）"
    exit 1
  fi
fi

log_info "开始卸载 Confluence MCP 部署..."

# 1. 停止并移除 systemd 服务 (cloudflared-mcp)
if systemctl list-unit-files | grep -q "${SERVICE_NAME}.service"; then
  log_info "停止并禁用 systemd 服务: ${SERVICE_NAME}"
  systemctl stop "$SERVICE_NAME" || true
  systemctl disable "$SERVICE_NAME" || true
else
  log_info "未检测到活动的 ${SERVICE_NAME} 服务，跳过系统服务清理"
fi

if [[ -f "$SERVICE_FILE" ]]; then
  log_info "删除服务文件 $SERVICE_FILE"
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload
fi

# 终止可能游离的 tunnel 和 ngrok 进程（防御性操作）
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "ngrok http" 2>/dev/null || true

# 2. 停止并删除 docker 容器 (mcp-atlassian)
if command -v docker >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -qx 'mcp-atlassian'; then
    log_info "停止并删除 Docker 容器: mcp-atlassian"
    docker rm -f mcp-atlassian >/dev/null
  else
    log_info "未找到 mcp-atlassian 容器，跳过容器清理"
  fi
else
  log_warn "系统未发现 Docker 命令，跳过容器清理"
fi

# 3. 删除自动生成的配置/状态文件
log_info "清理部署目录 (${DEPLOY_DIR}) 和系统临时文件中生成的配置和日志文件..."

FILES_TO_REMOVE=(
  "${DEPLOY_DIR}/.env"
  "${DEPLOY_DIR}/notify.env"
  "${DEPLOY_DIR}/MCP_URL.txt"
  "${DEPLOY_DIR}/PUBLIC_URL.txt"
  "/tmp/confluence-mcp-tunnel.log"
)

for f in "${FILES_TO_REMOVE[@]}"; do
  if [[ -f "$f" ]]; then
    rm -f "$f"
    log_info "  - 已删除: $f"
  fi
done

echo ""
log_info "✅ 卸载与清理完成。"
log_warn "注意：本脚本没有自动卸载 cloudflared 和 Docker 软件本身，也没有删除本部署目录的脚本文件。"
log_warn "如果确认不再使用了，你可以直接去删除外部的部署文件夹：rm -rf ${DEPLOY_DIR}"
echo ""
