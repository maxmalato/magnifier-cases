# Casos da Lupa

[English version](README.en.md)

Jogo cooperativo de dedução para o navegador, para 2 a 6 jogadores (pessoas ou bots), de 20 a 30 minutos, para todas as idades (8+). No primeiro caso, o bolo da festa sumiu: a equipe investiga lugares, interroga suspeitos e acusa quem levou o bolo e onde ele está, antes das 18h. Todas as pistas são verdadeiras.

Roda em celular, tablet, desktop e Smart TV com navegador, como PWA.

## Modos

- **Um aparelho:** todos em volta de um tablet ou notebook.
- **Mesa:** uma tela grande mostra o caderno e os celulares são o controle. Só em telas grandes (tablet, notebook, TV).
- **Online:** sala com código, cada pessoa no seu aparelho.

## Níveis

Aprendiz, Investigador, Perito e Lenda. O mapa e o relógio mudam com o nível.

## Situação

Etapa 5 (mesa e PWA) pronta para revisão: os três modos funcionam (um aparelho, online e mesa, com a tela grande mostrando o jogo e os celulares como controle, que entram pelo código ou pelo QR code), e o jogo pode ser instalado e jogado sem internet no modo de um aparelho. Falta o teste em aparelho real. Veja `docs/ROADMAP.md`.

## Como rodar

Pré-requisitos: Node 24 (veja `.nvmrc`) e pnpm 12.

```bash
pnpm install
pnpm test        # testes de unidade e de propriedades (Vitest + fast-check)
pnpm lint        # ESLint (com as regras de arquitetura) e Prettier
pnpm typecheck   # TypeScript estrito em todos os pacotes
pnpm build       # site (Vite) e Worker (wrangler, sem publicar)
pnpm e2e         # testes de ponta a ponta (Playwright + axe-core)
pnpm simulate    # simulação com bots: 10.000 mistérios por nível e bot (fora do pnpm test)
pnpm simulate:check  # simulação reduzida da CI: quebra se um nível sair da meta
pnpm --filter @magnifier-cases/web dev      # site em desenvolvimento
pnpm dev:online # compila o site e sobe o servidor local da Cloudflare: abra http://localhost:8787 (online e um aparelho)
```

## Estrutura

| Pasta               | Conteúdo                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| `packages/engine`   | Motor de regras, gerador e solucionador (puro, sem I/O)                |
| `packages/content`  | Tema, modelos de pista, textos PT-BR e EN e o nome público (`appName`) |
| `packages/protocol` | Mensagens entre o aparelho e o servidor                                |
| `packages/kit`      | Salas, assentos, reconexão, limites e modo mesa (agnóstico de jogo)    |
| `packages/bots`     | Bots ideal, casual e aleatório (só com a visão pública)                |
| `packages/sim`      | Simulação em lote                                                      |
| `apps/web`          | Interface (Svelte 5 + Vite)                                            |
| `apps/server`       | Cloudflare Worker + Durable Object por sala                            |

As dependências apontam para dentro: a interface e o servidor dependem do motor, e o motor não depende de ninguém. O ESLint garante isso.

## Documentação

- [Regras](docs/magnifier-cases-rules.md)
- [Especificação técnica](docs/magnifier-cases-tech-spec.md)
- [Roadmap](docs/ROADMAP.md)
- [Instruções para o Claude Code](CLAUDE.md)

## Privacidade

Sem conta, sem chat, sem anúncios e sem rastreadores. O único texto digitado é o apelido (até 20 caracteres), que nunca vai para registros e some quando a sala expira.

## Licença

A definir pelo dono do projeto.
