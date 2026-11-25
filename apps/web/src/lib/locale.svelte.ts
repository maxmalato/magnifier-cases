// Idioma atual da interface (reativo). Começa pelo idioma do aparelho; a pessoa pode trocar.
import type { Locale } from '@magnifier-cases/content'
import {
  durationText,
  pickLocale,
  t as translate,
  tn as translatePlural,
  type MessageKey,
  type PluralKey,
} from '../i18n.ts'

const initial: Locale = typeof navigator === 'undefined' ? 'pt-BR' : pickLocale(navigator.languages)

export const ui = $state<{ locale: Locale }>({ locale: initial })

export function setLocale(locale: Locale): void {
  ui.locale = locale
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

export const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate(ui.locale, key, params)

export const tn = (key: PluralKey, n: number, params?: Record<string, string | number>) =>
  translatePlural(ui.locale, key, n, params)

export const duration = (minutes: number) => durationText(ui.locale, minutes)
