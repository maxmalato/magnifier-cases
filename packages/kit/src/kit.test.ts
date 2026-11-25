import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  codeFromBytes,
  formatCode,
  normalizeCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  TABLE_SEAT,
} from './index.ts'
import { guessGame } from './testing.ts'

describe('código da sala', () => {
  it('normaliza maiúsculas, espaços, traços e o ponto do meio', () => {
    expect(normalizeCode('k7p 4qx')).toBe('K7P4QX')
    expect(normalizeCode('K7P·4QX')).toBe('K7P4QX')
    expect(normalizeCode('k7p-4qx')).toBe('K7P4QX')
  })

  it('recusa tamanho errado e símbolos fora do alfabeto (0, O, 1, I)', () => {
    expect(normalizeCode('K7P4Q')).toBeNull()
    expect(normalizeCode('K7P4QX9')).toBeNull()
    expect(normalizeCode('K0P4QX')).toBeNull()
    expect(normalizeCode('KOP4QX')).toBeNull()
    expect(normalizeCode('K1P4QX')).toBeNull()
    expect(normalizeCode('KIP4QX')).toBeNull()
  })

  it('formata para ler em voz alta', () => {
    expect(formatCode('K7P4QX')).toBe('K7P·4QX')
  })

  it('todo código gerado é válido e sobrevive à normalização', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: ROOM_CODE_LENGTH, maxLength: ROOM_CODE_LENGTH }),
        (bytes) => {
          const code = codeFromBytes(bytes)
          expect(code).toHaveLength(ROOM_CODE_LENGTH)
          expect([...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch))).toBe(true)
          expect(normalizeCode(formatCode(code))).toBe(code)
        },
      ),
    )
  })
})

describe('GameDefinition (jogo fictício com segredo)', () => {
  const SEATS = ['seat-1', 'seat-2']

  it('a visão não leva o segredo enquanto a partida não acaba', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (seed) => {
        const state = guessGame.newGame(guessGame.defaultConfig, SEATS, seed)
        for (const viewer of [...SEATS, TABLE_SEAT]) {
          const view = guessGame.viewFor(state, viewer)
          expect(view).not.toHaveProperty('secret')
        }
      }),
    )
  })

  it('jogando só com a visão, a partida chega ao fim e o segredo aparece só então', () => {
    let state = guessGame.newGame(guessGame.defaultConfig, SEATS, 7)
    for (let step = 0; step < 20 && !guessGame.isOver(state); step++) {
      const seat = guessGame.activeSeat(state)
      if (seat === null) break
      const view = guessGame.viewFor(state, seat)
      expect(view).not.toHaveProperty('secret')
      // palpite escolhido só com a visão: o menor número ainda não tentado
      let n = 1
      while (view.guesses.includes(n)) n++
      const result = guessGame.transition(state, { type: 'guess', n }, seat)
      expect(result.ok).toBe(true)
      if (result.ok) state = result.state
    }
    expect(guessGame.isOver(state)).toBe(true)
    expect(guessGame.viewFor(state, TABLE_SEAT)).toHaveProperty('secret')
  })
})
