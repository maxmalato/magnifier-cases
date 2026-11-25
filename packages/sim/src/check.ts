// Confere o resultado da simulação contra as metas (regras, seção 9). Usado pelo relatório e
// pela CI: nível fora da meta quebra o build. A faixa do bot casual só quebra o build quando
// `casualEnforced` está ligado nos dados (até a calibração com partidas reais, é aviso).
import type { LevelResult } from './runner.ts'
import { targetOf, targets } from './targets.ts'

export interface CheckIssue {
  readonly level: string
  readonly message: string
  /** error quebra o build (--check); warning só aparece no relatório. */
  readonly severity: 'error' | 'warning'
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`

export function checkTargets(results: readonly LevelResult[]): CheckIssue[] {
  const issues: CheckIssue[] = []
  for (const r of results) {
    const t = targetOf(r.level)
    const add = (severity: CheckIssue['severity'], message: string) =>
      issues.push({ level: r.level, severity, message })
    if (r.generationFailures > 0)
      add('error', `${r.generationFailures} mistério(s) não gerados (meta: 100% resolvíveis)`)
    const bot = (skill: string) => r.bots.find((b) => b.skill === skill)
    const ideal = bot('ideal')
    const casual = bot('casual')
    if (ideal && ideal.winRate < t.idealMin)
      add('error', `bot ideal ${pct(ideal.winRate)} (meta: ≥ ${pct(t.idealMin)})`)
    if (casual && (casual.winRate < t.casual.min || casual.winRate > t.casual.max))
      add(
        targets.casualEnforced ? 'error' : 'warning',
        `bot casual ${pct(casual.winRate)} (meta: ${pct(t.casual.min)}–${pct(t.casual.max)})`,
      )
    if (r.idealRandomGap !== null && r.idealRandomGap < targets.minIdealRandomGap)
      add(
        'error',
        `ideal − aleatório ${pct(r.idealRandomGap)} (meta: ≥ ${pct(targets.minIdealRandomGap)})`,
      )
  }
  return issues
}
