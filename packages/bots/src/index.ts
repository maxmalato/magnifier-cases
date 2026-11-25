// Bots: `botMove` e `suggest`, funções puras só sobre a `PublicView` (spec, seção 9). Nunca
// recebem o estado completo nem a solução. Servem para a simulação, os testes e a dica de jogada
// do Aprendiz; não jogam nas partidas. Etapa 0: só as políticas previstas; o comportamento
// entra na Etapa 2.

/** Políticas de bot: ideal (simulação e dica), casual (régua de equipe real) e aleatória (base). */
export const botSkills = ['ideal', 'casual', 'random'] as const
export type BotSkill = (typeof botSkills)[number]
