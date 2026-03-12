#!/usr/bin/env node
// figma-upload.js
// 调用 Figma API 写入变量，含 Rate Limit 队列 + 幂等性
// 使用方式:
//   export FIGMA_TOKEN="figd_xxxx"
//   export FIGMA_FILE_ID="xxxxxxxxxxxx"
//   node scripts/figma-upload.js

const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_ID = process.env.FIGMA_FILE_ID;

if (!FIGMA_TOKEN || !FILE_ID) {
  console.error('❌ 请设置环境变量：');
  console.error('   export FIGMA_TOKEN="figd_xxxx"');
  console.error('   export FIGMA_FILE_ID="xxxxxxxxxxxx"');
  process.exit(1);
}

const BASE_URL = `https://api.figma.com/v1/files/${FILE_ID}`;

// Rate Limit 队列：最多 280 req/min
class RateLimiter {
  constructor(maxPerMin = 280) {
    this.queue = [];
    this.interval = 60000 / maxPerMin;
    this.running = false;
  }
  exec(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.running) this._run();
    });
  }
  async _run() {
    this.running = true;
    while (this.queue.length) {
      const { fn, resolve, reject } = this.queue.shift();
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
      if (this.queue.length) {
        await new Promise(r => setTimeout(r, this.interval));
      }
    }
    this.running = false;
  }
}

const limiter = new RateLimiter();

async function figmaRequest(method, urlPath, body) {
  return limiter.exec(async () => {
    const url = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;
    const res = await fetch(url, {
      method,
      headers: {
        'X-Figma-Token': FIGMA_TOKEN,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      console.warn('⏳ Rate limited，等待 10s 后重试...');
      await new Promise(r => setTimeout(r, 10000));
      return figmaRequest(method, urlPath, body);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Figma API ${res.status}: ${text}`);
    }
    return res.json();
  });
}

// 获取已有变量（用于幂等性判断）
async function getExistingVariables() {
  const data = await figmaRequest('GET', '/variables/local');
  const existing = new Map();
  Object.values(data.meta?.variables || {}).forEach(v => existing.set(v.name, v.id));
  return { existing, collections: data.meta?.variableCollections || {} };
}

async function main() {
  const varsPath = path.resolve('figma-variables.json');
  if (!fs.existsSync(varsPath)) {
    console.error('❌ 未找到 figma-variables.json，请先运行: node scripts/transform.js');
    process.exit(1);
  }

  const variablesJson = JSON.parse(fs.readFileSync(varsPath, 'utf-8'));

  console.log('🔗 连接 Figma API...');
  console.log(`   File ID: ${FILE_ID}`);

  // 测试连通性
  try {
    const fileInfo = await figmaRequest('GET', '');
    console.log(`   文件名: ${fileInfo.name}`);
  } catch (e) {
    console.error(`❌ 无法连接 Figma: ${e.message}`);
    process.exit(1);
  }

  // 获取已有变量
  const { existing } = await getExistingVariables();
  console.log(`   已有变量: ${existing.size} 个`);

  // 统计
  const allVars = [
    ...variablesJson.variables.color,
    ...variablesJson.variables.typography,
    ...variablesJson.variables.spacing,
    ...variablesJson.variables.radius,
  ];

  const toCreate = allVars.filter(v => !existing.has(v.name));
  const toUpdate = allVars.filter(v => existing.has(v.name));

  console.log(`\n📊 计划: 新增 ${toCreate.length} 个, 更新 ${toUpdate.length} 个`);

  if (toCreate.length) {
    console.log('📤 写入新变量...');
    await figmaRequest('POST', '/variables', {
      variableCollections: variablesJson.variableCollections,
      variables: toCreate,
    });
    console.log(`   ✅ ${toCreate.length} 个变量已创建`);
  }

  if (toUpdate.length) {
    console.log('🔄 更新已有变量...');
    const updateVars = toUpdate.map(v => ({
      ...v,
      id: existing.get(v.name),
    }));
    await figmaRequest('PUT', '/variables', { variables: updateVars });
    console.log(`   ✅ ${toUpdate.length} 个变量已更新`);
  }

  console.log('\n✅ Figma Variables 写入完成！');
}

main().catch(e => {
  console.error('❌ 执行失败:', e.message);
  process.exit(1);
});
