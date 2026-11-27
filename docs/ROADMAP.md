# Casos da Lupa: roadmap

Segue o formato do roadmap do Enchente na Vila: cada etapa termina com testes passando, commit e tag. Uma etapa só começa quando a anterior fechou. Atualize a tabela de situação sempre que uma etapa começar ou fechar.

## Ordem e motivo

A ordem é **motor, gerador, solucionador, bots e simulação antes de qualquer tela**. Os números abertos (níveis, mistura de pistas, metas de vitória, viabilidade de Perito e Lenda, se o jogo depende de decisão ou de sorte) são calibrados na Etapa 2, quando mudar custa quase nada. A interface só começa depois disso.

## Situação

| Etapa | Situação | Tag |
| --- | --- | --- |
| 0 – Fundação | Concluída | `v0.1-foundation` |
| 1 – Motor, gerador e solucionador | Concluída | `v0.2-engine` |
| 2 – Bots e simulação | Concluída | `v0.3-bots-sim` |
| 3 – Telas (um aparelho) | Concluída | `v0.4-local-ui` |
| 4 – Online | Concluída | `v0.5-online` |
| 5 – Mesa e PWA | Concluída | `v0.6-table-pwa` |
| 6 – Acabamento | Pronta para revisão | `v0.9-polish` |
| 7 – Calibração com partidas reais e publicação | Não iniciada | `v1.0` |

## Etapa 0 – Fundação

Deixa o projeto pronto para receber código.

- Confirmar a stack com o dono do projeto.
- `CLAUDE.md`, `README.md` (PT-BR) e `README.en.md` (inglês) revisados, `docs/` com regras, especificação técnica e este roadmap, `docs/mockups/` e `assets/logo/`.
- Monorepo pnpm com `packages/engine`, `content`, `protocol`, `kit`, `bots`, `sim` e `apps/web`, `apps/server`, ainda sem lógica de jogo.
- TypeScript estrito, ESLint, Prettier, Vitest, fast-check e Playwright configurados, com um teste mínimo em cada pacote.
- CI no GitHub Actions: instalação, lint, tipos, testes e build.
- A constante `appName` em i18n (o nome público ainda depende da consulta ao INPI).

**Pronto quando:** CI verde na `main`.

## Etapa 1 – Motor, gerador e solucionador

`packages/engine` e `packages/content`, sem I/O. Segue as seções 4 a 7 da especificação.

- Tipos, estado, eventos e `PublicView` com `viewFor`.
- Dados validados por schema: tema `party-cake` (10 suspeitos, 10 lugares), `DifficultyParams` dos 4 níveis e modelos de pista em PT-BR e EN, com formatadores de concordância.
- `candidates`, relógio derivado, `canShowTable` e `transition` com `move`, `investigate`, `interrogate` e `accuse` (acerto, erro, tempo esgotado, dupla repetida).
- Gerador determinístico por semente, com as regras de justiça, e solucionador (unicidade, custo mínimo, folga, `keyCardIds`).
- Dica e revelação derivadas do solucionador.
- Testes de unidade, propriedades e vazamento da seção 11 da especificação.

**Pronto quando:** testes de unidade, de propriedades e de vazamento passam; mesma semente e mesmas ações geram o mesmo resultado; todo mistério gerado é único e tem a folga do nível; nenhuma regra ou valor de nível fica fixo no código; o gerador produz um mistério por nível em menos de 50 ms (ou o limite fica registrado e justificado).

## Etapa 2 – Bots e simulação

`packages/bots` e `packages/sim`.

- Políticas `ideal`, `casual` e `aleatória`, só com `PublicView`. `suggest`.
- CLI de simulação em lote: 10.000 mistérios por nível × bot, com sementes fixas.
- Métricas: taxa de vitória, ações usadas, horário médio de resolução, causa do fim, taxa de rejeição do gerador, distribuição da folga, tempo de geração e diferença ideal − aleatório.
- Relatório em tabela e em JSON versionado. Primeira calibração, **só mexendo nos dados** (ações, ruído, custo da acusação, tamanho do mapa, mistura de pistas), nunca no código das regras.
- Uma versão reduzida da simulação roda na CI e quebra o build se um nível sair da meta.

**Pronto quando:** o relatório existe e foi apresentado ao dono do projeto, com recomendação para cada ponto aberto das regras (seção 11): decisão ou sorte (itens 1 e 3), acusação final com o relógio zerado (item 4) e dica de jogada (item 5). As taxas de vitória por nível ficam dentro das metas da seção 9 das regras ou a diferença está explicada. **Portão:** a Etapa 3 só começa depois da aprovação do dono.

## Etapa 3 – Telas (um aparelho)

`apps/web`, modo local, com bots completando a equipe.

- Telas fiéis aos mockups em `docs/mockups/`: novo mistério, vez de alguém, nova pista, interrogatório, caderno, acusação e revelação. Início e lobby (apelidos digitados, bots, nível).
- Relógio e barra de ações vindos dos dados do nível. Confirmação antes de cada ação. Itens bloqueados com motivo.
- i18n PT-BR e EN. Acessibilidade (`aria-live`, `prefers-reduced-motion`, estado sem depender de cor).

**Pronto quando:** uma partida completa no celular e no desktop, de ponta a ponta, sem erro; axe-core sem violações graves; testes E2E do fluxo básico (vitória, erro de acusação e tempo esgotado).

## Etapa 4 – Online

`packages/kit`, `apps/server`, `packages/protocol`.

- Salas com código, assentos, token do assento (a "senha") guardado como hash, limites e expiração.
- O servidor guarda a solução e envia só `PublicView`. Teste de vazamento nas mensagens.
- Desconexão: bot assume, aviso à equipe, volta do jogador no início do próprio turno.
- Opinar (sugestão única por jogador). `resync` na reconexão. O servidor valida toda ação.

**Pronto quando:** E2E com dois ou mais navegadores cobrindo criar sala, entrar, jogar até o fim, opinar, desconexão com bot assumindo e volta do jogador; teste de que ação de quem não é da vez é recusada; teste de que nenhuma mensagem contém a solução, a semente ou carta fechada.

## Etapa 5 – Mesa e PWA

- Modo mesa: mapa grande, pista mais recente, contagens e vez dos jogadores. Celulares como controle.
- `canShowTable(window.screen)`: a opção aparece só em tela grande; em celular, redireciona com aviso.
- Decidir como abrir o caderno completo na TV sem toque (regras, seção 11, item 9).
- PWA: instalável, funciona offline no modo local. Ícones a partir de `assets/logo/`.
- Teste em tablet, notebook, celular (inclusive com "site para computador") e no navegador de uma Smart TV real.

**Pronto quando:** partida completa em modo mesa (tela grande + celulares) e o modo local funcionando sem internet depois do primeiro acesso.

## Etapa 6 – Acabamento

- Revisão de acessibilidade, sons (originais), animações com `prefers-reduced-motion`, desempenho em aparelhos modestos, leitura fácil para 8 anos.
- `README.md` e `README.en.md` finais, com os dois idiomas equivalentes.

**Pronto quando:** checklist de acessibilidade e de desempenho cumprido; READMEs revisados.

**Feito (27/11/2026):**

- Sons sintetizados (Web Audio), ligados por padrão, com o botão "Som" em todas as telas, inclusive na mesa.
- Animações curtas em CSS, desligadas com `prefers-reduced-motion`.
- Revisão de acessibilidade com testes novos (`e2e/a11y.e2e.ts`): alvos de toque de 44 px em todas as telas (local, online e mesa), jogada inteira pelo teclado, reduzir movimento, telas em 320 px sem rolagem lateral e botão Som lembrado no aparelho. O axe-core agora espera as animações terminarem.
- Leitura fácil: pistas divididas em frases curtas e testes que limitam as frases (pistas, tema e interface, nos dois idiomas).
- Medições de desempenho com CPU 6× mais lenta e rede 3G, todas dentro das metas (`pnpm --filter @magnifier-cases/web perf`).
- Checklist em `docs/quality-checklist.md`.
- `README.md` e `README.en.md` finais.

**Ficou para a Etapa 7:** teste com leitor de tela real (TalkBack ou VoiceOver) e novo teste em aparelhos reais depois da publicação com HTTPS (instalação do app e sons).

## Etapa 7 – Calibração com partidas reais e publicação

- Partidas com pessoas (família e amigos) em cada nível e tamanho de equipe. Ajuste do bot casual e dos valores **nos dados**.
- Revisão jurídica (LGPD, ECA Digital) e consulta ao INPI pelo dono do projeto.
- Publicação na Cloudflare e tag `v1.0`.

**Pronto quando:** taxas de vitória reais próximas das faixas alvo e nenhum ponto "a testar" sem decisão registrada.

## Depois da v1

Só começam depois que a v1 estiver finalizada: papéis e habilidades ("Modo Equipe", regras seção 10), outros temas, casos em capítulos, enigmas de código como tipo de pista.

## Prompt sugerido para a primeira sessão

> Leia `CLAUDE.md`, `docs/magnifier-cases-rules.md`, `docs/magnifier-cases-tech-spec.md` e `docs/ROADMAP.md`. Faça a **Etapa 0 – Fundação**. Antes de criar qualquer arquivo, confirme comigo a stack proposta e liste dúvidas ou contradições que encontrar nos documentos. Trabalhe numa branch `develop/foundation`. Não comece a Etapa 1 sem eu aprovar.
