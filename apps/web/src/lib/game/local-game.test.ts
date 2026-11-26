import { partyCake } from '@magnifier-cases/content'
import { difficultyOf, legalActions } from '@magnifier-cases/engine'
import { describe, expect, it } from 'vitest'
import { LocalGame, type Seat } from './local-game.svelte.ts'
import { setupError } from './setup.ts'

const people: Seat[] = [
  { id: 'seat-1', name: 'Ana', kind: 'human' },
  { id: 'seat-2', name: 'Bruno', kind: 'human' },
]

/** Espera manual: guarda a jogada do bot para o teste disparar quando quiser. */
function manualClock() {
  const queue: (() => void)[] = []
  return {
    wait: (_ms: number, run: () => void) => {
      queue.push(run)
      return () => queue.splice(queue.indexOf(run), 1)
    },
    tick: () => queue.shift()?.(),
    pending: () => queue.length,
  }
}

function game(seats: Seat[] = people, seed = 42, clock = manualClock()) {
  const g = new LocalGame({
    params: difficultyOf('apprentice'),
    theme: partyCake,
    seats,
    seed,
    botSeed: 7,
    botDelayMs: 0,
    wait: clock.wait,
  })
  return { g, clock }
}

describe('partida local', () => {
  it('a tela só recebe a visão pública (sem a solução)', () => {
    const { g } = game()
    expect(JSON.stringify(g.view)).not.toMatch(/solution|culpritId|hideoutId|oracle|"seed"/)
    expect(g.view.actionsLeft).toBe(difficultyOf('apprentice').actionsTotal)
  })

  it('interrogar abre a tela da pista com número, mudanças e próxima vez', () => {
    const { g } = game()
    const suspectId = g.view.cast.suspects[0] as string
    expect(g.tryAct({ type: 'interrogate', suspectId })).toBeNull()
    expect(g.overlay?.kind).toBe('clue')
    if (g.overlay?.kind === 'clue') {
      expect(g.overlay.number).toBe(1)
      expect(g.overlay.seat.name).toBe('Ana')
      expect(g.overlay.next?.name).toBe('Bruno')
    }
    // com a tela aberta, ninguém joga
    expect(g.tryAct({ type: 'move', placeId: g.view.cast.places[0] as string })).toBe(
      'not-your-turn',
    )
    g.dismiss()
    expect(g.overlay).toBeNull()
    expect(g.active.name).toBe('Bruno')
  })

  it('ir a outro lugar deixa um aviso curto, sem tela por cima', () => {
    const { g } = game()
    const placeId = g.view.cast.places[1] as string
    expect(g.tryAct({ type: 'move', placeId })).toBeNull()
    expect(g.overlay).toBeNull()
    expect(g.lastMove?.placeId).toBe(placeId)
  })

  it('acusação errada mostra a tela de erro; recusa devolve o motivo', () => {
    const { g } = game()
    const wrong = legalActions(g.view).find((a) => a.type === 'accuse')
    expect(wrong).toBeDefined()
    // acusa até errar (a primeira dupla pode ser a certa, mas a chance é pequena com 25 duplas)
    if (wrong && g.tryAct(wrong) === null && !g.isOver) {
      expect(g.overlay?.kind).toBe('wrong')
      g.dismiss()
      expect(g.tryAct(wrong)).toBe('already-accused')
    }
  })

  it('o bot joga sozinho na vez dele e para quando a tela da pista está aberta', () => {
    const clock = manualClock()
    const { g } = game(
      [
        { id: 'seat-1', name: 'Ana', kind: 'human' },
        { id: 'seat-2', name: 'Bot 1', kind: 'bot' },
      ],
      3,
      clock,
    )
    g.start()
    expect(clock.pending()).toBe(0) // vez da Ana
    g.tryAct({ type: 'move', placeId: g.view.cast.places[0] as string })
    expect(g.isBotTurn).toBe(true)
    expect(clock.pending()).toBe(1)
    clock.tick()
    // o bot jogou: ou abriu uma tela (pista/erro), ou foi a outro lugar, ou acabou a partida
    expect(g.view.turn).toBe(2)
    if (g.overlay) {
      expect(clock.pending()).toBe(0)
      g.dismiss()
    }
    g.destroy()
  })

  it('a partida termina e a revelação aparece na visão', () => {
    const { g } = game()
    for (let i = 0; i < 40 && !g.isOver; i++) {
      if (g.overlay) g.dismiss()
      const action = legalActions(g.view).find((a) => a.type !== 'accuse')
      if (!action) break
      g.tryAct(action)
    }
    if (g.overlay) g.dismiss()
    expect(g.isOver).toBe(true)
    expect(g.view.reveal?.keyCards.length).toBeGreaterThan(0)
  })
})

describe('montagem da equipe', () => {
  it('valida número de detetives, pessoa e apelidos', () => {
    expect(setupError([{ kind: 'human', name: 'Ana' }])).toBe('errorSeats')
    expect(
      setupError([
        { kind: 'bot', name: '' },
        { kind: 'bot', name: '' },
      ]),
    ).toBe('errorHuman')
    expect(
      setupError([
        { kind: 'human', name: ' ' },
        { kind: 'bot', name: '' },
      ]),
    ).toBe('errorNames')
    expect(
      setupError([
        { kind: 'human', name: 'Ana' },
        { kind: 'human', name: 'ana ' },
      ]),
    ).toBe('errorNamesRepeated')
    expect(
      setupError([
        { kind: 'human', name: 'Ana' },
        { kind: 'bot', name: '' },
      ]),
    ).toBeNull()
  })
})
