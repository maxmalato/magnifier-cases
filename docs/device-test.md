# Teste em aparelho real (Etapa 5)

O roadmap pede este teste antes de fechar a etapa da mesa. Os testes automáticos simulam telas, mas não substituem o aparelho de verdade (toque, tamanho real da letra, controle remoto, rede).

## Como subir

No computador, na mesma rede Wi-Fi dos aparelhos, compile o site:

```bash
pnpm --filter @magnifier-cases/web build
```

Depois suba o servidor aceitando conexões da rede:

```bash
pnpm --filter @magnifier-cases/server dev -- --ip 0.0.0.0
```

Em todos os aparelhos (TV, tablet e celulares), abra `http://IP-DO-COMPUTADOR:8787`. O IP aparece no comando `ipconfig`, como "Endereço IPv4". O Windows pode pedir para liberar o acesso na rede.

Observação: o PWA (instalar e jogar sem internet) só funciona em `localhost` ou em `https`. Pela rede local, sem `https`, o resto pode ser testado; a instalação fica para quando o jogo estiver publicado (Etapa 7) ou num teste no próprio computador.

## O que conferir

| Aparelho | O que fazer | O que esperar |
| --- | --- | --- |
| Celular em pé | Abrir a tela inicial | Sem o botão "Abrir a mesa". Jogar uma partida no modo de um aparelho com um bot. |
| Celular deitado | Abrir a tela inicial | Também sem o botão da mesa (vale o menor lado da tela física). |
| Celular com "site para computador" ligado | Abrir a tela inicial | Sem o botão da mesa (a regra usa a tela física, não a janela). |
| Celular | Abrir o endereço com `?mesa` no fim | Aviso curto: "A tela da mesa só abre em telas grandes". |
| Tablet | Abrir a tela inicial | Com o botão "Abrir a mesa". Abrir a mesa e entrar com dois celulares. |
| Notebook | Abrir a mesa | Código grande; os celulares entram pelo código; a partida aparece na tela grande. |
| Celular | Apontar a câmera para o QR code da mesa (ou do lobby online) | Abre o jogo já na sala, pedindo só o apelido. Testar com a TV a uns 2 m. |
| Smart TV (navegador) | Abrir a mesa | Letras legíveis do sofá; caderno compacto visível sem tocar em nada; dá para ler a pista mais recente. Anotar a marca, o modelo e o navegador da TV. |
| Celulares na mesa | Jogar uma partida até o fim | Quem tem a vez joga no celular; os outros sugerem; a mesa mostra a sugestão, a pista e a vez. |
| Celular na mesa | Fechar o navegador no meio da vez | A mesa avisa "desconectou" e, depois de uns 20 s, "o bot assumiu". Voltar pelo botão "Voltar para a sala". |

Anote o que estranhar (texto pequeno, botão difícil de tocar, algo que não aparece) e mande para a próxima sessão.
