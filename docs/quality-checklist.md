# Checklist de acessibilidade e desempenho

Etapa 6 (acabamento), 27/11/2026. Cada item diz como é verificado. Os testes automáticos rodam no CI a cada envio; os itens manuais ficam com o dono do projeto, em aparelho real.

## Acessibilidade

| Item | Situação | Como é verificado |
| --- | --- | --- |
| axe-core sem violações em todas as telas (início, lobby, vez, escolher suspeito e lugar, confirmação, pista, caderno, acusação, acusação errada, revelação, entrada online, lobby online, mesa), nos temas claro e escuro | Cumprido | E2E `a11y`, `home`, `online` e `table`. O axe espera as animações de entrada terminarem e mede o estado final. |
| Alvos de toque de pelo menos 44 × 44 px (botões, campos, rádios pelo rótulo) | Cumprido | E2E `a11y` mede todos os controles visíveis nas telas do modo local, no celular, no tablet e no desktop; `online` e `table` medem as telas online, a mesa e o celular de quem sugere |
| Contraste mínimo de 4,5:1 | Cumprido | axe-core (regra `color-contrast`), nos dois temas |
| Foco visível e jogada inteira só com o teclado (Tab e Enter) | Cumprido | E2E `a11y`: interrogar, escolher, confirmar e fechar a pista só com o teclado; o contorno de foco aparece; a tela da pista leva o foco ao OK |
| Confirmação em diálogo nativo (`<dialog>`), que prende o foco | Cumprido | E2E `game` e `a11y` |
| Pistas, relógio e avisos em `aria-live` | Cumprido | Revisão de código; os E2E conferem os textos |
| Estados sem depender só de cor (riscado + tarja "descartado", tarja pontilhada "um dos 2") | Cumprido | Revisão das telas; regras, seção 12 |
| `prefers-reduced-motion` respeitado | Cumprido | E2E `a11y`: com "reduzir movimento", as animações ficam com duração e atraso zero |
| Telas sem rolagem lateral em 320 px (zoom de 400%) | Cumprido | E2E `a11y`: início, lobby, criar sala, vez, escolher suspeito, pista, caderno e acusação |
| Leitura fácil para 8 anos: frases de até 12 palavras (listas de nomes contam como uma) | Cumprido | Testes de unidade `reading.test.ts` em `packages/content` (pistas e tema) e em `apps/web` (interface), nos dois idiomas |
| Idioma da página (`lang`) e textos em PT-BR e inglês | Cumprido | E2E `home`; teste de unidade garante as mesmas chaves nos dois idiomas |
| Som com botão "Som" em todas as telas, lembrado no aparelho; nenhum som carrega informação que não esteja na tela | Cumprido | E2E `a11y` (liga, desliga e lembra depois de recarregar); revisão de código |
| Leitor de tela real (TalkBack no Android, VoiceOver no iPhone ou Mac) | Manual, pendente | Dono do projeto, na Etapa 7 |

## Desempenho

Medido em 27/11/2026 com `pnpm --filter @magnifier-cases/web perf` (Playwright e Chromium, celular Pixel 7 simulado, CPU 6 vezes mais lenta e rede 3G de 1,6 Mb/s com 150 ms de latência; mediana de 5 visitas). O tempo das telas inclui o clique do Playwright.

| Item | Meta | Medido |
| --- | --- | --- |
| JavaScript do jogo (comprimido com gzip) | até 150 KB | 83 KB |
| CSS (comprimido) | até 20 KB | 5 KB |
| Primeira pintura na primeira visita (3G + CPU 6×) | até 2,5 s | 1,03 s |
| Visita seguinte (service worker) | até 1 s | 0,19 s |
| Montar o mistério no Perito (CPU 6×) | até 0,5 s | 0,09 s |
| Começar a investigação (CPU 6×) | até 0,5 s | 0,11 s |
| Abrir a escolha de suspeito (CPU 6×) | até 0,4 s | 0,09 s |
| Confirmar e ver a pista (CPU 6×) | até 0,4 s | 0,20 s |
| Jogada do bot (Node, cerca de 16 mil jogadas por política, 4 níveis, 4 assentos) | até 50 ms | casual: mediana 0,01 ms, p99 0,05 ms, máximo 2,3 ms; ideal: mediana 0,01 ms, máximo 4,4 ms |
| Gerar um mistério (Node, 2.000 mistérios, 4 níveis) | até 50 ms | mediana 0,03 ms, p99 0,4 ms, máximo 2 ms |

Observações:

- No modo de um aparelho, o bot e o gerador rodam na mesma linha do navegador; mesmo o pior caso com CPU 6× fica longe de travar a tela.
- No online e na mesa, o bot roda no servidor.
- O mapa é HTML/CSS, sem canvas nem WebGL. Os sons são sintetizados (Web Audio), sem arquivos para baixar.
- Teste em aparelho real (celular, tablet, notebook e Smart TV) feito pelo dono do projeto na Etapa 5. Repetir na Etapa 7, depois da publicação com HTTPS, para conferir também a instalação do app e ouvir os sons.
