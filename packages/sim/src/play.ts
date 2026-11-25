// Uma partida inteira jogada por bots (todos os assentos com a mesma política).
import {
  clockAt,
  newGame,
  transition,
  viewFor,
  type DifficultyParams,
  type GameState,
  type ThemePack,
} from '@magnifier-cases/engine'
import { botMove, type BotOptions } from '@magnifier-cases/bots'

export type EndCause = 'won' | 'timeout-actions' | 'timeout-accusation'

export interface GameOutcome {
  readonly won: boolean
  readonly cause: EndCause
  /** Ações gastas (o relógio): ações do nível − ações restantes. */
  readonly actionsUsed: number
  /** Horário da vitória ("16:30"); null se o tempo esgotou. */
  readonly solvedAt: string | null
  readonly wrongAccusations: number
  readonly cardsOpened: number
}

export const SIM_SEATS = ['seat-1', 'seat-2', 'seat-3'] as const

export function playGame(
  params: DifficultyParams,
  theme: ThemePack,
  seed: number,
  bot: BotOptions,
): GameOutcome {
  let state: GameState = newGame({ params, theme, seats: SIM_SEATS, seed })
  let lastWasWrongAccusation = false
  // limite de segurança: toda ação gasta tempo ou encerra a partida
  for (let step = 0; step < 200 && state.phase === 'playing'; step++) {
    const seat = state.activeSeat
    const action = botMove(viewFor(state, seat), seat, bot)
    const result = transition(state, action, { seat })
    if (!result.ok) throw new Error(`o bot ${bot.skill} fez uma ação recusada: ${result.reason}`)
    lastWasWrongAccusation = result.events.some((e) => e.type === 'accused-wrong')
    state = result.state
  }
  if (state.phase === 'playing') throw new Error('a partida não terminou')
  const won = state.phase === 'won'
  const actionsUsed = params.actionsTotal - Math.max(0, state.actionsLeft)
  return {
    won,
    cause: won ? 'won' : lastWasWrongAccusation ? 'timeout-accusation' : 'timeout-actions',
    actionsUsed,
    solvedAt: won ? clockAt(params, state.actionsLeft) : null,
    wrongAccusations: state.wrongAccusations.length,
    cardsOpened: state.cards.filter((c) => c.opened).length,
  }
}
