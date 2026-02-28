import { logger } from '../logger.js'
/**
 * Compaction Hook
 *
 * When OpenCode compacts the session context window, this hook injects
 * relevant memories into the compaction context so they survive the
 * summarization process. This prevents memory loss across long sessions.
 */

import { MnemoBridge } from '../bridge.js'

/** Memory item returned from mnemo-mcp search */
interface MemoryResult {
  content: string
  category: string
}

export const compactionHook = async (_input: { sessionID: string }, output: { context: string[]; prompt?: string }) => {
  try {
    const bridge = MnemoBridge.getInstance()

    // Skip if bridge is unavailable (circuit breaker open)
    if (!bridge.isAvailable()) return

    // Fetch recent/important memories to preserve during compaction
    const statsRes = await bridge.callTool('memory', {
      action: 'stats'
    })

    const totalMemories = statsRes?.total_memories ?? 0

    if (totalMemories > 0) {
      // Load top memories to include in compaction context
      const listRes = await bridge.callTool('memory', {
        action: 'list',
        limit: 10
      })

      if (listRes?.results?.length > 0) {
        const memories = (listRes.results as MemoryResult[]).map((m) => `- [${m.category}] ${m.content}`).join('\n')

        output.context.push(
          `[Mnemo Persistent Memory - Preserve These]\nThe following facts and preferences are stored in persistent memory and must be preserved:\n${memories}`
        )
      }
    }

    // Always add instruction to preserve preferences during summarization
    output.context.push(
      'When summarizing this session, explicitly preserve any user preferences, technical constraints, architectural decisions, or project rules that were discussed. These should be saved to persistent memory if not already stored.'
    )
  } catch (error) {
    logger.error(`[Mnemo] Error in compaction hook: ${error instanceof Error ? error.message : String(error)}`)
  }
}
