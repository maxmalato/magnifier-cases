// Montagem da equipe no lobby (modo de um aparelho): validação pura, testável.
import { MAX_NAME_LENGTH } from '@magnifier-cases/kit'

export const MIN_SEATS = 2
export const MAX_SEATS = 6

export interface SeatDraft {
  readonly kind: 'human' | 'bot'
  /** Apelido digitado (pessoas); bots recebem nome neutro. */
  readonly name: string
}

export type SetupError = 'errorSeats' | 'errorHuman' | 'errorNames' | 'errorNamesRepeated'

/** Apelido limpo: sem espaços nas pontas e no máximo 20 caracteres. */
export function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH)
}

/** Primeiro problema da equipe, ou null se pode começar. */
export function setupError(seats: readonly SeatDraft[]): SetupError | null {
  if (seats.length < MIN_SEATS || seats.length > MAX_SEATS) return 'errorSeats'
  if (!seats.some((s) => s.kind === 'human')) return 'errorHuman'
  const names = seats.filter((s) => s.kind === 'human').map((s) => cleanName(s.name))
  if (names.some((n) => n.length === 0)) return 'errorNames'
  const lower = names.map((n) => n.toLocaleLowerCase())
  if (new Set(lower).size !== lower.length) return 'errorNamesRepeated'
  return null
}
