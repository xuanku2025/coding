#!/bin/bash
# extract.sh - 多页遍历提取样式
# 使用方式: bash scripts/extract.sh

set -e

ROUTES=(
  "/dashboard"
  "/users"
  "/settings"
  "/orders"
  # ⬆️ 补充你的内网页面路由
)

BASE_URL="http://your-intranet.com"
# ⬆️ 替换为实际的内网地址

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 开始多页遍历提取..."
echo "   基础地址: $BASE_URL"
echo "   页面数量: ${#ROUTES[@]}"

# 复用登录态
if [ -f ./auth.json ]; then
  echo "🔑 加载已保存的登录态..."
  agent-browser state load ./auth.json
else
  echo "⚠️  未找到 auth.json，请先登录并保存状态："
  echo "   agent-browser open $BASE_URL/login --headed"
  echo "   (手动登录后)"
  echo "   agent-browser state save ./auth.json"
  exit 1
fi

for ROUTE in "${ROUTES[@]}"; do
  echo ""
  echo "📄 正在提取: $BASE_URL$ROUTE"
  agent-browser open "$BASE_URL$ROUTE"
  agent-browser wait --selector "body"
  sleep 1  # 等待动态组件渲染

  # Token 只需首页提取一次
  if [ "$ROUTE" == "${ROUTES[0]}" ]; then
    echo "   🎨 提取全局 Token..."
    agent-browser eval "$(cat "$SCRIPT_DIR/extract-tokens.js")" > tokens.json
    echo "   ✅ tokens.json"
  fi

  # 提取当前页组件样式
  SAFE_ROUTE=$(echo "$ROUTE" | tr '/' '_')
  echo "   🧱 提取组件样式..."
  agent-browser eval "$(cat "$SCRIPT_DIR/extract-components.js")" > "components${SAFE_ROUTE}.json"
  echo "   ✅ components${SAFE_ROUTE}.json"
done

# 合并所有页面的组件样式
echo ""
echo "🔗 合并组件样式..."
node "$SCRIPT_DIR/merge-components.js" components_*.json > components.json

echo ""
echo "✅ 提取完成！"
echo "   tokens.json     — 全局 CSS 变量 + Ant Design Token"
echo "   components.json — 全部组件样式（含交互状态）"
echo ""
echo "下一步: node scripts/transform.js"
