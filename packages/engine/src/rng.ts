// PRNG com semente (mulberry32). O motor nunca usa Math.random: a mesma semente gera sempre o
// mesmo mistério. O estado é um único inteiro de 32 bits, fácil de guardar e repetir.

export interface Rng {
  /** Número em [0, 1). */
  next(): number
  /** Inteiro em [0, n). */
  int(n: number): number
  /** Inteiro em [min, max], com os dois extremos. */
  range(min: number, max: number): number
  /** Um item da lista (a lista não pode ser vazia). */
  pick<T>(items: readonly T[]): T
  /** Cópia embaralhada (Fisher-Yates); a lista original não muda. */
  shuffle<T>(items: readonly T[]): T[]
  /** Estado atual (para continuar a sequência depois). */
  state(): number
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (n: number): number => Math.floor(next() * n)
  return {
    next,
    int,
    range: (min, max) => min + int(max - min + 1),
    pick: (items) => {
      if (items.length === 0) throw new RangeError('pick: lista vazia')
      return items[int(items.length)] as (typeof items)[number]
    },
    shuffle: (items) => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(i + 1)
        ;[copy[i], copy[j]] = [copy[j] as (typeof copy)[number], copy[i] as (typeof copy)[number]]
      }
      return copy
    },
    state: () => a,
  }
}

/** Aceita qualquer número como semente e devolve um inteiro de 32 bits sem sinal. */
export function normalizeSeed(seed: number): number {
  return Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0
}
