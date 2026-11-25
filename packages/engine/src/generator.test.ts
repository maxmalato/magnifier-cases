import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { difficulties, difficultyOf } from './data.ts'
import {
  fairnessProblems,
  generateMystery,
  generateMysteryWithStats,
  MysteryGenerationError,
} from './generator.ts'
import { candidatesOf } from './rules.ts'
import { levelIds } from './schema.ts'
import { solve } from './solver.ts'
import { testTheme } from './testing.ts'

const seedArb = fc.integer({ min: 0, max: 2 ** 32 - 1 })
const levelArb = fc.constantFrom(...levelIds)

describe('gerador de mistérios', () => {
  it('mesma semente, mesmo mistério', () => {
    fc.assert(
      fc.property(levelArb, seedArb, (level, seed) => {
        const p = difficultyOf(level)
        expect(generateMystery(p, testTheme, seed)).toEqual(generateMystery(p, testTheme, seed))
      }),
      { numRuns: 100 },
    )
  })

  it('todo mistério é único, tem a folga do nível e o tamanho do elenco do nível', () => {
    fc.assert(
      fc.property(levelArb, seedArb, (level, seed) => {
        const p = difficultyOf(level)
        const m = generateMystery(p, testTheme, seed)
        expect(m.cast.suspects).toHaveLength(p.suspectCount)
        expect(m.cast.places).toHaveLength(p.placeCount)
        expect(m.cards).toHaveLength(p.suspectCount + p.placeCount)
        const result = solve(m.cards, m.cast)
        expect(result.unique).toBe(true)
        expect(result.solution).toEqual(m.solution)
        expect(result.minCost).toBe(m.oracle.minCost)
        expect(m.oracle.slack).toBe(p.actionsTotal - m.oracle.minCost)
        expect(m.oracle.slack).toBeGreaterThanOrEqual(p.minSlack)
      }),
      { numRuns: 200 },
    )
  })

  it('toda carta é verdadeira e segue as regras de justiça', () => {
    fc.assert(
      fc.property(levelArb, seedArb, (level, seed) => {
        const m = generateMystery(difficultyOf(level), testTheme, seed)
        expect(fairnessProblems(m.cards, m.solution)).toEqual([])
        // cada carta, sozinha, mantém a solução entre os candidatos
        for (const card of m.cards) {
          const lists = candidatesOf(m.cast, [card])
          expect(lists.suspects).toContain(m.solution.culpritId)
          expect(lists.places).toContain(m.solution.hideoutId)
        }
        // grupos dentro dos limites do nível; nenhuma carta só com a própria origem
        const p = difficultyOf(level)
        for (const { effect } of m.cards) {
          if (effect.kind.startsWith('only'))
            expect((effect as { ids: readonly string[] }).ids.length).toBeGreaterThanOrEqual(2)
          if (effect.kind.startsWith('exclude'))
            expect((effect as { ids: readonly string[] }).ids.length).toBeLessThanOrEqual(
              p.excludeGroupSize.max,
            )
        }
      }),
      { numRuns: 200 },
    )
  })

  it('cartas fechadas não levam ao texto o efeito de outra origem', () => {
    const m = generateMystery(difficultyOf('expert'), testTheme, 99)
    for (const card of m.cards) {
      expect(card.slots.source).toEqual([card.source.id])
      expect(card.opened).toBe(false)
      expect(testTheme.templates.some((t) => t.textKey === card.textKey)).toBe(true)
    }
  })

  it('sem ruído no Aprendiz e com a mistura dos dados nos outros níveis', () => {
    const kinds = (level: (typeof levelIds)[number]) => {
      const count: Record<string, number> = {}
      for (let seed = 0; seed < 200; seed++)
        for (const c of generateMystery(difficultyOf(level), testTheme, seed).cards)
          count[c.effect.kind] = (count[c.effect.kind] ?? 0) + 1
      return count
    }
    const apprentice = kinds('apprentice')
    expect(apprentice.none ?? 0).toBe(0)
    expect((apprentice['only-suspects'] ?? 0) + (apprentice['only-places'] ?? 0)).toBe(0)
    expect(kinds('legend').none ?? 0).toBeGreaterThan(0)
  })

  it('erro tipado quando o nível é impossível (folga maior que as ações)', () => {
    const impossible = { ...difficultyOf('apprentice'), minSlack: 10, maxAttempts: 5 }
    expect(() => generateMystery(impossible, testTheme, 1)).toThrow(MysteryGenerationError)
    try {
      generateMystery(impossible, testTheme, 1)
    } catch (error) {
      expect((error as MysteryGenerationError).attempts).toBe(5)
      expect((error as Error).message).not.toMatch(/suspect-|place-/)
    }
  })

  it('gera um mistério por nível em menos de 50 ms (média)', () => {
    for (const p of difficulties) {
      const runs = 50
      const start = performance.now()
      let attempts = 0
      for (let seed = 0; seed < runs; seed++)
        attempts += generateMysteryWithStats(p, testTheme, seed).attempts
      const average = (performance.now() - start) / runs
      expect(average, p.id).toBeLessThan(50)
      expect(attempts).toBeGreaterThanOrEqual(runs)
    }
  })
})
