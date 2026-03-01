/**
 * Core Memory Service
 *
 * Platform-agnostic business logic for the mnemo memory system.
 * Extracted from hooks to enable universal adapter architecture:
 * budgeting, regex parsing, MCP communication orchestration.
 *
 * All platforms (OpenCode, OMP, Claude Code CLI) import from here
 * to avoid duplicating logic across adapters.
 */

import type { MnemoBridge } from '../bridge.js'

/** Memory item returned from mnemo-mcp search */
export interface MemoryResult {
  id: string
  category: string
  content: string
  tags?: string[]
}

/** Maximum percentage of context window to use for memory injection */
export const BUDGET_PERCENT = 0.025

/** Budget bounds in characters */
export const MIN_BUDGET = 600
export const MAX_BUDGET = 8000

/** Minimum idle time before processing buffer (60 seconds) */
export const IDLE_THRESHOLD = 60_000

/** Maximum content length to store per auto-capture */
export const MAX_CAPTURE_LENGTH = 500

/** Regex to detect constraint-like user statements */
export const CONSTRAINT_REGEX = /\b(always|never|must|prefer|don't|do not|should not|make sure|ensure|require)\b/i

/** Self-awareness block always injected (tells agent about available memory tools) */
export const SELF_AWARENESS = `You have persistent memory via the Mnemo system. You can use:
- mnemo_search: Search stored memories, facts, preferences, decisions
- mnemo_remember: Permanently store new facts, rules, preferences
- mnemo_forget: Delete outdated or incorrect memories
Proactively search memory when entering a new codebase or when the user asks about past decisions.`

/** Compaction preservation instruction (always included during context compaction) */
export const COMPACTION_INSTRUCTION =
  'When summarizing this session, explicitly preserve any user preferences, technical constraints, architectural decisions, or project rules that were discussed. These should be saved to persistent memory if not already stored.'

/** Extract project name from directory path (cross-platform) */
export function getProjectName(directory: string): string {
  const cleanDir = directory.replace(/\\/g, '/')
  const parts = cleanDir.split('/')
  return parts[parts.length - 1] || 'unknown'
}

/** Compute injection budget based on model context limit */
export function computeBudget(contextLimit: number | undefined): number {
  if (!contextLimit || contextLimit <= 0) return MIN_BUDGET

  const budget = Math.floor(contextLimit * BUDGET_PERCENT * 4) // ~4 chars per token
  return Math.max(MIN_BUDGET, Math.min(MAX_BUDGET, budget))
}

/** Truncate text to fit within character budget */
export function truncateToFit(text: string, budget: number): string {
  if (text.length <= budget) return text
  return `${text.slice(0, budget - 3)}...`
}

/** Simple string hash for deduplication */
export function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash.toString(36)
}

/**
 * Build memory context injection string for system prompt.
 * Searches memories by project name and formats within budget.
 * Returns null if no memories found.
 */
export async function buildMemoryContext(
  bridge: MnemoBridge,
  projectName: string,
  budget: number
): Promise<string | null> {
  const searchRes = await bridge.callTool('memory', {
    action: 'search',
    query: projectName,
    limit: 10
  })

  if (!searchRes || !searchRes.count || searchRes.count === 0) return null

  const results = searchRes.results as MemoryResult[]

  let injection = `[Mnemo Context for "${projectName}"]\n`
  let usedBudget = injection.length

  for (const mem of results) {
    const line = `- [${mem.category}] ${mem.content}\n`
    if (usedBudget + line.length > budget) {
      // Try to fit a truncated version
      const remaining = budget - usedBudget
      if (remaining > 20) {
        injection += truncateToFit(line, remaining)
      }
      break
    }
    injection += line
    usedBudget += line.length
  }

  return injection
}

/**
 * Capture constraint-like content and store in mnemo-mcp.
 * Returns true if content was captured, false if skipped (no constraint detected).
 */
export async function captureConstraint(bridge: MnemoBridge, content: string, projectName: string): Promise<boolean> {
  if (!CONSTRAINT_REGEX.test(content)) return false

  const trimmedContent = content.length > MAX_CAPTURE_LENGTH ? `${content.slice(0, MAX_CAPTURE_LENGTH)}...` : content

  await bridge.callTool('memory', {
    action: 'add',
    content: `[Auto-captured for ${projectName}]: ${trimmedContent}`,
    category: 'auto-capture',
    tags: [projectName, 'preference']
  })

  return true
}

/**
 * Fetch memories for compaction context preservation.
 * Returns formatted memory string, or null if none found.
 */
export async function fetchCompactionMemories(bridge: MnemoBridge): Promise<string | null> {
  const statsRes = await bridge.callTool('memory', { action: 'stats' })
  const totalMemories = statsRes?.total_memories ?? 0

  if (totalMemories === 0) return null

  const listRes = await bridge.callTool('memory', { action: 'list', limit: 10 })
  if (!listRes?.results?.length) return null

  const memories = (listRes.results as MemoryResult[]).map((m) => `- [${m.category}] ${m.content}`).join('\n')

  return `[Mnemo Persistent Memory - Preserve These]\nThe following facts and preferences are stored in persistent memory and must be preserved:\n${memories}`
}

/**
 * Search all memories and format as markdown for .claude_memory.md export.
 * Groups memories by category for readability.
 */
export async function exportMemoriesAsMarkdown(bridge: MnemoBridge): Promise<string> {
  const statsRes = await bridge.callTool('memory', { action: 'stats' })
  const total = statsRes?.total_memories ?? 0

  if (total === 0) return '# Mnemo Memory\n\nNo memories stored yet.\n'

  const listRes = await bridge.callTool('memory', { action: 'list', limit: 50 })
  const results = (listRes?.results ?? []) as MemoryResult[]

  let md = '# Mnemo Memory\n\n'
  md += `> Auto-generated by mnemo-plugin. ${total} memories found.\n\n`

  // Group by category
  const grouped = new Map<string, MemoryResult[]>()
  for (const mem of results) {
    const cat = mem.category || 'general'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(mem)
  }

  for (const [category, mems] of grouped) {
    md += `## ${category}\n\n`
    for (const mem of mems) {
      const tags = mem.tags?.length ? ` *(${mem.tags.join(', ')})*` : ''
      md += `- ${mem.content}${tags}\n`
    }
    md += '\n'
  }

  return md
}
