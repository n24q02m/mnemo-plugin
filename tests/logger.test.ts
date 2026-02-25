import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileLogger } from '../src/logger'

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}))

const mockOs = vi.hoisted(() => ({
  homedir: vi.fn(),
  tmpdir: vi.fn(),
}))

const mockPath = vi.hoisted(() => ({
  join: vi.fn((...args: string[]) => args.join('/')),
}))

vi.mock('node:fs', () => ({
  default: mockFs,
  ...mockFs
}))

vi.mock('node:os', () => ({
  default: mockOs,
  ...mockOs
}))

vi.mock('node:path', () => ({
  default: mockPath,
  ...mockPath
}))

describe('FileLogger', () => {
  const homeDir = '/home/user'
  const tmpDir = '/tmp'
  const logDir = '/home/user/.mnemo-mcp'
  const pluginLog = '/home/user/.mnemo-mcp/plugin.log'
  const fallbackLog = '/tmp/mnemo-plugin.log'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default implementations
    mockOs.homedir.mockReturnValue(homeDir)
    mockOs.tmpdir.mockReturnValue(tmpDir)
    mockFs.existsSync.mockReturnValue(false)
    // mockPath.join is fixed implementation from hoisted
  })

  it('should use home directory for logs when accessible', () => {
    const logger = new FileLogger()

    expect(mockOs.homedir).toHaveBeenCalled()
    expect(mockPath.join).toHaveBeenCalledWith(homeDir, '.mnemo-mcp')
    expect(mockFs.existsSync).toHaveBeenCalledWith(logDir)
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true })

    logger.info('test message')

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      pluginLog,
      expect.stringContaining('[INFO] test message')
    )
  })

  it('should fall back to tmp directory if mkdirSync fails', () => {
    mockFs.mkdirSync.mockImplementationOnce(() => {
      throw new Error('Permission denied')
    })

    const logger = new FileLogger()

    expect(mockOs.homedir).toHaveBeenCalled()
    expect(mockOs.tmpdir).toHaveBeenCalled()

    logger.info('fallback message')

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      fallbackLog,
      expect.stringContaining('[INFO] fallback message')
    )
  })

  it('should format info messages correctly', () => {
    const logger = new FileLogger()
    const message = 'Test info message'

    logger.info(message)

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      pluginLog,
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test info message\n/)
    )
  })

  it('should format error messages correctly when passed a string', () => {
    const logger = new FileLogger()
    const message = 'Test error string'

    logger.error(message)

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      pluginLog,
      expect.stringMatching(/\[ERROR\] Test error string\n/)
    )
  })

  it('should format error messages correctly when passed an Error object', () => {
    const logger = new FileLogger()
    const error = new Error('Test error object')

    logger.error(error)

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      pluginLog,
      expect.stringMatching(/\[ERROR\] Test error object\n/)
    )
  })

  it('should format error messages correctly when passed an unknown object', () => {
    const logger = new FileLogger()
    const unknown = { foo: 'bar' }

    logger.error(unknown)

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      pluginLog,
      expect.stringMatching(/\[ERROR\] \[object Object\]\n/)
    )
  })

  it('should silently handle write errors', () => {
    const logger = new FileLogger()

    mockFs.appendFileSync.mockImplementationOnce(() => {
      throw new Error('Disk full')
    })

    expect(() => logger.info('This should not crash')).not.toThrow()
  })
})
