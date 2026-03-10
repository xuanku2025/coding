#!/usr/bin/env python3
"""
Legacy Atlassian MCP Server
支持：
  - Confluence 6.x（Basic Auth，用户名+密码）
  - Jira 8.x（Basic Auth，用户名+密码）
"""

import os
import json
import base64
import urllib.request
import urllib.parse
import urllib.error
from mcp.server.fastmcp import FastMCP

# ── 初始化 MCP ──────────────────────────────────────────────────────────────
mcp = FastMCP("legacy-atlassian")

# ── 配置（从环境变量读取） ────────────────────────────────────────────────────
CONF_URL  = os.environ.get("CONFLUENCE_URL", "").rstrip("/")
CONF_USER = os.environ.get("CONFLUENCE_USER", "")
CONF_PASS = os.environ.get("CONFLUENCE_PASS", "")

JIRA_URL  = os.environ.get("JIRA_URL", "").rstrip("/")
JIRA_USER = os.environ.get("JIRA_USER", "")
JIRA_PASS = os.environ.get("JIRA_PASS", "")


# ── 内部工具函数 ──────────────────────────────────────────────────────────────
def _basic_header(user: str, pwd: str) -> str:
    token = base64.b64encode(f"{user}:{pwd}".encode()).decode()
    return f"Basic {token}"


def _get(url: str, user: str, pwd: str, params: dict | None = None) -> dict:
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", _basic_header(user, pwd))
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"error": f"HTTP {e.code}", "detail": body[:500]}
    except Exception as e:
        return {"error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# CONFLUENCE TOOLS
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def confluence_search(query: str, space_key: str = "", limit: int = 10) -> str:
    """
    全文搜索 Confluence 页面。
    query: 搜索关键词（如 "交互规范 导航"）
    space_key: 限定 Space，如 "DESIGN"（留空=全局搜索）
    limit: 最多返回条数
    """
    cql = f'text ~ "{query}" AND type = page'
    if space_key:
        cql += f' AND space = "{space_key}"'
    cql += " ORDER BY lastModified DESC"

    data = _get(
        f"{CONF_URL}/rest/api/content/search",
        CONF_USER, CONF_PASS,
        {"cql": cql, "limit": limit, "expand": "space,history.lastUpdated"}
    )

    if "error" in data:
        return f"❌ 搜索失败：{data}"

    results = data.get("results", [])
    if not results:
        return "未找到相关页面。"

    lines = [f"找到 {len(results)} 个页面：\n"]
    for r in results:
        title   = r.get("title", "")
        page_id = r.get("id", "")
        space   = r.get("space", {}).get("key", "")
        updated = r.get("history", {}).get("lastUpdated", {}).get("when", "")[:10]
        lines.append(f"- [{space}] {title}（ID: {page_id}，更新: {updated}）")

    return "\n".join(lines)


@mcp.tool()
def confluence_get_page(page_id: str) -> str:
    """
    按 ID 获取 Confluence 页面正文（纯文本，去除 HTML 标签）。
    page_id: 页面 ID，从 confluence_search 结果中取
    """
    data = _get(
        f"{CONF_URL}/rest/api/content/{page_id}",
        CONF_USER, CONF_PASS,
        {"expand": "body.storage,history.lastUpdated,ancestors"}
    )

    if "error" in data:
        return f"❌ 获取失败：{data}"

    title   = data.get("title", "")
    updated = data.get("history", {}).get("lastUpdated", {}).get("when", "")[:10]
    html    = data.get("body", {}).get("storage", {}).get("value", "")

    # 简单去除 HTML 标签
    import re
    text = re.sub(r"<[^>]+>", "", html)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    ancestors = " > ".join(a.get("title","") for a in data.get("ancestors", []))

    return f"""# {title}
路径：{ancestors}
更新：{updated}
---
{text[:8000]}{"...(内容过长，已截断)" if len(text) > 8000 else ""}
"""


@mcp.tool()
def confluence_list_spaces() -> str:
    """列出所有可用的 Confluence Space（找设计规范在哪个 Space 下）。"""
    data = _get(
        f"{CONF_URL}/rest/api/space",
        CONF_USER, CONF_PASS,
        {"limit": 50, "type": "global"}
    )

    if "error" in data:
        return f"❌ 获取失败：{data}"

    results = data.get("results", [])
    lines = [f"共 {len(results)} 个 Space：\n"]
    for s in results:
        lines.append(f"- [{s.get('key','')}] {s.get('name','')}")
    return "\n".join(lines)


@mcp.tool()
def confluence_get_children(page_id: str) -> str:
    """
    获取某页面的子页面列表（用于浏览设计规范目录树）。
    """
    data = _get(
        f"{CONF_URL}/rest/api/content/{page_id}/child/page",
        CONF_USER, CONF_PASS,
        {"limit": 50}
    )

    if "error" in data:
        return f"❌ 获取失败：{data}"

    results = data.get("results", [])
    if not results:
        return "该页面无子页面。"

    lines = [f"子页面列表（共 {len(results)} 个）：\n"]
    for r in results:
        lines.append(f"- {r.get('title','')}（ID: {r.get('id','')}）")
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# JIRA TOOLS
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
def jira_search(jql: str, max_results: int = 15) -> str:
    """
    用 JQL 搜索 Jira Issue。
    示例 jql：
      - 'project = APP AND labels = "交互设计" ORDER BY created DESC'
      - 'project = APP AND summary ~ "导航" AND issuetype in (Story, Task)'
      - 'project = APP AND component = "个人中心" AND status != Done'
    """
    data = _get(
        f"{JIRA_URL}/rest/api/2/search",
        JIRA_USER, JIRA_PASS,
        {
            "jql": jql,
            "maxResults": max_results,
            "fields": "summary,status,assignee,priority,labels,components,created,updated,description,comment"
        }
    )

    if "error" in data:
        return f"❌ 搜索失败：{data}"

    issues = data.get("issues", [])
    total  = data.get("total", 0)
    if not issues:
        return f"未找到匹配 Issue（总计 {total} 条）。"

    lines = [f"找到 {total} 条，显示前 {len(issues)} 条：\n"]
    for i in issues:
        key    = i.get("key", "")
        fields = i.get("fields", {})
        summary  = fields.get("summary", "")
        status   = fields.get("status", {}).get("name", "")
        priority = fields.get("priority", {}).get("name", "")
        assignee = (fields.get("assignee") or {}).get("displayName", "未分配")
        updated  = fields.get("updated", "")[:10]
        labels   = ", ".join(fields.get("labels") or [])
        lines.append(
            f"- [{key}] {summary}\n"
            f"  状态: {status} | 优先级: {priority} | 负责人: {assignee} | 更新: {updated}"
            + (f"\n  标签: {labels}" if labels else "")
        )

    return "\n".join(lines)


@mcp.tool()
def jira_get_issue(issue_key: str) -> str:
    """
    获取单个 Jira Issue 详情，包含描述、评论和历史决策。
    issue_key: 如 "APP-123"
    """
    data = _get(
        f"{JIRA_URL}/rest/api/2/issue/{issue_key}",
        JIRA_USER, JIRA_PASS,
        {"fields": "summary,description,status,priority,assignee,labels,components,comment,attachment,created,updated,subtasks,issuelinks"}
    )

    if "error" in data:
        return f"❌ 获取失败：{data}"

    fields = data.get("fields", {})

    # 基本信息
    summary     = fields.get("summary", "")
    status      = fields.get("status", {}).get("name", "")
    priority    = fields.get("priority", {}).get("name", "")
    assignee    = (fields.get("assignee") or {}).get("displayName", "未分配")
    desc        = fields.get("description") or "(无描述)"
    created     = fields.get("created", "")[:10]
    updated     = fields.get("updated", "")[:10]
    labels      = ", ".join(fields.get("labels") or [])
    components  = ", ".join(c.get("name","") for c in (fields.get("components") or []))

    # 评论（最近 5 条）
    comments_raw = (fields.get("comment") or {}).get("comments", [])
    comments = comments_raw[-5:] if len(comments_raw) > 5 else comments_raw
    comment_lines = []
    for c in comments:
        author = c.get("author", {}).get("displayName", "")
        date   = c.get("updated", "")[:10]
        body   = c.get("body", "")[:300]
        comment_lines.append(f"  [{date}] {author}：{body}")

    # 子任务
    subtasks = fields.get("subtasks") or []
    sub_lines = [f"  - [{s.get('key','')}] {s.get('fields',{}).get('summary','')}" for s in subtasks]

    # 关联 Issue
    links = fields.get("issuelinks") or []
    link_lines = []
    for lk in links:
        ltype = lk.get("type", {}).get("name", "")
        related = lk.get("outwardIssue") or lk.get("inwardIssue") or {}
        rkey = related.get("key", "")
        rsummary = related.get("fields", {}).get("summary", "")
        if rkey:
            link_lines.append(f"  - {ltype}: [{rkey}] {rsummary}")

    out = f"""# [{issue_key}] {summary}

状态: {status} | 优先级: {priority} | 负责人: {assignee}
创建: {created} | 更新: {updated}
标签: {labels or "无"} | 模块: {components or "未分类"}

## 描述
{str(desc)[:2000]}

## 子任务（{len(subtasks)} 个）
{chr(10).join(sub_lines) or "  无"}

## 关联 Issue
{chr(10).join(link_lines) or "  无"}

## 最近评论（{len(comments_raw)} 条，显示最后 {len(comments)} 条）
{chr(10).join(comment_lines) or "  无评论"}
"""
    return out


@mcp.tool()
def jira_get_projects() -> str:
    """列出所有 Jira 项目（用于确认项目 Key）。"""
    data = _get(
        f"{JIRA_URL}/rest/api/2/project",
        JIRA_USER, JIRA_PASS
    )

    if isinstance(data, list):
        if not data:
            return "未找到项目。"
        lines = [f"共 {len(data)} 个项目：\n"]
        for p in data:
            lines.append(f"- [{p.get('key','')}] {p.get('name','')}  类型: {p.get('projectTypeKey','')}")
        return "\n".join(lines)

    return f"❌ 获取失败：{data}"


@mcp.tool()
def jira_get_issue_types(project_key: str) -> str:
    """获取某项目下的 Issue 类型列表（Story/Task/Bug/设计任务 等）。"""
    data = _get(
        f"{JIRA_URL}/rest/api/2/project/{project_key}",
        JIRA_USER, JIRA_PASS
    )

    if "error" in data:
        return f"❌ 获取失败：{data}"

    types = data.get("issueTypes", [])
    lines = [f"项目 [{project_key}] 的 Issue 类型：\n"]
    for t in types:
        lines.append(f"- {t.get('name','')}：{t.get('description','')}")
    return "\n".join(lines)


# ── 启动 ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    mcp.run(transport="stdio")
