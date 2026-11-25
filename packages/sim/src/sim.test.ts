import { botSkills } from '@magnifier-cases/bots'
import { partyCake } from '@magnifier-cases/content'
import { difficultyOf } from '@magnifier-cases/engine'
import { describe, expect, it } from 'vitest'
import { checkTargets } from './check.ts'
import { FULL_RUN_SIZE } from './index.ts'
import { playGame } from './play.ts'
import { toMarkdown } from './report.ts'
import { simulate, type LevelResult } from './runner.ts'
import { wilson } from './stats.ts'
import { targets } from './targets.ts'

describe('simulação', () => {
  it('usa 10.000 mistérios por nível e por bot no protocolo completo', () => {
    expect(FULL_RUN_SIZE).toBe(10_000)
  })

  it('uma partida termina com causa e ações coerentes', () => {
    const params = difficultyOf('expert')
    for (let seed = 1; seed <= 20; seed++) {
      const o = playGame(params, partyCake, seed, { skill: 'ideal', seed })
      expect(o.actionsUsed).toBeLessThanOrEqual(params.actionsTotal)
      if (o.won) expect(o.solvedAt).not.toBeNull()
      else {
        expect(o.solvedAt).toBeNull()
        expect(o.actionsUsed).toBe(params.actionsTotal)
      }
    }
  })

  it('mesmas sementes, mesmo resultado', () => {
    const options = {
      theme: partyCake,
      levels: ['apprentice', 'legend'] as const,
      skills: botSkills,
      runs: 30,
      baseSeed: 7,
    }
    expect(simulate(options)).toEqual(simulate(options))
  })

  it('o relatório lista metas fora do alvo', () => {
    const results = simulate({
      theme: partyCake,
      levels: ['apprentice'],
      skills: botSkills,
      runs: 20,
      baseSeed: 1,
    })
    const fake: LevelResult[] = [
      {
        ...(results[0] as LevelResult),
        bots: (results[0] as LevelResult).bots.map((b) => ({ ...b, winRate: 0 })),
        idealRandomGap: 0,
      },
    ]
    const issues = checkTargets(fake)
    expect(issues.map((i) => i.message).join(' ')).toMatch(/ideal/)
    expect(issues.map((i) => i.message).join(' ')).toMatch(/aleatório/)
    // o casual só quebra o build quando os dados pedem; ideal e diferença sempre quebram
    expect(issues.find((i) => i.message.includes('casual'))?.severity).toBe(
      targets.casualEnforced ? 'error' : 'warning',
    )
    expect(issues.find((i) => i.message.includes('ideal'))?.severity).toBe('error')
    expect(
      toMarkdown({ label: 'teste', runs: 20, baseSeed: 1, engine: 'x' }, fake, issues),
    ).toContain('## Metas')
  })

  it('metas carregam dos dados', () => {
    expect(targets.minIdealRandomGap).toBeGreaterThan(0)
  })

  it('intervalo de Wilson', () => {
    const ci = wilson(50, 100)
    expect(ci.low).toBeCloseTo(0.404, 2)
    expect(ci.high).toBeCloseTo(0.596, 2)
    expect(wilson(0, 0)).toEqual({ low: 0, high: 0 })
  })
})
