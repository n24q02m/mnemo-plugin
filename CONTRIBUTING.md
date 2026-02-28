# Contributing to Mnemo Plugin

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [Bun](https://bun.sh/) 1.2+
- [uv](https://docs.astral.sh/uv/) (for mnemo-mcp backend)
- [mise](https://mise.jdx.dev/) (recommended)

## Setup

```bash
git clone https://github.com/n24q02m/mnemo-plugin.git
cd mnemo-plugin
mise run setup    # or: bun install
```

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and test:
   ```bash
   bun run test          # Run tests
   bun run check         # Lint + type check
   bun run dev           # Dev server with watch
   ```

3. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add new memory hook
   fix: correct bridge reconnection logic
   ```
   Note: Only `feat` and `fix` prefixes are allowed (enforced by commit-msg hook).

4. Push and open a Pull Request against `main`

## Project Structure

```
src/
  index.ts              # Plugin entrypoint, registers tools + hooks
  bridge.ts             # Singleton MCP client bridge to mnemo-mcp
  tools/
    memory.ts           # Tool definitions: mnemo_search, mnemo_remember, mnemo_forget
  hooks/
    system-prompt.ts    # Injects memories into system prompt
    auto-capture.ts     # Buffers chat messages, extracts constraints
    compaction.ts       # Preserves memory context during compaction
tests/
  bridge.test.ts        # Integration tests
scripts/
  build-cli.js          # CLI bundle for Claude Code proxy
  enforce-commit.sh     # Commit prefix enforcement
```

## Code Style

- **Formatter**: [Biome](https://biomejs.dev/) (2-space indent, single quotes, no semicolons)
- **Linting**: Biome rules + TypeScript strict mode
- **Line width**: 120 characters
- **Test framework**: [Vitest](https://vitest.dev/)

## Testing

- Write tests for all new functionality
- Place tests in `tests/` directory
- Use `*.test.ts` naming convention

```bash
bun run test             # Run all tests
bun run test:watch       # Watch mode
```

## Pull Request Guidelines

- Fill out the PR template completely
- Ensure all CI checks pass
- Keep PRs focused on a single concern
- Update documentation if behavior changes
- Add tests for new functionality

## Release Process

Releases are automated via [python-semantic-release](https://python-semantic-release.readthedocs.io/)
and triggered through the CD workflow. Version bumps are determined by commit messages.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
