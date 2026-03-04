import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * FileLogger prevents plugin logs from corrupting OpenCode's TUI.
 * It writes all logs and errors to a file instead of process.stdout/stderr.
 */
export class FileLogger {
  private logFile: string

  constructor() {
    try {
      const logDir = path.join(os.homedir(), '.mnemo-mcp')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      this.logFile = path.join(logDir, 'plugin.log')
    } catch {
      // Fallback if permission issues (e.g., sandbox)
      this.logFile = path.join(os.tmpdir(), 'mnemo-plugin.log')
    }
  }

  private write(level: string, message: string) {
    try {
      const timestamp = new Date().toISOString()
      fs.appendFileSync(this.logFile, `[${timestamp}] [${level}] ${message}\n`)
    } catch {
      // Silent catch to prevent crashing the host application
    }
  }

  info(msg: string) {
    this.write('INFO', msg)
  }

  error(msg: string | Error | unknown) {
    const message = msg instanceof Error ? msg.message : String(msg)
    this.write('ERROR', message)
  }
}

export const logger = new FileLogger()
