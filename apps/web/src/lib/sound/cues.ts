// Sons do jogo: curtos, sintetizados no navegador (Web Audio), sem arquivos de áudio.
// Para não virar barulho, cada jogada toca só o som mais importante. O som nunca carrega
// informação que não esteja também na tela (regras, seção 12).
// Origem: village-flood, apps/web/src/lib/sound.ts (commit dc9b801). Mudanças: sons e
// eventos deste jogo, notas novas e sem ruído (não há chuva aqui).
import type { GameEvent, SeatId } from '@magnifier-cases/engine'

export type Cue = 'won' | 'timed-out' | 'wrong' | 'clue' | 'step' | 'your-turn'

/** Do mais importante para o menos importante. */
const PRIORITY: readonly Cue[] = ['won', 'timed-out', 'wrong', 'clue', 'step', 'your-turn']

function cueOf(event: GameEvent, mySeat: SeatId | null): Cue | null {
  switch (event.type) {
    case 'won':
      return 'won'
    case 'timed-out':
      return 'timed-out'
    case 'accused-wrong':
      return 'wrong'
    case 'clue-found':
    case 'testimony-given':
      return 'clue'
    case 'moved':
      return 'step'
    case 'turn-started':
      return mySeat !== null && event.seat === mySeat ? 'your-turn' : null
    default:
      return null
  }
}

/**
 * O som de uma jogada. `mySeat`: assento deste aparelho no online, para o aviso "sua vez";
 * null no modo de um aparelho e na mesa (todos jogam olhando a mesma tela).
 */
export function cueFor(events: readonly GameEvent[], mySeat: SeatId | null = null): Cue | null {
  let best: Cue | null = null
  for (const event of events) {
    const cue = cueOf(event, mySeat)
    if (cue && (best === null || PRIORITY.indexOf(cue) < PRIORITY.indexOf(best))) best = cue
  }
  return best
}

export interface Note {
  /** Frequência em Hz. */
  freq: number
  /** Início e duração em segundos. */
  at: number
  dur: number
  wave?: OscillatorType
  volume?: number
  /** Frequência final (deslize). */
  to?: number
}

// Notas originais, compostas para o jogo. Coisas boas sobem (arpejos em sol maior); a lupa
// achando pista é um "plim" duplo; erro e tempo esgotado descem, sem susto (todas as idades).
const G4 = 392.0
const B4 = 493.88
const D5 = 587.33
const G5 = 783.99
const B5 = 987.77
const D6 = 1174.66

export const CUES: Record<Cue, readonly Note[]> = {
  won: [
    { freq: G4, at: 0, dur: 0.16 },
    { freq: B4, at: 0.13, dur: 0.16 },
    { freq: D5, at: 0.26, dur: 0.16 },
    { freq: G5, at: 0.39, dur: 0.55, volume: 0.2 },
    { freq: B5, at: 0.39, dur: 0.55, volume: 0.1 },
  ],
  'timed-out': [
    // tique-taque e depois uma descida suave
    { freq: 1400, at: 0, dur: 0.04, wave: 'square', volume: 0.04 },
    { freq: 1000, at: 0.2, dur: 0.04, wave: 'square', volume: 0.04 },
    { freq: D5, at: 0.45, dur: 0.3, wave: 'triangle' },
    { freq: B4, at: 0.7, dur: 0.3, wave: 'triangle' },
    { freq: G4, at: 0.95, dur: 0.5, wave: 'triangle', to: 330 },
  ],
  wrong: [
    { freq: B4, at: 0, dur: 0.18, wave: 'triangle' },
    { freq: 415.3, at: 0.16, dur: 0.32, wave: 'triangle' },
  ],
  clue: [
    { freq: D6, at: 0, dur: 0.1, volume: 0.1 },
    { freq: G5, at: 0.09, dur: 0.12, volume: 0.12 },
    { freq: B5, at: 0.2, dur: 0.3, volume: 0.12 },
  ],
  step: [
    { freq: 180, at: 0, dur: 0.06, volume: 0.12, to: 140 },
    { freq: 160, at: 0.16, dur: 0.06, volume: 0.12, to: 120 },
  ],
  'your-turn': [
    { freq: D5, at: 0, dur: 0.12, volume: 0.16 },
    { freq: G5, at: 0.15, dur: 0.22, volume: 0.16 },
  ],
}

/** Agenda as notas de um som num contexto de áudio. */
export function scheduleCue(ctx: BaseAudioContext, cue: Cue, start: number): void {
  for (const note of CUES[cue]) playNote(ctx, start, note)
}

function playNote(ctx: BaseAudioContext, start: number, note: Note): void {
  const gain = ctx.createGain()
  const t0 = start + note.at
  const t1 = t0 + note.dur
  const volume = note.volume ?? 0.15
  // entrada e saída em rampa: sem estalo
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(volume, t0 + Math.min(0.015, note.dur / 2))
  gain.gain.exponentialRampToValueAtTime(0.0001, t1)
  gain.connect(ctx.destination)
  const osc = ctx.createOscillator()
  osc.type = note.wave ?? 'sine'
  osc.frequency.setValueAtTime(note.freq, t0)
  if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, t1)
  osc.connect(gain)
  osc.start(t0)
  osc.stop(t1 + 0.02)
}
