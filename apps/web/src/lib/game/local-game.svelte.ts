// Partida no modo de um aparelho. O estado completo (com a solução) vive só aqui, num campo
// privado; as telas só recebem a PublicView (viewFor), o mesmo caminho do modo online. Os bots
// jogam sozinhos na vez deles, com a política casual, depois que a equipe fecha a tela da
// última jogada. Nenhuma regra é calculada aqui: tudo passa pelo motor.
import { botMove, suggest, type Decision } from '@magnifier-cases/bots'
import {
  newGame,
  transition,
  viewFor,
  type Action,
  type CandidateLists,
  type DifficultyParams,
  type GameEvent,
  type GameState,
  type OpenedCard,
  type PublicView,
  type RefusalReason,
  type SeatId,
  type ThemePack,
} from '@magnifier-cases/engine'

export interface Seat {
  readonly id: SeatId
  readonly name: string
  readonly kind: 'human' | 'bot'
}

/** O que mudou no caderno com uma pista (para a tela "caderno atualizado"). */
export interface NotebookChange {
  readonly id: string
  readonly domain: 'suspects' | 'places'
  readonly change: 'discarded' | 'in-group'
  /** Tamanho do grupo, para "um dos N". */
  readonly groupSize?: number
}

/** Tela por cima do jogo depois de uma jogada. "OK" só fecha a tela; o estado já mudou. */
export type Overlay =
  | {
      readonly kind: 'clue'
      readonly via: 'investigate' | 'interrogate'
      readonly seat: Seat
      readonly card: OpenedCard
      /** Número da pista na ordem em que foi aberta. */
      readonly number: number
      readonly changes: readonly NotebookChange[]
      readonly next: Seat | null
    }
  | {
      readonly kind: 'wrong'
      readonly seat: Seat
      readonly suspectId: string
      readonly placeId: string
      readonly minutes: number
      readonly next: Seat | null
    }

export interface LocalGameOptions {
  readonly params: DifficultyParams
  readonly theme: ThemePack
  readonly seats: readonly Seat[]
  /** SECRETA: sorteada no aparelho. */
  readonly seed: number
  /** Semente de decisão dos bots (separada da semente do mistério). */
  readonly botSeed: number
  /** Espera antes de cada jogada de bot, para a equipe acompanhar (ms). */
  readonly botDelayMs: number
  /** Relógio de espera (injetado nos testes). */
  readonly wait?: (ms: number, run: () => void) => () => void
}

const defaultWait = (ms: number, run: () => void) => {
  const id = setTimeout(run, ms)
  return () => clearTimeout(id)
}

function changesBetween(before: CandidateLists, after: CandidateLists, card: OpenedCard) {
  const changes: NotebookChange[] = []
  for (const domain of ['suspects', 'places'] as const) {
    for (const id of before[domain]) {
      if (!after[domain].includes(id)) changes.push({ id, domain, change: 'discarded' })
    }
  }
  const e = card.effect
  if (e.kind === 'only-suspects' || e.kind === 'only-places') {
    const domain = e.kind === 'only-suspects' ? 'suspects' : 'places'
    for (const id of e.ids)
      if (after[domain].includes(id))
        changes.push({ id, domain, change: 'in-group', groupSize: e.ids.length })
  }
  return changes
}

export class LocalGame {
  /** SECRETO: nunca sai daqui; as telas usam `view`. */
  #state: GameState = $state.raw() as unknown as GameState
  readonly seats: readonly Seat[]
  readonly params: DifficultyParams
  view: PublicView = $derived(viewFor(this.#state))
  overlay: Overlay | null = $state(null)
  /** Última ida a outro lugar (aviso curto na tela da vez). */
  lastMove: { seat: Seat; placeId: string } | null = $state(null)
  readonly #options: LocalGameOptions
  #cancelBot: (() => void) | null = null

  constructor(options: LocalGameOptions) {
    this.#options = options
    this.seats = options.seats
    this.params = options.params
    this.#state = newGame({
      params: options.params,
      theme: options.theme,
      seats: options.seats.map((s) => s.id),
      seed: options.seed,
    })
  }

  seatOf(id: SeatId | null | undefined): Seat | null {
    return this.seats.find((s) => s.id === id) ?? null
  }

  get active(): Seat {
    return this.seatOf(this.view.activeSeat) as Seat
  }

  get isBotTurn(): boolean {
    return this.view.phase === 'playing' && this.active.kind === 'bot'
  }

  get isOver(): boolean {
    return this.view.phase !== 'playing'
  }

  /** Dica de jogada (só nos níveis que ligam a dica). */
  hint(): Decision | null {
    if (this.isBotTurn || this.isOver) return null
    return suggest(this.view, this.active.id)
  }

  /** Jogada de uma pessoa. Devolve o motivo da recusa, ou null se aceita. */
  act(action: Action): RefusalReason | null {
    if (this.isBotTurn || this.overlay) return 'not-your-turn'
    return this.#apply(action)
  }

  #apply(action: Action): RefusalReason | null {
    const seat = this.active
    const before = this.view.candidates
    const result = transition(this.#state, action, { seat: seat.id })
    if (!result.ok) return result.reason
    this.#state = result.state
    this.#present(seat, result.events, before)
    this.#scheduleBot()
    return null
  }

  #present(seat: Seat, events: readonly GameEvent[], before: CandidateLists): void {
    const next = this.isOver ? null : this.active
    for (const event of events) {
      if (event.type === 'moved') this.lastMove = { seat, placeId: event.placeId }
      if (event.type === 'clue-found' || event.type === 'testimony-given') {
        this.lastMove = null
        const number = this.view.opened.findIndex((c) => c.id === event.card.id) + 1
        this.overlay = {
          kind: 'clue',
          via: event.type === 'clue-found' ? 'investigate' : 'interrogate',
          seat,
          card: event.card,
          number,
          changes: changesBetween(before, this.view.candidates, event.card),
          next,
        }
      }
      if (event.type === 'accused-wrong' && !this.isOver) {
        this.lastMove = null
        this.overlay = {
          kind: 'wrong',
          seat,
          suspectId: event.suspectId,
          placeId: event.placeId,
          minutes: this.params.wrongAccusationCost * this.params.actionMinutes,
          next,
        }
      }
    }
    // fim de partida: a tela de revelação substitui qualquer sobreposição
    if (this.isOver) this.overlay = null
  }

  /** "OK": fecha a tela neste aparelho. A pista continua no caderno. */
  dismiss(): void {
    this.overlay = null
    this.#scheduleBot()
  }

  #scheduleBot(): void {
    this.#cancelBot?.()
    this.#cancelBot = null
    if (!this.isBotTurn || this.overlay) return
    const wait = this.#options.wait ?? defaultWait
    this.#cancelBot = wait(this.#options.botDelayMs, () => {
      this.#cancelBot = null
      if (!this.isBotTurn || this.overlay) return
      const seat = this.active
      const action = botMove(this.view, seat.id, {
        skill: 'casual',
        seed: this.#options.botSeed,
      })
      this.#apply(action)
    })
  }

  /** Começa a partida (se o primeiro assento for bot, ele joga). */
  start(): void {
    this.#scheduleBot()
  }

  /** Para os bots (sair da partida). */
  destroy(): void {
    this.#cancelBot?.()
    this.#cancelBot = null
  }
}
