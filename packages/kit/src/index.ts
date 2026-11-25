// Kit de salas, agnóstico de jogo: conhece o jogo só pela interface `GameDefinition`.
// Regra de arquitetura: este pacote não importa o motor, os bots nem a simulação.
// Etapa 0: interface e constantes. A sala (lobby, partida, desconexão, sugestões e mesa) é
// portada do village-flood na Etapa 4, sem bots nas partidas.
export * from './constants.ts'
export type { GameDefinition, SeatId, TransitionOutcome, Viewer } from './definition.ts'
