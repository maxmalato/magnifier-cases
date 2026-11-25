// Tema da v1: "O bolo da festa sumiu" (regras, seção 3). Elenco completo; o gerador sorteia
// um subconjunto por nível. Nomes, textos e arte são originais e fictícios. Validado pelo
// schema do motor ao carregar.
import { parseThemePack, type ClueEffectKind, type ThemePack } from '@magnifier-cases/engine'

const suspects = [
  ['baker-ze', 'm'],
  ['miss-lucia', 'f'],
  ['dog-biscuit', 'm'],
  ['mail-tiao', 'm'],
  ['teacher-rita', 'f'],
  ['cat-cleo', 'f'],
  ['gardener-nando', 'm'],
  ['skater-bia', 'f'],
  ['vet-caio', 'm'],
  ['parrot-pipa', 'm'],
] as const

const places = [
  ['bakery', 'f'],
  ['school', 'f'],
  ['market', 'm'],
  ['post-office', 'm'],
  ['lucia-backyard', 'm'],
  ['bandstand', 'm'],
  ['library', 'f'],
  ['fountain', 'm'],
  ['ball-field', 'm'],
  ['fair', 'f'],
] as const

/** Modelos de pista: [id, efeito, origem]. O texto de cada um está em texts.ts. */
const templates: readonly (readonly [string, ClueEffectKind, 'suspect' | 'place'])[] = [
  ['with-me-afternoon', 'exclude-suspects', 'suspect'],
  ['decorating-square', 'exclude-suspects', 'suspect'],
  ['party-photo', 'exclude-suspects', 'place'],
  ['ice-cream-line', 'exclude-suspects', 'place'],
  ['spent-afternoon-at', 'exclude-places', 'suspect'],
  ['nobody-went-in', 'exclude-places', 'suspect'],
  ['view-from-here', 'exclude-places', 'place'],
  ['map-not-there', 'exclude-places', 'place'],
  ['sure-who-took', 'only-suspects', 'suspect'],
  ['saw-from-far', 'only-suspects', 'suspect'],
  ['footprints-here', 'only-suspects', 'place'],
  ['note-who-took', 'only-suspects', 'place'],
  ['sure-where', 'only-places', 'suspect'],
  ['cake-went-by', 'only-places', 'suspect'],
  ['crumb-trail', 'only-places', 'place'],
  ['hiding-map', 'only-places', 'place'],
  ['love-carrot-cake', 'none', 'suspect'],
  ['lovely-day', 'none', 'suspect'],
  ['smells-cinnamon', 'none', 'place'],
  ['colorful-flags', 'none', 'place'],
]

export const partyCake: ThemePack = parseThemePack({
  id: 'party-cake',
  startPlaceId: 'square',
  suspects: suspects.map(([id, gender]) => ({ id, nameKey: `suspect.${id}`, gender })),
  places: places.map(([id, gender]) => ({ id, nameKey: `place.${id}`, gender })),
  templates: templates.map(([id, effectKind, sourceType]) => ({
    id,
    effectKind,
    sourceType,
    textKey: `clue.${id}`,
    weight: 1,
  })),
})
