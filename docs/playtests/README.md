# Partidas de teste com pessoas (Etapa 7)

Roteiro para as partidas com família e amigos. O objetivo é saber se as taxas de vitória reais ficam perto das faixas-alvo e decidir os pontos "a testar" das regras. O jogo não coleta nada sozinho (sem analytics, LGPD): os resultados são anotados à mão, **sem nome nem dado pessoal**. Use só apelidos ou "Jogador 1, 2…". Para crianças, anote no máximo "criança" ou "adulto".

Mesmo formato do roteiro do Enchente na Vila.

## Faixas-alvo de vitória

O bot casual representa uma equipe real (regras, seção 9). As faixas dele são a meta para as partidas com pessoas:

| Nível | Ações | Acusação errada custa | Vitória alvo |
| --- | --- | --- | --- |
| Aprendiz | 11 | 30 min | 85 a 95% |
| Investigador | 10 | 30 min | 65 a 80% |
| Perito | 12 | 1 h | 45 a 60% |
| Lenda | 10 | 1 h 30 | 25 a 40% |

Com poucas partidas, a taxa varia muito. Como referência, 10 partidas por nível já mostram se ele está muito fora da faixa. Na simulação, o bot casual ficou **acima** da faixa no Investigador, no Perito e na Lenda (o jogo pode estar fácil demais para uma equipe real, ou o bot casual pode estar bom demais): as partidas com pessoas decidem qual dos dois.

## Plano sugerido

1. **Primeira partida de cada grupo no Aprendiz**, com a tela "novo mistério" lida em voz alta. Observe sem explicar: onde as pessoas travam?
2. Depois, Investigador, Perito e Lenda, alternando o tamanho da equipe (2, 3, 4 e 6 assentos; bots podem completar).
3. Misture os modos: um aparelho, online e mesa (TV + celulares).
4. Pelo menos uma partida com uma criança de 8 a 10 anos lendo as pistas sozinha.

## O que anotar em cada partida

Copie a tabela para um arquivo `docs/playtests/AAAA-MM-DD.md` (um por dia de teste) ou mande para mim do jeito que for mais fácil.

| # | Modo | Nível | Assentos (pessoas + bots) | Crianças | Resultado | Horário final | Ações que sobraram | Pistas abertas | Acusações erradas | Acusaram "dupla por dupla"? | Duração |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | um aparelho | Aprendiz | 2 + 1 | 1 | resolvido | 16:30 | 3 | 5 | 0 | não | 18 min |

- **Resultado:** resolvido, tempo esgotado ou encerrado (botão "Encerrar partida").
- **Horário final, ações que sobraram e pistas abertas** aparecem na tela de revelação quando a equipe resolve.
- **"Dupla por dupla":** a equipe acusou várias duplas seguidas, sem certeza, até acertar? (ponto em aberto 12)

## Perguntas rápidas depois de cada partida

- Foi fácil, justo ou difícil demais?
- Alguma pista ficou difícil de entender? Qual? (as pistas agora têm duas frases curtas)
- No Aprendiz: a "dica" ajudou ou atrapalhou?
- A confirmação antes de cada ação incomodou?
- No online: as sugestões ajudaram? O limite de 5 trocas por jogada apareceu? Incomodou?
- Quando o relógio chegou perto das 18h, alguém quis um "chute final"?
- Os sons e as animações agradaram? Alguém desligou o som?
- Alguém usou "Encerrar partida"? Por quê?
- Quanto tempo durou? (meta das regras: 20 a 30 minutos)

## Pontos "a testar" que essas partidas ajudam a decidir

Seção 11 das regras:

- Item 4: acusação final quando o relógio zera (hoje não existe; a última ação já pode ser uma acusação).
- Item 5: dica de jogada só no Aprendiz. Ajuda ou atrapalha as crianças?
- Item 6: bot casual e faixas de vitória (a tabela acima).
- Item 7: sugestão única por jogador e confirmação antes de cada ação.
- Item 8: apelidos digitados. Alguma criança digitou o nome real? (anote só "sim" ou "não", nunca o nome)
- Item 10: textos das pistas legíveis para 8 anos.
- Item 12: "dupla por dupla". Decidido manter na v1 e rever aqui, com as partidas reais.

## Depois dos testes

Com as anotações, eu rodo a simulação com a mudança proposta, registro o resultado em `docs/simulation/` e ajusto **só os dados** (nunca o código), com a decisão registrada nas regras. Mudanças de regra (por exemplo, limite de acusações erradas) exigem mudança no motor e nova calibração; essas eu proponho antes de fazer.

## Leitor de tela

Uma partida curta com TalkBack (Android) ou VoiceOver (iPhone ou Mac): dá para saber de quem é a vez, o que cada pista diz, o que foi descartado no caderno e que horas são?

## Aparelhos com HTTPS

Depois da publicação (`docs/deploy.md`), repita o roteiro de `docs/device-test.md` no endereço com HTTPS e confira também a instalação do app no celular e o modo avião no "Jogar neste aparelho".
