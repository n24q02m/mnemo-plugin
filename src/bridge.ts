/**
 * MCP Client Bridge to mnemo-mcp
 *
 * Singleton class that manages a persistent MCP connection to the mnemo-mcp
 * Python server via stdio transport. Spawns `uvx mnemo-mcp` as a subprocess
 * and communicates via JSON-RPC 2.0.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

/** Result content item from MCP tool call */
interface ContentItem {
  type: string
  text?: string
}

export class MnemoBridge {
  private static instance: MnemoBridge
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private connecting: Promise<Client> | null = null
  private availableTools: Set<string> | null = null

  private constructor() {}

  public static getInstance(): MnemoBridge {
    if (!MnemoBridge.instance) {
      MnemoBridge.instance = new MnemoBridge()
    }
    return MnemoBridge.instance
  }

  /** Connect to mnemo-mcp server, reusing existing connection if available */
  public async connect(): Promise<Client> {
    if (this.client) return this.client

    // If already connecting, wait for that promise to resolve
    if (this.connecting) return this.connecting

    this.connecting = this.doConnect()
    try {
      const client = await this.connecting
      return client
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
      stderr: 'pipe',
      env: { ...process.env, LOG_LEVEL: 'WARNING' }
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

    await this.client.connect(this.transport)

    // Cache available tool names on first connect
    const toolsResult = await this.client.listTools()
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

    const result = await client.callTool(
      {
        name,
        arguments: args
      },
      CallToolResultSchema
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
