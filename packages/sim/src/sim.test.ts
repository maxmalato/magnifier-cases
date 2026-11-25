import { describe, expect, it } from 'vitest'
import { FULL_RUN_SIZE } from './index.ts'

describe('sim (Etapa 0)', () => {
  it('usa 10.000 mistérios por nível e por bot no protocolo completo', () => {
    expect(FULL_RUN_SIZE).toBe(10_000)
  })
})
