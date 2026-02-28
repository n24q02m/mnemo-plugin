# AGENTS.md - mnemo-plugin

Universal Memory Plugin for OpenCode & Claude Code. TypeScript, Node.js >= 24, bun, ESM.
Bridges to mnemo-mcp (Python MCP server) via @modelcontextprotocol/sdk stdio transport.

## Build / Lint / Test Commands

```bash
bun install                 # Install dependencies
bun run build               # tsc --build && esbuild CLI bundle
bun run check               # Biome check + tsc --noEmit (CI command)
bun run check:fix           # Auto-fix Biome + type check
bun run test                # vitest --passWithNoTests
bun run test:watch          # vitest watch
bun run test:coverage       # vitest --coverage
bun run lint                # biome lint src
bun run format              # biome format --write .
bun run type-check          # tsc --noEmit
bun run dev                 # tsx watch dev server

# Run a single test file
bun run vitest run tests/bridge.test.ts

# Run a single test by name
bun run vitest run -t "test name pattern"

# Mise shortcuts
mise run setup              # Full dev environment setup
mise run lint               # bun run check
mise run test               # bun run test
mise run fix                # bun run check:fix
```

## Architecture

Full memory support requires BOTH the plugin and MCP server running together:

| Component | Role | What it provides |
|-----------|------|------------------|
| **Plugin** (this package) | Proactive | Hooks: system-prompt injection, auto-capture, compaction |
| **MCP Server** (mnemo-mcp) | Reactive | Tools: memory, config, help -- AI calls when needed |

```
AI Coding Assistant
  |
  +-- mnemo-plugin (TypeScript) ........... hooks (proactive)
  |     |
  |     +-- MnemoBridge -> uvx mnemo-mcp subprocess (for hook operations)
  |
  +-- mnemo-mcp (Python, standalone) ..... tools (reactive, with env config)
        |-- SQLite FTS5 (keyword search)
        |-- Qwen3 embeddings (semantic search)
        |-- rclone sync (backup)
```

### OpenCode Setup

Both plugin AND MCP server in `opencode.json`:

```json
{
  "plugin": ["@n24q02m/mnemo-plugin@latest"],
  "mcp": {
    "mnemo": {
      "type": "local",
      "command": ["uvx", "--python", "3.13", "mnemo-mcp@latest"],
      "environment": { "LOG_LEVEL": "WARNING" },
      "enabled": true
    }
  }
}
```

### Claude Code Setup

Plugin bundles both MCP server and hooks:

```
/plugin marketplace add n24q02m/mnemo-plugin
/plugin install mnemo-plugin@n24q02m
```

Key files for Claude Code integration:
- `.claude-plugin/marketplace.json` -- marketplace catalog (source: "./")
- `.claude-plugin/plugin.json` -- plugin metadata
- `.mcp.json` -- auto-registers MCP server using `uvx mnemo-mcp` with `LOG_LEVEL=WARNING`
- `hooks/hooks.json` -- SessionStart hook runs `uvx mnemo-mcp --version` health check

## Code Style

### Formatting (Biome)

- **Indent**: 2 spaces
- **Line width**: 120
- **Quotes**: Single quotes
- **Semicolons**: As needed (omit when possible)
- **Trailing commas**: None
- **Arrow parens**: Always
- **Bracket spacing**: true
- **Line endings**: LF

### Imports

1. Type imports use `import type` (separate statement)
2. External packages first, then internal imports (relative paths)
3. Node builtins with `node:` prefix (`node:fs`, `node:path`, `node:url`)
4. **Always use `.js` extension** in import paths (ESM requirement)

```typescript
import type { Plugin } from '@opencode-ai/plugin'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { MnemoBridge } from './bridge.js'
```

### TypeScript

- `strict: true`, target: es2021, module: es2022, moduleResolution: Bundler
- `composite: true` for incremental builds
- `isolatedModules: true`, `forceConsistentCasingInFileNames: true`

### Naming Conventions

| Element              | Convention       | Example                            |
|----------------------|------------------|------------------------------------|
| Functions/variables  | camelCase        | `systemPromptHook`, `callTool`     |
| Interfaces           | PascalCase       | `MemoryResult`, `BridgeOptions`    |
| Classes              | PascalCase       | `MnemoBridge`                      |
| Constants            | UPPER_SNAKE_CASE | `IDLE_THRESHOLD`, `MAX_BUDGET`     |
| Files (modules)      | kebab-case       | `system-prompt.ts`, `auto-capture.ts` |
| Test files           | Adjacent in tests/ | `tests/bridge.test.ts`          |

### Error Handling

- All tool execute functions catch errors and return user-friendly strings (never throw)
- Bridge errors are caught at hook level with `logger.error` logging (written to `~/.mnemo-mcp/plugin.log`)
- Use `unknown` type for catch variables, narrow with `instanceof Error`

### Biome Lint Rules

- `noExplicitAny`: **off** (MCP responses are dynamic JSON)
- `noNonNullAssertion`: **off**
- `noUnusedVariables`: warn
- `noUnusedImports`: error (via organizeImports)

### File Organization

```
src/
  index.ts              # Plugin entrypoint, registers tools + hooks
  bridge.ts             # Singleton MCP client bridge to mnemo-mcp
  tools/
    memory.ts           # Tool definitions: mnemo_search, mnemo_remember, mnemo_forget
  hooks/
    system-prompt.ts    # Injects memories into system prompt (adaptive budget)
    auto-capture.ts     # Buffers chat messages, extracts constraints on idle
    compaction.ts       # Preserves memory context during session compaction
tests/
  bridge.test.ts        # Integration tests (requires uvx mnemo-mcp)
scripts/
  build-cli.js          # Generates bin/cli.mjs (Claude Code MCP proxy)
  clean-venv.mjs        # Cross-platform Python venv setup
  enforce-commit.sh     # Commit message enforcement (feat/fix only)
```

### Documentation

- `/** */` JSDoc on every exported function/class
- File-level comment describing module purpose
- No `@param`/`@returns` -- rely on TypeScript types

### Commits

Conventional Commits: `type(scope): message`. Only `feat` and `fix` allowed (enforced by hook).

### Pre-commit Hooks

1. `biome check --write` (lint + format)
2. `tsc --noEmit` (type check)
3. `bun run test` (run tests)
