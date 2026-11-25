// Regras como funções puras (spec, seção 5).
import { minutesOf, type DifficultyParams } from './schema.ts'
import type { Cast, CandidateLists, ClueCard, ClueEffect, GameState } from './types.ts'

/**
 * Custo de uma carta para o solucionador e as métricas: interrogar = 1 ação; investigar um
 * lugar = 2 ações (ir até lá e investigar). No jogo, `move` e `investigate` custam 1 cada.
 */
export function cardCost(card: Pick<ClueCard, 'source'>): 1 | 2 {
  return card.source.type === 'suspect' ? 1 : 2
}

/** Aplica um efeito a listas de candidatos (mantém a ordem do elenco). */
export function applyEffect(lists: CandidateLists, effect: ClueEffect): CandidateLists {
  switch (effect.kind) {
    case 'exclude-suspects':
      return { ...lists, suspects: lists.suspects.filter((id) => !effect.ids.includes(id)) }
    case 'exclude-places':
      return { ...lists, places: lists.places.filter((id) => !effect.ids.includes(id)) }
    case 'only-suspects':
      return { ...lists, suspects: lists.suspects.filter((id) => effect.ids.includes(id)) }
    case 'only-places':
      return { ...lists, places: lists.places.filter((id) => effect.ids.includes(id)) }
    case 'none':
      return lists
  }
}

/** Candidatos a partir do elenco e dos efeitos de cartas (abertas, na partida). */
export function candidatesOf(
  cast: Cast,
  cards: readonly { readonly effect: ClueEffect }[],
): CandidateLists {
  return cards.reduce<CandidateLists>((lists, card) => applyEffect(lists, card.effect), {
    suspects: cast.suspects,
    places: cast.places,
  })
}

/** Candidatos da partida: só as cartas abertas contam. Fonte do caderno (nunca guardado). */
export function candidates(state: GameState): CandidateLists {
  return candidatesOf(
    state.cast,
    state.cards.filter((c) => c.opened),
  )
}

/** Minutos → "HH:MM". */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Horário de início do nível: deadline − ações × minutos por ação. */
export function startTime(params: DifficultyParams): string {
  return formatTime(minutesOf(params.deadline) - params.actionsTotal * params.actionMinutes)
}

/** Horário atual: deadline − ações restantes × minutos (nunca depois do deadline). */
export function clockAt(params: DifficultyParams, actionsLeft: number): string {
  return formatTime(minutesOf(params.deadline) - Math.max(0, actionsLeft) * params.actionMinutes)
}

/** Menor lado da tela física (px CSS) para oferecer a tela da mesa (regras, seção 8). */
export const TABLE_MIN_SCREEN_SIDE = 600

/** A tela da mesa só aparece em tela grande. Usar `window.screen`, não a janela. */
export function canShowTable(screen: { readonly width: number; readonly height: number }): boolean {
  return Math.min(screen.width, screen.height) >= TABLE_MIN_SCREEN_SIDE
}
