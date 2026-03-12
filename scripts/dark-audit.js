#!/usr/bin/env node
// dark-audit.js
// WCAG 对比度自动校验
// 使用方式: node scripts/dark-audit.js

const fs = require('fs');
const path = require('path');

const tokensPath = path.resolve('design-tokens.json');
if (!fs.existsSync(tokensPath)) {
  console.error('❌ 未找到 design-tokens.json，请先运行: node scripts/transform.js');
  process.exit(1);
}

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex).map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const checks = [
  { name: '正文文字 vs 背景',       fg: '--foreground',         bg: '--background', min: 4.5 },
  { name: '次要文字 vs 背景',       fg: '--muted-foreground',   bg: '--background', min: 3.0 },
  { name: '主色按钮文字 vs 主色',   fg: '--primary-foreground', bg: '--primary',    min: 4.5 },
  { name: '交互边框 vs 背景',       fg: '--border',             bg: '--background', min: 3.0 },
  { name: '危险色 vs 背景',         fg: '--destructive',        bg: '--background', min: 3.0 },
  { name: '聚焦环 vs 背景',         fg: '--ring',               bg: '--background', min: 3.0 },
  { name: '卡片文字 vs 卡片背景',   fg: '--card-foreground',    bg: '--card',       min: 4.5 },
  { name: '弹层文字 vs 弹层背景',   fg: '--popover-foreground', bg: '--popover',    min: 4.5 },
];

function auditMode(modeName, modeTokens) {
  console.log(`\n=== ${modeName} Mode WCAG Audit ===\n`);
  let passed = 0;
  const results = [];

  checks.forEach(({ name, fg, bg, min }) => {
    const fgVal = modeTokens[fg];
    const bgVal = modeTokens[bg];
    if (!fgVal || !bgVal) {
      results.push({ name, status: '⚠️', ratio: 'N/A', min, note: '缺少 Token' });
      return;
    }
    const ratio = contrast(fgVal, bgVal);
    const ok = ratio >= min;
    if (ok) passed++;
    results.push({ name, status: ok ? '✅' : '❌', ratio: ratio.toFixed(2), min, fg: fgVal, bg: bgVal });
  });

  results.forEach(r => {
    console.log(`${r.status} ${r.name}: ${r.ratio}:1 (需 ≥ ${r.min}:1)`);
  });
  console.log(`\n结果：${passed}/${checks.length} 项通过`);
  return { passed, total: checks.length, results };
}

// 审计两种模式
const lightResult = auditMode('Light', tokens.light);
const darkResult = auditMode('Dark', tokens.dark);

// 生成 markdown 报告
const report = `# Dark Mode WCAG 对比度审计报告

生成时间: ${new Date().toISOString()}

## Light Mode

| 检查项 | 状态 | 对比度 | 最低要求 |
|--------|------|--------|---------|
${lightResult.results.map(r => `| ${r.name} | ${r.status} | ${r.ratio}:1 | ≥ ${r.min}:1 |`).join('\n')}

**结果：${lightResult.passed}/${lightResult.total} 项通过**

## Dark Mode

| 检查项 | 状态 | 对比度 | 最低要求 |
|--------|------|--------|---------|
${darkResult.results.map(r => `| ${r.name} | ${r.status} | ${r.ratio}:1 | ≥ ${r.min}:1 |`).join('\n')}

**结果：${darkResult.passed}/${darkResult.total} 项通过**
`;

fs.writeFileSync('dark-mode-audit.md', report);
console.log('\n📄 报告已写入 dark-mode-audit.md');
