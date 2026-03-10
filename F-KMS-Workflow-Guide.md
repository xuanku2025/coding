# F-KMS 集成 PRD 设计工作流程文档

本文档记录了从 Confluence 需求文档到 Figma 设计输出的完整工作流程，包含使用的工具、命令和最佳实践。

---

## 一、工作流程概览

```
Confluence (PRD文档)
    ↓
Figma 设计 (多页面交互)
    ↓
HTML Demo (可交互原型)
```

### 涉及的主要任务

1. **需求获取** - 从 Confluence 获取「F-KMS集成-PRD」文档
2. **设计生成** - 使用 Figma MCP 生成页面设计
3. **交互原型** - 创建可交互的 HTML Demo

---

## 二、使用的 MCP 服务器和插件

### 2.1 Confluence MCP (Legacy Atlassian)

**用途**: 获取 PRD 需求文档内容

**安装方式**:

```bash
# 方式1: 通过 Claude Code 设置 (推荐)
# 在 Claude Code 中运行:
/mcp add legacy-atlassian

# 方式2: 手动配置
# 在 claude_desktop_config.json 中添加:
{
  "mcpServers": {
    "legacy-atlassian": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-confluence"],
      "env": {
        "CONFLUENCE_URL": "https://your-domain.atlassian.net",
        "CONFLUENCE_USERNAME": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**获取 API Token**:
1. 登录 Atlassian 账户: https://id.atlassian.com/manage-profile/security/api-tokens
2. 点击 "Create API Token"
3. 复制生成的 token

**使用的工具**:
- `mcp__legacy_atlassian__confluence_search` - 搜索文档
- `mcp__legacy_atlassian__confluence_get_page` - 获取文档内容

---

### 2.2 Figma MCP (Official)

**用途**: 将设计推送到 Figma、获取设计上下文

**安装方式**:

```bash
# 方式1: 通过 Claude Code 设置
/mcp add figma

# 方式2: 手动配置
# 在 claude_desktop_config.json 中添加:
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-figma"]
    }
  }
}
```

**认证**:
1. 首次使用时会提示登录 Figma
2. 授权 Claude Code 访问你的 Figma 账户
3. 支持的 URL 格式:
   - `https://www.figma.com/design/:fileKey/:fileName?node-id=:nodeId`
   - `https://www.figma.com/board/:fileKey/:fileName` (FigJam)

**使用的工具**:
- `mcp__plugin_figma_figma__get_metadata` - 获取文件元数据
- `mcp__plugin_figma_figma__get_design_context` - 获取设计上下文
- `mcp__plugin_figma_figma__generate_figma_design` - 将网页推送到 Figma

---

### 2.3 UI/UX Pro Max Skill

**用途**: 提供设计系统、颜色搭配、UX 指南

**位置**: `~/.claude/skills/ui-ux-pro-max/`

**使用方式**:

```bash
# 激活 skill (在 Claude Code 中)
skill: "ui-ux-pro-max"

# 或者直接调用
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "enterprise dashboard" --design-system
```

**常用命令**:

```bash
# 生成完整设计系统
python3 skills/ui-ux-pro-max/scripts/search.py "enterprise SaaS dashboard" --design-system -p "Project Name"

# 搜索特定领域
python3 skills/ui-ux-pro-max/scripts/search.py "admin console table" --domain ux
python3 skills/ui-ux-pro-max/scripts/search.py "responsive form" --stack html-tailwind
```

---

## 三、详细工作流程

### 步骤 1: 获取 PRD 文档

**命令/提示词**:

```
在 confluence 上查找「F-KMS集成-PRD」这篇需求文档
```

**实际执行**:

```python
# 搜索文档
mcp__legacy_atlassian__confluence_search:0{"query": "F-KMS集成-PRD"}

# 获取文档内容
mcp__legacy_atlassian__confluence_get_page:1{"page_id": "199370777"}
```

**输出**: PRD 文档内容，包含:
- KMIP 协议说明
- 密钥知识 (KEK/DEK/KDK)
- 功能设计要点
- vSphere 竞品参考

---

### 步骤 2: 生成设计系统

**命令**:

```bash
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py \
  "enterprise SaaS dashboard virtualization platform admin console" \
  --design-system -p "ZSphere KMS"
```

**输出**:
- Pattern: Enterprise Gateway
- Style: Data-Dense Dashboard
- Colors: Indigo primary (#6366F1) + Emerald CTA (#10B981)
- Typography: Fira Code / Fira Sans
- Effects: Hover tooltips, row highlighting

---

### 步骤 3: 创建 HTML 设计文件

**提示词**:

```
design a KMS (Key Management Service) management dashboard for a virtualization platform called ZSphere

Context from PRD:
1. This is an enterprise virtualization platform similar to vSphere
2. Need Key Provider management including:
   - Native Key Provider (NKP) - built-in key provider
   - External KMS via KMIP protocol (Thales, Entrust, IBM, HashiCorp Vault, etc.)
3. Key concepts: KEK (Key Encryption Key), DEK (Data Encryption Key), KDK (Key Derivation Key)
4. Features needed:
   - Key Provider list page with status indicators
   - Add/Edit KMS configuration (server address, port, certificate management)
   - Set default Key Provider
   - VM encryption using keys from providers
   - vTPM support
   - ReKey operations (shallow and deep)
   - Certificate/Trust management between MN and KMS

Design requirements:
1. Enterprise admin dashboard style, clean and professional
2. Dark sidebar navigation (similar to AWS console or VMware vCenter)
3. Main content area with card-based layouts
4. Table views for listing Key Providers with columns: Name, Type, Status, Server Address, Actions
5. Status badges: Connected, Disconnected, Error
6. Certificate management UI showing trust status
7. Modal dialogs for adding/editing KMS
8. Form designs for KMS configuration
```

**生成的文件**:
- `f-kms-design.html` - 主页面
- `f-kms-page1-add-nkp.html` - 添加 NKP
- `f-kms-page2-rekey.html` - ReKey 操作
- `f-kms-page3-cert.html` - 证书管理
- `f-kms-page4-vm-encrypt.html` - VM 加密
- `f-kms-page5-kms-detail.html` - KMS 详情

---

### 步骤 4: 推送到 Figma

**启动本地服务器**:

```bash
python3 -m http.server 8888
```

**推送到 Figma 的命令**:

```python
# 1. 获取 capture ID
mcp__plugin_figma_figma__generate_figma_design:2{
  "fileKey": "Qb7AweiYYJLq1hdYymdYBM",
  "outputMode": "existingFile"
}

# 2. 在 HTML 中添加 capture script
<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>

# 3. 用浏览器打开带参数的 URL
open "http://localhost:8888/f-kms-design.html#figmacapture=<capture_id>&figmaendpoint=<endpoint>&figmadelay=2000"

# 4. 轮询捕获状态
mcp__plugin_figma_figma__generate_figma_design:3{
  "captureId": "<capture_id>",
  "fileKey": "Qb7AweiYYJLq1hdYymdYBM",
  "outputMode": "existingFile"
}
```

**生成的 Figma 链接**:
- 主页面: https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM?node-id=13-2
- 添加 NKP: https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM?node-id=25-2
- ReKey: https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM?node-id=28-2
- 证书管理: https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM?node-id=29-2
- VM 加密: https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM?node-id=26-2
- KMS 详情: https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM?node-id=27-2

---

### 步骤 5: 创建交互式 Demo

**提示词**:

```
update changes:https://www.figma.com/design/Qb7AweiYYJLq1hdYymdYBM/Untitled?node-id=27-2&t=OfVmSFWIYJvIDq8j-4，修改完成后，输出一份可交互 demo 的 html
```

**执行步骤**:

1. 获取 Figma 更新内容:
```python
mcp__plugin_figma_figma__get_design_context:4{
  "fileKey": "Qb7AweiYYJLq1hdYymdYBM",
  "nodeId": "27:2"
}
```

2. 生成交互式 HTML:
   - 页面路由系统
   - 弹窗组件
   - 标签页切换
   - 表单验证
   - Toast 通知
   - 搜索筛选

**输出文件**: `f-kms-interactive-demo.html`

---

## 四、所有使用的命令汇总

### 4.1 文件操作

```bash
# 创建 HTML 文件
Write: {"file_path": "/Users/enyousun/Desktop/coding/f-kms-design.html", "content": "..."}

# 编辑文件
Edit: {"file_path": "...", "old_string": "...", "new_string": "..."}

# 列出文件
Glob: {"pattern": "f-kms-*.html"}
```

### 4.2 服务器操作

```bash
# 启动 HTTP 服务器
python3 -m http.server 8888

# 验证服务器运行
curl -s http://localhost:8888/f-kms-design.html | head -20
```

### 4.3 Figma 操作

```bash
# 打开浏览器 (macOS)
open "http://localhost:8888/f-kms-design.html#figmacapture=<id>&figmaendpoint=<url>&figmadelay=2000"

# 打开浏览器 (Linux)
xdg-open "<url>"

# 打开浏览器 (Windows)
start "<url>"
```

---

## 五、Claude Code 安装方式

### 5.1 macOS 安装

```bash
# 方式1: 使用 Homebrew
brew install claude-code

# 方式2: 使用 npm
npm install -g @anthropic-ai/claude-code

# 方式3: 直接下载
curl -sL https://claude.ai/install | sh
```

### 5.2 Windows 安装

```powershell
# 使用 npm
npm install -g @anthropic-ai/claude-code

# 或使用 PowerShell 脚本
irm https://claude.ai/install.ps1 | iex
```

### 5.3 Linux 安装

```bash
# 使用 npm
npm install -g @anthropic-ai/claude-code

# 或使用脚本
curl -sL https://claude.ai/install | bash
```

### 5.4 首次配置

```bash
# 登录 Anthropic 账户
claude login

# 验证安装
claude --version

# 进入项目目录
cd /path/to/your/project
claude

# 添加 MCP 服务器
claude /mcp add <server-name>
```

---

## 六、MCP 服务器配置参考

### 完整配置示例 (`~/.claude/config.json`)

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-figma"]
    },
    "legacy-atlassian": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-confluence"],
      "env": {
        "CONFLUENCE_URL": "https://your-domain.atlassian.net",
        "CONFLUENCE_USERNAME": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-token"
      }
    },
    "jira": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-jira"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_USERNAME": "your-email@example.com",
        "JIRA_API_TOKEN": "your-token"
      }
    }
  }
}
```

---

## 七、最佳实践和注意事项

### 7.1 Figma 推送

1. **Capture ID 一次性使用**: 每个 capture ID 只能使用一次，不要重复使用
2. **延迟参数**: 使用 `figmadelay=2000` 确保页面完全渲染
3. **脚本注入**: 必须在 HTML 中添加 `<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>`
4. **URL 编码**: endpoint URL 需要 URL encode

### 7.2 Confluence 查询

1. **搜索关键词**: 使用中文关键词搜索中文文档更准确
2. **Page ID**: 从搜索结果中提取 page_id，然后使用 get_page 获取内容
3. **权限**: 确保 API Token 有访问对应空间的权限

### 7.3 HTML 设计

1. **Tailwind CDN**: 使用 `https://cdn.tailwindcss.com` 快速原型
2. **字体**: 使用 Google Fonts (Inter) 确保一致性
3. **图标**: 使用 Heroicons SVG 图标
4. **响应式**: 使用 `md:`, `lg:` 前缀实现响应式布局

### 7.4 文件管理

```bash
# 推荐的项目结构
project/
├── CLAUDE.md              # Claude Code 项目指南
├── f-kms-design.html      # 主设计文件
├── f-kms-page1-*.html     # 子页面
├── f-kms-page2-*.html
├── f-kms-interactive-demo.html  # 交互原型
└── design-assets/         # 设计资源
```

---

## 八、常见问题解决

### Q: Figma 推送失败

**A**: 检查以下几点:
1. HTTP 服务器是否运行 (`python3 -m http.server 8888`)
2. capture.js 脚本是否添加到 HTML
3. URL 参数是否正确（特别是 captureId 和 endpoint）
4. 是否等待了足够的延迟时间

### Q: Confluence 搜索无结果

**A**:
1. 检查 API Token 权限
2. 尝试使用英文关键词搜索
3. 确认文档在授权的空间内

### Q: Claude Code 无法启动

**A**:
```bash
# 清除缓存
claude cache clear

# 重新登录
claude logout
claude login

# 更新到最新版本
npm update -g @anthropic-ai/claude-code
```

---

## 九、参考资源

- **Claude Code 文档**: https://docs.anthropic.com/en/docs/claude-code/overview
- **Figma MCP 文档**: https://github.com/anthropics/anthropic-cookbook/tree/main/mcp/figma
- **Confluence API**: https://developer.atlassian.com/cloud/confluence/rest/v1/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Heroicons**: https://heroicons.com/

---

*文档生成时间: 2026-03-10*
*适用项目: ZSphere F-KMS 集成*
