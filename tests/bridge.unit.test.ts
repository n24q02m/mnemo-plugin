/**
 * Unit tests for MnemoBridge — circuit breaker, timeouts, isAvailable, response parsing.
 *
 * Mocks the private doConnect method to avoid needing real MCP SDK constructors.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We need to mock the SDK modules before importing bridge, but we use
// a different strategy: spy on the doConnect method after instantiation.
// This avoids the "is not a constructor" problem with vi.mock for classes.

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn()
}))

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn()
}))

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolResultSchema: {}
}))

import { MnemoBridge } from '../src/bridge.js'

/**
 * Helper: create a bridge instance with doConnect mocked to set up
 * the internal state as if a real connection was established.
 */
function setupBridgeWithMockConnect(
  bridge: MnemoBridge,
  opts?: {
    tools?: string[]
    connectError?: Error
  }
) {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({
      tools: (opts?.tools ?? ['memory', 'config']).map((n) => ({ name: n }))
    }),
    callTool: vi.fn().mockResolvedValue({
      isError: false,
      content: [{ type: 'text', text: '{"status":"ok"}' }]
    })
  }

  const mockTransport = { close: vi.fn().mockResolvedValue(undefined) }

  // Override doConnect to simulate successful connection
  vi.spyOn(bridge as any, 'doConnect').mockImplementation(async () => {
    if (opts?.connectError) throw opts.connectError
    ;(bridge as any).transport = mockTransport
    ;(bridge as any).client = mockClient
    ;(bridge as any).availableTools = new Set(opts?.tools ?? ['memory', 'config'])
    return mockClient
  })

  return { mockClient, mockTransport }
}

describe('MnemoBridge', () => {
  beforeEach(() => {
    // Reset singleton between tests
    ;(MnemoBridge as any).instance = undefined
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('returns a singleton instance', () => {
      const a = MnemoBridge.getInstance()
      const b = MnemoBridge.getInstance()
      expect(a).toBe(b)
    })

    it('creates a new instance after singleton reset', () => {
      const a = MnemoBridge.getInstance()
      ;(MnemoBridge as any).instance = undefined
      const b = MnemoBridge.getInstance()
      expect(a).not.toBe(b)
    })
  })

  describe('isAvailable', () => {
    it('returns true when client is connected', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)
      await bridge.connect()
      expect(bridge.isAvailable()).toBe(true)
    })

    it('returns true when failCount is below MAX_FAILURES', () => {
      const bridge = MnemoBridge.getInstance()
      ;(bridge as any).failCount = 2
      expect(bridge.isAvailable()).toBe(true)
    })

    it('returns false when circuit breaker is open within cooldown', () => {
      const bridge = MnemoBridge.getInstance()
      ;(bridge as any).failCount = 3
      ;(bridge as any).lastFailTime = Date.now()
      expect(bridge.isAvailable()).toBe(false)
    })

    it('returns true when circuit breaker cooldown has elapsed', () => {
      const bridge = MnemoBridge.getInstance()
      ;(bridge as any).failCount = 3
      ;(bridge as any).lastFailTime = Date.now() - 300_001
      expect(bridge.isAvailable()).toBe(true)
    })
  })

  describe('connect', () => {
    it('connects and caches available tools', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)

      await bridge.connect()

      expect((bridge as any).availableTools).toBeInstanceOf(Set)
      expect((bridge as any).availableTools.has('memory')).toBe(true)
    })

    it('reuses existing connection', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)

      const c1 = await bridge.connect()
      const c2 = await bridge.connect()

      expect(c1).toBe(c2)
      // doConnect should only be called once
      expect((bridge as any).doConnect).toHaveBeenCalledTimes(1)
    })

    it('rejects when circuit breaker is open', async () => {
      const bridge = MnemoBridge.getInstance()
      ;(bridge as any).failCount = 3
      ;(bridge as any).lastFailTime = Date.now()

      await expect(bridge.connect()).rejects.toThrow('circuit breaker open')
    })

    it('resets circuit breaker and retries after cooldown', async () => {
      const bridge = MnemoBridge.getInstance()
      ;(bridge as any).failCount = 3
      ;(bridge as any).lastFailTime = Date.now() - 300_001
      setupBridgeWithMockConnect(bridge)

      await bridge.connect()
      expect((bridge as any).failCount).toBe(0)
    })

    it('increments failCount on failure', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge, {
        connectError: new Error('connection refused')
      })

      try {
        await bridge.connect()
      } catch {}

      expect((bridge as any).failCount).toBe(1)
    })

    it('records lastFailTime on failure', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge, {
        connectError: new Error('fail')
      })
      const before = Date.now()

      try {
        await bridge.connect()
      } catch {}

      expect((bridge as any).lastFailTime).toBeGreaterThanOrEqual(before)
    })

    it('resets failCount on success after previous failures', async () => {
      const bridge = MnemoBridge.getInstance()
      ;(bridge as any).failCount = 2
      setupBridgeWithMockConnect(bridge)

      await bridge.connect()
      expect((bridge as any).failCount).toBe(0)
    })

    it('coalesces concurrent connect calls', async () => {
      const bridge = MnemoBridge.getInstance()

      // Make doConnect slow to test concurrency
      const mockClient = { connect: vi.fn(), listTools: vi.fn(), callTool: vi.fn() }
      vi.spyOn(bridge as any, 'doConnect').mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 20))
        ;(bridge as any).client = mockClient
        ;(bridge as any).availableTools = new Set(['memory'])
        ;(bridge as any).transport = { close: vi.fn() }
        return mockClient
      })

      const [c1, c2] = await Promise.all([bridge.connect(), bridge.connect()])
      expect(c1).toBe(c2)
      expect((bridge as any).doConnect).toHaveBeenCalledTimes(1)
    })

    it('clears connecting promise after resolution', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)

      await bridge.connect()
      expect((bridge as any).connecting).toBeNull()
    })

    it('clears connecting promise after rejection', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge, {
        connectError: new Error('fail')
      })

      try {
        await bridge.connect()
      } catch {}

      expect((bridge as any).connecting).toBeNull()
    })
    it('retries connection when doConnect fails partially (leaving client set)', async () => {
      const bridge = MnemoBridge.getInstance()

      let attempt = 0
      const mockClient = {
        connect: vi.fn(),
        listTools: vi.fn(),
        callTool: vi.fn()
      }

      vi.spyOn(bridge as any, 'doConnect').mockImplementation(async () => {
        attempt++
        if (attempt === 1) {
          // First attempt: simulate partial failure
          ;(bridge as any).client = mockClient
          throw new Error('Partial failure')
        } else {
          // Second attempt: success
          ;(bridge as any).client = mockClient
          ;(bridge as any).availableTools = new Set(['memory'])
          ;(bridge as any).transport = { close: vi.fn() }
          return mockClient
        }
      })

      // First connect call - fails
      await expect(bridge.connect()).rejects.toThrow('Partial failure')

      // Second connect call - should retry and succeed
      const client = await bridge.connect()

      expect((bridge as any).doConnect).toHaveBeenCalledTimes(2)
      expect(client).toBe(mockClient)
    })
  })


  describe('callTool', () => {
    it('parses JSON response', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)

      const result = await bridge.callTool('memory', { action: 'stats' })
      expect(result).toEqual({ status: 'ok' })
    })

    it('auto-connects if not connected', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)

      expect((bridge as any).client).toBeNull()
      await bridge.callTool('memory', { action: 'stats' })
      expect((bridge as any).client).not.toBeNull()
    })

    it('throws on unknown tool name', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)
      await bridge.connect()

      await expect(bridge.callTool('nonexistent', {})).rejects.toThrow('Tool "nonexistent" not found')
    })

    it('throws on error response from server', async () => {
      const bridge = MnemoBridge.getInstance()
      const { mockClient } = setupBridgeWithMockConnect(bridge)
      mockClient.callTool.mockResolvedValue({
        isError: true,
        content: [{ type: 'text', text: 'Something went wrong' }]
      })

      await expect(bridge.callTool('memory', {})).rejects.toThrow('mnemo-mcp error')
    })

    it('throws on empty content response', async () => {
      const bridge = MnemoBridge.getInstance()
      const { mockClient } = setupBridgeWithMockConnect(bridge)
      mockClient.callTool.mockResolvedValue({
        isError: false,
        content: [{ type: 'image', data: 'abc' }]
      })

      await expect(bridge.callTool('memory', {})).rejects.toThrow('empty content')
    })

    it('returns raw text when response is not valid JSON', async () => {
      const bridge = MnemoBridge.getInstance()
      const { mockClient } = setupBridgeWithMockConnect(bridge)
      mockClient.callTool.mockResolvedValue({
        isError: false,
        content: [{ type: 'text', text: 'plain text response' }]
      })

      const result = await bridge.callTool('memory', {})
      expect(result).toBe('plain text response')
    })

    it('includes available tools in error message for unknown tool', async () => {
      const bridge = MnemoBridge.getInstance()
      setupBridgeWithMockConnect(bridge)
      await bridge.connect()

      try {
        await bridge.callTool('unknown', {})
      } catch (e: any) {
        expect(e.message).toContain('memory')
        expect(e.message).toContain('config')
      }
    })
  })

  describe('shutdown', () => {
    it('closes transport and clears all state', async () => {
      const bridge = MnemoBridge.getInstance()
      const { mockTransport } = setupBridgeWithMockConnect(bridge)
      await bridge.connect()

      await bridge.shutdown()

      expect(mockTransport.close).toHaveBeenCalled()
      expect((bridge as any).client).toBeNull()
      expect((bridge as any).transport).toBeNull()
      expect((bridge as any).availableTools).toBeNull()
    })

    it('is safe to call when not connected', async () => {
      const bridge = MnemoBridge.getInstance()
      await expect(bridge.shutdown()).resolves.toBeUndefined()
    })

    it('does not close transport if none exists', async () => {
      const bridge = MnemoBridge.getInstance()
      await bridge.shutdown()
      // No error thrown
    })
  })
})
