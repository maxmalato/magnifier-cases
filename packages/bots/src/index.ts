// Bots: `botMove` e `suggest`, funções puras só sobre a `PublicView` (spec, seção 9). Nunca
// recebem o estado completo nem a solução. Etapa 0: só as políticas previstas; o comportamento
// entra na Etapa 2.

/** Políticas de bot: ideal (simulação e dica), casual (padrão na partida) e aleatória (base). */
export const botSkills = ['ideal', 'casual', 'random'] as const
export type BotSkill = (typeof botSkills)[number]
