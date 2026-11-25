// Relatório da simulação em Markdown (para ler) e JSON (versionado, para comparar).
import type { CheckIssue } from './check.ts'
import type { LevelResult } from './runner.ts'
import { targetOf, targets } from './targets.ts'

export interface ReportMeta {
  readonly label: string
  readonly runs: number
  readonly baseSeed: number
  readonly engine: string
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const num = (x: number) => x.toFixed(2)

export function toJson(
  meta: ReportMeta,
  results: readonly LevelResult[],
  issues: readonly CheckIssue[],
) {
  return { meta, targets, results, issues }
}

export function toMarkdown(
  meta: ReportMeta,
  results: readonly LevelResult[],
  issues: readonly CheckIssue[],
): string {
  const lines: string[] = []
  lines.push(`# Simulação: ${meta.label}`, '')
  lines.push(
    `${meta.runs} mistérios por nível e por bot, sementes ${meta.baseSeed} a ${meta.baseSeed + meta.runs - 1} (${meta.engine}).`,
    '',
  )
  lines.push('## Taxa de vitória', '')
  lines.push('| Nível | Ideal | Casual | Aleatório | Ideal − aleatório | Metas (ideal / casual) |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const r of results) {
    const t = targetOf(r.level)
    const cell = (skill: string) => {
      const b = r.bots.find((x) => x.skill === skill)
      return b ? `${pct(b.winRate)} (${pct(b.winRateCi95.low)}–${pct(b.winRateCi95.high)})` : '–'
    }
    const gap = r.idealRandomGap === null ? '–' : pct(r.idealRandomGap)
    lines.push(
      `| ${r.level} | ${cell('ideal')} | ${cell('casual')} | ${cell('random')} | ${gap} | ≥ ${pct(t.idealMin)} / ${pct(t.casual.min)}–${pct(t.casual.max)} |`,
    )
  }
  lines.push('', `Meta da diferença ideal − aleatório: ≥ ${pct(targets.minIdealRandomGap)}.`, '')
  lines.push('## Partidas', '')
  lines.push(
    '| Nível | Bot | Ações usadas | Horário médio da vitória | Vitória | Tempo (ações) | Tempo (acusação) | Acusações erradas | Cartas abertas |',
  )
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const r of results)
    for (const b of r.bots)
      lines.push(
        `| ${r.level} | ${b.skill} | ${num(b.avgActionsUsed)} | ${b.avgSolvedAt ?? '–'} | ${b.endCauses.won} | ${b.endCauses['timeout-actions']} | ${b.endCauses['timeout-accusation']} | ${num(b.avgWrongAccusations)} | ${num(b.avgCardsOpened)} |`,
      )
  lines.push('', '## Gerador', '')
  lines.push(
    '| Nível | Mistérios | Falhas | Tentativas por mistério | Custo mínimo médio | Folga (distribuição) | Tempo médio (ms) |',
  )
  lines.push('| --- | --- | --- | --- | --- | --- | --- |')
  for (const r of results) {
    const slack = Object.entries(r.slack)
      .map(([k, v]) => `${k}: ${pct(v / Math.max(1, r.mysteries))}`)
      .join(', ')
    lines.push(
      `| ${r.level} | ${r.mysteries} | ${r.generationFailures} | ${num(r.avgAttempts)} | ${num(r.avgMinCost)} | ${slack} | ${r.avgGenerationMs.toFixed(3)} |`,
    )
  }
  lines.push('', '## Metas', '')
  if (issues.length === 0) lines.push('Todos os níveis dentro das metas.')
  else for (const i of issues) lines.push(`- **${i.level}:** ${i.message}`)
  lines.push('')
  return lines.join('\n')
}
