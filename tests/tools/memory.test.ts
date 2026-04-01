import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MnemoBridge } from '../../src/bridge.js'
import { mnemoSearch } from '../../src/tools/memory.js'

describe('mnemoSearch', () => {
  let mockBridge: any
  let mockContext: any

  beforeEach(() => {
    // Reset singleton
    ;(MnemoBridge as any).instance = undefined

    // Mock bridge instance
    mockBridge = {
      callTool: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined)
    }

    // Mock getInstance to return our mock bridge
    vi.spyOn(MnemoBridge, 'getInstance').mockReturnValue(mockBridge)

    // Mock context
    mockContext = {
      metadata: vi.fn(),
      directory: '/mock/project/path'
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats search results correctly', async () => {
    // Setup mock response
    mockBridge.callTool.mockResolvedValue({
      count: 2,
      results: [
        {
          id: 'mem-1',
          category: 'fact',
          content: 'Database is Postgres',
          tags: ['db', 'infra']
        },
        {
          id: 'mem-2',
          category: 'rule',
          content: 'Use camelCase for variables'
        }
      ]
    })

    const args = { query: 'database' }
    const result = await mnemoSearch.execute(args, mockContext)

    // Verify bridge call
    expect(mockBridge.callTool).toHaveBeenCalledWith('memory', {
      action: 'search',
      query: 'database',
      category: undefined,
      limit: undefined
    })

    // Verify context metadata update
    expect(mockContext.metadata).toHaveBeenCalledWith({
      title: 'Searching mnemo for: database'
    })

    // Verify output formatting
    expect(result).toContain('Found 2 memories:')
    expect(result).toContain('1. [ID: mem-1] [fact] [Tags: db, infra] Database is Postgres')
    expect(result).toContain('2. [ID: mem-2] [rule] Use camelCase for variables')
  })

  it('handles empty search results', async () => {
    mockBridge.callTool.mockResolvedValue({
      count: 0,
      results: []
    })

    const args = { query: 'missing' }
    const result = await mnemoSearch.execute(args, mockContext)

    expect(result).toBe('No memories found matching "missing".')
  })

  it('handles bridge errors gracefully', async () => {
    mockBridge.callTool.mockRejectedValue(new Error('Connection failed'))

    const args = { query: 'error' }
    const result = await mnemoSearch.execute(args, mockContext)

    expect(result).toBe('Failed to search memory: Connection failed')
  })

  it('passes optional arguments to bridge', async () => {
    mockBridge.callTool.mockResolvedValue({ count: 0, results: [] })

    const args = {
      query: 'test',
      category: 'rule',
      limit: 10
    }
    await mnemoSearch.execute(args, mockContext)

    expect(mockBridge.callTool).toHaveBeenCalledWith('memory', {
      action: 'search',
      query: 'test',
      category: 'rule',
      limit: 10
    })
  })
})
