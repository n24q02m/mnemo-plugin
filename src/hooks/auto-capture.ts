import { logger } from '../logger.js'
/**
 * Auto-Capture Hook
 *
 * Buffers user messages from chat and extracts constraint-like patterns
 * (always/never/must/prefer/don't) when the session goes idle. Captured
 * constraints are stored as auto-captured rules in mnemo-mcp.
 *
 * Uses a content hash to prevent duplicate captures within the same session.
 */

import type { Event } from '@opencode-ai/sdk'
import { MnemoBridge } from '../bridge.js'

/** Buffer of user message texts accumulated during the session */
const sessionBuffer: string[] = []

/** Set of content hashes already captured this session (dedup) */
const capturedHashes = new Set<string>()

/** Timestamp of last capture to enforce cooldown */
let lastCaptureTime = 0

/** Minimum idle time before processing buffer (60 seconds) */
const IDLE_THRESHOLD = 60_000

/** Maximum content length to store per auto-capture */
const MAX_CAPTURE_LENGTH = 500

/** Maximum number of messages to keep in session buffer */
const MAX_SESSION_BUFFER_SIZE = 100

/** Regex to detect constraint-like user statements */
const CONSTRAINT_REGEX = /\b(always|never|must|prefer|don't|do not|should not|make sure|ensure|require)\b/i

/** Simple string hash for deduplication */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash.toString(36)
}

/** Extract project name from directory path */
function getProjectName(directory: string): string {
  const cleanDir = directory.replace(/\\/g, '/')
  const parts = cleanDir.split('/')
  return parts[parts.length - 1] || 'unknown'
}

/** Chat message hook: buffer user text parts */
export const messageHook = async (_input: unknown, output: { parts: { type: string; text?: string }[] }) => {
  const userText = output.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text as string)
    .join('\n')
    .trim()

  if (userText) {
    if (sessionBuffer.length >= MAX_SESSION_BUFFER_SIZE) {
      sessionBuffer.shift()
    }
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

    // Only capture if content looks like a constraint/preference
    if (!CONSTRAINT_REGEX.test(content)) return

    // Dedup check
    const hash = hashContent(content)
    if (capturedHashes.has(hash)) return
    capturedHashes.add(hash)

    const trimmedContent = content.length > MAX_CAPTURE_LENGTH ? `${content.slice(0, MAX_CAPTURE_LENGTH)}...` : content

    await bridge.callTool('memory', {
      action: 'add',
      content: `[Auto-captured for ${projectName}]: ${trimmedContent}`,
      category: 'auto-capture',
      tags: [projectName, 'preference']
    })

    logger.info(`[Mnemo] Auto-captured a new rule for ${projectName}`)
  } catch (error) {
    logger.error(`[Mnemo] Error in auto-capture: ${error}`)
  }
}
