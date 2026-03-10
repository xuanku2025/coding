---
name: ux-interaction-design
description: |
  专为交互设计师打造的 AI 协作技能。当用户需要做交互设计、评审设计方案、撰写交互说明、
  分析历史设计决策、对齐设计规范、或基于 Jira 需求出设计方案时，必须使用此 Skill。
  
  触发场景包括但不限于：
  - "帮我看看这个页面的交互是否合理"
  - "基于这个需求出交互方案"
  - "检查设计稿是否符合规范"
  - "找一下之前类似功能是怎么设计的"
  - "帮我写交互说明文档"
  - "这个 Jira 需求怎么拆解成交互任务"

compatibility:
  tools_required:
    - legacy-atlassian/confluence_search    # 搜索 Confluence 页面
    - legacy-atlassian/confluence_get_page  # 读取页面正文
    - legacy-atlassian/jira_search          # JQL 搜索 Jira
    - legacy-atlassian/jira_get_issue       # 读取 Issue 详情
  tools_optional:
    - figma_mcp          # 访问历史设计稿（如有）
    - web_fetch          # 访问内网部署环境（如网络允许）
  mcp_server: mcp_server/server.py  # 本地 Basic Auth MCP
  fallback: 无 MCP 时引导用户手动粘贴内容
---

# 交互设计协作 Skill

## 工作流总览

```
输入需求
  ↓
① 收集上下文（设计稿 / 规范 / Jira / 线上环境）
  ↓
② 分析 & 对齐设计原则
  ↓
③ 输出方案 / 评审意见 / 交互说明
  ↓
④ 更新 Jira / 生成文档
```

---

## Step 1：收集上下文

在开始设计或评审前，**尽量并行**收集以下四类信息：

### 1a. 查询 Confluence 设计规范

调用顺序：
1. `confluence_list_spaces()` → 找到设计团队的 Space Key（通常是 DESIGN / UX / FE）
2. `confluence_search(query="交互规范 [功能模块名]", space_key="DESIGN")` → 找相关页面
3. `confluence_get_page(page_id=...)` → 读取页面正文
4. 如需浏览目录树：`confluence_get_children(page_id=...)` → 列出子页面

重点关注：色彩/间距规范、交互反馈规范、组件使用规则、无障碍要求

如果工具不可用：询问用户："能否粘贴相关的设计规范页面内容？"

### 1b. 查询历史 Jira

调用顺序：
1. `jira_get_projects()` → 确认项目 Key
2. `jira_search(jql='project=APP AND summary ~ "[功能名]" ORDER BY updated DESC')` → 找相关 Issue
3. `jira_get_issue(issue_key="APP-123")` → 读取详情、评论、历史决策

重点提取：
- 历史迭代的设计决策（评论区往往有 PM/设计师的讨论）
- 曾被拒绝的方案（避免重蹈覆辙）
- 用户反馈相关的 Bug（了解已知痛点）

如果工具不可用：询问用户："有没有相关需求背景文档可以分享？"

### 1c. 查找历史设计稿

如果 `figma_mcp` 可用：
```
搜索：[功能模块名] + [产品线]
筛选：最近 6 个月 / 已交付版本
提取：关键页面截图、组件使用方式、标注规范
```

如果不可用：询问用户："能截图或粘贴相关的历史设计稿吗？"

### 1d. 检查线上部署环境

如果有内网访问权限（`web_fetch` + 内网代理）：
```
访问：[内网产品 URL]
重点观察：
  - 当前线上版本的交互状态
  - 与设计稿的差异（开发还原度）
  - 实际用户路径
```

如果不可用：询问用户："能提供线上页面截图吗？"

---

## Step 2：分析与对齐

收集完上下文后，按以下维度分析：

### 交互评审清单

**可用性**
- [ ] 操作路径是否最短？
- [ ] 关键操作是否在拇指热区（移动端）？
- [ ] 错误状态是否有清晰反馈？
- [ ] 空状态 / 加载状态 / 异常状态是否覆盖？

**一致性**
- [ ] 是否与 Confluence 规范对齐？
- [ ] 与同类功能的交互模式是否一致？
- [ ] 组件使用是否来自设计系统？

**历史决策**
- [ ] 是否有 Jira 记录的已知坑？
- [ ] 是否与历史方案有冲突？

**技术可行性**
- [ ] 交互效果是否有已有组件支持？
- [ ] 动效/过渡是否在技术范围内？

---

## Step 3：输出格式

根据任务类型选择输出格式：

### 输出 A：交互方案文档

```markdown
# [功能名] 交互方案 v[版本号]

## 背景
- 需求来源：Jira [编号] - [标题]
- 参考规范：Confluence [页面链接]
- 参考历史稿：Figma [链接]

## 用户目标
[用 1-2 句话描述用户想完成什么]

## 交互流程
[流程图文字描述 或 Mermaid 图]

## 页面说明
### [页面1名称]
- **触发条件**：
- **核心交互**：
- **状态覆盖**：默认态 / 加载态 / 空态 / 错误态
- **边界情况**：

## 待确认问题
| # | 问题 | 影响 | 决策人 |
|---|------|------|--------|
```

### 输出 B：设计评审意见

```markdown
## 评审结论：✅ 通过 / ⚠️ 需修改 / ❌ 重新设计

### 问题清单
| 优先级 | 位置 | 问题描述 | 建议方案 | 规范依据 |
|--------|------|----------|----------|----------|
| P0 | ... | ... | ... | Confluence [链接] |

### 亮点
[值得保留的设计决策]
```

### 输出 C：Jira 任务拆解

```markdown
## Epic：[功能名] 交互设计

### Story 列表
- [ ] [页面名]-交互说明文档输出
- [ ] [页面名]-设计走查（开发自测）
- [ ] [页面名]-验收测试
- [ ] 边界场景补充设计

### 验收标准（AC）
- 与 Figma 设计稿还原度 ≥ 95%
- 通过 Confluence 中的无障碍检查项
- 所有异常状态有对应处理
```

---

## Step 4：回写 & 同步

### 查看 Jira 信息（jira_search / jira_get_issue 可用）
- 用 `jira_search` 找到关联 Issue，用 `jira_get_issue` 确认状态
- 告知用户需要手动在 Jira 中更新状态和添加设计文档链接
  （当前版本为只读，暂不支持写回）

### 查看 Confluence 规范（confluence_get_page 可用）
- 用 `confluence_search` + `confluence_get_page` 读取规范
- 如发现规范需要更新，告知用户在 Confluence 中手动修改

---

## 降级策略（无 MCP 时）

当所有 MCP 工具均不可用时，采用以下降级流程：

1. **主动询问**：明确告知用户缺少哪类上下文，请其提供
2. **假设标注**：在输出中用 `[假设：...]` 标注基于常识做的推断
3. **待确认清单**：在文档末尾列出需要对齐的问题

---

## 参考文件

- `references/design-tokens.md` — 基础设计 Token（从 Confluence 同步）
- `references/component-lib.md` — 组件库速查表
- `references/jira-template.md` — Jira 任务模板

如需读取，用 `view` 工具加载对应文件。
