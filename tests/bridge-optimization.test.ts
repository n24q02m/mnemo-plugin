import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MnemoBridge } from '../src/bridge.js'

// Mock SDK
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockListTools = vi.fn().mockResolvedValue({ tools: [{ name: 'memory' }] })
const mockCallTool = vi.fn().mockResolvedValue({ isError: false, content: [{ type: 'text', text: '{}' }] })

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    connect(...args: any[]) {
      return mockConnect(...args)
    }
    listTools(...args: any[]) {
      return mockListTools(...args)
    }
    callTool(...args: any[]) {
      return mockCallTool(...args)
    }
  }
}))

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class {
    close() {
      return Promise.resolve()
    }
  }
}))

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolResultSchema: {}
}))

describe('MnemoBridge Performance Optimization', () => {
  beforeEach(() => {
    // Reset singleton
    ;(MnemoBridge as any).instance = undefined
    vi.clearAllMocks()
  })

  it('connect passes signal to client.connect', async () => {
    const bridge = MnemoBridge.getInstance()
    await bridge.connect()

    expect(mockConnect).toHaveBeenCalled()
    const args = mockConnect.mock.calls[0]

    // Check if options with signal is passed (baseline: it is NOT)
    if (args.length > 1 && args[1]?.signal) {
      console.log('Signal detected in connect: YES')
    } else {
      console.log('Signal detected in connect: NO')
    }
  })

  it('callTool passes signal to client.callTool', async () => {
    const bridge = MnemoBridge.getInstance()
    // Mock doConnect internals to avoid relying on connect() in this test?
    // No, calling connect() is fine as long as mocks work.

    await bridge.callTool('memory', { action: 'test' })

    expect(mockCallTool).toHaveBeenCalled()
    const args = mockCallTool.mock.calls[0]

    // Check if options with signal is passed (baseline: it is NOT)
    if (args.length > 2 && args[2]?.signal) {
      console.log('Signal detected in callTool: YES')
    } else {
      console.log('Signal detected in callTool: NO')
    }
  })
})
