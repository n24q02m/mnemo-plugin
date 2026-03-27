import type { ToolContext } from '@opencode-ai/plugin/tool'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MnemoBridge } from '../src/bridge.js'
import { mnemoRemember } from '../src/tools/memory.js'

describe('mnemoRemember', () => {
  let mockBridge: any

  beforeEach(() => {
    // Mock MnemoBridge instance and its callTool method
    mockBridge = {
      callTool: vi.fn().mockResolvedValue({ id: 'mem-123', status: 'saved' })
    }
    vi.spyOn(MnemoBridge, 'getInstance').mockReturnValue(mockBridge)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should store a new memory with auto-generated project tag', async () => {
    const context = {
      directory: '/home/user/projects/my-app',
      metadata: vi.fn()
    } as unknown as ToolContext

    const args = {
      content: 'This is a test memory',
      category: 'fact',
      tags: []
    }

    const result = await mnemoRemember.execute(args, context)

    expect(mockBridge.callTool).toHaveBeenCalledWith('memory', {
      action: 'add',
      content: 'This is a test memory',
      category: 'fact',
      tags: ['my-app']
    })
    expect(result).toContain('Successfully stored memory with ID: mem-123')
    expect(context.metadata).toHaveBeenCalledWith({ title: 'Remembering: This is a test memory' })
  })

  it('should not add duplicate project tag if already present', async () => {
    const context = {
      directory: '/home/user/projects/my-app',
      metadata: vi.fn()
    } as unknown as ToolContext

    const args = {
      content: 'Test content',
      category: 'preference',
      tags: ['existing-tag', 'my-app']
    }

    await mnemoRemember.execute(args, context)

    expect(mockBridge.callTool).toHaveBeenCalledWith('memory', {
      action: 'add',
      content: 'Test content',
      category: 'preference',
      tags: ['existing-tag', 'my-app']
    })
  })

  it('should handle long content in metadata title', async () => {
    const context = {
      directory: '/path/to/project',
      metadata: vi.fn()
    } as unknown as ToolContext

    // "This is a very long memory content that " is 40 chars
    const longContent = 'This is a very long memory content that should be truncated.'
    const args = {
      content: longContent,
      category: 'general'
    }

    await mnemoRemember.execute(args, context)

    expect(context.metadata).toHaveBeenCalledWith({
      title: 'Remembering: This is a very long memory content that ...'
    })
  })

  it('should handle error from bridge', async () => {
    const context = {
      directory: '/path/to/project',
      metadata: vi.fn()
    } as unknown as ToolContext

    const args = {
      content: 'Test content',
      category: 'general'
    }

    mockBridge.callTool.mockRejectedValue(new Error('Bridge error'))

    const result = await mnemoRemember.execute(args, context)

    expect(result).toBe('Failed to store memory: Bridge error')
  })

  it('should handle windows paths in project name', async () => {
    const context = {
      directory: 'C:\\Users\\dev\\projects\\win-app',
      metadata: vi.fn()
    } as unknown as ToolContext

    const args = {
      content: 'Windows path test',
      category: 'test',
      tags: []
    }

    await mnemoRemember.execute(args, context)

    expect(mockBridge.callTool).toHaveBeenCalledWith(
      'memory',
      expect.objectContaining({
        tags: ['win-app']
      })
    )
  })
})
