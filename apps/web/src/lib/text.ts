// Textos montados a partir da visão pública (nomes vêm do conteúdo, frases da interface).
import { formatList, type Locale } from '@magnifier-cases/content'
import type { ClueEffect, LevelId } from '@magnifier-cases/engine'
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
