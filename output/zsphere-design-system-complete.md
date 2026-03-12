# ZSphere 设计系统 - 完整组件清单

## Figma 设计文件结构

页面: **ZSphere Login Design System**

---

## 1. 颜色 Token (🎨 Color Tokens)

**位置**: (50, 50)

已创建颜色变量集合 `VariableCollectionId:2:39`：

| 变量名 | 色值 | 用途 |
|--------|------|------|
| Primary | #0066CC | 主色（按钮、品牌） |
| Primary Hover | #0052A3 | 悬浮态 |
| Background | #FFFFFF | 背景色 |
| Border | #D9D9D9 | 边框色 |
| Text Primary | #1A1A1A | 主文字 |
| Text Secondary | #666666 | 次要文字 |
| Error | #F5222D | 错误色 |

---

## 2. 字体样式 (🔤 Typography)

**位置**: (900, 50)

| 名称 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| Display | 28px | 500 | #1A1A1A |
| Title | 24px | 500 | #1A1A1A |
| Button | 16px | 500 | #FFFFFF |
| Body | 14px | 400 | #666666 |
| Caption | 12px | 400 | #999999 |

---

## 3. 组件变体

### Input 组件集

**ID**: 2:68 | **位置**: (50, 400)

| 变体名称 | ID | 说明 |
|----------|----|----|
| Input / Basic | 2:58 | 基础输入框 |
| Input / With Prefix Icon | 2:59 | 带前缀图标 |
| Input / Password | 2:60 | 密码输入框 |
| Input / Focus | 2:61 | 聚焦状态 |
| Input / Disabled | 2:62 | 禁用状态 |
| Input / Error | 2:63 | 错误状态 |

### Button 组件集

**ID**: 2:69 | **位置**: (900, 400)

| 变体名称 | ID | 说明 |
|----------|----|----|
| Button / Primary | 2:64 | 主按钮（默认） |
| Button / Hover | 2:65 | 悬浮态 |
| Button / Active | 2:66 | 点击态 |
| Button / Disabled | 2:67 | 禁用态 |

### Checkbox 组件集 ⭐ 新增

**ID**: 50:88 | **位置**: (50, 1750)

| 变体名称 | ID | 说明 |
|----------|----|----|
| Checkbox / Unchecked | 50:73 | 未选中 |
| Checkbox / Checked | 50:74 | 已选中 |
| Checkbox / Disabled | 50:75 | 禁用状态 |
| Checkbox / Indeterminate | 50:76 | 半选状态 |

**结构**:
```
Checkbox (Horizontal Auto Layout)
├── Box (16×16, 圆角 2px)
│   └── Check Icon (checked/indeterminate 时显示)
└── Label (14px)
```

### Radio 组件集 ⭐ 新增

**ID**: 50:89 | **位置**: (900, 1750)

| 变体名称 | ID | 说明 |
|----------|----|----|
| Radio / Unchecked | 50:77 | 未选中 |
| Radio / Checked | 50:78 | 已选中 |
| Radio / Disabled | 50:79 | 禁用状态 |

**结构**:
```
Radio (Horizontal Auto Layout)
├── Circle Outer (16×16, 圆角 10px)
│   └── Circle Inner (6×6, checked 时显示)
└── Label (14px)
```

### Switch 组件集 ⭐ 新增

**ID**: 50:90 | **位置**: (50, 2300)

| 变体名称 | ID | 说明 |
|----------|----|----|
| Switch / Off | 50:80 | 关闭状态 |
| Switch / On | 50:81 | 开启状态 |
| Switch / Disabled Off | 50:82 | 禁用关闭 |
| Switch / Disabled On | 50:83 | 禁用开启 |

**结构**:
```
Switch (Horizontal Auto Layout)
├── Track (40×22, 圆角 11px)
│   └── Thumb (18×18, 圆角 9px)
└── Label (14px)
```

**颜色**:
- Off: Track #D9D9D9, Thumb #FFFFFF
- On: Track #0066CC, Thumb #FFFFFF
- Disabled: Track #BFBFBF, Thumb #FFFFFF

### Form Item 组件集 ⭐ 新增

**ID**: 50:91 | **位置**: (900, 2300)

| 变体名称 | ID | 说明 |
|----------|----|----|
| Form Item / Basic | 50:84 | 基础表单项 |
| Form Item / Required | 50:85 | 必填项（带红星） |
| Form Item / With Error | 50:86 | 错误状态 |
| Form Item / With Hint | 50:87 | 提示信息 |

**结构**:
```
Form Item (Vertical Auto Layout)
├── Label Row (Horizontal)
│   ├── Label (14px, 500w)
│   └── Required Mark * (14px, red, 可选)
├── Input Placeholder (44px height)
└── Helper Text (12px, 可选)
    ├── Error: #F5222D
    └── Hint: #999999
```

### Tag 组件集 ⭐⭐ 新增

**位置**: (50, 3550)

#### Tag / Primary 组件集

**ID**: 98:62

| 变体名称 | ID | 说明 |
|----------|----|----|
| Tag / Primary / Small | 98:51 | 小号标签 (24px height) |
| Tag / Primary / Medium | 98:52 | 中号标签 (28px height) |
| Tag / Primary / Large | 98:53 | 大号标签 (32px height) |

#### Tag / Status 组件集

**ID**: 98:63

| 变体名称 | ID | 说明 | 颜色 |
|----------|----|----|------|
| Tag / Success | 98:54 | 成功状态 | 背景 #E6F7E6, 文字 #52C41A |
| Tag / Warning | 98:55 | 警告状态 | 背景 #FFF7E6, 文字 #FAAD14 |
| Tag / Error | 98:56 | 错误状态 | 背景 #FFF2F0, 文字 #F5222D |
| Tag / Default | 98:57 | 默认状态 | 背景 #F5F5F5, 文字 #666666 |

#### Tag / Special 组件集

**ID**: 98:64

| 变体名称 | ID | 说明 |
|----------|----|----|
| Tag / Closable | 98:58 | 可关闭标签（带 X 图标）|
| Tag / Bordered | 98:59 | 边框标签（无填充，仅边框）|
| Tag / Rounded | 98:60 | 圆角标签（圆角 12px）|
| Tag / With Icon | 98:61 | 带图标标签（前缀图标）|

**结构**:
```
Tag (Horizontal Auto Layout, Center)
├── [Icon] (可选，12px)
├── Label (12px/14px, 500w)
└── [Close Icon] (可选，12px)
```

**规格**:
| 尺寸 | 高度 | 内边距 | 字号 |
|------|------|--------|----|
| Small | 24px | 8px | 12px |
| Medium | 28px | 12px | 14px |
| Large | 32px | 16px | 14px |

**颜色**:
- **Primary**: 背景 rgba(0,102,204,0.1), 文字 #0066CC
- **Success**: 背景 rgba(82,196,26,0.1), 文字 #52C41A
- **Warning**: 背景 rgba(250,173,20,0.1), 文字 #FAAD14
- **Error**: 背景 rgba(245,34,45,0.1), 文字 #F5222D
- **Default**: 背景 rgba(0,0,0,0.04), 文字 #666666
- **Bordered**: 填充透明, 边框 #D9D9D9, 文字 #666666

---

## 4. 图标组件

| 图标名称 | 位置 |
|----------|------|
| User Icon | 用户名输入框内 |
| Lock Icon | 密码输入框内 |
| Eye Icon | 密码可见性切换 |
| Check Icon | Checkbox 选中状态 |
| Minus Icon | Checkbox 半选状态 |
| Close Icon | Tag 关闭按钮 |
| Tag Icon | Tag 前缀图标（列表图标）|

---

## 5. 页面组装示例

### Login Form

**ID**: 2:22 / 3:79 | **位置**: (50, 1100)

结构：
```
Login Form
├── Welcome (Text, 28px)
├── ZSphere Enyou (Text, 24px)
├── Input / With Prefix Icon
├── Input / Password
└── Button / Primary
```

### Login Page Preview

**ID**: 3:70 | **位置**: (600, 1100)

完整登录页，包含 Header、Content、Footer。

### Complete Form Example ⭐ 新增

**ID**: 50:92 | **位置**: (50, 2800)

完整表单示例，展示所有表单组件的组合使用：

```
Create Account Form
├── Title: Create Account
├── Form Item / Basic (Full Name)
├── Form Item / Required (Email)
├── Form Item / With Hint (Password)
├── Checkbox / Checked (Terms)
├── Switch / On (Notifications)
└── Button / Primary (Create Account)
```

### Tag Group Example ⭐⭐ 新增

**ID**: 75:31 | **位置**: (50, 3720)

Tag 组合示例，展示多种状态标签和可关闭标签的组合：

```
Status Tags
├── Tag Row 1 (Status)
│   ├── Tag / Success - Active
│   ├── Tag / Warning - Pending
│   └── Tag / Error - Failed
└── Tag Row 2 (Tech Stack)
    ├── Tag / Closable - React
    ├── Tag / Rounded - Vue
    └── Tag / With Icon - Angular
```

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
    "gapSmall": "12px"
  },
  "radius": {
    "input": "4px",
    "button": "4px",
    "checkbox": "2px",
    "radio": "10px",
    "switch": "11px"
  },
  "component": {
    "checkbox": {
      "size": "16px",
      "checkColor": "#FFFFFF",
      "borderRadius": "2px"
    },
    "radio": {
      "size": "16px",
      "innerSize": "6px",
      "borderRadius": "10px"
    },
    "switch": {
      "trackWidth": "40px",
      "trackHeight": "22px",
      "thumbSize": "18px",
      "borderRadius": "11px"
    }
  }
}
```

---

## 7. 使用指南

### 在 Figma 中使用组件

1. **打开 Assets 面板** (Shift + I)
2. **搜索组件**: "Input", "Button", "Checkbox", "Radio", "Switch", "Form Item"
3. **拖拽到画布**
4. **切换变体**: 在右侧属性面板中选择不同的 Type 或 State

### 组件实例可覆盖属性

**Input 组件**:
- 文字内容
- 图标（如使用带图标变体）

**Button 组件**:
- 文字内容
- 宽度（默认为 HUG，可改为 FIXED）

**Checkbox/Radio/Switch 组件**:
- 标签文字
- 状态通过变体切换

**Form Item 组件**:
- Label 文字
- 是否显示必填标记
- Helper 文字（错误或提示）

**Tag 组件**:
- 标签文字内容
- 可关闭标签支持点击 X 图标
- 通过变体切换颜色主题和样式

---

## 8. 导出规范

### 颜色变量
- 集合 ID: `VariableCollectionId:2:39`
- 变量前缀: `VariableID:2:xx`

### 组件集
| 组件 | 组件集 ID |
|------|----------|
| Input | 2:68 |
| Button | 2:69 |
| Checkbox | 50:88 |
| Radio | 50:89 |
| Switch | 50:90 |
| Form Item | 50:91 |
| Tag / Primary | 98:62 |
| Tag / Status | 98:63 |
| Tag / Special | 98:64 |

---

## 9. 页面布局索引

| 区域 | 坐标范围 |
|------|----------|
| 颜色 Token | (0,0) ~ (800,300) |
| 字体样式 | (850,0) ~ (1450,300) |
| 输入框组件 | (0,350) ~ (800,950) |
| 按钮组件 | (850,350) ~ (1450,950) |
| 登录表单 | (0,1000) ~ (500,1600) |
| 登录页预览 | (600,1100) ~ (1800,1900) |
| Checkbox | (0,1700) ~ (800,2200) |
| Radio | (850,1700) ~ (1650,2200) |
| Switch | (0,2250) ~ (800,2650) |
| Form Item | (850,2250) ~ (1650,2850) |
| 完整表单 | (50,2800) ~ (530,3400) |

---

*文档版本: v2.0*
*更新日期: 2026-03-11*
*新增组件: Checkbox, Radio, Switch, Form Item*
