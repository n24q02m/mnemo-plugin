import { logger } from '../src/logger.js'
/**
 * Unit tests for auto-capture hooks — message buffering, constraint extraction, dedup.
 *
 * Each test gets a fresh module instance because auto-capture.ts has
 * module-level mutable state (sessionBuffer, capturedHashes, lastCaptureTime).
 */

import { describe, expect, it, vi } from 'vitest'

// Dynamic import type for reset
type AutoCapture = typeof import('../src/hooks/auto-capture.js')

/** Create fresh mock functions and module for each test */
async function freshModule() {
  vi.resetModules()

  const mockIsAvailable = vi.fn().mockReturnValue(true)
  const mockCallTool = vi.fn().mockResolvedValue({ status: 'saved' })

  vi.doMock('../src/bridge.js', () => ({
    MnemoBridge: {
      getInstance: () => ({
        isAvailable: mockIsAvailable,
        callTool: mockCallTool
      })
    }
  }))

  const mod: AutoCapture = await import('../src/hooks/auto-capture.js')
  return { mod, mockIsAvailable, mockCallTool }
}

describe('auto-capture', () => {
  describe('messageHook', () => {
    it('buffers text parts from output', async () => {
      const { mod } = await freshModule()
      const output = {
        parts: [
          { type: 'text', text: 'Hello world' },
          { type: 'image', data: 'abc' },
          { type: 'text', text: 'Always use TypeScript' }
        ]
      }

      await mod.messageHook({}, output)
      // Buffer is populated; verified indirectly by triggering capture
    })

    it('ignores non-text parts', async () => {
      const { mod } = await freshModule()
      const output = {
        parts: [{ type: 'image', data: 'abc' }]
      }

      await mod.messageHook({}, output)
      // No text buffered
    })

    it('ignores empty text', async () => {
      const { mod } = await freshModule()
      const output = {
        parts: [{ type: 'text', text: '   ' }]
      }

      await mod.messageHook({}, output)
      // Whitespace-only is trimmed to empty, not buffered
    })
  })

  describe('autoCaptureHook', () => {
    it('only triggers on session.idle event', async () => {
      const { mod, mockCallTool } = await freshModule()

      await mod.autoCaptureHook({ event: { type: 'session.start' } as any }, '/home/user/app')
      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('skips when buffer is empty', async () => {
      const { mod, mockCallTool } = await freshModule()

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')
      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('captures constraint-like messages on idle', async () => {
      const { mod, mockCallTool } = await freshModule()

      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'You must always use pnpm for package management' }]
        }
      )

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/my-project')

      expect(mockCallTool).toHaveBeenCalledWith(
        'memory',
        expect.objectContaining({
          action: 'add',
          category: 'auto-capture',
          tags: ['my-project', 'preference']
        })
      )
    })

    it('skips non-constraint messages', async () => {
      const { mod, mockCallTool } = await freshModule()

      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Hello, how are you today?' }]
        }
      )

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('deduplicates identical content within session', async () => {
      const { mod, mockCallTool } = await freshModule()

      // First capture
      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Always use strict mode' }]
        }
      )
      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(mockCallTool).toHaveBeenCalledTimes(1)

      // Same content again — buffer the same text
      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Always use strict mode' }]
        }
      )
      // Second capture attempt should be deduped by hash
      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      // Still only 1 call — second was deduped
      expect(mockCallTool).toHaveBeenCalledTimes(1)
    })

    it('skips when bridge is unavailable', async () => {
      const { mod, mockIsAvailable, mockCallTool } = await freshModule()
      mockIsAvailable.mockReturnValue(false)

      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'You must always test your code' }]
        }
      )

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('truncates long content to MAX_CAPTURE_LENGTH', async () => {
      const { mod, mockCallTool } = await freshModule()
      const longConstraint = `You must always ${'follow this rule '.repeat(100)}`

      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: longConstraint }]
        }
      )

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      const callArgs = mockCallTool.mock.calls[0][1]
      // Content should be truncated (500 char limit + prefix)
      expect(callArgs.content.length).toBeLessThan(longConstraint.length)
    })

    it('catches errors without throwing', async () => {
      const { mod, mockCallTool } = await freshModule()
      mockCallTool.mockRejectedValue(new Error('bridge down'))
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Never use var in JavaScript' }]
        }
      )

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(true).toBe(true)
      loggerSpy.mockRestore()
    })

    it('extracts project name from Windows path', async () => {
      const { mod, mockCallTool } = await freshModule()

      await mod.messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Ensure all tests pass before commit' }]
        }
      )

      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, 'C:\\Users\\dev\\projects\\win-project')

      expect(mockCallTool).toHaveBeenCalledWith(
        'memory',
        expect.objectContaining({
          tags: ['win-project', 'preference']
        })
      )
    })

    it('matches various constraint keywords', async () => {
      const keywords = [
        'always',
        'never',
        'must',
        'prefer',
        "don't",
        'do not',
        'should not',
        'make sure',
        'ensure',
        'require'
      ]

      for (const keyword of keywords) {
        const { mod, mockCallTool } = await freshModule()

        await mod.messageHook(
          {},
          {
            parts: [{ type: 'text', text: `You ${keyword} use this convention in code` }]
          }
        )

        await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

        expect(mockCallTool).toHaveBeenCalled()
      }
    })

    it('discards irrelevant content immediately even if bridge is unavailable', async () => {
      vi.useFakeTimers()
      const { mod, mockIsAvailable, mockCallTool } = await freshModule()

      // 1. Bridge is DOWN
      mockIsAvailable.mockReturnValue(false)

      // 2. Add irrelevant message
      await mod.messageHook({}, { parts: [{ type: 'text', text: 'Just chatting about the weather' }] })

      // 3. Trigger idle - should clear buffer because content is irrelevant
      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/app')
      expect(mockCallTool).not.toHaveBeenCalled()

      // Advance time beyond cooldown
      vi.advanceTimersByTime(65000)

      // 4. Bridge is UP
      mockIsAvailable.mockReturnValue(true)

      // 5. Add relevant message
      await mod.messageHook({}, { parts: [{ type: 'text', text: 'You must always write tests' }] })

      // 6. Trigger idle - should only capture relevant message
      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/app')

      expect(mockCallTool).toHaveBeenCalledTimes(1)
      const callArgs = mockCallTool.mock.calls[0][1]

      // Irrelevant message should NOT be present (buffer was cleared in step 3)
      expect(callArgs.content).not.toContain('Just chatting about the weather')
      expect(callArgs.content).toContain('You must always write tests')

      vi.useRealTimers()
    })

    it('preserves relevant content in buffer when bridge is unavailable', async () => {
      vi.useFakeTimers()
      const { mod, mockIsAvailable, mockCallTool } = await freshModule()

      // 1. Bridge is DOWN
      mockIsAvailable.mockReturnValue(false)

      // 2. Add RELEVANT message
      await mod.messageHook({}, { parts: [{ type: 'text', text: 'You must always write clean code' }] })

      // 3. Trigger idle - bridge is down, so it should NOT capture, but buffer MUST be preserved
      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/app')
      expect(mockCallTool).not.toHaveBeenCalled()

      // Advance time beyond cooldown
      vi.advanceTimersByTime(65000)

      // 4. Bridge is UP
      mockIsAvailable.mockReturnValue(true)

      // 5. Trigger idle again (without adding new messages) - should process the PRESERVED buffer
      await mod.autoCaptureHook({ event: { type: 'session.idle' } as any }, '/app')

      expect(mockCallTool).toHaveBeenCalledTimes(1)
      const callArgs = mockCallTool.mock.calls[0][1]
      expect(callArgs.content).toContain('You must always write clean code')

      vi.useRealTimers()
    })
  })
})
