import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createRng, normalizeSeed } from './rng.ts'

describe('PRNG com semente', () => {
  it('mesma semente, mesma sequência', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const a = createRng(normalizeSeed(seed))
        const b = createRng(normalizeSeed(seed))
        for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next())
      }),
    )
  })

  it('números em [0, 1) e inteiros dentro dos limites', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 1, max: 50 }), (seed, n) => {
        const rng = createRng(normalizeSeed(seed))
        for (let i = 0; i < 20; i++) {
          const x = rng.next()
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(1)
          const k = rng.int(n)
          expect(k).toBeGreaterThanOrEqual(0)
          expect(k).toBeLessThan(n)
          const r = rng.range(2, 5)
          expect(r).toBeGreaterThanOrEqual(2)
          expect(r).toBeLessThanOrEqual(5)
        }
      }),
    )
  })

  it('embaralhar não muda a lista original e mantém os itens', () => {
    const list = Object.freeze([1, 2, 3, 4, 5, 6])
    const shuffled = createRng(7).shuffle(list)
    expect([...shuffled].sort()).toEqual([...list])
  })

  it('normaliza sementes estranhas', () => {
    expect(normalizeSeed(Number.NaN)).toBe(0)
    expect(normalizeSeed(-1)).toBe(4294967295)
    expect(normalizeSeed(3.9)).toBe(3)
  })
})
