// Leitura fácil para 8 anos (regras, seção 12): frases curtas. As listas de nomes ("o Seu Zé,
// a Bia e o Tião") contam como uma palavra só, porque o tamanho delas vem da própria pista.
import { describe, expect, it } from 'vitest'
import { locales } from './i18n.ts'
import { clueTexts } from './party-cake/texts.ts'
import { themeTexts } from './party-cake/ui.ts'

/** Máximo de palavras por frase, sem contar o tamanho das listas. */
const MAX_WORDS = 12

function longSentences(text: string): string[] {
  const frame = text.replace(/\{[^}]+\}/g, 'X')
  return frame
    .split(/(?<=[.!?:])\s+/)
    .filter((sentence) => sentence.split(/\s+/).filter(Boolean).length > MAX_WORDS)
}

describe('leitura fácil', () => {
  it.each(locales)('as frases das pistas são curtas (%s)', (locale) => {
    const long = Object.values(clueTexts[locale]).flatMap((text) =>
      [text.one, text.other].filter((x) => x !== undefined).flatMap(longSentences),
    )
    expect(long).toEqual([])
  })

  it.each(locales)('as frases do tema são curtas (%s)', (locale) => {
    expect(Object.values(themeTexts[locale]).flatMap(longSentences)).toEqual([])
  })
})
