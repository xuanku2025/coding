#!/usr/bin/env python3
"""
Minimal Playwright MCP server.
Tools:
- capture_page: open URL, perform actions, capture screenshot/PDF
- screenshot_only: quick screenshot without actions
"""
import json
import os
import time
from typing import List, Dict, Any

from mcp.server.fastmcp import FastMCP
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

mcp = FastMCP("playwright-mcp")

load_dotenv()

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", os.path.join(os.getcwd(), "output"))
HEADLESS = os.environ.get("HEADLESS", "true").lower() == "true"
DEFAULT_LOGIN_URL = os.environ.get("LOGIN_URL", "")
DEFAULT_USERNAME = os.environ.get("LOGIN_USER", "")
DEFAULT_PASSWORD = os.environ.get("LOGIN_PASS", "")
SELECTOR_USER = os.environ.get("SELECTOR_USER", "")
SELECTOR_PASS = os.environ.get("SELECTOR_PASS", "")
SELECTOR_SUBMIT = os.environ.get("SELECTOR_SUBMIT", "")
SELECTOR_READY = os.environ.get("SELECTOR_READY", "")


def _ensure_output_dir() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def _run_actions(page, actions: List[Dict[str, Any]]) -> None:
    for action in actions:
        kind = action.get("type")
        if kind == "goto":
            page.goto(action["url"], wait_until=action.get("wait_until", "load"))
        elif kind == "click":
            page.click(action["selector"], timeout=action.get("timeout", 30000))
        elif kind == "fill":
            page.fill(action["selector"], action.get("value", ""), timeout=action.get("timeout", 30000))
        elif kind == "wait_for":
            page.wait_for_selector(action["selector"], timeout=action.get("timeout", 30000))
        elif kind == "wait":
            time.sleep(action.get("ms", 1000) / 1000.0)
        elif kind == "press":
            page.press(action["selector"], action.get("key", "Enter"), timeout=action.get("timeout", 30000))
        else:
            raise ValueError(f"Unknown action type: {kind}")


@mcp.tool()
def capture_page(url: str, actions_json: str = "[]", output_name: str = "capture", pdf: bool = False) -> str:
    """
    Open a URL, optionally perform actions, then capture screenshot or PDF.
    actions_json: JSON array of actions, e.g.
      [
        {"type":"goto","url":"https://example.com"},
        {"type":"fill","selector":"#user","value":"alice"},
        {"type":"fill","selector":"#pass","value":"secret"},
        {"type":"click","selector":"button[type=submit]"},
        {"type":"wait_for","selector":".dashboard"}
      ]
    output_name: base filename without extension
    pdf: true for PDF (Chromium only)
    """
    _ensure_output_dir()
    actions = json.loads(actions_json) if actions_json else []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context()
        page = context.new_page()

        # Always start by opening URL unless actions include a goto
        if not any(a.get("type") == "goto" for a in actions):
            page.goto(url, wait_until="load")

    if actions:
        _run_actions(page, actions)

        if pdf:
            out_path = os.path.join(OUTPUT_DIR, f"{output_name}.pdf")
            page.pdf(path=out_path, format="A4")
        else:
            out_path = os.path.join(OUTPUT_DIR, f"{output_name}.png")
            page.screenshot(path=out_path, full_page=True)

        context.close()
        browser.close()

    return out_path


@mcp.tool()
def screenshot_only(url: str, output_name: str = "screenshot") -> str:
    """Quick screenshot without any scripted actions."""
    _ensure_output_dir()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context()
        page = context.new_page()
        page.goto(url, wait_until="load")
        out_path = os.path.join(OUTPUT_DIR, f"{output_name}.png")
        page.screenshot(path=out_path, full_page=True)
        context.close()
        browser.close()
    return out_path


@mcp.tool()
def login_and_capture(output_name: str = "after_login", pdf: bool = False) -> str:
    """
    Login using .env config, then capture screenshot or PDF.
    Required env:
      LOGIN_URL, LOGIN_USER, LOGIN_PASS,
      SELECTOR_USER, SELECTOR_PASS, SELECTOR_SUBMIT,
      SELECTOR_READY (optional but recommended)
    """
    if not (DEFAULT_LOGIN_URL and DEFAULT_USERNAME and DEFAULT_PASSWORD):
        return "Missing LOGIN_URL/LOGIN_USER/LOGIN_PASS in .env"
    if not (SELECTOR_USER and SELECTOR_PASS and SELECTOR_SUBMIT):
        return "Missing SELECTOR_USER/SELECTOR_PASS/SELECTOR_SUBMIT in .env"

    _ensure_output_dir()

    actions = [
        {"type": "goto", "url": DEFAULT_LOGIN_URL},
        {"type": "fill", "selector": SELECTOR_USER, "value": DEFAULT_USERNAME},
        {"type": "fill", "selector": SELECTOR_PASS, "value": DEFAULT_PASSWORD},
        {"type": "click", "selector": SELECTOR_SUBMIT},
    ]
    if SELECTOR_READY:
        actions.append({"type": "wait_for", "selector": SELECTOR_READY})
    else:
        actions.append({"type": "wait", "ms": 2000})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context()
        page = context.new_page()
        _run_actions(page, actions)

        if pdf:
            out_path = os.path.join(OUTPUT_DIR, f"{output_name}.pdf")
            page.pdf(path=out_path, format="A4")
        else:
            out_path = os.path.join(OUTPUT_DIR, f"{output_name}.png")
            page.screenshot(path=out_path, full_page=True)

        context.close()
        browser.close()

    return out_path


if __name__ == "__main__":
    mcp.run()
