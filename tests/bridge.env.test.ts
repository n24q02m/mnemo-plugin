import { beforeEach, describe, expect, it, vi } from 'vitest'

const { MockStdioClientTransport } = vi.hoisted(() => {
  return { MockStdioClientTransport: vi.fn() }
})

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: MockStdioClientTransport
}))

// Mock Client to avoid actual connection attempts
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class {
    connect = vi.fn().mockResolvedValue(undefined)
    listTools = vi.fn().mockResolvedValue({ tools: [] })
    callTool = vi.fn()
  }
}))

import { MnemoBridge } from '../src/bridge.js'

describe('MnemoBridge Environment Security', () => {
  beforeEach(() => {
    // Reset singleton
    ;(MnemoBridge as any).instance = undefined
    vi.clearAllMocks()
  })

  it('passes filtered environment to StdioClientTransport', async () => {
    const bridge = MnemoBridge.getInstance()

    // Set a secret env var
    process.env.SECRET_KEY = 'super_secret_value'

    await bridge.connect()

    expect(MockStdioClientTransport).toHaveBeenCalledTimes(1)
    const args = MockStdioClientTransport.mock.calls[0][0]

    // Verify secret is stripped
    expect(args.env).not.toHaveProperty('SECRET_KEY')

    // Verify safe variable is kept
    if (process.env.PATH) {
      expect(args.env).toHaveProperty('PATH')
    }

    delete process.env.SECRET_KEY
  })
})
