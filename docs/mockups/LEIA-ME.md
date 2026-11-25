# Mockups

- `source/` guarda o código-fonte das telas (`*.dc.html`) e o `canvas.json` com a ordem das pranchas. Serve de referência para cores, medidas e textos. Os arquivos não abrem sozinhos no navegador: dependem do visualizador onde foram criados.
- Coloque aqui as telas exportadas (PNG ou PDF), se quiser: `overview.png`, `table.png`, `briefing.png`, `your-turn.png`, `clue.png`, `interrogation.png`, `notebook.png`, `accusation.png`, `reveal.png`.
- Telas: visão geral, mesa (tela grande), novo mistério, vez de alguém (escolher ação), nova pista, interrogatório, caderno, acusação e revelação (vitória e tempo esgotado).
- Telas que **ainda não existem** e devem ser desenhadas na Etapa 3 ou 4: início, lobby (apelidos digitados, bots, nível), opinar (sugestão), bot assumiu, jogador voltou, aviso de mesa não disponível em celular.

## Os mockups usam um caso ilustrativo

O caso dos mockups (nível Investigador, culpado Biscoito, esconderijo Quintal da Lúcia) ilustra o **layout**, não a lógica. Nas telas reais, **textos, horários e contagens vêm do gerador e dos dados do nível**. Diferenças que o código deve seguir (as regras mandam):

| Mockup | No jogo |
| --- | --- |
| Pista 2 diz que o rastro vai "até o Quintal da Lúcia" e mostra que não passa pelo Mercado. | O texto diz **exatamente o efeito** da carta (regras, seção 4.4). Exemplo: "O rastro não passa pelo Mercado." |
| "Seu Zé tem álibi" depois de interrogar o próprio Seu Zé. | Nenhuma carta elimina a própria origem. Álibi vem de **outro** suspeito. |
| Chips "visto sujo de farinha" e "rastro aponta para cá" mudam o item. | Só há dois estados: descartado e possível. Grupo (`only-*`) aparece como "um dos 2" (pontilhado, âmbar). Ruído é uma nota cinza que **não altera** o item. |
| Revelação: "Quando duas pistas dizem a mesma coisa, vale acusar." | A dica vem do solucionador: "as pistas N e M, juntas, já deixavam um único resultado." |
| Revelação: 3 pistas usadas levam à resposta. | As pistas mostradas são o conjunto de custo mínimo do solucionador, quantas forem. |
| Barra de 8 segmentos, "Começa às 14:00", "1 hora (2 ações)". | Tudo vem de `DifficultyParams` do nível (hoje 11, 10, 12 ou 10 ações; início 12:30, 13:00, 12:00 ou 13:00; os valores mudam com a calibração). |
| Nomes Lia, Carla e Bruno; "Sala K7P·4QX". | Exemplos. No jogo, apelidos digitados pelos jogadores (até 20 caracteres). O código da sala vem do `kit`. |
| Mapa 3×3 com 6 lugares. | A grade muda com o nível: 3×2 (5 lugares), 3×3 (6 ou 8), 4×3 (10). |
| "Toquem em OK para continuar." | O "OK" só fecha a tela neste aparelho. O estado já mudou e a pista fica no caderno. |
| Tela da mesa exibida sem restrição. | Só aparece quando o menor lado da tela física é ≥ 600 px. Em celular, a opção não existe. |
