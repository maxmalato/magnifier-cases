// Protocolo do jogo (magnifier-cases) entre o aparelho e a sala (spec, seção 8). O envelope é o do kit;
// aqui ficam os conteúdos deste jogo, validados com Zod. O servidor nunca confia no aparelho:
// toda ação passa por parseAction (formato) e depois pelo motor (regra). O estado só sai como
// PublicView, nunca o estado completo.
import {
  LevelIdSchema,
  type GameEvent,
  type GameState,
  type LevelId,
  type PublicView,
} from '@magnifier-cases/engine'
import type { RoomView, ServerMessage } from '@magnifier-cases/kit'
import { z } from 'zod'
import raw from '../data/room-params.json' with { type: 'json' }

/** Versão do protocolo (o /api/health do servidor a devolve). */
export const PROTOCOL_ID = 'magnifier-cases/v1'

/** Configuração da partida escolhida no lobby. */
export interface RoomConfig {
  readonly level: LevelId
}

export const defaultRoomConfig: RoomConfig = { level: 'apprentice' }

const RoomConfigSchema = z.strictObject({ level: LevelIdSchema })

export function parseRoomConfig(value: unknown): RoomConfig | null {
  const result = RoomConfigSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Parâmetros da sala que são (a testar): vivem em data/room-params.json. */
export const RoomParamsSchema = z.object({
  /** Quantas vezes cada jogador marca ou troca a sugestão num mesmo turno. */
  maxSuggestionChangesPerTurn: z.int().min(1),
})
export const roomParams = RoomParamsSchema.parse(raw)

/**
 * Sugestão (opinar, regras, seção 8): uma opção do menu de ações, um lugar, um suspeito ou uma
 * dupla de acusação. No fio vai como objeto; na sala fica como texto curto ("place:bakery").
 */
export type SuggestionTarget =
  | { readonly kind: 'option'; readonly option: 'investigate' | 'interrogate' | 'move' | 'accuse' }
  | { readonly kind: 'suspect'; readonly id: string }
  | { readonly kind: 'place'; readonly id: string }
  | { readonly kind: 'pair'; readonly suspectId: string; readonly placeId: string }

const Id = z.string().min(1).max(64)
const SuggestionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('option'),
    option: z.enum(['investigate', 'interrogate', 'move', 'accuse']),
  }),
  z.strictObject({ kind: z.literal('suspect'), id: Id }),
  z.strictObject({ kind: z.literal('place'), id: Id }),
  z.strictObject({ kind: z.literal('pair'), suspectId: Id, placeId: Id }),
])

/** Texto curto da sugestão, guardado na sala e mostrado a todos. */
export function encodeSuggestion(target: SuggestionTarget): string {
  switch (target.kind) {
    case 'option':
      return `option:${target.option}`
    case 'suspect':
      return `suspect:${target.id}`
    case 'place':
      return `place:${target.id}`
    case 'pair':
      return `pair:${target.suspectId}:${target.placeId}`
  }
}

/** Lê o texto curto de volta (para a interface). */
export function decodeSuggestion(text: string): SuggestionTarget | null {
  const [kind, a, b] = text.split(':')
  if (
    kind === 'option' &&
    (a === 'investigate' || a === 'interrogate' || a === 'move' || a === 'accuse')
  )
    return { kind, option: a }
  if ((kind === 'suspect' || kind === 'place') && a) return { kind, id: a }
  if (kind === 'pair' && a && b) return { kind, suspectId: a, placeId: b }
  return null
}

/** Valida a sugestão contra o elenco da partida; devolve o texto curto ou null. */
export function parseSuggestion(state: Pick<GameState, 'cast'>, value: unknown): string | null {
  const result = SuggestionSchema.safeParse(value)
  if (!result.success) return null
  const target = result.data
  const { suspects, places } = state.cast
  if (target.kind === 'suspect' && !suspects.includes(target.id)) return null
  if (target.kind === 'place' && !places.includes(target.id)) return null
  if (
    target.kind === 'pair' &&
    (!suspects.includes(target.suspectId) || !places.includes(target.placeId))
  )
    return null
  return encodeSuggestion(target)
}

/** O que cada aparelho recebe: a sala com a visão pública do jogo. */
export type MagnifierRoomView = RoomView<PublicView, RoomConfig>
export type MagnifierServerMessage = ServerMessage<MagnifierRoomView, GameEvent>
