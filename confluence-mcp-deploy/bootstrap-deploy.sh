#!/usr/bin/env bash
#
# 一键自助部署脚本（交互式）
# - 适用：本地部署 Confluence/Jira（用户名+密码 Basic Auth），对外用 cloudflared quick tunnel 提供 HTTPS MCP 地址
# - 默认：streamable-http + /mcp
#
# 你需要准备：
# - 一台能访问内网 Confluence/Jira、并能访问公网的虚拟机
# - Docker + systemd
# - （可选）钉钉自定义机器人 Webhook（建议不开启“加签”，省依赖）
#
# 用法：
#   cd ~/confluence-mcp-deploy
#   chmod +x bootstrap-deploy.sh
#   ./bootstrap-deploy.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-$SCRIPT_DIR}"

MCP_CONTAINER_PORT="9090"
MCP_PATH="/mcp"
HEALTH_PATH="/healthz"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    log_err "当前不是 root，且未安装 sudo；无法自动安装依赖。请用 root 账号执行，或先安装 sudo。"
    exit 1
  fi
fi

CONFIG_FILE=""
NON_INTERACTIVE="false"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { log_err "缺少命令：$1"; exit 1; }
}

usage() {
  cat <<'EOF'
用法：
  ./bootstrap-deploy.sh

非交互（推荐给同事复用/批量部署）：
  ./bootstrap-deploy.sh --config ./bootstrap.env --non-interactive

参数：
  --config <path>         指定配置文件（bash env 格式，可参考 bootstrap.env.example）
  --non-interactive       非交互模式：缺少必填项将直接报错
  -h, --help              显示帮助
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --config)
        CONFIG_FILE="${2:-}"
        shift 2
        ;;
      --non-interactive)
        NON_INTERACTIVE="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        log_err "未知参数：$1"
        usage
        exit 1
        ;;
    esac
  done
}

prompt() {
  local var="$1"
  local text="$2"
  local default="${3:-}"
  local val=""
  if [[ -n "$default" ]]; then
    read -r -p "$text [$default]: " val
    val="${val:-$default}"
  else
    read -r -p "$text: " val
  fi
  printf -v "$var" "%s" "$val"
}

prompt_secret() {
  local var="$1"
  local text="$2"
  local val=""
  read -r -s -p "$text: " val
  echo ""
  printf -v "$var" "%s" "$val"
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    log_err "缺少必填配置：$name（建议使用 --config ./bootstrap.env --non-interactive）"
    exit 1
  fi
}

maybe_source_config() {
  if [[ -z "$CONFIG_FILE" ]]; then
    return 0
  fi
  if [[ ! -f "$CONFIG_FILE" ]]; then
    log_err "配置文件不存在：$CONFIG_FILE"
    exit 1
  fi

  # 安全提示：配置文件如果对组/其他用户可读，提醒风险
  if command -v stat >/dev/null 2>&1; then
    # Linux: stat -c %a；macOS: stat -f %Lp（但此脚本主要跑 Linux）
    perm="$(stat -c %a "$CONFIG_FILE" 2>/dev/null || true)"
    if [[ -n "$perm" ]]; then
      # 2xx/4xx/6xx/7xx 意味着 group/other 有读权限
      g="${perm:1:1}"
      o="${perm:2:1}"
      if [[ "$g" != "0" && "$g" != "1" && "$g" != "2" && "$g" != "3" ]] || [[ "$o" != "0" && "$o" != "1" && "$o" != "2" && "$o" != "3" ]]; then
        log_warn "配置文件权限看起来较宽松（$perm）。建议：chmod 600 \"$CONFIG_FILE\""
      fi
    fi
  fi

  log_info "加载配置文件：$CONFIG_FILE"
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
}

install_cloudflared_if_needed() {
  if command -v cloudflared >/dev/null 2>&1; then
    log_info "cloudflared 已安装：$(command -v cloudflared)"
    return 0
  fi

  need_cmd curl
  local arch
  arch="$(uname -m)"

  local asset=""
  case "$arch" in
    x86_64|amd64) asset="cloudflared-linux-amd64" ;;
    aarch64|arm64) asset="cloudflared-linux-arm64" ;;
    *)
      log_err "不支持的架构：$arch（请手动安装 cloudflared）"
      exit 1
      ;;
  esac

  local url="https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}"
  log_info "安装 cloudflared（$arch）..."
  $SUDO curl -fsSL "$url" -o /usr/local/bin/cloudflared
  $SUDO chmod +x /usr/local/bin/cloudflared
  log_info "cloudflared 安装完成：/usr/local/bin/cloudflared"
}

install_docker_if_needed() {
  if command -v docker >/dev/null 2>&1; then
    log_info "Docker 已安装：$(docker --version 2>/dev/null || echo docker)"
    return 0
  fi

  local yn
  prompt yn "检测到未安装 Docker，是否自动安装？(y/n)" "y"
  yn="$(echo "$yn" | tr '[:upper:]' '[:lower:]')"
  if [[ "$yn" != "y" && "$yn" != "yes" ]]; then
    log_err "未安装 Docker，无法继续。请先安装 Docker 后重试。"
    exit 1
  fi

  if [[ ! -f /etc/os-release ]]; then
    log_err "无法识别系统发行版（缺少 /etc/os-release）。请手动安装 Docker。"
    exit 1
  fi

  # shellcheck disable=SC1091
  source /etc/os-release
  local id="${ID:-}"
  local id_like="${ID_LIKE:-}"

  log_info "开始安装 Docker（发行版：${id} ${VERSION_ID:-}）..."

  # Debian/Ubuntu 系
  if [[ "$id" == "ubuntu" || "$id" == "debian" || "$id_like" == *"debian"* ]]; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y ca-certificates curl gnupg
    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/"$id"/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$id \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
    $SUDO apt-get update -y
    $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io
    $SUDO systemctl enable --now docker
    return 0
  fi

  # RHEL/CentOS/Rocky/Alma 系
  if [[ "$id" == "centos" || "$id" == "rhel" || "$id" == "rocky" || "$id" == "almalinux" || "$id_like" == *"rhel"* || "$id_like" == *"fedora"* ]]; then
    if command -v dnf >/dev/null 2>&1; then
      $SUDO dnf -y install dnf-plugins-core
      $SUDO dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      $SUDO dnf -y install docker-ce docker-ce-cli containerd.io
    else
      $SUDO yum -y install yum-utils
      $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      $SUDO yum -y install docker-ce docker-ce-cli containerd.io
    fi
    $SUDO systemctl enable --now docker
    return 0
  fi

  log_err "未覆盖的发行版：${id}。请手动安装 Docker 后重试。"
  exit 1
}

start_mcp_container() {
  local host_port="$1"
  log_info "启动/重建 mcp-atlassian 容器（host:${host_port} -> container:${MCP_CONTAINER_PORT}）..."

  docker rm -f mcp-atlassian >/dev/null 2>&1 || true
  docker run -d \
    --name mcp-atlassian \
    --restart unless-stopped \
    --env-file "${DEPLOY_DIR}/.env" \
    -e MCP_VERBOSE=true \
    -p "${host_port}:${MCP_CONTAINER_PORT}" \
    ghcr.io/sooperset/mcp-atlassian:latest \
    --transport streamable-http --port "${MCP_CONTAINER_PORT}" >/dev/null
}

wait_mcp_ready() {
  local host_port="$1"
  # /mcp 是 JSON-RPC 端点，直接 GET 可能返回 400；用 /healthz 判断启动完成更稳
  log_info "等待 MCP 就绪：http://localhost:${host_port}${HEALTH_PATH}"
  for i in {1..30}; do
    code="$(curl -s -o /dev/null -w "%{http_code}" \
      "http://localhost:${host_port}${HEALTH_PATH}" 2>/dev/null || true)"
    if [[ "$code" == "200" ]]; then
      log_info "MCP 已就绪（healthz=200）"
      return 0
    fi
    sleep 1
  done
  log_err "MCP 启动超时（/healthz 未得到 200）。请查看：docker logs mcp-atlassian --tail 120"
  exit 1
}

main() {
  log_info "部署目录：$DEPLOY_DIR"
  cd "$DEPLOY_DIR"

  need_cmd systemctl
  need_cmd curl
  install_docker_if_needed

  maybe_source_config

  # 1) 采集输入
  if [[ "$NON_INTERACTIVE" == "true" ]]; then
    require_var CONFLUENCE_URL
    require_var CONFLUENCE_USERNAME
    require_var CONFLUENCE_PASSWORD

    CONFLUENCE_SSL_VERIFY="${CONFLUENCE_SSL_VERIFY:-false}"
    JIRA_ENABLE="${JIRA_ENABLE:-false}"
    JIRA_SSL_VERIFY="${JIRA_SSL_VERIFY:-false}"
    MCP_HOST_PORT="${MCP_HOST_PORT:-9092}"
    DINGTALK_WEBHOOK="${DINGTALK_WEBHOOK:-}"
    DINGTALK_SECRET="${DINGTALK_SECRET:-}"

    JIRA_ENABLE="$(echo "$JIRA_ENABLE" | tr '[:upper:]' '[:lower:]')"
    if [[ "$JIRA_ENABLE" == "true" || "$JIRA_ENABLE" == "y" || "$JIRA_ENABLE" == "yes" ]]; then
      require_var JIRA_URL
      require_var JIRA_USERNAME
      require_var JIRA_PASSWORD
    else
      JIRA_URL=""
      JIRA_USERNAME=""
      JIRA_PASSWORD=""
    fi
  else
    echo ""
    echo -e "${YELLOW}请按提示填写（回车使用默认值）。密码输入不可见。${NC}"
    echo ""

    prompt CONFLUENCE_URL "Confluence URL（不要末尾斜杠）" "${CONFLUENCE_URL:-http://confluence.zstack.io}"
    if [[ -z "${CONFLUENCE_USERNAME:-}" ]]; then
      prompt CONFLUENCE_USERNAME "Confluence 用户名"
    else
      prompt CONFLUENCE_USERNAME "Confluence 用户名" "$CONFLUENCE_USERNAME"
    fi
    prompt_secret CONFLUENCE_PASSWORD "Confluence 密码"

    prompt JIRA_ENABLE "是否启用 Jira？(y/n)" "${JIRA_ENABLE:-y}"
    JIRA_ENABLE="$(echo "$JIRA_ENABLE" | tr '[:upper:]' '[:lower:]')"
    if [[ "$JIRA_ENABLE" == "y" || "$JIRA_ENABLE" == "yes" ]]; then
      prompt JIRA_URL "Jira URL（不要末尾斜杠）" "${JIRA_URL:-http://jira.your-company.com}"
      if [[ -z "${JIRA_USERNAME:-}" ]]; then
        prompt JIRA_USERNAME "Jira 用户名"
      else
        prompt JIRA_USERNAME "Jira 用户名" "$JIRA_USERNAME"
      fi
      prompt_secret JIRA_PASSWORD "Jira 密码"
    else
      JIRA_URL=""
      JIRA_USERNAME=""
      JIRA_PASSWORD=""
    fi

    prompt CONFLUENCE_SSL_VERIFY "Confluence SSL 校验（true/false，内网 HTTP 用 false）" "${CONFLUENCE_SSL_VERIFY:-false}"
    prompt JIRA_SSL_VERIFY "Jira SSL 校验（true/false，内网 HTTP 用 false）" "${JIRA_SSL_VERIFY:-false}"

    prompt MCP_HOST_PORT "宿主机端口（映射到容器 9090）" "${MCP_HOST_PORT:-9092}"

    echo ""
    prompt DINGTALK_WEBHOOK "钉钉机器人 Webhook（可留空跳过通知）" "${DINGTALK_WEBHOOK:-}"
    if [[ -n "$DINGTALK_WEBHOOK" ]]; then
      prompt DINGTALK_SECRET "钉钉机器人加签 Secret（可留空）" "${DINGTALK_SECRET:-}"
    else
      DINGTALK_SECRET=""
    fi
  fi

  # 2) 写配置文件（不入库）
  log_info "写入 .env（已在 .gitignore 忽略）"
  {
    echo "CONFLUENCE_URL=${CONFLUENCE_URL}"
    echo "CONFLUENCE_USERNAME=${CONFLUENCE_USERNAME}"
    echo "CONFLUENCE_API_TOKEN=${CONFLUENCE_PASSWORD}"
    echo "CONFLUENCE_SSL_VERIFY=${CONFLUENCE_SSL_VERIFY}"
    echo "MCP_PORT=${MCP_CONTAINER_PORT}"
    if [[ -n "$JIRA_URL" ]]; then
      echo ""
      echo "JIRA_URL=${JIRA_URL}"
      echo "JIRA_USERNAME=${JIRA_USERNAME}"
      echo "JIRA_API_TOKEN=${JIRA_PASSWORD}"
      echo "JIRA_SSL_VERIFY=${JIRA_SSL_VERIFY}"
    fi
  } > "${DEPLOY_DIR}/.env"

  if [[ -n "$DINGTALK_WEBHOOK" ]]; then
    log_info "写入 notify.env（已在 .gitignore 忽略）"
    {
      echo "DINGTALK_WEBHOOK=\"${DINGTALK_WEBHOOK}\""
      if [[ -n "$DINGTALK_SECRET" ]]; then
        echo "DINGTALK_SECRET=\"${DINGTALK_SECRET}\""
      fi
    } > "${DEPLOY_DIR}/notify.env"
  else
    log_warn "未配置钉钉 Webhook，将跳过自动通知"
  fi

  chmod +x "${DEPLOY_DIR}/start-and-get-url.sh" "${DEPLOY_DIR}/install-autostart-systemd.sh" "${DEPLOY_DIR}/notify-dingtalk.sh" 2>/dev/null || true

  # 3) 起容器 + 本机验证
  start_mcp_container "$MCP_HOST_PORT"
  wait_mcp_ready "$MCP_HOST_PORT"

  # 4) 安装 cloudflared + 安装 systemd 自启（tunnel + 写 URL + 可选钉钉通知）
  install_cloudflared_if_needed

  log_info "安装/启用 systemd 自启动（cloudflared-mcp）..."
  $SUDO DEPLOY_DIR="${DEPLOY_DIR}" MCP_HOST_PORT="${MCP_HOST_PORT}" MCP_PATH="${MCP_PATH}" \
    bash "${DEPLOY_DIR}/install-autostart-systemd.sh"

  # 5) 输出结果
  local mcp_url_file="${DEPLOY_DIR}/MCP_URL.txt"
  if [[ -f "$mcp_url_file" ]]; then
    echo ""
    log_info "部署完成。当前 MCP URL（复制到 Figma Connector）："
    cat "$mcp_url_file"
  else
    log_warn "未找到 ${mcp_url_file}，请查看 tunnel 日志：tail -n 80 /tmp/confluence-mcp-tunnel.log"
  fi

  # 6) 立即发一次通知（如果配置了）
  if [[ -n "$DINGTALK_WEBHOOK" ]]; then
    log_info "发送钉钉通知..."
    "${DEPLOY_DIR}/notify-dingtalk.sh" || log_warn "钉钉通知发送失败（不影响服务）"
  fi

  echo ""
  log_info "后续运维："
  echo "  - 查看当前 URL：cat ${DEPLOY_DIR}/MCP_URL.txt"
  echo "  - 查看容器日志：docker logs mcp-atlassian --tail 120"
  echo "  - 查看 tunnel 日志：tail -n 80 /tmp/confluence-mcp-tunnel.log"
  echo "  - 查看服务状态：systemctl status cloudflared-mcp"
}

parse_args "$@"
main

