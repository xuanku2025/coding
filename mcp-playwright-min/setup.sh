#!/usr/bin/env bash
set -euo pipefail

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium

mkdir -p output

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Please edit .env with your real values."
fi

if command -v claude >/dev/null 2>&1; then
  claude mcp add playwright-mcp -- python /Users/enyousun/Desktop/coding/mcp-playwright-min/server.py || true
  echo "Attempted to register MCP server as 'playwright-mcp'."
else
  echo "Claude CLI not found; skip MCP registration."
fi

cat <<'NOTE'
Setup complete.
Run server:
  source .venv/bin/activate
  OUTPUT_DIR="$(pwd)/output" HEADLESS=true python server.py

Add to Claude Code MCP:
  claude mcp add playwright-mcp -- python /Users/enyousun/Desktop/coding/mcp-playwright-min/server.py
NOTE
