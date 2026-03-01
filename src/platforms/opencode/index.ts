/**
 * OpenCode Platform Adapter
 *
 * Plugin entrypoint that registers tools and hooks with the OpenCode runtime.
 * Connects to mnemo-mcp (Python MCP server) via stdio transport to provide
 * persistent memory capabilities across coding sessions.
 */

import type { Plugin } from '@opencode-ai/plugin'
import { MnemoBridge } from '../../bridge.js'
import { autoCaptureHook, messageHook } from '../../hooks/auto-capture.js'
import { compactionHook } from '../../hooks/compaction.js'
import { systemPromptHook } from '../../hooks/system-prompt.js'
import { mnemoForget, mnemoRemember, mnemoSearch } from '../../tools/memory.js'

const plugin: Plugin = async (input) => {
  const bridge = MnemoBridge.getInstance()

  // Start bridge connection in background (non-blocking).
  // If this fails, the circuit breaker in MnemoBridge will prevent repeated
  // connection attempts from hooks, avoiding log noise.
  setTimeout(async () => {
    try {
      await bridge.connect()
    } catch {
      // Silently handled -- circuit breaker will prevent further attempts.
      // Hooks check bridge.isAvailable() before calling, so no cascading errors.
    }
  }, 100)

  return {
    // Tools
    tool: {
      mnemo_search: mnemoSearch,
      mnemo_remember: mnemoRemember,
      mnemo_forget: mnemoForget
    },

    // Hooks
    'experimental.chat.system.transform': async (inParams, outParams) => {
      await systemPromptHook(inParams, outParams, input.directory)
    },

    'chat.message': async (inParams, outParams) => {
      await messageHook(inParams, outParams)
    },

    event: async (inParams) => {
      await autoCaptureHook(inParams, input.directory)
    },

    'experimental.session.compacting': async (inParams, outParams) => {
      await compactionHook(inParams, outParams)
    }
  }
}

export default plugin
