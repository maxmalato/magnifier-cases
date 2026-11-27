// Leitura fácil para 8 anos (regras, seção 12): as frases da interface são curtas. Marcadores
// ({name}, {place}) contam como uma palavra.
import { describe, expect, it } from 'vitest'
import { messages } from './i18n.ts'

const MAX_WORDS = 12

describe('leitura fácil', () => {
  it.each(Object.keys(messages) as (keyof typeof messages)[])(
    'as frases da interface são curtas (%s)',
    (locale) => {
      const long: string[] = []
      for (const [key, text] of Object.entries(messages[locale])) {
        for (const sentence of text.replace(/\{[^}]+\}/g, 'X').split(/(?<=[.!?:])\s+/)) {
          if (sentence.split(/\s+/).filter(Boolean).length > MAX_WORDS)
            long.push(`${key}: ${sentence}`)
        }
      }
      expect(long).toEqual([])
    },
  )
})
