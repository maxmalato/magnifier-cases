// Formatadores de concordância (spec, seção 7). A concordância nunca fica nas frases: os
// modelos pedem uma forma ({places|in}) e o formatador escolhe o artigo pelo gênero e pelo
// idioma ("na Padaria", "no Coreto", "at the Bakery").
import { START_PLACE_ID, type Slots } from '@magnifier-cases/engine'
import type { Locale } from './i18n.ts'
import { names, type Noun } from './party-cake/names.ts'
import { clueTexts } from './party-cake/texts.ts'
import { themeTexts } from './party-cake/ui.ts'
import { partyCake } from './party-cake/theme.ts'

/** Forma do nome: def ("a Padaria"), of ("da Padaria"), in ("na Padaria"), to ("à Padaria"). */
export const forms = ['def', 'of', 'in', 'to'] as const
export type Form = (typeof forms)[number]
/** Ligação da lista: and ("A, B e C"), or ("A, B ou C"), nor ("A, B nem C"). */
export const joiners = ['and', 'or', 'nor'] as const
export type Joiner = (typeof joiners)[number]

interface Item {
  readonly noun: Noun
  readonly gender: 'm' | 'f'
}

function itemOf(id: string, locale: Locale): Item {
  const cast = [...partyCake.suspects, ...partyCake.places].find((i) => i.id === id)
  const nameKey = cast?.nameKey ?? (id === START_PLACE_ID ? 'place.square' : null)
  const noun = nameKey ? names[locale][nameKey] : undefined
  if (!noun) throw new RangeError(`item sem nome: ${id}`)
  return { noun, gender: cast?.gender ?? 'f' }
}

/** Nome curto (o das pistas): "Seu Zé", "Padaria". */
export function nameOf(id: string, locale: Locale): string {
  return itemOf(id, locale).noun.name
}

/** Nome completo (o da interface): "Seu Zé, o padeiro". */
export function titleOf(id: string, locale: Locale): string {
  return itemOf(id, locale).noun.title
}

const PT_ARTICLES: Record<Form, Record<'m' | 'f', string>> = {
  def: { m: 'o ', f: 'a ' },
  of: { m: 'do ', f: 'da ' },
  in: { m: 'no ', f: 'na ' },
  to: { m: 'ao ', f: 'à ' },
}
const PT_BARE: Record<Form, string> = { def: '', of: 'de ', in: 'em ', to: 'a ' }
const EN_BARE: Record<Form, string> = { def: '', of: 'of ', in: 'at ', to: 'to ' }

/** Um item na forma pedida: formatItem('bakery', 'pt-BR', 'in') → "na Padaria". */
export function formatItem(id: string, locale: Locale, form: Form = 'def'): string {
  const { noun, gender } = itemOf(id, locale)
  if (locale === 'pt-BR')
    return (noun.article ? PT_ARTICLES[form][gender] : PT_BARE[form]) + noun.name
  return EN_BARE[form] + (noun.article ? 'the ' : '') + noun.name
}

const JOIN: Record<Locale, Record<Joiner, string>> = {
  'pt-BR': { and: 'e', or: 'ou', nor: 'nem' },
  // em inglês, depois de "not", a lista leva "or"
  en: { and: 'and', or: 'or', nor: 'or' },
}

/** Lista na forma pedida: "na Padaria, na Escola e no Coreto" / "the Bakery or the School". */
export function formatList(
  ids: readonly string[],
  locale: Locale,
  form: Form = 'def',
  joiner: Joiner = 'and',
): string {
  const parts = ids.map((id) => formatItem(id, locale, form))
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} ${JOIN[locale][joiner]} ${parts.at(-1)}`
}

const PLACEHOLDER = /\{(\w+)(?:\|(\w+))?(?:\|(\w+))?\}/g

const capitalize = (text: string, locale: Locale) =>
  text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)

/** Preenche os marcadores de um texto com listas de ids, na forma e ligação pedidas. */
export function renderText(
  template: string,
  slots: Readonly<Record<string, readonly string[]>>,
  locale: Locale,
  where = 'texto',
): string {
  const rendered = template.replace(
    PLACEHOLDER,
    (_match, slot: string, form = 'def', joiner = 'and') => {
      const ids = slots[slot]
      if (!ids) throw new RangeError(`marcador sem valor: {${slot}} em ${where}`)
      if (!(forms as readonly string[]).includes(form))
        throw new RangeError(`forma desconhecida: ${form}`)
      if (!(joiners as readonly string[]).includes(joiner))
        throw new RangeError(`ligação desconhecida: ${joiner}`)
      return formatList(ids, locale, form as Form, joiner as Joiner)
    },
  )
  return capitalize(rendered, locale)
}

/** Texto de uma carta aberta no idioma pedido. */
export function renderClue(
  card: { readonly textKey: string; readonly slots: Slots },
  locale: Locale,
): string {
  const text = clueTexts[locale][card.textKey]
  if (!text) throw new RangeError(`modelo sem texto: ${card.textKey}`)
  const listed = card.slots.suspects ?? card.slots.places ?? []
  const template = listed.length === 1 && text.one ? text.one : text.other
  return renderText(template, card.slots, locale, card.textKey)
}

/** Texto do tema para a interface: themeText('theme.revealHideout', 'pt-BR', { hideout: ['school'] }). */
export function themeText(
  key: string,
  locale: Locale,
  slots: Readonly<Record<string, readonly string[]>> = {},
): string {
  const template = themeTexts[locale][key]
  if (template === undefined) throw new RangeError(`texto do tema sem tradução: ${key}`)
  return renderText(template, slots, locale, key)
}
