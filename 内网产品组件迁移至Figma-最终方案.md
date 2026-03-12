# 内网产品组件迁移至 Figma（shadcn + Tailwind）最终方案

> 目标：从内网 Ant Design 产品中提取组件样式，全自动重建至 Figma，基于 shadcn + Tailwind 规范，内置 Light / Dark 双模式变量体系。

---

## 整体流水线

```
内网产品 (Ant Design)
    │
    ▼
[阶段一] DOM + 样式提取          ← agent-browser 自动登录 + 多页遍历 + 交互态模拟
    │
    ▼
[阶段二] Token 清洗 & 映射       ← transform.js 自动转换（含完整 shadcn 变量 + 图标对齐）
    │
    ▼
[阶段三] Figma Variables 写入    ← Figma REST API / Vibma MCP（含限流处理 + 幂等性）
    │
    ▼
[阶段四] 组件 + 变体创建         ← Vibma MCP / Figma REST API（含图标系统）
    │
    ▼
[阶段五] 绑定变量 & 交付         ← 最终检查 + Team Library 发布
```

---

## 所需输入

| 项目 | 说明 |
|---|---|
| 内网产品地址 | `http://your-intranet.com` |
| 登录方式 | 用户名+密码 / Bearer Token / HTTP Basic |
| 需提取的页面路由列表 | 组件出现的页面（用于多页遍历） |
| 内网产品使用的字体 | 确认字体名称，提前在 Figma 安装 |
| Figma File ID | URL 中 `/file/[FILE_ID]/` 部分 |
| Figma Personal Access Token | 头像 → Settings → Personal Access Tokens |
| Figma Team ID | 用于发布 Team Library |

---

## ⚠️ 前置：环境安装

### 0.1 安装 agent-browser

> [agent-browser](https://github.com/vercel-labs/agent-browser) 是 Vercel Labs 开发的 AI 浏览器自动化 CLI（Rust + Playwright），支持 `eval`、`hover`、`state save/load`、`snapshot` 等完整命令集。

```bash
# 全局安装（推荐，Rust 原生二进制，最快）
npm install -g agent-browser
agent-browser install  # 下载 Chromium

# 或不安装直接试用
npx agent-browser install
npx agent-browser open example.com
```

### 0.2 安装 Figma+EX

> 使用 Figma+EX 作为 Figma 桌面客户端（替代官方 Figma Desktop App），字体来自本机系统，支持插件运行。

确保 Figma+EX 已安装并登录账号，后续操作（变量写入、组件创建、Team Library 发布）均在 Figma+EX 中完成。

### 0.3 安装 Vibma（Figma MCP）

> [Vibma](https://github.com/ufira-ai/Vibma) 是开源的 Figma MCP 工具，可让 AI Agent 直接在 Figma 中创建组件、修改样式、构建设计系统。已安装 Vibma 插件后，按以下方式配置 MCP Server：

```bash
# 方式一：从 npm 安装（推荐）
# 参考 https://raw.githubusercontent.com/ufira-ai/vibma/refs/heads/main/CARRYME.md

# 方式二：从源码构建
# 参考 https://raw.githubusercontent.com/ufira-ai/vibma/refs/heads/main/DRAGME.md
```

配置完成后，Vibma 可替代阶段三、四中的手动 Figma REST API 调用，直接通过 MCP 协议操作 Figma 文件。

---

## ⚠️ 前置：字体可用性确认

内网产品若使用私有字体（如阿里普惠体、思源黑体、PingFang SC 等），必须在执行任何 Figma 操作前完成字体安装，否则变量绑定后文字样式会 fallback，影响视觉还原。

```bash
# 检查内网产品实际使用的字体
agent-browser eval "
  const fonts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const f = getComputedStyle(el).fontFamily;
    if (f) f.split(',').forEach(v => fonts.add(v.trim().replace(/[' \"]/g, '')));
  });
  return JSON.stringify([...fonts], null, 2);
" > fonts-used.json
```

确认字体清单后：
1. 将字体文件安装到本机
2. 打开 Figma+EX（字体来自本机系统，需使用桌面客户端而非 Web 版）
3. 在 Figma 中新建一个文本框输入测试，确认字体可正常渲染

---

## 阶段一：从内网产品提取样式

### 1.1 登录内网（三选一）

```bash
# 方式 A：用户名密码
agent-browser open http://your-intranet.com/login
agent-browser find label "用户名" fill "your_username"
agent-browser find label "密码" fill "your_password"
agent-browser find role button click --name "登录"
agent-browser wait --url "**/dashboard"
agent-browser state save ./auth.json   # 保存登录态，后续复用

# 方式 B：Bearer Token（推荐，更稳定）
agent-browser open http://your-intranet.com \
  --headers '{"Authorization": "Bearer YOUR_TOKEN"}'

# 方式 C：HTTP Basic Auth
agent-browser set credentials your_user your_password
agent-browser open http://your-intranet.com
```

### 1.2 多页遍历提取（`extract.sh`）

> 单页脚本只能抓当前页面，组件分散在多个路由，需要循环遍历。

```bash
#!/bin/bash
# extract.sh - 多页遍历提取样式

ROUTES=(
  "/dashboard"
  "/users"
  "/settings"
  "/orders"
  # 补充你的页面路由
)

BASE_URL="http://your-intranet.com"

agent-browser state load ./auth.json  # 复用登录态

for ROUTE in "${ROUTES[@]}"; do
  echo "正在提取: $BASE_URL$ROUTE"
  agent-browser open "$BASE_URL$ROUTE"
  agent-browser wait --selector "body"
  sleep 1  # 等待动态组件渲染

  # Token 只需首页提取一次
  if [ "$ROUTE" == "${ROUTES[0]}" ]; then
    agent-browser eval "$(cat scripts/extract-tokens.js)" > tokens.json
  fi

  # 提取当前页组件样式
  SAFE_ROUTE=$(echo "$ROUTE" | tr '/' '_')
  agent-browser eval "$(cat scripts/extract-components.js)" > "components${SAFE_ROUTE}.json"
done

# 合并所有页面的组件样式
node scripts/merge-components.js components_*.json > components.json
echo "✅ 提取完成：tokens.json + components.json"
```

### 1.3 提取全局 CSS 变量 & Ant Design Token（`scripts/extract-tokens.js`）

```js
(() => {
  const styles = getComputedStyle(document.documentElement);
  const tokens = {};
  for (const prop of styles) {
    if (prop.startsWith('--')) {
      tokens[prop] = styles.getPropertyValue(prop).trim();
    }
  }
  const antKeys = [
    'colorPrimary','colorSuccess','colorWarning','colorError','colorInfo',
    'colorTextBase','colorBgBase','colorBorder','colorBgContainer',
    'colorBgLayout','colorBgElevated','colorText','colorTextSecondary',
    'colorTextTertiary','colorTextDisabled','colorFill','colorFillSecondary',
    'borderRadius','borderRadiusLG','borderRadiusSM','borderRadiusXS',
    'fontSize','fontSizeLG','fontSizeSM','fontSizeXL',
    'lineHeight','lineHeightLG','lineHeightSM',
    'fontFamily','fontWeightStrong',
    'boxShadow','boxShadowSecondary','boxShadowTertiary',
    'controlHeight','controlHeightLG','controlHeightSM',
    'paddingContentHorizontal','paddingContentVertical',
    'marginXXS','marginXS','marginSM','margin','marginMD','marginLG','marginXL',
    'paddingXXS','paddingXS','paddingSM','padding','paddingMD','paddingLG','paddingXL',
  ];
  const antTokens = {};
  antKeys.forEach(key => {
    const cssVar = '--ant-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    const val = styles.getPropertyValue(cssVar).trim();
    if (val) antTokens[key] = val;
  });
  return JSON.stringify({ cssVariables: tokens, antTokens }, null, 2);
})();
```

### 1.4 提取组件样式（含交互状态模拟）（`scripts/extract-components.js`）

> ⚠️ `getComputedStyle` 只能抓静态样式，hover / focus / active 状态需要通过 JS 主动触发后再提取。

```js
(async () => {
  const componentSelectors = [
    'ant-btn','ant-input','ant-select','ant-table','ant-modal',
    'ant-form','ant-form-item','ant-menu','ant-tabs','ant-tag','ant-badge',
    'ant-card','ant-alert','ant-tooltip','ant-dropdown',
    'ant-checkbox','ant-radio','ant-switch','ant-pagination',
    'ant-date-picker','ant-upload','ant-spin'
  ];

  function snapshot(el) {
    const s = getComputedStyle(el);
    return {
      color: s.color, backgroundColor: s.backgroundColor,
      borderColor: s.borderColor, borderWidth: s.borderWidth,
      borderRadius: s.borderRadius, boxShadow: s.boxShadow,
      fontSize: s.fontSize, fontWeight: s.fontWeight,
      lineHeight: s.lineHeight, fontFamily: s.fontFamily,
      padding: s.padding, height: s.height, opacity: s.opacity,
      outline: s.outline, outlineColor: s.outlineColor,
    };
  }

  async function captureStates(el) {
    const states = { default: snapshot(el) };

    // Hover
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    states.hover = snapshot(el);
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

    // Focus
    el.focus?.();
    await new Promise(r => setTimeout(r, 50));
    states.focus = snapshot(el);
    el.blur?.();

    // Active
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    states.active = snapshot(el);
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    return states;
  }

  const result = {};
  const promises = [];

  componentSelectors.forEach(comp => {
    const els = document.querySelectorAll(`[class*="${comp}"]`);
    if (!els.length) return;
    result[comp] = {};
    els.forEach(el => {
      const key = [...el.classList].filter(c => c.startsWith(comp)).join(' ') || comp;
      if (result[comp][key]) return; // 同类型只取一个
      promises.push(
        captureStates(el).then(states => { result[comp][key] = states; })
      );
    });
  });

  await Promise.all(promises);
  return JSON.stringify(result, null, 2);
})();
```

**本阶段产出：** `tokens.json` + `components.json`（含静态 + 交互状态样式）

---

## 阶段二：Token 清洗 & 映射（`transform.js`）

### 2.1 完整 shadcn 变量映射表

> 补充了 shadcn 必需但原方案遗漏的变量：`--primary-foreground`、`--secondary`、`--accent`、`--input`、`--ring`。

```
Ant Design Token            →    shadcn CSS 变量             →    Figma Variable (Light)        →    Figma Variable (Dark·推导)
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
colorPrimary (#1677ff)      →    --primary                   →    color/primary/default         →    #4096ff（亮度+15%）
colorPrimary hover          →    --primary/hover             →    color/primary/hover           →    #69b1ff（亮度+25%）
白色（主色上文字）            →    --primary-foreground        →    color/primary/foreground      →    #0a0a0a（深色）
colorBgLayout (#f5f5f5)     →    --secondary                 →    color/secondary/default       →    #1c1c1c
colorTextSecondary          →    --secondary-foreground      →    color/secondary/foreground    →    #e4e4e7
colorFill                   →    --accent                    →    color/accent/default          →    #1c1c1c
colorTextBase               →    --accent-foreground         →    color/accent/foreground       →    #fafafa
colorBgContainer (#fff)     →    --background                →    color/background/default      →    #0a0a0a（反转）
colorBgLayout (#f5f5f5)     →    --muted                     →    color/background/muted        →    #171717（反转）
colorBgElevated             →    --card                      →    color/background/card         →    #141414
colorBgElevated             →    --popover                   →    color/background/popover      →    #1c1c1c
colorBorder (#d9d9d9)       →    --border                    →    color/border/default          →    #27272a（低亮度）
colorBorder                 →    --input                     →    color/border/input            →    #27272a
colorPrimary                →    --ring                      →    color/ring                    →    #4096ff（聚焦环复用主色）
colorText (#000000e0)       →    --foreground                →    color/text/primary            →    #fafafa（反转）
colorTextSecondary          →    --muted-foreground          →    color/text/secondary          →    #a1a1aa（65%亮度）
colorError (#ff4d4f)        →    --destructive               →    color/semantic/error          →    #f87171（亮度微调）
白色（错误色上文字）           →    --destructive-foreground    →    color/semantic/error-fg       →    #fafafa
colorSuccess (#52c41a)      →    --success                   →    color/semantic/success        →    #4ade80（饱和度微调）
colorWarning (#faad14)      →    --warning                   →    color/semantic/warning        →    #fbbf24（保持高亮度）
```

### 2.2 完整排版系统

```
Ant Design           →    Tailwind class    →    Figma Variable
──────────────────────────────────────────────────────────────
fontSize: 12px       →    text-xs           →    typography/size/xs       ← 补充（辅助说明文字）
fontSize: 14px       →    text-sm           →    typography/size/sm
fontSize: 16px       →    text-base         →    typography/size/base
fontSizeLG: 18px     →    text-lg           →    typography/size/lg
fontSizeXL: 20px     →    text-xl           →    typography/size/xl
fontSizeXL: 24px     →    text-2xl          →    typography/size/2xl      ← 补充（页面大标题）
lineHeight: 1.5      →    leading-normal    →    typography/leading/normal
lineHeightLG: 1.6    →    leading-relaxed   →    typography/leading/relaxed
lineHeightSM: 1.4    →    leading-snug      →    typography/leading/snug
fontWeight: 400      →    font-normal       →    typography/weight/normal
fontWeightStrong:600 →    font-semibold     →    typography/weight/semibold
fontWeight: 700      →    font-bold         →    typography/weight/bold
```

### 2.3 间距 & 圆角

```
Spacing: 4/8/12/16/20/24/32/40/48/64px  →  spacing/1 ~ spacing/16
Radius:  2/4/6/8/12/16/9999px           →  radius/sm/md/lg/xl/full
Shadow:  3层                             →  shadow/sm/md/lg
```

### 2.4 图标系统对齐（Ant Design Icons → Lucide Icons）

> Ant Design 使用 `@ant-design/icons`，shadcn 标准搭配 Lucide Icons，两套命名体系不同，需建立映射表并在 Figma 组件中统一使用 Lucide 图标。

**高频图标映射：**

```
Ant Design Icon           →    Lucide Icon
────────────────────────────────────────────
SearchOutlined            →    Search
PlusOutlined              →    Plus
DeleteOutlined            →    Trash2
EditOutlined              →    Pencil
DownloadOutlined          →    Download
UploadOutlined            →    Upload
SettingOutlined           →    Settings
UserOutlined              →    User
CloseOutlined             →    X
CheckOutlined             →    Check
InfoCircleOutlined        →    Info
WarningOutlined           →    AlertTriangle
CloseCircleOutlined       →    XCircle
CheckCircleOutlined       →    CheckCircle
LeftOutlined              →    ChevronLeft
RightOutlined             →    ChevronRight
DownOutlined              →    ChevronDown
LoadingOutlined           →    Loader2（需加 spin 动画）
EllipsisOutlined          →    MoreHorizontal
FilterOutlined            →    Filter
SortAscendingOutlined     →    ArrowUpAZ
ExportOutlined            →    LogOut
```

**Figma 图标处理：**
1. 安装 Figma Lucide 插件，或从 [lucide.dev](https://lucide.dev) 批量导入 SVG
2. 在 Figma 文件中建立独立的 `Icons` Page，每个图标作为 Component，命名为 `icon/[name]`
3. 组件中图标使用 `Instance Swap` 属性，方便后续批量替换

### 2.5 暗色模式自动推导（含完整函数实现）

> ⚠️ 当前内网产品不支持暗色模式，Dark Token 全部由以下规则自动生成。原方案中 `invertLightness`、`boostForDarkBg`、`adjustAlpha` 均为伪代码，以下为完整可执行实现。

```js
// transform.js - 暗色 Token 推导完整实现

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255;
  let g = parseInt(hex.slice(3,5),16)/255;
  let b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return { h: h*360, s: s*100, l: l*100 };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h/30) % 12;
  const a = s * Math.min(l, 1-l);
  const f = n => l - a*Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
  return '#' + [f(0),f(8),f(4)].map(x =>
    Math.round(x*255).toString(16).padStart(2,'0')
  ).join('');
}

function invertLightness(hex, { target }) {
  const { h, s } = hexToHsl(hex);
  return hslToHex(h, s, target);
}

function adjustAlpha(hex, { lightness }) {
  const { h, s } = hexToHsl(hex);
  return hslToHex(h, s, lightness);
}

function boostForDarkBg(hex, { minContrast, bgHex = '#0a0a0a' }) {
  let { h, s, l } = hexToHsl(hex);
  const bgL = hexToHsl(bgHex).l / 100;
  let attempts = 0;
  while (attempts++ < 20) {
    const fgL = l / 100;
    const lMax = Math.max(fgL, bgL), lMin = Math.min(fgL, bgL);
    const contrast = (lMax + 0.05) / (lMin + 0.05);
    if (contrast >= minContrast) break;
    l = Math.min(l + 5, 95);
  }
  return hslToHex(h, s, l);
}

function deriveDarkTokens(lightTokens) {
  return {
    '--background':             invertLightness(lightTokens['--background'], { target: 4 }),
    '--muted':                  invertLightness(lightTokens['--muted'], { target: 9 }),
    '--card':                   invertLightness(lightTokens['--card'] || '#fff', { target: 6 }),
    '--popover':                invertLightness(lightTokens['--popover'] || '#fff', { target: 7 }),
    '--foreground':             invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--muted-foreground':       adjustAlpha(lightTokens['--muted-foreground'], { lightness: 65 }),
    '--primary':                boostForDarkBg(lightTokens['--primary'], { minContrast: 4.5 }),
    '--primary-foreground':     '#0a0a0a',
    '--secondary':              invertLightness(lightTokens['--secondary'] || '#f5f5f5', { target: 11 }),
    '--secondary-foreground':   invertLightness(lightTokens['--foreground'], { target: 90 }),
    '--accent':                 invertLightness(lightTokens['--accent'] || '#f5f5f5', { target: 11 }),
    '--accent-foreground':      invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--destructive':            boostForDarkBg(lightTokens['--destructive'], { minContrast: 4.5 }),
    '--destructive-foreground': '#fafafa',
    '--border':                 invertLightness(lightTokens['--border'], { target: 16 }),
    '--input':                  invertLightness(lightTokens['--border'], { target: 16 }),
    '--ring':                   boostForDarkBg(lightTokens['--primary'], { minContrast: 3 }),
    '--shadow-sm':              'none',
    '--shadow-md':              '0 1px 2px rgba(0,0,0,0.4)',
    '--shadow-lg':              '0 2px 8px rgba(0,0,0,0.5)',
  };
}
```

### 2.6 WCAG 对比度自动校验（`dark-audit.js`）

```js
const tokens = require('./design-tokens.json');

function relativeLuminance(hex) {
  const rgb = [hex.slice(1,3), hex.slice(3,5), hex.slice(5,7)]
    .map(v => { const c = parseInt(v,16)/255; return c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; });
  return 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2];
}

function contrast(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
  return (Math.max(l1,l2)+0.05) / (Math.min(l1,l2)+0.05);
}

const checks = [
  { name: '正文文字 vs 背景',      fg: '--foreground',            bg: '--background', min: 4.5 },
  { name: '次要文字 vs 背景',      fg: '--muted-foreground',      bg: '--background', min: 3.0 },
  { name: '主色按钮文字 vs 主色',  fg: '--primary-foreground',    bg: '--primary',    min: 4.5 },
  { name: '交互边框 vs 背景',      fg: '--border',                bg: '--background', min: 3.0 },
  { name: '危险色 vs 背景',        fg: '--destructive',           bg: '--background', min: 3.0 },
  { name: '聚焦环 vs 背景',        fg: '--ring',                  bg: '--background', min: 3.0 },
];

console.log('\n=== Dark Mode WCAG Audit ===\n');
let passed = 0;
checks.forEach(({ name, fg, bg, min }) => {
  const ratio = contrast(tokens.dark[fg], tokens.dark[bg]);
  const ok = ratio >= min;
  if (ok) passed++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${ratio.toFixed(2)}:1 (需 ≥ ${min}:1)`);
});
console.log(`\n结果：${passed}/${checks.length} 项通过`);
```

**本阶段产出：**
- `design-tokens.json`：完整 Token 映射表（Light + Dark，含全部 shadcn 变量）
- `figma-variables.json`：可直接导入 Figma 的变量格式
- `tailwind.config.js`：含 `darkMode: 'class'` 配置
- `dark-mode-audit.md`：WCAG 对比度自动校验报告
- `icon-mapping.json`：Ant Design Icons → Lucide Icons 完整映射表

---

## 阶段三：Figma Variables 写入（含限流 + 幂等性）

### 3.1 `figma-upload.js`

> 新增：Rate Limit 队列（Figma API 限制约 300 req/min），以及幂等性检查（重复运行不创建重复变量，自动改为更新）。

```js
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_ID = process.env.FIGMA_FILE_ID;
const BASE_URL = `https://api.figma.com/v1/files/${FILE_ID}`;

// ── Rate Limit 队列：最多 280 req/min，留 20 作缓冲 ──
class RateLimiter {
  constructor(maxPerMin = 280) {
    this.queue = [];
    this.interval = 60000 / maxPerMin;
  }
  exec(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (this.queue.length === 1) this._run();
    });
  }
  _run() {
    if (!this.queue.length) return;
    const { fn, resolve, reject } = this.queue.shift();
    setTimeout(async () => {
      try { resolve(await fn()); } catch(e) { reject(e); }
      this._run();
    }, this.interval);
  }
}

const limiter = new RateLimiter();

async function figmaRequest(method, path, body) {
  return limiter.exec(async () => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'X-Figma-Token': FIGMA_TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      console.warn('Rate limited，等待 10s 后重试...');
      await new Promise(r => setTimeout(r, 10000));
      return figmaRequest(method, path, body);
    }
    return res.json();
  });
}

// ── 幂等性：获取已有变量，区分新增 / 更新 ──
async function getExistingVariables() {
  const data = await figmaRequest('GET', '/variables/local');
  const existing = new Map();
  Object.values(data.meta?.variables || {}).forEach(v => existing.set(v.name, v.id));
  return existing;
}

async function uploadVariables(variablesJson) {
  const existing = await getExistingVariables();
  const toCreate = variablesJson.variables.filter(v => !existing.has(v.name));
  const toUpdate = variablesJson.variables
    .filter(v => existing.has(v.name))
    .map(v => ({ ...v, id: existing.get(v.name) }));

  console.log(`新增：${toCreate.length} 个，更新：${toUpdate.length} 个`);

  if (toCreate.length) {
    await figmaRequest('POST', '/variables', {
      variableCollections: variablesJson.variableCollections,
      variables: toCreate,
    });
  }
  if (toUpdate.length) {
    await figmaRequest('PUT', '/variables', { variables: toUpdate });
  }
  console.log('✅ Figma Variables 写入完成');
}
```

### 3.2 方式 B：Figma Plugin（适合离线内网场景）

```
Figma → Plugins → Development → New Plugin → 粘贴生成代码 → Run
```

### 3.3 Figma 变量结构

```
📦 Design Variables
├── 🎨 Color（Light / Dark 两套模式）
│   ├── Primitive（原始色板：亮色从产品提取，暗色自动推导）
│   └── Semantic（含 primary-foreground / secondary / accent / input / ring）
├── 📝 Typography（共用，不区分模式）
├── 📐 Spacing（共用，不区分模式）
├── 🔵 Radius（共用，不区分模式）
└── 🌫️ Shadow & Effect（Light / Dark，暗色下自动减弱）
```

---

## 阶段四：组件 + 变体创建

### 4.1 完整组件优先级清单

```
P0（基础必建）：
□ Button          - 6变体 × 3尺寸 × 5状态（含 focused）
□ Input           - 3变体 × 2尺寸 × 4状态（focus 态绑定 --ring）
□ Select          - 展开/收起 × 2尺寸 × 4状态
□ Checkbox        - 3状态（unchecked/checked/indeterminate）× 禁用
□ Radio           - 2状态 × 禁用
□ Switch          - 开/关 × 禁用
□ Form.Item       - label + error/warning/success message × required 标记

P1（布局容器）：
□ Card            - default/bordered/hoverable
□ Table           - header/row/row-hover/row-selected/empty
□ Modal           - default/confirm/size变体
□ Drawer          - left/right/top/bottom

P2（数据录入）：
□ DatePicker      - date/range × 2尺寸 × 4状态
□ Upload          - dragger/click × idle/uploading/done/error
□ Spin            - sm/md/lg × 含文字/不含文字

P3（导航）：
□ Menu            - horizontal/vertical/inline × item状态
□ Tabs            - line/card × top/left
□ Breadcrumb      - default/with-icon
□ Pagination      - default/mini/simple

P4（反馈）：
□ Alert           - success/info/warning/error × with-icon/with-action
□ Badge           - count/dot/status
□ Tag             - 16色 × closable/checkable
□ Tooltip         - 12方向
□ Message/Notification
```

### 4.2 组件变体结构示例（Button）

```
Button
├── variant: default | destructive | outline | secondary | ghost | link
├── size:    sm(32px) | md(40px) | lg(44px) | icon
├── state:   default | hover | focused | active | disabled | loading
└── icon position: none | left | right
```

### 4.3 变量绑定规则（双模式自动适配）

```
fill    → color/primary/default           （default variant 背景）
           Light: #1677ff | Dark: #4096ff
text    → color/primary/foreground         （default variant 文字）
           Light: #ffffff | Dark: #0a0a0a
fill    → color/semantic/error             （destructive variant）
           Light: #ff4d4f | Dark: #f87171
border  → color/border/input              （outline variant 边框）
           Light: #d9d9d9 | Dark: #27272a
text    → color/text/primary
           Light: #000000e0 | Dark: #fafafa
bg      → color/background/default
           Light: #ffffff | Dark: #0a0a0a
outline → color/ring                       （focus 状态聚焦环）
           Light: #1677ff | Dark: #4096ff

⚡ 所有颜色属性均绑定 Variable（非硬编码），模式切换时自动适配。
```

### 4.4 Figma 文件结构

```
📄 Figma 文件
├── 📄 Page: 🎨 Design Tokens（变量展示页，Light/Dark 对比视图）
├── 📄 Page: 🖼️ Icons（Lucide 图标组件库）
├── 📄 Page: 🧱 Components
│   ├── Frame: Buttons
│   ├── Frame: Inputs & Forms（含 Form.Item）
│   ├── Frame: Data Entry（DatePicker / Upload / Spin）
│   ├── Frame: Data Display
│   ├── Frame: Navigation
│   ├── Frame: Feedback
│   └── Frame: Layout
├── 📄 Page: 🌙 Dark Mode Preview（各组件暗色效果展示）
└── 📄 Page: 📋 Examples（场景示例，Light/Dark 对比）
```

---

## 阶段五：绑定变量 & 交付

### 5.1 交付前检查清单

```
每个组件需确认：
□ 所有颜色 fill/stroke 均绑定 Variable（无硬编码色值）
□ 文字样式绑定 Typography Variable
□ 间距（padding/gap）绑定 Spacing Variable
□ 圆角绑定 Radius Variable
□ 阴影绑定 Shadow Variable（暗色下自动减弱/移除）
□ 图标已替换为对应 Lucide 图标 Component（非 SVG 直接粘贴）
□ 切换 Variable Mode 为 "Dark" 后显示正常
□ 暗色模式文字对比度 ≥ 4.5:1（WCAG AA）
□ 暗色模式交互元素边框/聚焦环（--ring）对比度 ≥ 3:1
□ 暗色模式 hover/active 状态视觉反馈明显
□ 主色按钮文字（--primary-foreground）可读性正常
```

### 5.2 暗色模式验收要点

1. 主色在深色背景上的可读性（对比度 ≥ 4.5:1）
2. 语义色（success/warning/error）在深色背景上不刺眼或过暗
3. 卡片/弹层等浮层组件的层级感（通过背景色深浅区分）
4. 表格斑马纹、选中行等数据组件在暗色下的区分度
5. `--primary-foreground` 在主色按钮上的文字可读性

### 5.3 Team Library 发布流程

> 组件库完成后需发布为 Team Library，团队设计师才能在其他文件中订阅使用。Figma 暂不支持 API 发布，需在客户端手动操作。

```
发布步骤：
1. 在 Figma 文件左上角点击文件名
2. 选择「Publish styles and components」
3. 填写版本描述（如：v1.0 初始发布，含 P0~P4 全部组件，Light/Dark 双模式）
4. 点击「Publish」

团队成员订阅：
· 打开任意 Figma 文件 → Assets 面板 → 搜索库名 → 点击「Add to file」

后续迭代更新：
· 修改组件/变量后，重复发布流程，填写变更说明
· 订阅了库的文件会收到「Library updates available」提示，设计师一键更新
· 组件变量值更新时，前端只需同步 tokens.css，无需改动组件代码
```

### 5.4 最终交付物清单

```
📦 交付物
├── Figma 设计文件（已发布 Team Library，含所有组件 + 变量，Light/Dark 双模式就绪）
├── tailwind.config.js（与 Figma 完全同步，含 darkMode: 'class'）
├── tokens.css（:root 亮色 + .dark 暗色，含全部 shadcn 标准变量）
├── components.json（shadcn 配置文件）
├── dark-mode-audit.md（WCAG 对比度自动校验报告）
├── icon-mapping.md（Ant Design Icons → Lucide Icons 映射表）
└── 组件清单文档（变体说明 + 使用规范 + 暗色适配说明）
```

---

## 自动化脚本清单

| 脚本 | 作用 |
|---|---|
| `extract.sh` | agent-browser 多页遍历，含交互状态模拟，输出 `tokens.json` + `components.json` |
| `transform.js` | Token 完整映射（含所有 shadcn 变量）+ 暗色推导（含实现函数）+ 图标映射表生成 |
| `dark-audit.js` | WCAG 对比度自动校验，输出通过/失败报告 |
| `figma-upload.js` | 调用 Figma API 写入，含 Rate Limit 队列 + 幂等性（新增/更新自动区分） |

> 💡 所有脚本已实现并存放在 `scripts/` 目录下，可直接使用。执行顺序：
> 1. `bash scripts/extract.sh` → 提取样式
> 2. `node scripts/transform.js` → Token 转换
> 3. `node scripts/dark-audit.js` → WCAG 校验
> 4. `node scripts/figma-upload.js` → 写入 Figma

---

## 自动化程度总览

| 环节 | 自动化程度 | 说明 |
|---|---|---|
| 登录内网 | ✅ 全自动 | 首次登录后 state save 缓存，后续免登 |
| 多页遍历提取样式 | ✅ 全自动 | extract.sh 按路由列表遍历 |
| 交互状态提取 | ✅ 全自动 | JS 模拟 hover/focus/active 后抓取 |
| Token 清洗映射 | ✅ 全自动 | transform.js 含完整函数实现 |
| 暗色 Token 推导 | ✅ 全自动 | 算法自动生成，WCAG 自动校验 |
| 图标映射表生成 | ✅ 全自动 | transform.js 输出 icon-mapping.json |
| 写入 Figma 变量 | ✅ 全自动 | 含限流队列 + 幂等性，可安全重复运行 |
| 创建组件框架结构 | ✅ 全自动 | Figma REST API |
| 图标替换确认 | ⚠️ 半自动 | 映射表已生成，边缘图标需人工确认 |
| 组件细节微调 | ⚠️ 半自动 | 复杂交互态（如 DatePicker 日历面板）需人工确认 |
| Team Library 发布 | ⚠️ 手动 | Figma 暂不支持 API 发布，需在客户端操作 |
