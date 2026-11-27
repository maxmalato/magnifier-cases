// O kit conhece o jogo só por esta interface (spec, seção 3). Nada aqui sabe de mistérios.
// Origem: village-flood, packages/kit/src/definition.ts (commit dc9b801), adaptada à
// informação escondida (decisões de 25/11/2026 no registro das regras):
// - o kit nunca envia o estado (S): cada destinatário recebe só `viewFor` (V);
// - o bot recebe a visão, nunca o estado;
// - sem perfil de assento (papéis ficam para depois da v1).
// A sala (lobby, partida, desconexão, sugestões e mesa) fica em room.ts.
import type { TABLE_SEAT } from './constants.ts'

/** Identificador opaco de um assento (ex.: "seat-1"). */
export type SeatId = string

/** Quem recebe uma visão: um assento ou a mesa. */
export type Viewer = SeatId | typeof TABLE_SEAT

export type TransitionOutcome<S, E> =
  | { readonly ok: true; readonly state: S; readonly events: readonly E[] }
  | { readonly ok: false; readonly reason: string }

/**
 * Definição de um jogo para o kit. S = estado completo (com segredos), A = ação, E = evento,
 * C = configuração da partida (ex.: nível), V = visão pública (o que sai do servidor).
 */
export interface GameDefinition<S, A, E, C, V> {
  readonly id: string
  readonly minSeats: number
  readonly maxSeats: number
  readonly defaultConfig: C

  /** Validam o que chega do aparelho. Null: recusado. */
  parseConfig(raw: unknown): C | null
  parseAction(raw: unknown): A | null
  /** Alvo de uma sugestão (opinar) fora da vez, validado contra a partida. Null: recusado. */
  parseSuggestion(state: S, raw: unknown): string | null
  /** Quantas vezes cada jogador pode marcar ou trocar a sugestão num mesmo turno (dados). */
  readonly maxSuggestionChangesPerTurn: number

  /** Partida nova. A semente vem do servidor (ou do aparelho, no modo local) e é secreta. */
  newGame(config: C, seats: readonly SeatId[], seed: number): S
  /** Pura: nunca muta a entrada. O motor valida a regra; o kit valida quem pode agir. */
  transition(state: S, action: A, seat: SeatId): TransitionOutcome<S, E>
  /**
   * Encerra a partida antes do fim (botão "Encerrar partida"). Pura. Não é uma jogada: quem pode
   * pedir é decidido pelo kit (só quem comanda a sala), não por quem tem a vez.
   */
  endGame(state: S): TransitionOutcome<S, E>
  /** Assento dono do turno; null quando a partida acabou. */
  activeSeat(state: S): SeatId | null
  /** Quem pode agir agora (o servidor recusa qualquer outro). */
  actorsOf(state: S): SeatId[]
  /** Muda a cada turno (limpa as sugestões e devolve o controle a quem voltou). */
  turnKey(state: S): string
  isOver(state: S): boolean

  /**
   * O que um assento ou a mesa pode ver. Neste jogo NÃO é a identidade: remove a solução, a
   * semente, o oráculo e o conteúdo das cartas fechadas. É a única forma de o estado sair.
   */
  viewFor(state: S, viewer: Viewer): V
  /** Eventos como o destinatário pode vê-los (nenhum evento leva segredo antes do fim). */
  eventsFor(events: readonly E[], viewer: Viewer): readonly E[]
  /** Jogada do bot: função pura, só com a visão pública. */
  botMove(view: V, seat: SeatId): A
}
