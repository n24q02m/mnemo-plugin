import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import plugin from '../src/index.js'
import { MnemoBridge } from '../src/bridge.js'
import * as autoCaptureHooks from '../src/hooks/auto-capture.js'
import * as compactionHooks from '../src/hooks/compaction.js'
import * as systemPromptHooks from '../src/hooks/system-prompt.js'

// Mock dependencies
vi.mock('../src/bridge.js', () => {
  const getInstance = vi.fn()
  return {
    MnemoBridge: {
      getInstance
    }
  }
})

vi.mock('../src/hooks/auto-capture.js', () => ({
  autoCaptureHook: vi.fn(),
  messageHook: vi.fn()
}))
vi.mock('../src/hooks/compaction.js', () => ({
  compactionHook: vi.fn()
}))
vi.mock('../src/hooks/system-prompt.js', () => ({
  systemPromptHook: vi.fn()
}))

describe('Mnemo Plugin', () => {
  let mockBridge: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock bridge instance
    mockBridge = {
      connect: vi.fn().mockResolvedValue(undefined),
      isAvailable: vi.fn().mockReturnValue(true)
    }

    // Configure the mock getInstance to return our mock bridge
    // We access the mocked function directly
    const MnemoBridgeMock = vi.mocked(MnemoBridge)
    MnemoBridgeMock.getInstance.mockReturnValue(mockBridge)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers tools and hooks correctly', async () => {
    const input = { directory: '/test/dir' }
    const result = await plugin(input as any)

    // Verify tools
    expect(result.tool).toBeDefined()
    expect(result.tool?.mnemo_search).toBeDefined()
    expect(result.tool?.mnemo_remember).toBeDefined()
    expect(result.tool?.mnemo_forget).toBeDefined()

    // Verify hooks
    expect(result['experimental.chat.system.transform']).toBeDefined()
    expect(result['chat.message']).toBeDefined()
    expect(result.event).toBeDefined()
    expect(result['experimental.session.compacting']).toBeDefined()
  })

  it('initializes bridge connection asynchronously', async () => {
    vi.useFakeTimers()
    const input = { directory: '/test/dir' }

    await plugin(input as any)

    // Bridge should be instantiated immediately
    expect(MnemoBridge.getInstance).toHaveBeenCalled()

    // Connect happens in setTimeout, so initially not called
    expect(mockBridge.connect).not.toHaveBeenCalled()

    // Fast-forward time
    vi.advanceTimersByTime(100)

    // Wait for any pending promises (microtasks)
    await Promise.resolve()

    expect(mockBridge.connect).toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('handles bridge connection failure gracefully', async () => {
    vi.useFakeTimers()
    const input = { directory: '/test/dir' }

    // Mock connect to fail
    mockBridge.connect.mockRejectedValue(new Error('Connection failed'))

    await plugin(input as any)
    vi.advanceTimersByTime(100)

    // Wait for promises
    await Promise.resolve()

    // Should have attempted to connect
    expect(mockBridge.connect).toHaveBeenCalled()

    // Should not throw (handled silently)

    vi.useRealTimers()
  })

  it('delegates system prompt hook correctly', async () => {
    const input = { directory: '/test/dir' }
    const result = await plugin(input as any)

    const hook = result['experimental.chat.system.transform']
    const inParams = { sessionID: '123' }
    const outParams = { system: [] }

    if (hook) {
        await hook(inParams, outParams)
    }

    expect(systemPromptHooks.systemPromptHook).toHaveBeenCalledWith(inParams, outParams, '/test/dir')
  })

  it('delegates message hook correctly', async () => {
    const input = { directory: '/test/dir' }
    const result = await plugin(input as any)

    const hook = result['chat.message']
    const inParams = { message: 'hello' }
    const outParams = { parts: [] }

    if (hook) {
        await hook(inParams, outParams)
    }

    expect(autoCaptureHooks.messageHook).toHaveBeenCalledWith(inParams, outParams)
  })

  it('delegates event hook (auto-capture) correctly', async () => {
    const input = { directory: '/test/dir' }
    const result = await plugin(input as any)

    const hook = result.event
    const inParams = { event: { type: 'session.idle' } }

    if (hook) {
        await hook(inParams)
    }

    expect(autoCaptureHooks.autoCaptureHook).toHaveBeenCalledWith(inParams, '/test/dir')
  })

  it('delegates compaction hook correctly', async () => {
    const input = { directory: '/test/dir' }
    const result = await plugin(input as any)

    const hook = result['experimental.session.compacting']
    const inParams = { sessionID: '123' }
    const outParams = { context: [] }

    if (hook) {
        await hook(inParams, outParams)
    }

    expect(compactionHooks.compactionHook).toHaveBeenCalledWith(inParams, outParams)
  })
})
