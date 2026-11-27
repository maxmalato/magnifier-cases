# Casos da Lupa (`magnifier-cases`): regras v1

Status: decisões aprovadas em conversa (25/11/2026). Valores marcados como **(inicial)** e regras marcadas como **(a testar)** são pontos de partida: serão calibrados por simulação de bots e por partidas reais e **podem mudar**. Identificadores de código em inglês (glossário no fim). Tudo (nome, arte, textos, sons) é original. O nome público "Casos da Lupa" foi escolhido pelo dono do projeto e ainda depende de consulta ao INPI; por isso ele vive em uma única constante de i18n (`appName`) e nunca fica espalhado pelo código.

## 1. Resumo

Um mistério leve acontece no bairro. No tema da v1, **o bolo da festa sumiu**. Um culpado e um esconderijo são sorteados e ficam em segredo. A equipe tem um relógio que termina às 18h e gasta 30 minutos a cada ação: investigar um lugar, interrogar um suspeito ou ir a outro lugar. Cada ação abre uma carta de pista, e todas as pistas são verdadeiras. Quando tiver certeza, a equipe acusa **um suspeito e um lugar**. Quem acerta vence junto. Quem estoura o relógio vê a solução, as pistas que levavam a ela e uma dica, sem punição. Duração prevista: 20 a 30 minutos. Para todas as idades (8+).

## 2. Decisões fechadas

| Tema | Decisão |
| --- | --- |
| Jogadores | 2 a 6 assentos (pessoa ou bot), com pelo menos 1 pessoa. |
| Modos | Um aparelho, mesa (tela grande + celulares) e online (sala por código). Seção 8. |
| Tela da mesa | Só em tela grande: menor lado da tela física ≥ 600 px CSS. Tablet conta. Celular nunca, nem deitado. |
| Informação escondida | Só a solução (culpado e esconderijo) e o conteúdo das cartas ainda fechadas. Todo o resto é público. No online, o servidor nunca envia esses segredos. |
| Pistas | Todas **verdadeiras**. Ninguém mente. Existem pistas de ruído (verdadeiras e sem efeito) e pistas de grupo (parciais). Seção 4. |
| Solvabilidade | Todo mistério é gerado e **provado resolvível** por um solucionador antes de entrar em jogo. Seção 4.6. |
| Movimento | Qualquer lugar, custo fixo de 30 minutos. Investigar exige estar no lugar. Interrogar de qualquer lugar. |
| Níveis | Aprendiz, Investigador, Perito e Lenda. O mapa e o relógio mudam com o nível. Seção 7. |
| Relógio | O fim é fixo (18:00). O início é derivado do nível: `18:00 − ações × 30 min`. |
| Acusação | Suspeito + lugar. Erro custa tempo, acerto encerra. Sem retorno parcial (não se diz qual metade errou). Erro que estoura o relógio vira tempo esgotado. |
| Tempo esgotado | Revela solução, pistas que levavam a ela e uma dica. Sem punição. |
| Conteúdo da v1 | **Um único tema** (o bolo da festa), com 10 suspeitos e 10 lugares. Outros temas só depois que a v1 estiver pronta. |
| Papéis (habilidades) | **Depois da v1.** A v1 não tem habilidades. Seção 10. |
| Bots | Entram na v1. Completam a equipe e substituem quem desconecta. Também são a régua das simulações. |
| Desconexão | Bot assume e todos são avisados. A pessoa volta a qualquer momento e retoma no início do próprio turno. |
| Opinar | Qualquer jogador pode marcar uma sugestão durante o turno de outro. Quem tem a vez decide. |
| Desfazer | Não existe: toda ação revela informação. Para evitar toque errado, toda ação que gasta tempo pede confirmação. |
| Dados pessoais | Sem conta e sem chat. O único texto digitado é o apelido (até 20 caracteres), como no Enchente na Vila. Nunca vai para log e some quando a sala expira. |
| Público | Todas as idades (8+), gratuito, sem compras, sem loot box, sem anúncios, sem rastreadores. Tom leve, sem terror. |

## 3. Tema, elenco e mapa da v1

Tema: **O bolo da festa sumiu**. A festa do bairro é às 18h e alguém levou o bolo de cenoura. Tudo (nomes, textos, arte, sons) é original e fictício.

Elenco completo (o jogo sorteia um subconjunto por nível):

| Suspeito (`id`) | Nome |
| --- | --- |
| `baker-ze` | Seu Zé, o padeiro |
| `miss-lucia` | Dona Lúcia |
| `dog-biscuit` | Biscoito, o cachorro |
| `mail-tiao` | Tião, o carteiro |
| `teacher-rita` | Profª Rita |
| `cat-cleo` | Cleo, a gata |
| `gardener-nando` | Vovô Nando, o jardineiro |
| `skater-bia` | Bia, a skatista |
| `vet-caio` | Dr. Caio, o veterinário |
| `parrot-pipa` | Pipa, o papagaio |

| Lugar (`id`) | Nome |
| --- | --- |
| `bakery` | Padaria |
| `school` | Escola |
| `market` | Mercado |
| `post-office` | Correio |
| `lucia-backyard` | Quintal da Lúcia |
| `bandstand` | Coreto |
| `library` | Biblioteca |
| `fountain` | Chafariz |
| `ball-field` | Campinho |
| `fair` | Feira |

- A **Praça** (`square`) é o ponto de partida da equipe. Ela não tem carta e não pode ser esconderijo.
- O mapa é só visual: uma grade com os lugares sorteados e a Praça. Não há vizinhança nem caminho. Ir de qualquer lugar a qualquer lugar custa o mesmo. Grades: 5 lugares + Praça em 3×2; 6 em 3×3 (com células vazias); 8 em 3×3; 10 em 4×3.
- Sorteio por nível: o jogo escolhe N suspeitos e M lugares do elenco, depois o culpado entre os N e o esconderijo entre os M.
- Os nomes acima são provisórios. A arte e os textos finais são originais, feitos para o jogo.

## 4. O mistério

### 4.1 O segredo

`solution = { culpritId, hideoutId }`. Fica só no estado do motor (no servidor, no online) e nunca vai para a visão pública antes do fim da partida.

### 4.2 Cartas de pista

Cada lugar tem **uma** carta e cada suspeito tem **uma** carta, ou seja, N + M cartas por mistério. **Investigar** um lugar abre a carta do lugar. **Interrogar** um suspeito abre a carta dele. Cada carta abre uma vez só. A equipe não sabe, antes de abrir, o que a carta diz.

### 4.3 Efeitos

Cada carta tem exatamente um efeito lógico sobre o par (culpado, esconderijo):

| Efeito (`kind`) | Significado | Exemplo de texto |
| --- | --- | --- |
| `exclude-suspects` | O culpado **não** está neste grupo. | "Dona Lúcia e a Profª Rita estavam comigo na padaria." |
| `exclude-places` | O esconderijo **não** está neste grupo. | "O Correio ficou fechado o dia todo." |
| `only-suspects` | O culpado **está** neste grupo (pista parcial). O grupo tem 2 ou mais. | "Vi um bicho de pelo rondando. Foi o Biscoito ou a Cleo." |
| `only-places` | O esconderijo **está** neste grupo (pista parcial). O grupo tem 2 ou mais. | "O rastro termina na Escola ou no Coreto." |
| `none` | Ruído: verdadeiro, mas sem efeito sobre a solução. | "A Padaria cheira a canela." |

### 4.4 Regras de verdade e de justiça

1. Toda carta é verdadeira para a solução. O culpado também diz a verdade.
2. O texto diz exatamente o efeito, sem revelar mais. Carta de ruído tem texto de ambiente sem efeito.
3. Pista de grupo (`only-*`) nunca tem grupo de tamanho 1: nenhuma carta entrega a resposta sozinha.
4. **Sem denúncia por padrão:** uma carta nunca elimina a própria origem (o suspeito não se dá álibi, o lugar não diz "não está aqui"). Se pudesse, o culpado e o esconderijo seriam os únicos sem "autoálibi". Álibis vêm de outros suspeitos ou de outros lugares.
5. Quem joga não deve conseguir deduzir a solução só pelo formato das cartas (tipo de efeito, tamanho do texto). O gerador embaralha as formas.

### 4.5 Caderno

Todos veem o mesmo caderno. Ele mostra suspeitos, lugares e as pistas abertas, e é **derivado** das cartas abertas (nunca guardado à parte).

- `eliminated`: o item foi excluído por uma pista (mostra o número da pista).
- `open`: ainda possível.
- Marca `in-group` (pontilhada, âmbar): item que está no grupo de uma pista `only-*`, por exemplo "um dos 2".
- Notas de ruído aparecem na lista de pistas e podem aparecer como nota cinza junto ao item. Nota **nunca** altera o estado do item.

### 4.6 Provado resolvível (solucionador)

Antes de entrar em jogo, o mistério passa por um solucionador. Ele prova duas coisas:

1. **Unicidade:** com todas as N + M cartas, só o par (culpado, esconderijo) verdadeiro permanece possível.
2. **Alcance com folga:** existe um conjunto de cartas, de custo mínimo `minCost`, que determina a solução, com `ações do nível − minCost ≥ folga mínima do nível`.

Custo das cartas: **interrogar um suspeito = 1 ação**. **Investigar um lugar = 2 ações** (ir até lá e investigar; o deslocamento já está contado). O solucionador conhece a resposta (é um oráculo), então o resultado diz que **é possível**, e não que uma equipe consegue achar o caminho sem conhecê-lo. Quem mede a dificuldade real é o bot ideal (seção 9).

### 4.7 Exemplo

Nível Aprendiz (5 × 5), solução: culpado Biscoito, esconderijo Quintal da Lúcia.

| Ação | Carta | Efeito | Possíveis depois |
| --- | --- | --- | --- |
| Interrogar Tião | "O Correio ficou fechado o dia todo." | `exclude-places` [Correio] | lugares: Padaria, Escola, Mercado, Quintal |
| Interrogar Seu Zé | "Dona Lúcia e a Profª Rita estavam comigo na padaria." | `exclude-suspects` [Lúcia, Rita] | suspeitos: Zé, Biscoito, Tião |
| Ir à Padaria e investigar | "O rastro de migalhas não passa pelo Mercado nem pela Escola." | `exclude-places` [Mercado, Escola] | lugares: Padaria, Quintal |
| Interrogar Dona Lúcia | "Vi o Seu Zé e o Tião entregando pão o dia todo." | `exclude-suspects` [Zé, Tião] | suspeito: Biscoito |
| Ir à Escola e investigar | "A porta da Padaria ficou aberta o dia todo, ninguém escondeu nada lá." | `exclude-places` [Padaria] | lugar: Quintal |

Custo: 1 + 1 + 2 + 1 + 2 = 7 ações, folga de 4 em 11 (valores da primeira calibração; eram 3 em 10). A equipe acusa Biscoito no Quintal da Lúcia e vence. Este é um caminho possível, não o único.

## 5. Relógio, ações e turno

- **Relógio:** o fim é `deadline` (18:00). Cada ação gasta `actionMinutes` (30 min). O início é derivado: `início = deadline − ações do nível × actionMinutes`. O jogo guarda `actionsLeft` e calcula o horário.
- **Turno:** uma ação por vez. Depois de cada ação a vez passa ao próximo assento, em ordem fixa. Quem tem a vez escolhe a ação; os outros opinam (seção 8).
- **Posição:** a equipe é uma só e começa na Praça. Ela se desloca junta.

| Ação (`action`) | Regra | Custo |
| --- | --- | --- |
| `move` | Vai a qualquer lugar diferente do atual. Não revela nada. | 1 |
| `investigate` | Abre a carta do lugar atual. Exige que a equipe esteja no lugar e que ele ainda não tenha sido investigado. | 1 |
| `interrogate` | Abre a carta de um suspeito ainda não interrogado, de qualquer lugar. | 1 |
| `accuse` | Acusa um suspeito e um lugar (seção 6). | 0 se acertar; `wrongAccusationCost` se errar |

- Toda ação que gasta tempo pede confirmação antes de valer. Não existe desfazer.
- Tela de resultado: depois da ação, todos leem a carta. O botão "OK" apenas fecha a tela **neste aparelho**. O estado do jogo já mudou, e a pista continua no caderno. Não há "esperar todos".
- Itens bloqueados mostram o motivo ("já investigada", "já interrogado", "já acusaram essa dupla").

## 6. Acusação e fim

- Só dá para acusar quando `actionsLeft ≥ 1`. A equipe escolhe um suspeito e um lugar entre os possíveis (itens eliminados ficam bloqueados).
- **Acerto:** vitória imediata, sem custo de tempo. A tela mostra o horário em que foi resolvido, quantas ações sobraram e as pistas que bastavam.
- **Erro:** o relógio avança `wrongAccusationCost` ações. O jogo diz apenas que a dupla está errada, **sem** dizer qual metade. A mesma dupla não pode ser acusada de novo. Se `actionsLeft` chegar a 0 ou menos, vira tempo esgotado.
- **Tempo esgotado** (por ações ou por erro de acusação): revela o culpado e o esconderijo, mostra as pistas que levavam à resposta (o conjunto de custo mínimo do solucionador) e uma dica gerada dele ("as pistas 2 e 5, juntas, já deixavam um único lugar"). Sem punição e sem placar negativo.
- Não há acusação final com o relógio zerado na v1 (ponto em aberto, seção 11).
- **Encerrar a partida:** a qualquer momento, o botão "Encerrar partida" (com confirmação) termina o mistério sem gastar tempo e revela a resposta, como no tempo esgotado, com o título "Partida encerrada". No modo de um aparelho, qualquer pessoa pode encerrar; no online e na mesa, só quem comanda a sala (se essa pessoa cair, outra pessoa conectada assume). A mesa nunca encerra. Depois, quem comanda pode pedir um novo mistério.

## 7. Níveis

Quatro níveis com nomes do mundo dos mistérios. Todos os valores são **(inicial)** e vêm de dados (`DifficultyParams`). A calibração é feita por simulação (seção 9). A tabela mostra os valores da **primeira calibração** (Etapa 2, 25/11/2026); os que mudaram trazem o valor anterior entre parênteses. Relatório: `docs/simulation/`.

| Nível (`id`) | Suspeitos × lugares | Ações | Início | Acusação errada custa | Ruído | Exclusão em grupo | Parcial (`only-*`) | Folga mínima |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aprendiz (`apprentice`) | 5 × 5 | 11 (10) | 12:30 (13:00) | 1 ação (30 min) | 0% | 1 a 2 | 0% | ≥ 3 |
| Investigador (`investigator`) | 6 × 6 | 10 (8) | 13:00 (14:00) | 1 ação, 30 min (2 ações) | 10% | 1 a 3 | 15% | ≥ 2 |
| Perito (`expert`) | 8 × 8 | 12 (8) | 12:00 (14:00) | 2 ações (1 h) | 20% | 2 a 4 | 25% | ≥ 1 |
| Lenda (`legend`) | 10 × 10 | 10 (7) | 13:00 (14:30) | 3 ações (1 h 30) | 30% | 2 a 5 | 35% | ≥ 0 |

- "Ruído" é a taxa de cartas sem efeito. "Exclusão em grupo" é o tamanho do grupo nas cartas `exclude-*`. "Parcial" é a taxa de cartas `only-*`.
- Dica de jogada (`suggest`): ligada só no Aprendiz, desligada nos outros níveis (decisão de 25/11/2026; o valor fica nos dados, em `suggestEnabled`).
- Nos níveis altos, as cartas precisam eliminar vários itens de uma vez (grupos grandes e pistas parciais). Esse é um requisito do gerador, não da interface.
- O texto de regra e a barra do relógio mostram os valores do nível, vindos dos dados: "Se errarem, o relógio avança 1 hora (2 ações)" é calculado, não escrito.

## 8. Modos de jogo

- **Um aparelho:** todos em volta de um tablet ou notebook. O segredo só existe no próprio aparelho (a equipe coopera, então não há "passe o aparelho").
- **Mesa:** uma tela grande mostra o mapa, a pista mais recente, as contagens ("4 de 6 lugares ainda possíveis") e a vez de cada jogador. Os celulares são o controle. Funciona como o modo online mais uma tela espelhada (assento de mesa). **A tela da mesa só é oferecida quando `Math.min(screen.width, screen.height) ≥ 600`** (tela física, não janela nem orientação). Em celular a opção não aparece, e abrir o endereço da mesa leva à tela do jogador com um aviso curto. É uma barreira de interface, não de segurança.
- **Online:** sala com código de 6 caracteres, do `packages/kit`. O aparelho guarda o token do assento (a "senha" do assento), que permite voltar ao mesmo lugar. Cada pessoa vê o caderno, a pista mais recente e os botões. Só quem tem a vez age.
- **Opinar:** fora da sua vez, o jogador marca uma sugestão (uma opção do menu de ações, um lugar, um suspeito ou uma dupla de acusação). Cada jogador tem **uma** sugestão ativa por vez, que some quando a ação é resolvida. As sugestões ficam fora do estado do jogo, com limite de frequência. **(a testar)**
- **Conversa:** por voz, fora do app. Não há chat; o único texto digitado é o apelido.
- **Desconexão:**
  1. A equipe é avisada ("Raposa Curiosa desconectou, o bot assumiu").
  2. O bot entra após cerca de 20 s na vez da pessoa, ou no início do próximo turno dela.
  3. A pessoa volta pelo token do assento (guardado no aparelho) e retoma no início do próprio turno seguinte, nunca no meio do turno de um bot.
  4. O assento não é removido por inatividade.
- **Bots:** completam a equipe e substituem quem desconecta. Usam só a informação pública (`PublicView`) e nunca a solução. O bot de partida usa a política "casual" por padrão. O bot "ideal" é usado nas simulações e na dica de jogada. **(a testar)**
- **Apelidos:** digitados por cada pessoa, até 20 caracteres, diferentes dentro da sala (mesma dinâmica do Enchente na Vila). Bots recebem nomes neutros ("Bot 1", "Bot 2"). Nunca vão para log e somem quando a sala expira. Riscos em aberto (seção 11, item 8).

## 9. Metas de dificuldade e simulação

As taxas abaixo são **metas** a validar. Ainda não houve simulação: ela depende do gerador e dos bots (Etapa 2 do roadmap).

| Nível | Bot ideal (mínimo) | Bot casual (proxy de equipe real) | Mistérios resolvíveis | Folga mínima do caminho mais curto |
| --- | --- | --- | --- | --- |
| Aprendiz | 98% | 85–95% | 100% | ≥ 3 ações |
| Investigador | 90% | 65–80% | 100% | ≥ 2 ações |
| Perito | 75% | 45–60% | 100% | ≥ 1 ação |
| Lenda | 55% | 25–40% | 100% | ≥ 0 ação |

- **Resolvível** (oráculo): existe um caminho de custo ≤ ações do nível que determina a solução (seção 4.6).
- **Bot ideal:** joga bem sem conhecer a resposta. Por isso a taxa dele fica abaixo de 100% mesmo com todos os mistérios resolvíveis.
- **Bot casual:** representa uma equipe real. Escolhe com ruído, ignora pistas parciais com certa probabilidade e acusa cedo com certa probabilidade. Os parâmetros são calibrados com partidas reais.
- **Bot aleatório:** linha de base. A diferença entre ideal e aleatório mede se há **decisão que vale a pena**: meta de pelo menos 25 pontos em cada nível. **(a testar)** Se a diferença for pequena, o jogo vira sorte, e o gerador deve ganhar pistas que apontam onde procurar (seção 11, item 1).
- **Protocolo:** 10.000 mistérios por nível e por bot, com sementes fixas. Com esse volume o intervalo de confiança de 95% fica em cerca de ±1 ponto percentual. Se um nível sair da meta, ajustar nesta ordem: ações, ruído, custo da acusação errada, tamanho do mapa, mistura de pistas. Simular de novo. O relatório é versionado e a simulação entra na CI: nível fora da meta quebra o build.
- **Partidas reais** (família e amigos, algumas por nível) calibram o bot casual. Amostra pequena não prova percentual.
- **Bot casual na CI:** até ser calibrado com partidas reais (Etapa 7), a faixa do casual aparece como aviso e não quebra o build (`casualEnforced` nos dados das metas). Bot ideal, diferença ideal − aleatório e mistérios resolvíveis quebram o build.
- **Primeira calibração (25/11/2026):** com os valores iniciais, o bot ideal ficou em 97%, 56%, 48% e 30% (metas: 98%, 90%, 75% e 55%) e a Lenda teve diferença ideal − aleatório de 16 pontos. Mudando só ações e custo da acusação errada (seção 7), o ideal ficou em 99%, 92%, 80% e 62%, com diferença de 30 a 48 pontos em todos os níveis. O casual ficou acima da faixa no Investigador (82%), no Perito (75%) e na Lenda (52%). Detalhes em `docs/simulation/`.
- **Também medir:** taxa de rejeição do gerador (quantas tentativas por mistério válido), distribuição da folga, tempo para gerar um mistério e horário médio de resolução.

## 10. Papéis e habilidades (depois da v1)

Ideia aprovada: os personagens escolhidos pelos jogadores podem ter uma habilidade. **Decisão: depois da v1.** Motivos: habilidade grátis facilita o jogo e multiplica a calibração (cada habilidade × nível × tamanho de equipe).

Quando entrar, será uma opção ligável no lobby ("Modo Equipe"), com metas próprias:

- Cada habilidade é limitada (uma vez por partida, por exemplo).
- Nenhuma composição de equipe pode ter mais de 10 pontos de diferença na taxa de vitória em relação à média do nível.
- Exemplos a testar: investigar revela uma segunda pista do mesmo lugar; interrogar revela depoimento e álibi; uma ação custa 0 minuto; a acusação errada custa uma ação a menos.

Na v1, o código **não** implementa papéis. O ponto de extensão está descrito na especificação técnica (seção 12).

## 11. Pontos em aberto e hipóteses a validar

1. **Decisão ou sorte?** As cartas são abertas sem saber o que dizem. Se o bot ideal não superar o aleatório por pelo menos 25 pontos, adicionar pistas que apontam onde procurar (`lead`, por exemplo "ouvi barulho na Escola") ou tornar o custo visível. **Medido na Etapa 2:** depois da primeira calibração, a diferença fica entre 30 e 48 pontos em todos os níveis. Por ora não precisa de `lead`.
2. Valores dos níveis, mistura de pistas e metas: tudo **(inicial)**, calibrar por simulação.
3. A viabilidade dos níveis altos (Perito e Lenda) com custo 1 por suspeito e 2 por lugar: o gerador pode precisar de mais pistas de grupo ou de folga menor. **Medido na Etapa 2:** o gerador nunca falha, mas com 8 e 7 ações uma equipe que joga bem vence pouco (48% e 30%). Com 12 e 10 ações as metas são cumpridas. A folga mínima nunca é o problema: o caminho do oráculo é curto; difícil é achá-lo sem saber as cartas.
4. Acusação final quando o relógio zera (hoje não existe). Avaliar se frustra. **Medido na Etapa 2:** os bots usam a última ação para acusar, então a regra já permite um "chute final". Recomendação: não criar acusação extra; a interface avisa "última ação: dá para acusar". Validar com crianças.
5. Dica de jogada: decidido em 25/11/2026, só no Aprendiz. Validar com crianças se ajuda ou atrapalha.
6. Política do bot casual em partida (dica x jogada) e calibração com partidas reais. **Medido na Etapa 2:** com os defeitos iniciais, o casual fica só 5 a 12 pontos abaixo do ideal; as metas pedem 15 a 25. Ou as partidas reais mostram que o casual está certo (e a faixa muda), ou os defeitos aumentam.
7. Sugestão única por jogador e a confirmação antes de cada ação: validar com crianças e adultos.
8. Apelidos digitados (até 20 caracteres): uma criança pode digitar o nome real (dado pessoal, LGPD art. 14) ou uma palavra imprópria, que os outros jogadores veem. Avaliar com o advogado medidas como um aviso na tela ("não use seu nome completo") e um filtro de palavras.
9. Mesa na TV sem toque: como abrir o caderno completo (controle remoto, teclado ou celular de quem controla). **Decidido (26/11/2026):** o caderno compacto fica sempre visível na tela da mesa. Falta confirmar a leitura numa Smart TV real.
10. Textos das cartas gerados por modelos em PT-BR e EN: concordância (o/a, do/da, no/na) e listas ("A, B e C") precisam de formatadores. Validar a legibilidade para 8 anos.
11. Nome público "Casos da Lupa": consulta ao INPI e parecer jurídico pelo dono do projeto.
12. **Acusar dupla por dupla (Etapa 2).** Como a acusação errada só custa tempo e não dá pista, a melhor estratégia é reduzir as duplas até que acusar todas, uma por vez, caiba no relógio. O bot ideal vence assim em 98% das partidas do Aprendiz, 85% do Investigador e 68% do Perito; deduzir o par único é raro (Lenda: 18% das partidas). Decidir se isso é parte do jogo (gestão de risco) ou se a acusação deve pesar mais. Opções: custo maior por erro, limite de acusações erradas (por exemplo, 2) ou a acusação errada encerrar a partida. Qualquer opção exige nova calibração. **Medido (25/11/2026): custo maior por erro não resolve.** No Aprendiz e no Investigador, erro de 2 ações derruba o ideal (84% e 85%); dar mais ações para compensar traz o "dupla por dupla" de volta (74% a 98% das vitórias), e a diferença ideal − aleatório cai abaixo de 25 pontos (o jogo fica mais sorte). Pistas maiores não ajudam: a dedução continua abaixo de 5% das vitórias. Mudar a estrutura (limite de acusações ou erro que encerra) exige mudar o motor. **Decisão (25/11/2026):** manter na v1 e rever na Etapa 7, com partidas reais.

## 12. Acessibilidade

- O estado de cada item não depende só de cor: eliminado = texto riscado + tarja "descartado"; grupo = tarja pontilhada com texto ("um dos 2"); álibi = texto.
- Alvos de toque de pelo menos 44 px (botões principais de 56 px), contraste mínimo 4,5:1, foco visível por teclado, rótulos de acessibilidade por lugar e por suspeito, anúncio das pistas e do relógio em `aria-live`.
- Respeitar `prefers-reduced-motion`. Textos em PT-BR e EN. Leitura fácil para 8 anos (frases curtas, sem jargão).
- Sem informação passada só por som.

## 13. Público, privacidade e conformidade

- Todas as idades (8+), gratuito. Sem conta, sem chat, sem compras, sem loot box, sem anúncios, sem rastreadores. O único texto digitado é o apelido (até 20 caracteres), que nunca vai para log e some quando a sala expira (riscos na seção 11, item 8). Nada de dado pessoal em logs.
- Como o jogo pode ser acessado por crianças, a LGPD (art. 14, tratamento de dados de crianças e adolescentes) e o ECA Digital (Lei 15.211/2025) devem ser revisados pelo dono do projeto com um advogado antes da publicação. Este documento não é parecer jurídico.
- Tom leve: mistério de bairro, sem terror, sem violência, sem sobrenatural pesado.
- Inspirações gerais (séries e filmes de mistério em equipe) servem só como ideias de mecânica e de clima. Nada de nomes, personagens, cenas ou formatos de obras existentes.

## 14. Glossário PT para EN (nomes no código)

| PT | EN |
| --- | --- |
| Casos da Lupa | `magnifier-cases` |
| Mistério | `mystery` |
| Suspeito | `suspect` |
| Lugar | `place` |
| Praça (início) | `square` |
| Culpado | `culprit` |
| Esconderijo | `hideout` |
| Solução | `solution` |
| Carta de pista | `clueCard` |
| Efeito da pista | `clueEffect` (`exclude-suspects`, `exclude-places`, `only-suspects`, `only-places`, `none`) |
| Pista de ruído | `noise` |
| Caderno | `notebook` |
| Descartado, possível | `eliminated`, `open` |
| Investigar, interrogar, ir, acusar | `investigate`, `interrogate`, `move`, `accuse` |
| Relógio, fim, minutos por ação | `clock`, `deadline`, `actionMinutes` |
| Ações restantes | `actionsLeft` |
| Acusação errada custa | `wrongAccusationCost` |
| Nível: Aprendiz, Investigador, Perito, Lenda | `apprentice`, `investigator`, `expert`, `legend` |
| Folga | `slack` |
| Solucionador, oráculo | `solver`, `oracle` |
| Visão pública | `PublicView` |
| Tema | `themePack` |
| Opinar (sugestão) | `suggestion` |
| Mesa | `table` |

## 15. Registro de decisões

Decisão nova entra no topo, com data e motivo.

- **27/11/2026 — Preparação para publicar (Etapa 7).** Mesmo padrão aprovado pelo dono no Enchente na Vila: (1) publicação automática na Cloudflare pelo workflow `Deploy`, só depois de um CI verde na `main` e só com os segredos do environment `production` do GitHub (token "Edit Cloudflare Workers" restrito à conta e o ID da conta), que o dono configura; sem os segredos, nada é publicado; (2) publicação à mão com `pnpm cf:deploy` para a primeira vez ou emergência, e `wrangler rollback` para voltar; (3) os limites por endereço (10 salas criadas e 60 consultas por minuto) passam a vir das vars do Worker, com os mesmos valores; só os testes de ponta a ponta usam valores maiores. **Motivo do item 3:** nos testes, todos os aparelhos simulados saem do mesmo endereço, e o novo teste de segurança levaria o projeto online a 9 salas por minuto, perto do limite; uma repetição no CI passaria dele e falharia por um motivo que não é defeito do jogo.

- **27/11/2026 — Botão "Encerrar partida" em todos os modos.** Pedido do dono: antes, a partida só terminava ao acertar ou com o tempo esgotado. Decisões do dono: (1) ao encerrar, o jogo **mostra a resposta** (culpado, esconderijo e pistas-chave), com o título "Partida encerrada", para a criança não ficar sem o final; (2) no online e na mesa, **só quem comanda a sala** encerra, a qualquer momento (não precisa ser a vez dela), para ninguém encerrar o jogo de todos sem querer; se quem comanda cair, outra pessoa conectada assume, como em "Jogar de novo". A mesa nunca encerra. No motor, encerrar é a função pura `endGame` (fase `ended`, evento `ended` e `revealed`), não uma jogada: não gasta tempo nem passa a vez. Sempre pede confirmação.
- **27/11/2026 — Acabamento (Etapa 6): sons, animações e leitura fácil.** Segue o padrão aprovado pelo dono no Enchente na Vila. (1) **Sons** curtos sintetizados no navegador (Web Audio), sem arquivos nem dependência nova, **ligados por padrão**, com o botão "Som" no topo de todas as telas e a escolha lembrada no aparelho. Cada jogada toca só o som mais importante (vitória, tempo esgotado, acusação errada, pista, passo). No online, "sua vez" toca só no aparelho de quem vai jogar; com a mesa na sala, a tela grande toca os sons e os celulares só avisam "sua vez". Nenhum som carrega informação que não esteja na tela. (2) **Animações** curtas em CSS (cartão da pista entrando, tarja "descartado" carimbada, relógio avançando, anel em quem joga na mesa, avisos chegando), todas desligadas com "reduzir movimento". (3) **Leitura fácil:** cada pista virou duas frases curtas ("… a tarde toda comigo. Então não levaram o bolo."), sem mudar o que ela mostra; frases de até 12 palavras, com as listas de nomes contando como uma, garantidas por teste nos dois idiomas. **Motivo:** sintetizar garante a originalidade e não pesa no download; um som por jogada evita barulho com bots jogando seguido; antes da revisão, 40% das frases das pistas passavam de 16 palavras (até 32).

- **26/11/2026 — QR code na mesa com a biblioteca `uqr`.** Aprovada pelo dono como dependência de produção (MIT, sem dependências). O QR é gerado no próprio aparelho, com o link da sala; nada passa por serviço externo.
- **26/11/2026 — Mesa e PWA (Etapa 5); caderno na TV aprovado pelo dono.** (1) Caderno na TV sem toque (seção 11, item 9): a tela da mesa mostra o caderno compacto **sempre visível**, ao lado do mapa, da pista mais recente e das contagens; ninguém precisa abrir nada com o controle remoto, e o caderno completo continua no celular de cada um. (2) A mesa abre a sala com o nível Aprendiz; quem entra primeiro pelo celular comanda a sala, escolhe o nível e começa. (3) A mesa mostra o código grande e um QR code com o link da sala (ver a decisão acima). (4) PWA: o modo de um aparelho funciona sem internet depois do primeiro acesso; online e mesa precisam de conexão. A versão nova do jogo assume sozinha ao abrir de novo (nenhuma partida fica guardada no cache).
- **26/11/2026 — Limite de 5 sugestões por jogada mantido.** Depois do teste com dois navegadores, o dono decidiu manter 5 trocas de sugestão por jogada (dados em `packages/protocol/data/room-params.json`), agora com a contagem visível e os botões bloqueados com o motivo ao esgotar.
- **26/11/2026 — Detalhes do online (Etapa 4).** (1) Opinar: cada jogador tem uma sugestão ativa (opção do menu, lugar, suspeito ou dupla); a nova troca a anterior e todas somem quando a vez muda. O limite de trocas por turno é (a testar) e fica em dados (`packages/protocol/data/room-params.json`, inicial: 5). A tela mostra quantas trocas ainda restam e, ao esgotar, bloqueia os botões com o motivo (pedido do dono em 26/11/2026: o limite não pode parecer defeito). Tirar a própria sugestão não conta. (2) Os avisos de conexão (desconectou, o bot assumiu, voltou) ficam numa faixa fixa, visível em qualquer tela da partida; sem isso, a tela da pista do bot escondia o aviso. (3) No online a partida começa direto na vez do primeiro jogador; a tela "novo mistério" fica só no modo de um aparelho. (4) Mantidos do Enchente: limite de 10 salas criadas e 60 consultas por minuto por endereço (só em memória, nunca gravado), 40 mensagens por 10 s por conexão, token de assento guardado como hash e sala apagada depois de 12 h sem atividade. O aparelho guarda só o código da sala e o token, para voltar ao mesmo lugar.
- **25/11/2026 — Detalhes das telas (Etapa 3).** (1) A revelação traz o texto das cartas-chave, mesmo as que ficaram fechadas (o motor só inclui isso depois do fim). (2) No mapa, cada lugar mostra "tem pista" ou "pista aberta" no lugar do "livre" do mockup, que não diz nada para quem joga; descartado continua riscado com tarja. (3) Fontes Fredoka e Nunito servidas pelo próprio site (licença OFL), sem Google Fonts, para não ter rastreador. (4) No modo de um aparelho, a URL aceita `?seed=` e `?botDelay=` para os testes de ponta a ponta; o segredo já vive no aparelho (jogo cooperativo) e no online a semente vem do servidor. (5) A dica de jogada mostra a jogada do bot ideal, como na spec; as ideias de celebrar a dedução na revelação e de a dica não sugerir "acusar dupla por dupla" seguem para decisão do dono.
- **25/11/2026 — "Dupla por dupla" fica na v1; revisar na Etapa 7.** A acusação continua como está (erro só custa tempo). Motivo: a medição foi feita com o bot ideal, que calcula tudo; só partidas reais mostram se crianças jogam assim e se isso tira a graça. Mudar depois é barato (dados e uma regra pequena no motor, mais recalibração). Ver seção 11, item 12.
- **25/11/2026 — Bot casual como aviso na CI.** Até a calibração com partidas reais (Etapa 7), a faixa do bot casual aparece no relatório como aviso e não quebra o build (`casualEnforced: false` em `packages/sim/data/targets.json`). Bot ideal, diferença ideal − aleatório e mistérios resolvíveis continuam quebrando. Motivo: os defeitos do casual são palpites até haver partidas reais.
- **25/11/2026 — Primeira calibração (Etapa 2), aprovada pelo dono.** Só nos dados: Aprendiz 11 ações (era 10); Investigador 10 ações e erro de 1 ação (eram 8 e 2); Perito 12 ações (era 8); Lenda 10 ações (era 7). Motivo: com os valores iniciais, o bot ideal ficava muito abaixo das metas a partir do Investigador. Escolha: o menor número de valores mudados, na ordem da seção 9 (ações primeiro). O bot casual segue fora da faixa e vira aviso na CI até a calibração com partidas reais.
- **25/11/2026 — Política do bot ideal (Etapa 2).** Acusa quando resta uma dupla, quando acusar todas cabe no relógio ou na última ação; senão abre a carta com maior ganho esperado por ação (log2 das duplas, pela mistura de pistas do nível). Um planejamento de vários passos foi testado e jogou pior (chutava cedo demais). Detalhes em `packages/bots/src/policies.ts`.
- **25/11/2026 — Detalhes do motor (Etapa 1).** (1) `move` não vai para a Praça: ela não tem carta. (2) Dois campos novos em `DifficultyParams`, por serem valores (inicial) que antes ficariam no código: `placeTargetRate` (parte das cartas com efeito que fala de lugares; 0,5) e `maxAttempts` (tentativas do gerador; 500). (3) Consequência da regra 4.4.4: uma pista de grupo (`only-*`) que fala do mesmo tipo da origem inclui a própria origem (senão a descartaria). (4) Se o grupo sorteado não cabe no tipo escolhido, o gerador tenta o outro tipo; se não couber em nenhum, a carta vira ruído. (5) O id da carta vem da origem (`suspect:baker-ze`), que é pública.
- **25/11/2026 — Dica de jogada só no Aprendiz.** `suggestEnabled` ligado só no Aprendiz (antes: Aprendiz e Investigador). Os bots seguem como na seção 8: completam a equipe, substituem quem desconecta e são a régua da simulação.
- **25/11/2026 — Apelido digitado, até 20 caracteres.** Mesma dinâmica do Enchente na Vila; substitui os apelidos por listas. O apelido é o único texto digitado, nunca vai para log e some quando a sala expira. Riscos para a revisão jurídica na seção 11, item 8.
- **25/11/2026 — Stack da v1 confirmada.** Node 24 LTS, pnpm 12, TypeScript ~6.0 estrito (o TS 7 ainda não é aceito pelo `typescript-eslint` nem pelo `svelte-check`), ESLint com regras de arquitetura, Prettier sem ponto e vírgula, Vitest, fast-check, Playwright com axe-core, Svelte 5 + Vite, Cloudflare Workers + Durable Objects (SQLite). Segue o padrão do Enchente na Vila, o projeto mais recente.
- **25/11/2026 — Zod 4 como validador de schema.** Aprovado como dependência de produção do motor, a partir da Etapa 1. Mesmo validador do Enchente; os tipos saem do schema.
- **25/11/2026 — "Senha" da sala é o token do assento.** Não existe senha de sala. Entra-se pelo código; o aparelho guarda o token do assento (só o hash fica no servidor) e volta ao mesmo lugar com ele.
- **25/11/2026 — Visão pública com todos os parâmetros do nível.** `PublicDifficultyParams` traz todos os campos de `DifficultyParams`: nenhum deles revela o mistério, e o bot ideal usa a mistura de pistas como informação a priori (spec, seção 9).
- **25/11/2026 — Assinaturas da `GameDefinition`.** `newGame(config, seats, seed)` recebe os assentos; `botMove(view, seat)` recebe só a visão, e a política (`skill`) fica em `packages/bots`, com a casual como padrão de partida.
- **25/11/2026 — Origem do `packages/kit`.** O `senhorio-web` não tem `packages/kit`; o `village-flood` já tem, extraído e generalizado do Senhorio. O kit é copiado do `village-flood` (com a origem citada nos arquivos) e adaptado à informação escondida: `viewFor` por destinatário, bot só com a visão e sugestão única por jogador. A Etapa 0 traz só a interface e as constantes; a sala completa entra na Etapa 4.
- **25/11/2026 — Papéis depois da v1.** Habilidade grátis facilita o jogo e dobra a calibração. A v1 calibra a linha de base primeiro.
- **25/11/2026 — Nome público "Casos da Lupa" (`magnifier-cases`).** Usa as palavras preferidas do dono do projeto (lupa, caso). Pendente de consulta ao INPI.
- **25/11/2026 — Níveis e relógio derivado.** Quatro níveis aprovados. O fim é fixo (18:00) e o início depende das ações do nível. Metas por bot (seção 9) e simulação com testes reais do bot.
- **25/11/2026 — Tablet conta como tela da mesa.** Regra do menor lado da tela física ≥ 600 px.
- **25/11/2026 — Modelo de cartas.** Uma carta por lugar e por suspeito, com efeito lógico explícito. Texto = efeito. Sem carta que elimina a própria origem (evita denunciar a solução). Custo: suspeito 1, lugar 2.
- **25/11/2026 — Pistas verdadeiras, solvabilidade provada, movimento livre, um único tema na v1, casos de borda.** Aprovados (conversa de 25/11/2026).
