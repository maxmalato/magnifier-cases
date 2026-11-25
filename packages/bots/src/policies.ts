// Políticas dos bots (spec, seção 9). Funções puras sobre a PublicView: a mesma visão e a mesma
// semente de decisão dão sempre a mesma jogada. A política do bot ideal:
//
//   1. Se resta uma dupla, acusa.
//   2. Se acusar todas as duplas restantes, uma por vez, cabe no relógio, acusa (vitória certa).
//   3. Se é a última ação, acusa (chute).
//   4. Senão, abre a carta com maior ganho esperado por ação (log2 das duplas antes e depois,
//      pela mistura de pistas do nível; suspeito = 1 ação, lugar = 2, ou 1 se a equipe já está
//      lá), desde que sobre ao menos 1 ação para acusar depois.
//   5. Sem carta útil que caiba no relógio, acusa (chute).
//
// O casual é o ideal com defeitos (dados em bot-params.json). O aleatório abre cartas ao acaso.
import type { Action, CardSource, PublicView } from '@magnifier-cases/engine'
import type { Rng } from '@magnifier-cases/engine'
import {
  beliefOf,
  costToOpen,
  expectedGain,
  guessingIsSafe,
  openPairs,
  type Pair,
} from './belief.ts'
import { botParams, type BotParams } from './params.ts'

/** Ação que abre (ou vai abrir) a carta desta origem. */
function actionToOpen(view: PublicView, source: CardSource): Action {
  if (source.type === 'suspect') return { type: 'interrogate', suspectId: source.id }
  return view.teamAt === source.id ? { type: 'investigate' } : { type: 'move', placeId: source.id }
}

const accuse = (pair: Pair): Action => ({
  type: 'accuse',
  suspectId: pair.suspectId,
  placeId: pair.placeId,
})

/** Cartas fechadas que cabem no relógio deixando 1 ação para acusar. */
function affordable(view: PublicView): CardSource[] {
  return view.unopened
    .map((u) => u.source)
    .filter((source) => costToOpen(view, source) <= view.actionsLeft - 1)
}

export interface Decision {
  readonly action: Action
  /** Por que o bot escolheu (para a dica de jogada e os testes). */
  readonly reason:
    | 'solved'
    | 'safe-guess'
    | 'last-action'
    | 'best-card'
    | 'no-useful-card'
    | 'mistake'
    | 'early-guess'
    | 'random-card'
}

function idealDecision(
  view: PublicView,
  ignorePartial: boolean,
  pick: (pairs: Pair[]) => Pair,
): Decision | null {
  const belief = beliefOf(view, ignorePartial)
  const pairs = openPairs(view, belief)
  // sem dupla possível na crença (não deveria acontecer): usa os candidatos do motor
  const options = pairs.length > 0 ? pairs : openPairs(view)
  if (options.length === 0) return null
  if (options.length === 1) return { action: accuse(options[0] as Pair), reason: 'solved' }
  if (guessingIsSafe(view, options.length))
    return { action: accuse(pick(options)), reason: 'safe-guess' }
  if (view.actionsLeft <= 1) return { action: accuse(pick(options)), reason: 'last-action' }
  let best: { source: CardSource; score: number } | null = null
  for (const source of affordable(view)) {
    const score = expectedGain(view, source, belief) / costToOpen(view, source)
    if (score > 1e-9 && (best === null || score > best.score)) best = { source, score }
  }
  if (best) return { action: actionToOpen(view, best.source), reason: 'best-card' }
  return { action: accuse(pick(options)), reason: 'no-useful-card' }
}

/** Bot ideal: determinístico (empate fica com a primeira opção). */
export function idealMove(view: PublicView): Decision | null {
  return idealDecision(view, false, (pairs) => pairs[0] as Pair)
}

export function casualMove(
  view: PublicView,
  rng: Rng,
  params: BotParams['casual'],
): Decision | null {
  const pick = (pairs: Pair[]) => rng.pick(pairs)
  const pairs = openPairs(view)
  if (pairs.length === 0) return null
  if (
    pairs.length > 1 &&
    pairs.length <= params.earlyAccuseMaxPairs &&
    rng.next() < params.earlyAccuseRate
  )
    return { action: accuse(pick(pairs)), reason: 'early-guess' }
  if (pairs.length > 1 && view.actionsLeft > 1 && rng.next() < params.mistakeRate) {
    const options = affordable(view)
    if (options.length > 0)
      return { action: actionToOpen(view, rng.pick(options)), reason: 'mistake' }
  }
  return idealDecision(view, rng.next() < params.ignorePartialRate, pick)
}

export function randomMove(
  view: PublicView,
  rng: Rng,
  params: BotParams['random'],
): Decision | null {
  const pairs = openPairs(view)
  if (pairs.length === 0) return null
  if (pairs.length <= params.accuseMaxPairs || view.actionsLeft <= 1)
    return {
      action: accuse(rng.pick(pairs)),
      reason: pairs.length === 1 ? 'solved' : 'last-action',
    }
  // já está num lugar com carta fechada: investiga; senão, escolhe uma carta fechada qualquer
  const here = view.unopened.find((u) => u.source.type === 'place' && u.source.id === view.teamAt)
  if (here) return { action: { type: 'investigate' }, reason: 'random-card' }
  const options = view.unopened.map((u) => u.source)
  if (options.length === 0) return { action: accuse(rng.pick(pairs)), reason: 'no-useful-card' }
  return { action: actionToOpen(view, rng.pick(options)), reason: 'random-card' }
}

export const defaultBotParams = botParams
