import { describe, expect, it } from 'vitest'
import { effectSummary } from './text.ts'

describe('resumo do efeito da pista', () => {
  it('descarta, grupo e ruído nos dois idiomas', () => {
    expect(effectSummary({ kind: 'exclude-places', ids: ['market'] }, 'pt-BR')).toBe(
      'Descarta: o Mercado.',
    )
    expect(
      effectSummary({ kind: 'only-suspects', ids: ['dog-biscuit', 'cat-cleo'] }, 'pt-BR'),
    ).toBe('É um destes: o Biscoito ou a Cleo.')
    expect(effectSummary({ kind: 'none' }, 'en')).toBe('It does not change the notebook.')
    expect(effectSummary({ kind: 'exclude-suspects', ids: ['baker-ze', 'vet-caio'] }, 'en')).toBe(
      'Rules out: Mr. Zé and Dr. Caio.',
    )
  })
})
