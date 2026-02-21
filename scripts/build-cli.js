/**
 * Build CLI proxy script for Claude Code compatibility
 *
 * Generates bin/cli.mjs that spawns `uvx mnemo-mcp` with stdio inherited,
 * allowing Claude Code to use this package as an MCP server:
 *   claude mcp add mnemo-plugin -- npx @n24q02m/mnemo-plugin
 */

import * as fs from 'node:fs'

if (!fs.existsSync('bin')) {
  fs.mkdirSync('bin')
}

const cliScript = `#!/usr/bin/env node
/**
 * MCP stdio proxy for Claude Code compatibility.
 * Spawns uvx mnemo-mcp and pipes stdio through.
 */
import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

const child = spawn('uvx', ['mnemo-mcp', ...process.argv.slice(2)], {
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
`

fs.writeFileSync('bin/cli.mjs', cliScript)
fs.chmodSync('bin/cli.mjs', 0o755)

console.log('Built bin/cli.mjs')
