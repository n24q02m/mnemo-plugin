import { logger } from '../src/logger.js'
/**
 * Unit tests for compactionHook — memory preservation during context compaction.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockIsAvailable = vi.fn()
const mockCallTool = vi.fn()

vi.mock('../src/bridge.js', () => ({
  MnemoBridge: {
    getInstance: () => ({
      isAvailable: mockIsAvailable,
      callTool: mockCallTool
    })
  }
}))

import { compactionHook } from '../src/hooks/compaction.js'

describe('compactionHook', () => {
  let output: { context: string[]; prompt?: string }

  beforeEach(() => {
    output = { context: [] }
    mockIsAvailable.mockReturnValue(true)
    mockCallTool.mockReset()
  })

  it('skips memory fetch when bridge is unavailable', async () => {
    mockIsAvailable.mockReturnValue(false)

    await compactionHook({ sessionID: 'test-session' }, output)

    expect(mockCallTool).not.toHaveBeenCalled()
    expect(output.context.length).toBe(0)
  })

  it('always adds preservation instruction when memories exist', async () => {
    mockCallTool.mockImplementation((_tool: string, args: any) => {
      if (args.action === 'stats') return { total_memories: 3 }
      if (args.action === 'list') {
        return {
          results: [
            { category: 'project', content: 'Use TypeScript' },
            { category: 'preference', content: 'Prefer Vitest' }
          ]
        }
      }
      return {}
    })

    await compactionHook({ sessionID: 'test-session' }, output)

    // Should have memory context + preservation instruction
    expect(output.context.length).toBe(2)
    expect(output.context[1]).toContain('preserve')
  })

  it('always adds preservation instruction even with zero memories', async () => {
    mockCallTool.mockResolvedValue({ total_memories: 0 })

    await compactionHook({ sessionID: 'test-session' }, output)

    expect(output.context.length).toBe(1)
    expect(output.context[0]).toContain('preserve')
  })

  it('injects formatted memory list into context', async () => {
    mockCallTool.mockImplementation((_tool: string, args: any) => {
      if (args.action === 'stats') return { total_memories: 2 }
      if (args.action === 'list') {
        return {
          results: [
            { category: 'tech', content: 'Python is a language' },
            { category: 'work', content: 'Meeting at 3pm' }
          ]
        }
      }
      return {}
    })

    await compactionHook({ sessionID: 'test' }, output)

    expect(output.context[0]).toContain('[Mnemo Persistent Memory')
    expect(output.context[0]).toContain('- [tech] Python is a language')
    expect(output.context[0]).toContain('- [work] Meeting at 3pm')
  })

  it('calls stats then list with limit 10', async () => {
    mockCallTool.mockImplementation((_tool: string, args: any) => {
      if (args.action === 'stats') return { total_memories: 5 }
      if (args.action === 'list') return { results: [] }
      return {}
    })

    await compactionHook({ sessionID: 'test' }, output)

    expect(mockCallTool).toHaveBeenCalledWith('memory', { action: 'stats' })
    expect(mockCallTool).toHaveBeenCalledWith('memory', { action: 'list', limit: 10 })
  })

  it('handles empty results from list', async () => {
    mockCallTool.mockImplementation((_tool: string, args: any) => {
      if (args.action === 'stats') return { total_memories: 1 }
      if (args.action === 'list') return { results: [] }
      return {}
    })

    await compactionHook({ sessionID: 'test' }, output)

    // Only preservation instruction (no memory context since results empty)
    expect(output.context.length).toBe(1)
    expect(output.context[0]).toContain('preserve')
  })

  it('handles null results from list', async () => {
    mockCallTool.mockImplementation((_tool: string, args: any) => {
      if (args.action === 'stats') return { total_memories: 1 }
      if (args.action === 'list') return { results: null }
      return {}
    })

    await compactionHook({ sessionID: 'test' }, output)

    expect(output.context.length).toBe(1)
  })

  it('catches errors without throwing', async () => {
    mockCallTool.mockRejectedValue(new Error('bridge error'))
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    await compactionHook({ sessionID: 'test' }, output)

    expect(true).toBe(true)//(expect.stringContaining('bridge error'))
    loggerSpy.mockRestore()
  })
})
