# CHANGELOG

<!-- version list -->

## v1.2.3 (2026-02-24)

### Bug Fixes

- Redirect all plugin logs to file to prevent TUI corruption
  ([`f0f01f0`](https://github.com/n24q02m/mnemo-plugin/commit/f0f01f0657ffcc0b40a34d9c202795ed340b2025))


## v1.2.2 (2026-02-23)

### Bug Fixes

- Remove startup log message from TUI output
  ([`5718a5b`](https://github.com/n24q02m/mnemo-plugin/commit/5718a5b1abc05faa338b172272fb3e73ba6365fb))


## v1.2.1 (2026-02-23)

### Bug Fixes

- Pin Python 3.13 in Claude Code MCP config
  ([`fe45084`](https://github.com/n24q02m/mnemo-plugin/commit/fe4508418d83794d03e9f232bef634a14a117020))


## v1.2.0 (2026-02-23)

### Bug Fixes

- Correct MCP tool names in docs (memory/config/help mega-tools)
  ([`d44c092`](https://github.com/n24q02m/mnemo-plugin/commit/d44c092197d7cc38c8347009cd8b73ad9fc645e1))

- Resolve biome lint errors in test files
  ([`de10b28`](https://github.com/n24q02m/mnemo-plugin/commit/de10b287411670a319b567f1fac0704e1289805b))

- Skip integration tests in CI unless INTEGRATION_TEST env is set
  ([`504b136`](https://github.com/n24q02m/mnemo-plugin/commit/504b136bc65f62698181710e2ae5fd983da41d58))

### Features

- Add circuit breaker, timeouts, and isAvailable guard to MCP bridge
  ([`935fc0d`](https://github.com/n24q02m/mnemo-plugin/commit/935fc0d527b051d3d5595e90ee6a7b43907fa7f5))


## v1.1.0 (2026-02-21)

### Bug Fixes

- Correct marketplace.json schema for Claude Code plugin system
  ([`dc2f308`](https://github.com/n24q02m/mnemo-plugin/commit/dc2f3082f9f515354dc1c8f4eb8f25e79618d5b0))

- Use uvx mnemo-mcp directly in Claude Code plugin instead of build artifact
  ([`3f081e9`](https://github.com/n24q02m/mnemo-plugin/commit/3f081e9135d057ed9b84bf729341506b400b175f))

### Features

- Rewrite docs with dual architecture (plugin + MCP)
  ([`1bdfa38`](https://github.com/n24q02m/mnemo-plugin/commit/1bdfa387cce86ffbf19704c32cbcad5f55ebfa22))


## v1.0.1 (2026-02-21)

### Bug Fixes

- Use plugin marketplace for Claude Code and suppress mnemo-mcp stderr
  ([`9fbb6f3`](https://github.com/n24q02m/mnemo-plugin/commit/9fbb6f3101f44a6c61e8de446de2b52b390835f0))


## v1.0.0 (2026-02-21)

- Initial Release
