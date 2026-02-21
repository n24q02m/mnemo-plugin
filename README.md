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
- **Dual Platform** -- Works with both OpenCode and Claude Code

## Architecture

Full memory support requires **both** the plugin and the MCP server working together:

| Component | Role | Behavior |
|-----------|------|----------|
| **Plugin** (this package) | Proactive | Hooks: inject memories into system prompt, auto-capture constraints, preserve context on compaction |
| **MCP Server** ([mnemo-mcp](https://github.com/n24q02m/mnemo-mcp)) | Reactive | Tools: AI calls search/remember/forget when it decides to |

```
AI Coding Assistant
  |
  +-- mnemo-plugin (TypeScript) ........... hooks (proactive)
  |     |
  |     +-- bridge -> mnemo-mcp subprocess
  |
  +-- mnemo-mcp (Python, standalone) ..... tools (reactive)
        |-- SQLite FTS5 (keyword search)
        |-- Qwen3 embeddings (semantic search)
        |-- rclone sync (backup)
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [uv](https://docs.astral.sh/uv/) (for running mnemo-mcp via `uvx`)

## Installation

Both plugin **and** MCP server are required for full functionality.

### OpenCode

Add **both** to your `opencode.json`:

```json
{
  "plugin": ["@n24q02m/mnemo-plugin@latest"],
  "mcp": {
    "mnemo": {
      "type": "local",
      "command": ["uvx", "--python", "3.13", "mnemo-mcp@latest"],
      "environment": {
        "LOG_LEVEL": "WARNING"
      },
      "enabled": true
    }
  }
}
```

- **Plugin** provides hooks (system-prompt injection, auto-capture, compaction)
- **MCP server** provides tools (mnemo_memory_add, search, delete, etc.)

Restart OpenCode after configuration.

### Claude Code

The plugin bundles both MCP server and hooks in one install:

```
/plugin marketplace add n24q02m/mnemo-plugin
/plugin install mnemo-plugin@n24q02m
```

Restart Claude Code. The plugin automatically registers:
- MCP server (`uvx mnemo-mcp`) for memory tools
- SessionStart hook for health check

## Tools (via MCP server)

| Tool | Description |
|------|-------------|
| `mnemo_search` / `memory_search` | Search stored memories by query, with optional category filter |
| `mnemo_remember` / `memory_add` | Store a new persistent memory (fact, preference, decision) |
| `mnemo_forget` / `memory_delete` | Delete an outdated or incorrect memory by ID |

## Hooks (via plugin)

| Hook | Trigger | Description |
|------|---------|-------------|
| `system-prompt` | Session start | Injects relevant memories into system prompt with adaptive budget |
| `auto-capture` | Session idle | Buffers chat messages and extracts constraints automatically |
| `compaction` | Context compaction | Preserves memory context during session compaction |

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
