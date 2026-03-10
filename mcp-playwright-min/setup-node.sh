#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

npm install
npx playwright install chromium

mkdir -p output

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Please edit .env with your real values."
fi

if command -v claude >/dev/null 2>&1; then
  claude mcp add playwright-mcp -- node /Users/enyousun/Desktop/coding/mcp-playwright-min/server.mjs || true
  echo "Attempted to register MCP server as 'playwright-mcp'."
else
  echo "Claude CLI not found; skip MCP registration."
fi

cat <<'NOTE'
Node setup complete.
Run server:
  node /Users/enyousun/Desktop/coding/mcp-playwright-min/server.mjs
NOTE
