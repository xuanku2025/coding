#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const {
  LOGIN_URL,
  LOGIN_USER,
  LOGIN_PASS,
  SELECTOR_USER,
  SELECTOR_PASS,
  SELECTOR_SUBMIT,
  SELECTOR_READY,
  OUTPUT_DIR,
  IGNORE_HTTPS_ERRORS,
  STORAGE_STATE
} = process.env;

const outDir = OUTPUT_DIR || path.join(process.cwd(), 'output');
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'dashboard', url: 'https://172.27.52.233/virtualization-dashboard' },
  { name: 'resource-vm-detail', url: 'https://172.27.52.233/virtualization-resource/vm/detail?uuid=636c3d17391c4716a88f537f8b7df336&leftnav=virtualization.cluster.host&navView=resource' },
  { name: 'resource-host-detail', url: 'https://172.27.52.233/virtualization-resource/host/detail?uuid=ed911fe56eee4d1999e210d5051cdec5&leftnav=virtualization.cluster.host&navView=notGroup&lastResource=%2Fvirtualization-dashboard' },
  { name: 'resource-zone-detail', url: 'https://172.27.52.233/virtualization-resource/zone/detail?uuid=c6cdb573366c489ca737de857aa56db9&leftnav=virtualization.cluster.host&toSubHostList=host&dashboardState=Connected&lastResource=%2F' },
  { name: 'resource-primary-storage-detail', url: 'https://172.27.52.233/virtualization-resource/primary-storage/detail?uuid=bce1fe0e46ee4c01b8fe1c72611642a7&leftnav=virtualization.data.storage&navView=notGroup&lastResource=%2Fvirtualization-dashboard' }
];

const ignoreHttps = (IGNORE_HTTPS_ERRORS || 'true').toLowerCase() === 'true';

const contextOptions = { ignoreHTTPSErrors: ignoreHttps };
if (STORAGE_STATE && fs.existsSync(STORAGE_STATE)) {
  contextOptions.storageState = STORAGE_STATE;
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext(contextOptions);
const page = await context.newPage();

// If no storage state, try username/password login
if (!contextOptions.storageState) {
  if (!LOGIN_URL || !LOGIN_USER || !LOGIN_PASS || !SELECTOR_USER || !SELECTOR_PASS || !SELECTOR_SUBMIT) {
    console.error('Missing required env values for login');
    process.exit(1);
  }
  await page.goto(LOGIN_URL, { waitUntil: 'load' });
  await page.fill(SELECTOR_USER, LOGIN_USER);
  await page.fill(SELECTOR_PASS, LOGIN_PASS);
  await page.click(SELECTOR_SUBMIT);
  if (SELECTOR_READY) {
    await page.waitForSelector(SELECTOR_READY, { timeout: 30000 });
  } else {
    await page.waitForTimeout(3000);
  }
}

for (const p of pages) {
  await page.goto(p.url, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const outPath = path.join(outDir, `${p.name}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(outPath);
}

await context.close();
await browser.close();
