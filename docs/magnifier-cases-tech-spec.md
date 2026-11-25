# Casos da Lupa (`magnifier-cases`): especificação técnica para o Claude Code

Pré-requisito: ler `docs/magnifier-cases-rules.md`. Este documento é a base para implementar a v1. Nomes de código em inglês. A stack é uma proposta que reaproveita a do Enchente na Vila e a do Senhorio Web; confirmar antes de iniciar. Siga as documentações oficiais de cada tecnologia, arquitetura limpa e segurança por padrão.

Valores marcados **(inicial)** e regras marcadas **(a testar)** no documento de regras são hipóteses. Seus parâmetros ficam em dados de configuração (seção 6), nunca fixos no código.

## 1. Objetivos e fora de escopo (v1)

Objetivos: jogo cooperativo de dedução para 2 a 6 assentos (pessoas ou bots), nos modos um aparelho, mesa e online, como PWA para celular, tablet, desktop e navegador de Smart TV. Um tema (o bolo da festa), 10 suspeitos, 10 lugares, 4 níveis, gerador de mistérios com solucionador, bots (ideal, casual, aleatório) e simulação em lote.

Fora de escopo da v1: contas, ranking, chat, texto livre (exceto o apelido, até 20 caracteres), papéis e habilidades (seção 12), outros temas, casos em capítulos, enigmas de código, pistas binárias (que relacionam culpado e lugar), cartas com mais de um efeito.

## 2. Stack proposta

TypeScript, Svelte 5, Vite, `vite-plugin-pwa` (Workbox), pnpm monorepo, Vitest, fast-check, Playwright, axe-core, Cloudflare Workers com um Durable Object por sala (armazenamento SQLite, WebSocket). Validador de schema para os dados (por exemplo Zod; confirmar). Sem engine 3D: o mapa é HTML/SVG.

## 3. Estrutura sugerida

```
apps/web            Svelte 5 PWA (UI, modos local, mesa e online)
apps/server         Worker + Durable Object (sala)
packages/engine     regras puras, gerador e solucionador (sem I/O)
packages/content    tema "party-cake": elenco, modelos de pista, textos PT-BR e EN, formatadores
packages/protocol   tipos de mensagem cliente/servidor
packages/kit        salas, assentos, reconexão, limites, modo mesa (agnóstico de jogo)
packages/bots       botMove, suggest e as políticas ideal, casual e aleatória
packages/sim        CLI de simulação em lote e relatórios
```

`packages/kit` vem do `senhorio-web` e do `village-flood` (ciclo de vida da sala, token de assento com hash, limite de mensagens, expiração, modo mesa, máquina de desconexão). Ele conhece o jogo só por uma interface:

```ts
interface GameDefinition<State, Action, Event, Config, View> {
  id: string
  newGame(config: Config, seats: SeatId[], seed: number): State
  transition(state: State, action: Action, ctx: Ctx): Result<State, Event>
  actorsOf(state: State): SeatId[]
  viewFor(state: State, seat: SeatId | 'table'): View   // NÃO é identidade neste jogo
  botMove(view: View, seat: SeatId): Action             // só a visão pública
}
```

Diferença importante em relação ao `village-flood`: aqui existe informação escondida. `viewFor` remove a solução, a semente e o conteúdo das cartas fechadas. O servidor só envia o resultado de `viewFor`. O bot recebe a visão pública, nunca o estado completo.

## 4. Domínio (`packages/engine`)

```ts
type LevelId = 'apprentice' | 'investigator' | 'expert' | 'legend'
type SuspectId = string
type PlaceId = string
type CardId = string

type ClueEffect =
  | { kind: 'exclude-suspects'; ids: SuspectId[] }
  | { kind: 'exclude-places'; ids: PlaceId[] }
  | { kind: 'only-suspects'; ids: SuspectId[] }   // grupo com 2 ou mais
  | { kind: 'only-places'; ids: PlaceId[] }       // grupo com 2 ou mais
  | { kind: 'none' }                              // ruído

type CardSource = { type: 'place'; id: PlaceId } | { type: 'suspect'; id: SuspectId }

interface ClueCard {
  id: CardId
  source: CardSource
  effect: ClueEffect
  textKey: string                    // chave i18n do modelo
  slots: Record<string, string[]>    // ids que preenchem o modelo
  opened: boolean
  openedAtAction?: number
  openedBySeat?: SeatId
}

interface Solution { culpritId: SuspectId; hideoutId: PlaceId }   // SECRETO

interface GameState {
  level: LevelId
  params: DifficultyParams            // cópia dos dados do nível no início da partida
  seed: number                        // SECRETO (a semente revela a solução)
  cast: { suspects: SuspectId[]; places: PlaceId[] }
  solution: Solution                  // SECRETO
  cards: ClueCard[]                   // texto e efeito SECRETOS enquanto !opened
  oracle: { minCost: number; keyCardIds: CardId[]; slack: number }   // SECRETO
  teamAt: PlaceId | 'square'
  actionsLeft: number
  seats: SeatId[]; activeSeat: SeatId; turn: number
  wrongAccusations: { suspectId: SuspectId; placeId: PlaceId; atAction: number; seat: SeatId }[]
  phase: 'playing' | 'won' | 'timeout'
}
```

Ações (união discriminada): `move { placeId }`, `investigate`, `interrogate { suspectId }`, `accuse { suspectId, placeId }`.

Eventos (UI, som e log): `moved`, `clue-found`, `testimony-given`, `candidates-changed`, `accused-wrong`, `clock-advanced`, `turn-started`, `bot-took-over`, `player-returned`, `won`, `timed-out`, `revealed`.

Contrato: `transition(state, action, ctx)` é pura e devolve `{ ok, state, events, reason }`. Nunca muta a entrada. `ctx` traz o assento que age. Toda validação acontece aqui e no servidor.

Visão pública:

```ts
interface PublicView {
  level: LevelId
  params: PublicDifficultyParams       // todos os campos de DifficultyParams (decisão de 25/11/2026)
  cast: { suspects: SuspectId[]; places: PlaceId[] }
  teamAt: PlaceId | 'square'
  actionsLeft: number; clock: string   // "15:30", derivado
  seats: SeatId[]; activeSeat: SeatId
  opened: { id: CardId; source: CardSource; effect: ClueEffect; textKey: string; slots: Record<string, string[]> }[]
  unopened: { source: CardSource }[]   // só as origens, sem conteúdo
  candidates: { suspects: SuspectId[]; places: PlaceId[] }
  notebook: { suspects: NotebookEntry[]; places: NotebookEntry[] }
  wrongAccusations: { suspectId: SuspectId; placeId: PlaceId }[]
  phase: 'playing' | 'won' | 'timeout'
  reveal?: { solution: Solution; keyCardIds: CardId[]; hint: HintData }   // só quando phase !== 'playing'
}
interface NotebookEntry { id: string; status: 'open' | 'eliminated'; byCardIds: CardId[]; inGroupOf: CardId[] }
```

## 5. Regras como funções

- `candidates(state): { suspects: Set; places: Set }`: parte de todos os suspeitos e lugares do elenco e aplica os efeitos das cartas **abertas**. `exclude-*` remove o grupo; `only-*` mantém só o grupo; `none` não faz nada. É a fonte do caderno (derivado, nunca guardado).
- `cardCost(card): 1 | 2`: 1 para carta de suspeito (interrogar); 2 para carta de lugar (ir + investigar). Usado só pelo solucionador e pelas métricas. No jogo, `move` e `investigate` cobram 1 cada.
- `clock(level params, actionsLeft)`: `início = deadline − actionsTotal × actionMinutes`; horário atual = `deadline − actionsLeft × actionMinutes`. Em dados ficam `deadline` (`18:00`), `actionMinutes` (30) e `actionsTotal`.
- `canShowTable(screen: { width: number; height: number }): boolean`: `Math.min(width, height) >= 600`. A UI usa `window.screen`, não a janela. Função pura, com tabela de testes.
- `transition`:
  - `move`: lugar válido e diferente do atual; `actionsLeft −= 1`; `teamAt = placeId`.
  - `investigate`: exige `teamAt !== 'square'` e carta do lugar fechada; abre a carta; `actionsLeft −= 1`.
  - `interrogate`: carta do suspeito fechada; abre; `actionsLeft −= 1`.
  - `accuse`: só se `actionsLeft ≥ 1` e a dupla estiver entre os candidatos e ainda não acusada. Acerto: `phase = 'won'`, sem custo. Erro: registra a acusação, `actionsLeft −= wrongAccusationCost`.
  - Depois de qualquer ação: se `actionsLeft ≤ 0` e `phase === 'playing'`, `phase = 'timeout'`. Se a fase mudou para `won` ou `timeout`, emitir `revealed`.
  - Passa a vez ao próximo assento (ordem fixa) quando a fase continua `playing`.
- `hint(state): HintData`: calculada a partir de `oracle.keyCardIds` ("as pistas N e M juntas já deixavam um único resultado"). Nunca uma dica genérica.

## 6. Gerador e solucionador de mistérios

Fica em `packages/engine` (`generateMystery`, `solve`). Determinístico a partir da semente (PRNG serializável, por exemplo mulberry32). Nunca usar `Math.random` no motor.

```ts
generateMystery(params: DifficultyParams, theme: ThemePack, seed: number): Mystery
// Mystery = { cast, solution, cards, oracle }
```

Passos:

1. Sortear N suspeitos e M lugares do elenco; sortear culpado e esconderijo.
2. Para cada carta (um lugar ou um suspeito), sortear o tipo de efeito conforme a mistura do nível (`noiseRate`, `includeRate`, tamanho do grupo de exclusão) e escolher um modelo de texto compatível.
3. Preencher o efeito **verdadeiro** para a solução: `exclude-*` com itens que não são a solução, `only-*` com grupos que contêm a solução, tamanho ≥ 2.
4. Aplicar as regras de justiça: sem carta que elimina a própria origem; sem pista de tamanho 1; sem padrão de formato que revele a solução.
5. Rodar o solucionador (abaixo). Aceitar se a solução é única e `actionsTotal − minCost ≥ minSlack`. Caso contrário, tentar de novo com o próximo estado do PRNG, até `maxAttempts` (inicial: 500). Se esgotar, lançar erro tipado (`MysteryGenerationError`) que os testes e a simulação contam.

Solucionador (`solve(cards, cast)`):

- Cada carta vira duas máscaras de bits (suspeitos e lugares) do que ela **mantém**. `none` mantém tudo.
- Unicidade: o AND de todas as máscaras deixa 1 suspeito e 1 lugar, que são os da solução.
- Custo mínimo: percorrer subconjuntos de cartas com custo ≤ `actionsTotal`, por busca em profundidade com poda por custo, e guardar o menor custo cujo AND deixa só a solução. Com N + M ≤ 20 a enumeração completa (2^20) também cabe, em milissegundos. Medir os dois e escolher o mais simples que atenda a 50 ms por mistério.
- Saída: `{ unique, minCost, keyCardIds, slack }`. Os `keyCardIds` alimentam a revelação e a dica.

Verificação: um teste compara o solucionador com a enumeração bruta em mistérios pequenos.

## 7. Dados de configuração

Tudo em dados validados por schema (JSON ou TS tipado com schema), não no código:

```ts
interface DifficultyParams {
  id: LevelId
  suspectCount: number; placeCount: number
  actionsTotal: number; actionMinutes: number; deadline: string   // '18:00'
  wrongAccusationCost: number
  noiseRate: number                                  // 0..1
  excludeGroupSize: { min: number; max: number }
  includeRate: number                                // taxa de cartas only-*
  includeGroupSize: { min: number; max: number }     // inicial: 2..3
  minSlack: number
  suggestEnabled: boolean
}

interface ThemePack {
  id: 'party-cake'
  startPlaceId: 'square'
  suspects: { id: SuspectId; nameKey: string; gender: 'm' | 'f' }[]
  places: { id: PlaceId; nameKey: string; gender: 'm' | 'f' }[]
  templates: ClueTemplate[]
}
interface ClueTemplate {
  id: string
  effectKind: ClueEffect['kind']
  sourceType: 'place' | 'suspect' | 'both'
  textKey: string            // chave i18n, com marcadores {suspects}, {places}
  weight: number
}
```

Os valores iniciais da tabela da seção 7 do documento de regras entram em `DifficultyParams`. O tema tem dezenas de modelos de texto por tipo de efeito (PT-BR e EN), em `packages/content`.

**Formatadores de texto:** a concordância não pode ficar nas frases. O pacote `content` oferece formatadores para cada item (`def` = "a Padaria", `of` = "da Padaria", `in` = "na Padaria", `to` = "à Padaria") e para listas ("A, B e C" / "A, B and C"), a partir de `gender` e dos dados. Teste com todos os itens do elenco nos dois idiomas.

`CharacterParams` (papéis) **não** existe na v1 (seção 12).

## 8. Protocolo e salas

- Reaproveitar o protocolo do `kit`: código de sala de 6 caracteres, token de assento (a "senha" do assento) guardado como hash SHA-256, limite de 40 mensagens por 10 s, expiração de 12 h, assento de mesa.
- Mensagens: `action`, `state` (sempre o resultado de `viewFor`), `resync` (visão completa na reconexão), `suggest` (opinar: efêmera, fora do estado, uma por jogador, limpa quando a ação é resolvida, com limite de frequência) e eventos de desconexão.
- O servidor guarda o estado completo (com a solução) e **só envia `PublicView`**. Nenhuma mensagem, log ou erro pode conter a solução, a semente, o `oracle` ou o conteúdo de cartas fechadas.
- A semente é gerada no servidor (fonte de aleatoriedade do ambiente). No modo local, no aparelho.
- Sem contas. Apelido digitado, até 20 caracteres e único na sala (como no Enchente na Vila); nunca em log, apagado com a sala. Nada de dado pessoal em logs.

## 9. Desconexão e bots

Máquina de estados por assento humano, do `kit`: `connected` → `away` → `bot-controlled` (após cerca de 20 s na vez dele, ou ao chegar o turno dele) → `returning` → `connected` (no início do turno dele). Eventos `bot-took-over` e `player-returned` alimentam o aviso.

`packages/bots`, funções puras sobre `PublicView`:

- `botMove(view, seat, skill)`: `skill` é `'ideal' | 'casual' | 'random'`. Determinística para o mesmo estado e semente de decisão.
- **Ideal:** mantém o conjunto de candidatos. Escolhe a carta com maior ganho esperado de eliminação por ação gasta (suspeito custa 1, lugar custa 2), usando as médias da mistura do nível (`DifficultyParams`) como informação a priori, nunca o conteúdo de cartas fechadas. Acusa quando resta um candidato, ou quando a chance de acertar e o relógio compensam o custo do erro. A política exata é definida e documentada na Etapa 2.
- **Casual:** o ideal com defeitos configuráveis (`mistakeRate`, `ignorePartialRate`, `earlyAccuseRate`), calibrados com partidas reais.
- **Aleatório:** linha de base. Abre cartas ao acaso e acusa quando restam poucos candidatos.
- `suggest(view, seat)`: usa a política ideal, exibida como dica quando `suggestEnabled`.
- O bot roda no servidor (online) ou no cliente (local), sempre a mesma função pura.

## 10. UI (Svelte 5)

Telas (alinhadas aos mockups em `docs/mockups/`): início (criar sala, entrar, jogar local), lobby (apelidos, bots, nível), novo mistério (briefing), vez de alguém (escolher ação), nova pista, interrogatório, caderno, acusação, revelação, mesa (TV ou tablet).

- Componentes: `ClockPill`, `ActionSegments` (barra com `actionsTotal` segmentos, não 8 fixos), `PlaceGrid` (grade do mapa, 3×2, 3×3 ou 4×3), `Notebook`, `ClueCard`, `SuggestionMarker`, `OptionList`.
- O texto da regra e os números do relógio vêm de `DifficultyParams`. Nenhum valor de nível fica escrito na tela.
- Alvos de toque de pelo menos 44 px; botões principais de 56 px. Itens bloqueados mostram o motivo.
- Toda ação que gasta tempo pede confirmação.
- A tela de resultado é local: "OK" só fecha a sobreposição neste aparelho. O caderno sempre tem a pista.
- Mesa: `canShowTable(window.screen)` decide se a opção aparece. Em celular, a rota da mesa redireciona para a tela do jogador com um aviso curto. É uma barreira de interface.
- Anúncio de pistas e relógio em `aria-live`. `prefers-reduced-motion` respeitado. PT-BR e EN.

**Mockups:** telas de referência em `docs/mockups/` e o código-fonte em `docs/mockups/source/`. Paleta: fundo `#2B2230`, painéis `#3A2E42`, creme `#F6EFE0`, âmbar `#F2B84B`, tinta `#2B2230`, texto secundário `#CDBFD2` e `#E7DDEA`, contorno `#8A7790`, verde de apoio `#8BD3A0`; fontes Fredoka (títulos) e Nunito (texto). Os mockups usam um caso ilustrativo que **não** segue todas as regras de justiça; veja `docs/mockups/LEIA-ME.md` para as diferenças.

## 11. Testes

- **Unidade:** `candidates` para cada tipo de efeito (inclusive grupos que se cruzam); `cardCost`; derivação do relógio por nível (13:00, 14:00, 14:00, 14:30); custos e bloqueios de cada ação; acusação (acerto sem custo, erro com custo, erro que estoura o relógio vira `timeout`, dupla repetida bloqueada, item eliminado bloqueado); `canShowTable` (tabela: 390×844 celular em pé e deitado = não; 768×1024 tablet = sim; 1280×720 notebook = sim; dobrável aberto); formatadores de texto nos dois idiomas; solucionador contra enumeração bruta.
- **Propriedades (fast-check):** a solução **sempre** pertence aos candidatos (toda pista é verdadeira); candidatos nunca aumentam; `transition` nunca muta a entrada; mesma semente e mesmas ações geram o mesmo resultado; nenhuma carta elimina a própria origem; nenhum `only-*` com grupo de tamanho 1; todo mistério gerado é único e tem `slack ≥ minSlack`; `viewFor` nunca vaza (ver abaixo).
- **Vazamento:** construir um estado com marcadores únicos (strings sentinela) no texto de cartas fechadas, na solução, na semente e no `oracle`, serializar `viewFor` para cada assento e para a mesa, e garantir que nenhum marcador aparece. O mesmo teste roda no servidor sobre as mensagens enviadas.
- **Simulação (`packages/sim`, fora do `pnpm test`):** 10.000 mistérios por nível × bot (ideal, casual, aleatório). Métricas: taxa de vitória, ações usadas, horário médio de resolução, causa do fim, taxa de rejeição do gerador, distribuição da folga, tempo de geração, e diferença ideal − aleatório (meta ≥ 25 pontos). Relatório em tabela e em JSON versionado. Uma versão reduzida roda na CI e **quebra o build** se um nível sair da meta.
- **E2E (Playwright):** criar sala, entrar, jogar até vencer, errar uma acusação, tempo esgotado, opinar, desconexão com bot assumindo e volta, mesa (em viewport de tablet; em celular a opção não aparece), um aparelho.
- **Acessibilidade (axe-core):** todas as telas, nos temas claro e escuro.
- **Aparelhos reais:** celular, tablet e navegador de Smart TV antes de fechar a etapa de mesa, inclusive celular com "site para computador" ligado.

## 12. Pontos de extensão (depois da v1)

- **Papéis e habilidades ("Modo Equipe"):** só depois da v1. Quando entrar: `CharacterParams` em dados, um registro de habilidades que o `transition` consulta por assento (`ctx.seat`), opção ligável no lobby, metas de vitória próprias. Na v1 não escrever esse código nem campos reservados no estado.
- **Outros temas:** novo `ThemePack` (elenco, modelos de texto, arte) sem mudar o motor. Só depois da v1.
- **Casos em capítulos** e **enigmas de código** como tipo de pista (inspiração geral de séries de mistério): ideias, sem compromisso.
- **Pistas que apontam onde procurar** (`lead`): entram se a simulação mostrar que o jogo depende demais da sorte (regras, seção 11, item 1).

## 13. Segurança e privacidade

- Princípio do menor privilégio. Validar toda ação no servidor. O servidor é a única fonte da verdade e a única que conhece a solução no modo online.
- Token de assento só como hash. Limites de frequência por conexão. Sala expira em 12 h.
- Sem dados pessoais além do apelido digitado (nunca em log, apagado com a sala) e sem credenciais no repositório (variáveis de ambiente e `wrangler secret`; `.env.example` só com valores fictícios).
- Nenhum log com a solução, a semente ou o conteúdo de cartas fechadas. Erros devolvidos ao cliente não citam esses dados.
- Sem rastreadores, anúncios ou compras. LGPD e ECA Digital: revisão com advogado antes da publicação.
- Em exemplos e testes, usar apenas dados fictícios (apelidos como "Raposa Curiosa"; nomes de teste Ana, Bruno, Carla, Diego, Elisa, Fábio).

## 14. Marcos sugeridos

Veja `docs/ROADMAP.md`, que detalha as etapas, o critério de "pronto" de cada uma e a ordem recomendada (motor, gerador e simulação antes das telas).
