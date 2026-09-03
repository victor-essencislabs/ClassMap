---
id: TASK-054
title: Modal de foco (tecla V) — classe selecionada + classes relacionadas
status: backlog
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: []
---

# TASK-054 — Modal de foco (tecla V): classe selecionada + classes relacionadas

> **Branch obrigatória**: esta task **não** é implementada em `main`. Criar `feature/foco-classe-relacionadas` a partir de `main` antes de qualquer edição, e commitar só nela. Nada de push/merge em `main` sem pedido explícito do usuário. Mesmo padrão já usado em `feature/animacoes-sistema` (rodada TASK-038..045), desvio deliberado do fluxo padrão do projeto ("branch única `main`, sem PR" — ver CONTEXT.md, "Fluxo de git ajustado").
>
> **Ordem**: esta task vem **antes** da TASK-055 na mesma branch — ela cria o módulo puro (`focusSubgraph.ts`) que a TASK-055 reaproveita. Ver "Relação com a TASK-055".

## Contexto
Pedido do usuário (2026-09-03, com print do diagrama real do ELIMS aberto — 85 classes, 190 relações): com um diagrama grande na tela, "fica muito confuso de olhar com qual classe ele se relaciona". A TASK-049 já resolveu parte disso pintando por sentido as relações da classe selecionada e recuando as demais (opacidade 0.35) — mas num diagrama desse tamanho as classes relacionadas continuam espalhadas por todo o canvas, longe umas das outras e do card selecionado, então "seguir a linha" com o olho continua difícil. O usuário pediu explicitamente um modal: selecionar o card, apertar `V`, e ver **só** aquela classe e as classes com que ela se relaciona.

**Sem ritual de 3 opções/ADR**: é um modo de visualização 100% efêmero (nada persistido, nada recalculado no diagrama real), sem tocar contrato/schema JSON — mesmo padrão já aceito para decisões de UI de `frontend-diagramas` (TASK-038..045, TASK-049, TASK-052). A TASK-055, irmã desta, **persiste** um diagrama novo — mas também sem tocar o contrato (ver a task).

## Problema
Num diagrama grande, descobrir a vizinhança de uma classe exige uma das duas coisas, e nenhuma resolve bem:
1. Ler a lista "Relações" do inspector — dá os nomes, mas em texto, sem os atributos das classes vizinhas nem a notação UML.
2. Seguir visualmente os conectores destacados pela TASK-049 — funciona em diagramas pequenos, mas com 190 relações e 14 colunas de cards as pontas ficam a telas de distância da classe selecionada.

## Objetivo
Com uma classe selecionada no Diagrama de Classes, apertar `V` abre um modal que renderiza **só** o subgrafo daquela classe: ela mesma, as classes que se relacionam diretamente com ela, e os conectores entre essas classes — com a mesma notação UML e o mesmo destaque por sentido já existentes, num layout próprio que cabe na tela sem precisar de pan. O mesmo modal também abre por um botão no inspector da classe, para a funcionalidade não depender de o usuário adivinhar o atalho (RN-09).

## Fora de escopo
- **Editar dentro do modal** (mover card, renomear, criar/excluir relação): o modal é só leitura. Editar continua no canvas.
- **Reancorar o foco clicando numa classe vizinha dentro do modal** ("aprofundar" a navegação) — barato de fazer depois, mas não foi pedido; fica registrado aqui como evolução natural, não implementar sem o usuário pedir.
- **Vizinhança de 2+ níveis** (vizinhos dos vizinhos) — o pedido é explicitamente "as outras classes que ele tem relação".
- **Diagrama de Objetos**: o `ObjectDiagramCanvas` nem tem o destaque por seleção da TASK-049 ainda (nenhum `emphasis` no módulo). Estender para lá exigiria construir aquela base antes; não pedido, não fazer agora.
- **Persistir o subgrafo como diagrama novo** — é exatamente a TASK-055, task irmã.
- **Cards de comentário (`notes`) dentro do modal**: nota é anotação livre no canvas, sem vínculo com nenhuma classe (ADR-013) — não há critério para dizer que uma nota "pertence" ao subgrafo. Ficam de fora.

## Comportamento atual
Selecionar uma classe pinta seus conectores por sentido e recua os demais (`connectorEmphasis`, `ClassDiagramCanvas.tsx`), e lista as relações em texto no inspector (`content.relationships.filter(r => r.from === id || r.to === id)`). Todos os cards do diagrama continuam renderizados, nas posições reais. A tecla `V` não faz nada hoje (verificado: nenhuma ocorrência de `'v'`/`'V'`/`KeyV` como atalho em `src/`).

## Comportamento esperado
- Com uma classe selecionada e o foco fora de campo de texto, `V` (maiúscula ou minúscula) abre o **modal de foco**.
- O modal renderiza o **subgrafo induzido**: a classe focada + toda classe ligada a ela por pelo menos uma relação + **todas** as relações cujas duas pontas estão nesse conjunto (inclusive relações entre duas vizinhas — ver RN-02).
- Layout próprio, calculado só para o modal: classe focada ao centro; vizinhas que apontam **para** ela (`incoming`) numa coluna à esquerda; vizinhas para as quais ela aponta (`outgoing`) numa coluna à direita.
- Conectores desenhados pelo `Connector.tsx` já existente (mesma notação UML ortogonal, RN-01/RN-02 do agente `frontend-diagramas`), com o mesmo esquema de cor por sentido da TASK-049.
- O conteúdo cabe inteiro na área do modal, sem exigir pan (escala calculada a partir dos bounds do subgrafo).
- `Esc`, clique fora ou o `×` fecham (comportamento que o `Modal` genérico já dá de graça).
- Nada no diagrama real muda: nem posição de card, nem seleção, nem `content` — fechar o modal devolve o canvas exatamente como estava.

## Regras de negócio
- **RN-01**: o modal **nunca** modifica `content`. O layout do subgrafo é calculado em memória, sobre cópias — as posições reais (`x`/`y`) das classes no diagrama continuam intactas, e nenhum autosave é disparado por abrir/fechar o modal.
- **RN-02**: o subgrafo é o **induzido** — inclui as relações entre duas classes vizinhas, não só as que tocam a classe focada. Omiti-las produziria um desenho que mente sobre o modelo (duas classes lado a lado que na verdade se relacionam apareceriam soltas). Para não perder a leitura de "quem é o foco", só as relações que tocam a classe focada recebem cor por sentido (`outgoing`/`incoming`); as relações entre vizinhas ficam em `normal`.
- **RN-03**: `V` funciona **também para `visualizador`** (`readOnly`) — é visualização, não edição. Diferente do atalho `Delete`/`Backspace` da TASK-052, que é bloqueado em `readOnly`.
- **RN-04**: `V` nunca dispara com o foco num `input`/`textarea`/`select` — senão digitar a letra "v" no nome de uma classe abriria o modal. Mesma guarda de `document.activeElement` já usada na TASK-052.
- **RN-05**: `V` só faz efeito com uma **classe** selecionada. Com uma relação ou um comentário selecionado, ou sem seleção, não faz nada (não abre modal vazio).
- **RN-06**: autorrelação (`from === to`, uma classe ligada a ela mesma) não pode quebrar o layout nem duplicar o card da classe focada.
- **RN-07**: classe sem nenhuma relação abre o modal mesmo assim, com só o card dela e um aviso curto de que não há relações — não um modal em branco nem um erro.
- **RN-08**: uma vizinha que é ao mesmo tempo `incoming` e `outgoing` (relações nos dois sentidos com a classe focada) aparece **uma única vez**, na coluna de `outgoing`. Card duplicado seria pior que uma coluna imprecisa.
- **RN-09**: o atalho `V` não pode ser o **único** caminho — atalho de teclado não é descobrível, e uma funcionalidade que ninguém encontra é uma funcionalidade que não existe. A seção "Relações" do inspector da classe selecionada ganha um botão que abre exatamente o mesmo modal, com o atalho indicado no rótulo (ex.: "Ver só as relacionadas (V)"). Um único caminho de código para os dois gatilhos — o botão não pode ter comportamento próprio.

## Critérios de aceitação
- [ ] CA-01: Com uma classe selecionada, `V` abre o modal mostrando o card dela e os cards de todas as classes diretamente relacionadas — e nenhuma outra.
- [ ] CA-02: Os conectores dentro do modal usam a notação UML correta por tipo (os 5 símbolos) e multiplicidade nas pontas, iguais aos do canvas.
- [ ] CA-03: Relações que tocam a classe focada aparecem coloridas por sentido (`--class-accent` para `outgoing`, `--rel-incoming` para `incoming`); relações entre duas vizinhas aparecem em `normal` (RN-02).
- [ ] CA-04: Fechar o modal (`Esc`, clique fora e `×`) devolve o canvas com a mesma seleção e as mesmas posições de card de antes — nenhum diff em `content` (RN-01).
- [ ] CA-05: `V` com o foco num campo de texto digita a letra normalmente e não abre o modal (RN-04).
- [ ] CA-06: `V` sem seleção, ou com relação/comentário selecionado, não abre nada (RN-05).
- [ ] CA-07: Um usuário `visualizador` (`readOnly`) consegue abrir o modal (RN-03).
- [ ] CA-08: Classe sem nenhuma relação abre o modal com o próprio card e o aviso de "sem relações" (RN-07).
- [ ] CA-09: Autorrelação e vizinha bidirecional renderizam sem card duplicado e sem quebrar o layout (RN-06/RN-08).
- [ ] CA-10: Com uma classe de alta conectividade do diagrama real do ELIMS (ex.: `Sample`, 21 relações), o conteúdo do modal cabe inteiro na área visível, legível, sem precisar de pan.
- [ ] CA-11: O botão no inspector da classe selecionada abre o mesmo modal, com o mesmo resultado do atalho (RN-09) — inclusive para `visualizador`.
- [ ] CA-12: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [ ] CA-13: Validação visual ao vivo (dev server local contra o Supabase real), nos dois temas.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
- **Novo** `src/features/class-diagram/focusSubgraph.ts` — lógica pura, sem React (padrão `contentOperations.ts`): monta o subgrafo induzido e calcula o layout do modal. **Este módulo é a fronteira compartilhada com a TASK-055** — desenhar a assinatura já pensando nos dois consumidores (ver "Relação com a TASK-055").
- **Novo** `src/features/class-diagram/ClassFocusModal.tsx` — o overlay, montado sobre o `Modal` genérico de `diagram-shell/`.
- `src/features/class-diagram/ClassDiagramCanvas.tsx` — `useEffect` do atalho `V` + estado `focusClassId` + montagem condicional do modal + o botão da RN-09 no `ClassInspector` (seção "Relações", ~linhas 438-451).
- `src/index.css` — bloco novo comentado com `TASK-054` (variante larga do modal + área de canvas do foco). Não editar blocos de outras tasks.
- Reaproveitar sem alterar comportamento: `Modal` (`diagram-shell/Modal.tsx` — já fecha por `Esc`/clique fora/`×`, com animação de saída), `ClassCard.tsx` (em modo não interativo), `Connector.tsx` + `ConnectorEmphasis`, `estimateClassCardHeight`/`CLASS_CARD_WIDTH` (`types.ts`).
### Banco de dados
Nenhuma migration — nada é persistido.
### Integrações
Nenhuma. Não toca `src/features/import-export/` nem o schema Zod (contrato público intacto).
### Segurança
Nenhuma superfície nova — só leitura de dados já carregados no cliente, nenhuma chamada nova ao Supabase.

## Plano de implementação
- [ ] Criar `feature/foco-classe-relacionadas` a partir de `main`.
- [ ] `focusSubgraph.ts`: `buildFocusSubgraph(content, focusClassId)` → `{ classes, relationships }` (subgrafo induzido, RN-02/RN-06) e `layoutFocusSubgraph(subgraph, focusClassId)` → classes reposicionadas (centro + 2 colunas, RN-08), espaçamento vertical por `estimateClassCardHeight` e `controlX` recalculado por relação.
- [ ] Testes unitários de `focusSubgraph.ts` **antes** do componente (é onde mora a regra; o componente é casca).
- [ ] `ClassFocusModal.tsx`: `Modal` + `ClassCard`s posicionados pelo layout + `<svg>` de `Connector`s, escala estática calculada a partir dos bounds para caber na área do modal. Se `useCanvasZoomPan` (`diagram-shell/`) puder ser reaproveitado sem precisar mudar sua assinatura para o `DiagramShell`, preferir; **não** refatorá-lo para caber aqui — o custo/risco não se justifica para um modal que já cabe na tela por construção.
- [ ] Fiar em `ClassDiagramCanvas.tsx`: estado + `useEffect` do atalho `V` (guarda de `activeElement`, RN-04; sem a guarda de `readOnly` da TASK-052, RN-03) + botão no inspector chamando o mesmo `setFocusClassId` (RN-09).
- [ ] CSS do modal largo + área do canvas de foco.
- [ ] Testes de componente (Testing Library).
- [ ] Validar ao vivo contra o diagrama real do ELIMS (classe `Sample`), dois temas.

## Estratégia de testes
- [ ] Unitários (`focusSubgraph.test.ts`, novo): subgrafo induzido inclui relação entre vizinhas (RN-02); exclui classe não relacionada; autorrelação não duplica card (RN-06); vizinha bidirecional aparece uma vez, do lado `outgoing` (RN-08); classe sem relação retorna só ela (RN-07); layout não sobrepõe cards e não muta o `content` de entrada (RN-01).
- [ ] Componente (`ClassDiagramCanvas.test.tsx`): `V` abre com classe selecionada; não abre sem seleção / com relação ou nota selecionada (RN-05); não abre com foco em campo de texto (RN-04); abre em `readOnly` (RN-03); o botão do inspector abre o mesmo modal (RN-09); `Esc` fecha sem alterar `content` (CA-04).
- [ ] Integração: não aplicável (nenhuma chamada nova ao Supabase).
- [ ] E2E: não aplicável (o repositório não tem E2E — ver `.claude/rules/global.md`).
- [ ] Manual: dev server local contra o Supabase real, diagrama real do ELIMS, dois temas — `Sample` (21 relações, CA-10), uma classe folha (CA-08) e o ciclo abrir/fechar confirmando que nada foi salvo (CA-04).

## Riscos e rollback
Risco baixo e contido: feature puramente aditiva, sem persistência, sem migration, sem tocar contrato. O risco real é de **qualidade do layout**, não de correção — um subgrafo com muitas vizinhas (ex.: `Sample`, 21) pode ficar com colunas altas demais e escala pequena demais para ler. Mitigação: CA-10 valida exatamente esse caso contra o dado real antes de fechar a task; se não couber bem, ajustar o layout (ex.: mais de uma coluna por lado) ainda dentro desta task. Rollback: descartar a branch — `main` não é tocada.

## Relação com a TASK-055
A TASK-055 (tecla `N`: criar um **diagrama novo** com o mesmo subconjunto) consome o **mesmo** `focusSubgraph.ts` desta task — mesmo conjunto de classes/relações e mesmo layout, para que o diagrama gerado abra parecido com o que o usuário acabou de ver no modal. Consequências práticas:

1. Implementar a TASK-054 primeiro, na mesma branch.
2. `buildFocusSubgraph`/`layoutFocusSubgraph` são funções **puras sobre `ClassDiagramContent`**, sem nenhuma dependência de React, de modal ou de Supabase — a TASK-055 precisa chamá-las fora de qualquer contexto de renderização.
3. Se durante a TASK-055 aparecer necessidade de mudar a assinatura dessas funções, mudar no módulo (com os testes desta task passando), nunca duplicar a lógica.

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Link para o handoff ativo, quando aplicável.
