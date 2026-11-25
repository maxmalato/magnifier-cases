// Confere o resultado da simulação contra as metas (regras, seção 9). Usado pelo relatório e
// pela CI: nível fora da meta quebra o build.
import type { LevelResult } from './runner.ts'
import { targetOf, targets } from './targets.ts'

export interface CheckIssue {
  readonly level: string
  readonly message: string
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`

export function checkTargets(results: readonly LevelResult[]): CheckIssue[] {
  const issues: CheckIssue[] = []
  for (const r of results) {
    const t = targetOf(r.level)
    if (r.generationFailures > 0)
      issues.push({
        level: r.level,
        message: `${r.generationFailures} mistério(s) não gerados (meta: 100% resolvíveis)`,
      })
    const bot = (skill: string) => r.bots.find((b) => b.skill === skill)
    const ideal = bot('ideal')
    const casual = bot('casual')
    if (ideal && ideal.winRate < t.idealMin)
      issues.push({
        level: r.level,
        message: `bot ideal ${pct(ideal.winRate)} (meta: ≥ ${pct(t.idealMin)})`,
      })
    if (casual && (casual.winRate < t.casual.min || casual.winRate > t.casual.max))
      issues.push({
        level: r.level,
        message: `bot casual ${pct(casual.winRate)} (meta: ${pct(t.casual.min)}–${pct(t.casual.max)})`,
      })
    if (r.idealRandomGap !== null && r.idealRandomGap < targets.minIdealRandomGap)
      issues.push({
        level: r.level,
        message: `ideal − aleatório ${pct(r.idealRandomGap)} (meta: ≥ ${pct(targets.minIdealRandomGap)})`,
      })
  }
  return issues
}
