#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function stripAnsi(text) {
  return (text || "").replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");
}

function parseArgs(args) {
  const result = {
    plan: "",
    cwd: process.cwd(),
    model: "",
    timeout: 120000,
    mode: "auto",
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--plan" || arg === "--task") && i + 1 < args.length) {
      result.plan = args[++i];
    } else if (arg === "--cwd" && i + 1 < args.length) {
      result.cwd = path.resolve(args[++i]);
    } else if (arg === "--model" && i + 1 < args.length) {
      result.model = args[++i];
    } else if (arg === "--mode" && i + 1 < args.length) {
      result.mode = args[++i];
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
    // fallback
  }
  return {
    agyExecutor: {
      mode: "auto",
      manualModel: "gemini-3.8-flash-high",
    },
  };
}

function resolveAgyCommand() {
  const isWindows = process.platform === "win32";

  if (isWindows && process.env.LOCALAPPDATA) {
    const defaultAgy = path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.EXE");
    if (fs.existsSync(defaultAgy)) {
      return defaultAgy;
    }
  }

  const probe = spawnSync(isWindows ? "where.exe" : "which", ["agy"], {
    encoding: "utf8",
    shell: false,
  });

  if (probe.status === 0 && probe.stdout) {
    const lines = probe.stdout.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines[0];
    }
  }

  return isWindows ? "agy.EXE" : "agy";
}

function extractResponseText(rawOutput) {
  const clean = stripAnsi(rawOutput).trim();
  if (!clean) return "";

  try {
    const parsed = JSON.parse(clean);
    if (typeof parsed === "string") return parsed;
    if (parsed.response && typeof parsed.response === "string") return parsed.response;
    if (parsed.content && typeof parsed.content === "string") return parsed.content;
    if (parsed.text && typeof parsed.text === "string") return parsed.text;
    if (Array.isArray(parsed.messages)) {
      const lastMsg = parsed.messages[parsed.messages.length - 1];
      if (lastMsg?.content) return typeof lastMsg.content === "string" ? lastMsg.content : JSON.stringify(lastMsg.content);
    }
  } catch {
    // Not valid JSON, return raw text
  }

  return clean;
}

function isQuotaExhausted(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests") ||
    lower.includes("insufficient quota") ||
    lower.includes("hit your limit") ||
    lower.includes("out of quota") ||
    lower.includes("usage limit reached") ||
    lower.includes("capacity exceeded") ||
    lower.includes("429")
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stdinContent = await readStdin(Boolean(args.plan));
  const plan = args.plan || stdinContent;

  if (!plan) {
    console.error("Vui lòng cung cấp nội dung kế hoạch thông qua tham số --plan hoặc stdin.");
    process.exit(1);
  }

  const config = loadRoutingConfig();
  const executorCfg = config?.agyExecutor || {};

  // If manual, strictly enforce manualModel from config; if auto, use model specified by Hermes/args
  let effectiveModel = "gemini-3.8-flash-high";
  if (executorCfg.mode === "manual" && executorCfg.manualModel) {
    effectiveModel = executorCfg.manualModel;
  } else if (args.model) {
    effectiveModel = args.model;
  }

  const prompt = [
    "Bạn là nhân viên thực thi kỹ thuật. Hãy thực hiện chính xác theo bản hướng dẫn sau:",
    plan,
    "",
    "YÊU CẦU:",
    "- Thao tác trực tiếp các bước cần thiết trong thư mục làm việc.",
    "- Sau khi hoàn thành, kiểm tra lại kết quả và tóm tắt ngắn gọn những việc đã làm cùng kết quả đạt được.",
  ].join("\n");

  const agyCmd = resolveAgyCommand();
  const timeoutSeconds = Math.max(10, Math.floor(args.timeout / 1000));
  const cliArgs = [
    "-p", prompt,
    "--output-format", "json",
    "--add-dir", args.cwd,
    "--mode", args.mode,
    "--print-timeout", `${timeoutSeconds}s`,
    "--model", effectiveModel,
  ];

  const child = spawn(agyCmd, cliArgs, {
    cwd: args.cwd,
    shell: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stdin.end();

  let stdout = "";
  let stderr = "";
  let isTimedOut = false;

  const timer = setTimeout(() => {
    isTimedOut = true;
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
  }, args.timeout);

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  child.on("close", (code) => {
    clearTimeout(timer);

    if (isTimedOut) {
      if (args.json) {
        console.log(JSON.stringify({ success: false, error: "TIMEOUT", timeout: args.timeout }));
      } else {
        console.error(`Quá trình thực thi vượt quá thời gian cho phép (${args.timeout}ms).`);
      }
      process.exit(124);
    }

    const fullOutput = `${stdout}\n${stderr}`;
    if (isQuotaExhausted(fullOutput)) {
      const quotaPayload = {
        quotaExhausted: true,
        model: effectiveModel,
        message: `Mô hình ${effectiveModel} đã chạm trần hạn mức sử dụng.`,
      };
      if (args.json) {
        console.log(JSON.stringify(quotaPayload, null, 2));
      } else {
        console.error(`[QUOTA_EXHAUSTED]: ${quotaPayload.message} Vui lòng chuyển model trong Cài Đặt.`);
      }
      process.exit(2);
    }

    const textOutput = extractResponseText(stdout);
    if (textOutput) {
      if (args.json) {
        console.log(JSON.stringify({ success: true, text: textOutput, model: effectiveModel }, null, 2));
      } else {
        console.log(textOutput);
      }
      process.exit(0);
    }

    const cleanErr = stripAnsi(stderr).trim();
    if (code !== 0) {
      if (cleanErr.includes("Cannot find") || cleanErr.includes("not found") || cleanErr.includes("ENOENT")) {
        console.error("Antigravity CLI (agy) chưa sẵn sàng trên hệ thống.");
      } else {
        console.error(cleanErr || `Thực thi gặp lỗi (mã thoát: ${code}).`);
      }
      process.exit(code || 1);
    }

    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Lỗi khởi chạy:", err.message || err);
  process.exit(1);
});
