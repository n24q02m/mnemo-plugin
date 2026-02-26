import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MnemoBridge } from '../src/bridge.js'
import { mnemoForget } from '../src/tools/memory.js'

// Mock MnemoBridge
vi.mock('../src/bridge.js', () => {
  return {
    MnemoBridge: {
      getInstance: vi.fn()
    }
  }
})

describe('mnemoForget', () => {
  let mockBridge: any
  let mockContext: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup bridge mock
    mockBridge = {
      callTool: vi.fn()
    }

    // Configure getInstance to return our mockBridge
    ;(MnemoBridge.getInstance as any).mockReturnValue(mockBridge)

    // Setup context mock
    mockContext = {
      metadata: vi.fn(),
      directory: '/test/project'
    }
  })

  it('successfully deletes a memory', async () => {
    const memoryId = 'mem-123'

    // Mock successful response
    mockBridge.callTool.mockResolvedValue({
      id: memoryId,
      status: 'ok'
    })

    const args = { memory_id: memoryId }
    const result = await mnemoForget.execute(args, mockContext)

    // Verify context metadata was set
    expect(mockContext.metadata).toHaveBeenCalledWith({ title: `Deleting memory: ${memoryId}` })

    // Verify bridge call
    expect(mockBridge.callTool).toHaveBeenCalledWith('memory', {
      action: 'delete',
      memory_id: memoryId
    })

    // Verify success message
    expect(result).toBe(`Successfully deleted memory ${memoryId}. The fact has been permanently removed.`)
  })

  it('handles errors during deletion', async () => {
    const memoryId = 'mem-error'
    const errorMessage = 'Memory not found'

    // Mock failure response
    mockBridge.callTool.mockRejectedValue(new Error(errorMessage))

    const args = { memory_id: memoryId }
    const result = await mnemoForget.execute(args, mockContext)

    // Verify bridge call happened
    expect(mockBridge.callTool).toHaveBeenCalledWith('memory', {
      action: 'delete',
      memory_id: memoryId
    })

    // Verify error message format
    expect(result).toBe(`Failed to delete memory: ${errorMessage}`)
  })
})
