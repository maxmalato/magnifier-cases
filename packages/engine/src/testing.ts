// Tema fictício para os testes do motor (o motor não importa packages/content). Mesmo
// tamanho do tema da v1: 10 suspeitos e 10 lugares, um modelo por efeito e origem.
import { clueEffectKinds, parseThemePack, type ThemePack } from './schema.ts'

const letters = 'abcdefghij'.split('')

export const testTheme: ThemePack = parseThemePack({
  id: 'test-theme',
  startPlaceId: 'square',
  suspects: letters.map((l, i) => ({
    id: `suspect-${l}`,
    nameKey: `s.${l}`,
    gender: i % 2 ? 'f' : 'm',
  })),
  places: letters.map((l, i) => ({
    id: `place-${l}`,
    nameKey: `p.${l}`,
    gender: i % 2 ? 'm' : 'f',
  })),
  templates: clueEffectKinds.flatMap((kind) => [
    {
      id: `${kind}-suspect`,
      effectKind: kind,
      sourceType: 'suspect',
      textKey: `t.${kind}.s`,
      weight: 1,
    },
    {
      id: `${kind}-place`,
      effectKind: kind,
      sourceType: 'place',
      textKey: `t.${kind}.p`,
      weight: 1,
    },
  ]),
})

import { difficultyOf } from './data.ts'
import type { LevelId } from './schema.ts'
import type { Cast, ClueCard, ClueEffect, GameState, Solution } from './types.ts'

/** Carta fechada a partir da origem e do efeito (para montar casos de teste à mão). */
export function card(type: 'suspect' | 'place', sourceId: string, effect: ClueEffect): ClueCard {
  return {
    id: `${type}:${sourceId}`,
    source: type === 'suspect' ? { type, id: sourceId } : { type, id: sourceId },
    effect,
    textKey: `t.${effect.kind}`,
    slots: { source: [sourceId] },
    opened: false,
  }
}

/**
 * Caso da seção 4.7 das regras (Aprendiz, 5 × 5): culpado Biscoito, esconderijo Quintal da
 * Lúcia. As cartas sem papel no exemplo são ruído.
 */
export const exampleCast: Cast = {
  suspects: ['baker-ze', 'miss-lucia', 'dog-biscuit', 'mail-tiao', 'teacher-rita'],
  places: ['bakery', 'school', 'market', 'post-office', 'lucia-backyard'],
}
export const exampleSolution: Solution = { culpritId: 'dog-biscuit', hideoutId: 'lucia-backyard' }
export const exampleCards: readonly ClueCard[] = [
  card('suspect', 'baker-ze', { kind: 'exclude-suspects', ids: ['miss-lucia', 'teacher-rita'] }),
  card('suspect', 'miss-lucia', { kind: 'exclude-suspects', ids: ['baker-ze', 'mail-tiao'] }),
  card('suspect', 'dog-biscuit', { kind: 'none' }),
  card('suspect', 'mail-tiao', { kind: 'exclude-places', ids: ['post-office'] }),
  card('suspect', 'teacher-rita', { kind: 'none' }),
  card('place', 'bakery', { kind: 'exclude-places', ids: ['school', 'market'] }),
  card('place', 'school', { kind: 'exclude-places', ids: ['bakery'] }),
  card('place', 'market', { kind: 'none' }),
  card('place', 'post-office', { kind: 'none' }),
  card('place', 'lucia-backyard', { kind: 'none' }),
]

/** Estado montado à mão (sem gerador), com valores padrão do caso da seção 4.7. */
export function makeState(
  overrides: Partial<GameState> = {},
  level: LevelId = 'apprentice',
): GameState {
  const params = difficultyOf(level)
  return {
    level,
    params,
    seed: 12345,
    cast: exampleCast,
    solution: exampleSolution,
    cards: exampleCards,
    oracle: {
      minCost: 7,
      keyCardIds: [
        'suspect:baker-ze',
        'suspect:miss-lucia',
        'suspect:mail-tiao',
        'place:bakery',
        'place:school',
      ],
      slack: 3,
    },
    teamAt: 'square',
    actionsLeft: params.actionsTotal,
    seats: ['seat-1', 'seat-2'],
    activeSeat: 'seat-1',
    turn: 0,
    wrongAccusations: [],
    phase: 'playing',
    ...overrides,
  }
}

/** Congela o objeto inteiro (para provar que nada é mutado). */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}
