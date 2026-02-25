import { logger } from '../logger.js'
/**
 * System Prompt Hook
 *
 * Injects relevant memories into the system prompt using adaptive budget
 * based on the model's context window. Inspired by minzique-plugin's
 * tiered priority injection system.
 */

import type { Model } from '@opencode-ai/sdk'
import { MnemoBridge } from '../bridge.js'

/** Memory item returned from mnemo-mcp search */
interface MemoryResult {
  id: string
  category: string
  content: string
  tags?: string[]
}

/** Maximum percentage of context window to use for memory injection */
const BUDGET_PERCENT = 0.025

/** Budget bounds in characters */
const MIN_BUDGET = 600
const MAX_BUDGET = 8000

/** Self-awareness block always injected (tells agent about available memory tools) */
const SELF_AWARENESS = `You have persistent memory via the Mnemo system. You can use:
- mnemo_search: Search stored memories, facts, preferences, decisions
- mnemo_remember: Permanently store new facts, rules, preferences
- mnemo_forget: Delete outdated or incorrect memories
Proactively search memory when entering a new codebase or when the user asks about past decisions.`

/** Extract project name from directory path */
function getProjectName(directory: string): string {
  const cleanDir = directory.replace(/\\/g, '/')
  const parts = cleanDir.split('/')
  return parts[parts.length - 1] || 'unknown'
}

/** Compute injection budget based on model context limit */
function computeBudget(model: Model): number {
  const contextLimit = model?.limit?.context
  if (!contextLimit || contextLimit <= 0) return MIN_BUDGET

  const budget = Math.floor(contextLimit * BUDGET_PERCENT * 4) // ~4 chars per token
  return Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, budget))
}

/** Escape special characters for XML */
function escapeXML(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

/** Truncate text to fit within character budget */
function truncateToFit(text: string, budget: number): string {
  if (text.length <= budget) return text
  return `${text.slice(0, budget - 3)}...`
}

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
    const budget = computeBudget(input.model)

    // Search memories relevant to current project
    const searchRes = await bridge.callTool('memory', {
      action: 'search',
      query: projectName,
      limit: 10
    })

    if (!searchRes || !searchRes.count || searchRes.count === 0) return

    const results = searchRes.results as MemoryResult[]

    // Build memory injection with budget constraint
    let injection = `<mnemo_memories project="${escapeXML(projectName)}">\n`
    let usedBudget = injection.length + 20 // Buffer for closing tag

    for (const mem of results) {
      const category = escapeXML(mem.category)
      const content = escapeXML(mem.content)
      const line = `  <memory category="${category}">${content}</memory>\n`

      if (usedBudget + line.length > budget) {
        // Try to fit a truncated version (if significant budget remains)
        const overhead = `  <memory category="${category}">...</memory>\n`.length
        const remaining = budget - usedBudget

        if (remaining > overhead + 20) {
           const availableForContent = remaining - overhead
           const truncatedContent = escapeXML(truncateToFit(mem.content, availableForContent))
           injection += `  <memory category="${category}">${truncatedContent}</memory>\n`
        }
        break
      }
      injection += line
      usedBudget += line.length
    }

    injection += '</mnemo_memories>'
    output.system.push(injection)
  } catch (error) {
    logger.error(`[Mnemo] Error injecting system prompt: ${error}`)
  }
}
