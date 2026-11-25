// Motor de regras, gerador e solucionador (spec, seções 4 a 6). TypeScript puro: sem I/O, sem
// APIs de navegador ou da Cloudflare, sem Math.random (só PRNG com semente).
// Etapa 0: só o esqueleto do pacote. Tipos, estado, `transition`, `viewFor`, gerador e
// solucionador entram na Etapa 1.

/** Identificador do motor (o servidor e a simulação o registram junto dos resultados). */
export const ENGINE_ID = 'magnifier-cases/engine'
