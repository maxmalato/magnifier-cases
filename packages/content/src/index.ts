// Conteúdo do jogo: tema `party-cake` (elenco, modelos de pista), textos PT-BR e EN e
// formatadores de concordância.
export { appName, locales, type Locale } from './i18n.ts'
export { partyCake } from './party-cake/theme.ts'
export { names, type Noun } from './party-cake/names.ts'
export { clueTexts, type ClueText } from './party-cake/texts.ts'
export { themeTexts } from './party-cake/ui.ts'
export {
  formatItem,
  formatList,
  forms,
  joiners,
  nameOf,
  renderClue,
  renderText,
  themeText,
  titleOf,
  type Form,
  type Joiner,
} from './format.ts'
export { tutorial } from './party-cake/tutorial.ts'
