// Simulação em lote com bots (spec, seção 11). Roda fora do `pnpm test`, pelo comando
// `pnpm simulate`.

/** Mistérios por nível e por bot no protocolo completo (regras, seção 9). */
export const FULL_RUN_SIZE = 10_000

export { checkTargets, type CheckIssue } from './check.ts'
export { playGame, type EndCause, type GameOutcome } from './play.ts'
export { toJson, toMarkdown, type ReportMeta } from './report.ts'
export {
  simulate,
  simulateLevel,
  type BotResult,
  type LevelResult,
  type SimOptions,
} from './runner.ts'
export { targetOf, targets, TargetsSchema } from './targets.ts'
