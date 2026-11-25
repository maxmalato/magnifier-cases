// Tipos das mensagens entre o aparelho e o servidor (spec, seção 8). O envelope genérico vem
// do kit; aqui ficam as mensagens do jogo (ação, estado sempre como `PublicView`, `resync`,
// sugestão). Etapa 0: só o identificador; as mensagens entram na Etapa 4.

/** Versão do protocolo (o /api/health do servidor a devolve). */
export const PROTOCOL_ID = 'magnifier-cases/v1'
