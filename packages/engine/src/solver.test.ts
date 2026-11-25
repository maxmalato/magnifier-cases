import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { bruteForceMinCost, solve } from './solver.ts'
import { card, exampleCards, exampleCast, exampleSolution } from './testing.ts'
import type { Cast, ClueCard, ClueEffect } from './types.ts'

describe('solucionador', () => {
  it('caso da seção 4.7: único, custo mínimo 7 e as cinco cartas do exemplo', () => {
    const result = solve(exampleCards, exampleCast)
    expect(result.unique).toBe(true)
    expect(result.solution).toEqual(exampleSolution)
    expect(result.minCost).toBe(7)
    expect([...result.keyCardIds].sort()).toEqual([
      'place:bakery',
      'place:school',
      'suspect:baker-ze',
      'suspect:mail-tiao',
      'suspect:miss-lucia',
    ])
  })

  it('sem unicidade quando falta descartar alguém', () => {
    const cards = exampleCards.map((c) =>
      c.id === 'suspect:miss-lucia' ? { ...c, effect: { kind: 'none' } as const } : c,
    )
    const result = solve(cards, exampleCast)
    expect(result.unique).toBe(false)
    expect(result.minCost).toBeNull()
  })

  it('custo máximo: acima dele não devolve caminho', () => {
    expect(solve(exampleCards, exampleCast, 6).minCost).toBeNull()
    expect(solve(exampleCards, exampleCast, 7).minCost).toBe(7)
  })

  // Mistérios pequenos e aleatórios (3 × 3, efeitos quaisquer): o solucionador e a força bruta
  // concordam no custo mínimo.
  const cast: Cast = { suspects: ['a', 'b', 'c'], places: ['p', 'q', 'r'] }
  const effectArb = (domain: 'suspects' | 'places'): fc.Arbitrary<ClueEffect> => {
    const ids = domain === 'suspects' ? cast.suspects : cast.places
    const sub = fc.subarray([...ids], { minLength: 1 })
    return fc.oneof(
      fc.constant<ClueEffect>({ kind: 'none' }),
      sub.map(
        (s) =>
          ({
            kind: domain === 'suspects' ? 'exclude-suspects' : 'exclude-places',
            ids: s,
          }) as ClueEffect,
      ),
      sub.map(
        (s) =>
          ({ kind: domain === 'suspects' ? 'only-suspects' : 'only-places', ids: s }) as ClueEffect,
      ),
    )
  }
  const cardsArb = fc
    .tuple(
      ...[...cast.suspects, ...cast.places].map(() =>
        fc.oneof(effectArb('suspects'), effectArb('places')),
      ),
    )
    .map((effects) =>
      effects.map((effect, i): ClueCard =>
        i < 3
          ? card('suspect', cast.suspects[i] as string, effect)
          : card('place', cast.places[i - 3] as string, effect),
      ),
    )

  it('concorda com a enumeração bruta em mistérios pequenos', () => {
    fc.assert(
      fc.property(cardsArb, (cards) => {
        const result = solve(cards, cast)
        expect(result.minCost).toBe(bruteForceMinCost(cards, cast))
        if (result.unique) {
          // as cartas-chave sozinhas já deixam só a solução
          const keys = cards.filter((c) => result.keyCardIds.includes(c.id))
          const again = solve(keys, cast)
          expect(again.unique).toBe(true)
          expect(again.solution).toEqual(result.solution)
        }
      }),
      { numRuns: 500 },
    )
  })
})
