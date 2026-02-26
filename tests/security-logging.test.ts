import { describe, expect, it, vi } from 'vitest'

// Create a mock logger instance to track calls
const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
}

// Mock the logger module
vi.mock('../src/logger.js', () => ({
  logger: mockLogger
}))

// Dynamic import type
type AutoCapture = typeof import('../src/hooks/auto-capture.js')

async function freshModule() {
  vi.resetModules()

  const mockIsAvailable = vi.fn().mockReturnValue(true)
  const mockCallTool = vi.fn().mockResolvedValue({ status: 'saved' })

  // Mock bridge
  vi.doMock('../src/bridge.js', () => ({
    MnemoBridge: {
      getInstance: () => ({
        isAvailable: mockIsAvailable,
        callTool: mockCallTool
      })
    }
  }))

  // Re-mock logger for fresh module context if needed
  vi.doMock('../src/logger.js', () => ({
    logger: mockLogger
  }))

  const mod: AutoCapture = await import('../src/hooks/auto-capture.js')
  return { mod, mockIsAvailable, mockCallTool }
}

describe('security reproduction', () => {
  it('should log error message directly to avoid leaking sensitive data via toString()', async () => {
    const { mod, mockCallTool } = await freshModule()

    // Create a custom error object that has a safe 'message' but leaks secrets in 'toString()'
    const sensitiveError = {
      message: 'Something went wrong (safe)',
      toString: () => 'Error: Something went wrong with API_KEY=SECRET_12345',
      stack: 'Error stack...'
    }

    // Mock the tool call to reject with this sensitive error
    mockCallTool.mockRejectedValue(sensitiveError)

    // Trigger error path
    await mod.messageHook(
      {},
      {
        parts: [{ type: 'text', text: 'Always use secure coding practices' }]
      }
    )

    await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

    // Verify logger.error was called
    expect(mockLogger.error).toHaveBeenCalled()
    const logMessage = mockLogger.error.mock.calls[0][0]

    // Expect failure initially: current code interpolates `${error}`, which calls toString()
    // This leaks "API_KEY=SECRET_12345"

    // We want to ensure that the sensitive data is NOT present in the log
    expect(logMessage).not.toContain('API_KEY=SECRET_12345')

    // And verify that we DO see the safe message
    expect(logMessage).toContain('Something went wrong (safe)')
  })
})
