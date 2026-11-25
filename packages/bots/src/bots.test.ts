import { describe, expect, it } from 'vitest'
import { botSkills } from './index.ts'

describe('bots (Etapa 0)', () => {
  it('prevê as três políticas da spec', () => {
    expect(botSkills).toEqual(['ideal', 'casual', 'random'])
  })
})
