import { describe, expect, it } from 'vitest'
import { appName, locales } from './index.ts'

describe('i18n', () => {
  it('tem PT-BR e inglês', () => {
    expect(locales).toEqual(['pt-BR', 'en'])
  })

  it('tem um nome público não vazio e sem espaços sobrando', () => {
    expect(appName.trim()).toBe(appName)
    expect(appName.length).toBeGreaterThan(0)
  })
})
