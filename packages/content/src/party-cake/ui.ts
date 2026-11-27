// Textos do tema que aparecem na interface (fora das pistas). Mesmos marcadores e formas das
// pistas: {culprit}, {hideout|in}. Os textos gerais da interface ficam em apps/web.
import type { Locale } from '../i18n.ts'

type Texts = Readonly<Record<string, string>>

const ptBR: Texts = {
  'theme.title': 'O bolo da festa sumiu!',
  'theme.intro':
    'Alguém levou o bolo de cenoura e escondeu no bairro. Descubram quem pegou e onde está antes da festa.',
  'theme.accuseQuestion': 'Quem pegou o bolo? E onde está?',
  'theme.revealCulprit': 'Foi {culprit}!',
  'theme.revealHideout': 'O bolo estava {hideout|in}.',
  'theme.timeoutTitle': 'A festa começou e o bolo não apareceu!',
  'theme.secretTitle': 'Só o jogo sabe a resposta',
  'theme.secretText':
    'O jogo sorteou quem pegou o bolo e onde ele está. Isso fica em segredo até o fim.',
}

const en: Texts = {
  'theme.title': 'The party cake is gone!',
  'theme.intro':
    'Someone took the carrot cake and hid it somewhere in the neighborhood. Find out who took it and where it is before the party.',
  'theme.accuseQuestion': 'Who took the cake? And where is it?',
  'theme.revealCulprit': 'It was {culprit}!',
  'theme.revealHideout': 'The cake was {hideout|in}.',
  'theme.timeoutTitle': 'The party started and the cake never showed up!',
  'theme.secretTitle': 'Only the game knows the answer',
  'theme.secretText':
    'The game picked who took the cake and where it is. That stays secret until the end.',
}

export const themeTexts: Readonly<Record<Locale, Texts>> = { 'pt-BR': ptBR, en }
