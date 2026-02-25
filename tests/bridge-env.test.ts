import { describe, expect, it } from 'vitest'
import { getSafeEnv } from '../src/env.js'

describe('getSafeEnv', () => {
  it('should filter out sensitive variables', () => {
    const mockEnv = {
      PATH: '/usr/bin',
      HOME: '/home/user',
      SECRET_KEY: 'super-secret',
      OPENAI_API_KEY: 'sk-12345',
      DB_PATH: '/tmp/test.db',
      MNEMO_CONFIG: 'some-config',
      UV_CACHE_DIR: '/cache',
      PYTHONPATH: '/lib/python',
      XDG_CONFIG_HOME: '/config',
      OTHER_VAR: 'should-be-gone'
    }

    const safeEnv = getSafeEnv(mockEnv)

    expect(safeEnv.PATH).toBe('/usr/bin')
    expect(safeEnv.HOME).toBe('/home/user')
    expect(safeEnv.DB_PATH).toBe('/tmp/test.db')
    expect(safeEnv.MNEMO_CONFIG).toBe('some-config')
    expect(safeEnv.UV_CACHE_DIR).toBe('/cache')
    expect(safeEnv.PYTHONPATH).toBe('/lib/python')
    expect(safeEnv.XDG_CONFIG_HOME).toBe('/config')

    expect(safeEnv.SECRET_KEY).toBeUndefined()
    expect(safeEnv.OPENAI_API_KEY).toBeUndefined()
    expect(safeEnv.OTHER_VAR).toBeUndefined()

    // Verify LOG_LEVEL override/default
    expect(safeEnv.LOG_LEVEL).toBe('WARNING')
  })

  it('should handle undefined values gracefully', () => {
    const mockEnv = {
      PATH: '/usr/bin',
      UNDEFINED_VAR: undefined
    }
    const safeEnv = getSafeEnv(mockEnv)
    expect(safeEnv.PATH).toBe('/usr/bin')
    expect(safeEnv.UNDEFINED_VAR).toBeUndefined()
  })

  it('should include Windows Path', () => {
    const mockEnv = {
      Path: 'C:\\Windows'
    }
    const safeEnv = getSafeEnv(mockEnv)
    expect(safeEnv.Path).toBe('C:\\Windows')
  })

  it('should include proxy variables', () => {
    const mockEnv = {
      HTTP_PROXY: 'http://proxy.com',
      https_proxy: 'http://proxy.com',
      NO_PROXY: 'localhost'
    }
    const safeEnv = getSafeEnv(mockEnv)
    expect(safeEnv.HTTP_PROXY).toBe('http://proxy.com')
    expect(safeEnv.https_proxy).toBe('http://proxy.com')
    expect(safeEnv.NO_PROXY).toBe('localhost')
  })
})
