/**
 * mnemo-plugin - Universal Memory Plugin
 *
 * Default export: OpenCode platform adapter (backward-compatible).
 * Named exports: Platform adapters and core service for other runtimes.
 */

export type { MemoryResult } from './core/memory-service.js'
export {
  buildMemoryContext,
  captureConstraint,
  computeBudget,
  exportMemoriesAsMarkdown,
  fetchCompactionMemories,
  getProjectName,
  hashContent,
  SELF_AWARENESS
} from './core/memory-service.js'
export type { OmpContext, OmpPlugin } from './platforms/omp/index.js'
export { register as registerOmp } from './platforms/omp/index.js'
export { default } from './platforms/opencode/index.js'
