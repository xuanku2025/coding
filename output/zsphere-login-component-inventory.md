# ZSphere Login 设计系统 - 组件清单

## Figma 设计文件结构

页面: **ZSphere Login Design System**

---

## 1. 颜色 Token (🎨 Color Tokens)

已创建颜色变量集合，包含以下变量：

| 变量名 | 色值 | 用途 |
|--------|------|------|
| Primary | #0066CC | 主色（按钮、品牌） |
| Primary Hover | #0052A3 | 悬浮态 |
| Background | #FFFFFF | 背景色 |
| Border | #D9D9D9 | 边框色 |
| Text Primary | #1A1A1A | 主文字 |
| Text Secondary | #666666 | 次要文字 |
| Error | #F5222D | 错误色 |

**颜色展示方块位置**: (50, 50) 起

---

## 2. 字体样式 (🔤 Typography)

已创建文字样式展示：

| 名称 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| Display | 28px | 500 | #1A1A1A |
| Title | 24px | 500 | #1A1A1A |
| Button | 16px | 500 | #FFFFFF |
| Body | 14px | 400 | #666666 |
| Caption | 12px | 400 | #999999 |

**文字样式位置**: (900, 50) 起

---

## 3. 组件变体

### Input 组件集 (Component Set)

**ID**: 2:68
**名称**: Input

包含以下变体：

| 变体名称 | ID | 说明 |
|----------|----|----|
| Input / Basic | 2:58 | 基础输入框 |
| Input / With Prefix Icon | 2:59 | 带前缀图标 |
| Input / Password | 2:60 | 密码输入框（带眼睛图标）|
| Input / Focus | 2:61 | 聚焦状态 |
| Input / Disabled | 2:62 | 禁用状态 |
| Input / Error | 2:63 | 错误状态 |

**属性**:
- Type: Basic, With Prefix Icon, Password
- State: Focus, Disabled, Error

**组件位置**: (50, 400) 起

### Button 组件集 (Component Set)

**ID**: 2:69
**名称**: Button

包含以下变体：

| 变体名称 | ID | 说明 |
|----------|----|----|
| Button / Primary | 2:64 | 主按钮（默认）|
| Button / Hover | 2:65 | 悬浮态 |
| Button / Active | 2:66 | 点击态 |
| Button / Disabled | 2:67 | 禁用态 |

**属性**:
- State: Default, Hover, Active, Disabled

**组件位置**: (900, 400) 起

---

## 4. 图标组件

已创建 SVG 图标：

| 图标名称 | 位置 |
|----------|------|
| User Icon | 用户名输入框内 |
| Lock Icon | 密码输入框内 |
| Eye Icon | 密码可见性切换 |

---

## 5. 页面组装示例

### Login Form (登录表单)

**ID**: 2:22 / 3:79

结构：
```
Login Form (Auto Layout, Vertical)
├── Welcome (Text, 28px)
├── ZSphere Enyou (Text, 24px)
├── Input / With Prefix Icon (Component Instance)
│   ├── User Icon
│   └── Username (Placeholder)
├── Input / Password (Component Instance)
│   ├── Lock Icon
│   ├── Password (Placeholder)
│   └── Eye Icon
└── Button / Primary (Component Instance)
    └── Login (Text)
```

### Login Page Preview (完整页面预览)

**ID**: 3:70

结构：
```
Login Page Preview
├── Header
│   ├── ZStack Logo (Text, 24px, Blue)
│   └── Language Switcher (Text, 14px)
├── Content (Centered)
│   └── Login Form
└── Footer
    └── Browser Hint (Text, 12px)
```

**页面尺寸**: 1200 × 800px
**位置**: (600, 1100)

---

## 6. 设计 Token JSON

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

## 7. 使用指南

### 在 Figma 中使用组件

1. **打开 Assets 面板** (Shift + I)
2. **搜索组件**: "Input" 或 "Button"
3. **拖拽到画布**
4. **切换变体**: 在右侧属性面板中选择不同的 Type 或 State

### 组件实例可覆盖属性

**Input 组件**:
- 文字内容
- 图标（如使用带图标变体）

**Button 组件**:
- 文字内容
- 宽度（默认为 HUG，可改为 FIXED）

---

## 8. 导出规范

### 颜色变量
变量集合: `VariableCollectionId:2:39`
- Primary: `VariableID:2:40`
- Primary Hover: `VariableID:2:41`
- Background: `VariableID:2:42`
- Border: `VariableID:2:43`
- Text Primary: `VariableID:2:44`
- Text Secondary: `VariableID:2:45`
- Error: `VariableID:2:46`

### 组件集
- Input: `2:68`
- Button: `2:69`

---

*创建日期: 2026-03-11*
*适用产品: ZSphere Enyou*
