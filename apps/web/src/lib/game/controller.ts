// O que as telas da partida usam, venha a partida deste aparelho (LocalGame) ou da sala online
// (OnlineGame). As telas só recebem a PublicView e pedem ações; nunca calculam regra.
import type { Decision } from '@magnifier-cases/bots'
import type {
  Action,
  CandidateLists,
  DifficultyParams,
  OpenedCard,
  PublicView,
  SeatId,
} from '@magnifier-cases/engine'
import type { SuggestionTarget } from '@magnifier-cases/protocol'

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

/** Tela por cima do jogo depois de uma jogada. "OK" só fecha a tela neste aparelho. */
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

/** Sugestão (opinar) já com o nome de quem sugeriu. */
export interface SuggestionView {
  readonly seat: Seat
  readonly target: SuggestionTarget
}

/** Só no online: opinar, avisos e estado da conexão. */
export interface OnlineControls {
  readonly mySeat: SeatId | null
  readonly code: string
  readonly suggestions: readonly SuggestionView[]
  /** Este aparelho pode opinar agora (fora da própria vez, com a partida rolando). */
  readonly canSuggest: boolean
  /** Quantas vezes ainda dá para marcar ou trocar a sugestão nesta jogada. */
  readonly suggestionsLeft: number
  /** Limite de trocas por jogada (dados). */
  readonly suggestionLimit: number
  /** Última recusa do servidor, já traduzida (some sozinha). */
  readonly error: string | null
  readonly mySuggestion: SuggestionTarget | null
  suggest(target: SuggestionTarget): void
  unsuggest(): void
  /** Avisos curtos de conexão (alguém caiu, bot assumiu, voltou), do mais antigo ao mais novo. */
  readonly notices: readonly string[]
  readonly reconnecting: boolean
  /** Pede uma nova partida (só quem comanda a sala). */
  readonly canPlayAgain: boolean
}

export interface GameController {
  readonly view: PublicView
  readonly seats: readonly Seat[]
  readonly params: DifficultyParams
  readonly active: Seat
  /** A vez é de um bot (ou do bot no lugar de quem caiu). */
  readonly isBotTurn: boolean
  readonly isOver: boolean
  /** Este aparelho pode jogar agora. */
  readonly canAct: boolean
  readonly overlay: Overlay | null
  readonly lastMove: { readonly seat: Seat; readonly placeId: string } | null
  hint(): Decision | null
  act(action: Action): void
  dismiss(): void
  /** Presente só na partida online. */
  readonly online?: OnlineControls
}

/** Mudanças no caderno entre os candidatos de antes e de depois de uma pista. */
export function changesBetween(
  before: CandidateLists,
  after: CandidateLists,
  card: OpenedCard,
): NotebookChange[] {
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
