#!/usr/bin/env bash
# ============================================================
# 安装 & 快速验证脚本
# 用法：bash setup.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Legacy Atlassian MCP - 安装向导"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 读取 .env
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件，请先配置："
    cp .env.example .env
    echo "   已生成 .env，请编辑填入真实地址和账号，再重新运行此脚本。"
    echo ""
    exit 1
fi
source .env

# 2. 安装依赖
echo ""
echo "▶ 安装 Python 依赖..."
pip install -r requirements.txt -q

# 3. 验证 Confluence 连通性
echo ""
echo "▶ 测试 Confluence 连通性..."
CONF_RESPONSE=$(python3 - <<EOF
import urllib.request, base64, json
token = base64.b64encode(b"${CONFLUENCE_USER}:${CONFLUENCE_PASS}").decode()
req = urllib.request.Request(
    "${CONFLUENCE_URL}/rest/api/space?limit=1",
    headers={"Authorization": f"Basic {token}", "Accept": "application/json"}
)
try:
    with urllib.request.urlopen(req, timeout=8) as r:
        data = json.loads(r.read())
        print(f"✅ Confluence 连接成功！找到 Space: {data['results'][0]['name'] if data.get('results') else '(空)'}")
except Exception as e:
    print(f"❌ Confluence 连接失败: {e}")
EOF
)
echo "   $CONF_RESPONSE"

# 4. 验证 Jira 连通性
echo ""
echo "▶ 测试 Jira 连通性..."
JIRA_RESPONSE=$(python3 - <<EOF
import urllib.request, base64, json
token = base64.b64encode(b"${JIRA_USER}:${JIRA_PASS}").decode()
req = urllib.request.Request(
    "${JIRA_URL}/rest/api/2/myself",
    headers={"Authorization": f"Basic {token}", "Accept": "application/json"}
)
try:
    with urllib.request.urlopen(req, timeout=8) as r:
        data = json.loads(r.read())
        print(f"✅ Jira 连接成功！登录用户: {data.get('displayName', data.get('name',''))}")
except Exception as e:
    print(f"❌ Jira 连接失败: {e}")
EOF
)
echo "   $JIRA_RESPONSE"

# 5. 打印 Claude 配置
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 安装完成！"
echo ""
echo "  将以下内容添加到 Claude Code 的 .mcp.json："
echo ""
cat <<JSON
{
  "mcpServers": {
    "legacy-atlassian": {
      "command": "python3",
      "args": ["$(pwd)/server.py"],
      "env": {
        "CONFLUENCE_URL": "${CONFLUENCE_URL}",
        "CONFLUENCE_USER": "${CONFLUENCE_USER}",
        "CONFLUENCE_PASS": "${CONFLUENCE_PASS}",
        "JIRA_URL":        "${JIRA_URL}",
        "JIRA_USER":       "${JIRA_USER}",
        "JIRA_PASS":       "${JIRA_PASS}"
      }
    }
  }
}
JSON
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
