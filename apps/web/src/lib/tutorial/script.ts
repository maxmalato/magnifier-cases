// Roteiro da partida de treino ("Como jogar"). O mistério vem do motor, sempre com a mesma
// semente (packages/content, `tutorial`); o roteiro segue o caminho mais curto do solucionador
// (o oráculo): interrogar quem tem as pistas-chave, ir ao lugar da pista-chave, investigar e
// acusar a resposta. No modo de um aparelho o segredo já vive no aparelho (jogo cooperativo); as
// telas continuam desenhadas só com a PublicView.
import { partyCake, tutorial } from '@magnifier-cases/content'
import {
  difficultyOf,
  newGame,
  type Action,
  type ClueCard,
  type DifficultyParams,
  type GameState,
} from '@magnifier-cases/engine'

export const TUTORIAL_SEAT = 'seat-1'

export type StepKey =
  | 'intro'
  | 'clock'
  | 'interrogateFirst'
  | 'interrogate'
  | 'readFirstClue'
  | 'readClue'
  | 'notebook'
  | 'move'
  | 'investigate'
  | 'accuse'
  | 'done'

/**
 * Um passo. `info`: o painel explica e a pessoa toca em Continuar. `act`: só a ação esperada é
 * aceita. `ok`: a pessoa lê a pista e toca em OK. `end`: a partida acabou.
 * `guide`: o que fica destacado na tela (valores de `guided` nos componentes).
 */
export interface Step {
  readonly key: StepKey
  readonly kind: 'info' | 'act' | 'ok' | 'end'
  readonly action?: Action
  readonly guide: readonly string[]
  readonly suspect?: string
  readonly place?: string
}

/** Nível do treino, sem a dica de jogada (o próprio treino já diz o que fazer). */
export function tutorialParams(): DifficultyParams {
  return { ...difficultyOf(tutorial.level), suggestEnabled: false }
}

export function tutorialState(): GameState {
  return newGame({
    params: tutorialParams(),
    theme: partyCake,
    seats: [TUTORIAL_SEAT],
    seed: tutorial.seed,
  })
}

/** Primeiro as pistas que descartam suspeitos, depois as que descartam lugares. */
const bySuspectEffect = (a: ClueCard, b: ClueCard) =>
  Number(!a.effect.kind.endsWith('suspects')) - Number(!b.effect.kind.endsWith('suspects'))

export function buildScript(state: GameState): Step[] {
  const keyCards = state.oracle.keyCardIds.map((id) => {
    const card = state.cards.find((c) => c.id === id)
    if (!card) throw new Error('carta-chave sem carta')
    return card
  })
  const steps: Step[] = [
    { key: 'intro', kind: 'info', guide: [] },
    { key: 'clock', kind: 'info', guide: [] },
  ]
  const suspects = keyCards.filter((c) => c.source.type === 'suspect').sort(bySuspectEffect)
  suspects.forEach((card, i) => {
    const suspect = card.source.id
    steps.push(
      {
        key: i === 0 ? 'interrogateFirst' : 'interrogate',
        kind: 'act',
        action: { type: 'interrogate', suspectId: suspect },
        guide: ['interrogate', `suspect:${suspect}`, 'confirm'],
        suspect,
      },
      { key: i === 0 ? 'readFirstClue' : 'readClue', kind: 'ok', guide: ['ok'] },
    )
  })
  steps.push({ key: 'notebook', kind: 'info', guide: ['notebook', 'notebook-back'] })
  let at = state.teamAt
  for (const card of keyCards.filter((c) => c.source.type === 'place')) {
    const place = card.source.id
    if (at !== place) {
      steps.push({
        key: 'move',
        kind: 'act',
        action: { type: 'move', placeId: place },
        guide: ['move', `place:${place}`, 'confirm'],
        place,
      })
      at = place
    }
    steps.push(
      {
        key: 'investigate',
        kind: 'act',
        action: { type: 'investigate' },
        guide: ['investigate', 'confirm'],
        place,
      },
      { key: 'readClue', kind: 'ok', guide: ['ok'] },
    )
  }
  const { culpritId, hideoutId } = state.solution
  steps.push(
    {
      key: 'accuse',
      kind: 'act',
      action: { type: 'accuse', suspectId: culpritId, placeId: hideoutId },
      guide: [
        'accuse',
        `accuse-suspect:${culpritId}`,
        `accuse-place:${hideoutId}`,
        'accuse-submit',
      ],
      suspect: culpritId,
      place: hideoutId,
    },
    { key: 'done', kind: 'end', guide: [] },
  )
  return steps
}

/** A ação é a esperada pelo passo (mesmo tipo e mesmos alvos). */
export function sameAction(a: Action, b: Action | undefined): boolean {
  return b !== undefined && JSON.stringify(a) === JSON.stringify(b)
}
