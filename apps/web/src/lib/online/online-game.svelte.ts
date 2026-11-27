// Partida online: o controlador que as telas usam, alimentado pela conexão com a sala. O
// servidor aplica as ações; aqui só se envia o pedido, mostra a visão pública e monta as telas
// de resultado a partir dos eventos. O OK de cada tela só fecha a tela neste aparelho.
import { suggest as hintFor, type Decision } from '@magnifier-cases/bots'
import type { Action, GameEvent, PublicView, SeatId } from '@magnifier-cases/engine'
import { TABLE_SEAT, type Notice } from '@magnifier-cases/kit'
import {
  decodeSuggestion,
  type MagnifierRoomView,
  type SuggestionTarget,
} from '@magnifier-cases/protocol'
import {
  changesBetween,
  type GameController,
  type OnlineControls,
  type Overlay,
  type Seat,
  type SuggestionView,
} from '../game/controller.ts'
import { t } from '../locale.svelte.ts'
import type { MessageKey } from '../../i18n.ts'
import { RoomConnection } from './connection.svelte.ts'
import { cueFor } from '../sound/cues.ts'
import { sound } from '../sound/player.svelte.ts'

/** Recusas conhecidas do servidor durante a partida; as outras viram um aviso genérico. */
const KNOWN_ERRORS = new Set([
  'tooManySuggestions',
  'yourTurn',
  'notYourTurn',
  'invalidSuggestion',
  'notYourControl',
  'onlyHost',
  'tooManyRequests',
  'refused',
])

function errorText(code: string): string {
  return t((KNOWN_ERRORS.has(code) ? `error.${code}` : 'error.generic') as MessageKey)
}

/** Quanto tempo o aviso de conexão fica na tela (ms). */
const NOTICE_MS = 8000
/** Avisos ao mesmo tempo na tela. */
const MAX_NOTICES = 3

export class OnlineGame implements GameController {
  readonly connection: RoomConnection
  overlay: Overlay | null = $state(null)
  lastMove: { seat: Seat; placeId: string } | null = $state(null)
  /** Avisos de conexão na tela (os mais recentes; cada um some sozinho). */
  notices: string[] = $state([])
  /** Recusa da sala (código do servidor), mostrada na faixa de avisos ou no lobby. */
  error: string | null = $state(null)
  #errorTimer: ReturnType<typeof setTimeout> | null = null
  /** Timers dos avisos (não é estado da tela: só para limpar ao sair). */
  #noticeTimers: ReturnType<typeof setTimeout>[] = []
  readonly online: OnlineControls

  constructor(code: string, who: { token: string } | { name: string }) {
    this.connection = new RoomConnection(code, who, {
      onUpdate: (events, room, by) => this.#present(events, room, by),
      onNotice: (notice, room) => this.#announce(notice, room),
      onError: (errorCode) => this.#fail(errorCode),
    })
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- getters do objeto abaixo
    const game = this
    this.online = {
      get mySeat() {
        return game.mySeat
      },
      get code() {
        return game.connection.code
      },
      get suggestions() {
        return game.suggestions
      },
      get canSuggest() {
        return game.canSuggest
      },
      get suggestionsLeft() {
        return game.suggestionsLeft
      },
      get suggestionLimit() {
        return game.room?.suggestionLimit ?? 0
      },
      get error() {
        return game.error ? errorText(game.error) : null
      },
      get mySuggestion() {
        return game.suggestions.find((s) => s.seat.id === game.mySeat)?.target ?? null
      },
      suggest: (target: SuggestionTarget) => game.connection.send({ type: 'suggest', target }),
      unsuggest: () => game.connection.send({ type: 'unsuggest' }),
      get notices() {
        return game.notices
      },
      get reconnecting() {
        return game.connection.status === 'reconnecting'
      },
      get canPlayAgain() {
        return game.isHost
      },
    }
  }

  // ---------- sala ----------

  get room(): MagnifierRoomView | null {
    return this.connection.room
  }

  get mySeat(): SeatId | null {
    return this.connection.seat
  }

  /** Este aparelho é a mesa (tela grande): só mostra a partida. */
  get isTable(): boolean {
    return this.mySeat === TABLE_SEAT
  }

  get isHost(): boolean {
    return this.room !== null && this.room.host === this.mySeat
  }

  get seats(): Seat[] {
    return (this.room?.seats ?? []).map((s) => ({ id: s.seat, name: s.name, kind: s.kind }))
  }

  seatOf(id: SeatId | null | undefined): Seat | null {
    return this.seats.find((s) => s.id === id) ?? null
  }

  // ---------- partida (GameController) ----------

  get view(): PublicView {
    const game = this.room?.game
    if (!game) throw new Error('sem partida na sala')
    return game
  }

  get params() {
    return this.view.params
  }

  get active(): Seat {
    return (
      this.seatOf(this.view.activeSeat) ?? { id: this.view.activeSeat, name: '?', kind: 'human' }
    )
  }

  /** A vez é de um bot, ou do bot no lugar de quem caiu. */
  get isBotTurn(): boolean {
    if (this.isOver) return false
    const seat = this.room?.seats.find((s) => s.seat === this.view.activeSeat)
    return seat?.kind === 'bot' || seat?.presence === 'bot' || seat?.presence === 'returning'
  }

  get isOver(): boolean {
    return this.view.phase !== 'playing'
  }

  get canAct(): boolean {
    return (
      !this.isOver &&
      this.overlay === null &&
      this.mySeat !== null &&
      this.view.activeSeat === this.mySeat
    )
  }

  get canSuggest(): boolean {
    return (
      !this.isOver && this.mySeat !== null && !this.isTable && this.view.activeSeat !== this.mySeat
    )
  }

  /** Quantas vezes este aparelho ainda pode marcar ou trocar a sugestão nesta jogada. */
  get suggestionsLeft(): number {
    const room = this.room
    if (!room || this.mySeat === null) return 0
    return Math.max(0, room.suggestionLimit - (room.suggestionChanges[this.mySeat] ?? 0))
  }

  get suggestions(): SuggestionView[] {
    const list: SuggestionView[] = []
    for (const s of this.room?.suggestions ?? []) {
      const seat = this.seatOf(s.seat)
      const target = decodeSuggestion(s.target)
      if (seat && target) list.push({ seat, target })
    }
    return list
  }

  /** Só quem comanda a sala (ou qualquer pessoa, se quem comanda caiu), como no servidor. */
  get canEnd(): boolean {
    const room = this.room
    if (!room || this.isOver || this.isTable || this.mySeat === null) return false
    if (room.host === this.mySeat) return true
    const host = room.seats.find((s) => s.seat === room.host)
    return !host || host.presence !== 'connected'
  }

  end(): void {
    this.connection.send({ type: 'end' })
  }

  hint(): Decision | null {
    if (!this.canAct || this.mySeat === null) return null
    return hintFor(this.view, this.mySeat)
  }

  act(action: Action): void {
    this.error = null
    this.connection.send({ type: 'action', action })
  }

  dismiss(): void {
    this.overlay = null
  }

  // ---------- comandos da sala ----------

  setLevel(level: string) {
    this.connection.send({ type: 'config', config: { level } })
  }
  addBot() {
    this.connection.send({ type: 'add-bot' })
  }
  removeSeat(seat: SeatId) {
    this.connection.send({ type: 'remove-seat', seat })
  }
  start() {
    this.error = null
    this.connection.send({ type: 'start' })
  }
  playAgain() {
    this.overlay = null
    this.lastMove = null
    this.connection.send({ type: 'again' })
  }
  leave() {
    this.connection.leave()
  }
  /** Recusa do servidor: aparece por alguns segundos (nada falha em silêncio). */
  #fail(code: string) {
    this.error = code
    if (this.#errorTimer) clearTimeout(this.#errorTimer)
    this.#errorTimer = setTimeout(() => {
      this.error = null
    }, NOTICE_MS)
  }

  close() {
    if (this.#errorTimer) clearTimeout(this.#errorTimer)
    for (const timer of this.#noticeTimers) clearTimeout(timer)
    this.#noticeTimers = []
    this.connection.close()
  }

  // ---------- eventos ----------

  /** Monta a tela de resultado (a mesma da partida local) a partir dos eventos recebidos. */
  #present(events: readonly GameEvent[], room: MagnifierRoomView, by: SeatId | null) {
    const before = this.room?.game?.candidates
    const after = room.game
    if (!after) return
    const seatOf = (id: SeatId | null) => {
      const s = room.seats.find((x) => x.seat === id)
      return s ? { id: s.seat, name: s.name, kind: s.kind } : null
    }
    const seat = seatOf(by) ?? { id: by ?? '', name: '?', kind: 'human' as const }
    const next = after.phase === 'playing' ? seatOf(after.activeSeat) : null
    for (const event of events) {
      if (event.type === 'moved') this.lastMove = { seat, placeId: event.placeId }
      if ((event.type === 'clue-found' || event.type === 'testimony-given') && before) {
        this.lastMove = null
        this.overlay = {
          kind: 'clue',
          via: event.type === 'clue-found' ? 'investigate' : 'interrogate',
          seat,
          card: event.card,
          number: after.opened.findIndex((c) => c.id === event.card.id) + 1,
          changes: changesBetween(before, after.candidates, event.card),
          next,
        }
      }
      if (event.type === 'accused-wrong' && after.phase === 'playing') {
        this.lastMove = null
        this.overlay = {
          kind: 'wrong',
          seat,
          suspectId: event.suspectId,
          placeId: event.placeId,
          minutes: after.params.wrongAccusationCost * after.params.actionMinutes,
          next,
        }
      }
    }
    if (after.phase !== 'playing') this.overlay = null
    sound.play(this.#cue(events, room))
  }

  /**
   * Com a mesa na sala, a tela grande toca os sons da partida e os celulares só avisam "sua
   * vez". Sem mesa, cada celular toca tudo, e "sua vez" só no aparelho de quem vai jogar.
   */
  #cue(events: readonly GameEvent[], room: MagnifierRoomView) {
    if (this.isTable) return cueFor(events)
    if (room.table)
      return cueFor(
        events.filter((e) => e.type === 'turn-started'),
        this.mySeat,
      )
    return cueFor(events, this.mySeat)
  }

  #announce(notice: Notice, room: MagnifierRoomView) {
    const name = room.seats.find((s) => s.seat === notice.seat)?.name ?? '?'
    const key = {
      'player-away': 'notice.away',
      'bot-took-over': 'notice.botTookOver',
      'player-returned': 'notice.returned',
      'player-back-soon': 'notice.backSoon',
    } as const
    const text = t(key[notice.type], { name })
    this.notices = [...this.notices, text].slice(-MAX_NOTICES)
    const timer = setTimeout(() => {
      this.#noticeTimers = this.#noticeTimers.filter((t) => t !== timer)
      const i = this.notices.indexOf(text)
      if (i >= 0) this.notices = this.notices.filter((_, j) => j !== i)
    }, NOTICE_MS)
    this.#noticeTimers.push(timer)
  }
}
