// Controlador da partida de treino: uma partida do modo de um aparelho (LocalGame) com um
// roteiro. Só a ação do passo atual é aceita; qualquer outra é recusada com um aviso no painel.
import type { Decision } from '@magnifier-cases/bots'
import { partyCake, tutorial } from '@magnifier-cases/content'
import type { Action } from '@magnifier-cases/engine'
import type { GameController } from '../game/controller.ts'
import { LocalGame } from '../game/local-game.svelte.ts'
import {
  buildScript,
  sameAction,
  TUTORIAL_SEAT,
  tutorialParams,
  tutorialState,
  type Step,
} from './script.ts'

export class TutorialGame implements GameController {
  readonly #game: LocalGame
  readonly script: readonly Step[] = buildScript(tutorialState())
  /** Índice do passo atual. */
  index = $state(0)
  /** A pessoa tentou algo fora do roteiro (o painel mostra o aviso até o próximo passo). */
  warning = $state(false)
  readonly canEnd = false

  constructor(playerName: string) {
    this.#game = new LocalGame({
      params: tutorialParams(),
      theme: partyCake,
      seats: [{ id: TUTORIAL_SEAT, name: playerName, kind: 'human' }],
      seed: tutorial.seed,
      botSeed: 0,
      botDelayMs: 0,
    })
  }

  get step(): Step {
    return this.script[Math.min(this.index, this.script.length - 1)] as Step
  }
  get guide(): readonly string[] {
    return this.step.guide
  }

  // ---------- GameController (delegado à partida local) ----------
  get view() {
    return this.#game.view
  }
  get seats() {
    return this.#game.seats
  }
  get params() {
    return this.#game.params
  }
  get active() {
    return this.#game.active
  }
  get isBotTurn() {
    return false
  }
  get isOver() {
    return this.#game.isOver
  }
  get canAct() {
    return this.#game.canAct
  }
  get overlay() {
    return this.#game.overlay
  }
  get lastMove() {
    return this.#game.lastMove
  }
  hint(): Decision | null {
    return null
  }
  end(): void {}

  act(action: Action): void {
    if (this.step.kind !== 'act' || !sameAction(action, this.step.action)) {
      this.warning = true
      return
    }
    if (this.#game.tryAct(action) === null) this.#advance()
  }

  dismiss(): void {
    this.#game.dismiss()
    if (this.step.kind === 'ok') this.#advance()
  }

  /** "Continuar" nos passos de explicação. */
  next(): void {
    if (this.step.kind === 'info') this.#advance()
  }

  destroy(): void {
    this.#game.destroy()
  }

  #advance(): void {
    this.warning = false
    if (this.index < this.script.length - 1) this.index++
  }
}
