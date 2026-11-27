// Partida de treino ("Como jogar"): o mistério é sempre o mesmo, gerado pelo motor a partir
// desta semente, no nível Aprendiz. A semente foi escolhida porque o caminho mais curto até a
// resposta é didático: 3 interrogatórios e 1 lugar para investigar (5 ações). Um teste em
// apps/web confere o formato; se o gerador mudar, o teste avisa para escolher outra semente.
import type { LevelId } from '@magnifier-cases/engine'

export const tutorial: { readonly level: LevelId; readonly seed: number } = {
  level: 'apprentice',
  seed: 49,
}
