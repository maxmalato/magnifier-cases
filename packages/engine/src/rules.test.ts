import { describe, expect, it } from 'vitest'
import { difficultyOf } from './data.ts'
import { canShowTable, candidatesOf, cardCost, clockAt, startTime } from './rules.ts'
import type { Cast } from './types.ts'

const cast: Cast = { suspects: ['a', 'b', 'c', 'd'], places: ['p', 'q', 'r'] }

describe('candidates', () => {
  it('sem cartas, todo o elenco', () => {
    expect(candidatesOf(cast, [])).toEqual({
      suspects: ['a', 'b', 'c', 'd'],
      places: ['p', 'q', 'r'],
    })
  })

  it('cada tipo de efeito', () => {
    const one = (effect: Parameters<typeof candidatesOf>[1][number]['effect']) =>
      candidatesOf(cast, [{ effect }])
    expect(one({ kind: 'exclude-suspects', ids: ['a', 'c'] }).suspects).toEqual(['b', 'd'])
    expect(one({ kind: 'exclude-places', ids: ['q'] }).places).toEqual(['p', 'r'])
    expect(one({ kind: 'only-suspects', ids: ['b', 'd'] }).suspects).toEqual(['b', 'd'])
    expect(one({ kind: 'only-places', ids: ['p', 'r'] }).places).toEqual(['p', 'r'])
    expect(one({ kind: 'none' })).toEqual(candidatesOf(cast, []))
  })

  it('grupos que se cruzam', () => {
    const result = candidatesOf(cast, [
      { effect: { kind: 'only-suspects', ids: ['a', 'b', 'c'] } },
      { effect: { kind: 'only-suspects', ids: ['b', 'c', 'd'] } },
      { effect: { kind: 'exclude-suspects', ids: ['c'] } },
    ])
    expect(result.suspects).toEqual(['b'])
  })
})

describe('custo das cartas', () => {
  it('suspeito custa 1 e lugar custa 2', () => {
    expect(cardCost({ source: { type: 'suspect', id: 'a' } })).toBe(1)
    expect(cardCost({ source: { type: 'place', id: 'p' } })).toBe(2)
  })
})

describe('relógio derivado', () => {
  it('início de cada nível (13:00, 14:00, 14:00, 14:30)', () => {
    expect(startTime(difficultyOf('apprentice'))).toBe('13:00')
    expect(startTime(difficultyOf('investigator'))).toBe('14:00')
    expect(startTime(difficultyOf('expert'))).toBe('14:00')
    expect(startTime(difficultyOf('legend'))).toBe('14:30')
  })

  it('horário atual pelas ações restantes, sem passar do fim', () => {
    const p = difficultyOf('investigator')
    expect(clockAt(p, 8)).toBe('14:00')
    expect(clockAt(p, 3)).toBe('16:30')
    expect(clockAt(p, 0)).toBe('18:00')
    expect(clockAt(p, -2)).toBe('18:00')
  })
})

describe('canShowTable', () => {
  it.each([
    ['celular em pé', 390, 844, false],
    ['celular deitado', 844, 390, false],
    ['tablet', 768, 1024, true],
    ['notebook', 1280, 720, true],
    ['dobrável aberto', 673, 841, true],
    ['dobrável fechado', 344, 882, false],
    ['TV full HD', 1920, 1080, true],
    ['no limite', 600, 960, true],
    ['um pixel abaixo', 599, 960, false],
  ])('%s (%i × %i) → %s', (_name, width, height, expected) => {
    expect(canShowTable({ width, height })).toBe(expected)
  })
})
