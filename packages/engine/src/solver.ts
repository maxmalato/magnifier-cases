// Solucionador (regras, seção 4.6; spec, seção 6). É um oráculo: olha todas as cartas, abertas
// ou não. Prova duas coisas: (1) unicidade: com todas as cartas, só um par (culpado,
// esconderijo) continua possível; (2) custo mínimo: o menor conjunto de cartas (suspeito = 1,
// lugar = 2) que já deixa só esse par.
//
// Cada carta vira uma máscara de bits do que ela DESCARTA (suspeitos nos bits baixos, lugares
// depois). Com N + M ≤ 20 itens, cabe num inteiro de 32 bits. O custo mínimo é uma cobertura de
// conjuntos com pesos: busca em profundidade pelo item ainda não descartado com menos cartas
// que o descartam, com poda pelo melhor custo já achado.
import { cardCost } from './rules.ts'
import type { Cast, CardId, ClueCard, Solution } from './types.ts'

export interface SolveResult {
  /** Com todas as cartas, sobra exatamente um suspeito e um lugar. */
  readonly unique: boolean
  /** O par que sobra (null se não for único). */
  readonly solution: Solution | null
  /** Menor custo que determina a solução; null se passar de `maxCost` ou não for único. */
  readonly minCost: number | null
  /** Cartas do conjunto de custo mínimo, na ordem das cartas. */
  readonly keyCardIds: readonly CardId[]
}

type SolverCard = Pick<ClueCard, 'id' | 'source' | 'effect'>

/** Máscara do que a carta descarta, no espaço de bits do elenco. */
export function eliminationMask(card: Pick<ClueCard, 'effect'>, cast: Cast): number {
  const n = cast.suspects.length
  const bitsOf = (ids: readonly string[], list: readonly string[], offset: number) =>
    list.reduce((mask, id, i) => (ids.includes(id) ? mask | (1 << (i + offset)) : mask), 0)
  const allS = (1 << n) - 1
  const allP = ((1 << cast.places.length) - 1) << n
  const e = card.effect
  switch (e.kind) {
    case 'exclude-suspects':
      return bitsOf(e.ids, cast.suspects, 0)
    case 'exclude-places':
      return bitsOf(e.ids, cast.places, n)
    case 'only-suspects':
      return allS & ~bitsOf(e.ids, cast.suspects, 0)
    case 'only-places':
      return allP & ~bitsOf(e.ids, cast.places, n)
    case 'none':
      return 0
  }
}

const popcount = (x: number): number => {
  let c = 0
  for (let v = x >>> 0; v; v &= v - 1) c++
  return c
}

/** Máximo de itens no elenco (cabe nos bits de um inteiro de 32 bits). */
export const MAX_CAST_ITEMS = 30

export function solve(
  cards: readonly SolverCard[],
  cast: Cast,
  maxCost: number = Number.POSITIVE_INFINITY,
): SolveResult {
  const n = cast.suspects.length
  const total = n + cast.places.length
  if (total > MAX_CAST_ITEMS) throw new RangeError('elenco grande demais para o solucionador')
  const all = ((1 << total) >>> 0) - 1
  const masks = cards.map((c) => eliminationMask(c, cast) >>> 0)
  const costs = cards.map((c) => cardCost(c))
  const union = masks.reduce((acc, m) => (acc | m) >>> 0, 0)
  const left = (all & ~union) >>> 0
  const leftS = left & ((1 << n) - 1)
  const leftP = left >>> n
  const unique = popcount(leftS) === 1 && popcount(leftP) === 1
  if (!unique) return { unique: false, solution: null, minCost: null, keyCardIds: [] }

  const solution: Solution = {
    culpritId: cast.suspects[Math.log2(leftS)] as string,
    hideoutId: cast.places[Math.log2(leftP)] as string,
  }
  const need = (all & ~left) >>> 0

  // Para cada item, as cartas que o descartam (para escolher o item mais difícil primeiro).
  const coverers: number[][] = Array.from({ length: total }, () => [])
  masks.forEach((m, i) => {
    for (let b = 0; b < total; b++) if (m & (1 << b)) coverers[b]?.push(i)
  })

  let best = Number.isFinite(maxCost) ? maxCost + 1 : Number.POSITIVE_INFINITY
  let bestSet: number[] | null = null
  const chosen: number[] = []

  const dfs = (covered: number, cost: number): void => {
    if (cost >= best) return
    const missing = (need & ~covered) >>> 0
    if (missing === 0) {
      best = cost
      bestSet = [...chosen]
      return
    }
    // limite inferior: falta ao menos uma carta (custo mínimo 1)
    if (cost + 1 >= best) return
    // item ainda não descartado com menos cartas candidatas
    let pivot = -1
    let fewest = Number.POSITIVE_INFINITY
    for (let b = 0; b < total; b++) {
      if (!(missing & (1 << b))) continue
      const options = coverers[b]?.length ?? 0
      if (options < fewest) {
        fewest = options
        pivot = b
      }
    }
    for (const i of coverers[pivot] ?? []) {
      if (chosen.includes(i)) continue
      chosen.push(i)
      dfs((covered | (masks[i] ?? 0)) >>> 0, cost + (costs[i] ?? 0))
      chosen.pop()
    }
  }
  dfs(0, 0)

  if (bestSet === null) return { unique: true, solution, minCost: null, keyCardIds: [] }
  const set = [...(bestSet as number[])].sort((a, b) => a - b)
  return {
    unique: true,
    solution,
    minCost: best,
    keyCardIds: set.map((i) => cards[i]?.id as string),
  }
}

/**
 * Versão de força bruta (todos os subconjuntos), só para testar o solucionador em mistérios
 * pequenos. Devolve o menor custo que determina a solução, ou null.
 */
export function bruteForceMinCost(cards: readonly SolverCard[], cast: Cast): number | null {
  const result = solve(cards, cast)
  if (!result.unique) return null
  const n = cast.suspects.length
  const total = n + cast.places.length
  const all = ((1 << total) >>> 0) - 1
  const masks = cards.map((c) => eliminationMask(c, cast))
  const union = masks.reduce((a, m) => a | m, 0)
  const need = (all & union) >>> 0
  let best: number | null = null
  for (let subset = 0; subset < 1 << cards.length; subset++) {
    let covered = 0
    let cost = 0
    for (let i = 0; i < cards.length; i++) {
      if (subset & (1 << i)) {
        covered |= masks[i] ?? 0
        cost += cardCost(cards[i] as SolverCard)
      }
    }
    if ((need & ~covered) >>> 0 === 0 && (best === null || cost < best)) best = cost
  }
  return best
}
