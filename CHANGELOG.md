# CHANGELOG

<!-- version list -->

## v1.4.1 (2026-03-01)

### Bug Fixes

- Format codebase via biome check
  ([`f3fb34e`](https://github.com/n24q02m/mnemo-plugin/commit/f3fb34e535c3b17edccf2bb84d90bde1411de219))

- Update dependencies to fix security alerts
  ([`a6295b3`](https://github.com/n24q02m/mnemo-plugin/commit/a6295b38b3935789aeaef738585a69136a81df07))

- **auto-capture**: Prevent unbounded memory growth in message buffer (#34)
  ([#34](https://github.com/n24q02m/mnemo-plugin/pull/34),
  [`2c01c10`](https://github.com/n24q02m/mnemo-plugin/commit/2c01c109866f5b00756b661eb5fbdc80cc497c17))


## v1.4.0 (2026-03-01)

### Bug Fixes

- **windows**: Replace bunx with bun x for cross-platform compatibility
  ([`52e5609`](https://github.com/n24q02m/mnemo-plugin/commit/52e560934bad97436e804a1da7bbb5c149a68edb))

### Features

- **core**: Extract memory-service, add platform adapters, add CLAUDE.md init subcommand
  ([`f1e5c88`](https://github.com/n24q02m/mnemo-plugin/commit/f1e5c88a0f6d8c2943e0726d800ab1a0f4de6873))


## v1.3.0 (2026-02-28)

### Bug Fixes

- Align enforce-commit.sh with standard script
  ([`e7c583b`](https://github.com/n24q02m/mnemo-plugin/commit/e7c583b61db54b6fbd8438df8c009a9f0648173f))

- Biome formatting in test files
  ([`4ec8b6b`](https://github.com/n24q02m/mnemo-plugin/commit/4ec8b6bf6aa59a15eb69ae30204cd7a9a7d7a5cf))

- Format renovate.json for Biome compatibility
  ([`fe492bd`](https://github.com/n24q02m/mnemo-plugin/commit/fe492bdc7686f3db458e8aeb320d77a316527bd0))

- Standardize enforce-commit hook naming
  ([`70e8e60`](https://github.com/n24q02m/mnemo-plugin/commit/70e8e601918ccb83d9202b0a5a4f9c1e20dbf7a9))

- Update README badges with Codecov, tech stack, and engineering standards
  ([`b94952f`](https://github.com/n24q02m/mnemo-plugin/commit/b94952fe36f7226620798c77677bf5ce662c0c9d))

- **ci**: Fix Qodo Merge env variable dot notation bug
  ([`a74aa8e`](https://github.com/n24q02m/mnemo-plugin/commit/a74aa8e01f41000f2d28051f19d24b0a5902f581))

- **ci**: Fix Qodo model to gemini-3-flash-preview
  ([`ccc7d40`](https://github.com/n24q02m/mnemo-plugin/commit/ccc7d406aefb788024ff45e083b80570b70d11a0))

- **ci**: Fix syntax errors and correctly configure Qodo + Gemini 3 Flash
  ([`d933de8`](https://github.com/n24q02m/mnemo-plugin/commit/d933de840a71425cf61b8df0279e491f19805139))

- **ci**: Move pr-agent config to .pr_agent.toml
  ([`3f92974`](https://github.com/n24q02m/mnemo-plugin/commit/3f92974df93b01356ab0dfba9221efbe0e2a8c0e))

- **ci**: Update to supported Gemini 3 and 2.5 flash models
  ([`def8ecb`](https://github.com/n24q02m/mnemo-plugin/commit/def8ecb8028b84ab3cad2b9810411abbcf1d12e5))

- **deps**: Update @modelcontextprotocol/sdk to 1.27.1
  ([`5cf9af2`](https://github.com/n24q02m/mnemo-plugin/commit/5cf9af20a11cdc4f9f10b175802f3b1f7278338e))

### Features

- Add Codecov coverage upload and CodeRabbit config
  ([`3d3b264`](https://github.com/n24q02m/mnemo-plugin/commit/3d3b264904f6cb1d6572c88157ef10afc6f512e9))

- Migrate to 2025-2026 tech stack (bun/biome)
  ([`f336ffd`](https://github.com/n24q02m/mnemo-plugin/commit/f336ffd6427b77effe1721afc6853acc2bccd3c6))

- **ci**: Add Renovate config for automated dependency updates
  ([`4e1ffe5`](https://github.com/n24q02m/mnemo-plugin/commit/4e1ffe57c1ea65095f6b48e19f54da758f975e5b))

- **ci**: Add StepSecurity Harden-Runner to all workflow jobs (audit mode)
  ([`b476103`](https://github.com/n24q02m/mnemo-plugin/commit/b47610331bc081766c68c36f6d75f4d45eb7336a))

- **ci**: Migrate to Qodo Merge AI Review (Gemini 3 Flash)
  ([`48cc95a`](https://github.com/n24q02m/mnemo-plugin/commit/48cc95a36fcf0e5032aaa5bb46a5637238308970))


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
