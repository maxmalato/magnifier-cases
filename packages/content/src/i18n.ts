// Idiomas do jogo e o nome público (i18n desde o início).

export const locales = ['pt-BR', 'en'] as const
export type Locale = (typeof locales)[number]

/**
 * Nome público do jogo, igual nos dois idiomas. Ainda depende de consulta ao INPI: por isso
 * ele existe só aqui e nunca é escrito em outro lugar do código (o teste test/app-name.test.ts
 * garante). O nome de código do projeto é `magnifier-cases`.
 */
export const appName = 'Casos da Lupa'
