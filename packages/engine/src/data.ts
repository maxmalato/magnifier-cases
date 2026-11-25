// Dados dos níveis (regras, seção 7), validados pelo schema ao carregar. Todos os valores são
// (inicial): mudar um valor é mudar o JSON, nunca o código.
import raw from '../data/difficulties.json'
import { parseDifficulties, type DifficultyParams, type LevelId } from './schema.ts'

export const difficulties: readonly DifficultyParams[] = parseDifficulties(raw)

export function difficultyOf(level: LevelId): DifficultyParams {
  const params = difficulties.find((p) => p.id === level)
  if (!params) throw new RangeError(`nível desconhecido: ${level}`)
  return params
}
