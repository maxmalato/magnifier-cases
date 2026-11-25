// CLI da simulação: `pnpm simulate [opções]`.
//   --runs N        mistérios por nível e por bot (padrão: 10000)
//   --seed N        semente do primeiro mistério (padrão: 1)
//   --levels a,b    níveis (padrão: todos)
//   --skills a,b    bots (padrão: ideal,casual,random)
//   --out caminho   grava caminho.md e caminho.json (ex.: docs/simulation/2026-11-25-baseline)
//   --label texto   título do relatório
//   --check         sai com erro se algum nível ficar fora da meta (usado na CI)
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { botSkills, type BotSkill } from '@magnifier-cases/bots'
import { partyCake } from '@magnifier-cases/content'
import { ENGINE_ID, levelIds, type LevelId } from '@magnifier-cases/engine'
import { checkTargets } from './check.ts'
import { FULL_RUN_SIZE } from './index.ts'
import { toJson, toMarkdown } from './report.ts'
import { simulate } from './runner.ts'

const { values } = parseArgs({
  options: {
    runs: { type: 'string' },
    seed: { type: 'string' },
    levels: { type: 'string' },
    skills: { type: 'string' },
    out: { type: 'string' },
    label: { type: 'string' },
    check: { type: 'boolean', default: false },
  },
})

function list<T extends string>(raw: string | undefined, allowed: readonly T[]): T[] {
  if (!raw) return [...allowed]
  const items = raw.split(',').map((s) => s.trim())
  for (const item of items)
    if (!(allowed as readonly string[]).includes(item))
      throw new Error(`valor desconhecido: ${item}`)
  return items as T[]
}

const runs = Number(values.runs ?? FULL_RUN_SIZE)
const baseSeed = Number(values.seed ?? 1)
if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs precisa ser um inteiro positivo')
if (!Number.isInteger(baseSeed) || baseSeed < 0)
  throw new Error('--seed precisa ser um inteiro ≥ 0')

const levels = list<LevelId>(values.levels, levelIds)
const skills = list<BotSkill>(values.skills, botSkills)
const started = performance.now()
const results = simulate({
  theme: partyCake,
  levels,
  skills,
  runs,
  baseSeed,
  now: () => performance.now(),
})
const issues = checkTargets(results)
const meta = { label: values.label ?? 'simulação', runs, baseSeed, engine: ENGINE_ID }
const markdown = toMarkdown(meta, results, issues)
console.log(markdown)
console.log(`Tempo total: ${((performance.now() - started) / 1000).toFixed(1)} s`)
if (values.out) {
  writeFileSync(`${values.out}.md`, markdown)
  writeFileSync(`${values.out}.json`, `${JSON.stringify(toJson(meta, results, issues), null, 2)}\n`)
  console.log(`Relatório gravado em ${values.out}.md e ${values.out}.json`)
}
if (values.check && issues.length > 0) {
  console.error(`${issues.length} meta(s) fora do alvo.`)
  process.exitCode = 1
}
