// Propriedades do motor ao longo de partidas aleatórias (spec, seção 11): a solução sempre
// pertence aos candidatos, candidatos nunca aumentam, transition nunca muta a entrada e a
// mesma semente com as mesmas ações gera o mesmo resultado.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { difficultyOf } from './data.ts'
import { legalActions, newGame, transition, viewFor } from './game.ts'
import { candidates } from './rules.ts'
import { levelIds } from './schema.ts'
import { deepFreeze, testTheme } from './testing.ts'
import type { GameEvent, GameState } from './types.ts'

const SEATS = ['seat-1', 'seat-2', 'seat-3']

/** Joga uma partida escolhendo, a cada passo, uma ação legal pelos números da lista. */
function playOut(level: (typeof levelIds)[number], seed: number, choices: readonly number[]) {
  let state = newGame({ params: difficultyOf(level), theme: testTheme, seats: SEATS, seed })
  const history: { before: GameState; after: GameState; events: readonly GameEvent[] }[] = []
  for (const choice of choices) {
    if (state.phase !== 'playing') break
    const options = legalActions(viewFor(state))
    const action = options[choice % options.length]
    if (!action) break
    const before = deepFreeze(state)
    const result = transition(before, action, { seat: state.activeSeat })
    if (!result.ok) throw new Error(`ação legal recusada: ${result.reason}`)
    history.push({ before, after: result.state, events: result.events })
    state = result.state
  }
  return { state, history }
}

const gameArb = fc.record({
  level: fc.constantFrom(...levelIds),
  seed: fc.integer({ min: 0, max: 2 ** 32 - 1 }),
  choices: fc.array(fc.nat(), { minLength: 1, maxLength: 15 }),
})

describe('propriedades da partida', () => {
  it('a solução sempre pertence aos candidatos', () => {
    fc.assert(
      fc.property(gameArb, ({ level, seed, choices }) => {
        const { history } = playOut(level, seed, choices)
        for (const { after } of history) {
          const lists = candidates(after)
          expect(lists.suspects).toContain(after.solution.culpritId)
          expect(lists.places).toContain(after.solution.hideoutId)
        }
      }),
      { numRuns: 200 },
    )
  })

  it('candidatos nunca aumentam', () => {
    fc.assert(
      fc.property(gameArb, ({ level, seed, choices }) => {
        const { history } = playOut(level, seed, choices)
        for (const { before, after } of history) {
          const a = candidates(before)
          const b = candidates(after)
          expect(b.suspects.every((id) => a.suspects.includes(id))).toBe(true)
          expect(b.places.every((id) => a.places.includes(id))).toBe(true)
        }
      }),
      { numRuns: 200 },
    )
  })

  it('transition nunca muta a entrada (estado congelado) e o relógio só anda', () => {
    fc.assert(
      fc.property(gameArb, ({ level, seed, choices }) => {
        // playOut congela cada estado antes de passar a transition: mutar lançaria erro
        const { history } = playOut(level, seed, choices)
        for (const { before, after } of history) {
          expect(after.actionsLeft).toBeLessThanOrEqual(before.actionsLeft)
          expect(after.turn).toBe(before.turn + 1)
        }
      }),
      { numRuns: 200 },
    )
  })

  it('mesma semente e mesmas ações, mesmo resultado', () => {
    fc.assert(
      fc.property(gameArb, ({ level, seed, choices }) => {
        const a = playOut(level, seed, choices)
        const b = playOut(level, seed, choices)
        expect(a.state).toEqual(b.state)
        expect(a.history.map((h) => h.events)).toEqual(b.history.map((h) => h.events))
      }),
      { numRuns: 100 },
    )
  })

  it('a partida sempre termina dentro das ações do nível', () => {
    fc.assert(
      fc.property(gameArb, ({ level, seed }) => {
        // escolhe sempre a primeira ação que não é acusação (gasta tempo até o fim)
        let state = newGame({ params: difficultyOf(level), theme: testTheme, seats: SEATS, seed })
        for (let step = 0; step < 50 && state.phase === 'playing'; step++) {
          const options = legalActions(viewFor(state))
          const action = options.find((a) => a.type !== 'accuse') ?? options[0]
          if (!action) break
          const r = transition(state, action, { seat: state.activeSeat })
          if (!r.ok) throw new Error(r.reason)
          state = r.state
        }
        expect(state.phase).not.toBe('playing')
        expect(state.turn).toBeLessThanOrEqual(difficultyOf(level).actionsTotal)
      }),
      { numRuns: 100 },
    )
  })
})
