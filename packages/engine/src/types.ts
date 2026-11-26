// Tipos do domínio (spec, seção 4). Campos marcados SECRETO nunca saem do motor ou do servidor:
// a única saída é `viewFor` (PublicView).
import type { ClueEffectKind, DifficultyParams, LevelId } from './schema.ts'

export type SuspectId = string
export type PlaceId = string
export type CardId = string
export type SeatId = string
/** Onde a equipe está: um lugar do elenco ou a Praça (início). */
export type Location = PlaceId | 'square'

export type ClueEffect =
  | { readonly kind: 'exclude-suspects'; readonly ids: readonly SuspectId[] }
  | { readonly kind: 'exclude-places'; readonly ids: readonly PlaceId[] }
  /** Grupo com 2 ou mais. */
  | { readonly kind: 'only-suspects'; readonly ids: readonly SuspectId[] }
  /** Grupo com 2 ou mais. */
  | { readonly kind: 'only-places'; readonly ids: readonly PlaceId[] }
  /** Ruído: verdadeiro e sem efeito. */
  | { readonly kind: 'none' }

// Garante que os tipos de efeito do schema e da união são os mesmos.
type _SameKinds = ClueEffect['kind'] extends ClueEffectKind
  ? ClueEffectKind extends ClueEffect['kind']
    ? true
    : never
  : never
export const _sameKinds: _SameKinds = true

export type CardSource =
  | { readonly type: 'place'; readonly id: PlaceId }
  | { readonly type: 'suspect'; readonly id: SuspectId }

/** Ids que preenchem o modelo de texto (ex.: { suspects: [...], source: [...] }). */
export type Slots = Readonly<Record<string, readonly string[]>>

export interface ClueCard {
  readonly id: CardId
  readonly source: CardSource
  /** SECRETO enquanto a carta está fechada. */
  readonly effect: ClueEffect
  /** SECRETO enquanto a carta está fechada (chave i18n do modelo). */
  readonly textKey: string
  /** SECRETO enquanto a carta está fechada. */
  readonly slots: Slots
  readonly opened: boolean
  readonly openedAtAction?: number
  readonly openedBySeat?: SeatId
}

/** SECRETO. */
export interface Solution {
  readonly culpritId: SuspectId
  readonly hideoutId: PlaceId
}

/** SECRETO: resultado do solucionador. */
export interface Oracle {
  readonly minCost: number
  readonly keyCardIds: readonly CardId[]
  readonly slack: number
}

export interface Cast {
  readonly suspects: readonly SuspectId[]
  readonly places: readonly PlaceId[]
}

export interface WrongAccusation {
  readonly suspectId: SuspectId
  readonly placeId: PlaceId
  readonly atAction: number
  readonly seat: SeatId
}

export type Phase = 'playing' | 'won' | 'timeout'

export interface GameState {
  readonly level: LevelId
  /** Cópia dos dados do nível no início da partida. */
  readonly params: DifficultyParams
  /** SECRETO (a semente revela a solução). */
  readonly seed: number
  readonly cast: Cast
  /** SECRETO. */
  readonly solution: Solution
  /** Texto e efeito SECRETOS enquanto a carta está fechada. */
  readonly cards: readonly ClueCard[]
  /** SECRETO. */
  readonly oracle: Oracle
  readonly teamAt: Location
  readonly actionsLeft: number
  readonly seats: readonly SeatId[]
  readonly activeSeat: SeatId
  /** Ações resolvidas até agora (também numera as pistas abertas). */
  readonly turn: number
  readonly wrongAccusations: readonly WrongAccusation[]
  readonly phase: Phase
}

export type Action =
  | { readonly type: 'move'; readonly placeId: PlaceId }
  | { readonly type: 'investigate' }
  | { readonly type: 'interrogate'; readonly suspectId: SuspectId }
  | { readonly type: 'accuse'; readonly suspectId: SuspectId; readonly placeId: PlaceId }

/** Quem age (o servidor confere antes; o motor confere de novo). */
export interface Ctx {
  readonly seat: SeatId
}

/** Carta aberta como todos a veem. */
export interface OpenedCard {
  readonly id: CardId
  readonly source: CardSource
  readonly effect: ClueEffect
  readonly textKey: string
  readonly slots: Slots
  readonly openedAtAction: number
  readonly openedBySeat: SeatId
}

export interface CandidateLists {
  readonly suspects: readonly SuspectId[]
  readonly places: readonly PlaceId[]
}

/** Dica da revelação: as cartas que bastavam (conjunto de custo mínimo do solucionador). */
export interface HintData {
  readonly keyCardIds: readonly CardId[]
  readonly minCost: number
}

/** Carta-chave na revelação: o conteúdo fica público só depois do fim da partida. */
export interface RevealedCard {
  readonly id: CardId
  readonly source: CardSource
  readonly effect: ClueEffect
  readonly textKey: string
  readonly slots: Slots
  /** Já tinha sido aberta pela equipe? */
  readonly opened: boolean
}

export interface Reveal {
  readonly solution: Solution
  readonly keyCardIds: readonly CardId[]
  /** As cartas do conjunto de custo mínimo, com o texto (para mostrar "as pistas que bastavam"). */
  readonly keyCards: readonly RevealedCard[]
  readonly hint: HintData
}

export type GameEvent =
  | { readonly type: 'moved'; readonly seat: SeatId; readonly placeId: PlaceId }
  | { readonly type: 'clue-found'; readonly seat: SeatId; readonly card: OpenedCard }
  | { readonly type: 'testimony-given'; readonly seat: SeatId; readonly card: OpenedCard }
  | { readonly type: 'candidates-changed'; readonly candidates: CandidateLists }
  | {
      readonly type: 'accused-wrong'
      readonly seat: SeatId
      readonly suspectId: SuspectId
      readonly placeId: PlaceId
    }
  | { readonly type: 'clock-advanced'; readonly actionsLeft: number; readonly clock: string }
  | { readonly type: 'turn-started'; readonly seat: SeatId; readonly turn: number }
  | {
      readonly type: 'won'
      readonly seat: SeatId
      readonly suspectId: SuspectId
      readonly placeId: PlaceId
    }
  | { readonly type: 'timed-out' }
  | { readonly type: 'revealed'; readonly reveal: Reveal }

/** Motivos de recusa: só códigos, nunca dados do mistério. */
export type RefusalReason =
  | 'game-over'
  | 'not-your-turn'
  | 'unknown-place'
  | 'already-here'
  | 'not-at-place'
  | 'already-investigated'
  | 'unknown-suspect'
  | 'already-interrogated'
  | 'no-time'
  | 'suspect-eliminated'
  | 'place-eliminated'
  | 'already-accused'

export type TransitionResult =
  | { readonly ok: true; readonly state: GameState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly reason: RefusalReason }

export interface NotebookEntry {
  readonly id: string
  readonly status: 'open' | 'eliminated'
  /** Pistas abertas que descartaram o item. */
  readonly byCardIds: readonly CardId[]
  /** Pistas only-* abertas cujo grupo contém o item ("um dos 2"). */
  readonly inGroupOf: readonly CardId[]
}

/** Decisão de 25/11/2026: todos os parâmetros do nível são públicos. */
export type PublicDifficultyParams = DifficultyParams

export interface PublicView {
  readonly level: LevelId
  readonly params: PublicDifficultyParams
  readonly cast: Cast
  readonly teamAt: Location
  readonly actionsLeft: number
  /** Horário atual, derivado ("15:30"). */
  readonly clock: string
  readonly seats: readonly SeatId[]
  readonly activeSeat: SeatId
  readonly turn: number
  readonly opened: readonly OpenedCard[]
  /** Só as origens das cartas fechadas, sem conteúdo. */
  readonly unopened: readonly { readonly source: CardSource }[]
  readonly candidates: CandidateLists
  readonly notebook: {
    readonly suspects: readonly NotebookEntry[]
    readonly places: readonly NotebookEntry[]
  }
  readonly wrongAccusations: readonly { readonly suspectId: SuspectId; readonly placeId: PlaceId }[]
  readonly phase: Phase
  /** Só quando a partida acabou. */
  readonly reveal?: Reveal
}
