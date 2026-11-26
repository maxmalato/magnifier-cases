// Kit de salas, agnóstico de jogo: conhece o jogo só pela interface `GameDefinition`.
// Regra de arquitetura: este pacote não importa o motor, os bots nem a simulação.
// Estrutura extraída do village-flood (que veio do senhorio-web), adaptada à informação
// escondida: o estado do jogo só sai pela visão de cada destinatário.
export * from './constants.ts'
export type { GameDefinition, SeatId, TransitionOutcome, Viewer } from './definition.ts'
export {
  parseClientMessage,
  RateLimiter,
  TABLE_MESSAGES,
  type ClientMessage,
  type Notice,
  type ServerMessage,
} from './messages.ts'
export * from './room.ts'
