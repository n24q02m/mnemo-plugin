import { logger } from '../src/logger.js'
/**
 * Unit tests for auto-capture hooks — message buffering, constraint extraction, dedup.
 *
 * Each test gets a fresh set of hooks from the factory function.
 */

import { describe, expect, it, vi } from 'vitest'

/** Create fresh mock functions and hooks for each test */
async function freshHooks() {
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

  const { createAutoCaptureHooks } = await import('../src/hooks/auto-capture.js')
  const hooks = createAutoCaptureHooks()
  return { ...hooks, mockIsAvailable, mockCallTool }
}

describe('auto-capture', () => {
  describe('messageHook', () => {
    it('buffers text parts from output', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()
      const output = {
        parts: [
          { type: 'text', text: 'Hello world' },
          { type: 'image', data: 'abc' },
          { type: 'text', text: 'Always use TypeScript' }
        ]
      }

      await messageHook({}, output)
      // Buffer is populated; verified indirectly by triggering capture

      // Trigger capture to verify buffer content
      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')
      expect(mockCallTool).toHaveBeenCalledWith(
        'memory',
        expect.objectContaining({
          content: expect.stringContaining('Always use TypeScript')
        })
      )
    })

    it('ignores non-text parts', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()
      const output = {
        parts: [{ type: 'image', data: 'abc' }]
      }

      await messageHook({}, output)

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')
      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('ignores empty text', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()
      const output = {
        parts: [{ type: 'text', text: '   ' }]
      }

      await messageHook({}, output)

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')
      expect(mockCallTool).not.toHaveBeenCalled()
    })
  })

  describe('autoCaptureHook', () => {
    it('only triggers on session.idle event', async () => {
      const { autoCaptureHook, mockCallTool } = await freshHooks()

      await autoCaptureHook({ event: { type: 'session.start' } as any }, '/home/user/app')
      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('skips when buffer is empty', async () => {
      const { autoCaptureHook, mockCallTool } = await freshHooks()

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')
      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('captures constraint-like messages on idle', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()

      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'You must always use pnpm for package management' }]
        }
      )

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/my-project')

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
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()

      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Hello, how are you today?' }]
        }
      )

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('deduplicates identical content within session', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()

      // First capture
      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Always use strict mode' }]
        }
      )
      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(mockCallTool).toHaveBeenCalledTimes(1)

      // Same content again — buffer the same text
      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Always use strict mode' }]
        }
      )
      // Second capture attempt should be deduped by hash
      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      // Still only 1 call — second was deduped
      expect(mockCallTool).toHaveBeenCalledTimes(1)
    })

    it('skips when bridge is unavailable', async () => {
      const { messageHook, autoCaptureHook, mockIsAvailable, mockCallTool } = await freshHooks()
      mockIsAvailable.mockReturnValue(false)

      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'You must always test your code' }]
        }
      )

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('truncates long content to MAX_CAPTURE_LENGTH', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()
      const longConstraint = `You must always ${'follow this rule '.repeat(100)}`

      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: longConstraint }]
        }
      )

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      const callArgs = mockCallTool.mock.calls[0][1]
      // Content should be truncated (500 char limit + prefix)
      expect(callArgs.content.length).toBeLessThan(longConstraint.length)
    })

    it('catches errors without throwing', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()
      mockCallTool.mockRejectedValue(new Error('bridge down'))
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Never use var in JavaScript' }]
        }
      )

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

      expect(true).toBe(true)
      loggerSpy.mockRestore()
    })

    it('extracts project name from Windows path', async () => {
      const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()

      await messageHook(
        {},
        {
          parts: [{ type: 'text', text: 'Ensure all tests pass before commit' }]
        }
      )

      await autoCaptureHook({ event: { type: 'session.idle' } as any }, 'C:\\Users\\dev\\projects\\win-project')

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
        const { messageHook, autoCaptureHook, mockCallTool } = await freshHooks()

        await messageHook(
          {},
          {
            parts: [{ type: 'text', text: `You ${keyword} use this convention in code` }]
          }
        )

        await autoCaptureHook({ event: { type: 'session.idle' } as any }, '/home/user/app')

        expect(mockCallTool).toHaveBeenCalled()
      }
    })
  })
})
