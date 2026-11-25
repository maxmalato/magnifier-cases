// Estatística simples para o relatório.

/** Intervalo de confiança de 95% (Wilson) para uma proporção. */
export function wilson(successes: number, total: number, z = 1.96): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 0 }
  const p = successes / total
  const denom = 1 + (z * z) / total
  const center = (p + (z * z) / (2 * total)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denom
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) }
}

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length

/** "16:30" → minutos; e de volta. */
export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
export const fromMinutes = (minutes: number): string => {
  const total = Math.round(minutes)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Contagem por valor, com as chaves em ordem numérica. */
export function histogram(values: readonly number[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of [...values].sort((a, b) => a - b)) out[String(v)] = (out[String(v)] ?? 0) + 1
  return out
}
