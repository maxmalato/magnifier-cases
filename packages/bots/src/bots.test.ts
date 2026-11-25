import {
  difficultyOf,
  levelIds,
  newGame,
  transition,
  viewFor,
  type GameState,
  type PublicView,
} from '@magnifier-cases/engine'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  botDecision,
  botMove,
  BotParamsSchema,
  botParams,
  botSkills,
  guessingIsSafe,
  suggest,
} from './index.ts'
import { testTheme } from '@magnifier-cases/engine/testing'

const SEATS = ['seat-1', 'seat-2']

function start(level: (typeof levelIds)[number], seed: number): GameState {
  return newGame({ params: difficultyOf(level), theme: testTheme, seats: SEATS, seed })
}

describe('bots', () => {
  it('prevê as três políticas da spec', () => {
    expect(botSkills).toEqual(['ideal', 'casual', 'random'])
  })

  it('toda jogada de todo bot é aceita pelo motor e a partida termina', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...levelIds),
        fc.constantFrom(...botSkills),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        (level, skill, seed, botSeed) => {
          let state = start(level, seed)
          for (let step = 0; step < 50 && state.phase === 'playing'; step++) {
            const seat = state.activeSeat
            const action = botMove(viewFor(state, seat), seat, { skill, seed: botSeed })
            const result = transition(state, action, { seat })
            expect(result.ok, `${skill}: ${JSON.stringify(action)}`).toBe(true)
            if (result.ok) state = result.state
          }
          expect(state.phase).not.toBe('playing')
        },
      ),
      { numRuns: 200 },
    )
  })

  it('mesma visão e mesma semente, mesma jogada', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...botSkills),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        (skill, seed, botSeed) => {
          const view = viewFor(start('expert', seed))
          expect(botMove(view, 'seat-1', { skill, seed: botSeed })).toEqual(
            botMove(view, 'seat-1', { skill, seed: botSeed }),
          )
        },
      ),
    )
  })

  it('acusa quando resta uma dupla', () => {
    const base = viewFor(start('apprentice', 3))
    const view: PublicView = {
      ...base,
      candidates: {
        suspects: [base.cast.suspects[0] as string],
        places: [base.cast.places[0] as string],
      },
    }
    for (const skill of botSkills)
      expect(botMove(view, 'seat-1', { skill, seed: 1 })).toEqual({
        type: 'accuse',
        suspectId: base.cast.suspects[0],
        placeId: base.cast.places[0],
      })
  })

  it('acusar todas as duplas é seguro quando cabe no relógio', () => {
    const view = viewFor(start('investigator', 1)) // erro custa 2
    expect(guessingIsSafe({ ...view, actionsLeft: 5 }, 3)).toBe(true) // 2 erros (4) + 1
    expect(guessingIsSafe({ ...view, actionsLeft: 4 }, 3)).toBe(false)
    expect(guessingIsSafe({ ...view, actionsLeft: 1 }, 1)).toBe(true)
  })

  it('na última ação, acusa', () => {
    const view = { ...viewFor(start('expert', 8)), actionsLeft: 1 }
    expect(botMove(view, 'seat-1', { skill: 'ideal', seed: 0 }).type).toBe('accuse')
  })

  it('o bot ideal abre carta no início da partida', () => {
    const decision = botDecision(viewFor(start('legend', 4)), 'seat-1', { skill: 'ideal', seed: 0 })
    expect(decision?.reason).toBe('best-card')
  })

  it('sem jogada depois do fim', () => {
    const view = { ...viewFor(start('apprentice', 2)), phase: 'won' as const }
    expect(botDecision(view, 'seat-1', { skill: 'ideal', seed: 0 })).toBeNull()
    expect(() => botMove(view, 'seat-1', { skill: 'ideal', seed: 0 })).toThrow()
  })
})

describe('dica de jogada', () => {
  it('só nos níveis com a dica ligada (Aprendiz)', () => {
    expect(suggest(viewFor(start('apprentice', 1)), 'seat-1')).not.toBeNull()
    for (const level of ['investigator', 'expert', 'legend'] as const)
      expect(suggest(viewFor(start(level, 1)), 'seat-1')).toBeNull()
  })

  it('é a jogada do bot ideal', () => {
    const view = viewFor(start('apprentice', 9))
    expect(suggest(view, 'seat-1')?.action).toEqual(
      botMove(view, 'seat-1', { skill: 'ideal', seed: 123 }),
    )
  })
})

describe('parâmetros dos bots', () => {
  it('carregam do JSON e recusam valores fora do lugar', () => {
    expect(botParams.casual.mistakeRate).toBeGreaterThanOrEqual(0)
    expect(
      BotParamsSchema.safeParse({ ...botParams, casual: { ...botParams.casual, mistakeRate: 2 } })
        .success,
    ).toBe(false)
    expect(BotParamsSchema.safeParse({ ...botParams, random: { accuseMaxPairs: 0 } }).success).toBe(
      false,
    )
  })
})
