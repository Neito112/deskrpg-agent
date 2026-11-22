#!/usr/bin/env node
/**
 * Blender MCP Client & CLI Bridge
 * Supports both live MCP interaction (http://127.0.0.1:9876/mcp) and headless Blender execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const BLENDER_MCP_URL = process.env.BLENDER_MCP_URL || 'http://127.0.0.1:9876/mcp';
const BLENDER_EXE = process.env.BLENDER_BIN || 'C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe';

async function sendMcpRequest(method, params = {}) {
  const reqBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  try {
    const res = await fetch(BLENDER_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`MCP Error [${data.error.code}]: ${data.error.message}`);
    }
    return data.result;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function isMcpAlive() {
  try {
    const res = await fetch(BLENDER_MCP_URL, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return data?.service === 'mcp-for-blender-pro';
    }
  } catch {}
  return false;
}

async function runHeadlessPython(scriptPath, extraArgs = []) {
  if (!fs.existsSync(BLENDER_EXE)) {
    throw new Error(`Blender executable not found at: ${BLENDER_EXE}`);
  }

  const args = ['--background', '--python', scriptPath, ...extraArgs];
  const proc = spawnSync(BLENDER_EXE, args, {
    encoding: 'utf-8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  if (command === 'status' || command === 'ping') {
    const alive = await isMcpAlive();
    console.log(JSON.stringify({
      mcpRunning: alive,
      url: BLENDER_MCP_URL,
      blenderExe: fs.existsSync(BLENDER_EXE) ? BLENDER_EXE : null,
    }, null, 2));
    return;
  }

  if (command === 'list-tools') {
    const result = await sendMcpRequest('tools/list');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'call') {
    const toolName = args[1];
    let toolArgs = {};
    if (args[2]) {
      try {
        toolArgs = JSON.parse(args[2]);
      } catch (e) {
        console.error('Invalid JSON for tool arguments:', e.message);
        process.exit(1);
      }
    }
    const result = await sendMcpRequest('tools/call', {
      name: toolName,
      arguments: toolArgs,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'exec') {
    const code = args.slice(1).join(' ');
    const alive = await isMcpAlive();
    if (alive) {
      const result = await sendMcpRequest('tools/call', {
        name: 'execute_code',
        arguments: { code },
      });
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('MCP server not running. Executing via headless Blender CLI...');
      const tmpFile = path.join(process.cwd(), `tmp_blender_${Date.now()}.py`);
      fs.writeFileSync(tmpFile, code, 'utf-8');
      try {
        const out = await runHeadlessPython(tmpFile);
        console.log(out.stdout || out.stderr);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    }
    return;
  }

  if (command === 'exec-file') {
    const filePath = path.resolve(args[1]);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    const alive = await isMcpAlive();
    if (alive) {
      const code = fs.readFileSync(filePath, 'utf-8');
      const result = await sendMcpRequest('tools/call', {
        name: 'execute_code',
        arguments: { code },
      });
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('MCP server not running. Executing via headless Blender CLI...');
      const out = await runHeadlessPython(filePath);
      console.log(out.stdout || out.stderr);
    }
    return;
  }

  console.log(`Usage:
  node blender-mcp-client.mjs status
  node blender-mcp-client.mjs list-tools
  node blender-mcp-client.mjs call <toolName> '[jsonArgs]'
  node blender-mcp-client.mjs exec "<python_code>"
  node blender-mcp-client.mjs exec-file <path_to_script.py>
`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
