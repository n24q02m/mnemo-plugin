/**
 * Build CLI script for Claude Code compatibility
 *
 * Generates bin/cli.mjs that supports two modes:
 * 1. Default (no args): MCP stdio proxy to uvx mnemo-mcp
 *    Usage: claude mcp add mnemo-plugin -- npx @n24q02m/mnemo-plugin
 * 2. Hook subcommand: Execute Claude Code lifecycle hooks
 *    Usage: npx @n24q02m/mnemo-plugin hook session-start
 */

import * as fs from 'node:fs'

if (!fs.existsSync('bin')) {
  fs.mkdirSync('bin')
}

const cliScript = `#!/usr/bin/env node
/**
 * mnemo-plugin CLI
 *
 * Modes:
 * - No args: MCP stdio proxy (spawns uvx mnemo-mcp)
 * - hook <action>: Execute Claude Code lifecycle hooks
 */
import { spawn, execSync } from 'node:child_process';

const args = process.argv.slice(2);
const isWindows = process.platform === 'win32';

// Hook subcommand
if (args[0] === 'hook') {
  const action = args[1];
  let input = '';

  // Read hook payload from stdin (non-blocking)
  if (!process.stdin.isTTY) {
    try {
      input = require('node:fs').readFileSync(0, 'utf8');
    } catch {
      // No stdin input
    }
  }

  const payload = input ? JSON.parse(input) : {};

  switch (action) {
    case 'session-start':
      // Health check: verify mnemo-mcp is accessible
      try {
        execSync('uvx mnemo-mcp --version', { stdio: 'pipe', timeout: 5000, shell: isWindows });
        process.exit(0);
      } catch {
        console.error('[mnemo] Warning: mnemo-mcp not available. Install with: uv tool install mnemo-mcp');
        process.exit(1); // Non-blocking warning
      }
      break;

    case 'stop':
      // No-op for now: Claude handles memory via MCP tools during session
      process.exit(0);
      break;

    case 'pre-compact':
      // No-op for now: memories are already persisted in mnemo-mcp
      process.exit(0);
      break;

    default:
      console.error('[mnemo] Unknown hook action:', action);
      console.error('Available: session-start, stop, pre-compact');
      process.exit(2);
  }
} else {
  // Default mode: MCP stdio proxy
  const child = spawn('uvx', ['mnemo-mcp', ...args], {
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('error', (err) => {
    console.error('Failed to start mnemo-mcp:', err.message);
    console.error('Make sure uv is installed: https://docs.astral.sh/uv/');
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
`

fs.writeFileSync('bin/cli.mjs', cliScript)
fs.chmodSync('bin/cli.mjs', 0o755)

console.log('Built bin/cli.mjs')
