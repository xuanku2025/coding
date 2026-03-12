# Copilot → Anthropic Proxy

让 Claude Code 通过 GitHub Copilot 的配额使用 Claude 模型。

## 工作原理

```
Claude Code → Anthropic Messages API → 本地代理 :8787 → OpenAI 格式转换 → GitHub Copilot API
```

代理自动完成：
- 从 OpenCode 的 auth.json 读取 GitHub OAuth token（`gho_*`）
- 直接使用 OAuth token 作为 Bearer 认证（与 OpenCode 相同的认证方式，无需 JWT 交换）
- Anthropic ↔ OpenAI 格式双向转换（含 streaming SSE）
- 所有出站请求走 HTTP CONNECT 代理

## 快速启动

```bash
# 1. 确保 OpenCode 已登录 GitHub Copilot（auth.json 中有 token）
cat ~/.local/share/opencode/auth.json

# 2. 启动代理
node proxy.mjs

# 3. 配置 Claude Code 使用代理
export ANTHROPIC_BASE_URL=http://localhost:8787
claude
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8787` | 代理监听端口 |
| `HTTPS_PROXY` | `http://127.0.0.1:7897` | 出站 HTTPS 代理 |
| `AUTH_JSON_PATH` | `~/.local/share/opencode/auth.json` | OAuth token 文件路径 |

## 测试

```bash
# 健康检查
curl http://localhost:8787/

# 查看可用模型
curl http://localhost:8787/v1/models

# 非 streaming 请求
curl -X POST http://localhost:8787/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: dummy" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello"}]
  }'

# Streaming 请求
curl -X POST http://localhost:8787/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: dummy" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4",
    "max_tokens": 100,
    "stream": true,
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

## 在 Claude Code 中使用

```bash
# 方式 1：启动时指定
ANTHROPIC_BASE_URL=http://localhost:8787 claude

# 方式 2：写入 shell 配置
echo 'export ANTHROPIC_BASE_URL=http://localhost:8787' >> ~/.zshrc
source ~/.zshrc
claude
```

## 可用模型

通过 Copilot API 可使用以下 Claude 模型（以及其他 GPT/Gemini 模型）：

| 模型 ID | 名称 | 类型 |
|---------|------|------|
| `claude-opus-4.6` | Claude Opus 4.6 | powerful |
| `claude-sonnet-4.6` | Claude Sonnet 4.6 | versatile |
| `claude-opus-4.5` | Claude Opus 4.5 | powerful |
| `claude-sonnet-4.5` | Claude Sonnet 4.5 | versatile |
| `claude-sonnet-4` | Claude Sonnet 4 | versatile |
| `claude-haiku-4.5` | Claude Haiku 4.5 | versatile |

## 注意事项

- 需要有效的 GitHub Copilot 订阅
- Token 用量受 Copilot 计划限制
- 使用 OpenCode 的 OAuth token 直接认证，无 token 交换延迟
- 代理不存储任何对话内容
- `x-api-key` 头可填任意值（代理忽略，使用 auth.json 中的 token）
