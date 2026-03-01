/**
 * oh-my-pi (OMP) Platform Adapter
 *
 * Registers mnemo memory hooks using the pi.on() event paradigm.
 * Provides the same memory capabilities as the OpenCode adapter
 * but through OMP's event-driven plugin interface.
 */

import { MnemoBridge } from '../../bridge.js'
import {
  buildMemoryContext,
  COMPACTION_INSTRUCTION,
  captureConstraint,
  computeBudget,
  fetchCompactionMemories,
  getProjectName,
  hashContent,
  SELF_AWARENESS
} from '../../core/memory-service.js'
import { logger } from '../../logger.js'

/** Context object passed to OMP event handlers */
export interface OmpContext {
  directory: string
  model?: { contextLimit?: number }
  system?: string[]
  content?: string
  context?: string[]
}

/** OMP plugin interface using the pi.on() paradigm */
export interface OmpPlugin {
  on(event: string, handler: (ctx: OmpContext) => Promise<void>): void
}

/** Dedup set for auto-capture (per-process lifetime) */
const capturedHashes = new Set<string>()

/** Register mnemo hooks with an OMP plugin instance */
export function register(pi: OmpPlugin): void {
  const bridge = MnemoBridge.getInstance()

  // Background connect (non-blocking)
  setTimeout(async () => {
    try {
      await bridge.connect()
    } catch {
      // Circuit breaker handles repeated failures
    }
  }, 100)

  pi.on('system-prompt', async (ctx) => {
    try {
      ctx.system = ctx.system ?? []
      ctx.system.push(SELF_AWARENESS)

      if (!bridge.isAvailable()) return

      const projectName = getProjectName(ctx.directory)
      const budget = computeBudget(ctx.model?.contextLimit)

      const injection = await buildMemoryContext(bridge, projectName, budget)
      if (injection) ctx.system.push(injection)
    } catch (error) {
      logger.error(`[Mnemo/OMP] Error in system-prompt: ${error}`)
    }
  })

  pi.on('message', async (ctx) => {
    if (!ctx.content || !bridge.isAvailable()) return

    try {
      const projectName = getProjectName(ctx.directory)
      const hash = hashContent(ctx.content)
      if (capturedHashes.has(hash)) return

      const captured = await captureConstraint(bridge, ctx.content, projectName)
      if (captured) {
        capturedHashes.add(hash)
        logger.info(`[Mnemo/OMP] Auto-captured a new rule for ${projectName}`)
      }
    } catch (error) {
      logger.error(`[Mnemo/OMP] Error in message capture: ${error}`)
    }
  })

  pi.on('compact', async (ctx) => {
    try {
      if (!bridge.isAvailable()) return

      ctx.context = ctx.context ?? []

      const memoryContext = await fetchCompactionMemories(bridge)
      if (memoryContext) ctx.context.push(memoryContext)

      ctx.context.push(COMPACTION_INSTRUCTION)
    } catch (error) {
      logger.error(`[Mnemo/OMP] Error in compaction: ${error}`)
    }
  })
}
