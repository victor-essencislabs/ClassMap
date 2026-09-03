---
id: TASK-052
title: Excluir com Delete/Backspace + redimensionar o card de comentário
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram]
related_use_cases: []
related_adrs: []
---

# TASK-052 — Excluir com Delete/Backspace + redimensionar o comentário

## Contexto
Dois pedidos do usuário na mesma sessão da TASK-051: (1) poder excluir um card de classe selecionado apertando Delete, sem precisar abrir o inspector e clicar em "Excluir classe"; (2) poder aumentar o tamanho do card de comentário arrastando com o mouse, para ler o texto sem precisar aproximar o zoom.

**Sem ritual de 3 opções/ADR**: as duas são melhorias de interação dentro do que já existe (excluir e redimensionar já eram possíveis por outros caminhos — botão no inspector, e o próprio zoom do canvas — isto só adiciona atalhos mais diretos), sem tocar contrato/schema. Mesmo padrão já aceito para decisões de UI de `frontend-diagramas` (TASK-038..045, TASK-049).

## Problema
1. Excluir uma classe/relação/nota exigia abrir o inspector e clicar no botão "Excluir..." — sem atalho de teclado.
2. O card de comentário tinha largura fixa (200px) e altura automática pelo texto, sem jeito de redimensionar — um comentário mais longo só ficava legível aproximando o zoom do canvas inteiro.

## Objetivo
1. Com uma classe, relação ou comentário selecionado, apertar `Delete` ou `Backspace` exclui o item selecionado (mesmo efeito do botão "Excluir..." correspondente) — desde que o foco não esteja num campo de texto.
2. O card de comentário ganha um grip no canto inferior direito — arrastar aumenta/diminui largura e altura, com um piso mínimo.

## Fora de escopo
- Desfazer (undo) da exclusão — fora de escopo, não pedido.
- Redimensionar card de classe — só o de comentário foi pedido (o de classe já cresce automaticamente com os atributos).
- Redimensionar por lados/bordas (só o grip no canto, redimensiona largura+altura juntos).

## Comportamento atual
Exclusão só pelo botão "Excluir classe"/"Excluir relação"/"Excluir comentário" no inspector. Card de comentário sempre 200px de largura, altura automática, sem `width`/`height` no modelo (`DiagramNote`).

## Comportamento esperado
- `Delete`/`Backspace`: com uma seleção ativa (classe, relação ou nota) e o foco fora de um campo de texto (`input`/`textarea`/`select`), exclui o item selecionado.
- `DiagramNote` ganha `width?`/`height?` opcionais — quando definidos (arrastando o grip), vencem a largura fixa/altura automática. Piso de `NOTE_MIN_WIDTH`/`NOTE_MIN_HEIGHT` (140×50), para não desaparecer.
- Tamanho manual entra no cálculo de bounds do "ajustar à tela" (`noteToBoundedNode`), mesmo tratamento já dado à posição.

## Regras de negócio
- RN-01: `Delete`/`Backspace` nunca dispara com o foco num `input`/`textarea`/`select` — não pode apagar o card inteiro enquanto o usuário edita um campo de texto (nome, atributo, multiplicidade, texto do comentário, busca da sidebar, nome do diagrama).
- RN-02: Só funciona com `!readOnly` — visualizador não exclui nada por teclado (mesmo reforço já aplicado aos botões).
- RN-03: Arrastar o grip nunca move o card (`stopPropagation` no próprio grip) — resize e mover são interações independentes.
- RN-04: Tamanho manual do comentário nunca fica abaixo do piso (`NOTE_MIN_WIDTH`/`NOTE_MIN_HEIGHT`).

## Critérios de aceitação
- [x] CA-01: Selecionar uma classe e apertar `Delete` (ou `Backspace`) a exclui, junto com qualquer relação que a referenciasse.
- [x] CA-02: Selecionar uma relação e apertar `Delete`/`Backspace` a exclui, sem afetar as classes.
- [x] CA-03: Selecionar um comentário e apertar `Delete`/`Backspace` o exclui.
- [x] CA-04: Com o foco num campo de texto (ex.: editando o nome da classe), `Delete`/`Backspace` edita o texto normalmente — nunca exclui o card.
- [x] CA-05: Sem nenhuma seleção, `Delete`/`Backspace` não faz nada.
- [x] CA-06: Visualizador (`readOnly`): `Delete`/`Backspace` não exclui nada.
- [x] CA-07: Arrastar o grip do card de comentário aumenta largura e altura juntas, sem mover a posição do card.
- [x] CA-08: O tamanho nunca fica abaixo do piso mínimo, mesmo arrastando bem além do limite.
- [x] CA-09: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [x] CA-10: Validação visual ao vivo (dev server local).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/types.ts` (`DiagramNote.width?`/`height?`, `NOTE_MIN_WIDTH`/`NOTE_MIN_HEIGHT`), `contentOperations.ts` (`noteToBoundedNode` considera tamanho manual), `NoteCard.tsx` (grip de redimensionar, `onResize`), `ClassDiagramCanvas.tsx` (`useEffect` do atalho de teclado, `onResize` passado ao `NoteCard`), `src/index.css` (`.note-resize-handle`, `overflow-y: auto` no `.note-card`).
### Banco de dados
Nenhuma migration — `width`/`height` vivem dentro do JSONB `diagrams.content` já existente, campos novos opcionais.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] `NOTE_MIN_WIDTH`/`NOTE_MIN_HEIGHT` + `DiagramNote.width?`/`height?` em `types.ts`.
- [x] `noteToBoundedNode` considera tamanho manual.
- [x] Grip de redimensionar em `NoteCard.tsx` (pointer down/move/up próprios, `stopPropagation`, medição da altura renderizada quando ainda automática).
- [x] `onResize` fiado em `ClassDiagramCanvas.tsx`.
- [x] CSS do grip + `overflow-y: auto`.
- [x] `useEffect` do atalho `Delete`/`Backspace` em `ClassDiagramCanvas.tsx`, com guarda de campo de texto.
- [x] Testes novos.
- [x] Validar visualmente ao vivo.

## Estratégia de testes
- [x] Componente (`ClassDiagramCanvas.test.tsx`): excluir classe/relação/nota por tecla, guarda de campo de texto, sem seleção não faz nada, visualizador não exclui nada; grip redimensiona até o piso mínimo, cresce além do padrão, não move o card.
- [ ] E2E: não aplicável.
- [x] Manual: validado ao vivo — achado e documentado um limite do ambiente de automação do navegador (não do código), ver "Divergências".

## Riscos e rollback
Baixo risco — aditivo, sem afetar contrato público nem diagramas existentes (`width`/`height` ausentes mantêm o comportamento atual). Rollback: reverter os arquivos alterados.

## Registro de execução

### Alterações realizadas
- `types.ts`: `DiagramNote` ganhou `width?`/`height?`; `NOTE_MIN_WIDTH = 140`/`NOTE_MIN_HEIGHT = 50` (piso do redimensionamento).
- `contentOperations.ts`: `noteToBoundedNode` usa `note.width ?? NOTE_CARD_WIDTH`/`note.height ?? estimateNoteCardHeight(note)` — tamanho manual tem prioridade.
- `NoteCard.tsx`: `cardRef` (mede a altura renderizada quando ainda automática, necessário pra saber de onde partir o arraste quando `note.height` nunca foi definido manualmente); `.note-resize-handle` no canto inferior direito, com seus próprios `onPointerDown`/`onPointerMove`/`onPointerUp` — todos com `stopPropagation` pra não também disparar o arraste de mover o card (RN-03); `onResize(id, width, height)` novo na prop, clampado ao piso (`Math.max(NOTE_MIN_WIDTH, ...)`/`Math.max(NOTE_MIN_HEIGHT, ...)`) antes de chamar.
- `ClassDiagramCanvas.tsx`: `onResize` passado ao `NoteCard` (`updateNote(id, {width, height})`); novo `useEffect` que registra um listener de `keydown` em `window` só quando `!readOnly && selection` — ignora quando `document.activeElement` é `INPUT`/`TEXTAREA`/`SELECT`, senão despacha pra `removeClass`/`removeRelationship`/`removeNote` conforme `selection.type`. `selection` é capturado numa constante local (`current`) dentro do efeito antes de definir o handler, pra o narrowing de tipo do TypeScript sobreviver dentro do closure (limitação conhecida: TS não propaga narrowing de `useEffect` pra dentro de uma função aninhada).
- `src/index.css`: `.note-resize-handle` (grip diagonal via `linear-gradient`, mesmo efeito visual do `resize` nativo de `<textarea>`, opacidade baixa por padrão e mais visível em hover/seleção — mesmo padrão já usado no ponto de controle do conector); `.note-card` ganhou `overflow-y: auto` (texto que não cabe numa altura manual menor rola em vez de vazar).
- Testes novos em `ClassDiagramCanvas.test.tsx`: 3 casos de redimensionamento (encolhe até o piso, cresce além do padrão, não move o card) + 6 casos do atalho de teclado (exclui classe/relação/nota, guarda de campo de texto, sem seleção não faz nada, visualizador não exclui nada).

### Arquivos principais
- `src/features/class-diagram/types.ts`
- `src/features/class-diagram/contentOperations.ts`
- `src/features/class-diagram/NoteCard.tsx`
- `src/features/class-diagram/ClassDiagramCanvas.tsx`
- `src/index.css`
- `src/features/class-diagram/ClassDiagramCanvas.test.tsx`

### Decisões
- **`Delete` e `Backspace` fazem a mesma coisa** — convenção já usada em ferramentas de diagrama comparáveis (Figma, draw.io), cobre tanto teclados com tecla `Delete` dedicada quanto os que só têm `Backspace`.
- **Atalho generalizado pras 3 seleções** (classe/relação/nota), não só classe como o pedido original mencionava — o pedido foi interpretado como "o padrão esperado de excluir com tecla", e restringir só à classe criaria uma inconsistência (por que Delete funciona pra classe mas não pra relação/nota, se as 3 já têm botão "Excluir..." equivalente?). Mesmo raciocínio de generalização já usado antes nesta sessão (TASK-049 recolorir por sentido em vez de só o caso citado).
- **Grip só redimensiona os dois eixos juntos** (não largura/altura separadas por bordas distintas) — mais simples de implementar e usar, suficiente pro pedido ("aumentar o tamanho... pra ficar mais visível").
- **`current = selection` dentro do efeito** — não é preferência estética, é necessário: sem essa captura, TypeScript não consegue provar dentro do `handleKeyDown` aninhado que `selection` continua não-nulo (limitação de narrowing em closures), e o código ficaria sem tipagem segura ali.

### Divergências
**Achado durante a validação ao vivo, não é bug do código**: o ambiente de automação do navegador usado nesta sessão não consegue disparar a exclusão nativa de caractere (Backspace/Delete) dentro de um `<input>`/`<textarea>` real — só o `<button>` de digitar caracteres funciona; a tecla em si nunca chega a apagar um caractere de um campo, mesmo sem nenhum listener da TASK-052 envolvido (reproduzido também com zero seleção ativa, cenário em que o `useEffect` desta task nem registra o listener). Confirmado que o handler desta task nunca interfere: um `dispatchEvent` sintético de `Backspace` direto via JS no campo de nome da classe voltou `defaultPrevented: false`. O comportamento real esperado (edição normal de texto continua funcionando) foi validado indiretamente — digitar caracteres normalmente funciona com uma seleção ativa (`NovaClasse` → `NovaClasseXYZ` digitado com sucesso enquanto o listener estava registrado) — e a exclusão por tecla, fora de campo de texto, foi confirmada funcionando para os 3 tipos de seleção.

### Pendências
Nenhuma.

## Validação

```
npx vitest run src/features/class-diagram/ClassDiagramCanvas.test.tsx
✓ 5 arquivos de teste, 87 testes (9 novos desta task)

npm run build
✓ built in 468-903ms (sem erro de typecheck)

npm run lint
(mesmos 8 warnings já existentes na sessão, nenhum novo)

npx vitest run --exclude "**/.claude/worktrees/**"
✓ 35 arquivos de teste, 283 testes (274 antes desta task + 9 novos) — 1 falha intermitente
  numa reexecução isolada (DiagramsRouteDispatcher.test.tsx, flakiness já documentada em
  CONTEXT.md, não relacionada a esta task); limpo de novo na rodada seguinte.
```

**Validação visual ao vivo** (dev server local, painel de teste descartável "TASK-052 teste delete e resize" no projeto ELIMS real, excluído ao final):
- Criada uma classe → `Delete` a excluiu (0 classes).
- Criadas 2 classes + 1 relação entre elas → `Backspace` na relação selecionada a excluiu, mantendo as 2 classes.
- Criado um comentário → `Delete` o excluiu.
- Criado outro comentário → arrastar o grip do canto (351,144)→(460,230 em tela) cresceu de 200×auto para 396×210px, sem mover a posição (`left`/`top` inalterados) — confirmado tanto via inspeção de estilo computado quanto visualmente por screenshot.
- Editar o nome de uma classe com uma seleção ativa (listener registrado) continuou funcionando normalmente ao digitar (`type`).

## Handoff
Nenhum handoff necessário — task implementada de ponta a ponta nesta sessão (pedido → implementação → testes → validação visual ao vivo, incluindo a investigação da divergência de ambiente registrada acima).
