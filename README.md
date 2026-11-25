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

Etapa 0 (fundação) pronta para revisão: o monorepo, as ferramentas e o CI estão configurados, ainda sem lógica de jogo. Veja `docs/ROADMAP.md`.

## Como rodar

Pré-requisitos: Node 24 (veja `.nvmrc`) e pnpm 12.

```bash
pnpm install
pnpm test        # testes de unidade e de propriedades (Vitest + fast-check)
pnpm lint        # ESLint (com as regras de arquitetura) e Prettier
pnpm typecheck   # TypeScript estrito em todos os pacotes
pnpm build       # site (Vite) e Worker (wrangler, sem publicar)
pnpm e2e         # testes de ponta a ponta (Playwright + axe-core)
pnpm simulate    # simulação com bots (Etapa 2; fora do pnpm test)
pnpm --filter @magnifier-cases/web dev      # site em desenvolvimento
pnpm --filter @magnifier-cases/server dev   # servidor local da Cloudflare
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

Sem conta, sem chat, sem texto livre, sem anúncios e sem rastreadores. Só apelidos gerados por listas.

## Licença

A definir pelo dono do projeto.
