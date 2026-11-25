// Tema party-cake: elenco das regras (seção 3), textos completos nos dois idiomas e integração
// com o gerador do motor (todas as cartas geradas viram texto sem sobra de marcador).
import { difficulties, generateMystery, type ClueCard } from '@magnifier-cases/engine'
import { describe, expect, it } from 'vitest'
import { nameOf, renderClue } from './format.ts'
import { locales } from './i18n.ts'
import { clueTexts } from './party-cake/texts.ts'
import { partyCake } from './party-cake/theme.ts'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort()

describe('tema party-cake', () => {
  it('tem os 10 suspeitos e os 10 lugares das regras', () => {
    expect(partyCake.suspects.map((s) => s.id)).toEqual([
      'baker-ze',
      'miss-lucia',
      'dog-biscuit',
      'mail-tiao',
      'teacher-rita',
      'cat-cleo',
      'gardener-nando',
      'skater-bia',
      'vet-caio',
      'parrot-pipa',
    ])
    expect(partyCake.places.map((p) => p.id)).toEqual([
      'bakery',
      'school',
      'market',
      'post-office',
      'lucia-backyard',
      'bandstand',
      'library',
      'fountain',
      'ball-field',
      'fair',
    ])
  })

  it('todo modelo tem texto nos dois idiomas, com os mesmos marcadores', () => {
    for (const t of partyCake.templates) {
      const pt = clueTexts['pt-BR'][t.textKey]
      const en = clueTexts.en[t.textKey]
      expect(pt, t.textKey).toBeDefined()
      expect(en, t.textKey).toBeDefined()
      expect(placeholders(en?.other ?? '')).toEqual(placeholders(pt?.other ?? ''))
      expect(Boolean(en?.one)).toBe(Boolean(pt?.one))
      // pistas de grupo (only-*) nunca têm um item só: não precisam da forma singular
      if (t.effectKind.startsWith('only')) expect(pt?.one).toBeUndefined()
      // ruído não cita suspeitos nem lugares além da própria origem
      if (t.effectKind === 'none')
        expect(placeholders(pt?.other ?? '').every((p) => p === 'source')).toBe(true)
    }
    // nenhum texto sobrando sem modelo
    for (const locale of locales)
      expect(Object.keys(clueTexts[locale]).sort()).toEqual(
        partyCake.templates.map((t) => t.textKey).sort(),
      )
  })

  it('cartas geradas em todos os níveis viram texto nos dois idiomas, citando só os itens da carta', () => {
    const everyone = [...partyCake.suspects, ...partyCake.places].map((i) => i.id)
    for (const params of difficulties) {
      for (let seed = 0; seed < 40; seed++) {
        const mystery = generateMystery(params, partyCake, seed)
        for (const card of mystery.cards as ClueCard[]) {
          const allowed = new Set([
            card.source.id,
            ...(card.slots.suspects ?? []),
            ...(card.slots.places ?? []),
          ])
          for (const locale of locales) {
            const text = renderClue(card, locale)
            expect(text).not.toMatch(/[{}]/)
            expect(text.charAt(0)).toBe(text.charAt(0).toLocaleUpperCase(locale))
            // a carta diz exatamente o efeito: nenhum outro item aparece no texto
            for (const id of everyone)
              if (!allowed.has(id))
                expect(text, `${card.textKey} ${locale}`).not.toContain(nameOf(id, locale))
            // todo item do efeito aparece no texto
            for (const id of [...(card.slots.suspects ?? []), ...(card.slots.places ?? [])])
              expect(text).toContain(nameOf(id, locale))
          }
        }
      }
    }
  })
})
