/**
 * Filter environment variables to prevent accidental secret leakage.
 * Only allows standard system variables, specific application prefixes,
 * and explicitly required variables.
 */
export function getSafeEnv(processEnv: Record<string, string | undefined>): Record<string, string> {
  const safeEnv: Record<string, string> = {}

  // 1. Explicitly allow-list standard variables
  const ALLOW_LIST = [
    // System paths
    'PATH',
    'Path', // Windows often uses mixed case
    'HOME',
    'USERPROFILE', // Windows
    'APPDATA', // Windows
    'LOCALAPPDATA', // Windows
    'TEMP',
    'TMP',
    'SYSTEMROOT', // Windows
    'SystemRoot', // Windows
    'DB_PATH', // Used in tests

    // Proxy configuration (often critical for corporate networks)
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
    'ALL_PROXY',
    'http_proxy',
    'https_proxy',
    'no_proxy',
    'all_proxy',

    // Terminal settings (sometimes needed for tools)
    'TERM',
    'COLORTERM'
  ]

  // 2. Allow-list by prefix
  const ALLOW_PREFIXES = ['UV_', 'MNEMO_', 'PYTHON', 'XDG_']

  for (const key of Object.keys(processEnv)) {
    const value = processEnv[key]
    if (value === undefined) continue

    if (ALLOW_LIST.includes(key)) {
      safeEnv[key] = value
      continue
    }

    for (const prefix of ALLOW_PREFIXES) {
      if (key.startsWith(prefix)) {
        safeEnv[key] = value
        break
      }
    }
  }

  // 3. Force LOG_LEVEL to WARNING
  safeEnv.LOG_LEVEL = 'WARNING'

  return safeEnv
}
