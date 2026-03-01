/**
 * Compaction Hook
 *
 * When OpenCode compacts the session context window, this hook injects
 * relevant memories into the compaction context so they survive the
 * summarization process. This prevents memory loss across long sessions.
 * Core fetch logic delegated to memory-service.
 */

import { MnemoBridge } from '../bridge.js'
import { COMPACTION_INSTRUCTION, fetchCompactionMemories } from '../core/memory-service.js'
import { logger } from '../logger.js'

export const compactionHook = async (_input: { sessionID: string }, output: { context: string[]; prompt?: string }) => {
  try {
    const bridge = MnemoBridge.getInstance()

    // Skip if bridge is unavailable (circuit breaker open)
    if (!bridge.isAvailable()) return

    const memoryContext = await fetchCompactionMemories(bridge)
    if (memoryContext) output.context.push(memoryContext)

    output.context.push(COMPACTION_INSTRUCTION)
  } catch (error) {
    logger.error(`[Mnemo] Error in compaction hook: ${error}`)
  }
}
