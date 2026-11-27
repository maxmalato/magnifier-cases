// Uma sala do modo online: um Durable Object por sala (spec, seção 8). Adaptador fino entre a
// Cloudflare (WebSocket com hibernação, armazenamento e alarme) e o kit, que tem toda a lógica.
// O servidor é a única fonte da verdade: cada ação é validada contra quem enviou e passa pelo
// mesmo motor do navegador. Cada aparelho recebe só a sua visão (PublicView); o estado completo,
// com a solução, nunca sai daqui, nem em log (não há log) nem em erro (só códigos).
// Origem: village-flood, apps/server/src/room.ts (commit dc9b801).
import { DurableObject } from 'cloudflare:workers'
import type { GameEvent, GameState } from '@magnifier-cases/engine'
import {
  act,
  addBot,
  createRoom,
  defaultTimings,
  disconnect,
  isExpired,
  joinRoom,
  leave,
  MESSAGE_LIMIT,
  nextWake,
  parseClientMessage,
  endGame,
  playAgain,
  RateLimiter,
  reconnect,
  removeSeat,
  setConfig,
  startGame,
  suggest,
  TABLE_MESSAGES,
  tick,
  unsuggest,
  viewOf,
  type ClientMessage,
  type Notice,
  type Outcome,
  type RoomRecord,
  type RoomTimings,
  type SeatId,
} from '@magnifier-cases/kit'
import type {
  MagnifierRoomView,
  MagnifierServerMessage,
  RoomConfig,
} from '@magnifier-cases/protocol'
import { magnifierCases as def } from './definition.ts'
import { hashToken, newToken } from './tokens.ts'

type Record_ = RoomRecord<GameState, RoomConfig>
type Out = Outcome<GameState, GameEvent, RoomConfig>

interface Attachment {
  /** Assento do aparelho; null antes de entrar. */
  seat: SeatId | null
}

/** Resumo para a tela "Entrar com código". */
export interface RoomInfo {
  status: Record_['status']
  seats: number
  maxSeats: number
  config: RoomConfig
}

export class Room extends DurableObject<Env> {
  private record: Record_ | null = null
  /** Mensagens por aparelho (só em memória: zera se a sala hibernar). */
  private readonly limiter = new RateLimiter(MESSAGE_LIMIT.count, MESSAGE_LIMIT.windowMs)
  private readonly socketIds = new WeakMap<WebSocket, string>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    void ctx.blockConcurrencyWhile(async () => {
      this.record = (await ctx.storage.get<Record_>('room')) ?? null
    })
  }

  private get timings(): RoomTimings {
    const number = (value: string | undefined, fallback: number) => {
      const n = Number(value)
      return Number.isFinite(n) && n >= 0 ? n : fallback
    }
    return {
      takeoverMs: number(this.env.TAKEOVER_MS, defaultTimings.takeoverMs),
      botStepMs: number(this.env.BOT_STEP_MS, defaultTimings.botStepMs),
    }
  }

  // ---------- chamadas do Worker ----------

  /** Cria a sala; false se o código já está em uso. Com `tableTokenHash`, é uma sala com mesa. */
  async init(
    code: string,
    config: RoomConfig,
    tableTokenHash: string | null = null,
  ): Promise<boolean> {
    if (this.record) return false
    this.record = createRoom(code, config, Date.now(), tableTokenHash)
    await this.persist()
    return true
  }

  async info(): Promise<RoomInfo | null> {
    if (!this.record) return null
    return {
      status: this.record.status,
      seats: this.record.seats.length,
      maxSeats: def.maxSeats,
      config: this.record.config,
    }
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return Response.json({ error: 'expectedWebSocket' }, { status: 426 })
    }
    if (!this.record) return Response.json({ error: 'notFound' }, { status: 404 })
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ seat: null } satisfies Attachment)
    return new Response(null, { status: 101, webSocket: client })
  }

  // ---------- WebSocket ----------

  override async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (!this.record) {
      ws.close(1000, 'room closed')
      return
    }
    if (!this.limiter.allow(this.socketId(ws), Date.now())) {
      return this.send(ws, { type: 'error', code: 'tooManyRequests' })
    }
    const message = typeof data === 'string' ? parseClientMessage(data) : null
    if (!message) return this.send(ws, { type: 'error', code: 'badMessage' })
    await this.handle(ws, message)
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    await this.closed(ws)
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.closed(ws)
  }

  override async alarm(): Promise<void> {
    if (!this.record) return
    const now = Date.now()
    if (isExpired(this.record, now)) {
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'room expired')
      await this.ctx.storage.deleteAll()
      this.record = null
      return
    }
    await this.commit(tick(def, this.record, now, this.timings))
  }

  // ---------- mensagens ----------

  private async handle(ws: WebSocket, message: ClientMessage): Promise<void> {
    const record = this.record as Record_
    const seat = this.seatOf(ws)
    const now = Date.now()
    if (message.type === 'hello') return this.hello(ws, seat, message)
    if (seat === null) return this.send(ws, { type: 'error', code: 'notJoined' })
    // a mesa só mostra a partida: não joga, não sugere e não comanda a sala
    if (!TABLE_MESSAGES.has(message.type) && seat === 'table')
      return this.send(ws, { type: 'error', code: 'tableCannotPlay' })

    switch (message.type) {
      case 'resync':
        return this.send(ws, { type: 'room', room: this.viewFor(seat) })
      case 'config':
        return this.commit(setConfig(def, record, seat, message.config, now), ws)
      case 'add-bot':
        return this.commit(addBot(def, record, seat, now), ws)
      case 'remove-seat':
        return this.commit(removeSeat(record, seat, message.seat, now), ws)
      case 'start': {
        // semente secreta, sorteada aqui com qualidade criptográfica
        const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 1
        return this.commit(startGame(def, record, seat, seed, now, this.timings), ws)
      }
      case 'action':
        return this.commit(act(def, record, seat, message.action, now, this.timings), ws)
      case 'suggest':
        return this.commit(suggest(def, record, seat, message.target, now), ws)
      case 'unsuggest':
        return this.commit(unsuggest(record, seat, now), ws)
      case 'again':
        return this.commit(playAgain(record, seat, now), ws)
      case 'end':
        return this.commit(endGame(def, record, seat, now, this.timings), ws)
      case 'leave': {
        ws.serializeAttachment({ seat: null } satisfies Attachment)
        await this.commit(leave(def, record, seat, now, this.timings), ws)
        ws.close(1000, 'left')
        return
      }
    }
  }

  private async hello(
    ws: WebSocket,
    current: SeatId | null,
    message: Extract<ClientMessage, { type: 'hello' }>,
  ): Promise<void> {
    if (current !== null) return this.send(ws, { type: 'room', room: this.viewFor(current) })
    const record = this.record as Record_
    const now = Date.now()
    if (message.token) {
      const out = reconnect<GameState, GameEvent, RoomConfig>(
        record,
        await hashToken(message.token),
        now,
      )
      if (out.error || !out.seat)
        return this.send(ws, { type: 'error', code: out.error ?? 'unknownToken' })
      ws.serializeAttachment({ seat: out.seat } satisfies Attachment)
      this.send(ws, { type: 'welcome', seat: out.seat, token: message.token })
      // quem volta recebe a sala inteira (resync), mesmo se nada mudou
      this.send(ws, { type: 'room', room: this.viewFor(out.seat) })
      return this.commit(out)
    }
    const token = newToken()
    const out = joinRoom(def, record, message.name ?? '', await hashToken(token), now)
    if (out.error || !out.seat)
      return this.send(ws, { type: 'error', code: out.error ?? 'refused' })
    ws.serializeAttachment({ seat: out.seat } satisfies Attachment)
    this.send(ws, { type: 'welcome', seat: out.seat, token })
    return this.commit(out)
  }

  private async closed(ws: WebSocket): Promise<void> {
    const seat = this.seatOf(ws)
    if (!this.record || seat === null) return
    // outro aparelho (ou aba) do mesmo assento ainda conectado: continua conectado
    const others = this.ctx.getWebSockets().filter((o) => o !== ws && this.seatOf(o) === seat)
    if (others.length > 0) return
    await this.commit(disconnect(def, this.record, seat, Date.now(), this.timings))
  }

  // ---------- auxiliares ----------

  /** Aplica o resultado: recusa (só o código) para quem pediu, ou grava e avisa todos. */
  private async commit(out: Out, ws?: WebSocket): Promise<void> {
    if (out.error) {
      if (ws) {
        const [code, detail] = out.error.split(':')
        this.send(ws, { type: 'error', code: code ?? 'refused', ...(detail ? { detail } : {}) })
      }
      return
    }
    const changed = out.record !== this.record
    this.record = out.record
    if (changed) await this.persist()
    this.broadcast((seat) => {
      const room = this.viewFor(seat)
      const messages: MagnifierServerMessage[] = []
      if (out.events.length > 0)
        messages.push({ type: 'update', room, events: def.eventsFor(out.events, seat), by: out.by })
      else if (changed) messages.push({ type: 'room', room })
      for (const notice of out.notices)
        messages.push({ type: 'notice', notice: notice as Notice, room })
      return messages
    })
  }

  /** Visão da sala para um assento (ou a mesa): o jogo só sai pela PublicView. */
  private viewFor(seat: SeatId): MagnifierRoomView {
    return viewOf(def, this.record as Record_, seat, Date.now())
  }

  private seatOf(ws: WebSocket): SeatId | null {
    const attachment = ws.deserializeAttachment() as Attachment | null
    return attachment?.seat ?? null
  }

  private socketId(ws: WebSocket): string {
    let id = this.socketIds.get(ws)
    if (!id) {
      id = crypto.randomUUID()
      this.socketIds.set(ws, id)
    }
    return id
  }

  private send(ws: WebSocket, message: MagnifierServerMessage): void {
    try {
      ws.send(JSON.stringify(message))
    } catch {
      // aparelho já desconectado: a próxima conexão recebe o estado completo
    }
  }

  /** Manda a cada aparelho as mensagens montadas para o assento dele. */
  private broadcast(build: (seat: SeatId) => readonly MagnifierServerMessage[]): void {
    const cache = new Map<SeatId, string[]>()
    for (const ws of this.ctx.getWebSockets()) {
      const seat = this.seatOf(ws)
      if (seat === null) continue
      let texts = cache.get(seat)
      if (!texts) {
        texts = build(seat).map((m) => JSON.stringify(m))
        cache.set(seat, texts)
      }
      for (const text of texts) {
        try {
          ws.send(text)
        } catch {
          // idem
        }
      }
    }
  }

  /** Grava a sala e agenda o próximo alarme: jogada de bot, bot assumindo ou expiração. */
  private async persist(): Promise<void> {
    const record = this.record as Record_
    await this.ctx.storage.put('room', record)
    await this.ctx.storage.setAlarm(nextWake(record))
  }
}
