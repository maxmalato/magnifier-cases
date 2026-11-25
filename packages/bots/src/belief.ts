// O que o bot acredita a partir da visão pública: candidatos, duplas que ainda podem ser
// acusadas e o valor esperado de abrir cada carta fechada. Nunca usa o conteúdo de cartas
// fechadas nem a solução: só a mistura de pistas do nível (dados), como informação a priori.
import {
  candidatesOf,
  cardCost,
  type CandidateLists,
  type CardSource,
  type PublicView,
} from '@magnifier-cases/engine'

/** Candidatos segundo o bot; `ignorePartial` esquece as pistas only-* (bot casual). */
export function beliefOf(view: PublicView, ignorePartial = false): CandidateLists {
  const cards = ignorePartial
    ? view.opened.filter((c) => !c.effect.kind.startsWith('only'))
    : view.opened
  return candidatesOf(view.cast, cards)
}

export interface Pair {
  readonly suspectId: string
  readonly placeId: string
}

/** Duplas que ainda podem ser acusadas: candidatas, sem as já acusadas por engano. */
export function openPairs(view: PublicView, belief: CandidateLists = view.candidates): Pair[] {
  // a acusação só aceita itens que o motor ainda considera candidatos
  const suspects = belief.suspects.filter((id) => view.candidates.suspects.includes(id))
  const places = belief.places.filter((id) => view.candidates.places.includes(id))
  const pairs: Pair[] = []
  for (const suspectId of suspects)
    for (const placeId of places)
      if (!view.wrongAccusations.some((w) => w.suspectId === suspectId && w.placeId === placeId))
        pairs.push({ suspectId, placeId })
  return pairs
}

/**
 * Acusar todas as duplas, uma por vez, cabe no relógio? Com k duplas, são k − 1 erros (cada um
 * custa `wrongAccusationCost`) e um acerto (custo 0), e cada acusação exige ainda ter 1 ação.
 */
export function guessingIsSafe(view: PublicView, pairs: number): boolean {
  return pairs >= 1 && (pairs - 1) * view.params.wrongAccusationCost + 1 <= view.actionsLeft
}

/** Custo, em ações, de abrir a carta agora (lugar: ir + investigar; já no lugar: só investigar). */
export function costToOpen(view: PublicView, source: CardSource): number {
  if (source.type === 'place' && view.teamAt === source.id) return 1
  return cardCost({ source })
}

const log2 = (x: number) => Math.log2(Math.max(1, x))

/** Média sobre os tamanhos de grupo possíveis do nível. */
function averageOver(min: number, max: number, f: (k: number) => number): number {
  let sum = 0
  for (let k = min; k <= max; k++) sum += f(k)
  return sum / (max - min + 1)
}

/**
 * Candidatos esperados num domínio depois de abrir uma carta do tipo `kind` que fala desse
 * domínio. `n` = itens do domínio no elenco, `c` = candidatos atuais (pode ser fracionário no
 * planejamento), `srcIn`/`srcCand` = a origem é do domínio / ainda é candidata.
 */
function remainingAfter(
  view: PublicView,
  kind: 'exclude' | 'only',
  n: number,
  c: number,
  srcIn: boolean,
  srcCand: boolean,
): number {
  if (c <= 1) return c
  const p = view.params
  const removable = Math.max(0, c - 1 - (srcCand ? 1 : 0))
  if (kind === 'exclude') {
    const eligible = n - 1 - (srcIn ? 1 : 0)
    if (eligible <= 0) return c
    return averageOver(p.excludeGroupSize.min, p.excludeGroupSize.max, (wanted) => {
      const k = Math.min(wanted, eligible)
      return c - (k * removable) / eligible
    })
  }
  const required = 1 + (srcIn ? 1 : 0)
  return averageOver(p.includeGroupSize.min, p.includeGroupSize.max, (wanted) => {
    const k = Math.min(Math.max(wanted, required, 2), n - 1)
    const others = n - required
    const keptOthers = others > 0 ? ((k - required) * removable) / others : 0
    return Math.min(c, 1 + (srcCand ? 1 : 0) + keptOthers)
  })
}

/** Contagem de candidatos (pode ser fracionária no planejamento). */
export interface Counts {
  readonly suspects: number
  readonly places: number
}

/**
 * Candidatos esperados depois de abrir a carta, pela mistura de pistas do nível (dados).
 * `inBelief` diz se a origem ainda é candidata (uma carta nunca descarta a própria origem).
 */
export function expectedAfter(
  view: PublicView,
  source: CardSource,
  counts: Counts,
  inBelief: boolean,
): Counts {
  const p = view.params
  const pNone = p.noiseRate
  const pOnly = p.includeRate
  const pExclude = Math.max(0, 1 - pNone - pOnly)
  const domain = (type: 'suspect' | 'place') => {
    const n = type === 'suspect' ? view.cast.suspects.length : view.cast.places.length
    const c = type === 'suspect' ? counts.suspects : counts.places
    const srcIn = source.type === type
    const srcCand = srcIn && inBelief
    return (
      pNone * c +
      pExclude * remainingAfter(view, 'exclude', n, c, srcIn, srcCand) +
      pOnly * remainingAfter(view, 'only', n, c, srcIn, srcCand)
    )
  }
  const pt = p.placeTargetRate
  return {
    suspects: pt * counts.suspects + (1 - pt) * domain('suspect'),
    places: (1 - pt) * counts.places + pt * domain('place'),
  }
}

/** Ganho esperado (bits) de abrir a carta: log2 das duplas antes e depois. */
export function expectedGain(view: PublicView, source: CardSource, belief: CandidateLists): number {
  const counts = { suspects: belief.suspects.length, places: belief.places.length }
  const inBelief =
    source.type === 'suspect'
      ? belief.suspects.includes(source.id)
      : belief.places.includes(source.id)
  const after = expectedAfter(view, source, counts, inBelief)
  return log2(counts.suspects * counts.places) - log2(after.suspects * after.places)
}
