import { describe, expect, it } from 'vitest'
import { difficultyOf } from './data.ts'
import { legalActions, newGame, parseAction, transition, viewFor } from './game.ts'
import { clockAt } from './rules.ts'
import { testTheme, makeState } from './testing.ts'
import type { Action, GameState, TransitionResult } from './types.ts'

// makeState usa o Aprendiz; os valores vêm dos dados (mudam com a calibração)
const P = difficultyOf('apprentice')
const A = { seat: 'seat-1' }
const B = { seat: 'seat-2' }

function ok(result: TransitionResult): Extract<TransitionResult, { ok: true }> {
  if (!result.ok) throw new Error(`recusado: ${result.reason}`)
  return result
}

/** Aplica ações alternando os assentos. */
function play(state: GameState, actions: Action[]): GameState {
  return actions.reduce(
    (s, action) => ok(transition(s, action, { seat: s.activeSeat })).state,
    state,
  )
}

describe('newGame', () => {
  it('começa na Praça, com as ações do nível e a vez do primeiro assento', () => {
    const state = newGame({
      params: difficultyOf('investigator'),
      theme: testTheme,
      seats: ['seat-1', 'seat-2', 'seat-3'],
      seed: 42,
    })
    expect(state.teamAt).toBe('square')
    expect(state.actionsLeft).toBe(difficultyOf('investigator').actionsTotal)
    expect(state.activeSeat).toBe('seat-1')
    expect(state.phase).toBe('playing')
    expect(state.cards.every((c) => !c.opened)).toBe(true)
  })

  it('recusa assentos vazios ou repetidos', () => {
    const base = { params: difficultyOf('apprentice'), theme: testTheme, seed: 1 }
    expect(() => newGame({ ...base, seats: [] })).toThrow()
    expect(() => newGame({ ...base, seats: ['a', 'a'] })).toThrow()
  })
})

describe('ações', () => {
  it('move: custa 1, muda o lugar e passa a vez', () => {
    const r = ok(transition(makeState(), { type: 'move', placeId: 'bakery' }, A))
    expect(r.state.teamAt).toBe('bakery')
    expect(r.state.actionsLeft).toBe(P.actionsTotal - 1)
    expect(r.state.activeSeat).toBe('seat-2')
    expect(r.events.map((e) => e.type)).toEqual(['moved', 'clock-advanced', 'turn-started'])
  })

  it('move: recusa lugar desconhecido, a Praça e o lugar atual', () => {
    expect(transition(makeState(), { type: 'move', placeId: 'nowhere' }, A)).toEqual({
      ok: false,
      reason: 'unknown-place',
    })
    expect(transition(makeState(), { type: 'move', placeId: 'square' }, A)).toMatchObject({
      reason: 'unknown-place',
    })
    expect(
      transition(makeState({ teamAt: 'bakery' }), { type: 'move', placeId: 'bakery' }, A),
    ).toMatchObject({ reason: 'already-here' })
  })

  it('investigate: exige estar no lugar, abre a carta uma vez só', () => {
    expect(transition(makeState(), { type: 'investigate' }, A)).toMatchObject({
      reason: 'not-at-place',
    })
    const r = ok(transition(makeState({ teamAt: 'bakery' }), { type: 'investigate' }, A))
    const card = r.state.cards.find((c) => c.id === 'place:bakery')
    expect(card).toMatchObject({ opened: true, openedAtAction: 1, openedBySeat: 'seat-1' })
    expect(r.state.actionsLeft).toBe(P.actionsTotal - 1)
    expect(r.events.map((e) => e.type)).toContain('clue-found')
    expect(r.events.map((e) => e.type)).toContain('candidates-changed')
    expect(transition(r.state, { type: 'investigate' }, B)).toMatchObject({
      reason: 'already-investigated',
    })
  })

  it('interrogate: de qualquer lugar, uma vez por suspeito', () => {
    const r = ok(transition(makeState(), { type: 'interrogate', suspectId: 'baker-ze' }, A))
    expect(r.events[0]).toMatchObject({ type: 'testimony-given' })
    expect(transition(r.state, { type: 'interrogate', suspectId: 'baker-ze' }, B)).toMatchObject({
      reason: 'already-interrogated',
    })
    expect(transition(r.state, { type: 'interrogate', suspectId: 'cat-cleo' }, B)).toMatchObject({
      reason: 'unknown-suspect',
    })
  })

  it('só quem tem a vez age', () => {
    expect(transition(makeState(), { type: 'move', placeId: 'bakery' }, B)).toEqual({
      ok: false,
      reason: 'not-your-turn',
    })
  })

  it('não muda nada quando recusa', () => {
    const state = makeState()
    const copy = structuredClone(state)
    transition(state, { type: 'investigate' }, A)
    expect(state).toEqual(copy)
  })
})

describe('acusação', () => {
  it('acerto: vitória sem custo de tempo e revelação', () => {
    const r = ok(
      transition(
        makeState(),
        { type: 'accuse', suspectId: 'dog-biscuit', placeId: 'lucia-backyard' },
        A,
      ),
    )
    expect(r.state.phase).toBe('won')
    expect(r.state.actionsLeft).toBe(P.actionsTotal)
    expect(r.events.map((e) => e.type)).toEqual(['won', 'revealed'])
    const reveal = viewFor(r.state).reveal
    expect(reveal?.solution).toEqual({
      culpritId: 'dog-biscuit',
      hideoutId: 'lucia-backyard',
    })
    // as cartas-chave vêm com o texto, inclusive as que ficaram fechadas
    expect(reveal?.keyCards.map((c) => c.id).sort()).toEqual([...(reveal?.keyCardIds ?? [])].sort())
    expect(reveal?.keyCards.every((c) => !c.opened && c.textKey.length > 0)).toBe(true)
    expect(transition(r.state, { type: 'move', placeId: 'bakery' }, B)).toMatchObject({
      reason: 'game-over',
    })
  })

  it('erro: custa o valor do nível, não diz qual metade errou e bloqueia a dupla', () => {
    const state = makeState({}, 'legend')
    const cost = difficultyOf('legend').wrongAccusationCost
    expect(cost).toBeGreaterThan(1)
    const r = ok(transition(state, { type: 'accuse', suspectId: 'baker-ze', placeId: 'bakery' }, A))
    expect(r.state.actionsLeft).toBe(state.actionsLeft - cost)
    const wrong = r.events.find((e) => e.type === 'accused-wrong')
    expect(wrong).toEqual({
      type: 'accused-wrong',
      seat: 'seat-1',
      suspectId: 'baker-ze',
      placeId: 'bakery',
    })
    expect(r.state.phase).toBe('playing')
    expect(
      transition(r.state, { type: 'accuse', suspectId: 'baker-ze', placeId: 'bakery' }, B),
    ).toMatchObject({ reason: 'already-accused' })
  })

  it('erro que estoura o relógio vira tempo esgotado, com revelação', () => {
    const state = makeState({ actionsLeft: 1 }, 'investigator')
    const r = ok(transition(state, { type: 'accuse', suspectId: 'baker-ze', placeId: 'bakery' }, A))
    expect(r.state.phase).toBe('timeout')
    expect(r.events.map((e) => e.type)).toEqual([
      'accused-wrong',
      'clock-advanced',
      'timed-out',
      'revealed',
    ])
    expect(viewFor(r.state).clock).toBe('18:00')
    expect(viewFor(r.state).actionsLeft).toBe(0)
  })

  it('item descartado fica bloqueado', () => {
    // Seu Zé descarta Dona Lúcia e Profª Rita
    const s = play(makeState(), [{ type: 'interrogate', suspectId: 'baker-ze' }])
    expect(
      transition(s, { type: 'accuse', suspectId: 'miss-lucia', placeId: 'bakery' }, B),
    ).toMatchObject({ reason: 'suspect-eliminated' })
    // Tião descarta o Correio
    const s2 = play(s, [{ type: 'interrogate', suspectId: 'mail-tiao' }])
    expect(
      transition(s2, { type: 'accuse', suspectId: 'dog-biscuit', placeId: 'post-office' }, A),
    ).toMatchObject({ reason: 'place-eliminated' })
  })

  it('a última ação sem acerto vira tempo esgotado', () => {
    const s = makeState({ actionsLeft: 1 })
    const r = ok(transition(s, { type: 'interrogate', suspectId: 'teacher-rita' }, A))
    expect(r.state.phase).toBe('timeout')
    expect(r.events.at(-1)).toMatchObject({ type: 'revealed' })
  })
})

describe('caso da seção 4.7', () => {
  it('o caminho do exemplo (7 ações) deixa um único par e a equipe vence', () => {
    const s = play(makeState(), [
      { type: 'interrogate', suspectId: 'mail-tiao' },
      { type: 'interrogate', suspectId: 'baker-ze' },
      { type: 'move', placeId: 'bakery' },
      { type: 'investigate' },
      { type: 'interrogate', suspectId: 'miss-lucia' },
      { type: 'move', placeId: 'school' },
      { type: 'investigate' },
    ])
    const view = viewFor(s)
    expect(view.candidates).toEqual({ suspects: ['dog-biscuit'], places: ['lucia-backyard'] })
    expect(view.actionsLeft).toBe(P.actionsTotal - 7)
    expect(view.clock).toBe(clockAt(P, P.actionsTotal - 7))
    const end = ok(
      transition(
        s,
        { type: 'accuse', suspectId: 'dog-biscuit', placeId: 'lucia-backyard' },
        { seat: s.activeSeat },
      ),
    )
    expect(end.state.phase).toBe('won')
  })
})

describe('caderno', () => {
  it('descartado mostra a pista; grupo only-* marca "um dos N"', () => {
    const state = makeState({
      cards: makeState().cards.map((c) =>
        c.id === 'suspect:dog-biscuit'
          ? { ...c, effect: { kind: 'only-places', ids: ['school', 'lucia-backyard'] } as const }
          : c,
      ),
    })
    const s = play(state, [
      { type: 'interrogate', suspectId: 'baker-ze' },
      { type: 'interrogate', suspectId: 'dog-biscuit' },
    ])
    const view = viewFor(s)
    const lucia = view.notebook.suspects.find((e) => e.id === 'miss-lucia')
    expect(lucia).toEqual({
      id: 'miss-lucia',
      status: 'eliminated',
      byCardIds: ['suspect:baker-ze'],
      inGroupOf: [],
    })
    const school = view.notebook.places.find((e) => e.id === 'school')
    expect(school).toMatchObject({ status: 'open', inGroupOf: ['suspect:dog-biscuit'] })
    const bakery = view.notebook.places.find((e) => e.id === 'bakery')
    expect(bakery).toMatchObject({ status: 'eliminated', byCardIds: ['suspect:dog-biscuit'] })
  })
})

describe('parseAction', () => {
  it('aceita só o formato certo', () => {
    expect(parseAction({ type: 'move', placeId: 'bakery' })).toEqual({
      type: 'move',
      placeId: 'bakery',
    })
    expect(parseAction({ type: 'investigate' })).toEqual({ type: 'investigate' })
    expect(parseAction({ type: 'investigate', extra: 1 })).toBeNull()
    expect(parseAction({ type: 'accuse', suspectId: 'x' })).toBeNull()
    expect(parseAction({ type: 'fly' })).toBeNull()
    expect(parseAction('move')).toBeNull()
    expect(parseAction({ type: 'move', placeId: 'x'.repeat(65) })).toBeNull()
  })
})

describe('legalActions', () => {
  it('toda ação listada é aceita pelo motor', () => {
    const state = newGame({
      params: difficultyOf('expert'),
      theme: testTheme,
      seats: ['seat-1'],
      seed: 5,
    })
    for (const action of legalActions(viewFor(state))) {
      expect(transition(state, action, A).ok, JSON.stringify(action)).toBe(true)
    }
  })
})
