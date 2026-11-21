#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function stripAnsi(text) {
  return (text || "").replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");
}

function parseArgs(args) {
  const result = {
    goal: "",
    context: "",
    cwd: process.cwd(),
    model: "",
    tier: "medium", // low | medium | high
    timeout: 90000,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--goal" && i + 1 < args.length) {
      result.goal = args[++i];
    } else if (arg === "--context" && i + 1 < args.length) {
      result.context = args[++i];
    } else if (arg === "--cwd" && i + 1 < args.length) {
      result.cwd = path.resolve(args[++i]);
    } else if (arg === "--model" && i + 1 < args.length) {
      result.model = args[++i];
    } else if (arg === "--tier" && i + 1 < args.length) {
      result.tier = args[++i].toLowerCase();
    } else if (arg === "--timeout" && i + 1 < args.length) {
      const parsed = parseInt(args[++i], 10);
      if (!isNaN(parsed) && parsed > 0) result.timeout = parsed;
    } else if (arg === "--json") {
      result.json = true;
    }
  }

  return result;
}

async function readStdin(hasDirectInput) {
  if (hasDirectInput || process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    let data = "";
    let timeout = setTimeout(() => resolve(data.trim()), 600);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
      clearTimeout(timeout);
      timeout = setTimeout(() => resolve(data.trim()), 400);
    });
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      resolve(data.trim());
    });
    process.stdin.on("error", () => {
      clearTimeout(timeout);
      resolve("");
    });
  });
}

function loadRoutingConfig() {
  try {
    const configPath = path.join(process.cwd(), "data", "cli-routing-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch {
    // fallback to defaults
  }
  return {
    geminiGuide: {
      mode: "auto",
      manualModel: "thinking",
      cdpUrl: "http://127.0.0.1:9222",
    },
  };
}

function resolveTargetModel(config, args) {
  const gg = config?.geminiGuide || {};
  if (gg.mode === "manual" && gg.manualModel) {
    return gg.manualModel;
  }

  if (args.model) return args.model;

  if (args.tier === "high") return "thinking";
  if (args.tier === "low") return "fast";
  return "pro";
}

function getIsolatedProfileDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(localAppData, "DeskRPG", "gemini-profile");
}

function detectInstalledBrowser() {
  const isWindows = process.platform === "win32";
  if (!isWindows) {
    const linuxCandidates = ["google-chrome", "google-chrome-stable", "chromium", "microsoft-edge"];
    for (const bin of linuxCandidates) {
      try {
        const res = spawnSync("which", [bin], { stdio: "pipe" });
        if (res.status === 0 && res.stdout.toString().trim()) {
          return res.stdout.toString().trim();
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");

  const candidates = [
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function ensureBridgeRunning(cdpUrl) {
  // 1. Probe if CDP is already listening
  try {
    const res = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return true;
  } catch {
    // not running yet
  }

  // 2. Try calling DeskRPG server endpoint
  try {
    const apiRes = await fetch("http://127.0.0.1:3000/api/settings/gemini-bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure-background" }),
      signal: AbortSignal.timeout(3000),
    });
    if (apiRes.ok) {
      await new Promise((r) => setTimeout(r, 2500));
      const res = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    }
  } catch {
    // server not at 3000 or offline, proceed to direct launch
  }

  // 3. Direct launch fallback using isolated profile
  const browserPath = detectInstalledBrowser();
  if (!browserPath) return false;

  const profileDir = getIsolatedProfileDir();
  try {
    fs.mkdirSync(profileDir, { recursive: true });
  } catch {
    // ignore
  }

  const portMatch = cdpUrl.match(/:(\d+)/);
  const port = portMatch ? portMatch[1] : "9222";

  const flags = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--restore-last-session",
    "https://gemini.google.com/app",
  ];

  try {
    const child = spawn(browserPath, flags, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.unref();
  } catch {
    return false;
  }

  // Poll for up to 10 seconds for CDP endpoint to respond
  const start = Date.now();
  while (Date.now() - start < 10000) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch {
      // keep waiting
    }
  }

  return false;
}

// File-based queue lock for Chrome CDP to ensure 1 request at a time
async function acquireCdpLock(timeoutMs = 30000) {
  const lockFile = path.join(os.tmpdir(), "deskrpg-gemini-cdp.lock");
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      if (fs.existsSync(lockFile)) {
        const stats = fs.statSync(lockFile);
        // Stale lock after 120s
        if (Date.now() - stats.mtimeMs > 120000) {
          try {
            fs.unlinkSync(lockFile);
          } catch {
            // ignore
          }
        } else {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
      }

      fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, time: Date.now() }), { flag: "wx" });
      return () => {
        try {
          fs.unlinkSync(lockFile);
        } catch {
          // ignore
        }
      };
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw new Error("Không thể chiếm khóa phiên Chrome CDP (hàng đợi bận).");
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.id && this.callbacks.has(res.id)) {
            const { resolve: resCb, reject: rejCb } = this.callbacks.get(res.id);
            this.callbacks.delete(res.id);
            if (res.error) rejCb(new Error(res.error.message || "CDP Error"));
            else resCb(res.result);
          }
        } catch {
          // ignore parse errors
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
  }
}

async function runViaCdp(cdpUrl, prompt, targetModel, timeoutMs) {
  let releaseLock = null;
  let client = null;

  try {
    // 1. Acquire lock
    releaseLock = await acquireCdpLock(timeoutMs);

    // 2. Find or open Gemini Web tab
    const tabsRes = await fetch(`${cdpUrl}/json/list`, { signal: AbortSignal.timeout(3000) });
    const tabs = await tabsRes.json();
    let geminiTab = tabs.find((t) => t.type === "page" && t.url && t.url.includes("gemini.google.com"));

    if (!geminiTab) {
      const newTabRes = await fetch(`${cdpUrl}/json/new?https://gemini.google.com/app`, {
        method: "PUT",
        signal: AbortSignal.timeout(5000),
      });
      geminiTab = await newTabRes.json();
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (!geminiTab?.webSocketDebuggerUrl) {
      throw new Error("Không tìm thấy kết nối WebSocket của tab Gemini.");
    }

    client = new CdpClient(geminiTab.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Runtime.enable");

    // 3. Verify login and captcha status
    const status = await client.evaluate(`(() => {
      const url = window.location.href;
      const isLogin = url.includes("accounts.google.com") || !!document.querySelector('a[href*="accounts.google.com"]');
      const isCaptcha = !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="challenges.cloudflare"], [class*="captcha"]');
      return { isLogin, isCaptcha, url };
    })()`);

    if (status?.isLogin) {
      return {
        success: false,
        needsLogin: true,
        error: "Trình duyệt chưa đăng nhập tài khoản Google. Vui lòng bấm 'Đăng nhập tài khoản Gemini' trong Cài đặt DeskRPG để kết nối một lần.",
      };
    }

    if (status?.isCaptcha) {
      return {
        success: false,
        captchaBlocked: true,
        error: "Phát hiện màn hình xác thực trên trình duyệt. Vui lòng hoàn thành xác thực trong trình duyệt.",
      };
    }

    // 4. Send Prompt via web UI with robust multi-selectors
    const sendResult = await client.evaluate(`(() => {
      const editor = document.querySelector('[role="textbox"], rich-textarea p, rich-textarea .ql-editor, [contenteditable="true"]');
      if (!editor) return { ok: false, error: "Không tìm thấy khung nhập liệu của Gemini Web" };

      if (editor.tagName.toLowerCase() === "p" || editor.getAttribute("contenteditable") === "true") {
        editor.innerText = ${JSON.stringify(prompt)};
      } else if (editor.value !== undefined) {
        editor.value = ${JSON.stringify(prompt)};
      } else {
        editor.textContent = ${JSON.stringify(prompt)};
      }

      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));

      const sendBtn = document.querySelector(
        'button[aria-label*="Gửi"], button[aria-label*="Send"], button.send-button, [aria-label*="gửi tin nhắn"], [aria-label*="send message"]'
      );
      if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute("aria-disabled") !== "true") {
        sendBtn.click();
        return { ok: true };
      }
      return { ok: false, error: "Nút gửi không khả dụng" };
    })()`);

    if (!sendResult?.ok) {
      throw new Error(sendResult?.error || "Không thể gửi yêu cầu vào khung chat Gemini Web");
    }

    // 5. Wait for response to finish generating
    const pollStart = Date.now();
    let completed = false;
    let responseText = "";
    let degradedToLite = false;

    while (Date.now() - pollStart < timeoutMs - 5000) {
      await new Promise((r) => setTimeout(r, 1500));

      const pollRes = await client.evaluate(`(() => {
        const stopBtn = document.querySelector(
          'button[aria-label*="Dừng"], button[aria-label*="Stop"], button.stop-button, [aria-label*="dừng tạo"]'
        );
        const isStreaming = !!stopBtn;

        const responses = document.querySelectorAll(
          'message-content, .model-response-text, .response-container-content, model-response, .markdown'
        );
        let latestText = "";
        if (responses.length > 0) {
          latestText = responses[responses.length - 1].innerText || "";
        }

        const bodyText = document.body.innerText || "";
        const isLite = bodyText.includes("Flash Lite") || 
                      (bodyText.includes("Lite") && (bodyText.includes("hạn mức") || bodyText.includes("limit"))) || 
                      bodyText.includes("switched to Flash") ||
                      bodyText.includes("chuyển sang bản") ||
                      bodyText.includes("quota exceeded");

        return { isStreaming, latestText, isLite };
      })()`);

      if (pollRes?.latestText && !pollRes.isStreaming) {
        completed = true;
        responseText = pollRes.latestText.trim();
        degradedToLite = Boolean(pollRes.isLite);
        break;
      }
    }

    if (!completed || !responseText) {
      throw new Error("Phản hồi từ Gemini Web bị quá thời gian chờ.");
    }

    // Short cooldown between turns
    await new Promise((r) => setTimeout(r, 1000));

    return {
      success: true,
      text: responseText,
      model: targetModel,
      degradedToLite,
    };
  } finally {
    if (client) client.close();
    if (releaseLock) releaseLock();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdinContent = await readStdin(Boolean(args.goal));
  const goal = args.goal || stdinContent;

  if (!goal) {
    console.error("Vui lòng cung cấp mục tiêu thông qua tham số --goal hoặc stdin.");
    process.exit(1);
  }

  const config = loadRoutingConfig();
  const targetModel = resolveTargetModel(config, args);
  const cdpUrl = config?.geminiGuide?.cdpUrl || "http://127.0.0.1:9222";

  const prompt = [
    "Bạn là chuyên gia tư vấn kỹ thuật. Hãy phân tích yêu cầu sau và lập bản kế hoạch thực thi chi tiết, rõ ràng và có cấu trúc:",
    `MỤC TIÊU: ${goal}`,
    args.context ? `BỐI CẢNH BỔ SUNG: ${args.context}` : "",
    `ĐỘ ƯU TIÊN MÔ HÌNH: ${targetModel}`,
    "",
    "YÊU CẦU ĐẦU RA (bắt buộc theo đúng 4 phần sau):",
    "1. Mục tiêu & Phạm vi (Scope & Goal)",
    "2. Kế hoạch thực thi tuần tự từng bước (Step-by-step Plan)",
    "3. Danh sách file & thư mục liên quan (Files & Paths)",
    "4. Tiêu chí kiểm tra & Lệnh xác minh (Verification & Smoke Tests)",
    "",
    "LƯU Ý: Chỉ lập kế hoạch hướng dẫn cho bộ phận thực thi. Không thực hiện lệnh sửa file.",
  ].filter(Boolean).join("\n");

  // Ensure bridge is active before attempting run
  const bridgeReady = await ensureBridgeRunning(cdpUrl);
  if (!bridgeReady) {
    const errorMsg = "Không thể kết nối với Gemini Web. Vui lòng mở Cài đặt trong DeskRPG và bấm 'Đăng nhập tài khoản Gemini'.";
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(errorMsg);
    }
    process.exit(1);
  }

  try {
    const result = await runViaCdp(cdpUrl, prompt, targetModel, args.timeout);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    }

    if (result.success) {
      if (result.degradedToLite) {
        console.warn("[LƯU Ý]: Phiên làm việc đã tự động hạ cấp xuống Lite do chạm giới hạn mô hình cao.");
      }
      console.log(result.text);
      process.exit(0);
    }

    console.error(result.error || "Không thể nhận phản hồi từ Gemini Web.");
    process.exit(1);
  } catch (err) {
    const errorMsg = err.message || "Lỗi giao tiếp với Gemini Web";
    if (args.json) {
      console.log(JSON.stringify({ success: false, error: errorMsg }, null, 2));
    } else {
      console.error(errorMsg);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Lỗi khởi chạy:", err.message || err);
  process.exit(1);
});
