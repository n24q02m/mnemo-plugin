/**
 * Environment variable filtering to prevent secret leakage to child processes.
 */

// List of environment variables that are safe/necessary to pass to child processes
const ALLOWED_ENV_VARS = new Set([
  // System
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'LANG',
  'LC_ALL',
  'TERM',

  // Windows
  'SYSTEMROOT',
  'COMSPEC',
  'PATHEXT',
  'WINDIR',
  'APPDATA',
  'LOCALAPPDATA',

  // Proxy
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'ALL_PROXY',

  // Python/UV
  'PYTHONPATH',
  'UV_CACHE_DIR',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME'
])

export function getSafeEnv(): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {}

  for (const key in process.env) {
    if (
      ALLOWED_ENV_VARS.has(key) ||
      key.startsWith('MNEMO_') || // Allow project-specific vars
      key.startsWith('UV_') || // Allow UV configuration
      key.startsWith('PYTHON') || // Allow Python configuration
      key.startsWith('XDG_') // Allow XDG configuration
    ) {
      safeEnv[key] = process.env[key]
    }
  }

  return safeEnv
}
