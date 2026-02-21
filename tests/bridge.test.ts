/**
 * Integration tests for MnemoBridge MCP client.
 * Requires uvx and mnemo-mcp to be available in PATH.
 */

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MnemoBridge } from '../src/bridge.js'

describe('MnemoBridge MCP Client', () => {
  let bridge: MnemoBridge
  const tempDbPath = path.join(os.tmpdir(), `mnemo-test-${Date.now()}.db`)

  beforeAll(async () => {
    process.env.DB_PATH = tempDbPath
    bridge = MnemoBridge.getInstance()
    await bridge.connect()
  })

  afterAll(async () => {
    await bridge.shutdown()
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath)
    }
  })

  it('should connect and list tools via MCP', async () => {
    const client = await bridge.connect()
    const tools = await client.listTools()

    expect(tools.tools.length).toBeGreaterThan(0)
    const hasMemoryTool = tools.tools.some((t) => t.name === 'memory')
    expect(hasMemoryTool).toBe(true)
  })

  it('should add and search memory using callTool', async () => {
    const testContent = `MCP integration test secret ${Date.now()}`

    const addRes = await bridge.callTool('memory', {
      action: 'add',
      content: testContent,
      category: 'test',
      tags: ['integration-test', 'mcp']
    })

    expect(addRes.status).toBe('saved')
    expect(addRes.id).toBeDefined()

    const memId = addRes.id

    // Brief delay to ensure db is updated before search
    await new Promise((resolve) => setTimeout(resolve, 500))

    const searchRes = await bridge.callTool('memory', {
      action: 'search',
      query: testContent,
      limit: 10
    })

    expect(searchRes.count).toBeGreaterThan(0)
    expect(searchRes.results.length).toBeGreaterThan(0)

    // Find the specific memory by ID (don't assume ordering)
    const foundMem = searchRes.results.find((m: any) => m.id === memId)
    expect(foundMem).toBeDefined()
    expect(foundMem.content).toContain(testContent)
  })

  it('should delete memory by ID', async () => {
    const addRes = await bridge.callTool('memory', {
      action: 'add',
      content: `Temporary test memory ${Date.now()}`,
      category: 'test',
      tags: ['delete-test']
    })

    expect(addRes.id).toBeDefined()

    const deleteRes = await bridge.callTool('memory', {
      action: 'delete',
      memory_id: addRes.id
    })

    expect(deleteRes.id).toBe(addRes.id)
  })

  it('should get memory stats', async () => {
    const statsRes = await bridge.callTool('memory', {
      action: 'stats'
    })

    expect(statsRes).toBeDefined()
    expect(typeof statsRes.total_memories).toBe('number')
  })
})
