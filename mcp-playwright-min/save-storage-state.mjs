#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const { LOGIN_URL, STORAGE_STATE, IGNORE_HTTPS_ERRORS } = process.env;
if (!LOGIN_URL) {
  console.error('Missing LOGIN_URL in .env');
  process.exit(1);
}

const statePath = STORAGE_STATE || path.join(process.cwd(), 'storage-state.json');
const ignoreHttps = (IGNORE_HTTPS_ERRORS || 'true').toLowerCase() === 'true';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ ignoreHTTPSErrors: ignoreHttps });
const page = await context.newPage();

await page.goto(LOGIN_URL, { waitUntil: 'load' });
console.log('Please log in manually in the opened browser.');
console.log('After login completes, return to this terminal and press ENTER.');

await new Promise((resolve) => {
  process.stdin.resume();
  process.stdin.once('data', () => resolve());
});

await context.storageState({ path: statePath });
console.log(`Saved storage state to: ${statePath}`);

await context.close();
await browser.close();
