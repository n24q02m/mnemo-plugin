/**
 * Memory Tool Definitions
 *
 * Three user-facing OpenCode tools that wrap the mnemo-mcp `memory` composite tool:
 * - mnemo_search: Search stored memories by query
 * - mnemo_remember: Store a new persistent memory
 * - mnemo_forget: Delete an outdated memory by ID
 */

import { type ToolDefinition, tool } from '@opencode-ai/plugin/tool'
import { MnemoBridge } from '../bridge.js'

import type { MemoryResult as Memory } from '../core/memory-service.js'
import { getProjectName } from '../core/memory-service.js'

export const mnemoSearch: ToolDefinition = tool({
  description:
    'Search the persistent memory system (mnemo) for project rules, facts, preferences, or context. Use this proactively when entering a new codebase or when the user asks about past decisions.',
  args: {
    query: tool.schema.string().describe('The search query (e.g. "What database do we use?", "coding standards")'),
    category: tool.schema
      .string()
      .optional()
      .describe('Filter by category (e.g. "general", "preference", "fact", "architecture")'),
    limit: tool.schema.number().min(1).max(20).default(5).describe('Max results to return')
  },
  async execute(args, context) {
    const bridge = MnemoBridge.getInstance()

    try {
      context.metadata({ title: `Searching mnemo for: ${args.query}` })

      const response = await bridge.callTool('memory', {
        action: 'search',
        query: args.query,
        category: args.category,
        limit: args.limit
      })

      if (!response.count || response.count === 0) {
        return `No memories found matching "${args.query}".`
      }

      let result = `Found ${response.count} memories:\n\n`
      for (const [i, mem] of (response.results as Memory[]).entries()) {
        const tags = mem.tags?.length ? ` [Tags: ${mem.tags.join(', ')}]` : ''
        result += `${i + 1}. [ID: ${mem.id}] [${mem.category}]${tags} ${mem.content}\n`
      }

      return result
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return `Failed to search memory: ${msg}`
    }
  }
})

export const mnemoRemember: ToolDefinition = tool({
  description:
    'Store a new persistent memory in the mnemo system. Use this to permanently save user preferences, project constraints, architectural decisions, or key facts so they are never forgotten across sessions.',
  args: {
    content: tool.schema.string().describe('The fact, rule, or preference to remember'),
    category: tool.schema
      .string()
      .default('general')
      .describe('Categorize this memory (e.g., "preference", "fact", "architecture", "decision", "bugfix")'),
    tags: tool.schema.array(tool.schema.string()).optional().describe('Keywords to help retrieve this memory later')
  },
  async execute(args, context) {
    const bridge = MnemoBridge.getInstance()

    try {
      const preview = args.content.length > 40 ? `${args.content.slice(0, 40)}...` : args.content
      context.metadata({ title: `Remembering: ${preview}` })

      // Auto-tag with project name
      const projectName = getProjectName(context.directory)
      const finalTags = args.tags ? [...args.tags] : []
      if (projectName && !finalTags.includes(projectName)) {
        finalTags.push(projectName)
      }

      const response = await bridge.callTool('memory', {
        action: 'add',
        content: args.content,
        category: args.category,
        tags: finalTags
      })

      return `Successfully stored memory with ID: ${response.id}. This fact is now permanently saved and will be available in future sessions.`
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return `Failed to store memory: ${msg}`
    }
  }
})

export const mnemoForget: ToolDefinition = tool({
  description:
    'Delete a specific memory from the mnemo system by its ID. Use this when a preference, fact, or decision is no longer accurate or relevant.',
  args: {
    memory_id: tool.schema.string().describe('The ID of the memory to delete (obtained from mnemo_search results)')
  },
  async execute(args, context) {
    const bridge = MnemoBridge.getInstance()

    try {
      context.metadata({ title: `Deleting memory: ${args.memory_id}` })

      const response = await bridge.callTool('memory', {
        action: 'delete',
        memory_id: args.memory_id
      })

      return `Successfully deleted memory ${response.id}. The fact has been permanently removed.`
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return `Failed to delete memory: ${msg}`
    }
  }
})
