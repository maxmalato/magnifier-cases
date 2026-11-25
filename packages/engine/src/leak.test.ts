// Teste de vazamento (spec, seção 11; CLAUDE.md, "Segredo da solução"). A solução, a semente,
// o oráculo e o conteúdo das cartas fechadas nunca podem sair por viewFor nem pelos eventos de
// uma partida em andamento.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { difficultyOf } from './data.ts'
import { legalActions, newGame, transition, viewFor } from './game.ts'
import { levelIds } from './schema.ts'
import { makeState, testTheme } from './testing.ts'
import type { ClueCard, GameState } from './types.ts'

const SENTINEL = 'ZZLEAKZZ'
const SEED = 918_273_645
const MIN_COST = 777_001
const SLACK = 777_002

/** Marcador único do conteúdo de uma carta fechada. */
const markerOf = (cardId: string) => `${SENTINEL}[${cardId}]`

/** Marca todo segredo com sentinelas: semente, oráculo e conteúdo das cartas fechadas. */
function marked(state: GameState): GameState {
  return {
    ...state,
    seed: SEED,
    oracle: { minCost: MIN_COST, keyCardIds: [`${SENTINEL}-key`], slack: SLACK },
    cards: state.cards.map((c): ClueCard =>
      c.opened || c.textKey.startsWith(SENTINEL)
        ? c
        : {
            ...c,
            textKey: markerOf(c.id),
            slots: { source: [c.source.id], suspects: [markerOf(c.id)] },
            effect: { kind: 'exclude-suspects', ids: [markerOf(c.id)] },
          },
    ),
  }
}

/**
 * Nada de segredo no texto serializado. Com `state`, o conteúdo de cartas já abertas é público
 * (foi revelado de propósito); só os marcadores das cartas ainda fechadas não podem aparecer.
 */
function expectNoLeak(serialized: string, state?: GameState): void {
  if (state) {
    for (const c of state.cards) if (!c.opened) expect(serialized).not.toContain(markerOf(c.id))
  } else {
    expect(serialized).not.toContain(SENTINEL)
  }
  expect(serialized).not.toContain(`${SENTINEL}-key`)
  expect(serialized).not.toContain(String(SEED))
  expect(serialized).not.toContain(String(MIN_COST))
  expect(serialized).not.toContain(String(SLACK))
  expect(serialized).not.toMatch(/"solution"|"culpritId"|"hideoutId"|"oracle"|"seed"/)
}

describe('vazamento', () => {
  it('viewFor não leva marcadores para nenhum assento nem para a mesa', () => {
    const state = marked(makeState())
    for (const viewer of [...state.seats, 'table'])
      expectNoLeak(JSON.stringify(viewFor(state, viewer)))
  })

  it('nem durante a partida, pela visão ou pelos eventos', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...levelIds),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.array(fc.nat(), { maxLength: 12 }),
        (level, seed, choices) => {
          let state = marked(
            newGame({
              params: difficultyOf(level),
              theme: testTheme,
              seats: ['seat-1', 'seat-2'],
              seed,
            }),
          )
          for (const choice of choices) {
            // só ações que não encerram a partida: depois do fim, a revelação é pública
            const options = legalActions(viewFor(state)).filter((a) => a.type !== 'accuse')
            const action = options[choice % options.length]
            if (!action) break
            const r = transition(state, action, { seat: state.activeSeat })
            if (!r.ok) throw new Error(r.reason)
            if (r.state.phase !== 'playing') break
            expectNoLeak(JSON.stringify(r.events), r.state)
            expectNoLeak(JSON.stringify(viewFor(r.state)), r.state)
            state = marked(r.state)
          }
        },
      ),
      { numRuns: 150 },
    )
  })

  it('não interferência: trocar os segredos não muda a visão', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...levelIds),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        (level, seed, otherSeed) => {
          const params = difficultyOf(level)
          const state = newGame({ params, theme: testTheme, seats: ['seat-1'], seed })
          const other = newGame({ params, theme: testTheme, seats: ['seat-1'], seed: otherSeed })
          // mesmo elenco público, outra solução, outra semente, outro oráculo e outras cartas
          const twin: GameState = {
            ...state,
            seed: otherSeed,
            solution: {
              culpritId: state.cast.suspects.at(-1) as string,
              hideoutId: state.cast.places.at(-1) as string,
            },
            oracle: other.oracle,
            cards: state.cards.map((c, i) => ({
              ...c,
              effect: other.cards[i]?.effect ?? c.effect,
              textKey: other.cards[i]?.textKey ?? c.textKey,
            })),
          }
          expect(viewFor(twin)).toEqual(viewFor(state))
        },
      ),
      { numRuns: 100 },
    )
  })

  it('a revelação só aparece quando a partida acaba', () => {
    const playing = makeState()
    expect(viewFor(playing).reveal).toBeUndefined()
    expect(viewFor({ ...playing, phase: 'timeout' }).reveal?.solution).toEqual(playing.solution)
  })

  it('motivos de recusa são só códigos', () => {
    const state = marked(makeState())
    const r = transition(
      state,
      { type: 'accuse', suspectId: 'nobody', placeId: 'nowhere' },
      { seat: 'seat-1' },
    )
    expect(r.ok).toBe(false)
    expectNoLeak(JSON.stringify(r))
  })
})
