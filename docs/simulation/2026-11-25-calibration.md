# Simulação: Primeira calibração (só dados dos níveis)

10000 mistérios por nível e por bot, sementes 1 a 10000 (magnifier-cases/engine).

## Taxa de vitória

| Nível | Ideal | Casual | Aleatório | Ideal − aleatório | Metas (ideal / casual) |
| --- | --- | --- | --- | --- | --- |
| apprentice | 99.2% (99.0%–99.3%) | 93.0% (92.5%–93.5%) | 62.0% (61.0%–62.9%) | 37.2% | ≥ 98.0% / 85.0%–95.0% |
| investigator | 92.3% (91.8%–92.8%) | 82.3% (81.5%–83.0%) | 44.7% (43.7%–45.7%) | 47.6% | ≥ 90.0% / 65.0%–80.0% |
| expert | 80.0% (79.2%–80.7%) | 74.7% (73.8%–75.5%) | 50.1% (49.1%–51.1%) | 29.9% | ≥ 75.0% / 45.0%–60.0% |
| legend | 61.7% (60.8%–62.7%) | 51.7% (50.7%–52.7%) | 29.9% (29.1%–30.9%) | 31.8% | ≥ 55.0% / 25.0%–40.0% |

Meta da diferença ideal − aleatório: ≥ 25.0%.

## Partidas

| Nível | Bot | Ações usadas | Horário médio da vitória | Vitória | Tempo (ações) | Tempo (acusação) | Acusações erradas | Cartas abertas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| apprentice | ideal | 6.27 | 15:37 | 9919 | 0 | 81 | 2.88 | 3.31 |
| apprentice | casual | 7.00 | 15:51 | 9304 | 0 | 696 | 2.09 | 3.94 |
| apprentice | random | 9.70 | 16:57 | 6200 | 0 | 3800 | 0.57 | 6.01 |
| investigator | ideal | 6.37 | 16:02 | 9234 | 0 | 766 | 2.02 | 4.17 |
| investigator | casual | 7.10 | 16:14 | 8227 | 0 | 1773 | 1.59 | 4.61 |
| investigator | random | 9.17 | 17:04 | 4472 | 0 | 5528 | 0.66 | 5.57 |
| expert | ideal | 8.50 | 15:49 | 7997 | 0 | 2003 | 0.96 | 6.26 |
| expert | casual | 9.01 | 16:00 | 7469 | 0 | 2531 | 0.87 | 6.35 |
| expert | random | 10.71 | 16:43 | 5009 | 0 | 4991 | 0.61 | 6.54 |
| legend | ideal | 8.46 | 16:45 | 6172 | 0 | 3828 | 0.55 | 7.58 |
| legend | casual | 8.68 | 16:43 | 5168 | 0 | 4832 | 0.65 | 6.74 |
| legend | random | 9.43 | 17:03 | 2995 | 0 | 7005 | 0.74 | 5.59 |

## Gerador

| Nível | Mistérios | Falhas | Tentativas por mistério | Custo mínimo médio | Folga (distribuição) | Tempo médio (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| apprentice | 10000 | 0 | 3.57 | 6.77 | 3: 27.5%, 4: 35.2%, 5: 25.2%, 6: 10.9%, 7: 1.2% | 0.042 |
| investigator | 10000 | 0 | 1.88 | 5.87 | 2: 7.4%, 3: 19.5%, 4: 33.6%, 5: 31.5%, 6: 8.0% | 0.027 |
| expert | 10000 | 0 | 1.26 | 5.35 | 2: 0.1%, 3: 0.5%, 4: 2.9%, 5: 9.7%, 6: 25.0%, 7: 41.3%, 8: 20.6% | 0.025 |
| legend | 10000 | 0 | 1.10 | 4.82 | 0: 0.1%, 1: 0.1%, 2: 0.5%, 3: 2.9%, 4: 14.1%, 5: 42.5%, 6: 39.9% | 0.028 |

## Metas

- Aviso — **investigator:** bot casual 82.3% (meta: 65.0%–80.0%)
- Aviso — **expert:** bot casual 74.7% (meta: 45.0%–60.0%)
- Aviso — **legend:** bot casual 51.7% (meta: 25.0%–40.0%)

A faixa do bot casual é só aviso até ele ser calibrado com partidas reais (Etapa 7).
