/**
 * MCP Client Bridge to mnemo-mcp
 *
 * Singleton class that manages a persistent MCP connection to the mnemo-mcp
 * Python server via stdio transport. Spawns `uvx mnemo-mcp` as a subprocess
 * and communicates via JSON-RPC 2.0.
 *
 * Includes circuit breaker to prevent repeated connection attempts when
 * mnemo-mcp is unavailable, and timeouts to prevent indefinite hangs.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { getSafeEnv } from './env.js'

/** Result content item from MCP tool call */
interface ContentItem {
  type: string
  text?: string
}

/** Wrap a promise with a timeout. Rejects with TimeoutError if deadline exceeded. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/** Circuit breaker: stop retrying after repeated failures */
const MAX_FAILURES = 3

/** Cooldown period before resetting circuit breaker (5 minutes) */
const COOLDOWN_MS = 300_000

/** Timeout for MCP connection handshake (30 seconds) */
const CONNECT_TIMEOUT_MS = 30_000

/** Timeout for individual tool calls (15 seconds) */
const CALL_TIMEOUT_MS = 15_000

export class MnemoBridge {
  private static instance: MnemoBridge
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private connecting: Promise<Client> | null = null
  private availableTools: Set<string> | null = null

  /** Circuit breaker state */
  private failCount = 0
  private lastFailTime = 0

  private constructor() {}

  public static getInstance(): MnemoBridge {
    if (!MnemoBridge.instance) {
      MnemoBridge.instance = new MnemoBridge()
    }
    return MnemoBridge.instance
  }

  /**
   * Check if the bridge is likely available.
   * Returns false when circuit breaker is open (too many recent failures).
   * Hooks should check this before attempting calls to avoid log noise.
   */
  public isAvailable(): boolean {
    if (this.client) return true
    if (this.failCount < MAX_FAILURES) return true

    // Circuit breaker open -- check if cooldown has elapsed
    const elapsed = Date.now() - this.lastFailTime
    return elapsed >= COOLDOWN_MS
  }

  /** Connect to mnemo-mcp server, reusing existing connection if available */
  public async connect(): Promise<Client> {
    if (this.client) return this.client

    // Circuit breaker: reject immediately if too many recent failures
    if (this.failCount >= MAX_FAILURES) {
      const elapsed = Date.now() - this.lastFailTime
      if (elapsed < COOLDOWN_MS) {
        throw new Error('mnemo-mcp temporarily unavailable (circuit breaker open)')
      }
      // Cooldown elapsed -- reset and allow retry
      this.failCount = 0
    }

    // If already connecting, wait for that promise to resolve
    if (this.connecting) return this.connecting

    this.connecting = this.doConnect()
    try {
      const client = await this.connecting
      this.failCount = 0
      return client
    } catch (e) {
      this.failCount++
      this.lastFailTime = Date.now()
      throw e
    } finally {
      this.connecting = null
    }
  }

  private async doConnect(): Promise<Client> {
    // Use standard MCP stdio transport to run uvx mnemo-mcp
    // The @modelcontextprotocol/sdk uses cross-spawn internally which handles
    // Windows execution automatically, so we just use 'uvx' (not 'uvx.cmd')
    this.transport = new StdioClientTransport({
      command: 'uvx',
      args: ['mnemo-mcp'],
      stderr: 'ignore', // Prevent stderr backpressure and log noise
      env: getSafeEnv(process.env)
    })

    this.client = new Client(
      {
        name: 'mnemo-plugin',
        version: '0.0.0'
      },
      {
        capabilities: {}
      }
    )

    // Connect with timeout to prevent indefinite hang during first-run model download
    await withTimeout(this.client.connect(this.transport), CONNECT_TIMEOUT_MS, 'MCP connect')

    // Cache available tool names on first connect
    const toolsResult = await withTimeout(this.client.listTools(), CALL_TIMEOUT_MS, 'listTools')
    this.availableTools = new Set(toolsResult.tools.map((t) => t.name))

    return this.client
  }

  /**
   * Call a tool on the mnemo-mcp server.
   * Automatically connects if not already connected.
   * Returns the parsed JSON response from the tool.
   */
  public async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    const client = await this.connect()

    // Validate tool exists using cached list
    if (this.availableTools && !this.availableTools.has(name)) {
      throw new Error(`Tool "${name}" not found in mnemo-mcp server. Available: ${[...this.availableTools].join(', ')}`)
    }

    const result = await withTimeout(
      client.callTool(
        {
          name,
          arguments: args
        },
        CallToolResultSchema
      ),
      CALL_TIMEOUT_MS,
      `callTool(${name})`
    )

    if (result.isError) {
      const errorText =
        (result.content as ContentItem[]).find((c) => c.type === 'text')?.text || 'Unknown mnemo-mcp error'
      throw new Error(`mnemo-mcp error: ${errorText}`)
    }

    const textContent = (result.content as ContentItem[]).find((c) => c.type === 'text')?.text
    if (!textContent) {
      throw new Error('mnemo-mcp returned empty content')
    }

    try {
      return JSON.parse(textContent)
    } catch {
      // If not valid JSON, return the raw text
      return textContent
    }
  }

  /** Gracefully shut down the MCP connection and subprocess */
  public async shutdown(): Promise<void> {
    if (this.transport) {
      await this.transport.close()
      this.transport = null
      this.client = null
      this.availableTools = null
    }
  }
}
