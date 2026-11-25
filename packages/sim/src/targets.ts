// Metas de dificuldade (regras, seção 9). São (inicial) e vivem em dados: data/targets.json.
import { levelIds, type LevelId } from '@magnifier-cases/engine'
import { z } from 'zod'
import raw from '../data/targets.json' with { type: 'json' }

const rate = z.number().min(0).max(1)
const LevelTargetSchema = z.object({
  /** Taxa mínima de vitória do bot ideal. */
  idealMin: rate,
  /** Faixa do bot casual (proxy de equipe real). */
  casual: z.object({ min: rate, max: rate }).refine((r) => r.min <= r.max, 'min maior que max'),
})
export const TargetsSchema = z.object({
  levels: z.record(z.enum(levelIds), LevelTargetSchema),
  /** Diferença mínima ideal − aleatório em cada nível ("decisão que vale a pena"). */
  minIdealRandomGap: rate,
})
export type Targets = z.infer<typeof TargetsSchema>
export type LevelTarget = z.infer<typeof LevelTargetSchema>

export const targets: Targets = TargetsSchema.parse(raw)

export function targetOf(level: LevelId): LevelTarget {
  const t = targets.levels[level]
  if (!t) throw new RangeError(`sem meta para o nível ${level}`)
  return t
}
