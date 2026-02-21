# AGENTS.md - mnemo-plugin

Universal Memory Plugin for OpenCode & Claude Code. TypeScript, Node.js >= 24, pnpm, ESM.
Bridges to mnemo-mcp (Python MCP server) via @modelcontextprotocol/sdk stdio transport.

## Build / Lint / Test Commands

```bash
pnpm install                # Install dependencies
pnpm build                  # tsc --build && esbuild CLI bundle
pnpm check                  # Biome check + tsc --noEmit (CI command)
pnpm check:fix              # Auto-fix Biome + type check
pnpm test                   # vitest --passWithNoTests
pnpm test:watch             # vitest watch
pnpm test:coverage          # vitest --coverage
pnpm lint                   # biome lint src
pnpm format                 # biome format --write .
pnpm type-check             # tsc --noEmit
pnpm dev                    # tsx watch dev server

# Run a single test file
pnpm vitest run tests/bridge.test.ts

# Run a single test by name
pnpm vitest run -t "test name pattern"

# Mise shortcuts
mise run setup              # Full dev environment setup
mise run lint               # pnpm check
mise run test               # pnpm test
mise run fix                # pnpm check:fix
```

## Architecture

This plugin is an MCP **client** that spawns `uvx mnemo-mcp` as a subprocess and communicates
via JSON-RPC 2.0 over stdio. The plugin delegates all heavy work (SQLite FTS5, Qwen3 vector
search, rclone sync) to the Python mnemo-mcp server.

```
OpenCode Runtime (Bun)
  |
  +-- mnemo-plugin (this package)
  |     |-- tools: mnemo_search, mnemo_remember, mnemo_forget
  |     |-- hooks: system-prompt, auto-capture, compaction
  |     |
  |     +-- MnemoBridge (MCP Client via StdioClientTransport)
  |           |
  |           +-- uvx mnemo-mcp (Python subprocess)
  |                 |-- SQLite FTS5 (keyword search)
  |                 |-- Qwen3 embeddings (semantic search)
  |                 |-- rclone sync (backup)
```

### Claude Code Compatibility

The `bin/cli.mjs` script acts as a stdio proxy to `uvx mnemo-mcp`, allowing Claude Code
to use this as an MCP server: `claude mcp add mnemo-plugin -- npx @n24q02m/mnemo-plugin`

## Code Style

### Formatting (Biome)

- **Indent**: 2 spaces
- **Line width**: 120
- **Quotes**: Single quotes
- **Semicolons**: As needed (omit when possible)
- **Trailing commas**: All
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

- `strict: true`, target: ES2023, module: NodeNext, moduleResolution: NodeNext
- `verbatimModuleSyntax: true` (enforces `import type`)
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
- Bridge errors are caught at hook level with console.error logging
- Use `unknown` type for catch variables, narrow with `instanceof Error`

### Biome Lint Rules

- `noExplicitAny`: **warn** (use `unknown` where possible, `// biome-ignore` for necessary `any`)
- `noNonNullAssertion`: **warn**
- `noUnusedVariables`: warn
- `noUnusedImports`: error

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
3. `pnpm test` (run tests)
