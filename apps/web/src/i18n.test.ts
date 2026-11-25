import { locales } from '@magnifier-cases/content'
import { describe, expect, it } from 'vitest'
import { durationText, messages, pickLocale, t, tn } from './i18n.ts'

const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('i18n da interface', () => {
  it('os dois idiomas têm as mesmas chaves e os mesmos parâmetros', () => {
    const base = messages['pt-BR']
    for (const locale of locales) {
      const dict = messages[locale]
      expect(Object.keys(dict).sort()).toEqual(Object.keys(base).sort())
      for (const [key, text] of Object.entries(dict)) {
        expect(text.trim().length, `${locale} ${key}`).toBeGreaterThan(0)
        expect(params(text), `${locale} ${key}`).toEqual(params(base[key as keyof typeof base]))
      }
    }
  })

  it('toda chave com plural tem .one e .other', () => {
    const keys = Object.keys(messages['pt-BR'])
    for (const key of keys) {
      if (key.endsWith('.one')) expect(keys).toContain(key.replace(/\.one$/, '.other'))
    }
  })

  it('escolhe português para qualquer variante pt e inglês para o resto', () => {
    expect(pickLocale(['pt-BR'])).toBe('pt-BR')
    expect(pickLocale(['pt-PT', 'en'])).toBe('pt-BR')
    expect(pickLocale(['en-US'])).toBe('en')
    expect(pickLocale(['es-ES', 'fr'])).toBe('en')
    expect(pickLocale([])).toBe('en')
  })

  it('traduz com parâmetros e plural', () => {
    expect(t('en', 'turn.of', { name: 'Ana' })).toBe("Ana's turn")
    expect(tn('pt-BR', 'clock.left', 1, { deadline: '18:00' })).toBe(
      'Resta 1 ação até a festa das 18:00',
    )
    expect(tn('pt-BR', 'clock.left', 4, { deadline: '18:00' })).toBe(
      'Restam 4 ações até a festa das 18:00',
    )
  })

  it('durações legíveis', () => {
    expect(durationText('pt-BR', 30)).toBe('30 min')
    expect(durationText('pt-BR', 60)).toBe('1 hora')
    expect(durationText('pt-BR', 90)).toBe('1 h 30')
    expect(durationText('pt-BR', 120)).toBe('2 horas')
    expect(durationText('en', 60)).toBe('1 hour')
  })
})
