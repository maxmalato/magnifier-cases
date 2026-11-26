import { describe, expect, it } from 'vitest'
import {
  decodeSuggestion,
  encodeSuggestion,
  parseRoomConfig,
  parseSuggestion,
  PROTOCOL_ID,
  roomParams,
  type SuggestionTarget,
} from './index.ts'

const state = { cast: { suspects: ['baker-ze', 'cat-cleo'], places: ['bakery', 'school'] } }

describe('protocolo', () => {
  it('exporta a versão do protocolo', () => {
    expect(PROTOCOL_ID).toBe('magnifier-cases/v1')
  })

  it('configuração da sala: só nível conhecido', () => {
    expect(parseRoomConfig({ level: 'expert' })).toEqual({ level: 'expert' })
    expect(parseRoomConfig({ level: 'boss' })).toBeNull()
    expect(parseRoomConfig({ level: 'expert', extra: 1 })).toBeNull()
  })

  it('sugestão: valida contra o elenco e vai e volta como texto curto', () => {
    const targets: SuggestionTarget[] = [
      { kind: 'option', option: 'investigate' },
      { kind: 'suspect', id: 'cat-cleo' },
      { kind: 'place', id: 'school' },
      { kind: 'pair', suspectId: 'baker-ze', placeId: 'bakery' },
    ]
    for (const target of targets) {
      const text = parseSuggestion(state, target)
      expect(text).toBe(encodeSuggestion(target))
      expect(decodeSuggestion(text ?? '')).toEqual(target)
    }
    expect(parseSuggestion(state, { kind: 'suspect', id: 'vet-caio' })).toBeNull()
    expect(parseSuggestion(state, { kind: 'option', option: 'fly' })).toBeNull()
    expect(parseSuggestion(state, 'place:bakery')).toBeNull()
    expect(decodeSuggestion('nada')).toBeNull()
  })

  it('limite de trocas da sugestão vem dos dados', () => {
    expect(roomParams.maxSuggestionChangesPerTurn).toBeGreaterThanOrEqual(1)
  })
})
