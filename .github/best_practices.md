# Style Guide - mnemo-plugin

## Architecture
Universal memory plugin for OpenCode and Claude Code. TypeScript, single-package repo.

## TypeScript
- Formatter/Linter: Biome (2 spaces, double quotes, semicolons)
- Build: esbuild (bundle to single file)
- Test: Vitest
- Runtime: Node.js (ES modules)
- SDK: @opencode-ai/plugin, @opencode-ai/sdk

## Code Patterns
- Bridge pattern for communicating with mnemo-mcp server
- Auto-capture hooks for session context
- Memory tools: search, remember, forget
- Session buffer management with size limits to prevent memory leaks
- Error logging to file (not stdout/stderr, to avoid interfering with host)

## Commits
Conventional Commits (feat:, fix:, chore:, docs:, refactor:, test:).

## Security
Never propagate sensitive environment variables to child processes. Sanitize memory content before storage. Prevent prompt injection via memory.
