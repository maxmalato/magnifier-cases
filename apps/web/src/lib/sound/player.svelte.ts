// Toca os sons. Ligado por padrão, com a preferência lembrada neste aparelho (só "on"/"off",
// nenhum dado pessoal). Sem áudio no aparelho, o jogo segue em silêncio.
import { scheduleCue, type Cue } from './cues.ts'

const STORAGE_KEY = 'magnifier-cases.sound'

function readSaved(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export class SoundPlayer {
  #context: AudioContext | null = null
  enabled = $state(readSaved() !== 'off')

  setEnabled(on: boolean): void {
    this.enabled = on
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }

  play(cue: Cue | null): void {
    if (!cue || !this.enabled || typeof AudioContext === 'undefined') return
    try {
      this.#context ??= new AudioContext()
      const ctx = this.#context
      // o navegador só libera o som depois de um toque ou tecla; antes disso, fica em silêncio
      if (ctx.state === 'suspended') void ctx.resume()
      scheduleCue(ctx, cue, ctx.currentTime + 0.01)
    } catch {
      // sem áudio no aparelho
    }
  }
}

export const sound = new SoundPlayer()
