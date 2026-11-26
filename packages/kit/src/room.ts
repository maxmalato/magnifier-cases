// Núcleo da sala: funções puras sobre um registro serializável (sem rede, sem relógio, sem
// aleatoriedade própria). O servidor (Durable Object) guarda o registro, entrega as mensagens
// e chama `tick` no alarme. Desconexão: regras, seção 8; spec, seção 9.
// Origem: village-flood, packages/kit/src/room.ts (commit dc9b801). Mudanças:
// - o estado do jogo nunca sai: `viewOf` monta a visão de cada destinatário com `viewFor`;
// - o bot joga só com a visão pública;
// - sem perfil de assento (papéis só depois da v1);
// - uma sugestão ativa por jogador (opinar), com limite de trocas por turno, no lugar dos pings;
// - mesa sem telas por cima (o caderno completo na TV é decidido na Etapa 5).
import { MAX_NAME_LENGTH, ROOM_TTL_MS, TABLE_SEAT, type RoomTimings } from './constants.ts'
import type { GameDefinition, SeatId, Viewer } from './definition.ts'
import type { Notice } from './messages.ts'

export type RoomStatus = 'lobby' | 'playing' | 'over'

/**
 * Presença de um assento de pessoa:
 * - connected: a pessoa está conectada e joga;
 * - away: a conexão caiu e o bot ainda não assumiu;
 * - bot: o bot joga no lugar dela;
 * - returning: ela voltou e retoma o controle no início do próprio turno seguinte.
 */
export type Presence = 'connected' | 'away' | 'bot' | 'returning'

export interface SeatRecord {
  readonly seat: SeatId
  /** Apelido digitado (pessoas, até 20 caracteres); bots recebem "Bot 1", "Bot 2"... */
  readonly name: string
  readonly kind: 'human' | 'bot'
  /** SHA-256 do token do aparelho; o token em si nunca é guardado. */
  readonly tokenHash: string | null
  readonly presence: Presence
  /** Quando o bot assume a vez de quem caiu (só durante a vez da pessoa). */
  readonly takeoverAt: number | null
}

/** Sugestão (opinar): um jogador fora da vez marca uma opção. Fora do estado do jogo. */
export interface Suggestion {
  readonly seat: SeatId
  readonly target: string
}

/** Mesa (modo mesa): conectada ou não. */
export interface TableRecord {
  /** SHA-256 do token da mesa; o token em si nunca é guardado. */
  readonly tokenHash: string
  readonly connected: boolean
}

export interface RoomRecord<S, C> {
  readonly code: string
  readonly status: RoomStatus
  /** Quem criou a sala e comanda (começar, bots, jogar de novo). */
  readonly host: SeatId | null
  readonly seats: readonly SeatRecord[]
  readonly config: C
  /** Estado completo do jogo, com os segredos. Nunca sai da sala: só pela visão. */
  readonly game: S | null
  readonly turnKey: string | null
  /** Sugestões do turno atual (uma por jogador; apagadas quando a vez muda). */
  readonly suggestions: readonly Suggestion[]
  /** Quantas vezes cada jogador marcou ou trocou a sugestão neste turno. */
  readonly suggestionChanges: Readonly<Record<SeatId, number>>
  /** Próxima jogada de bot (null: ninguém do bot na vez). */
  readonly nextBotAt: number | null
  readonly nextSeatNumber: number
  /** Modo mesa; null numa sala sem mesa. */
  readonly table: TableRecord | null
  readonly createdAt: number
  readonly lastActivity: number
}

/** Resultado de uma operação: o novo registro, os eventos do jogo e os avisos para a equipe. */
export interface Outcome<S, E, C> {
  readonly record: RoomRecord<S, C>
  readonly events: readonly E[]
  readonly notices: readonly Notice[]
  readonly error?: string
  /** Quem fez a jogada (para a interface animar). */
  readonly by: SeatId | null
}

export interface SeatView {
  readonly seat: SeatId
  readonly name: string
  readonly kind: 'human' | 'bot'
  readonly presence: Presence
  /**
   * Quanto falta (ms) para o bot assumir a vez de quem caiu, contado no momento da mensagem;
   * null se não há prazo correndo. Relativo, para não depender do relógio de cada aparelho.
   */
  readonly takeoverInMs: number | null
}

/** O que um aparelho vê da sala. Nunca inclui tokens nem o estado completo do jogo. */
export interface RoomView<V, C> {
  readonly code: string
  readonly status: RoomStatus
  readonly host: SeatId | null
  readonly seats: readonly SeatView[]
  readonly config: C
  /** Visão do jogo para este destinatário (viewFor). */
  readonly game: V | null
  readonly suggestions: readonly Suggestion[]
  /** Quantas vezes cada jogador já marcou ou trocou a sugestão nesta vez (para avisar o limite). */
  readonly suggestionChanges: Readonly<Record<SeatId, number>>
  /** Limite de trocas de sugestão por vez (dados do jogo). */
  readonly suggestionLimit: number
  readonly table: { readonly connected: boolean } | null
}

type Def<S, A, E, C, V> = GameDefinition<S, A, E, C, V>

// ---------- Criação e visão ----------

/** Sala nova. Com `tableTokenHash`, quem abriu foi a mesa (modo mesa). */
export function createRoom<S, C>(
  code: string,
  config: C,
  now: number,
  tableTokenHash: string | null = null,
): RoomRecord<S, C> {
  return {
    code,
    status: 'lobby',
    host: null,
    seats: [],
    config,
    game: null,
    turnKey: null,
    suggestions: [],
    suggestionChanges: {},
    nextBotAt: null,
    nextSeatNumber: 1,
    table: tableTokenHash ? { tokenHash: tableTokenHash, connected: false } : null,
    createdAt: now,
    lastActivity: now,
  }
}

/** Visão da sala para um destinatário: o jogo só sai por `viewFor`. */
export function viewOf<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  viewer: Viewer,
  now = record.lastActivity,
): RoomView<V, C> {
  return {
    code: record.code,
    status: record.status,
    host: record.host,
    seats: record.seats.map(({ seat, name, kind, presence, takeoverAt }) => ({
      seat,
      name,
      kind,
      presence,
      takeoverInMs: takeoverAt === null ? null : Math.max(0, takeoverAt - now),
    })),
    config: record.config,
    game: record.game === null ? null : def.viewFor(record.game, viewer),
    suggestions: record.suggestions,
    suggestionChanges: record.suggestionChanges,
    suggestionLimit: def.maxSuggestionChangesPerTurn,
    table: record.table ? { connected: record.table.connected } : null,
  }
}

/** Quem controla o assento agora: a pessoa, o bot, ou ninguém (caiu e o bot ainda não assumiu). */
export function controllerOf(seat: SeatRecord): 'human' | 'bot' | 'none' {
  if (seat.kind === 'bot') return 'bot'
  if (seat.presence === 'connected') return 'human'
  if (seat.presence === 'away') return 'none'
  return 'bot'
}

/** Quando o servidor precisa acordar (bot jogar, bot assumir ou sala expirar). */
export function nextWake<S, C>(record: RoomRecord<S, C>): number {
  let next = record.lastActivity + ROOM_TTL_MS
  if (record.nextBotAt !== null) next = Math.min(next, record.nextBotAt)
  for (const seat of record.seats) {
    if (seat.takeoverAt !== null) next = Math.min(next, seat.takeoverAt)
  }
  return next
}

export function isExpired<S, C>(record: RoomRecord<S, C>, now: number): boolean {
  return now >= record.lastActivity + ROOM_TTL_MS
}

// ---------- Auxiliares ----------

function ok<S, E, C>(
  record: RoomRecord<S, C>,
  extra: { events?: readonly E[]; notices?: readonly Notice[]; by?: SeatId | null } = {},
): Outcome<S, E, C> {
  return { record, events: extra.events ?? [], notices: extra.notices ?? [], by: extra.by ?? null }
}

/** Recusa: só um código (nunca dados do jogo). */
function fail<S, E, C>(record: RoomRecord<S, C>, error: string, detail?: string): Outcome<S, E, C> {
  return { record, events: [], notices: [], by: null, error: detail ? `${error}:${detail}` : error }
}

function patchSeat<S, C>(
  record: RoomRecord<S, C>,
  seat: SeatId,
  patch: Partial<SeatRecord>,
): RoomRecord<S, C> {
  return { ...record, seats: record.seats.map((s) => (s.seat === seat ? { ...s, ...patch } : s)) }
}

const findSeat = <S, C>(record: RoomRecord<S, C>, seat: SeatId) =>
  record.seats.find((s) => s.seat === seat)

/** Quem comanda a sala: quem criou; se caiu, qualquer pessoa conectada (para não travar). */
export function canCommand<S, C>(record: RoomRecord<S, C>, seat: SeatId): boolean {
  const me = findSeat(record, seat)
  if (!me || me.kind !== 'human' || me.presence !== 'connected') return false
  if (record.host === seat) return true
  const host = record.host ? findSeat(record, record.host) : undefined
  return !host || host.presence !== 'connected'
}

function touch<S, C>(record: RoomRecord<S, C>, now: number): RoomRecord<S, C> {
  return { ...record, lastActivity: now }
}

// ---------- Entrada e saída ----------

/** Pessoa nova (só no lobby). O servidor gera o token e passa só o hash. */
export function joinRoom<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  rawName: string,
  tokenHash: string,
  now: number,
): Outcome<S, E, C> & { seat?: SeatId } {
  if (record.status !== 'lobby') return fail(record, 'gameStarted')
  if (record.seats.length >= def.maxSeats) return fail(record, 'roomFull')
  const name = rawName.trim()
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return fail(record, 'invalidName')
  const lower = name.toLocaleLowerCase()
  if (record.seats.some((s) => s.name.toLocaleLowerCase() === lower))
    return fail(record, 'nameTaken')
  const seat = `seat-${record.nextSeatNumber}`
  const next: RoomRecord<S, C> = {
    ...touch(record, now),
    host: record.host ?? seat,
    nextSeatNumber: record.nextSeatNumber + 1,
    seats: [
      ...record.seats,
      { seat, name, kind: 'human', tokenHash, presence: 'connected', takeoverAt: null },
    ],
  }
  return { ...ok(next), seat }
}

/**
 * Volta pelo token (mesmo aparelho). Quem caiu e ainda não foi substituído volta na hora;
 * quem já tinha o bot no lugar retoma no início do próprio turno seguinte.
 */
export function reconnect<S, E, C>(
  record: RoomRecord<S, C>,
  tokenHash: string,
  now: number,
): Outcome<S, E, C> & { seat?: SeatId } {
  if (record.table && record.table.tokenHash === tokenHash) {
    const next = touch({ ...record, table: { ...record.table, connected: true } }, now)
    return { ...ok(next), seat: TABLE_SEAT }
  }
  const me = record.seats.find((s) => s.kind === 'human' && s.tokenHash === tokenHash)
  if (!me) return fail(record, 'unknownToken')
  let next = touch(record, now)
  const notices: Notice[] = []
  if (me.presence === 'away') {
    next = patchSeat(next, me.seat, { presence: 'connected', takeoverAt: null })
    if (record.status === 'playing') notices.push({ type: 'player-returned', seat: me.seat })
  } else if (me.presence === 'bot') {
    next = patchSeat(next, me.seat, { presence: 'returning' })
    notices.push({ type: 'player-back-soon', seat: me.seat })
  }
  return { ...ok(next, { notices }), seat: me.seat }
}

/** A última conexão do assento caiu. */
export function disconnect<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  now: number,
  timings: RoomTimings,
): Outcome<S, E, C> {
  if (seat === TABLE_SEAT) {
    return record.table
      ? ok({ ...record, table: { ...record.table, connected: false } })
      : ok(record)
  }
  const me = findSeat(record, seat)
  if (!me || me.kind !== 'human') return ok(record)
  if (me.presence === 'returning') {
    // voltou e caiu de novo antes de retomar: o bot continua
    return ok(patchSeat(record, seat, { presence: 'bot' }))
  }
  if (me.presence !== 'connected') return ok(record)
  const myTurn =
    record.status === 'playing' && record.game !== null && def.activeSeat(record.game) === seat
  const next = patchSeat(withoutSuggestion(record, seat), seat, {
    presence: 'away',
    takeoverAt: myTurn ? now + timings.takeoverMs : null,
  })
  const notices: Notice[] = record.status === 'playing' ? [{ type: 'player-away', seat }] : []
  return ok(next, { notices })
}

// ---------- Lobby ----------

export function setConfig<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  raw: unknown,
  now: number,
): Outcome<S, E, C> {
  if (record.status !== 'lobby') return fail(record, 'gameStarted')
  if (!canCommand(record, seat)) return fail(record, 'onlyHost')
  const config = def.parseConfig(raw)
  if (config === null) return fail(record, 'invalidConfig')
  return ok({ ...touch(record, now), config })
}

export function addBot<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  now: number,
): Outcome<S, E, C> {
  if (record.status !== 'lobby') return fail(record, 'gameStarted')
  if (!canCommand(record, seat)) return fail(record, 'onlyHost')
  if (record.seats.length >= def.maxSeats) return fail(record, 'roomFull')
  // Nome neutro e único ("Bot 1", "Bot 2"...), igual em todos os aparelhos.
  const names = new Set(record.seats.map((s) => s.name.toLocaleLowerCase()))
  let n = 1
  while (names.has(`bot ${n}`)) n++
  const bot: SeatRecord = {
    seat: `seat-${record.nextSeatNumber}`,
    name: `Bot ${n}`,
    kind: 'bot',
    tokenHash: null,
    presence: 'bot',
    takeoverAt: null,
  }
  return ok({
    ...touch(record, now),
    nextSeatNumber: record.nextSeatNumber + 1,
    seats: [...record.seats, bot],
  })
}

/** Tira um bot, ou uma pessoa que caiu, antes de começar. */
export function removeSeat<S, E, C>(
  record: RoomRecord<S, C>,
  seat: SeatId,
  target: SeatId,
  now: number,
): Outcome<S, E, C> {
  if (record.status !== 'lobby') return fail(record, 'gameStarted')
  if (!canCommand(record, seat)) return fail(record, 'onlyHost')
  const victim = findSeat(record, target)
  if (!victim || target === seat) return fail(record, 'invalidTarget')
  if (victim.kind === 'human' && victim.presence === 'connected')
    return fail(record, 'stillConnected')
  const seats = record.seats.filter((s) => s.seat !== target)
  return ok({ ...touch(record, now), seats })
}

/** Sair no lobby libera o assento; na partida, conta como desconexão (o assento não é removido). */
export function leave<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  now: number,
  timings: RoomTimings,
): Outcome<S, E, C> {
  if (record.status !== 'lobby') return disconnect(def, record, seat, now, timings)
  const seats = record.seats.filter((s) => s.seat !== seat)
  const host =
    record.host === seat ? (seats.find((s) => s.kind === 'human')?.seat ?? null) : record.host
  return ok({ ...touch(record, now), seats, host })
}

// ---------- Partida ----------

export function startGame<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  seed: number,
  now: number,
  timings: RoomTimings,
): Outcome<S, E, C> {
  if (record.status !== 'lobby') return fail(record, 'gameStarted')
  if (!canCommand(record, seat)) return fail(record, 'onlyHost')
  if (record.seats.length < def.minSeats) return fail(record, 'notEnoughSeats')
  if (!record.seats.some((s) => s.kind === 'human')) return fail(record, 'noHuman')
  if (record.seats.some((s) => s.kind === 'human' && s.presence !== 'connected')) {
    return fail(record, 'someoneAway')
  }
  const game = def.newGame(
    record.config,
    record.seats.map((s) => s.seat),
    seed,
  )
  const next: RoomRecord<S, C> = {
    ...touch(record, now),
    status: 'playing',
    game,
    turnKey: def.turnKey(game),
    suggestions: [],
    suggestionChanges: {},
  }
  return ok(schedule(def, next, now, timings), { by: seat })
}

export function act<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  raw: unknown,
  now: number,
  timings: RoomTimings,
): Outcome<S, E, C> {
  if (record.status !== 'playing' || record.game === null) return fail(record, 'notPlaying')
  const me = findSeat(record, seat)
  if (!me || controllerOf(me) !== 'human') return fail(record, 'notYourControl')
  if (!def.actorsOf(record.game).includes(seat)) return fail(record, 'notYourTurn')
  const action = def.parseAction(raw)
  if (action === null) return fail(record, 'badAction')
  return applyAction(def, touch(record, now), seat, action, now, timings)
}

function applyAction<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  action: A,
  now: number,
  timings: RoomTimings,
): Outcome<S, E, C> {
  if (record.game === null) return fail(record, 'notPlaying')
  const result = def.transition(record.game, action, seat)
  if (!result.ok) return fail(record, 'refused', result.reason)
  const after = afterGameChange(def, { ...record, game: result.state }, now, timings)
  return ok(after.record, { events: result.events, notices: after.notices, by: seat })
}

/**
 * Depois de cada mudança no jogo: turno novo limpa as sugestões, devolve o assento a quem
 * voltou e passa ao bot o assento de quem caiu; fim de partida; agenda a próxima jogada de bot.
 */
function afterGameChange<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  now: number,
  timings: RoomTimings,
): { record: RoomRecord<S, C>; notices: Notice[] } {
  if (record.game === null) return { record, notices: [] }
  let next = record
  const notices: Notice[] = []
  const key = def.turnKey(record.game)
  if (key !== record.turnKey) {
    next = { ...next, turnKey: key, suggestions: [], suggestionChanges: {} }
    // a vez de quem estava "away" passa a uma nova vez: o prazo de 20 s não vale mais
    next = {
      ...next,
      seats: next.seats.map((s) => (s.takeoverAt !== null ? { ...s, takeoverAt: null } : s)),
    }
    const active = def.activeSeat(record.game)
    const owner = active ? findSeat(next, active) : undefined
    if (owner?.kind === 'human') {
      if (owner.presence === 'returning') {
        next = patchSeat(next, owner.seat, { presence: 'connected' })
        notices.push({ type: 'player-returned', seat: owner.seat })
      } else if (owner.presence === 'away') {
        // caiu fora da sua vez: o bot assume no início do turno dela
        next = patchSeat(next, owner.seat, { presence: 'bot' })
        notices.push({ type: 'bot-took-over', seat: owner.seat })
      }
    }
  }
  if (def.isOver(record.game)) {
    next = { ...next, status: 'over', nextBotAt: null, suggestions: [], suggestionChanges: {} }
    next = { ...next, seats: next.seats.map((s) => ({ ...s, takeoverAt: null })) }
    return { record: next, notices }
  }
  return { record: schedule(def, next, now, timings), notices }
}

/** Agenda a próxima jogada de bot, se o dono da vez for controlado por bot. */
function schedule<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  now: number,
  timings: RoomTimings,
): RoomRecord<S, C> {
  if (record.game === null || record.status !== 'playing') return { ...record, nextBotAt: null }
  const active = def.activeSeat(record.game)
  const owner = active ? findSeat(record, active) : undefined
  const botTurn = owner !== undefined && controllerOf(owner) === 'bot'
  return { ...record, nextBotAt: botTurn ? (record.nextBotAt ?? now + timings.botStepMs) : null }
}

/**
 * Alarme: o bot assume a vez de quem caiu e os bots jogam, uma ação por vez. O bot recebe só a
 * visão pública do próprio assento.
 */
export function tick<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  now: number,
  timings: RoomTimings,
): Outcome<S, E, C> {
  if (record.status !== 'playing' || record.game === null) return ok(record)
  let next = record
  const notices: Notice[] = []
  for (const seat of record.seats) {
    if (seat.takeoverAt !== null && seat.takeoverAt <= now && seat.presence === 'away') {
      next = patchSeat(next, seat.seat, { presence: 'bot', takeoverAt: null })
      notices.push({ type: 'bot-took-over', seat: seat.seat })
    }
  }
  next = schedule(def, next, now, timings)
  if (next.nextBotAt === null || next.nextBotAt > now || next.game === null) {
    return ok(next, { notices })
  }
  const active = def.activeSeat(next.game)
  if (active === null) return ok(next, { notices })
  const action = def.botMove(def.viewFor(next.game, active), active)
  const result = applyAction(def, { ...next, nextBotAt: null }, active, action, now, timings)
  if (result.error) {
    // não deveria acontecer (o bot só faz ações legais); evita travar a sala
    return ok({ ...next, nextBotAt: now + timings.botStepMs }, { notices })
  }
  return { ...result, notices: [...notices, ...result.notices] }
}

/** Nova partida com a mesma sala (quem não está conectado sai da lista). */
export function playAgain<S, E, C>(
  record: RoomRecord<S, C>,
  seat: SeatId,
  now: number,
): Outcome<S, E, C> {
  if (record.status !== 'over') return fail(record, 'notOver')
  if (!canCommand(record, seat)) return fail(record, 'onlyHost')
  const seats = record.seats
    .filter((s) => s.kind === 'bot' || s.presence === 'connected' || s.presence === 'returning')
    .map((s) =>
      s.kind === 'human' ? { ...s, presence: 'connected' as const, takeoverAt: null } : s,
    )
  const next: RoomRecord<S, C> = {
    ...touch(record, now),
    seats,
    status: 'lobby',
    game: null,
    turnKey: null,
    suggestions: [],
    suggestionChanges: {},
    nextBotAt: null,
  }
  return ok(next)
}

// ---------- Sugestões (opinar) ----------

function withoutSuggestion<S, C>(record: RoomRecord<S, C>, seat: SeatId): RoomRecord<S, C> {
  return { ...record, suggestions: record.suggestions.filter((s) => s.seat !== seat) }
}

/**
 * Opinar fora da sua vez: cada jogador tem uma sugestão ativa por turno (a nova troca a
 * anterior), com limite de trocas por turno (dados do jogo). Some quando a vez muda.
 */
export function suggest<S, A, E, C, V>(
  def: Def<S, A, E, C, V>,
  record: RoomRecord<S, C>,
  seat: SeatId,
  rawTarget: unknown,
  now: number,
): Outcome<S, E, C> {
  if (record.status !== 'playing' || record.game === null) return fail(record, 'notPlaying')
  const me = findSeat(record, seat)
  if (!me || me.kind !== 'human' || me.presence !== 'connected')
    return fail(record, 'notYourControl')
  if (def.activeSeat(record.game) === seat) return fail(record, 'yourTurn')
  const target = def.parseSuggestion(record.game, rawTarget)
  if (target === null) return fail(record, 'invalidSuggestion')
  const changes = record.suggestionChanges[seat] ?? 0
  if (changes >= def.maxSuggestionChangesPerTurn) return fail(record, 'tooManySuggestions')
  const next = withoutSuggestion(touch(record, now), seat)
  return ok({
    ...next,
    suggestions: [...next.suggestions, { seat, target }],
    suggestionChanges: { ...record.suggestionChanges, [seat]: changes + 1 },
  })
}

export function unsuggest<S, E, C>(
  record: RoomRecord<S, C>,
  seat: SeatId,
  now: number,
): Outcome<S, E, C> {
  if (!record.suggestions.some((s) => s.seat === seat)) return ok(record)
  return ok(withoutSuggestion(touch(record, now), seat))
}
