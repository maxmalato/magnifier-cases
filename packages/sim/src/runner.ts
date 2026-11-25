// Simulação em lote (regras, seção 9; spec, seção 11): N mistérios por nível e por bot, com
// sementes fixas. Os mesmos mistérios são jogados por todos os bots (comparação pareada).
import {
  difficultyOf,
  generateMysteryWithStats,
  MysteryGenerationError,
  type LevelId,
  type ThemePack,
} from '@magnifier-cases/engine'
import type { BotParams, BotSkill } from '@magnifier-cases/bots'
import { playGame, type EndCause, type GameOutcome } from './play.ts'
import { fromMinutes, histogram, mean, toMinutes, wilson } from './stats.ts'

export interface SimOptions {
  readonly theme: ThemePack
  readonly levels: readonly LevelId[]
  readonly skills: readonly BotSkill[]
  readonly runs: number
  /** Semente do primeiro mistério; os seguintes usam baseSeed + i. */
  readonly baseSeed: number
  readonly botParams?: BotParams
  /** Relógio para medir o tempo de geração (injetado: a função continua testável). */
  readonly now?: () => number
}

export interface BotResult {
  readonly skill: BotSkill
  readonly games: number
  readonly winRate: number
  readonly winRateCi95: { readonly low: number; readonly high: number }
  readonly avgActionsUsed: number
  /** Horário médio de resolução (só vitórias). */
  readonly avgSolvedAt: string | null
  readonly endCauses: Record<EndCause, number>
  readonly avgWrongAccusations: number
  readonly avgCardsOpened: number
}

export interface LevelResult {
  readonly level: LevelId
  readonly mysteries: number
  readonly generationFailures: number
  /** Tentativas do gerador por mistério válido (1 = aceito de primeira). */
  readonly avgAttempts: number
  /** Distribuição da folga do caminho mais curto (oráculo). */
  readonly slack: Record<string, number>
  readonly avgMinCost: number
  /** Tempo médio para gerar um mistério (ms). Varia com a máquina. */
  readonly avgGenerationMs: number
  readonly bots: readonly BotResult[]
  /** Ideal − aleatório (pontos de proporção, 0..1); null se faltar algum dos dois. */
  readonly idealRandomGap: number | null
}

function summarize(skill: BotSkill, outcomes: readonly GameOutcome[]): BotResult {
  const wins = outcomes.filter((o) => o.won)
  const solvedTimes = wins.map((o) => toMinutes(o.solvedAt ?? '00:00'))
  const causes: Record<EndCause, number> = { won: 0, 'timeout-actions': 0, 'timeout-accusation': 0 }
  for (const o of outcomes) causes[o.cause]++
  return {
    skill,
    games: outcomes.length,
    winRate: outcomes.length ? wins.length / outcomes.length : 0,
    winRateCi95: wilson(wins.length, outcomes.length),
    avgActionsUsed: mean(outcomes.map((o) => o.actionsUsed)),
    avgSolvedAt: wins.length ? fromMinutes(mean(solvedTimes)) : null,
    endCauses: causes,
    avgWrongAccusations: mean(outcomes.map((o) => o.wrongAccusations)),
    avgCardsOpened: mean(outcomes.map((o) => o.cardsOpened)),
  }
}

export function simulateLevel(level: LevelId, options: SimOptions): LevelResult {
  const params = difficultyOf(level)
  const now = options.now ?? (() => 0)
  const seeds: number[] = []
  const attempts: number[] = []
  const slacks: number[] = []
  const minCosts: number[] = []
  let failures = 0
  let generationMs = 0
  for (let i = 0; i < options.runs; i++) {
    const seed = (options.baseSeed + i) >>> 0
    const start = now()
    try {
      const { mystery, attempts: tries } = generateMysteryWithStats(params, options.theme, seed)
      generationMs += now() - start
      seeds.push(seed)
      attempts.push(tries)
      slacks.push(mystery.oracle.slack)
      minCosts.push(mystery.oracle.minCost)
    } catch (error) {
      if (!(error instanceof MysteryGenerationError)) throw error
      failures++
    }
  }
  const bots = options.skills.map((skill) =>
    summarize(
      skill,
      seeds.map((seed, i) =>
        playGame(params, options.theme, seed, {
          skill,
          // semente de decisão própria, separada da semente do mistério
          seed: (0x5eed + i * 7919) >>> 0,
          ...(options.botParams ? { params: options.botParams } : {}),
        }),
      ),
    ),
  )
  const ideal = bots.find((b) => b.skill === 'ideal')
  const random = bots.find((b) => b.skill === 'random')
  return {
    level,
    mysteries: seeds.length,
    generationFailures: failures,
    avgAttempts: mean(attempts),
    slack: histogram(slacks),
    avgMinCost: mean(minCosts),
    avgGenerationMs: seeds.length ? generationMs / seeds.length : 0,
    bots,
    idealRandomGap: ideal && random ? ideal.winRate - random.winRate : null,
  }
}

export function simulate(options: SimOptions): LevelResult[] {
  return options.levels.map((level) => simulateLevel(level, options))
}
