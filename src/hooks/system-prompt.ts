/**
 * System Prompt Hook
 *
 * Injects relevant memories into the system prompt using adaptive budget
 * based on the model's context window. Delegates core logic to memory-service.
 */

import type { Model } from '@opencode-ai/sdk'
import { MnemoBridge } from '../bridge.js'
import { buildMemoryContext, computeBudget, getProjectName, SELF_AWARENESS } from '../core/memory-service.js'
import { logger } from '../logger.js'

export const systemPromptHook = async (
  input: { sessionID?: string; model: Model },
  output: { system: string[] },
  directory: string
) => {
  try {
    const bridge = MnemoBridge.getInstance()

    // Always inject self-awareness block (outside budget)
    output.system.push(SELF_AWARENESS)

    // Skip memory injection if bridge is unavailable (circuit breaker open)
    if (!bridge.isAvailable()) return

    const projectName = getProjectName(directory)
    const budget = computeBudget(input.model?.limit?.context)

    const injection = await buildMemoryContext(bridge, projectName, budget)
    if (injection) output.system.push(injection)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[Mnemo] Error injecting system prompt: ${message}`)
  }
}
