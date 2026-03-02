# CLAUDE.md - XUANKU 项目指南

## 项目概述

XUANKU 是一个个人资源库，主要用于存储和管理学习资料、字体文件等资源。

### 项目设置历程

- **2026-03-03 初始化**：克隆仓库 `https://github.com/xuanku2025/coding`，创建 CLAUDE.md 项目指南文件

### 项目结构

```
.
├── README.md           # 项目说明
├── CLAUDE.md           # 本文件 - Claude Code 助手指南
└── 字体/               # 字体及学习资源目录
    ├── english-learning.html     # 英语学习页面
    ├── 钉钉进步体.ttf            # 字体文件
    └── 中国古代文学史一1.pdf      # 学习资料
```

## 常用操作

### Git 操作

```bash
# 查看状态
git status

# 添加文件
git add <文件名>

# 提交更改
git commit -m "描述信息"

# 推送到远程
git push origin main
```

### HTML 文件预览

由于包含 HTML 文件，可以使用浏览器直接打开查看效果：

```bash
# 使用 Python 简易服务器预览（可选）
python -m http.server 8000
```

### 网络问题排查

当 `git push` 失败时：
- 检查网络连接：`ping github.com`
- 确认远程仓库配置正确

## 代码规范

### HTML
- 使用语义化标签
- 保持代码缩进（2 或 4 空格）
- 添加必要的注释说明

### 文件命名
- 使用英文或中文描述性命名
- 避免特殊字符和空格
- 字体文件保留原始名称以便识别

## 注意事项

1. **大文件处理**：字体文件（.ttf）和 PDF 文件较大，提交时注意 Git 性能
2. **版权合规**：确保上传的字体文件和学习资料符合版权规定
3. **备份重要**：本仓库作为资源存储，建议保持与远程仓库同步

## Claude Code 助手说明

作为 Claude Code，在处理本项目时：

1. 修改 HTML 文件前，先读取了解现有结构和样式
2. 添加新资源时，保持目录结构清晰
3. 提交信息使用中文或英文，保持一致性
4. 涉及字体文件的修改需特别谨慎

---

## 相关会话记录

- Session: a6424d49-5d10-44ee-9a84-f8c0a2f38cef (CLAUDE.md 创建)
- Session: 5658bb5f-bcf1-44ec-bd94-99018d975583 (Git 推送)
- Session: 0bbe0474-425c-4fe2-b750-82d3a8838463 (Git 推送)
- Session: a3b718e3-da35-478c-bff6-01d09c7e896e (MEMORY.md 创建)

---

*最后更新：2026-03-03*
