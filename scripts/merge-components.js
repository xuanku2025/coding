#!/usr/bin/env node
// merge-components.js
// 合并多个页面的组件样式 JSON 文件
// 使用方式: node scripts/merge-components.js components_*.json > components.json

const fs = require('fs');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('用法: node merge-components.js <file1.json> [file2.json ...]');
  process.exit(1);
}

const merged = {};

for (const file of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.error(`跳过无法解析的文件: ${file} (${e.message})`);
    continue;
  }

  for (const [compType, variants] of Object.entries(data)) {
    if (!merged[compType]) {
      merged[compType] = {};
    }
    for (const [variantKey, states] of Object.entries(variants)) {
      // 同名变体保留先出现的（通常样式一致）
      if (!merged[compType][variantKey]) {
        merged[compType][variantKey] = states;
      }
    }
  }
}

const totalComponents = Object.keys(merged).length;
const totalVariants = Object.values(merged).reduce((sum, v) => sum + Object.keys(v).length, 0);
console.error(`合并完成: ${files.length} 个文件 → ${totalComponents} 类组件, ${totalVariants} 个变体`);

console.log(JSON.stringify(merged, null, 2));
