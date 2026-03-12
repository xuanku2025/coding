#!/usr/bin/env node
// transform.js
// Token 清洗 & 映射：读取 tokens.json → 输出 design-tokens.json + figma-variables.json + tailwind.config.js + tokens.css
// 使用方式: node scripts/transform.js

const fs = require('fs');
const path = require('path');

// ============================
// 色彩工具函数
// ============================

function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  let r = parseInt(hex.slice(0, 2), 16) / 255;
  let g = parseInt(hex.slice(2, 4), 16) / 255;
  let b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x =>
    Math.round(x * 255).toString(16).padStart(2, '0')
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

// 将 rgba/rgb 格式转为 hex
function colorToHex(color) {
  if (!color) return null;
  color = color.trim();
  if (color.startsWith('#')) {
    if (color.length === 4) return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    return color.slice(0, 7); // 去掉 alpha
  }
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return '#' + [rgbaMatch[1], rgbaMatch[2], rgbaMatch[3]]
      .map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
  }
  return null;
}

// ============================
// Ant Design Token → shadcn 变量映射
// ============================

function mapTokensToShadcn(antTokens, cssVars) {
  // 尝试从 antTokens 或 cssVars 中取值
  function resolve(antKey, fallback) {
    if (antTokens[antKey]) return colorToHex(antTokens[antKey]) || fallback;
    const cssKey = '--ant-' + antKey.replace(/([A-Z])/g, '-$1').toLowerCase();
    if (cssVars[cssKey]) return colorToHex(cssVars[cssKey]) || fallback;
    return fallback;
  }

  const light = {
    '--background': resolve('colorBgContainer', '#ffffff'),
    '--foreground': resolve('colorText', '#000000'),
    '--muted': resolve('colorBgLayout', '#f5f5f5'),
    '--muted-foreground': resolve('colorTextSecondary', '#666666'),
    '--card': resolve('colorBgElevated', '#ffffff'),
    '--card-foreground': resolve('colorText', '#000000'),
    '--popover': resolve('colorBgElevated', '#ffffff'),
    '--popover-foreground': resolve('colorText', '#000000'),
    '--primary': resolve('colorPrimary', '#1677ff'),
    '--primary-foreground': '#ffffff',
    '--secondary': resolve('colorBgLayout', '#f5f5f5'),
    '--secondary-foreground': resolve('colorText', '#000000'),
    '--accent': resolve('colorFill', '#f5f5f5'),
    '--accent-foreground': resolve('colorTextBase', '#000000'),
    '--destructive': resolve('colorError', '#ff4d4f'),
    '--destructive-foreground': '#ffffff',
    '--border': resolve('colorBorder', '#d9d9d9'),
    '--input': resolve('colorBorder', '#d9d9d9'),
    '--ring': resolve('colorPrimary', '#1677ff'),
    '--success': resolve('colorSuccess', '#52c41a'),
    '--warning': resolve('colorWarning', '#faad14'),
  };

  return light;
}

function deriveDarkTokens(lightTokens) {
  return {
    '--background': invertLightness(lightTokens['--background'], { target: 4 }),
    '--foreground': invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--muted': invertLightness(lightTokens['--muted'], { target: 9 }),
    '--muted-foreground': adjustAlpha(lightTokens['--muted-foreground'], { lightness: 65 }),
    '--card': invertLightness(lightTokens['--card'] || '#ffffff', { target: 6 }),
    '--card-foreground': invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--popover': invertLightness(lightTokens['--popover'] || '#ffffff', { target: 7 }),
    '--popover-foreground': invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--primary': boostForDarkBg(lightTokens['--primary'], { minContrast: 4.5 }),
    '--primary-foreground': '#0a0a0a',
    '--secondary': invertLightness(lightTokens['--secondary'] || '#f5f5f5', { target: 11 }),
    '--secondary-foreground': invertLightness(lightTokens['--foreground'], { target: 90 }),
    '--accent': invertLightness(lightTokens['--accent'] || '#f5f5f5', { target: 11 }),
    '--accent-foreground': invertLightness(lightTokens['--foreground'], { target: 98 }),
    '--destructive': boostForDarkBg(lightTokens['--destructive'], { minContrast: 4.5 }),
    '--destructive-foreground': '#fafafa',
    '--border': invertLightness(lightTokens['--border'], { target: 16 }),
    '--input': invertLightness(lightTokens['--border'], { target: 16 }),
    '--ring': boostForDarkBg(lightTokens['--primary'], { minContrast: 3 }),
    '--success': boostForDarkBg(lightTokens['--success'] || '#52c41a', { minContrast: 4.5 }),
    '--warning': boostForDarkBg(lightTokens['--warning'] || '#faad14', { minContrast: 4.5 }),
  };
}

// ============================
// 排版、间距、圆角 Token
// ============================

function extractTypography(antTokens) {
  return {
    'typography/size/xs': '12px',
    'typography/size/sm': antTokens.fontSize || '14px',
    'typography/size/base': '16px',
    'typography/size/lg': antTokens.fontSizeLG || '18px',
    'typography/size/xl': antTokens.fontSizeXL || '20px',
    'typography/size/2xl': '24px',
    'typography/leading/snug': antTokens.lineHeightSM || '1.4',
    'typography/leading/normal': antTokens.lineHeight || '1.5',
    'typography/leading/relaxed': antTokens.lineHeightLG || '1.6',
    'typography/weight/normal': '400',
    'typography/weight/semibold': antTokens.fontWeightStrong || '600',
    'typography/weight/bold': '700',
    'typography/font-family': antTokens.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };
}

function extractSpacing() {
  return {
    'spacing/1': '4px', 'spacing/2': '8px', 'spacing/3': '12px',
    'spacing/4': '16px', 'spacing/5': '20px', 'spacing/6': '24px',
    'spacing/8': '32px', 'spacing/10': '40px', 'spacing/12': '48px',
    'spacing/16': '64px',
  };
}

function extractRadius(antTokens) {
  return {
    'radius/sm': antTokens.borderRadiusSM || '2px',
    'radius/md': antTokens.borderRadius || '6px',
    'radius/lg': antTokens.borderRadiusLG || '8px',
    'radius/xl': '12px',
    'radius/2xl': '16px',
    'radius/full': '9999px',
  };
}

// ============================
// 输出生成
// ============================

function generateTokensCSS(light, dark) {
  let css = ':root {\n';
  for (const [k, v] of Object.entries(light)) {
    css += `  ${k}: ${v};\n`;
  }
  css += '}\n\n.dark {\n';
  for (const [k, v] of Object.entries(dark)) {
    css += `  ${k}: ${v};\n`;
  }
  css += '}\n';
  return css;
}

function generateTailwindConfig(light) {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        destructive: { DEFAULT: 'var(--destructive)', foreground: 'var(--destructive-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      borderRadius: {
        sm: 'var(--radius-sm, 2px)',
        md: 'var(--radius-md, 6px)',
        lg: 'var(--radius-lg, 8px)',
        xl: 'var(--radius-xl, 12px)',
      },
    },
  },
  plugins: [],
};
`;
}

function generateFigmaVariables(light, dark, typography, spacing, radius) {
  const colorVars = [];

  // 色彩变量（双模式）
  const semanticMap = {
    '--background': 'color/background/default',
    '--foreground': 'color/text/primary',
    '--muted': 'color/background/muted',
    '--muted-foreground': 'color/text/secondary',
    '--card': 'color/background/card',
    '--card-foreground': 'color/text/primary',
    '--popover': 'color/background/popover',
    '--popover-foreground': 'color/text/primary',
    '--primary': 'color/primary/default',
    '--primary-foreground': 'color/primary/foreground',
    '--secondary': 'color/secondary/default',
    '--secondary-foreground': 'color/secondary/foreground',
    '--accent': 'color/accent/default',
    '--accent-foreground': 'color/accent/foreground',
    '--destructive': 'color/semantic/error',
    '--destructive-foreground': 'color/semantic/error-fg',
    '--border': 'color/border/default',
    '--input': 'color/border/input',
    '--ring': 'color/ring',
    '--success': 'color/semantic/success',
    '--warning': 'color/semantic/warning',
  };

  for (const [cssVar, figmaName] of Object.entries(semanticMap)) {
    if (light[cssVar]) {
      colorVars.push({
        name: figmaName,
        type: 'COLOR',
        values: {
          Light: light[cssVar],
          Dark: dark[cssVar] || light[cssVar],
        },
      });
    }
  }

  // 排版变量
  const typoVars = Object.entries(typography).map(([name, value]) => ({
    name, type: name.includes('font-family') ? 'STRING' : 'FLOAT', value,
  }));

  // 间距变量
  const spacingVars = Object.entries(spacing).map(([name, value]) => ({
    name, type: 'FLOAT', value,
  }));

  // 圆角变量
  const radiusVars = Object.entries(radius).map(([name, value]) => ({
    name, type: 'FLOAT', value,
  }));

  return {
    variableCollections: [
      { name: 'Color', modes: ['Light', 'Dark'] },
      { name: 'Typography', modes: ['Default'] },
      { name: 'Spacing', modes: ['Default'] },
      { name: 'Radius', modes: ['Default'] },
    ],
    variables: {
      color: colorVars,
      typography: typoVars,
      spacing: spacingVars,
      radius: radiusVars,
    },
  };
}

// ============================
// 图标映射表
// ============================

function generateIconMapping() {
  return {
    SearchOutlined: 'Search',
    PlusOutlined: 'Plus',
    DeleteOutlined: 'Trash2',
    EditOutlined: 'Pencil',
    DownloadOutlined: 'Download',
    UploadOutlined: 'Upload',
    SettingOutlined: 'Settings',
    UserOutlined: 'User',
    CloseOutlined: 'X',
    CheckOutlined: 'Check',
    InfoCircleOutlined: 'Info',
    WarningOutlined: 'AlertTriangle',
    CloseCircleOutlined: 'XCircle',
    CheckCircleOutlined: 'CheckCircle',
    LeftOutlined: 'ChevronLeft',
    RightOutlined: 'ChevronRight',
    DownOutlined: 'ChevronDown',
    UpOutlined: 'ChevronUp',
    LoadingOutlined: 'Loader2',
    EllipsisOutlined: 'MoreHorizontal',
    FilterOutlined: 'Filter',
    SortAscendingOutlined: 'ArrowUpAZ',
    ExportOutlined: 'LogOut',
    CopyOutlined: 'Copy',
    EyeOutlined: 'Eye',
    EyeInvisibleOutlined: 'EyeOff',
    LockOutlined: 'Lock',
    UnlockOutlined: 'Unlock',
    HomeOutlined: 'Home',
    MenuOutlined: 'Menu',
    BellOutlined: 'Bell',
    CalendarOutlined: 'Calendar',
    FileOutlined: 'File',
    FolderOutlined: 'Folder',
    ReloadOutlined: 'RefreshCw',
    QuestionCircleOutlined: 'HelpCircle',
    StarOutlined: 'Star',
    HeartOutlined: 'Heart',
    LinkOutlined: 'Link',
    MailOutlined: 'Mail',
  };
}

// ============================
// 主流程
// ============================

function main() {
  const tokensPath = path.resolve('tokens.json');

  if (!fs.existsSync(tokensPath)) {
    console.error('❌ 未找到 tokens.json，请先运行 extract.sh 提取样式');
    console.error('   用法: node scripts/transform.js');
    console.error('   前置: agent-browser eval "$(cat scripts/extract-tokens.js)" > tokens.json');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  const antTokens = raw.antTokens || {};
  const cssVars = raw.cssVariables || {};

  console.log('📦 开始 Token 转换...');
  console.log(`   Ant Design Tokens: ${Object.keys(antTokens).length} 个`);
  console.log(`   CSS 变量: ${Object.keys(cssVars).length} 个`);

  // 1. 映射 Light Token
  const light = mapTokensToShadcn(antTokens, cssVars);
  console.log('✅ Light 模式 Token 映射完成');

  // 2. 推导 Dark Token
  const dark = deriveDarkTokens(light);
  console.log('✅ Dark 模式 Token 推导完成');

  // 3. 排版/间距/圆角
  const typography = extractTypography(antTokens);
  const spacing = extractSpacing();
  const radius = extractRadius(antTokens);

  // 4. 输出 design-tokens.json
  const designTokens = { light, dark, typography, spacing, radius };
  fs.writeFileSync('design-tokens.json', JSON.stringify(designTokens, null, 2));
  console.log('📄 design-tokens.json');

  // 5. 输出 figma-variables.json
  const figmaVars = generateFigmaVariables(light, dark, typography, spacing, radius);
  fs.writeFileSync('figma-variables.json', JSON.stringify(figmaVars, null, 2));
  console.log('📄 figma-variables.json');

  // 6. 输出 tailwind.config.js
  fs.writeFileSync('tailwind.config.js', generateTailwindConfig(light));
  console.log('📄 tailwind.config.js');

  // 7. 输出 tokens.css
  fs.writeFileSync('tokens.css', generateTokensCSS(light, dark));
  console.log('📄 tokens.css');

  // 8. 输出 icon-mapping.json
  const iconMap = generateIconMapping();
  fs.writeFileSync('icon-mapping.json', JSON.stringify(iconMap, null, 2));
  console.log('📄 icon-mapping.json');

  console.log('\n✅ 全部转换完成！产出文件：');
  console.log('   design-tokens.json   — 完整 Token（Light + Dark + 排版/间距/圆角）');
  console.log('   figma-variables.json — 可导入 Figma 的变量格式');
  console.log('   tailwind.config.js   — Tailwind 配置（darkMode: class）');
  console.log('   tokens.css           — CSS 变量（:root + .dark）');
  console.log('   icon-mapping.json    — Ant Design → Lucide 图标映射');
}

main();
