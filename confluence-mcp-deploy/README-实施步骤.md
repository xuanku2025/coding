# Confluence MCP 连接 Figma Make — 实施步骤

根据你的环境（Confluence 内网 + 两台可访问内网/公网的虚拟机），按下面步骤操作。

---

## 前置条件（你先要完成的）

| 项目 | 说明 | 你的情况 |
|------|------|----------|
| Confluence 地址 | 内网地址 | `http://confluence.zstack.io/` ✅ |
| 用户名 | 登录 Confluence 的账号 | `enyou.sun` ✅ |
| 邮箱 | 用于 Confluence | `enyou.sun@zstack.io` ✅ |
| **密码** | 登录 Confluence 用 | ⚠️ 你未填写，请自行保管 |
| Jira 地址 | 内网地址 | （按你们实际填写） |
| **Jira 密码** | 登录 Jira 用 | ⚠️ 你未填写，请自行保管 |

**重要**：你们环境是本地部署（Confluence 6.15.9 / Jira 8.3.3），当前流程默认使用 **Basic Auth（用户名+密码）**。

---

## 关于 Confluence 6.15.9（你的版本）

你的环境是 **Atlassian Confluence 6.15.9**（Server/Data Center）。

| 说明 | 结论 |
|------|------|
| 认证方式 | 推荐用 **用户名+密码（Basic Auth）**，将密码填入 `CONFLUENCE_API_TOKEN` |

---

## 步骤 1：确认 Confluence / Jira 版本与可访问性

### 1.1 确认是 Server/Data Center

在**能访问内网的电脑或虚拟机**上：

1. 浏览器打开：`http://confluence.zstack.io/rest/applinks/1.0/manifest`
2. 若有 JSON 返回，说明是 Server/Data Center；或到 Confluence 页面底部/ **管理** → **系统信息** 看版本。（你已确认为 6.15.9。）

### 1.2 验证账号密码可用于 REST API（推荐先做）

在虚拟机上分别执行（把用户名/密码替换为真实值）：

```bash
# Confluence：返回 200 且有用户名信息即可
curl -u "用户名:密码" "http://confluence.zstack.io/rest/api/user/current" | head

# Jira：返回 200 且有用户信息即可
curl -u "用户名:密码" "http://jira.your-company.com/rest/api/2/myself" | head
```

> 若这里已 401/403，说明你们实例可能禁用 Basic Auth/需要 SSO/需要额外反代头等，需要先在 Jira/Confluence 管理侧放开 REST 认证策略。

---

## 许可证过期 + 能否用「用户名+密码」？

若页面提示 **「许可证无效 / 评估许可证已过期」**，且说明「用户将无法使用其 API 令牌登录」：

| 做法 | 说明 |
|------|------|
| **先试现有 API Token** | 你已创建的 API Token（如「API Token from 2026-03-06」）仍可能对 **REST API** 有效。建议先按步骤 2 配置 `CONFLUENCE_PERSONAL_TOKEN`（或你环境里对应的 Token 变量）并部署 MCP，用接口调一次验证。若接口能正常返回数据，可继续用 Token。 |
| **用户名+密码** | **Confluence Server 的 REST API 本身支持** 用 Basic Auth（用户名+密码）。但 **mcp-atlassian 当前只支持 Token**，没有提供 `CONFLUENCE_PASSWORD` 或 Basic Auth 的配置项，因此**不能**直接用「用户名+密码」配置 mcp-atlassian。若必须用密码：可向 [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) 提 Issue 请求支持 Basic Auth，或自建一层用「用户名+密码」调 Confluence、再对 Figma 暴露 MCP 的代理。 |

结论：**先尝试用现有 API Token 部署**；若因许可证导致 Token 完全不可用，再考虑升级 Confluence、向 mcp-atlassian 提需求，或自建代理。

---

## 步骤 2：在虚拟机上部署 mcp-atlassian

选一台**能访问 http://confluence.zstack.io 的虚拟机**（内网可达即可）。

### 2.1 创建配置文件

在本仓库的 `confluence-mcp-deploy` 目录下已有 `.env.example`。复制为 `.env` 并填写：

```bash
cd confluence-mcp-deploy
cp .env.example .env
# 编辑 .env，按你们环境填写 Confluence/Jira 的 URL、用户名与密码（密码填在 *_API_TOKEN 里）
```

`.env` 内容示例（**不要提交到 Git**）：

```env
CONFLUENCE_URL=http://confluence.zstack.io
CONFLUENCE_USERNAME=enyou.sun
CONFLUENCE_API_TOKEN=你的Confluence登录密码

# （可选）启用 Jira
JIRA_URL=http://jira.your-company.com
JIRA_USERNAME=你的用户名
JIRA_API_TOKEN=你的Jira登录密码
MCP_PORT=9090
```

### 2.2 用 Docker 运行（推荐）

```bash
docker run -d \
  --name mcp-atlassian \
  --env-file .env \
  -p 9090:9090 \
  ghcr.io/sooperset/mcp-atlassian:latest \
  --transport streamable-http \
  --port 9090
```

### 2.3 验证 MCP 是否正常

在**同一台虚拟机**上（推荐用 `/healthz` 判断服务是否启动完成）：

```bash
curl -i http://localhost:9090/healthz
```

若返回 200 且 body 类似 `{"status":"ok"}`，说明 MCP 已启动。  
若虚拟机有防火墙，确保本机或内网能访问 `9090`（或你映射的宿主机端口）。

---

## 步骤 3：将 MCP 暴露到公网（HTTPS）

Figma Make 只能连 **公网 HTTPS** 的 MCP 地址，所以需要把 `http://虚拟机:9090` 变成 `https://某公网域名或隧道地址`。

任选一种方式。

### 方案 A：ngrok（最快，适合先跑通）

在**运行 MCP 的那台虚拟机**上：

```bash
# 安装 ngrok 后执行
ngrok http 9090
```

终端会给出一个 HTTPS 地址，例如：`https://abc123.ngrok-free.app`。  
Figma Make 里填的 MCP Server URL 为：**`https://abc123.ngrok-free.app/mcp`**（把 `abc123` 换成你实际看到的子域名）。

### 方案 B：Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:9090
```

用生成的 `https://xxx.trycloudflare.com`，Figma 里填：**`https://xxx.trycloudflare.com/mcp`**。

### 方案 C：自有域名 + Nginx 反向代理（生产用）

若你有公网服务器和域名（如 `mcp.yourcompany.com`），在该机器上用 Nginx 把 HTTPS 反代到内网虚拟机的 `http://内网IP:9090`，并配置 SSL。  
Figma Make 里填：**`https://mcp.yourcompany.com/mcp`**。

---

## 步骤 4：在 Figma Make 中配置 Connector

1. 打开 Figma Make → 添加/编辑 **Custom Connector**。
2. **Step 1 of 2**：
   - Name：`confluence`
   - Tagline：`获取 Confluence 内容`
   - Description：`连接公司 Confluence，读取文档和页面内容`
3. **Step 2 of 2**：
   - **MCP server URL**：填你在步骤 3 得到的地址，且路径使用 **`/mcp`**（推荐）  
     例如：`https://abc123.ngrok-free.app/mcp`
   - 认证已在 MCP 端用 PAT 配置，Figma 的 Additional headers 一般可留空。
4. 保存后测试连接。连接成功后，Figma Make 的 AI 即可搜索/读取 Confluence 页面与空间。

---

## 检查清单

- [ ] 已在 Confluence 创建 Personal Access Token
- [ ] `.env` 已配置且 `CONFLUENCE_PERSONAL_TOKEN` 正确
- [ ] 虚拟机已部署 mcp-atlassian，`curl -H "Accept: text/event-stream" http://localhost:9090/mcp` 正常
- [ ] 已用 ngrok/Cloudflare/Nginx 暴露为 **HTTPS**，且 URL 带 **/mcp**
- [ ] Figma Make 中 MCP server URL 填的是上述 HTTPS + `/mcp`

---

## 常见问题

- **Token 类型**：自建 Confluence 用 **Personal Access Token**，在 个人设置 → Personal Access Tokens 创建。
- **MCP 放哪台机**：放在能访问 `http://confluence.zstack.io` 的那台虚拟机即可；公网暴露用同一台上的 ngrok/cloudflared，或另一台公网 Nginx 反代。
- **安全建议**：PAT 用最小权限、定期更换；生产环境建议加认证或 IP 白名单。

完成步骤 1 后，把 PAT 填进 `.env`，再按 2→3→4 执行即可。

> 补充：如果你们环境使用「用户名+密码」，可在 `.env` 中将密码填入 `CONFLUENCE_API_TOKEN`（Confluence）以及 `JIRA_API_TOKEN`（Jira），并分别配置 `*_USERNAME` 与 `*_URL`。
