/**
 * Auto-Capture Hook
 *
 * Buffers user messages from chat and extracts constraint-like patterns
 * (always/never/must/prefer/don't) when the session goes idle. Captured
 * constraints are stored as auto-captured rules in mnemo-mcp.
 *
 * Uses a content hash to prevent duplicate captures within the same session.
 * Core detection + storage logic delegated to memory-service.
 */

import type { Event } from '@opencode-ai/sdk'
import { MnemoBridge } from '../bridge.js'
import { captureConstraint, getProjectName, hashContent, IDLE_THRESHOLD } from '../core/memory-service.js'
import { logger } from '../logger.js'

/** Buffer of user message texts accumulated during the session */
const sessionBuffer: string[] = []

/** Set of content hashes already captured this session (dedup) */
const capturedHashes = new Set<string>()

/** Timestamp of last capture to enforce cooldown */
let lastCaptureTime = 0

/** Chat message hook: buffer user text parts */
export const messageHook = async (_input: unknown, output: { parts: { type: string; text?: string }[] }) => {
  const userText = output.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text as string)
    .join('\n')
    .trim()

  if (userText) {
    sessionBuffer.push(userText)
  }
}

/** Event hook: process buffer on session idle */
export const autoCaptureHook = async (input: { event: Event }, directory: string) => {
  if (input.event.type !== 'session.idle') return

  const now = Date.now()
  if (now - lastCaptureTime <= IDLE_THRESHOLD) return
  if (sessionBuffer.length === 0) return

  await processCapture(directory)
  lastCaptureTime = now
}

/** Extract constraints from buffered messages and store in mnemo-mcp */
async function processCapture(directory: string) {
  try {
    const bridge = MnemoBridge.getInstance()

    // Skip if bridge is unavailable (circuit breaker open)
    if (!bridge.isAvailable()) return

    const projectName = getProjectName(directory)

    const content = sessionBuffer.join('\n')
    sessionBuffer.length = 0

    // Dedup check
    const hash = hashContent(content)
    if (capturedHashes.has(hash)) return

    const captured = await captureConstraint(bridge, content, projectName)
    if (captured) {
      capturedHashes.add(hash)
      logger.info(`[Mnemo] Auto-captured a new rule for ${projectName}`)
    }
  } catch (error) {
    logger.error(`[Mnemo] Error in auto-capture: ${error}`)
  }
}
