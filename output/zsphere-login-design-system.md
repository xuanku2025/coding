# ZSphere Enyou 登录页设计规范

## 设计依据

- **来源产品**: ZSphere Enyou
- **页面类型**: 登录页
- **参考规范**: 内部组件库设计系统、UED 规范
- **风格定位**: 企业级 B 端产品，浅色蓝色系，品牌主调克制

---

## 1. 颜色规范

### 品牌色

| 名称 | 色值 | 用途 |
|------|------|------|
| Primary Blue | `#0066CC` | 主按钮、品牌 Logo、关键交互 |
| Primary Blue Hover | `#0052A3` | 主按钮悬浮态 |
| Primary Blue Active | `#004080` | 主按钮点击态 |

### 中性色

| 名称 | 色值 | 用途 |
|------|------|------|
| Background | `#FFFFFF` | 页面背景 |
| Surface | `#FAFBFC` | 卡片背景、输入框背景 |
| Border | `#D9D9D9` | 输入框边框、分割线 |
| Border Focus | `#0066CC` | 输入框聚焦边框 |
| Text Primary | `#1A1A1A` | 主标题、重要文字 |
| Text Secondary | `#666666` | 副标题、次要文字 |
| Text Tertiary | `#999999` | 提示文字、图标 |
| Text Disabled | `#BFBFBF` | 禁用状态文字 |

### 功能色

| 名称 | 色值 | 用途 |
|------|------|------|
| Error | `#F5222D` | 错误提示、校验失败 |
| Error Background | `#FFF2F0` | 错误提示背景 |
| Success | `#52C41A` | 成功状态 |
| Warning | `#FAAD14` | 警告提示 |

---

## 2. 字体规范

### 字体族

- **主字体**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **备选字体**: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`（中文优化）

### 字号规范

| 级别 | 字号 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| Display | 28px | 500 | 1.4 | 页面主标题（Welcome） |
| Title | 24px | 500 | 1.4 | 产品名称（ZSphere Enyou） |
| Body | 14px | 400 | 1.5 | 正文、输入框内容 |
| Caption | 12px | 400 | 1.5 | 辅助提示、底部信息 |
| Button | 16px | 500 | 1.5 | 按钮文字 |

### 字重规范

| 字重 | 值 | 用途 |
|------|----|----|
| Regular | 400 | 正文、描述 |
| Medium | 500 | 标题、按钮、强调 |
| Semibold | 600 | 重要数据、选中状态 |

---

## 3. 间距规范

### 页面间距

| 元素 | 数值 | 说明 |
|------|------|------|
| 页面边距 | 24px | 左右边距 |
| 顶部 Logo 间距 | 24px | Logo 距顶部距离 |
| 内容区垂直居中 | 50vh | 表单区域垂直居中偏上 |

### 组件间距

| 元素 | 数值 | 说明 |
|------|------|------|
| 标题组间距 | 16px | Welcome 与 ZSphere Enyou 之间 |
| 标题与表单间距 | 32px | 副标题与输入框之间 |
| 输入框间距 | 20px | 用户名与密码框之间 |
| 输入框与按钮间距 | 24px | 密码框与 Login 按钮之间 |
| 输入框内边距 | 12px 16px | 上下 12px，左右 16px |

---

## 4. 组件设计规范

### 4.1 输入框 (Input)

#### 基础样式

```
高度: 44px
边框: 1px solid #D9D9D9
圆角: 4px
背景: #FFFFFF
内边距: 12px 16px
字体: 14px / 400
```

#### 状态变体

| 状态 | 样式 |
|------|------|
| 默认 | 边框 `#D9D9D9`，图标 `#999999` |
| 悬浮 | 边框 `#BFBFBF` |
| 聚焦 | 边框 `#0066CC`，外发光 `0 0 0 2px rgba(0,102,204,0.2)` |
| 禁用 | 背景 `#F5F5F5`，文字 `#BFBFBF` |
| 错误 | 边框 `#F5222D`，底部错误提示 |

#### 图标输入框

- 左侧图标：用户图标（用户名）、锁图标（密码）
- 图标颜色：`#999999`
- 图标与文字间距：12px
- 右侧操作：密码可见性切换（眼睛图标）

### 4.2 按钮 (Button)

#### 主按钮 (Primary Button)

```
高度: 44px
背景: #0066CC
文字: #FFFFFF
字体: 16px / 500
圆角: 4px
内边距: 0 24px
宽度: 100%（登录页场景）
```

#### 状态变体

| 状态 | 样式 |
|------|------|
| 默认 | 背景 `#0066CC` |
| 悬浮 | 背景 `#0052A3` |
| 点击 | 背景 `#004080` |
| 禁用 | 背景 `#BFBFBF`，文字 `#FFFFFF` 50% 透明度 |
| 加载中 | 背景 `#0066CC` + Loading Spinner |

### 4.3 图标 (Icon)

#### 图标规范

- 尺寸：16px（输入框内）、20px（独立使用）
- 颜色：跟随父级文字颜色或指定功能色
- 输入框图标颜色：`#999999`

#### 登录页使用图标

| 图标 | 位置 | 用途 |
|------|------|------|
| User | 用户名输入框左侧 | 标识用户名输入 |
| Lock | 密码输入框左侧 | 标识密码输入 |
| Eye / EyeOff | 密码输入框右侧 | 切换密码可见性 |
| Globe | 语言切换 | 标识语言选择 |

### 4.4 语言切换器

```
位置: 页面右上角
样式: 图标 + 文字
图标: Globe / 语言图标
文字: "简体中文"
文字颜色: #666666
悬浮: 文字颜色 #0066CC
```

---

## 5. 页面布局规范

### 5.1 整体结构

```
┌─────────────────────────────────────────┐
│  [Logo]                           [语言] │  ← Header
├─────────────────────────────────────────┤
│                                         │
│           ┌─────────────────┐           │
│           │    Welcome      │           │
│           │  ZSphere Enyou  │           │  ← Content
│           │                 │           │
│           │ [用户名输入框]   │           │
│           │ [密码输入框]     │           │
│           │                 │           │
│           │    [Login]      │           │
│           └─────────────────┘           │
│                                         │
│                                         │
│   For a better experience...           │  ← Footer
└─────────────────────────────────────────┘
```

### 5.2 布局参数

| 区域 | 属性 | 值 |
|------|------|----|
| Header | 高度 | 64px |
| Header | 内边距 | 0 24px |
| Content | 宽度 | 400px（最大） |
| Content | 水平对齐 | 居中 |
| Content | 垂直位置 | 距顶部 30% |
| Footer | 位置 | 页面底部居中 |
| Footer | 底部边距 | 24px |

### 5.3 响应式规则

| 断点 | 适配规则 |
|------|----------|
| ≥1280px | 内容区最大 400px，水平居中 |
| 768px-1279px | 内容区 80% 宽度，最大 400px |
| <768px | 内容区 100% 宽度，边距 24px |

---

## 6. 交互规范

### 6.1 输入交互

| 操作 | 反馈 |
|------|------|
| 点击输入框 | 边框变蓝，显示光标 |
| 输入内容 | 实时显示，左侧图标保持 |
| 点击密码眼睛 | 切换明文/密文，图标变化 |
| 失去焦点 | 执行校验，如有错误显示提示 |

### 6.2 按钮交互

| 操作 | 反馈 |
|------|------|
| 悬浮 | 按钮变深（#0052A3） |
| 点击 | 按钮更深（#004080），触发登录 |
| 加载中 | 显示 Loading，禁用点击 |
| 登录成功 | 跳转至首页 |
| 登录失败 | 显示错误提示（输入框下方或 Toast） |

### 6.3 错误提示

- 位置：输入框下方或页面顶部
- 样式：红色文字 + 错误图标
- 内容：具体错误原因（如"用户名或密码错误"）

---

## 7. 组件变体清单

### 7.1 输入框变体

| 变体名称 | 说明 |
|----------|------|
| Input Basic | 基础输入框 |
| Input With Prefix Icon | 带前缀图标 |
| Input With Suffix Action | 带后缀操作（如眼睛图标） |
| Input Password | 密码输入框（默认密文） |
| Input Error | 错误状态 |
| Input Disabled | 禁用状态 |
| Input Focus | 聚焦状态 |

### 7.2 按钮变体

| 变体名称 | 说明 |
|----------|------|
| Button Primary | 主按钮 |
| Button Primary Hover | 悬浮态 |
| Button Primary Active | 点击态 |
| Button Primary Disabled | 禁用态 |
| Button Primary Loading | 加载态 |
| Button Block | 块级按钮（宽度 100%） |

### 7.3 图标变体

| 变体名称 | 说明 |
|----------|------|
| Icon User | 用户图标 |
| Icon Lock | 锁图标 |
| Icon Eye | 眼睛（可见） |
| Icon EyeOff | 眼睛关闭（不可见） |
| Icon Globe | 地球/语言 |

---

## 8. 设计 Token 汇总

```json
{
  "color": {
    "primary": "#0066CC",
    "primaryHover": "#0052A3",
    "primaryActive": "#004080",
    "background": "#FFFFFF",
    "surface": "#FAFBFC",
    "border": "#D9D9D9",
    "borderFocus": "#0066CC",
    "textPrimary": "#1A1A1A",
    "textSecondary": "#666666",
    "textTertiary": "#999999",
    "textDisabled": "#BFBFBF",
    "error": "#F5222D"
  },
  "font": {
    "family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "sizeDisplay": "28px",
    "sizeTitle": "24px",
    "sizeBody": "14px",
    "sizeCaption": "12px",
    "sizeButton": "16px",
    "weightRegular": 400,
    "weightMedium": 500,
    "weightSemibold": 600
  },
  "spacing": {
    "pagePadding": "24px",
    "headerHeight": "64px",
    "formWidth": "400px",
    "inputHeight": "44px",
    "inputPadding": "12px 16px",
    "buttonHeight": "44px",
    "gapLarge": "32px",
    "gapMedium": "20px",
    "gapSmall": "16px"
  },
  "radius": {
    "input": "4px",
    "button": "4px"
  }
}
```

---

## 9. 无障碍规范

- **对比度**: 文字与背景对比度 ≥ 4.5:1
- **焦点可见**: 输入框聚焦时有明显视觉反馈
- **键盘导航**: 支持 Tab 键切换，Enter 键提交
- **错误提示**: 明确告知错误原因和修复方式
- **屏幕阅读器**: 图标添加 aria-label，表单关联 label

---

*文档版本: v1.0*
*创建日期: 2026-03-11*
*适用产品: ZSphere Enyou*
