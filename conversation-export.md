# 内网产品组件迁移至 Figma（shadcn + Tailwind）方案对话记录

> 导出时间：2026-03-12

---

## 对话一：初始方案概述

**用户：**
我现在有一个内网产品，使用的组件是基于 ant design 开发的，现在准备将组件重新在 Figma 中搭建一下，需要基于 shadcn+Tailwind 实现。我现在有内网产品地址，可 vibma 可直连 figma 去实现控制，请你给我一个方案，能直接获取内网产品中的组件样式，在 figma 中重新搭建，并且添加对应的组件和变体，以及设计变量。

**助手：**

## 方案：内网产品组件 → Figma 重建（shadcn + Tailwind）

整体分为 **三个阶段**，我可以协助你执行每一步：

---

### 阶段一：样式提取（内网产品 → 设计 Token）

**方法：注入脚本提取 CSS 变量 & 计算样式**

在内网产品的浏览器控制台中运行提取脚本，自动抓取：

```js
// 在内网产品控制台执行
const tokens = {};

// 1. 提取 CSS 变量（Ant Design token）
const rootStyles = getComputedStyle(document.documentElement);
['color', 'font', 'spacing', 'border', 'shadow', 'radius'].forEach(category => {
  [...rootStyles].filter(v => v.includes(category) || v.includes('ant'))
    .forEach(v => tokens[v] = rootStyles.getPropertyValue(v).trim());
});

// 2. 提取组件实际渲染样式
document.querySelectorAll('[class*="ant-"]').forEach(el => {
  const tag = el.className.match(/ant-[\w-]+/)?.[0];
  if (tag && !tokens[tag]) {
    tokens[tag] = getComputedStyle(el);
  }
});

console.log(JSON.stringify(tokens, null, 2));
```

提取目标：
- **颜色系统**：Primary / Neutral / Semantic（success/warning/error）
- **字体**：family / size / weight / line-height
- **间距**：padding / margin / gap
- **圆角 & 阴影**：border-radius / box-shadow
- **组件状态**：default / hover / active / disabled / focus

---

### 阶段二：Token 映射（Ant Design → Tailwind/shadcn 规范）

将提取的值转换为 shadcn 的 CSS 变量体系，**同时自动推导暗色模式值**（产品当前不支持暗色模式，暗色 Token 由算法生成）：

| Ant Design Token | shadcn/Tailwind 变量 | Figma 变量名 | Dark Mode 推导策略 |
|---|---|---|---|
| `colorPrimary` | `--primary` | `color/primary/default` | 亮度提升 15%，确保暗底对比度 |
| `colorBgContainer` | `--background` | `color/background/default` | 反转为深色（hsl L: 4%） |
| `colorBorderSecondary` | `--border` | `color/border/default` | 低亮度边框（hsl L: 16%） |
| `borderRadiusLG` | `rounded-lg` | `radius/lg` | 模式无关，共用 |
| `fontSizeSM` | `text-sm` | `typography/size/sm` | 模式无关，共用 |
| `boxShadowSecondary` | `shadow-md` | `effect/shadow/md` | 暗色下减弱或移除阴影 |

**我可以帮你写一个完整的映射转换脚本**，输出标准的 Figma Variables JSON 格式（含 Light/Dark 双模式值）。

---

### 阶段三：Figma 自动化搭建（通过 MCP/Plugin）

利用 **Figma Plugin API** 或 **Figma MCP** 执行以下操作：

#### 3.1 建立 Design Variables（设计变量库）
```
Variables 结构：
├── Color（⚡ 含 Light / Dark 双模式，Dark 值自动推导）
│   ├── Primitive（原始色板 - 50到950，暗色自动反转色阶）
│   └── Semantic（语义色 - primary/bg/border/text，暗色自动推导）
├── Typography
│   ├── Font Family
│   ├── Font Size
│   └── Line Height
├── Spacing（4/8/12/16/20/24/32/40/48）
├── Radius（none/sm/md/lg/xl/full）
└── Shadow（sm/md/lg，⚡ 含 Light/Dark 双模式，暗色下自动减弱）
```

#### 3.2 创建组件 + 变体
每个组件按 shadcn 规范建立变体结构，例如 Button：

```
Button
├── variant: default | destructive | outline | secondary | ghost | link
├── size: sm | default | lg | icon
└── state: default | hover | active | disabled | loading
```

#### 3.3 执行策略

```
内网产品截图/DOM
      ↓
  样式提取脚本
      ↓
  Token 映射表
      │
      ▼
 暗色模式自动推导        ← 产品不支持暗色，自动生成 Dark Token
      │
      ▼
Figma Variables JSON（Light + Dark）
      ↓
  Figma MCP 写入
      ↓
组件 + 变体创建
```

---

### 建议我们的协作方式

你可以按以下顺序操作，我来配合：

1. **你** → 在内网产品跑提取脚本，把 JSON 结果发给我
2. **我** → 生成完整的 Token 映射文件 + Figma Variables JSON
3. **你** → 提供要重建的组件清单（Button/Input/Select/Table 等）
4. **我** → 通过 Figma MCP 逐个创建组件、变体、绑定变量

---

你现在想从哪一步开始？如果你能把内网产品的截图或者 DOM 结构发过来，或者先告诉我**需要优先重建哪些组件**，我们可以马上开始。

---

## 对话二：详细流程说明

**用户：**
详细点，各个流程需要完成什么操作

**助手：**

## 完整流程总览

```
内网产品 (Ant Design)
    │
    ▼
[阶段一] DOM + 样式提取          ← 浏览器控制台执行脚本
    │
    ▼
[阶段二] Token 清洗 & 映射       ← 我帮你转换处理
    │
    ▼
[阶段三] Figma Variables 写入    ← Figma Plugin / REST API
    │
    ▼
[阶段四] 组件 + 变体创建         ← Figma MCP 自动化
    │
    ▼
[阶段五] 绑定变量 & 整理库       ← 最终交付
```

---

## 阶段一：从内网产品提取样式

### 1.1 你需要做的操作

打开内网产品，打开浏览器开发者工具（F12），在 **Console** 里依次执行下面三个脚本：

---

**脚本 A：提取全局 CSS 变量（设计 Token）**

```js
(() => {
  const styles = getComputedStyle(document.documentElement);
  const tokens = {};
  
  // 提取所有 CSS 自定义变量
  for (const prop of styles) {
    if (prop.startsWith('--')) {
      tokens[prop] = styles.getPropertyValue(prop).trim();
    }
  }
  
  // 专门提取 Ant Design 5.x 的 token 变量
  const antKeys = [
    'colorPrimary', 'colorSuccess', 'colorWarning', 'colorError', 'colorInfo',
    'colorTextBase', 'colorBgBase', 'colorBorder', 'colorBgContainer',
    'colorBgLayout', 'colorBgElevated', 'colorText', 'colorTextSecondary',
    'colorTextTertiary', 'colorTextDisabled', 'colorFill', 'colorFillSecondary',
    'borderRadius', 'borderRadiusLG', 'borderRadiusSM', 'borderRadiusXS',
    'fontSize', 'fontSizeLG', 'fontSizeSM', 'fontSizeXL',
    'lineHeight', 'lineHeightLG', 'lineHeightSM',
    'fontFamily', 'fontWeightStrong',
    'boxShadow', 'boxShadowSecondary', 'boxShadowTertiary',
    'controlHeight', 'controlHeightLG', 'controlHeightSM',
    'paddingContentHorizontal', 'paddingContentVertical',
    'marginXXS', 'marginXS', 'marginSM', 'margin', 'marginMD', 'marginLG', 'marginXL',
    'paddingXXS', 'paddingXS', 'paddingSM', 'padding', 'paddingMD', 'paddingLG', 'paddingXL',
    'zIndexBase', 'zIndexPopupBase',
    'motionDurationFast', 'motionDurationMid', 'motionDurationSlow',
  ];
  
  // 尝试从 Ant Design token 注入点提取
  const antTokens = {};
  antKeys.forEach(key => {
    const cssVar = `--ant-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    const val = styles.getPropertyValue(cssVar).trim();
    if (val) antTokens[key] = val;
  });
  
  console.log('=== CSS Variables ===');
  console.log(JSON.stringify(tokens, null, 2));
  console.log('=== Ant Design Tokens ===');
  console.log(JSON.stringify(antTokens, null, 2));
  
  // 复制到剪贴板
  copy(JSON.stringify({ cssVariables: tokens, antTokens }, null, 2));
  console.log('✅ 已复制到剪贴板');
})();
```

---

**脚本 B：提取组件实际渲染样式**

```js
(() => {
  // 需要提取的 Ant Design 组件列表
  const components = [
    'ant-btn', 'ant-input', 'ant-select', 'ant-table', 'ant-modal',
    'ant-form', 'ant-menu', 'ant-tabs', 'ant-tag', 'ant-badge',
    'ant-card', 'ant-alert', 'ant-tooltip', 'ant-dropdown',
    'ant-checkbox', 'ant-radio', 'ant-switch', 'ant-slider',
    'ant-pagination', 'ant-breadcrumb', 'ant-steps'
  ];
  
  const result = {};
  
  components.forEach(comp => {
    const elements = document.querySelectorAll(`[class*="${comp}"]`);
    if (!elements.length) return;
    
    result[comp] = {};
    
    elements.forEach(el => {
      const classes = [...el.classList].filter(c => c.startsWith(comp));
      const key = classes.join(' ') || comp;
      
      const computed = getComputedStyle(el);
      result[comp][key] = {
        width: computed.width,
        height: computed.height,
        minHeight: computed.minHeight,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        fontFamily: computed.fontFamily,
        padding: computed.padding,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        margin: computed.margin,
        gap: computed.gap,
        borderWidth: computed.borderWidth,
        borderStyle: computed.borderStyle,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        transition: computed.transition,
        display: computed.display,
        flexDirection: computed.flexDirection,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
      };
    });
  });
  
  copy(JSON.stringify(result, null, 2));
  console.log('✅ 组件样式已复制到剪贴板');
  console.log(result);
})();
```

---

**脚本 C：截取组件截图（生成视觉参考）**

```js
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
document.head.appendChild(script);

script.onload = async () => {
  const components = document.querySelectorAll('[class*="ant-btn"], [class*="ant-input"], [class*="ant-select"]');
  
  for (const el of components) {
    const canvas = await html2canvas(el, { scale: 2 });
    const link = document.createElement('a');
    link.download = `${el.className.split(' ')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }
};
```

### 1.2 本阶段产出

- `tokens.json`：全局 CSS 变量和 Ant Design Token
- `components.json`：各组件的计算样式
- 组件截图（可选，作为视觉参考）

**→ 把这两个 JSON 文件发给我**

---

## 阶段二：Token 清洗 & 映射

### 2.1 我来执行的操作

**① 构建色彩系统（含暗色模式自动推导）**

> ⚠️ 当前产品仅有亮色模式，Dark 列的值为自动推导生成，非产品提取。

```
Ant Design                  →    shadcn/Tailwind         →    Figma Variable (Light)     →    Figma Variable (Dark·推导)
───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
colorPrimary (#1677ff)      →    --primary               →    color/primary/default      →    #4096ff（亮度+15%）
colorPrimary hover          →    --primary/hover         →    color/primary/hover        →    #69b1ff（亮度+25%）
colorBgContainer (#fff)     →    --background            →    color/background/default   →    #0a0a0a（反转）
colorBgLayout (#f5f5f5)     →    --muted                 →    color/background/muted     →    #171717（反转）
colorBorder (#d9d9d9)       →    --border                →    color/border/default       →    #27272a（低亮度）
colorText (#000000e0)       →    --foreground            →    color/text/primary         →    #fafafa（反转）
colorTextSecondary          →    --muted-foreground      →    color/text/secondary       →    #a1a1aa（65%亮度）
colorError (#ff4d4f)        →    --destructive           →    color/semantic/error        →    #f87171（亮度微调）
colorSuccess (#52c41a)      →    --success               →    color/semantic/success      →    #4ade80（饱和度微调）
colorWarning (#faad14)      →    --warning               →    color/semantic/warning      →    #fbbf24（保持高亮度）
```

**② 构建排版系统**

```
Ant Design           →    Tailwind class    →    Figma Variable
──────────────────────────────────────────────────────────────
fontSize: 14px       →    text-sm           →    typography/size/sm
fontSize: 16px       →    text-base         →    typography/size/base
fontSizeLG: 18px     →    text-lg           →    typography/size/lg
fontSizeXL: 20px     →    text-xl           →    typography/size/xl
lineHeight: 1.5      →    leading-normal    →    typography/leading/normal
fontWeightStrong:600 →    font-semibold     →    typography/weight/semibold
```

**③ 构建间距 & 圆角系统**

```
Spacing: 4/8/12/16/20/24/32/40/48/64px  →  spacing/1 ~ spacing/16
Radius: 2/4/6/8/12/16/9999px            →  radius/sm/md/lg/xl/full
Shadow: 3层                              →  shadow/sm/md/lg
```

**④ 暗色模式自动推导（产品当前不支持暗色模式）**

> ⚠️ **重要前提**：当前内网产品不提供暗色模式，因此无法从产品中提取暗色 Token。
> 方案采用**基于亮色 Token 自动推导暗色模式**的策略，在搭建组件和设计变量时即内置双模式支持，
> 为后续产品支持暗色提供即用的变量体系。

**推导规则：**

```
亮色 Token                    →   暗色 Token 自动推导规则
───────────────────────────────────────────────────────────────────
colorPrimary (#1677ff)        →   亮度提升 15%（#4096ff），保持可访问性对比度
colorBgContainer (#fff)       →   反转为深色背景（#0a0a0a / hsl 210 6% 4%）
colorBgLayout (#f5f5f5)       →   深色布局背景（#171717 / hsl 210 6% 9%）
colorBgElevated (#fff)        →   浮层背景（#262626 / hsl 210 6% 15%）
colorText (#000000e0)         →   反转为浅色文字（#fafafa / hsl 0 0% 98%）
colorTextSecondary            →   降低不透明度（#a1a1aa / hsl 240 4% 65%）
colorTextTertiary             →   更低对比度文字（#71717a / hsl 240 4% 46%）
colorBorder (#d9d9d9)         →   暗色边框（#27272a / hsl 240 4% 16%）
colorFill                     →   暗色填充（#27272a）
colorSuccess (#52c41a)        →   饱和度微调，确保暗底可读性（#4ade80）
colorWarning (#faad14)        →   保持高亮度警告色（#fbbf24）
colorError (#ff4d4f)          →   亮度微调（#f87171）
boxShadow                     →   暗色下减弱阴影，改用 border 或微弱发光
```

**推导脚本核心逻辑（自动执行，无需手动干预）：**

```js
// 自动推导暗色模式 Token
function deriveDarkTokens(lightTokens) {
  return {
    // 背景色：亮色反转为暗色
    '--background': invertLightness(lightTokens['--background'], { target: 4 }),
    '--muted': invertLightness(lightTokens['--muted'], { target: 9 }),
    '--card': invertLightness(lightTokens['--card'], { target: 6 }),
    '--popover': invertLightness(lightTokens['--popover'], { target: 6 }),
    
    // 前景色：暗色反转为亮色
    '--foreground': invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--muted-foreground': adjustAlpha(lightTokens['--muted-foreground'], { lightness: 65 }),
    
    // 主色：保持色相，提升亮度确保暗底对比度 ≥ 4.5:1
    '--primary': boostForDarkBg(lightTokens['--primary'], { minContrast: 4.5 }),
    '--destructive': boostForDarkBg(lightTokens['--destructive'], { minContrast: 4.5 }),
    
    // 边框 & 环：降低亮度
    '--border': invertLightness(lightTokens['--border'], { target: 16 }),
    '--ring': lightTokens['--primary'], // 聚焦环保持主色
    
    // 阴影：暗色下大幅减弱或移除
    '--shadow-sm': 'none',
    '--shadow-md': '0 1px 2px rgba(0,0,0,0.4)',
    '--shadow-lg': '0 2px 8px rgba(0,0,0,0.5)',
  };
}
```

**WCAG 无障碍对比度校验（自动执行）：**

| 校验项 | 亮色模式 | 暗色模式（自动推导后） | 标准 |
|---|---|---|---|
| 正文文字 vs 背景 | ≥ 4.5:1 ✅ | ≥ 4.5:1 ✅（自动校验） | AA |
| 大号文字 vs 背景 | ≥ 3:1 ✅ | ≥ 3:1 ✅ | AA |
| 交互元素边框 | ≥ 3:1 ✅ | ≥ 3:1 ✅ | AA |
| 主色按钮文字 | 白字 on 主色 ✅ | 自动选择黑/白字 ✅ | AA |

### 2.2 本阶段产出

- `design-tokens.json`：标准化的 Token 映射表（含 Light + Dark 双模式）
- `figma-variables.json`：可直接导入 Figma 的变量格式（暗色模式值已自动推导生成）
- `tailwind.config.js`：对应的 Tailwind 配置（含 `darkMode: 'class'` 配置）
- `dark-mode-audit.md`：暗色模式推导结果校验报告（对比度、可读性）

---

## 阶段三：Figma Variables 写入

### 3.1 两种方式选一种

**方式 A：使用 Figma REST API（推荐）**

```
步骤：
1. Figma → 头像 → Settings → Personal Access Tokens → 生成 Token
2. 打开目标 Figma 文件，URL 中提取 File ID
   https://www.figma.com/file/[FILE_ID]/...
3. 把 Token 和 File ID 告诉我
4. 我通过 MCP 调用 API 写入变量
```

调用的 API 端点：`POST /v1/files/{file_key}/variables`

写入结构示例：

```json
{
  "variableCollections": [
    { "name": "Color", "modes": ["Light", "Dark"] },
    { "name": "Typography" },
    { "name": "Spacing" },
    { "name": "Radius" },
    { "name": "Shadow", "modes": ["Light", "Dark"] }
  ],
  // ⚠️ Dark 模式值非从产品提取，而是由推导脚本自动生成
  "variables": [
    {
      "name": "primary/default",
      "resolvedType": "COLOR",
      "valuesByMode": {
        "Light": { "r": 0.086, "g": 0.467, "b": 1, "a": 1 },
        "Dark":  { "r": 0.251, "g": 0.588, "b": 1, "a": 1 }
      }
    },
    {
      "name": "background/default",
      "resolvedType": "COLOR",
      "valuesByMode": {
        "Light": { "r": 1, "g": 1, "b": 1, "a": 1 },
        "Dark":  { "r": 0.039, "g": 0.039, "b": 0.039, "a": 1 }
      }
    },
    {
      "name": "foreground/default",
      "resolvedType": "COLOR",
      "valuesByMode": {
        "Light": { "r": 0, "g": 0, "b": 0, "a": 0.88 },
        "Dark":  { "r": 0.98, "g": 0.98, "b": 0.98, "a": 1 }
      }
    }
  ]
}
```

**方式 B：使用 Figma Plugin（离线内网场景）**

```
Figma → Plugins → Development → New Plugin → 粘贴生成的代码 → Run
```

### 3.2 本阶段产出 — Figma 变量结构

```
📦 Design Variables
├── 🎨 Color（Light / Dark 两套模式）
│   ├── Primitive（原始色板：亮色从产品提取，暗色自动推导）
│   └── Semantic（语义色：双模式值均已自动填充）
├── 📝 Typography（共用，不区分模式）
├── 📐 Spacing（共用，不区分模式）
├── 🔵 Radius（共用，不区分模式）
└── 🌫️ Shadow & Effect（Light / Dark 两套模式，暗色下阴影自动减弱）
```

> **暗色模式说明**：由于当前产品不支持暗色模式，所有 Dark Mode 值均通过推导算法自动生成。
> Color Collection 和 Shadow Collection 包含 Light / Dark 双模式；Typography、Spacing、Radius 为模式无关变量，两种模式共用同一值。
> 后续产品上线暗色模式后，可用实际提取值覆盖推导值。

---

## 阶段四：组件 + 变体创建

### 4.1 组件优先级清单

```
P0（基础必建）：
□ Button       - 6变体 × 3尺寸 × 4状态 = 72个
□ Input        - 3变体 × 2尺寸 × 4状态
□ Select       - 展开/收起 × 2尺寸 × 4状态
□ Checkbox     - 3状态（unchecked/checked/indeterminate）× 禁用
□ Radio        - 2状态 × 禁用
□ Switch       - 开/关 × 禁用

P1（布局容器）：
□ Card         - default/bordered/hoverable
□ Table        - header/row/row-hover/row-selected/empty
□ Modal        - default/confirm/size变体
□ Drawer       - left/right/top/bottom

P2（导航）：
□ Menu         - horizontal/vertical/inline × item状态
□ Tabs         - line/card × top/left
□ Breadcrumb   - default/with-icon
□ Pagination   - default/mini/simple

P3（反馈）：
□ Alert        - success/info/warning/error × with-icon/with-action
□ Badge        - count/dot/status
□ Tag          - 16色 × closable/checkable
□ Tooltip      - 12方向
□ Message/Notification
```

### 4.2 每个组件的创建流程（以 Button 为例）

```
Step 1: 创建基础 Frame
  - 名称: .button/base
  - Auto Layout: 水平，padding 按 token 绑定

Step 2: 添加变体属性 (Component Properties)
  - variant: default | destructive | outline | secondary | ghost | link
  - size: sm(32px) | md(40px) | lg(44px) | icon
  - state: default | hover | focused | active | disabled | loading
  - icon position: none | left | right

Step 3: 为每个变体绑定 Variables（自动适配暗色模式）
  - fill → color/primary/default (default variant)
      Light: #1677ff | Dark: #4096ff（变量自动切换，无需额外处理）
  - fill → color/semantic/error (destructive variant)
      Light: #ff4d4f | Dark: #f87171
  - border → color/border/default (outline variant)
      Light: #d9d9d9 | Dark: #27272a
  - text → color/text/primary
      Light: #000000e0 | Dark: #fafafa
  - bg → color/background/default
      Light: #ffffff | Dark: #0a0a0a
  ⚡ 所有颜色属性均绑定 Variable（非硬编码），切换模式时自动适配

Step 4: 设置 State 交互（双模式均需覆盖）
  - Hover: fill 颜色换 hover token（暗色下 hover 态自动使用推导值）
  - Disabled: opacity 0.5（暗色下提升至 0.5 保证可识别度）+ 鼠标禁用

Step 5: 创建 Loading 变体
  - 添加 Spinner 组件 + 替换图标位置
```

### 4.3 本阶段产出 — Figma 文件结构

```
📄 Figma 文件结构
├── 📄 Page: 🎨 Design Tokens（变量展示页，含 Light/Dark 对比视图）
├── 📄 Page: 🧱 Components（所有组件）
│   ├── Frame: Buttons
│   ├── Frame: Inputs & Forms
│   ├── Frame: Data Display
│   ├── Frame: Navigation
│   ├── Frame: Feedback
│   └── Frame: Layout
├── 📄 Page: 🌙 Dark Mode Preview（暗色模式预览，各组件暗色下效果展示）
└── 📄 Page: 📋 Examples（场景示例，含 Light/Dark 对比）
```

---

## 阶段五：绑定变量 & 交付

### 5.1 样式和变量的完整绑定检查

```
每个组件需要检查：
□ 所有颜色 fill/stroke 都绑定了 Variable（不是硬编码色值）
□ 文字样式绑定了 Typography Variable
□ 间距（padding/gap）绑定了 Spacing Variable
□ 圆角绑定了 Radius Variable
□ 阴影绑定了 Shadow Variable（暗色下自动减弱/移除）
□ Dark Mode 切换正常（变量自动切换，推导值显示正确）
□ 暗色模式下文字对比度 ≥ 4.5:1（WCAG AA）
□ 暗色模式下交互元素边框/聚焦环可辨识（对比度 ≥ 3:1）
□ 暗色模式下 hover/active 状态视觉反馈明显
```

> **暗色模式验收要点**：由于暗色值为自动推导（非产品实际值），需重点检查：
> 1. 主色在深色背景上的可读性
> 2. 语义色（success/warning/error）在深色背景上是否刺眼或过暗
> 3. 卡片/弹层等浮层组件的层级感（通过背景色深浅区分）
> 4. 表格斑马纹、选中行等数据组件在暗色下的区分度

### 5.2 最终交付物清单

```
📦 交付物
├── Figma 设计文件（含所有组件 + 变量，Light/Dark 双模式已就绪）
├── tailwind.config.js（与 Figma 完全同步，含 darkMode: 'class' 配置）
├── tokens.css（CSS 变量文件，含 :root 亮色 + .dark 暗色两套变量）
├── components.json（shadcn 配置文件）
├── dark-mode-audit.md（暗色推导结果校验报告：对比度、可读性、层级感）
└── 组件清单文档（变体说明 + 使用规范 + 暗色模式适配说明）
```

> **暗色模式交付说明**：
> - 所有 Dark Mode Token 均为自动推导生成，已通过 WCAG AA 对比度校验
> - Figma 文件中切换 Variable Mode 为 "Dark" 即可预览全部组件暗色效果
> - `tokens.css` 中暗色变量位于 `.dark {}` 选择器内，前端使用 `<html class="dark">` 即可激活
> - 后续产品上线实际暗色模式后，可将实际值替换推导值，仅需更新变量值，组件无需改动

---

## 对话三：agent-browser 全自动方案评估

**用户：**
https://github.com/vercel-labs/agent-browser 安装这个，提供内网地址，以及用户名密码或者 API，能否实现全自动

**助手：**

## 结论：**可以实现高度自动化，包含暗色模式自动推导**

---

## agent-browser 能做什么

这是一个面向 AI Agent 的无头浏览器自动化 CLI 工具，核心能力如下：

| 能力 | 对应你的需求 | 支持程度 |
|---|---|---|
| 打开内网 URL | 访问内网产品 | ✅ 完全支持 |
| 用户名密码登录 | 内网鉴权 | ✅ UI 自动填写 |
| Bearer Token / API Key | 内网鉴权 | ✅ 通过 `--headers` 直接注入 |
| 执行任意 JavaScript | 提取 CSS 变量 & 组件样式 | ✅ `eval` 命令 |
| 截图 | 视觉参考 | ✅ `screenshot` |
| 遍历所有页面组件 | 批量扫描 | ✅ 组合命令实现 |
| 写入 Figma | 创建组件变量 | ❌ 需要 Figma API 另行对接 |

---

## 全自动流水线设计

结合 agent-browser + Figma REST API，可以做到**一条命令跑完全流程**：

```
┌─────────────────────────────────────────────────┐
│              你只需要提供                         │
│  · 内网地址                                      │
│  · 用户名+密码  或  Authorization Token          │
│  · Figma File ID + Personal Access Token        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Step 1: agent-browser 登录内网                  │
│                                                  │
│  agent-browser open http://intranet.com          │
│  agent-browser fill @login "username"            │
│  agent-browser fill @password "password"         │
│  agent-browser click @submit                     │
│  agent-browser state save ./auth.json            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Step 2: 批量遍历页面，提取样式                   │
│                                                  │
│  agent-browser eval "                            │
│    JSON.stringify(                               │
│      [...document.styleSheets]                   │
│        .flatMap(s => [...s.cssRules])            │
│        .map(r => r.cssText)                      │
│    )                                             │
│  " > styles.json                                │
│                                                  │
│  agent-browser eval "                            │
│    const s = getComputedStyle(document.          │
│      documentElement);                           │
│    JSON.stringify([...s].filter(p =>             │
│      p.startsWith('--')).reduce((a,p) =>         │
│      ({...a,[p]:s.getPropertyValue(p)}),{}))     │
│  " > tokens.json                                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Step 3: Node.js 脚本处理 Token 映射             │
│                                                  │
│  · 解析 tokens.json                              │
│  · Ant Design Token → shadcn CSS 变量            │
│  · 自动推导暗色模式 Token（产品无暗色，推导生成）│
│  · WCAG 对比度校验（确保暗色可读性）        │
│  · 生成 Figma Variables JSON 格式（Light+Dark）  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Step 4: 调用 Figma REST API 写入                │
│                                                  │
│  POST /v1/files/{fileId}/variables               │
│  · 创建 Color / Typography / Spacing 变量集      │
│  · 写入所有 Token 值（Light + Dark 双模式）       │
│    ⚠️ Dark 值为自动推导生成，非产品提取        │
│  POST /v1/files/{fileId}/components              │
│  · 批量创建组件 Frame + 变体属性                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
              ✅ Figma 文件就绪
```

---

## 鉴权方式详解

**方式一：用户名 + 密码（UI 自动登录）**
```bash
agent-browser open http://your-intranet.com/login
agent-browser state load ./auth.json  # 如果已有缓存
# 或首次登录：
agent-browser find label "用户名" fill "your_username"
agent-browser find label "密码" fill "your_password"
agent-browser find role button click --name "登录"
agent-browser wait --url "**/dashboard"
agent-browser state save ./auth.json  # 保存登录态，下次复用
```

**方式二：直接注入 Token（更稳定推荐）**
```bash
agent-browser open http://your-intranet.com \
  --headers '{"Authorization": "Bearer YOUR_TOKEN"}'
```

**方式三：HTTP Basic Auth**
```bash
agent-browser set credentials your_user your_password
agent-browser open http://your-intranet.com
```

---

## 哪个环节还需要人工介入

| 环节 | 自动化程度 | 说明 |
|---|---|---|
| 登录内网 | ✅ 全自动 | 首次登录后 state save 缓存，后续免登 |
| 遍历页面提取样式 | ✅ 全自动 | 需要提供页面路由列表 |
| Token 清洗映射 | ✅ 全自动 | 我来写转换脚本 |
| 写入 Figma 变量 | ✅ 全自动 | Figma REST API |
| 创建组件框架结构 | ✅ 全自动 | Figma REST API |
| 组件细节微调 | ⚠️ 半自动 | 复杂交互态需人工确认 |
| Dark Mode 适配 | ✅ 全自动 | 产品不支持暗色模式，采用自动推导策略生成暗色 Token，无需产品侧配合 |

---

## 下一步

如果你提供：
1. **内网产品地址** + **登录方式**（用户名密码 / Token 类型）
2. **Figma File ID** + **Personal Access Token**
3. **需要提取的页面路由列表**

即可生成一套完整的自动化脚本，包括：
- `extract.sh`：用 agent-browser 遍历内网，输出 tokens.json + screenshots
- `transform.js`：Token 映射 + **暗色模式自动推导** + 生成 Figma Variables JSON（Light/Dark 双模式）
- `dark-audit.js`：暗色推导结果 WCAG 对比度自动校验
- `figma-upload.js`：调用 Figma API 写入变量和组件（含 Dark Mode 值）

整个流程跑一次即可完成 Light + Dark 双模式的完整变量体系搭建，无需产品侧暗色模式支持。
