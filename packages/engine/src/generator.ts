// Gerador de mistérios (regras, seção 4; spec, seção 6). Determinístico a partir da semente.
// Cada tentativa sorteia elenco, solução e cartas; o solucionador aceita ou rejeita. Toda
// carta é verdadeira por construção e segue as regras de justiça (seção 4.4).
import { createRng, normalizeSeed, type Rng } from './rng.ts'
import type { ClueTemplate, DifficultyParams, ThemePack } from './schema.ts'
import { solve } from './solver.ts'
import type { Cast, CardSource, ClueCard, ClueEffect, Oracle, Solution } from './types.ts'

export interface Mystery {
  readonly cast: Cast
  /** SECRETO. */
  readonly solution: Solution
  readonly cards: readonly ClueCard[]
  /** SECRETO. */
  readonly oracle: Oracle
}

/** O gerador esgotou as tentativas do nível. A mensagem não leva dados do mistério. */
export class MysteryGenerationError extends Error {
  readonly level: string
  readonly attempts: number
  constructor(level: string, attempts: number) {
    super(`não foi possível gerar um mistério válido (nível ${level}, ${attempts} tentativas)`)
    this.name = 'MysteryGenerationError'
    this.level = level
    this.attempts = attempts
  }
}

/** Id estável da carta a partir da origem (a origem é pública). */
export function cardIdOf(source: CardSource): string {
  return `${source.type}:${source.id}`
}

type Domain = 'suspects' | 'places'

function weightedPick(rng: Rng, templates: readonly ClueTemplate[]): ClueTemplate {
  const total = templates.reduce((sum, t) => sum + t.weight, 0)
  let r = rng.next() * total
  for (const t of templates) {
    r -= t.weight
    if (r < 0) return t
  }
  return templates[templates.length - 1] as ClueTemplate
}

/**
 * Efeito verdadeiro para a solução, que nunca descarta a própria origem. Null se o grupo pedido
 * não cabe neste domínio (o gerador tenta o outro domínio).
 */
function buildEffect(
  rng: Rng,
  params: DifficultyParams,
  kind: 'exclude' | 'only',
  domain: Domain,
  source: CardSource,
  cast: Cast,
  solution: Solution,
): ClueEffect | null {
  const items = domain === 'suspects' ? cast.suspects : cast.places
  const answer = domain === 'suspects' ? solution.culpritId : solution.hideoutId
  const sourceInDomain =
    (domain === 'suspects' && source.type === 'suspect') ||
    (domain === 'places' && source.type === 'place')
  if (kind === 'exclude') {
    // nunca a resposta (a carta é verdadeira) nem a própria origem (sem autoálibi)
    const eligible = items.filter((id) => id !== answer && !(sourceInDomain && id === source.id))
    const size = Math.min(
      rng.range(params.excludeGroupSize.min, params.excludeGroupSize.max),
      eligible.length,
    )
    if (size < 1) return null
    const ids = rng.shuffle(eligible).slice(0, size)
    const ordered = items.filter((id) => ids.includes(id))
    return domain === 'suspects'
      ? { kind: 'exclude-suspects', ids: ordered }
      : { kind: 'exclude-places', ids: ordered }
  }
  // only-*: o grupo contém a resposta (verdadeira) e a própria origem (para não descartá-la);
  // tem 2 ou mais itens e deixa algum item de fora (senão seria ruído).
  const required = [answer]
  if (sourceInDomain && source.id !== answer) required.push(source.id)
  const wanted = rng.range(params.includeGroupSize.min, params.includeGroupSize.max)
  const size = Math.min(Math.max(wanted, required.length, 2), items.length - 1)
  if (size < 2 || size < required.length) return null
  const others = rng.shuffle(items.filter((id) => !required.includes(id)))
  const ids = [...required, ...others.slice(0, size - required.length)]
  const ordered = items.filter((id) => ids.includes(id))
  return domain === 'suspects'
    ? { kind: 'only-suspects', ids: ordered }
    : { kind: 'only-places', ids: ordered }
}

function buildCard(
  rng: Rng,
  params: DifficultyParams,
  theme: ThemePack,
  source: CardSource,
  cast: Cast,
  solution: Solution,
): ClueCard {
  const roll = rng.next()
  let effect: ClueEffect = { kind: 'none' }
  if (roll >= params.noiseRate) {
    const kind = roll < params.noiseRate + params.includeRate ? 'only' : 'exclude'
    const first: Domain = rng.next() < params.placeTargetRate ? 'places' : 'suspects'
    const second: Domain = first === 'places' ? 'suspects' : 'places'
    effect =
      buildEffect(rng, params, kind, first, source, cast, solution) ??
      buildEffect(rng, params, kind, second, source, cast, solution) ??
      effect
  }
  const options = theme.templates.filter(
    (t) =>
      t.effectKind === effect.kind && (t.sourceType === source.type || t.sourceType === 'both'),
  )
  // o schema do tema garante um modelo para cada efeito e origem
  const template = weightedPick(rng, options)
  const slots: Record<string, readonly string[]> = { source: [source.id] }
  if (effect.kind === 'exclude-suspects' || effect.kind === 'only-suspects')
    slots.suspects = effect.ids
  if (effect.kind === 'exclude-places' || effect.kind === 'only-places') slots.places = effect.ids
  return {
    id: cardIdOf(source),
    source,
    effect,
    textKey: template.textKey,
    slots,
    opened: false,
  }
}

/** Uma tentativa: elenco, solução e cartas (ainda sem passar pelo solucionador). */
function draft(rng: Rng, params: DifficultyParams, theme: ThemePack) {
  if (theme.suspects.length < params.suspectCount || theme.places.length < params.placeCount)
    throw new RangeError('o tema tem menos itens do que o nível pede')
  const pickedS = new Set(
    rng.shuffle(theme.suspects.map((s) => s.id)).slice(0, params.suspectCount),
  )
  const pickedP = new Set(rng.shuffle(theme.places.map((p) => p.id)).slice(0, params.placeCount))
  // ordem do tema: estável e sem relação com a solução
  const cast: Cast = {
    suspects: theme.suspects.map((s) => s.id).filter((id) => pickedS.has(id)),
    places: theme.places.map((p) => p.id).filter((id) => pickedP.has(id)),
  }
  const solution: Solution = {
    culpritId: rng.pick(cast.suspects),
    hideoutId: rng.pick(cast.places),
  }
  const sources: CardSource[] = [
    ...cast.suspects.map((id) => ({ type: 'suspect' as const, id })),
    ...cast.places.map((id) => ({ type: 'place' as const, id })),
  ]
  const cards = sources.map((source) => buildCard(rng, params, theme, source, cast, solution))
  return { cast, solution, cards }
}

export interface GenerationResult {
  readonly mystery: Mystery
  /** Tentativas usadas (1 = aceito de primeira). Métrica da simulação. */
  readonly attempts: number
}

/** Gera um mistério e informa quantas tentativas foram necessárias. */
export function generateMysteryWithStats(
  params: DifficultyParams,
  theme: ThemePack,
  seed: number,
): GenerationResult {
  const rng = createRng(normalizeSeed(seed))
  const maxCost = params.actionsTotal - params.minSlack
  for (let attempt = 1; attempt <= params.maxAttempts; attempt++) {
    const { cast, solution, cards } = draft(rng, params, theme)
    const result = solve(cards, cast, maxCost)
    if (!result.unique || result.minCost === null) continue
    // segurança: o par que sobra é a solução sorteada (toda carta é verdadeira)
    if (
      result.solution?.culpritId !== solution.culpritId ||
      result.solution.hideoutId !== solution.hideoutId
    )
      continue
    const oracle: Oracle = {
      minCost: result.minCost,
      keyCardIds: result.keyCardIds,
      slack: params.actionsTotal - result.minCost,
    }
    return { mystery: { cast, solution, cards, oracle }, attempts: attempt }
  }
  throw new MysteryGenerationError(params.id, params.maxAttempts)
}

/** Gera um mistério provado resolvível com a folga do nível. Mesma semente, mesmo mistério. */
export function generateMystery(params: DifficultyParams, theme: ThemePack, seed: number): Mystery {
  return generateMysteryWithStats(params, theme, seed).mystery
}

/** Problemas de justiça de um conjunto de cartas (vazio = tudo certo). Usado nos testes. */
export function fairnessProblems(
  cards: readonly Pick<ClueCard, 'id' | 'source' | 'effect'>[],
  solution: Solution,
): string[] {
  const problems: string[] = []
  for (const card of cards) {
    const e = card.effect
    if (e.kind === 'none') continue
    const isSuspectList = e.kind === 'exclude-suspects' || e.kind === 'only-suspects'
    const answer = isSuspectList ? solution.culpritId : solution.hideoutId
    const sameDomain = (card.source.type === 'suspect') === isSuspectList
    const excludes = e.kind.startsWith('exclude')
    if (excludes && e.ids.includes(answer)) problems.push(`${card.id}: descarta a solução`)
    if (!excludes && !e.ids.includes(answer)) problems.push(`${card.id}: grupo sem a solução`)
    if (!excludes && e.ids.length < 2) problems.push(`${card.id}: grupo de tamanho 1`)
    if (sameDomain && excludes && e.ids.includes(card.source.id))
      problems.push(`${card.id}: descarta a própria origem`)
    if (sameDomain && !excludes && !e.ids.includes(card.source.id))
      problems.push(`${card.id}: descarta a própria origem`)
    if (e.ids.length === 0) problems.push(`${card.id}: grupo vazio`)
  }
  return problems
}
