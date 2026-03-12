#!/usr/bin/env node

// Copilot-to-Anthropic Proxy
// Translates Anthropic Messages API → OpenAI Chat Completions → GitHub Copilot API
// Zero external dependencies — Node.js builtins only
//
// Auth: Uses the gho_* OAuth token directly as Bearer token (same as OpenCode).
// No token exchange needed — the Copilot API accepts the OAuth token directly.

import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { URL } from "node:url";

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "8787", 10);
const HTTPS_PROXY = process.env.HTTPS_PROXY || "http://127.0.0.1:7897";
const AUTH_JSON_PATH =
  process.env.AUTH_JSON_PATH ||
  path.join(os.homedir(), ".local", "share", "opencode", "auth.json");

const COPILOT_CHAT_URL = "https://api.githubcopilot.com/chat/completions";
const COPILOT_MODELS_URL = "https://api.githubcopilot.com/models";
const VERSION = "1.0.0";

// ─── Model Name Mapping ─────────────────────────────────────────────────────
// Claude Code sends versioned model names (e.g. "claude-sonnet-4-20250514")
// but Copilot API only accepts unversioned names (e.g. "claude-sonnet-4").
// Strip the YYYYMMDD date suffix when present.

function mapModelName(model) {
  if (!model) return "claude-sonnet-4";
  // Match patterns like "claude-sonnet-4-20250514" → "claude-sonnet-4"
  const mapped = model.replace(/-(\d{8})$/, "");
  if (mapped !== model) {
    log(`Model mapped: ${model} → ${mapped}`);
  }
  return mapped;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function readOAuthToken() {
  try {
    const raw = fs.readFileSync(AUTH_JSON_PATH, "utf-8");
    const data = JSON.parse(raw);
    const entry = data["github-copilot"];
    if (!entry || !entry.access) {
      throw new Error("No github-copilot.access in auth.json");
    }
    return entry.access;
  } catch (e) {
    throw new Error(`Failed to read OAuth token from ${AUTH_JSON_PATH}: ${e.message}`);
  }
}

// ─── HTTPS via HTTP CONNECT Proxy ────────────────────────────────────────────

function httpsViaProxy(options) {
  return new Promise((resolve, reject) => {
    const proxyUrl = new URL(HTTPS_PROXY);
    const targetHost = options.hostname;
    const targetPort = options.port || 443;

    const connectReq = http.request({
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port, 10),
      method: "CONNECT",
      path: `${targetHost}:${targetPort}`,
    });

    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        return reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
      }

      const tlsSocket = tls.connect({
        host: targetHost,
        socket: socket,
        servername: targetHost,
      });

      const reqOptions = {
        ...options,
        socket: tlsSocket,
        createConnection: () => tlsSocket,
      };

      const req = https.request(reqOptions, resolve);
      req.on("error", reject);

      if (options._body) {
        req.write(options._body);
      }
      req.end();
    });

    connectReq.on("error", reject);
    connectReq.end();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function readResponseBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => resolve(Buffer.concat(chunks).toString()));
    res.on("error", reject);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function anthropicError(res, status, message) {
  const body = JSON.stringify({
    type: "error",
    error: { type: "api_error", message },
  });
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(body);
}

function setCors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "*");
}

// ─── Format Conversion: Anthropic → OpenAI ───────────────────────────────────

function flattenContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  return String(content || "");
}

function anthropicToOpenai(body) {
  const messages = [];

  // system → system message
  if (body.system) {
    const systemText =
      typeof body.system === "string"
        ? body.system
        : Array.isArray(body.system)
          ? body.system.filter((b) => b.type === "text").map((b) => b.text).join("\n")
          : String(body.system);
    messages.push({ role: "system", content: systemText });
  }

  // convert messages
  for (const msg of body.messages || []) {
    messages.push({
      role: msg.role,
      content: flattenContent(msg.content),
    });
  }

  const payload = {
    model: mapModelName(body.model),
    messages,
    max_tokens: body.max_tokens || 4096,
    stream: !!body.stream,
  };

  if (body.temperature != null) payload.temperature = body.temperature;
  if (body.top_p != null) payload.top_p = body.top_p;

  return payload;
}

// ─── Format Conversion: OpenAI → Anthropic (non-streaming) ──────────────────

function mapFinishReason(reason) {
  if (reason === "stop") return "end_turn";
  if (reason === "length") return "max_tokens";
  return "end_turn";
}

function openaiToAnthropic(oaiRes, requestModel) {
  const choice = oaiRes.choices?.[0];
  const text = choice?.message?.content || "";
  const usage = oaiRes.usage || {};

  return {
    id: oaiRes.id || `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: requestModel,
    content: [{ type: "text", text }],
    stop_reason: mapFinishReason(choice?.finish_reason),
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
    },
  };
}

// ─── Streaming: OpenAI SSE → Anthropic SSE ───────────────────────────────────

function streamOpenaiToAnthropic(upstreamRes, clientRes, requestModel, inputTokens) {
  // Write Anthropic SSE headers
  clientRes.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "access-control-allow-origin": "*",
  });

  // 1) message_start
  const msgId = `msg_${Date.now()}`;
  clientRes.write(
    `event: message_start\ndata: ${JSON.stringify({
      type: "message_start",
      message: {
        id: msgId,
        type: "message",
        role: "assistant",
        model: requestModel,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: inputTokens, output_tokens: 0 },
      },
    })}\n\n`
  );

  // 2) content_block_start
  clientRes.write(
    `event: content_block_start\ndata: ${JSON.stringify({
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    })}\n\n`
  );

  let outputTokens = 0;
  let finishReason = "end_turn";
  let buffer = "";

  upstreamRes.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);

      if (payload === "[DONE]") {
        // 4) content_block_stop
        clientRes.write(
          `event: content_block_stop\ndata: ${JSON.stringify({
            type: "content_block_stop",
            index: 0,
          })}\n\n`
        );

        // 5) message_delta
        clientRes.write(
          `event: message_delta\ndata: ${JSON.stringify({
            type: "message_delta",
            delta: { stop_reason: finishReason, stop_sequence: null },
            usage: { output_tokens: outputTokens },
          })}\n\n`
        );

        // 6) message_stop
        clientRes.write(
          `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`
        );
        clientRes.end();
        return;
      }

      try {
        const data = JSON.parse(payload);
        const delta = data.choices?.[0]?.delta;
        const fr = data.choices?.[0]?.finish_reason;

        if (fr) finishReason = mapFinishReason(fr);
        if (data.usage?.completion_tokens) outputTokens = data.usage.completion_tokens;

        if (delta?.content) {
          // 3) content_block_delta
          clientRes.write(
            `event: content_block_delta\ndata: ${JSON.stringify({
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: delta.content },
            })}\n\n`
          );
        }
      } catch {
        // skip malformed JSON
      }
    }
  });

  upstreamRes.on("end", () => {
    if (!clientRes.writableEnded) {
      // ensure we close cleanly if [DONE] never came
      clientRes.write(
        `event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`
      );
      clientRes.write(
        `event: message_delta\ndata: ${JSON.stringify({
          type: "message_delta",
          delta: { stop_reason: finishReason, stop_sequence: null },
          usage: { output_tokens: outputTokens },
        })}\n\n`
      );
      clientRes.write(
        `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`
      );
      clientRes.end();
    }
  });

  upstreamRes.on("error", (err) => {
    log(`Upstream stream error: ${err.message}`);
    if (!clientRes.writableEnded) clientRes.end();
  });
}

// ─── Request Forwarding ──────────────────────────────────────────────────────

async function forwardToCopilot(targetUrl, method, extraHeaders, body) {
  const oauthToken = readOAuthToken();
  const url = new URL(targetUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method,
    headers: {
      // Auth: pass the gho_* token directly as Bearer (same as OpenCode)
      "Authorization": `Bearer ${oauthToken}`,
      // Required headers matching OpenCode's copilot plugin
      "User-Agent": `copilot-proxy/${VERSION}`,
      "Openai-Intent": "conversation-edits",
      "x-initiator": "user",
      "content-type": "application/json",
      "accept": "application/json",
      ...extraHeaders,
    },
  };

  if (body) options._body = typeof body === "string" ? body : JSON.stringify(body);

  return httpsViaProxy(options);
}

// ─── Route Handlers ──────────────────────────────────────────────────────────

async function handleMessages(req, res) {
  try {
    const rawBody = await readRequestBody(req);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return anthropicError(res, 400, "Invalid JSON in request body");
    }

    const requestModel = body.model || "claude-sonnet-4";
    const isStream = !!body.stream;
    const openaiPayload = anthropicToOpenai(body);

    log(`→ ${requestModel} stream=${isStream} msgs=${openaiPayload.messages.length}`);

    const upstreamRes = await forwardToCopilot(
      COPILOT_CHAT_URL,
      "POST",
      isStream ? { accept: "text/event-stream" } : {},
      openaiPayload
    );

    if (upstreamRes.statusCode !== 200) {
      const errBody = await readResponseBody(upstreamRes);
      log(`← Copilot error ${upstreamRes.statusCode}: ${errBody}`);
      return anthropicError(res, upstreamRes.statusCode, `Copilot API error: ${errBody}`);
    }

    if (isStream) {
      streamOpenaiToAnthropic(upstreamRes, res, requestModel, 0);
    } else {
      const responseBody = await readResponseBody(upstreamRes);
      const oaiData = JSON.parse(responseBody);
      const anthropicRes = openaiToAnthropic(oaiData, requestModel);

      setCors(res);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(anthropicRes));
      log(`← 200 tokens: in=${anthropicRes.usage.input_tokens} out=${anthropicRes.usage.output_tokens}`);
    }
  } catch (err) {
    log(`Error in /v1/messages: ${err.message}`);
    anthropicError(res, 502, err.message);
  }
}

async function handleModels(req, res) {
  try {
    const upstreamRes = await forwardToCopilot(COPILOT_MODELS_URL, "GET", {});
    const body = await readResponseBody(upstreamRes);
    setCors(res);
    res.writeHead(upstreamRes.statusCode, { "content-type": "application/json" });
    res.end(body);
  } catch (err) {
    log(`Error in /v1/models: ${err.message}`);
    anthropicError(res, 502, err.message);
  }
}

function handleHealth(req, res) {
  setCors(res);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "ok", proxy: "copilot-anthropic-proxy" }));
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;

  log(`${route}`);

  try {
    if (route === "GET /") return handleHealth(req, res);
    if (route === "GET /v1/models") return await handleModels(req, res);
    if (route === "POST /v1/messages") return await handleMessages(req, res);

    anthropicError(res, 404, `Not found: ${route}`);
  } catch (err) {
    log(`Unhandled error: ${err.message}`);
    anthropicError(res, 500, "Internal server error");
  }
});

server.listen(PORT, () => {
  log("╔══════════════════════════════════════════════╗");
  log("║   Copilot → Anthropic Proxy                 ║");
  log("╚══════════════════════════════════════════════╝");
  log(`  Port:       ${PORT}`);
  log(`  Proxy:      ${HTTPS_PROXY}`);
  log(`  Auth file:  ${AUTH_JSON_PATH}`);
  log(`  Endpoint:   http://localhost:${PORT}/v1/messages`);
  log("");
  log("Configure Claude Code with:");
  log(`  ANTHROPIC_BASE_URL=http://localhost:${PORT}`);
  log("");
});
