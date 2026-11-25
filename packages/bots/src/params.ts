// Parâmetros dos bots (regras, seção 9; spec, seção 9). Todos são (inicial): o bot casual é
// calibrado com partidas reais na Etapa 7. Validados por schema; mudar é mudar o JSON.
import { z } from 'zod'
import raw from '../data/bot-params.json' with { type: 'json' }

const rate = z.number().min(0).max(1)

export const BotParamsSchema = z.object({
  casual: z.object({
    /** Chance de, numa jogada, abrir uma carta qualquer em vez da melhor. */
    mistakeRate: rate,
    /** Chance de esquecer as pistas parciais (only-*) ao pensar na jogada. */
    ignorePartialRate: rate,
    /** Chance de acusar cedo quando restam poucas duplas. */
    earlyAccuseRate: rate,
    /** "Poucas duplas" para a acusação precoce. */
    earlyAccuseMaxPairs: z.int().min(1),
  }),
  random: z.object({
    /** O bot aleatório acusa quando restam até tantas duplas (ou na última ação). */
    accuseMaxPairs: z.int().min(1),
  }),
})
export type BotParams = z.infer<typeof BotParamsSchema>

export const botParams: BotParams = BotParamsSchema.parse(raw)
