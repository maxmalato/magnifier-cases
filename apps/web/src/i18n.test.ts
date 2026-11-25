import { locales } from '@magnifier-cases/content'
import { describe, expect, it } from 'vitest'
import { messages, pickLocale, t } from './i18n.ts'

const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('i18n da interface', () => {
  it('os dois idiomas têm as mesmas chaves e os mesmos parâmetros', () => {
    const base = messages['pt-BR']
    for (const locale of locales) {
      const dict = messages[locale]
      expect(Object.keys(dict).sort()).toEqual(Object.keys(base).sort())
      for (const [key, text] of Object.entries(dict)) {
        expect(text.trim().length, `${locale} ${key}`).toBeGreaterThan(0)
        expect(params(text)).toEqual(params(base[key as keyof typeof base]))
      }
    }
  })

  it('escolhe português para qualquer variante pt e inglês para o resto', () => {
    expect(pickLocale(['pt-BR'])).toBe('pt-BR')
    expect(pickLocale(['pt-PT', 'en'])).toBe('pt-BR')
    expect(pickLocale(['en-US'])).toBe('en')
    expect(pickLocale(['es-ES', 'fr'])).toBe('en')
    expect(pickLocale([])).toBe('en')
  })

  it('traduz pela chave', () => {
    expect(t('en', 'app.status')).toBe('Under construction. Come back soon!')
  })
})
