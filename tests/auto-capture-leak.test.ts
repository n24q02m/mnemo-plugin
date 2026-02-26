
import { describe, expect, it, vi } from 'vitest'

// Dynamic import type for reset
type AutoCapture = typeof import('../src/hooks/auto-capture.js')

/** Create fresh mock functions and module for each test */
async function freshModule() {
  vi.resetModules()

  // Default to true, can be changed in test
  let available = true
  const mockIsAvailable = vi.fn().mockImplementation(() => available)
  const mockCallTool = vi.fn().mockResolvedValue({ status: 'saved' })

  // Use hoisted variable for setAvailable to modify available inside mock
  // This is a bit tricky with vi.doMock, so we'll just expose a setter via mockIsAvailable

  vi.doMock('../src/bridge.js', () => ({
    MnemoBridge: {
      getInstance: () => ({
        isAvailable: mockIsAvailable,
        callTool: mockCallTool
      })
    }
  }))

  const mod: AutoCapture = await import('../src/hooks/auto-capture.js')

  return { mod, mockIsAvailable, mockCallTool, setAvailable: (val: boolean) => { available = val } }
}

describe('auto-capture leak reproduction', () => {
    it('does NOT retain irrelevant messages when bridge is unavailable', async () => {
        vi.useFakeTimers()
        const { mod, mockCallTool, setAvailable } = await freshModule()

        // 1. Bridge is DOWN
        setAvailable(false)

        // 2. User sends irrelevant message
        await mod.messageHook({}, {
            parts: [{ type: 'text', text: 'This is just noise' }]
        })

        // 3. Trigger idle (attempt capture)
        // Ensure enough time passed for IDLE_THRESHOLD if needed, but fresh module starts at 0.
        // We set system time to something large to ensure first run works.
        vi.setSystemTime(100000)
        await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/app')

        // Should NOT have called tool because bridge is down
        expect(mockCallTool).not.toHaveBeenCalled()

        // 4. Bridge is UP
        setAvailable(true)

        // 5. User sends constraint message
        await mod.messageHook({}, {
            parts: [{ type: 'text', text: 'You must always be secure' }]
        })

        // 6. Trigger idle again
        // Advance time to pass IDLE_THRESHOLD (60s)
        vi.setSystemTime(100000 + 61000)
        await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/app')

        // 7. Verify what was captured
        expect(mockCallTool).toHaveBeenCalledTimes(1)
        const callArgs = mockCallTool.mock.calls[0][1]

        // FIX CONFIRMED: The content should NOT include the noise
        expect(callArgs.content).not.toContain('This is just noise')
        expect(callArgs.content).toContain('You must always be secure')

        vi.useRealTimers()
    })
})
