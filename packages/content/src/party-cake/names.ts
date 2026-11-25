// Nomes do elenco em PT-BR e inglês. `name` é a forma curta usada nas pistas; `title` é a
// forma completa da interface. `article`: o nome leva artigo ("a Padaria", "the Bakery").
// O gênero gramatical (PT-BR) vem do tema.
import type { Locale } from '../i18n.ts'

export interface Noun {
  readonly name: string
  readonly title: string
  readonly article: boolean
}

type Names = Readonly<Record<string, Noun>>

const n = (name: string, title = name, article = true): Noun => ({ name, title, article })

const ptBR: Names = {
  'suspect.baker-ze': n('Seu Zé', 'Seu Zé, o padeiro'),
  'suspect.miss-lucia': n('Dona Lúcia'),
  'suspect.dog-biscuit': n('Biscoito', 'Biscoito, o cachorro'),
  'suspect.mail-tiao': n('Tião', 'Tião, o carteiro'),
  'suspect.teacher-rita': n('Profª Rita'),
  'suspect.cat-cleo': n('Cleo', 'Cleo, a gata'),
  'suspect.gardener-nando': n('Vovô Nando', 'Vovô Nando, o jardineiro'),
  'suspect.skater-bia': n('Bia', 'Bia, a skatista'),
  'suspect.vet-caio': n('Dr. Caio', 'Dr. Caio, o veterinário'),
  'suspect.parrot-pipa': n('Pipa', 'Pipa, o papagaio'),
  'place.bakery': n('Padaria'),
  'place.school': n('Escola'),
  'place.market': n('Mercado'),
  'place.post-office': n('Correio'),
  'place.lucia-backyard': n('Quintal da Lúcia'),
  'place.bandstand': n('Coreto'),
  'place.library': n('Biblioteca'),
  'place.fountain': n('Chafariz'),
  'place.ball-field': n('Campinho'),
  'place.fair': n('Feira'),
  'place.square': n('Praça'),
}

const en: Names = {
  'suspect.baker-ze': n('Mr. Zé', 'Mr. Zé, the baker', false),
  'suspect.miss-lucia': n('Miss Lúcia', 'Miss Lúcia', false),
  'suspect.dog-biscuit': n('Biscuit', 'Biscuit, the dog', false),
  'suspect.mail-tiao': n('Tião', 'Tião, the mail carrier', false),
  'suspect.teacher-rita': n('Teacher Rita', 'Teacher Rita', false),
  'suspect.cat-cleo': n('Cleo', 'Cleo, the cat', false),
  'suspect.gardener-nando': n('Grandpa Nando', 'Grandpa Nando, the gardener', false),
  'suspect.skater-bia': n('Bia', 'Bia, the skater', false),
  'suspect.vet-caio': n('Dr. Caio', 'Dr. Caio, the vet', false),
  'suspect.parrot-pipa': n('Pipa', 'Pipa, the parrot', false),
  'place.bakery': n('Bakery'),
  'place.school': n('School'),
  'place.market': n('Market'),
  'place.post-office': n('Post Office'),
  'place.lucia-backyard': n("Lúcia's Backyard", "Lúcia's Backyard", false),
  'place.bandstand': n('Bandstand'),
  'place.library': n('Library'),
  'place.fountain': n('Fountain'),
  'place.ball-field': n('Ball Field'),
  'place.fair': n('Fair'),
  'place.square': n('Square'),
}

export const names: Readonly<Record<Locale, Names>> = { 'pt-BR': ptBR, en }
