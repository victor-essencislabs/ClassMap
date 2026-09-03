---
id: TASK-053
title: Cards de comentário e excluir com Delete/Backspace no Diagrama de Objetos
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [object-diagram, class-diagram]
related_use_cases: []
related_adrs: [ADR-013]
---

# TASK-053 — Comentário e Delete/Backspace no Diagrama de Objetos

## Contexto
Pedido do usuário (2026-09-03): as TASK-051 (cards de comentário) e TASK-052 (excluir com Delete/Backspace, redimensionar comentário) foram implementadas só no Diagrama de Classes — o usuário apontou que o Diagrama de Objetos ficou de fora das duas.

**Sem ritual de 3 opções/ADR novo**: é a mesma decisão já tomada na ADR-013 (comentário interno ao ClassMap, fora do contrato) e o mesmo padrão de UI já aceito na TASK-052 (Delete/Backspace) — aqui só estende o alcance às duas telas, não muda nenhuma decisão.

## Problema
`ObjectDiagramContent` não tinha `notes`, `ObjectDiagramCanvas.tsx` não tinha botão "+ Nota" nem atalho de teclado para excluir — o Diagrama de Objetos ficou uma geração atrás do Diagrama de Classes nessas duas capacidades.

## Objetivo
Diagrama de Objetos ganha exatamente as mesmas duas capacidades já existentes no Diagrama de Classes: cards de comentário (texto + cor + redimensionável) e excluir o item selecionado (objeto, link ou comentário) com `Delete`/`Backspace`.

## Fora de escopo
- Qualquer mudança de comportamento no Diagrama de Classes (só extensão pro Diagrama de Objetos).
- Qualquer novo tipo de anotação além do que já existe (`DiagramNote` reaproveitado tal como é).

## Comportamento atual
`ObjectDiagramContent` só tinha `objects`/`links`. Sem botão "+ Nota", sem atalho de teclado pra excluir.

## Comportamento esperado
Mesmo comportamento já documentado em TASK-051/TASK-052, agora também no Diagrama de Objetos:
- `ObjectDiagramContent.notes?: DiagramNote[]` (mesmo tipo do Diagrama de Classes, reaproveitado — ver "Decisões").
- Botão "+ Nota" na topbar, `NoteCard`/`NoteInspector` reaproveitados (mesmos componentes do Diagrama de Classes — são genéricos, não fazem referência a classe nenhuma).
- Grip de redimensionar no card de comentário.
- `Delete`/`Backspace` exclui objeto/link/comentário selecionado, com a mesma guarda de campo de texto.

## Regras de negócio
- RN-01 a RN-04: idênticas às da TASK-052 (nunca dispara com foco em campo de texto; só `!readOnly`; grip nunca move o card; piso mínimo de tamanho).
- RN-05: comentário nunca entra em nenhum formato de import/export do Diagrama de Objetos (hoje isso já é garantido por construção — TASK-005 nunca implementou export/import para objetos, ver "Dívida técnica conhecida" em `CONTEXT.md`).

## Critérios de aceitação
- [x] CA-01: "+ Nota" cria um card de comentário vazio, já selecionado, no Diagrama de Objetos.
- [x] CA-02: Editar texto/cor no inspector reflete no card imediatamente.
- [x] CA-03: "Excluir comentário" remove só a nota, sem afetar objetos/links.
- [x] CA-04: Grip no canto redimensiona (mínimo e crescimento), sem mover a posição.
- [x] CA-05: `Delete`/`Backspace` exclui objeto, link ou comentário selecionado — nunca com o foco num campo de texto.
- [x] CA-06: Um diagrama de objetos salvo antes desta task (sem `notes`) continua carregando sem erro.
- [x] CA-07: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [x] CA-08: Validação visual ao vivo.

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/object-diagram/types.ts` (`notes?` em `ObjectDiagramContent`, reaproveitando `DiagramNote` de `class-diagram/types.ts`), `contentOperations.ts` (`addNote`/`updateNote`/`removeNote`/`noteToBoundedNode`; `removeObject` corrigido para preservar `notes`), `ObjectDiagramCanvas.tsx` (botão "+ Nota", render de `NoteCard`, `NoteInspector`, atalho de teclado, `isBackgroundTarget` reconhece `.note-card`, bounds do "ajustar à tela" incluem notas, `.empty-hint` também checa `notes`). `class-diagram/NoteInspector.tsx` (novo — extraído de dentro de `ClassDiagramCanvas.tsx` pra ser reaproveitado pelos dois diagramas, sem mudança de comportamento).
### Banco de dados
Nenhuma migration — `notes` vive dentro do JSONB `diagrams.content` já existente (campo novo opcional, mesmo padrão da TASK-051).
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] Extrair `NoteInspector` de `ClassDiagramCanvas.tsx` para `class-diagram/NoteInspector.tsx` (reaproveitável).
- [x] `notes?` em `ObjectDiagramContent`, reaproveitando `DiagramNote`/`NOTE_CARD_WIDTH`/`estimateNoteCardHeight` de `class-diagram/types.ts`.
- [x] `addNote`/`updateNote`/`removeNote`/`noteToBoundedNode` em `object-diagram/contentOperations.ts`; corrigir `removeObject` (mesmo bug latente já corrigido em `removeClass`, TASK-051).
- [x] Fiação em `ObjectDiagramCanvas.tsx`: botão, render de `NoteCard`/`NoteInspector` (reaproveitados de `class-diagram/`), `isBackgroundTarget`, bounds do fit-to-screen, `useEffect` do atalho de teclado, condição do `.empty-hint`.
- [x] Testes novos.
- [x] Validar visualmente ao vivo.

## Estratégia de testes
- [x] Unitários: `object-diagram/contentOperations.test.ts` (mesmos 9 casos da TASK-051/052 do lado de classes, adaptados: criar/atualizar/excluir comentário, ids únicos, `notes` ausente no conteúdo legado, `noteToBoundedNode` com/sem tamanho manual, `removeObject` preserva `notes`, round-trip JSON).
- [x] Componente: `object-diagram/ObjectDiagramCanvas.test.tsx` (14 casos novos: criar/editar/colorir/excluir comentário, redimensionar mínimo/máximo/sem mover, fit-to-screen não quebra posição; Delete/Backspace pra objeto/link/comentário, guarda de campo de texto, sem seleção, visualizador; `isBackgroundTarget` reconhece `.note-card`).
- [ ] E2E: não aplicável.
- [x] Manual: validado ao vivo.

## Riscos e rollback
Baixo risco — mesmo padrão aditivo já usado na TASK-051/052, só estendido a uma segunda tela. Rollback: reverter os arquivos alterados.

## Registro de execução

### Alterações realizadas
- `class-diagram/NoteInspector.tsx` (novo): extraído de dentro de `ClassDiagramCanvas.tsx` sem mudar comportamento — só para poder ser importado também por `ObjectDiagramCanvas.tsx`.
- `object-diagram/types.ts`: `import type { DiagramNote } from '../class-diagram/types'`; `ObjectDiagramContent.notes?: DiagramNote[]`; `emptyObjectDiagramContent()` inclui `notes: []`.
- `object-diagram/contentOperations.ts`: importa `NOTE_CARD_WIDTH`/`estimateNoteCardHeight`/`DiagramNote` de `class-diagram/types.ts` (reaproveitados, não duplicados); `addNote`/`updateNote`/`removeNote`/`noteToBoundedNode`, mesmo padrão de `class-diagram/contentOperations.ts`; `removeObject` corrigido para espalhar `...content` (mesmo achado da TASK-051, agora também aqui).
- `object-diagram/ObjectDiagramCanvas.tsx`: `Selection` ganhou o variante `'note'`; `isBackgroundTarget` reconhece `.note-card`; `allBoundedNodes()` combina objetos + notas; botão "+ Nota" na topbar (entre "Link" e "+ Objeto"); `handleAddNote`/`updateNote`/`handleRemoveNote`; `useEffect` do atalho `Delete`/`Backspace` (idêntico ao de `ClassDiagramCanvas.tsx`, adaptado para `handleRemoveObject`/`handleRemoveLink`/`handleRemoveNote`); render de `NoteCard` depois dos objetos no `canvas-viewport`; `NoteInspector` no ramo de seleção `note` do inspector; condição do `.empty-hint` passou a checar `(content.notes ?? []).length === 0` também (mesmo achado/correção da TASK-051, aplicado preventivamente aqui desde o início, já que o padrão era conhecido).
- Testes novos em `object-diagram/contentOperations.test.ts` (9 casos) e `object-diagram/ObjectDiagramCanvas.test.tsx` (14 casos), espelhando os equivalentes já escritos para o Diagrama de Classes nas TASK-051/052.

### Arquivos principais
- `src/features/class-diagram/NoteInspector.tsx` (novo)
- `src/features/class-diagram/ClassDiagramCanvas.tsx` (só a extração, sem mudança de comportamento)
- `src/features/object-diagram/types.ts`
- `src/features/object-diagram/contentOperations.ts`
- `src/features/object-diagram/ObjectDiagramCanvas.tsx`
- `src/features/object-diagram/contentOperations.test.ts`
- `src/features/object-diagram/ObjectDiagramCanvas.test.tsx`

### Decisões
- **`DiagramNote`/`NoteCard`/`NoteInspector`/paleta de cor são reaproveitados do Diagrama de Classes, não duplicados** — já eram genéricos (nenhum deles faz referência a uma classe específica), e `object-diagram/` já importava de `class-diagram/` antes desta task (`DiagramClass`, `resolveConnectClick`) — mesmo precedente de dependência entre os dois módulos, não uma direção nova.
- **CSS não precisou de nenhuma mudança** — `.note-card`/`.note-resize-handle`/`.field textarea` já estavam sob os seletores `.diagram-shell-canvas`/`.diagram-shell-inspector`, que o `DiagramShell` compartilhado aplica igualmente às duas telas.
- **`.empty-hint` já nasceu corrigido aqui** (checando `notes` desde o início), diferente do Diagrama de Classes onde a sobreposição só foi achada durante a validação ao vivo da TASK-051 — o padrão já era conhecido, então foi aplicado preventivamente em vez de esperar redescobrir o mesmo bug.

### Divergências
Nenhuma.

### Pendências
Nenhuma.

## Validação

```
npx vitest run src/features/object-diagram/contentOperations.test.ts
✓ 5 arquivos de teste, 89 testes (9 novos desta task)

npx vitest run src/features/object-diagram/ObjectDiagramCanvas.test.tsx
✓ 5 arquivos de teste, 79 testes (14 novos desta task)

npm run build
✓ built in 751ms (sem erro de typecheck)

npm run lint
(mesmos 8 warnings já existentes na sessão, nenhum novo)

npx vitest run --exclude "**/.claude/worktrees/**"
✓ 35 arquivos de teste, 306 testes (283 antes desta task + 23 novos)
```

**Validação visual ao vivo** (dev server local, painel de teste descartável "TASK-053 teste notas objetos" no projeto ELIMS real, excluído ao final — o painel real "Diagrama de Objetos" do usuário não foi tocado): "+ Nota" criou o card sem o aviso "Nenhum objeto ainda" aparecer por cima (confirma a correção preventiva do `.empty-hint`); escolhida a cor azul, tingiu o card imediatamente; texto digitado apareceu em tempo real; `Delete` excluiu o comentário selecionado, e o aviso "Nenhum objeto ainda" voltou a aparecer corretamente (nem objeto nem nota restantes).

## Handoff
Nenhum handoff necessário — task implementada de ponta a ponta nesta sessão (pedido → implementação → testes → validação visual ao vivo).
