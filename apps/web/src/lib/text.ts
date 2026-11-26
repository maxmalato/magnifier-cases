// Textos montados a partir da visão pública (nomes vêm do conteúdo, frases da interface).
import { formatItem, formatList, type Locale } from '@magnifier-cases/content'
import type { ClueEffect, LevelId } from '@magnifier-cases/engine'
import type { SuggestionTarget } from '@magnifier-cases/protocol'
import { t, type MessageKey } from '../i18n.ts'

/** Chave i18n do nome do nível. */
export const levelKey = (id: LevelId): MessageKey => `level.${id}`

/** "O que ela mostra": o efeito da pista dito de forma simples. */
export function effectSummary(effect: ClueEffect, locale: Locale): string {
  switch (effect.kind) {
    case 'exclude-suspects':
    case 'exclude-places':
      return t(locale, 'result.exclude', { list: formatList(effect.ids, locale) })
    case 'only-suspects':
    case 'only-places':
      return t(locale, 'result.only', { list: formatList(effect.ids, locale, 'def', 'or') })
    case 'none':
      return t(locale, 'result.none')
  }
}

/** Texto de uma sugestão (opinar): "interrogar o Seu Zé", "ir à Padaria". */
export function suggestionText(target: SuggestionTarget, locale: Locale): string {
  switch (target.kind) {
    case 'option': {
      const key: Record<typeof target.option, MessageKey> = {
        investigate: 'action.investigate',
        interrogate: 'action.interrogate',
        move: 'action.move',
        accuse: 'turn.accuse',
      }
      return t(locale, key[target.option], { place: '' }).trim()
    }
    case 'suspect':
      return t(locale, 'suggest.suspect', { name: formatItem(target.id, locale) })
    case 'place':
      return t(locale, 'suggest.place', { place: formatItem(target.id, locale, 'to') })
    case 'pair':
      return t(locale, 'suggest.pairText', {
        suspect: formatItem(target.suspectId, locale),
        place: formatItem(target.placeId, locale, 'in'),
      })
  }
}
