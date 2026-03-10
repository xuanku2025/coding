# MCP 接入指南

## 1. Confluence MCP（读取设计规范）

### 官方方案
Atlassian 官方提供了 Confluence MCP Server：
```bash
# 安装
npm install -g @atlassian/confluence-mcp

# 配置（Claude Code 的 .mcp.json）
{
  "mcpServers": {
    "confluence": {
      "command": "confluence-mcp",
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-company.atlassian.net",
        "CONFLUENCE_TOKEN": "<API Token>",
        "CONFLUENCE_EMAIL": "your@email.com"
      }
    }
  }
}
```

### 自建方案（内网 Confluence）
如果是私有部署的 Confluence：
```python
# scripts/sync-confluence.py
# 定期将设计规范同步到 references/design-tokens.md
import requests

CONFLUENCE_URL = "http://your-intranet-confluence"
SPACE_KEY = "DESIGN"

pages = requests.get(
    f"{CONFLUENCE_URL}/rest/api/content",
    params={"spaceKey": SPACE_KEY, "type": "page", "title": "交互规范"},
    auth=("user", "password")
)
```

---

## 2. Jira MCP（查询历史需求）

```bash
# 安装
npm install -g @atlassian/jira-mcp

# 配置
{
  "mcpServers": {
    "jira": {
      "command": "jira-mcp",
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_TOKEN": "<API Token>",
        "JIRA_EMAIL": "your@email.com"
      }
    }
  }
}
```

---

## 3. Figma MCP（访问设计稿）

```bash
# 安装
npm install -g figma-mcp

# 配置
{
  "mcpServers": {
    "figma": {
      "command": "figma-mcp",
      "env": {
        "FIGMA_TOKEN": "<Personal Access Token>"
      }
    }
  }
}
```

---

## 4. 内网访问（线上部署环境）

内网 URL 需要配置网络白名单，让 Claude 的 `web_fetch` 工具可以访问：

**Claude Code**：在 `.mcp.json` 中配置代理：
```json
{
  "network": {
    "proxy": "http://your-intranet-proxy:8080",
    "allowedDomains": ["*.your-company-internal.com"]
  }
}
```

**Cowork**：联系管理员在网络设置中添加内网域名白名单。
