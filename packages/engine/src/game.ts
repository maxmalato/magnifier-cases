// Estado da partida, `transition` e `viewFor` (spec, seções 4 e 5). Tudo puro: nada muta a
// entrada, nada lê relógio ou sorteia fora do PRNG. A única saída do estado é `viewFor`.
import { z } from 'zod'
import { generateMystery } from './generator.ts'
import { candidates, candidatesOf, clockAt } from './rules.ts'
import type { DifficultyParams, ThemePack } from './schema.ts'
import type {
  Action,
  CandidateLists,
  ClueCard,
  Ctx,
  GameEvent,
  GameState,
  HintData,
  NotebookEntry,
  OpenedCard,
  PublicView,
  Reveal,
  SeatId,
  TransitionResult,
} from './types.ts'

export interface NewGameInput {
  readonly params: DifficultyParams
  readonly theme: ThemePack
  /** Assentos na ordem fixa dos turnos (pessoas e bots). */
  readonly seats: readonly SeatId[]
  /** SECRETA: vem do servidor (ou do aparelho, no modo local). */
  readonly seed: number
}

/** Partida nova: gera o mistério e põe a equipe na Praça. */
export function newGame({ params, theme, seats, seed }: NewGameInput): GameState {
  if (seats.length === 0) throw new RangeError('a partida precisa de pelo menos um assento')
  if (new Set(seats).size !== seats.length) throw new RangeError('assentos repetidos')
  const mystery = generateMystery(params, theme, seed)
  return {
    level: params.id,
    params,
    seed,
    cast: mystery.cast,
    solution: mystery.solution,
    cards: mystery.cards,
    oracle: mystery.oracle,
    teamAt: 'square',
    actionsLeft: params.actionsTotal,
    seats: [...seats],
    activeSeat: seats[0] as SeatId,
    turn: 0,
    wrongAccusations: [],
    phase: 'playing',
  }
}

// ---------- Ações vindas de fora ----------

const id = z.string().min(1).max(64)
const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('move'), placeId: id }).strict(),
  z.object({ type: z.literal('investigate') }).strict(),
  z.object({ type: z.literal('interrogate'), suspectId: id }).strict(),
  z.object({ type: z.literal('accuse'), suspectId: id, placeId: id }).strict(),
])

/** Valida uma ação vinda do aparelho (formato). A regra é conferida por `transition`. */
export function parseAction(raw: unknown): Action | null {
  const parsed = ActionSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

// ---------- Transição ----------

function openedCard(card: ClueCard): OpenedCard {
  return {
    id: card.id,
    source: card.source,
    effect: card.effect,
    textKey: card.textKey,
    slots: card.slots,
    openedAtAction: card.openedAtAction ?? 0,
    openedBySeat: card.openedBySeat ?? '',
  }
}

export function hintOf(state: GameState): HintData {
  return { keyCardIds: state.oracle.keyCardIds, minCost: state.oracle.minCost }
}

/** Revelação: só quando a partida acaba (quem chama garante). */
function revealOf(state: GameState): Reveal {
  const keyCards = state.cards
    .filter((c) => state.oracle.keyCardIds.includes(c.id))
    .map(({ id, source, effect, textKey, slots, opened }) => ({
      id,
      source,
      effect,
      textKey,
      slots,
      opened,
    }))
  return {
    solution: state.solution,
    keyCardIds: state.oracle.keyCardIds,
    keyCards,
    hint: hintOf(state),
  }
}

const refuse = (reason: Extract<TransitionResult, { ok: false }>['reason']): TransitionResult => ({
  ok: false,
  reason,
})

/** Abre a carta (cópia nova; a lista original não muda). */
function openCard(state: GameState, cardId: string, seat: SeatId): readonly ClueCard[] {
  return state.cards.map((c) =>
    c.id === cardId
      ? { ...c, opened: true, openedAtAction: state.turn + 1, openedBySeat: seat }
      : c,
  )
}

/**
 * Aplica uma ação. Pura: devolve um estado novo e os eventos, ou o motivo da recusa (só um
 * código, nunca dados do mistério).
 */
export function transition(state: GameState, action: Action, ctx: Ctx): TransitionResult {
  if (state.phase !== 'playing') return refuse('game-over')
  if (ctx.seat !== state.activeSeat) return refuse('not-your-turn')
  const seat = ctx.seat
  const events: GameEvent[] = []
  let next: GameState
  let cost = 1

  switch (action.type) {
    case 'move': {
      if (!state.cast.places.includes(action.placeId)) return refuse('unknown-place')
      if (state.teamAt === action.placeId) return refuse('already-here')
      next = { ...state, teamAt: action.placeId }
      events.push({ type: 'moved', seat, placeId: action.placeId })
      break
    }
    case 'investigate': {
      if (state.teamAt === 'square') return refuse('not-at-place')
      const card = state.cards.find(
        (c) => c.source.type === 'place' && c.source.id === state.teamAt,
      )
      if (!card) return refuse('unknown-place')
      if (card.opened) return refuse('already-investigated')
      next = { ...state, cards: openCard(state, card.id, seat) }
      const opened = next.cards.find((c) => c.id === card.id) as ClueCard
      events.push({ type: 'clue-found', seat, card: openedCard(opened) })
      break
    }
    case 'interrogate': {
      const card = state.cards.find(
        (c) => c.source.type === 'suspect' && c.source.id === action.suspectId,
      )
      if (!card || !state.cast.suspects.includes(action.suspectId)) return refuse('unknown-suspect')
      if (card.opened) return refuse('already-interrogated')
      next = { ...state, cards: openCard(state, card.id, seat) }
      const opened = next.cards.find((c) => c.id === card.id) as ClueCard
      events.push({ type: 'testimony-given', seat, card: openedCard(opened) })
      break
    }
    case 'accuse': {
      if (state.actionsLeft < 1) return refuse('no-time')
      if (!state.cast.suspects.includes(action.suspectId)) return refuse('unknown-suspect')
      if (!state.cast.places.includes(action.placeId)) return refuse('unknown-place')
      const now = candidates(state)
      if (!now.suspects.includes(action.suspectId)) return refuse('suspect-eliminated')
      if (!now.places.includes(action.placeId)) return refuse('place-eliminated')
      if (
        state.wrongAccusations.some(
          (w) => w.suspectId === action.suspectId && w.placeId === action.placeId,
        )
      )
        return refuse('already-accused')
      const right =
        action.suspectId === state.solution.culpritId && action.placeId === state.solution.hideoutId
      if (right) {
        // acerto: vitória imediata, sem custo de tempo
        const won: GameState = { ...state, turn: state.turn + 1, phase: 'won' }
        events.push({
          type: 'won',
          seat,
          suspectId: action.suspectId,
          placeId: action.placeId,
        })
        events.push({ type: 'revealed', reveal: revealOf(won) })
        return { ok: true, state: won, events }
      }
      // erro: diz só que a dupla está errada (sem dizer qual metade) e custa tempo
      cost = state.params.wrongAccusationCost
      next = {
        ...state,
        wrongAccusations: [
          ...state.wrongAccusations,
          {
            suspectId: action.suspectId,
            placeId: action.placeId,
            atAction: state.turn + 1,
            seat,
          },
        ],
      }
      events.push({
        type: 'accused-wrong',
        seat,
        suspectId: action.suspectId,
        placeId: action.placeId,
      })
      break
    }
  }

  const before = candidates(state)
  const actionsLeft = next.actionsLeft - cost
  next = { ...next, actionsLeft, turn: state.turn + 1 }
  const after = candidates(next)
  if (
    after.suspects.length !== before.suspects.length ||
    after.places.length !== before.places.length
  ) {
    events.push({ type: 'candidates-changed', candidates: after })
  }
  events.push({
    type: 'clock-advanced',
    actionsLeft: Math.max(0, actionsLeft),
    clock: clockAt(next.params, actionsLeft),
  })

  if (actionsLeft <= 0) {
    // tempo esgotado (por ações ou por erro de acusação): revela a solução, sem punição
    next = { ...next, phase: 'timeout' }
    events.push({ type: 'timed-out' })
    events.push({ type: 'revealed', reveal: revealOf(next) })
    return { ok: true, state: next, events }
  }

  // a vez passa ao próximo assento, em ordem fixa
  const index = next.seats.indexOf(state.activeSeat)
  const activeSeat = next.seats[(index + 1) % next.seats.length] as SeatId
  next = { ...next, activeSeat }
  events.push({ type: 'turn-started', seat: activeSeat, turn: next.turn })
  return { ok: true, state: next, events }
}

/**
 * Encerra a partida antes do fim, a pedido da equipe (decisão de 27/11/2026): não é uma jogada
 * (não depende de quem tem a vez) e não gasta tempo. A partida termina e a resposta é revelada.
 * Quem pode pedir é decidido fora do motor (no online, só quem comanda a sala).
 */
export function endGame(state: GameState): TransitionResult {
  if (state.phase !== 'playing') return refuse('game-over')
  const next: GameState = { ...state, phase: 'ended' }
  return {
    ok: true,
    state: next,
    events: [{ type: 'ended' }, { type: 'revealed', reveal: revealOf(next) }],
  }
}

// ---------- Quem age ----------

/** Quem pode agir agora (o servidor recusa ação de qualquer outro). */
export function actorsOf(state: GameState): SeatId[] {
  return state.phase === 'playing' ? [state.activeSeat] : []
}

export function activeSeatOf(state: GameState): SeatId | null {
  return state.phase === 'playing' ? state.activeSeat : null
}

// ---------- Visão pública ----------

function notebookOf(
  ids: readonly string[],
  open: readonly string[],
  cards: readonly OpenedCard[],
  domain: 'suspects' | 'places',
): NotebookEntry[] {
  const exclude = domain === 'suspects' ? 'exclude-suspects' : 'exclude-places'
  const only = domain === 'suspects' ? 'only-suspects' : 'only-places'
  return ids.map((itemId) => {
    const byCardIds: string[] = []
    const inGroupOf: string[] = []
    for (const card of cards) {
      const e = card.effect
      if (e.kind === exclude && e.ids.includes(itemId)) byCardIds.push(card.id)
      if (e.kind === only) {
        if (e.ids.includes(itemId)) inGroupOf.push(card.id)
        else byCardIds.push(card.id)
      }
    }
    return {
      id: itemId,
      status: open.includes(itemId) ? 'open' : 'eliminated',
      byCardIds,
      inGroupOf,
    }
  })
}

/**
 * O que um assento ou a mesa pode ver. NÃO é a identidade: sem a solução, a semente, o oráculo
 * e o conteúdo das cartas fechadas. A revelação só entra quando a partida acaba. Neste jogo
 * cooperativo todos veem o mesmo; o parâmetro `_viewer` fica para o kit.
 */
export function viewFor(state: GameState, _viewer?: SeatId): PublicView {
  const opened = state.cards
    .filter((c) => c.opened)
    .map(openedCard)
    .sort((a, b) => a.openedAtAction - b.openedAtAction)
  const lists: CandidateLists = candidatesOf(state.cast, opened)
  const view: PublicView = {
    level: state.level,
    params: state.params,
    cast: state.cast,
    teamAt: state.teamAt,
    actionsLeft: Math.max(0, state.actionsLeft),
    clock: clockAt(state.params, state.actionsLeft),
    seats: state.seats,
    activeSeat: state.activeSeat,
    turn: state.turn,
    opened,
    unopened: state.cards.filter((c) => !c.opened).map((c) => ({ source: c.source })),
    candidates: lists,
    notebook: {
      suspects: notebookOf(state.cast.suspects, lists.suspects, opened, 'suspects'),
      places: notebookOf(state.cast.places, lists.places, opened, 'places'),
    },
    wrongAccusations: state.wrongAccusations.map(({ suspectId, placeId }) => ({
      suspectId,
      placeId,
    })),
    phase: state.phase,
  }
  return state.phase === 'playing' ? view : { ...view, reveal: revealOf(state) }
}

/**
 * Ações permitidas agora, a partir só da visão pública (para os bots e para a interface
 * mostrar o que está bloqueado). `transition` aceita todas elas.
 */
export function legalActions(view: PublicView): Action[] {
  if (view.phase !== 'playing') return []
  const actions: Action[] = []
  for (const placeId of view.cast.places) {
    if (placeId !== view.teamAt) actions.push({ type: 'move', placeId })
  }
  const closed = (type: 'place' | 'suspect', itemId: string) =>
    view.unopened.some((u) => u.source.type === type && u.source.id === itemId)
  if (view.teamAt !== 'square' && closed('place', view.teamAt))
    actions.push({ type: 'investigate' })
  for (const suspectId of view.cast.suspects) {
    if (closed('suspect', suspectId)) actions.push({ type: 'interrogate', suspectId })
  }
  if (view.actionsLeft >= 1) {
    for (const suspectId of view.candidates.suspects) {
      for (const placeId of view.candidates.places) {
        const tried = view.wrongAccusations.some(
          (w) => w.suspectId === suspectId && w.placeId === placeId,
        )
        if (!tried) actions.push({ type: 'accuse', suspectId, placeId })
      }
    }
  }
  return actions
}
