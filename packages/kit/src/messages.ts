// Mensagens entre o aparelho e a sala (JSON por WebSocket). O envelope é genérico; o conteúdo
// de jogo (ação, configuração, alvo da sugestão) é validado pela GameDefinition.
// O servidor nunca confia no que chega: tudo passa por parseClientMessage antes de ser usado.
// Origem: village-flood, packages/kit/src/messages.ts (commit dc9b801). Mudanças: sem perfil
// de assento (papéis só depois da v1) e sugestão única por jogador no lugar dos pings.
import { MAX_MESSAGE_BYTES, MAX_NAME_LENGTH } from './constants.ts'
import type { SeatId } from './definition.ts'

export type ClientMessage =
  /** Entrar na sala: com token (volta ao mesmo assento) ou com apelido (assento novo). */
  | { type: 'hello'; token?: string; name?: string }
  | { type: 'config'; config: unknown }
  | { type: 'add-bot' }
  | { type: 'remove-seat'; seat: SeatId }
  | { type: 'start' }
  | { type: 'action'; action: unknown }
  /** Opinar fora da vez: marca (ou troca) a sugestão deste jogador. */
  | { type: 'suggest'; target: unknown }
  /** Tira a sugestão deste jogador. */
  | { type: 'unsuggest' }
  /** Pede o estado completo de novo (reconexão, aba voltando do segundo plano). */
  | { type: 'resync' }
  | { type: 'again' }
  | { type: 'leave' }

/** O que a mesa pode mandar: ela só mostra a partida. */
export const TABLE_MESSAGES: ReadonlySet<ClientMessage['type']> = new Set(['hello', 'resync'])

export type Notice =
  | { type: 'player-away'; seat: SeatId }
  | { type: 'bot-took-over'; seat: SeatId }
  | { type: 'player-returned'; seat: SeatId }
  | { type: 'player-back-soon'; seat: SeatId }

export type ServerMessage<V, E> =
  | { type: 'welcome'; seat: SeatId; token: string }
  | { type: 'room'; room: V }
  | { type: 'update'; room: V; events: readonly E[]; by: SeatId | null }
  | { type: 'notice'; notice: Notice; room: V }
  | { type: 'error'; code: string; detail?: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const shortText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max

/** Valida uma mensagem recebida; null se for inválida (é descartada). */
export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null
  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(v)) return null
  switch (v.type) {
    case 'hello':
      if (v.token !== undefined && !shortText(v.token, 128)) return null
      if (v.name !== undefined && !shortText(v.name, MAX_NAME_LENGTH * 2)) return null
      return {
        type: 'hello',
        ...(v.token !== undefined ? { token: v.token as string } : {}),
        ...(v.name !== undefined ? { name: v.name as string } : {}),
      }
    case 'config':
      return { type: 'config', config: v.config }
    case 'action':
      return { type: 'action', action: v.action }
    case 'suggest':
      return { type: 'suggest', target: v.target }
    case 'remove-seat':
      return shortText(v.seat, 32) ? { type: 'remove-seat', seat: v.seat } : null
    case 'add-bot':
    case 'start':
    case 'unsuggest':
    case 'resync':
    case 'again':
    case 'leave':
      return { type: v.type }
    default:
      return null
  }
}

/** Limite de mensagens por janela de tempo (por aparelho ou por endereço). Melhor esforço. */
export class RateLimiter {
  private readonly counters = new Map<string, { count: number; start: number }>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now: number): boolean {
    const entry = this.counters.get(key)
    if (!entry || now - entry.start >= this.windowMs) {
      this.counters.set(key, { count: 1, start: now })
      if (this.counters.size > 10_000) {
        for (const [k, e] of this.counters)
          if (now - e.start >= this.windowMs) this.counters.delete(k)
      }
      return true
    }
    entry.count++
    return entry.count <= this.limit
  }
}
