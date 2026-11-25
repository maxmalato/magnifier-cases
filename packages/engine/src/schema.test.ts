import { describe, expect, it } from 'vitest'
import { difficulties, difficultyOf } from './data.ts'
import { DifficultyParamsSchema, parseDifficulties, parseThemePack } from './schema.ts'
import { testTheme } from './testing.ts'

describe('dados dos níveis', () => {
  it('os quatro níveis carregam e passam no schema', () => {
    expect(difficulties.map((d) => d.id)).toEqual([
      'apprentice',
      'investigator',
      'expert',
      'legend',
    ])
  })

  it('dica de jogada ligada só no Aprendiz (decisão de 25/11/2026)', () => {
    expect(difficulties.filter((d) => d.suggestEnabled).map((d) => d.id)).toEqual(['apprentice'])
  })

  it('recusa nível repetido ou faltando', () => {
    const list = [...difficulties]
    expect(() => parseDifficulties([...list.slice(0, 3), list[0]])).toThrow()
    expect(() => parseDifficulties(list.slice(0, 3))).toThrow()
  })

  it('recusa valores fora do lugar', () => {
    const base = difficultyOf('expert')
    const bad = (patch: object) => DifficultyParamsSchema.safeParse({ ...base, ...patch }).success
    expect(bad({})).toBe(true)
    expect(bad({ noiseRate: 1.2 })).toBe(false)
    expect(bad({ noiseRate: 0.7, includeRate: 0.5 })).toBe(false)
    expect(bad({ includeGroupSize: { min: 1, max: 3 } })).toBe(false)
    expect(bad({ excludeGroupSize: { min: 3, max: 2 } })).toBe(false)
    expect(bad({ deadline: '25:00' })).toBe(false)
    expect(bad({ actionsTotal: 40 })).toBe(false)
  })
})

describe('schema do tema', () => {
  it('o tema de teste é válido', () => {
    expect(testTheme.suspects).toHaveLength(10)
  })

  it('recusa a Praça como lugar, ids repetidos e efeito sem modelo', () => {
    const square = {
      ...testTheme,
      places: [...testTheme.places, { id: 'square', nameKey: 'x', gender: 'f' }],
    }
    expect(() => parseThemePack(square)).toThrow()
    const repeated = { ...testTheme, places: [...testTheme.places, testTheme.suspects[0]] }
    expect(() => parseThemePack(repeated)).toThrow()
    const missing = {
      ...testTheme,
      templates: testTheme.templates.filter((t) => t.id !== 'none-place'),
    }
    expect(() => parseThemePack(missing)).toThrow(/none/)
  })
})
