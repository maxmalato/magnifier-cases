// Motor de regras, gerador e solucionador (spec, seções 4 a 6). TypeScript puro: sem I/O, sem
// APIs de navegador ou da Cloudflare, sem Math.random (só PRNG com semente).

/** Identificador do motor (o servidor e a simulação o registram junto dos resultados). */
export const ENGINE_ID = 'magnifier-cases/engine'

export * from './schema.ts'
export * from './types.ts'
export { difficulties, difficultyOf } from './data.ts'
export { createRng, normalizeSeed, type Rng } from './rng.ts'
export {
  applyEffect,
  canShowTable,
  candidates,
  candidatesOf,
  cardCost,
  clockAt,
  formatTime,
  startTime,
  TABLE_MIN_SCREEN_SIDE,
} from './rules.ts'
export { eliminationMask, solve, type SolveResult } from './solver.ts'
export {
  cardIdOf,
  fairnessProblems,
  generateMystery,
  generateMysteryWithStats,
  MysteryGenerationError,
  type GenerationResult,
  type Mystery,
} from './generator.ts'
export {
  activeSeatOf,
  actorsOf,
  hintOf,
  legalActions,
  newGame,
  parseAction,
  transition,
  viewFor,
  type NewGameInput,
} from './game.ts'
