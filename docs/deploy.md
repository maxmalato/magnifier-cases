# Publicação na Cloudflare

Passo a passo para publicar o jogo na sua conta da Cloudflare. Um único Worker serve o site (PWA) e as salas online (um Durable Object por sala). Nenhuma credencial entra no repositório: o login fica só no seu computador ou nos segredos do GitHub.

Mesmo padrão do Enchente na Vila (`village-flood`).

## Antes de começar

- Conta na Cloudflare (o plano gratuito serve para começar). Os Durable Objects com SQLite, usados pelas salas, entram no plano gratuito. Confira os limites atuais em [Durable Objects: preços](https://developers.cloudflare.com/durable-objects/platform/pricing/) e [Workers: limites](https://developers.cloudflare.com/workers/platform/limits/).
- **Antes da publicação aberta ao público:** revisão jurídica (LGPD e ECA Digital) e consulta ao INPI sobre o nome (regras, seção 11, itens 8 e 11). Publicar para testes com família e amigos pode vir antes; a decisão é sua.
- Cópia local da `main` atualizada e dependências instaladas:

```bash
git checkout main
```

```bash
git pull
```

```bash
pnpm install
```

## Publicação automática pelo GitHub (recomendada)

O workflow `Deploy` (`.github/workflows/deploy.yml`) publica na Cloudflare **depois de cada CI verde na `main`**, exatamente o commit que passou nos testes. Enquanto os segredos abaixo não existirem, a publicação é pulada com um aviso, sem erro.

Configuração (uma vez):

1. Na Cloudflare: **My Profile → API Tokens → Create Token**, modelo **"Edit Cloudflare Workers"**, só para a sua conta e, de preferência, com validade. Copie o token uma vez.
2. O **Account ID** fica em **Workers e Pages**, na lateral.
3. No GitHub: **Settings → Environments → New environment** com o nome `production`. Em **Deployment branches**, deixe só a `main`. Em **Environment secrets**, crie `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` (sempre como secrets, nunca como "variables").

Como acompanhar: aba **Actions** do repositório → workflow **Deploy**. Se o token vazar ou vencer, gere outro na Cloudflare (**Roll**) e troque o segredo no GitHub.

## Publicar à mão (primeira vez ou emergência)

Entrar na conta (uma vez por computador; o navegador abre a página da Cloudflare para autorizar o Wrangler, e o token fica só no seu computador):

```bash
pnpm --filter @magnifier-cases/server exec wrangler login
```

Publicar (gera o site e publica o Worker com os arquivos do site):

```bash
pnpm cf:deploy
```

Na primeira vez, o Wrangler pode pedir o subdomínio `workers.dev` da conta. No fim, ele mostra o endereço, no formato `https://magnifier-cases.SEU-SUBDOMINIO.workers.dev`.

Voltar à versão anterior, se algo der errado:

```bash
pnpm --filter @magnifier-cases/server exec wrangler rollback
```

## Conferir depois de publicar

1. Abra o endereço no computador e no celular. Com HTTPS, o celular oferece "Instalar app" ou "Adicionar à tela inicial".
2. Crie uma sala online e entre por outro aparelho (código, link ou QR code).
3. Abra a mesa na TV e jogue um turno pelo celular. Teste o botão "Encerrar partida" pelo celular de quem comanda a sala.
4. No celular com o app instalado, ligue o modo avião e confira que "Jogar neste aparelho" continua funcionando.
5. No painel da Cloudflare (Workers e Pages → magnifier-cases → Configurações), confira que os registros ("Workers Logs" ou "Observability") estão desligados. O projeto já publica com `observability` desligado, para não guardar dados de quem joga.
6. Repita o roteiro de `docs/device-test.md` com HTTPS (o teste da Etapa 5 foi pela rede local).

## Domínio próprio (opcional)

Se você tiver um domínio na Cloudflare: Workers e Pages → magnifier-cases → Configurações → Domínios e rotas → Adicionar → Domínio personalizado. O endereço `workers.dev` continua funcionando.

O endereço é `NOME-DO-WORKER.SUBDOMINIO-DA-CONTA.workers.dev`. Use um subdomínio de conta neutro (o seu "estúdio", não o nome de um jogo): assim o Enchente na Vila e o Casos da Lupa convivem na mesma conta. O nome do Worker (`magnifier-cases`) é o nome de código, não o nome público, que ainda depende do INPI.

## O que o projeto já cuida

- Cabeçalhos de segurança em todas as páginas (`apps/web/cloudflare/_headers`): política de conteúdo (CSP) que só aceita arquivos e conexões do próprio site, sem incorporação em outros sites, sem envio de endereço de origem (`Referrer-Policy: no-referrer`) e sem acesso a câmera, microfone ou localização. Um teste de ponta a ponta confere os cabeçalhos no site servido pelo Worker e joga sem nenhuma violação da CSP.
- Service worker sempre conferido a cada visita (`Cache-Control: no-cache`); arquivos com hash no nome ficam em cache por 1 ano.
- Sem telemetria do Wrangler, sem registros de acesso e sem endereços de prévia (`apps/server/wrangler.jsonc`).
- A solução, a semente e as cartas fechadas nunca saem do servidor (teste de vazamento no motor e no servidor).
- Salas expiram depois de 12 h sem atividade; tokens de assento guardados só como hash; limites de 10 salas criadas e 60 consultas por minuto por endereço e 40 mensagens por 10 s por conexão.
- Nenhum dado pessoal em registros: o apelido (até 20 caracteres) nunca vai para log e some com a sala.
