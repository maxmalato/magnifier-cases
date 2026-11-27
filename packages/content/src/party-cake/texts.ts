// Textos dos modelos de pista em PT-BR e inglês. Cada texto diz EXATAMENTE o efeito da carta
// (regras, seção 4.4): nada além. Marcadores: {suspects}, {places} e {source}, com forma e
// ligação opcionais: {places|in|or} → "na Padaria ou no Coreto". Formas: def (padrão), of, in,
// to. Ligações: and (padrão), or, nor. `one` é usado quando a lista tem um item só.
// A concordância (o/a, no/na, à/ao) fica nos formatadores, nunca nas frases.
import type { Locale } from '../i18n.ts'

export interface ClueText {
  readonly one?: string
  readonly other: string
}

type Texts = Readonly<Record<string, ClueText>>

const ptBR: Texts = {
  'clue.with-me-afternoon': {
    one: '{suspects} passou a tarde toda comigo. Então não levou o bolo.',
    other: '{suspects} passaram a tarde toda comigo. Então não levaram o bolo.',
  },
  'clue.decorating-square': {
    one: 'Eu vi {suspects} enfeitando a praça o tempo todo. Então não levou o bolo.',
    other: 'Eu vi {suspects} enfeitando a praça o tempo todo. Então não levaram o bolo.',
  },
  'clue.party-photo': {
    one: 'Achei uma foto da festa aqui: {suspects} aparece nela a tarde toda. Então não levou o bolo.',
    other:
      'Achei uma foto da festa aqui: {suspects} aparecem nela a tarde toda. Então não levaram o bolo.',
  },
  'clue.ice-cream-line': {
    one: 'Um bilhete aqui diz: {suspects} ficou na fila do sorvete a tarde toda. Então não levou o bolo.',
    other:
      'Um bilhete aqui diz: {suspects} ficaram na fila do sorvete a tarde toda. Então não levaram o bolo.',
  },
  'clue.spent-afternoon-at': {
    one: 'Passei a tarde toda {places|in}. O bolo não está lá.',
    other: 'Passei a tarde {places|in|and}. O bolo não está em nenhum desses lugares.',
  },
  'clue.nobody-went-in': {
    one: 'Hoje ninguém entrou {places|in}. Então o bolo não está lá.',
    other: 'Hoje ninguém entrou {places|in|nor}. Então o bolo não está em nenhum desses lugares.',
  },
  'clue.view-from-here': {
    one: 'Daqui dá para ver {places}. O bolo não está lá.',
    other: 'Daqui dá para ver {places}. O bolo não está em nenhum desses lugares.',
  },
  'clue.map-not-there': {
    other: 'Um mapa aqui mostra que o bolo não está {places|in|nor}.',
  },
  'clue.sure-who-took': {
    other: 'Tenho certeza de uma coisa: quem levou o bolo foi {suspects|def|or}.',
  },
  'clue.saw-from-far': {
    other: 'Vi de longe quem saiu correndo com o bolo: foi {suspects|def|or}.',
  },
  'clue.footprints-here': {
    other: 'Tem pegadas aqui: quem levou o bolo foi {suspects|def|or}.',
  },
  'clue.note-who-took': {
    other: 'Um recado aqui diz: quem levou o bolo foi {suspects|def|or}.',
  },
  'clue.sure-where': {
    other: 'Tenho certeza: o bolo está {places|in|or}.',
  },
  'clue.cake-went-by': {
    other: 'Vi o bolo passar de longe. Ele está {places|in|or}.',
  },
  'clue.crumb-trail': {
    other: 'Daqui sai um rastro de migalhas: o bolo está {places|in|or}.',
  },
  'clue.hiding-map': {
    other: 'Um mapa aqui marca os esconderijos possíveis: o bolo está {places|in|or}.',
  },
  'clue.love-carrot-cake': { other: 'Adoro bolo de cenoura com cobertura de chocolate!' },
  'clue.lovely-day': { other: 'Hoje o dia está lindo para uma festa.' },
  'clue.smells-cinnamon': { other: '{source} cheira a canela.' },
  'clue.colorful-flags': { other: 'Tem bandeirinhas coloridas por todo lado {source|in}.' },
}

const en: Texts = {
  'clue.with-me-afternoon': {
    one: '{suspects} spent the whole afternoon with me. So they did not take the cake.',
    other: '{suspects} spent the whole afternoon with me. So none of them took the cake.',
  },
  'clue.decorating-square': {
    one: 'I saw {suspects} decorating the square the whole time. So they did not take the cake.',
    other: 'I saw {suspects} decorating the square the whole time. So none of them took the cake.',
  },
  'clue.party-photo': {
    one: 'I found a party photo here: {suspects} is in it all afternoon. So they did not take the cake.',
    other:
      'I found a party photo here: {suspects} are in it all afternoon. So none of them took the cake.',
  },
  'clue.ice-cream-line': {
    one: 'A note here says: {suspects} waited in the ice cream line all afternoon. So they did not take the cake.',
    other:
      'A note here says: {suspects} waited in the ice cream line all afternoon. So none of them took the cake.',
  },
  'clue.spent-afternoon-at': {
    one: 'I spent the whole afternoon {places|in}. The cake is not there.',
    other: 'I spent the afternoon {places|in|and}. The cake is in none of those places.',
  },
  'clue.nobody-went-in': {
    one: 'Nobody went into {places} today. So the cake is not there.',
    other: 'Nobody went into {places|def|or} today. So the cake is in none of those places.',
  },
  'clue.view-from-here': {
    one: 'From here you can see {places}. The cake is not there.',
    other: 'From here you can see {places}. The cake is in none of those places.',
  },
  'clue.map-not-there': {
    other: 'A map here shows that the cake is not {places|in|nor}.',
  },
  'clue.sure-who-took': {
    other: 'I am sure of one thing: the cake was taken by {suspects|def|or}.',
  },
  'clue.saw-from-far': {
    other: 'From far away, I saw who ran off with the cake: it was {suspects|def|or}.',
  },
  'clue.footprints-here': {
    other: 'There are footprints here: the cake was taken by {suspects|def|or}.',
  },
  'clue.note-who-took': {
    other: 'A note here says: the cake was taken by {suspects|def|or}.',
  },
  'clue.sure-where': {
    other: 'I am sure: the cake is {places|in|or}.',
  },
  'clue.cake-went-by': {
    other: 'I saw the cake go by from far away. It is {places|in|or}.',
  },
  'clue.crumb-trail': {
    other: 'A trail of crumbs starts here: the cake is {places|in|or}.',
  },
  'clue.hiding-map': {
    other: 'A map here marks the possible hiding places: the cake is {places|in|or}.',
  },
  'clue.love-carrot-cake': { other: 'I love carrot cake with chocolate frosting!' },
  'clue.lovely-day': { other: 'Today is a lovely day for a party.' },
  'clue.smells-cinnamon': { other: '{source} smells of cinnamon.' },
  'clue.colorful-flags': { other: 'There are colorful flags all over {source}.' },
}

export const clueTexts: Readonly<Record<Locale, Texts>> = { 'pt-BR': ptBR, en }
