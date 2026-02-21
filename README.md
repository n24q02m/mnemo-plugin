# Mnemo Plugin

[![CI](https://github.com/n24q02m/mnemo-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/n24q02m/mnemo-plugin/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@n24q02m/mnemo-plugin)](https://www.npmjs.com/package/@n24q02m/mnemo-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Universal Memory Plugin for [OpenCode](https://opencode.ai) & [Claude Code](https://docs.anthropic.com/en/docs/claude-code) -- Powered by [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp).

Gives your AI coding assistant **persistent memory** across sessions. Facts, preferences, architectural decisions, and project rules are stored permanently and automatically loaded into context.

## Features

- **Persistent Memory** -- Facts survive across sessions, restarts, and context compaction
- **Automatic Capture** -- Detects user preferences and constraints from chat (always/never/must/prefer patterns)
- **Adaptive Context Injection** -- Smart budget system scales memory injection to model context window
- **Project-Scoped** -- Memories auto-tagged with project name for relevant recall
- **Dual Platform** -- Works with both OpenCode (plugin) and Claude Code (MCP server)

## Architecture

This plugin is a thin TypeScript bridge that delegates all heavy lifting to [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp) (Python MCP server):

```
OpenCode / Claude Code
  |
  +-- mnemo-plugin (TypeScript, this package)
        |
        +-- mnemo-mcp (Python, via uvx)
              |-- SQLite FTS5 (keyword search)
              |-- Qwen3 embeddings (semantic search)
              |-- rclone sync (backup)
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [uv](https://docs.astral.sh/uv/) (for running mnemo-mcp via `uvx`)

## Installation

### OpenCode

Add to your `opencode.json`:

```json
{
  "plugin": ["@n24q02m/mnemo-plugin"]
}
```

### Claude Code

Install the plugin globally:

```bash
npm install -g @n24q02m/mnemo-plugin
```

Then add to your project's `.claude/plugins.json` or install via Claude Code UI.

## Tools

| Tool | Description |
|------|-------------|
| `mnemo_search` | Search stored memories by query, with optional category filter |
| `mnemo_remember` | Store a new persistent memory (fact, preference, decision) |
| `mnemo_forget` | Delete an outdated or incorrect memory by ID |

## Hooks (OpenCode only)

| Hook | Description |
|------|-------------|
| `system-prompt` | Injects relevant memories into system prompt with adaptive budget |
| `auto-capture` | Buffers chat messages and extracts constraints on session idle |
| `compaction` | Preserves memory context during session compaction |

## Development

```bash
# Setup
mise run setup

# Development
pnpm dev

# Quality checks
pnpm check        # biome + tsc
pnpm test          # vitest
pnpm build         # tsc + cli bundle

# Shortcuts
mise run lint
mise run test
mise run fix
```

## License

MIT
