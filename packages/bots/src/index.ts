// Bots: `botMove` e `suggest`, funções puras só sobre a `PublicView` (spec, seção 9). Nunca
// recebem o estado completo nem a solução. Completam a equipe, assumem quem desconecta e são
// a régua da simulação; o ideal também dá a dica de jogada (só no Aprendiz).
import { createRng, type Action, type PublicView, type SeatId } from '@magnifier-cases/engine'
import { botParams, type BotParams } from './params.ts'
import { casualMove, idealMove, randomMove, type Decision } from './policies.ts'

/** Políticas: ideal (simulação e dica), casual (padrão na partida) e aleatória (linha de base). */
export const botSkills = ['ideal', 'casual', 'random'] as const
export type BotSkill = (typeof botSkills)[number]

export interface BotOptions {
  readonly skill: BotSkill
  /** Semente de decisão do bot (nunca a semente do mistério). */
  readonly seed: number
  /** Parâmetros (padrão: data/bot-params.json); a simulação pode passar outros. */
  readonly params?: BotParams
}

/** Mistura a semente do bot com o turno: cada jogada tem a própria sequência. */
function decisionSeed(seed: number, turn: number): number {
  let h = (seed ^ Math.imul(turn + 1, 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

/** Jogada e motivo; null se a partida acabou. */
export function botDecision(view: PublicView, _seat: SeatId, options: BotOptions): Decision | null {
  if (view.phase !== 'playing') return null
  const params = options.params ?? botParams
  const rng = createRng(decisionSeed(options.seed, view.turn))
  switch (options.skill) {
    case 'ideal':
      return idealMove(view)
    case 'casual':
      return casualMove(view, rng, params.casual)
    case 'random':
      return randomMove(view, rng, params.random)
  }
}

/** Jogada do bot (só com a visão pública). Lança erro se a partida já acabou. */
export function botMove(view: PublicView, seat: SeatId, options: BotOptions): Action {
  const decision = botDecision(view, seat, options)
  if (!decision) throw new Error('o bot não tem jogada: a partida acabou')
  return decision.action
}

/** Dica de jogada: a escolha do bot ideal, só quando o nível liga a dica. */
export function suggest(view: PublicView, seat: SeatId): Decision | null {
  if (!view.params.suggestEnabled) return null
  return botDecision(view, seat, { skill: 'ideal', seed: 0 })
}

export { botParams, BotParamsSchema, type BotParams } from './params.ts'
export {
  beliefOf,
  expectedAfter,
  expectedGain,
  guessingIsSafe,
  openPairs,
  type Pair,
} from './belief.ts'
export type { Decision } from './policies.ts'
