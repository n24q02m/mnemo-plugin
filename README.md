# Mnemo Plugin

**Universal memory plugin for OpenCode and Claude Code -- powered by mnemo-mcp**

[![CI](https://github.com/n24q02m/mnemo-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/n24q02m/mnemo-plugin/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/github/n24q02m/mnemo-plugin?logo=codecov&logoColor=white)](https://codecov.io/gh/n24q02m/mnemo-plugin)
[![npm](https://img.shields.io/npm/v/@n24q02m/mnemo-plugin?logo=npm&logoColor=white)](https://www.npmjs.com/package/@n24q02m/mnemo-plugin)
[![License: MIT](https://img.shields.io/github/license/n24q02m/mnemo-plugin)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)](#)
[![MCP](https://img.shields.io/badge/MCP-000000?logo=anthropic&logoColor=white)](#)
[![semantic-release](https://img.shields.io/badge/semantic--release-e10079?logo=semantic-release&logoColor=white)](https://github.com/python-semantic-release/python-semantic-release)
[![Renovate](https://img.shields.io/badge/renovate-enabled-1A1F6C?logo=renovatebot&logoColor=white)](https://developer.mend.io/)

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

The MCP server provides three mega-tools. See [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp) for full documentation.

| Tool | Actions | Description |
|------|---------|-------------|
| `memory` | add, search, list, update, delete, export, import, stats | Persistent memory CRUD and management |
| `config` | status, sync, set | Server configuration and cloud sync |
| `help` | -- | Full documentation for all tools |

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
bun run dev

# Quality checks
bun run check        # biome + tsc
bun run test          # vitest
bun run build         # tsc + cli bundle

# Shortcuts
mise run lint
mise run test
mise run fix
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT - See [LICENSE](LICENSE)
