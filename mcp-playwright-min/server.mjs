#!/usr/bin/env node
import fs from "fs";
import path from "path";
import "dotenv/config";
import { chromium } from "playwright";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), "output");
const HEADLESS = (process.env.HEADLESS || "true").toLowerCase() === "true";
const IGNORE_HTTPS_ERRORS = (process.env.IGNORE_HTTPS_ERRORS || "true").toLowerCase() === "true";
const STORAGE_STATE = process.env.STORAGE_STATE || "";
const LOGIN_URL = process.env.LOGIN_URL || "";
const LOGIN_USER = process.env.LOGIN_USER || "";
const LOGIN_PASS = process.env.LOGIN_PASS || "";
const SELECTOR_USER = process.env.SELECTOR_USER || "";
const SELECTOR_PASS = process.env.SELECTOR_PASS || "";
const SELECTOR_SUBMIT = process.env.SELECTOR_SUBMIT || "";
const SELECTOR_READY = process.env.SELECTOR_READY || "";

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runActions(page, actions) {
  for (const action of actions) {
    const kind = action.type;
    if (kind === "goto") {
      await page.goto(action.url, { waitUntil: action.wait_until || "load" });
    } else if (kind === "click") {
      await page.click(action.selector, { timeout: action.timeout || 30000 });
    } else if (kind === "fill") {
      await page.fill(action.selector, action.value || "", { timeout: action.timeout || 30000 });
    } else if (kind === "wait_for") {
      await page.waitForSelector(action.selector, { timeout: action.timeout || 30000 });
    } else if (kind === "wait") {
      await page.waitForTimeout(action.ms || 1000);
    } else if (kind === "press") {
      await page.press(action.selector, action.key || "Enter", { timeout: action.timeout || 30000 });
    } else {
      throw new Error(`Unknown action type: ${kind}`);
    }
  }
}

const server = new Server(
  { name: "playwright-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "screenshot_only",
        description: "Quick screenshot of a URL without scripted actions",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            output_name: { type: "string", default: "screenshot" }
          },
          required: ["url"]
        }
      },
      {
        name: "capture_page",
        description: "Open URL, run actions, then capture screenshot or PDF",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            actions_json: { type: "string", default: "[]" },
            output_name: { type: "string", default: "capture" },
            pdf: { type: "boolean", default: false }
          },
          required: ["url"]
        }
      },
      {
        name: "login_and_capture",
        description: "Login using .env config, then capture screenshot or PDF",
        inputSchema: {
          type: "object",
          properties: {
            output_name: { type: "string", default: "after_login" },
            pdf: { type: "boolean", default: false }
          },
          required: []
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  ensureOutputDir();

  if (name === "screenshot_only") {
    const browser = await chromium.launch({ headless: HEADLESS });
    const contextOptions = { ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS };
    if (STORAGE_STATE && fs.existsSync(STORAGE_STATE)) contextOptions.storageState = STORAGE_STATE;
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await page.goto(args.url, { waitUntil: "load" });
    const outPath = path.join(OUTPUT_DIR, `${args.output_name || "screenshot"}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    await context.close();
    await browser.close();
    return { content: [{ type: "text", text: outPath }] };
  }

  if (name === "capture_page") {
    const actions = args.actions_json ? JSON.parse(args.actions_json) : [];
    const browser = await chromium.launch({ headless: HEADLESS });
    const contextOptions = { ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS };
    if (STORAGE_STATE && fs.existsSync(STORAGE_STATE)) contextOptions.storageState = STORAGE_STATE;
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    if (!actions.some((a) => a.type === "goto")) {
      await page.goto(args.url, { waitUntil: "load" });
    }
    if (actions.length) {
      await runActions(page, actions);
    }

    let outPath;
    if (args.pdf) {
      outPath = path.join(OUTPUT_DIR, `${args.output_name || "capture"}.pdf`);
      await page.pdf({ path: outPath, format: "A4" });
    } else {
      outPath = path.join(OUTPUT_DIR, `${args.output_name || "capture"}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
    }

    await context.close();
    await browser.close();
    return { content: [{ type: "text", text: outPath }] };
  }

  if (name === "login_and_capture") {
    if (!LOGIN_URL || !LOGIN_USER || !LOGIN_PASS) {
      return { content: [{ type: "text", text: "Missing LOGIN_URL/LOGIN_USER/LOGIN_PASS in .env" }] };
    }
    if (!SELECTOR_USER || !SELECTOR_PASS || !SELECTOR_SUBMIT) {
      return { content: [{ type: "text", text: "Missing SELECTOR_USER/SELECTOR_PASS/SELECTOR_SUBMIT in .env" }] };
    }

    const actions = [
      { type: "goto", url: LOGIN_URL },
      { type: "fill", selector: SELECTOR_USER, value: LOGIN_USER },
      { type: "fill", selector: SELECTOR_PASS, value: LOGIN_PASS },
      { type: "click", selector: SELECTOR_SUBMIT }
    ];
    if (SELECTOR_READY) {
      actions.push({ type: "wait_for", selector: SELECTOR_READY });
    } else {
      actions.push({ type: "wait", ms: 2000 });
    }

    const browser = await chromium.launch({ headless: HEADLESS });
    const contextOptions = { ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS };
    if (STORAGE_STATE && fs.existsSync(STORAGE_STATE)) contextOptions.storageState = STORAGE_STATE;
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await runActions(page, actions);

    let outPath;
    if (args.pdf) {
      outPath = path.join(OUTPUT_DIR, `${args.output_name || "after_login"}.pdf`);
      await page.pdf({ path: outPath, format: "A4" });
    } else {
      outPath = path.join(OUTPUT_DIR, `${args.output_name || "after_login"}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
    }

    await context.close();
    await browser.close();
    return { content: [{ type: "text", text: outPath }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
