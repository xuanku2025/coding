#!/usr/bin/env bash
# 在能访问 Confluence 内网的虚拟机上执行
# 使用前：cp .env.example .env 并填写 CONFLUENCE_API_TOKEN(密码) 或 CONFLUENCE_PERSONAL_TOKEN

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f .env ]]; then
  echo "请先复制 .env.example 为 .env 并填写认证信息"
  echo "  用户名+密码：CONFLUENCE_API_TOKEN=你的登录密码"
  echo "  或 Token：CONFLUENCE_PERSONAL_TOKEN=你的Token"
  echo "  cp .env.example .env"
  exit 1
fi

docker run -d \
  --name mcp-atlassian \
  --env-file .env \
  -p 9090:9090 \
  ghcr.io/sooperset/mcp-atlassian:latest \
  --transport streamable-http \
  --port 9090

echo "MCP Server 已启动，本地地址: http://localhost:9090/mcp"
echo "用 ngrok/cloudflared 暴露后，Figma 填: https://你的公网地址/mcp"
