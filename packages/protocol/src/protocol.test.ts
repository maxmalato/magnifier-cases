import { describe, expect, it } from 'vitest'
import { PROTOCOL_ID } from './index.ts'

describe('protocol (Etapa 0)', () => {
  it('exporta a versão do protocolo', () => {
    expect(PROTOCOL_ID).toBe('magnifier-cases/v1')
  })
})
