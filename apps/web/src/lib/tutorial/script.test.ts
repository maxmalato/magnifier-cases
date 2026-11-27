import { describe, expect, it } from 'vitest'
import { legalActions, transition, viewFor } from '@magnifier-cases/engine'
import { buildScript, TUTORIAL_SEAT, tutorialState } from './script.ts'
import { TutorialGame } from './tutorial-game.svelte.ts'

describe('roteiro da partida de treino', () => {
  const state = tutorialState()
  const script = buildScript(state)
  const actions = script.flatMap((s) => (s.action ? [s.action] : []))

  it('tem o formato didático: 3 interrogatórios, ir a 1 lugar, investigar e acusar', () => {
    // se o gerador mudar e este teste falhar, escolha outra semente em packages/content
    expect(actions.map((a) => a.type)).toEqual([
      'interrogate',
      'interrogate',
      'interrogate',
      'move',
      'investigate',
      'accuse',
    ])
    // quem é interrogado não é o culpado (a dedução fica clara)
    for (const a of actions)
      if (a.type === 'interrogate') expect(a.suspectId).not.toBe(state.solution.culpritId)
    expect(script.at(-1)?.key).toBe('done')
  })

  it('cada ação do roteiro é válida e, no fim, só sobra a dupla certa', () => {
    let s = state
    for (const action of actions.slice(0, -1)) {
      expect(legalActions(viewFor(s))).toContainEqual(action)
      const r = transition(s, action, { seat: TUTORIAL_SEAT })
      if (!r.ok) throw new Error(r.reason)
      s = r.state
    }
    expect(viewFor(s).candidates.suspects).toEqual([state.solution.culpritId])
    expect(viewFor(s).candidates.places).toEqual([state.solution.hideoutId])
    const won = transition(s, actions.at(-1) as never, { seat: TUTORIAL_SEAT })
    expect(won.ok && won.state.phase).toBe('won')
  })
})

describe('partida de treino', () => {
  it('só aceita a ação do passo; o resto vira aviso, sem gastar tempo', () => {
    const g = new TutorialGame('Detetive')
    expect(g.step.key).toBe('intro')
    // fora do roteiro: nada acontece
    g.act({ type: 'move', placeId: g.view.cast.places[0] as string })
    expect(g.warning).toBe(true)
    expect(g.view.actionsLeft).toBe(g.params.actionsTotal)
    g.next()
    g.next()
    expect(g.step.key).toBe('interrogateFirst')
    // segue o roteiro até o fim
    for (let i = 0; i < 40 && !g.isOver; i++) {
      if (g.step.kind === 'info') g.next()
      else if (g.step.kind === 'ok') g.dismiss()
      else if (g.step.action) g.act(g.step.action)
    }
    expect(g.view.phase).toBe('won')
    expect(g.step.key).toBe('done')
    expect(g.warning).toBe(false)
    expect(g.canEnd).toBe(false)
    g.destroy()
  })
})
