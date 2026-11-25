import { describe, expect, it } from 'vitest'
import { formatItem, formatList, nameOf, renderClue, titleOf } from './format.ts'
import { locales } from './i18n.ts'
import { partyCake } from './party-cake/theme.ts'

const allIds = [...partyCake.suspects, ...partyCake.places].map((i) => i.id)

describe('formatadores de concordância', () => {
  it('artigos em PT-BR pelo gênero', () => {
    expect(formatItem('bakery', 'pt-BR')).toBe('a Padaria')
    expect(formatItem('bakery', 'pt-BR', 'of')).toBe('da Padaria')
    expect(formatItem('bakery', 'pt-BR', 'in')).toBe('na Padaria')
    expect(formatItem('bakery', 'pt-BR', 'to')).toBe('à Padaria')
    expect(formatItem('bandstand', 'pt-BR')).toBe('o Coreto')
    expect(formatItem('bandstand', 'pt-BR', 'of')).toBe('do Coreto')
    expect(formatItem('bandstand', 'pt-BR', 'in')).toBe('no Coreto')
    expect(formatItem('bandstand', 'pt-BR', 'to')).toBe('ao Coreto')
    expect(formatItem('miss-lucia', 'pt-BR')).toBe('a Dona Lúcia')
    expect(formatItem('baker-ze', 'pt-BR', 'of')).toBe('do Seu Zé')
    expect(formatItem('square', 'pt-BR', 'in')).toBe('na Praça')
  })

  it('artigos em inglês', () => {
    expect(formatItem('bakery', 'en')).toBe('the Bakery')
    expect(formatItem('bakery', 'en', 'in')).toBe('at the Bakery')
    expect(formatItem('lucia-backyard', 'en', 'in')).toBe("at Lúcia's Backyard")
    expect(formatItem('baker-ze', 'en')).toBe('Mr. Zé')
  })

  it('listas nos dois idiomas', () => {
    const three = ['bakery', 'school', 'bandstand']
    expect(formatList(three, 'pt-BR')).toBe('a Padaria, a Escola e o Coreto')
    expect(formatList(three, 'pt-BR', 'in', 'or')).toBe('na Padaria, na Escola ou no Coreto')
    expect(formatList(three.slice(0, 2), 'pt-BR', 'in', 'nor')).toBe('na Padaria nem na Escola')
    expect(formatList(three, 'en')).toBe('the Bakery, the School and the Bandstand')
    expect(formatList(three.slice(0, 2), 'en', 'in', 'nor')).toBe('at the Bakery or at the School')
    expect(formatList(['bakery'], 'en')).toBe('the Bakery')
    expect(formatList([], 'en')).toBe('')
  })

  it('todo item do elenco tem nome e título nos dois idiomas, em todas as formas', () => {
    for (const locale of locales) {
      for (const id of [...allIds, 'square']) {
        expect(nameOf(id, locale).length).toBeGreaterThan(0)
        expect(titleOf(id, locale).startsWith(nameOf(id, locale))).toBe(true)
        for (const form of ['def', 'of', 'in', 'to'] as const)
          expect(formatItem(id, locale, form)).toContain(nameOf(id, locale))
      }
    }
  })

  it('item desconhecido é erro', () => {
    expect(() => nameOf('nobody', 'en')).toThrow()
  })
})

describe('textos das pistas', () => {
  it('um e vários itens escolhem a frase certa', () => {
    const one = {
      textKey: 'clue.with-me-afternoon',
      slots: { source: ['baker-ze'], suspects: ['miss-lucia'] },
    }
    expect(renderClue(one, 'pt-BR')).toBe(
      'A Dona Lúcia passou a tarde toda comigo, então não levou o bolo.',
    )
    const two = {
      ...one,
      slots: { source: ['baker-ze'], suspects: ['miss-lucia', 'teacher-rita'] },
    }
    expect(renderClue(two, 'pt-BR')).toBe(
      'A Dona Lúcia e a Profª Rita passaram a tarde toda comigo, então não levaram o bolo.',
    )
    expect(renderClue(two, 'en')).toBe(
      'Miss Lúcia and Teacher Rita spent the whole afternoon with me, so none of them took the cake.',
    )
  })

  it('pistas de grupo usam "ou" e lugares levam a preposição certa', () => {
    const card = {
      textKey: 'clue.crumb-trail',
      slots: { source: ['school'], places: ['school', 'bandstand'] },
    }
    expect(renderClue(card, 'pt-BR')).toBe(
      'Daqui sai um rastro de migalhas: o bolo está na Escola ou no Coreto.',
    )
    expect(renderClue(card, 'en')).toBe(
      'A trail of crumbs starts here: the cake is at the School or at the Bandstand.',
    )
  })

  it('ruído pode citar a própria origem', () => {
    const card = { textKey: 'clue.smells-cinnamon', slots: { source: ['bakery'] } }
    expect(renderClue(card, 'pt-BR')).toBe('A Padaria cheira a canela.')
    expect(renderClue(card, 'en')).toBe('The Bakery smells of cinnamon.')
  })
})
