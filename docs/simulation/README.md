# Simulação

Relatórios da simulação em lote com bots (regras, seção 9; spec, seção 11). Cada relatório tem um `.md` (para ler) e um `.json` (versionado, para comparar).

## Como rodar

```bash
pnpm simulate                                          # 10.000 mistérios por nível e por bot
pnpm simulate --runs 2000 --levels expert,legend       # parcial
pnpm --filter @magnifier-cases/sim simulate --out ../../docs/simulation/AAAA-MM-DD-nome --label "Título"
pnpm simulate:check                                    # versão da CI (2.000), quebra fora da meta
```

As sementes são fixas (`--seed`, padrão 1): a mesma versão do código e dos dados dá sempre o mesmo resultado. Os três bots jogam os mesmos mistérios. Só o tempo de geração varia com a máquina.

Onde ficam os números:

- Níveis: `packages/engine/data/difficulties.json`.
- Bots casual e aleatório: `packages/bots/data/bot-params.json`.
- Metas: `packages/sim/data/targets.json`.

## Relatórios

| Arquivo | O que é |
| --- | --- |
| `2026-11-25-baseline` | Valores iniciais das regras, antes de qualquer ajuste. |
| `2026-11-25-calibration` | Primeira calibração (só ações e custo da acusação errada). |

## Resumo da Etapa 2 (25/11/2026)

10.000 mistérios por nível e por bot. Taxa de vitória:

| Nível | Ideal (antes → depois) | Casual (antes → depois) | Aleatório (antes → depois) | Ideal − aleatório (depois) | Metas (ideal / casual) |
| --- | --- | --- | --- | --- | --- |
| Aprendiz | 97,1% → 99,2% | 90,1% → 93,0% | 51,7% → 62,0% | 37,2 pontos | ≥ 98% / 85–95% |
| Investigador | 55,8% → 92,3% | 49,6% → 82,3% | 27,0% → 44,7% | 47,6 pontos | ≥ 90% / 65–80% |
| Perito | 48,3% → 80,0% | 40,9% → 74,7% | 21,4% → 50,1% | 29,9 pontos | ≥ 75% / 45–60% |
| Lenda | 30,3% → 61,7% | 26,9% → 51,7% | 14,0% → 29,9% | 31,8 pontos | ≥ 55% / 25–40% |

Mudanças (só dados, na ordem da seção 9 das regras: ações primeiro):

| Nível | Ações | Início | Acusação errada |
| --- | --- | --- | --- |
| Aprendiz | 10 → 11 | 13:00 → 12:30 | 1 ação |
| Investigador | 8 → 10 | 14:00 → 13:00 | 2 → 1 ação |
| Perito | 8 → 12 | 14:00 → 12:00 | 2 ações |
| Lenda | 7 → 10 | 14:30 → 13:00 | 3 ações |

O gerador fez 100% dos mistérios resolvíveis em todos os níveis (nenhuma falha em 80.000), em menos de 0,1 ms por mistério.

### Alternativas medidas (2.000 mistérios cada)

- **Investigador só com mais ações** (erro de 2 ações): 12 ações → ideal 85%; 13 → ideal 93%, mas a diferença ideal − aleatório cai para 24 pontos (abaixo da meta). Por isso o custo do erro caiu para 1.
- **Perito com erro de 1 ação:** 10 ações → ideal 87%, diferença de 48 pontos. Dá mais peso à decisão, mas muda dois valores; ficou a opção com uma mudança só (12 ações).
- **Lenda com 9 ações:** ideal 52% (abaixo da meta de 55%).
- **Menos ruído ou grupos maiores** mexem pouco (1 a 7 pontos no ideal).

## Recomendações para os pontos em aberto (regras, seção 11)

1. **Decisão ou sorte? (itens 1 e 3).** Depois da calibração, a diferença ideal − aleatório fica entre 30 e 48 pontos em todos os níveis: as escolhas pesam. Não é preciso criar pistas que apontam onde procurar (`lead`) agora. Perito e Lenda são viáveis com 12 e 10 ações. O problema nunca foi o gerador (a folga do oráculo é grande); o difícil é achar o caminho sem saber o que as cartas dizem.
2. **Acusar dupla por dupla (item 12, novo).** É a estratégia vencedora: o bot ideal vence assim em 98% das partidas do Aprendiz, 85% do Investigador e 68% do Perito (3.000 partidas por nível). Na Lenda, o par único é deduzido em 18% das partidas (cerca de 30% das vitórias); o resto das vitórias vem de chutes. Decisão do dono: manter como gestão de risco ("vale a pena chutar?") ou fazer a acusação pesar mais. Qualquer mudança de regra exige nova calibração.
3. **Acusação final com o relógio zerado (item 4).** Não recomendo criar: a última ação já pode ser uma acusação, e os bots sempre a usam assim. A interface deve avisar "última ação: dá para acusar". Validar com crianças.
4. **Dica de jogada (item 5).** Decidido: só no Aprendiz. A dica é a jogada do bot ideal, então ela vai sugerir "acusar dupla por dupla" quando isso couber no relógio. Ver o item 2.
5. **Bot casual (item 6).** Com os defeitos iniciais (20% de erro de escolha, 30% de esquecer pistas parciais, 30% de acusar cedo), o casual fica só 5 a 12 pontos abaixo do ideal, e as metas pedem 15 a 25 nos níveis altos. O casual é um palpite até as partidas reais (Etapa 7). Por isso a faixa dele virou aviso na CI, e o build só quebra por ideal, diferença e resolvibilidade.

### Erro mais caro (pedido do dono, 25/11/2026)

2.000 mistérios por variante; "dedução" e "dupla por dupla" são a forma da primeira acusação nas vitórias do bot ideal (1.000 partidas).

| Nível | Variante | Ideal | Ideal − aleatório | Vitórias por dedução | Vitórias dupla por dupla |
| --- | --- | --- | --- | --- | --- |
| Aprendiz | atual (erro 1, 11 ações) | 99,5% | 37,0 | 0% | 98% |
| Aprendiz | erro 2 | 83,7% | 28,3 | 2% | 73% |
| Aprendiz | erro 2, 12 ações | 92,5% | 25,7 | 1% | 87% |
| Aprendiz | erro 2, exclusão 2 a 3 | 98,9% | 11,8 | 1% | 98% |
| Investigador | atual (erro 1, 10 ações) | 91,7% | 46,1 | 0% | 85% |
| Investigador | erro 2, 12 ações | 85,3% | 26,3 | 2% | 74% |
| Investigador | erro 2, exclusão 2 a 4, 11 ações | 95,8% | 22,2 | 3% | 91% |

Conclusão: com acusação que só custa tempo, acusar todas as duplas é a jogada racional sempre que cabe no relógio. Um custo maior só muda quando isso passa a valer, deixa o jogo mais difícil e mais dependente de sorte. Os níveis continuam com a calibração aprovada.

## Para aprovar (portão da Etapa 3)

- A calibração da tabela acima (aprovada em 25/11/2026).
- O bot casual como aviso na CI até a Etapa 7 (`casualEnforced: false`) (aprovado em 25/11/2026).
- Uma decisão sobre o item 12 (acusar dupla por dupla).
