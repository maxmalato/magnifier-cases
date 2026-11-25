// Textos da interface em PT-BR e inglês (i18n desde o início). O nome público vem de
// `appName` (packages/content) e nunca é escrito aqui. Toda chave nova entra nos dois idiomas;
// o teste garante que os dois têm as mesmas chaves e os mesmos parâmetros ({nome}).
import type { Locale } from '@magnifier-cases/content'

const ptBR = {
  'app.tagline': 'Um jogo cooperativo de dedução para toda a família.',
  'app.status': 'Em construção. Volte em breve!',
  'app.logoAlt': 'Logo: uma lupa',
}

export type MessageKey = keyof typeof ptBR

const en: Record<MessageKey, string> = {
  'app.tagline': 'A cooperative deduction game for the whole family.',
  'app.status': 'Under construction. Come back soon!',
  'app.logoAlt': 'Logo: a magnifying glass',
}

export const messages: Record<Locale, Record<MessageKey, string>> = { 'pt-BR': ptBR, en }

/** Idioma do aparelho: português para qualquer variante "pt"; inglês para o resto. */
export function pickLocale(languages: readonly string[]): Locale {
  return languages.some((lang) => lang.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en'
}

/** Texto traduzido, trocando {nome} pelos parâmetros. */
export function t(locale: Locale, key: MessageKey, params: Record<string, string> = {}): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match)
}
