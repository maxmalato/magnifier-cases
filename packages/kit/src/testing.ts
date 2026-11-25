// Jogo fictício para testar o kit sem nenhum jogo real (prova que o kit é agnóstico).
// Inspirado no jogo de contagem do village-flood, com um segredo: um número escondido que
// os assentos tentam acertar. Cada palpite errado passa a vez; acertar encerra a partida.
import type { GameDefinition } from './definition.ts'

export interface GuessState {
  readonly seats: readonly string[]
  readonly turn: number
  /** SECRETO: nunca pode aparecer na visão antes do fim. */
  readonly secret: number
  readonly guesses: readonly number[]
  readonly won: boolean
}
export type GuessAction = { readonly type: 'guess'; readonly n: number }
export type GuessEvent =
  | { readonly type: 'missed'; readonly n: number }
  | { readonly type: 'won'; readonly secret: number }
export interface GuessConfig {
  readonly max: number
}
export interface GuessView {
  readonly activeSeat: string | null
  readonly guesses: readonly number[]
  readonly won: boolean
  readonly secret?: number
}

export const guessGame: GameDefinition<
  GuessState,
  GuessAction,
  GuessEvent,
  GuessConfig,
  GuessView
> = {
  id: 'guess',
  minSeats: 2,
  maxSeats: 3,
  defaultConfig: { max: 10 },
  parseConfig: (raw) =>
    typeof raw === 'object' && raw !== null && Number.isInteger((raw as GuessConfig).max)
      ? { max: (raw as GuessConfig).max }
      : null,
  parseAction: (raw) => {
    const a = raw as GuessAction | null
    return a?.type === 'guess' && Number.isInteger(a.n) ? { type: 'guess', n: a.n } : null
  },
  newGame: (config, seats, seed) => ({
    seats,
    turn: 0,
    secret: (seed % config.max) + 1,
    guesses: [],
    won: false,
  }),
  transition: (state, action) => {
    if (state.won) return { ok: false, reason: 'over' }
    if (state.guesses.includes(action.n)) return { ok: false, reason: 'repeated' }
    const guesses = [...state.guesses, action.n]
    if (action.n === state.secret) {
      return {
        ok: true,
        state: { ...state, guesses, won: true },
        events: [{ type: 'won', secret: state.secret }],
      }
    }
    return {
      ok: true,
      state: { ...state, guesses, turn: state.turn + 1 },
      events: [{ type: 'missed', n: action.n }],
    }
  },
  activeSeat: (state) =>
    state.won ? null : (state.seats[state.turn % state.seats.length] ?? null),
  actorsOf: (state) => {
    const active = guessGame.activeSeat(state)
    return active ? [active] : []
  },
  turnKey: (state) => String(state.turn),
  isOver: (state) => state.won,
  viewFor: (state) => ({
    activeSeat: guessGame.activeSeat(state),
    guesses: state.guesses,
    won: state.won,
    ...(state.won ? { secret: state.secret } : {}),
  }),
  eventsFor: (events) => events,
  botMove: (view) => {
    let n = 1
    while (view.guesses.includes(n)) n++
    return { type: 'guess', n }
  },
}
