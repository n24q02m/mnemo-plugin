/** Extract project name from directory path */
export function getProjectName(directory: string): string {
  const cleanDir = directory.replace(/\\/g, '/')
  const parts = cleanDir.split('/')
  return parts[parts.length - 1] || 'unknown'
}
