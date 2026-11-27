import type { GameEvent } from '@magnifier-cases/engine'
import { describe, expect, it } from 'vitest'
import { CUES, cueFor } from './cues.ts'

const card = { id: 'c1', source: { kind: 'place', id: 'p1' }, text: '' } as never

describe('sons', () => {
  it('cada jogada toca só o som mais importante', () => {
    const clue: GameEvent[] = [
      { type: 'clue-found', seat: 'seat-1', card },
      { type: 'clock-advanced', actionsLeft: 3, clock: '15:00' },
      { type: 'turn-started', seat: 'seat-2', turn: 2 },
    ]
    expect(cueFor(clue)).toBe('clue')
    expect(cueFor([{ type: 'moved', seat: 'seat-1', placeId: 'p2' }])).toBe('step')
    expect(
      cueFor([
        { type: 'accused-wrong', seat: 'seat-1', suspectId: 's1', placeId: 'p1' },
        { type: 'timed-out' },
      ]),
    ).toBe('timed-out')
    expect(cueFor([{ type: 'won', seat: 'seat-1', suspectId: 's1', placeId: 'p1' }])).toBe('won')
    expect(cueFor([{ type: 'clock-advanced', actionsLeft: 3, clock: '15:00' }])).toBeNull()
  })

  it('"sua vez" só toca no aparelho de quem vai jogar', () => {
    const started: GameEvent[] = [{ type: 'turn-started', seat: 'seat-2', turn: 2 }]
    expect(cueFor(started)).toBeNull()
    expect(cueFor(started, 'seat-1')).toBeNull()
    expect(cueFor(started, 'seat-2')).toBe('your-turn')
  })

  it('todo som é curto (até 1,5 s) e baixo', () => {
    for (const notes of Object.values(CUES)) {
      expect(Math.max(...notes.map((n) => n.at + n.dur))).toBeLessThanOrEqual(1.5)
      for (const note of notes) expect(note.volume ?? 0.15).toBeLessThanOrEqual(0.25)
    }
  })
})
