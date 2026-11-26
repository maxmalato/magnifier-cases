// O jogo (magnifier-cases) visto pelo kit de salas (GameDefinition): liga o motor, o tema e os bots às
// salas. O estado só sai por viewFor (PublicView); o bot joga só com a visão.
import { botMove } from '@magnifier-cases/bots'
import { partyCake } from '@magnifier-cases/content'
import {
  activeSeatOf,
  actorsOf,
  difficultyOf,
  newGame,
  parseAction,
  transition,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type PublicView,
} from '@magnifier-cases/engine'
import type { GameDefinition } from '@magnifier-cases/kit'
import {
  defaultRoomConfig,
  parseRoomConfig,
  parseSuggestion,
  roomParams,
  type RoomConfig,
} from '@magnifier-cases/protocol'

/** Semente de decisão do bot a partir do assento (nunca a semente do mistério). */
function botSeedOf(seat: string): number {
  let h = 2166136261
  for (const ch of seat) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export const magnifierCases: GameDefinition<GameState, Action, GameEvent, RoomConfig, PublicView> =
  {
    id: 'magnifier-cases',
    minSeats: 2,
    maxSeats: 6,
    defaultConfig: defaultRoomConfig,
    parseConfig: parseRoomConfig,
    parseAction,
    parseSuggestion,
    maxSuggestionChangesPerTurn: roomParams.maxSuggestionChangesPerTurn,
    newGame: (config, seats, seed) =>
      newGame({ params: difficultyOf(config.level), theme: partyCake, seats, seed }),
    transition(state, action, seat) {
      const result = transition(state, action, { seat })
      return result.ok
        ? { ok: true, state: result.state, events: result.events }
        : { ok: false, reason: result.reason }
    },
    activeSeat: activeSeatOf,
    actorsOf,
    turnKey: (state) => String(state.turn),
    isOver: (state) => state.phase !== 'playing',
    viewFor: (state, viewer) => viewFor(state, viewer),
    // Os eventos só levam a solução no fim (revealed), quando ela já é pública.
    eventsFor: (events) => events,
    botMove: (view, seat) => botMove(view, seat, { skill: 'casual', seed: botSeedOf(seat) }),
  }
