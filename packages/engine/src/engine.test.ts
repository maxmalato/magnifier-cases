import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ENGINE_ID } from './index.ts'

describe('engine (Etapa 0)', () => {
  it('exporta o identificador do motor', () => {
    expect(ENGINE_ID).toBe('magnifier-cases/engine')
  })

  // Confere que o fast-check está ligado ao Vitest. As propriedades do motor (spec, seção 11)
  // entram na Etapa 1.
  it('roda testes de propriedade com fast-check', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a))
  })
})
