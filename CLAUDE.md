# CLAUDE.md

Instruções para o Claude Code neste repositório. Leia antes de qualquer tarefa. Segue o padrão do `village-flood` e do `senhorio-web`.

## O projeto

Casos da Lupa (`magnifier-cases`): jogo **cooperativo de dedução** para o navegador, de 2 a 6 assentos (pessoas ou bots). No tema da v1, o bolo da festa sumiu. Um culpado e um esconderijo ficam em segredo. A equipe gasta ações de 30 minutos (investigar um lugar, interrogar um suspeito, ir a outro lugar) até as 18h e acusa um suspeito e um lugar. Todas as pistas são verdadeiras. Modos: um aparelho, mesa (tela grande + celulares, só em tela grande) e online (sala por código; o aparelho guarda o token do assento). Roda em celular, tablet, desktop e Smart TV com navegador, como PWA. Todas as idades (8+).

- Regras: `docs/magnifier-cases-rules.md`.
- Especificação técnica: `docs/magnifier-cases-tech-spec.md`.
- Situação das etapas: `docs/ROADMAP.md`. Confira antes de começar e atualize ao começar ou fechar uma etapa.
- Mockups: `docs/mockups/` (leia `LEIA-ME.md`, que lista as diferenças entre os mockups e as regras).
- Logo e ícones: `assets/logo/`.
- Decisões: seção "Registro de decisões" no fim de `docs/magnifier-cases-rules.md`. Decisão nova entra no topo, com data e motivo.

Ordem de leitura: regras, especificação técnica, roadmap.

## Valores e regras ainda em teste

Todo valor marcado **(inicial)** e toda regra marcada **(a testar)** nos documentos é hipótese e **pode mudar**. Por isso:

- Nenhum desses valores fica fixo no código. Níveis (`DifficultyParams`), mistura de pistas, tema, modelos de texto e metas ficam em dados validados por schema (spec, seção 7).
- Antes de mudar um valor, rode a simulação e registre o resultado. Mudança de valor é mudança em dados, não em código.
- Se um documento estiver ambíguo ou duas regras se contradisserem, **não invente**: pergunte ao dono do projeto ou registre em "Pontos em aberto" (regras, seção 11).
- **Papéis e habilidades ficam para depois da v1.** Não escreva esse código nem reserve campos no estado.
- Outros temas, casos em capítulos e enigmas de código também ficam para depois da v1.

## Idioma

| Item | Idioma |
| --- | --- |
| Pastas, arquivos, nomes no código, ações, eventos, chaves do JSON, branches | Inglês |
| Documentos em `docs/`, comentários no código | PT-BR |
| Textos do jogo (interface e pistas) | PT-BR e inglês (i18n desde o início) |
| README | **Duas versões, obrigatórias:** `README.md` (PT-BR) e `README.en.md` (inglês), com link de uma para a outra e conteúdo equivalente. Mantenha as duas atualizadas a cada etapa. Mudou uma, mude a outra na mesma tarefa. |
| Mensagens de commit | PT-BR no imperativo ("Adiciona solucionador de mistérios") |

O nome público "Casos da Lupa" ainda depende de consulta ao INPI. Mantenha-o em uma única constante de i18n (`appName`) e nunca o espalhe pelo código. O nome de código é `magnifier-cases`.

Respostas ao dono do projeto em PT-BR.

## Arquitetura (resumo da spec)

Arquitetura limpa: dependências apontam para dentro (UI e servidor dependem do motor; o motor não depende de ninguém).

- `packages/engine`: motor de regras, gerador e solucionador em TypeScript puro. `transition(state, action, ctx)` é pura e devolve `{ ok, state, events, reason }`. Sem APIs de navegador ou da Cloudflare, sem I/O. Aleatoriedade só por PRNG com semente (nunca `Math.random`).
- `packages/content`: tema `party-cake`, modelos de pista, textos PT-BR e EN, formatadores de concordância.
- `packages/protocol`: tipos das mensagens cliente/servidor.
- `packages/kit`: salas, assentos, reconexão, limites e modo mesa, **agnóstico de jogo** (só conhece `GameDefinition`). Vem do `senhorio-web` e do `village-flood`.
- `packages/bots`: `botMove` e `suggest` (políticas ideal, casual e aleatória), funções puras, **só sobre `PublicView`**.
- `packages/sim`: simulação em lote (fora do `pnpm test`).
- `apps/web`: Svelte 5 + Vite + PWA. Só desenha a visão, envia ações e anima eventos. Nunca calcula regra.
- `apps/server`: Cloudflare Worker + um Durable Object por sala. Roda o mesmo motor, valida quem envia cada ação e **só envia `PublicView`**.
- Mapa em HTML/SVG, sem engine 3D.

## Comandos

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm e2e                                      # Playwright + axe-core (apps/web)
pnpm simulate                                 # simulação com bots (fora do pnpm test)
pnpm simulate:check                           # simulação reduzida da CI (quebra fora da meta)
pnpm --filter @magnifier-cases/web dev        # site em desenvolvimento
pnpm --filter @magnifier-cases/server dev     # servidor local da Cloudflare
```

Pacotes: `@magnifier-cases/engine`, `content`, `protocol`, `kit`, `bots`, `sim`, `web` e `server`. O ESLint garante a direção das dependências e a pureza do motor, do conteúdo, do kit e dos bots (sem `Math.random`, `Date.now`, `console` nem APIs de navegador).

No ambiente sem download de navegador, rode o E2E com `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` apontando para um Chromium já instalado.

## Regras de trabalho

- **Siga a documentação oficial** de cada tecnologia (Svelte 5, Vite, vite-plugin-pwa, Cloudflare Workers/Durable Objects, Vitest, Playwright). Evite soluções obsoletas ou depreciadas.
- **Confirme a stack** com o dono do projeto antes de iniciar a Etapa 0.
- **Testes obrigatórios.** Toda mudança no motor vem com teste (Vitest). Propriedades com fast-check (a solução sempre pertence aos candidatos, candidatos nunca aumentam, `transition` nunca muta a entrada, mesma semente gera o mesmo mistério, todo mistério gerado é único e tem a folga do nível, `viewFor` nunca vaza). Rode `pnpm lint`, `pnpm typecheck` e `pnpm test` antes de cada commit. Etapa com teste falhando não fecha.
- **Motor, gerador e bots primeiro.** Não comece a interface antes de a Etapa 2 (simulação) fechar e o dono aprovar. Os números abertos são calibrados ali, quando mudar custa pouco.
- **Branches:** a `main` é a versão publicada. Nunca commite direto na `main`. Toda tarefa nova começa numa branch criada a partir da `main` atualizada, com o nome `develop/nome-da-tarefa` (minúsculas e hífens, em inglês). Envie a branch para o GitHub, onde o CI roda os testes sem publicar. O dono do projeto testa e faz o merge; não faça merge nem abra pull request sem pedido.
- **Commits pequenos** por funcionalidade, em PT-BR no imperativo; uma tag por etapa (ver roadmap).
- **Tags e releases são criadas manualmente pelo dono do projeto.** Ao fechar uma etapa, avise e passe o passo a passo: nome da tag, commit (hash curto), título e descrição sugeridos, e o caminho no GitHub (Releases → Draft a new release).
- **Dois computadores:** o GitHub é a única fonte da verdade. No início da sessão, confira se a cópia local está atualizada (`git pull`); ao terminar, deixe tudo commitado e enviado.
- **Dependências:** só bibliotecas conhecidas e mantidas; ferramentas de teste e build como dependências de desenvolvimento. Peça aprovação antes de adicionar dependência de produção nova (inclusive o validador de schema).
- **Originalidade:** nome, arte, textos e sons são originais. Nada copiado de outros jogos, séries ou filmes (nem nomes, personagens, cenas ou formatos). As inspirações gerais servem só como ideias de mecânica e de clima.

## Segredo da solução (regra de ouro deste jogo)

- A solução, a semente, o `oracle` e o conteúdo das cartas fechadas **nunca** saem do motor/servidor. O cliente, a mesa e os bots só veem `PublicView`.
- Nenhum log, erro, evento de telemetria ou mensagem de teste pode conter esses dados. O teste de vazamento (spec, seção 11) é obrigatório e roda no motor e no servidor.
- No modo de um aparelho o segredo vive no próprio aparelho (jogo cooperativo); mesmo assim use `viewFor` para desenhar a tela, para manter um único caminho de código.

## Segurança e privacidade

- Nenhum segredo no repositório (chaves, tokens, senhas, IDs de conta da Cloudflare). Credenciais só no painel da Cloudflare, no `wrangler secret` ou nos segredos do GitHub Actions. Mantenha um `.env.example` só com valores fictícios.
- O servidor é a única fonte da verdade: valida `actorsOf` e toda ação antes de aplicar. O cliente nunca é confiável.
- Token de assento guardado apenas como hash (SHA-256). Limite de 40 mensagens por 10 s por conexão. Sala expira em 12 h.
- Princípio do menor privilégio em permissões, tokens e acessos.
- Jogo para todas as idades: sem conta, sem chat, nenhum texto digitado além do apelido (até 20 caracteres, nunca em log), sem compras, sem anúncios, sem rastreadores, sem analytics (LGPD). Nada de dado pessoal em logs.
- Exemplos e testes com dados fictícios (nomes sugeridos: Ana, Bruno, Carla, Diego, Elisa, Fábio; apelidos como "Raposa Curiosa").
- LGPD (dados de crianças) e ECA Digital: o dono do projeto revisa com um advogado antes da publicação. Não afirme conformidade jurídica; registre dúvidas.

## Qualidade e acessibilidade

- O estado de cada item não depende só de cor (riscado + tarja "descartado", tarja pontilhada com texto "um dos 2").
- Alvos de toque de pelo menos 44 px, contraste mínimo 4,5:1, foco visível, rótulos por lugar e suspeito, pistas e relógio em `aria-live`, `prefers-reduced-motion` respeitado. Linguagem de leitura fácil (8 anos).
- axe-core em todas as telas, nos temas claro e escuro.
- A tela da mesa só aparece quando `Math.min(screen.width, screen.height) >= 600` (tela física). Teste em aparelho real: celular (inclusive com "site para computador"), tablet e navegador de Smart TV antes de fechar a etapa de mesa.
