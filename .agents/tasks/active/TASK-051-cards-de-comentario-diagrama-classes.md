---
id: TASK-051
title: Cards de comentário no Diagrama de Classes
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-09-03
updated_at: 2026-09-03
affected_modules: [class-diagram, import-export]
related_use_cases: []
related_adrs: [ADR-013]
---

# TASK-051 — Cards de comentário no Diagrama de Classes

## Contexto
Pedido do usuário (2026-09-03, mesma sessão da TASK-050): poder colocar cards de comentário no Diagrama de Classes — texto livre + cor (mesma paleta do card de classe), documentando o que uma cor significa no diagrama (ex.: card vermelho = "classes que precisam ser excluídas", card amarelo = "classes que precisam de ajustes"). Ver `ADR-013` para a decisão (comentário é anotação interna ao ClassMap, nunca entra no contrato JSON de import/export — confirmado diretamente com o usuário).

## Problema
Não havia como anotar/documentar visualmente um diagrama além do que já existe em nome/estereótipo/atributos de classe — nenhum lugar para uma nota livre, sem relação com nenhuma classe específica.

## Objetivo
Usuário `editor` cria um card de comentário em qualquer lugar do canvas (arrastável, como um card de classe), escreve um texto livre e escolhe uma cor opcional da mesma paleta já usada para colorir card de classe (TASK-014/ADR-005). O comentário persiste com o diagrama, mas nunca entra no JSON de exportar/importar.

## Fora de escopo
- Comentário no contrato JSON público — ver ADR-013, Alternativa B, rejeitada.
- Legenda fixa fora do canvas — ver ADR-013, Alternativa C, rejeitada (usuário quer o card dentro do painel, não uma lista à parte).
- Comentário vinculado/ancorado a uma classe específica — é uma anotação livre, independente.
- Paleta de cor própria para comentário — reaproveita `CLASS_COLORS` integralmente.

## Comportamento atual
`ClassDiagramContent` só tem `classes`/`relationships`. Não existe nenhum tipo de nó de anotação no canvas.

## Comportamento esperado
- Novo tipo `DiagramNote` (`id`, `text`, `x`, `y`, `color?`) em `ClassDiagramContent.notes?` (opcional — diagramas salvos antes desta task não têm o campo, tratado como `[]`).
- Botão "+ Nota" na topbar (ao lado de "+ Classe"), cria um card de comentário vazio já selecionado, centralizado na área visível do canvas.
- `NoteCard.tsx`: card arrastável (mesmo padrão de drag do `ClassCard`), mostra o texto (ou um placeholder itálico "Comentário vazio..." quando vazio), tingido pela cor escolhida quando houver.
- Inspector da nota: textarea de texto livre + `ClassColorGrid` (reaproveitado) + "Excluir comentário".
- Notas entram no cálculo de bounds do "ajustar à tela", junto com as classes.
- Notas NUNCA entram no schema de import/export (`exportClassDiagram`/`importClassDiagram`) — nem no contrato Zod (`schema.ts`, que não é tocado nesta task).

## Regras de negócio
- RN-01: Comentário nunca entra no schema Zod de import/export nem no JSON exportado — ver ADR-013.
- RN-02: Cor do comentário é sempre um dos hex de `CLASS_COLORS` (mesma paleta fechada do card de classe), nunca uma paleta própria nem RGB/hex livre.
- RN-03: Só `editor` cria/edita/exclui comentário (mesmo reforço de UI das demais edições — `!readOnly`).

## Critérios de aceitação
- [x] CA-01: "+ Nota" cria um card de comentário vazio, já selecionado, com inspector mostrando textarea + seletor de cor + excluir.
- [x] CA-02: Editar o texto no inspector reflete no card imediatamente.
- [x] CA-03: Escolher uma cor (mesma paleta do card de classe) aplica o acento no card imediatamente.
- [x] CA-04: "Excluir comentário" remove só a nota, sem afetar classes/relações.
- [x] CA-05: Exportar o diagrama como JSON nunca inclui o campo `notes` nem o texto de nenhum comentário, mesmo com comentários criados.
- [x] CA-06: Um diagrama salvo antes desta task (sem o campo `notes` no JSONB) continua carregando sem erro.
- [x] CA-07: `npm run build`, `npm run lint` e `npm test` limpos, sem warning novo.
- [x] CA-08: Validação visual ao vivo (dev server local).

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/class-diagram/types.ts` (`DiagramNote`, `notes?` em `ClassDiagramContent`, `NOTE_CARD_WIDTH`/`estimateNoteCardHeight`), `contentOperations.ts` (`addNote`/`updateNote`/`removeNote`/`noteToBoundedNode`; `removeClass` corrigido para preservar `notes`, ver "Decisões"), `NoteCard.tsx` (novo), `ClassDiagramCanvas.tsx` (botão "+ Nota", render de `NoteCard`, `NoteInspector` novo, `isBackgroundTarget` reconhece `.note-card`, bounds do "ajustar à tela" incluem notas, condição do `.empty-hint` corrigida — ver "Correção pós-implementação"), `src/index.css` (`.note-card`/variantes, `.field textarea`).
### Banco de dados
Nenhuma migration — `notes` vive dentro do JSONB `diagrams.content` já existente, campo novo opcional.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova.

## Plano de implementação
- [x] `DiagramNote` + `notes?` em `types.ts`, `NOTE_CARD_WIDTH`/`estimateNoteCardHeight`.
- [x] `addNote`/`updateNote`/`removeNote`/`noteToBoundedNode` em `contentOperations.ts`; corrigir `removeClass` para preservar `notes` (spread de `content`).
- [x] `NoteCard.tsx` (drag, cor, texto/placeholder).
- [x] Fiação em `ClassDiagramCanvas.tsx`: botão, render, `NoteInspector`, `isBackgroundTarget`, bounds do fit-to-screen.
- [x] CSS (`.note-card` e variantes, `.field textarea`).
- [x] Testes novos (`contentOperations.test.ts`, `classDiagramConversion.test.ts`, `ClassDiagramCanvas.test.tsx`).
- [x] Validar visualmente ao vivo — achado e corrigido: `.empty-hint` cobria a primeira nota de um diagrama sem nenhuma classe (ver "Correção pós-implementação").

## Estratégia de testes
- [x] Unitários: `contentOperations.test.ts` (criar/atualizar/excluir comentário, ids únicos, `notes` ausente no conteúdo legado, `removeClass` preserva `notes`, `noteToBoundedNode`, round-trip JSON).
- [x] Unitários: `classDiagramConversion.test.ts` (export não inclui `notes`, CA-05 como teste explícito).
- [x] Componente: `ClassDiagramCanvas.test.tsx` (criar, editar texto, escolher cor, excluir, zoom não quebra posição, `isBackgroundTarget` reconhece `.note-card`).
- [ ] E2E: não aplicável (sem E2E neste repositório).
- [x] Manual: validado ao vivo contra o dev server local.

## Riscos e rollback
Baixo risco — campo novo opcional, aditivo, sem afetar o contrato público nem diagramas já existentes. Rollback: reverter os arquivos alterados; diagramas com `notes` salvo continuam funcionando no ClassMap (o campo só passa a ser ignorado pela UI antiga).

## Registro de execução

### Alterações realizadas
- `types.ts`: `DiagramNote` (`id`, `text`, `x`, `y`, `color?`), `ClassDiagramContent.notes?: DiagramNote[]` (opcional, backward-compatible), `emptyClassDiagramContent()` inclui `notes: []`, `NOTE_CARD_WIDTH = 200` (mesma largura do card de classe), `estimateNoteCardHeight()` (heurística por tamanho de texto, só para bounds do fit-to-screen).
- `contentOperations.ts`: `addNote`/`updateNote`/`removeNote`/`noteToBoundedNode`, mesmo padrão de `addClass`/`updateClass`/`removeClass`/`toBoundedNode` — sem contraparte em `addRelationship` (nota nunca é origem/destino). `removeClass` corrigido para espalhar `...content` (antes retornava um objeto literal só com `classes`/`relationships`, o que descartaria `notes` silenciosamente ao excluir qualquer classe — achado ao adicionar o campo novo, corrigido com teste de regressão).
- `NoteCard.tsx` (novo): mesmo padrão de drag do `ClassCard.tsx`; mostra o texto ou um placeholder itálico quando vazio; `--note-color` inline quando `note.color` existe (mesma técnica de `--node-color`).
- `ClassDiagramCanvas.tsx`: `Selection` ganhou o variante `'note'`; `isBackgroundTarget` reconhece `.note-card` além de `.node-box`/`button`; `allBoundedNodes()` combina classes + notas para o fit-to-screen (usado no `useEffect` inicial e no botão "Ajustar à tela"); botão "+ Nota" na topbar; `handleAddNote`/`updateNote`/`removeNote`; render de `NoteCard` depois das classes no `canvas-viewport`; `NoteInspector` novo (texto + `ClassColorGrid` reaproveitado + excluir), ramo novo no `inspector` da seleção.
- `src/index.css`: `.note-card` (borda tracejada por padrão, sólida quando selecionada/colorida — reforça "isto é anotação, não uma classe"), `.note-card.selected`, `.note-card.has-color`/`.has-color.selected`, `.note-card-text`/`.note-card-empty`; `.field textarea` adicionado à regra que já estilizava `.field input`/`select` (não existia `<textarea>` em nenhum inspector antes desta task).
- Testes novos: `contentOperations.test.ts` (8 casos — criar, ids únicos, `notes` ausente no conteúdo legado, atualizar preservando outros, excluir sem afetar classes/relações, `noteToBoundedNode`, round-trip JSON, `removeClass` preserva `notes`), `classDiagramConversion.test.ts` (1 caso — export não inclui `notes`/texto do comentário), `ClassDiagramCanvas.test.tsx` (6 casos — criar+selecionar, editar texto, escolher cor, excluir, zoom não quebra posição, `isBackgroundTarget` reconhece `.note-card`).

### Arquivos principais
- `src/features/class-diagram/types.ts`
- `src/features/class-diagram/contentOperations.ts`
- `src/features/class-diagram/NoteCard.tsx` (novo)
- `src/features/class-diagram/ClassDiagramCanvas.tsx`
- `src/index.css`
- `src/features/class-diagram/contentOperations.test.ts`
- `src/features/import-export/classDiagramConversion.test.ts`
- `src/features/class-diagram/ClassDiagramCanvas.test.tsx`

### Decisões
- **Reaproveita `CLASS_COLORS`/`ClassColorGrid` integralmente** — sem paleta nova, sem componente de seleção novo (RN-02/ADR-013).
- **`estimateNoteCardHeight` é uma heurística de caracteres-por-linha**, não uma medição real do DOM — mesmo espírito de `estimateClassCardHeight` (não precisa ser exata, só o suficiente para o cálculo de bounds do "ajustar à tela" não ficar muito errado).
- **`removeClass` corrigido para espalhar `...content`** — bug latente desde antes desta task (inofensivo enquanto `ClassDiagramContent` só tinha `classes`/`relationships`), exposto pela adição de `notes`. Corrigido com teste de regressão explícito.

### Divergências
Nenhuma em relação à ADR-013/pedido original.

### Pendências
Nenhuma.

## Correção pós-implementação

**Achado durante a validação visual ao vivo** (mesma sessão): num diagrama sem nenhuma classe, o aviso `.empty-hint` ("Nenhuma classe ainda — Clique em + Classe para modelar do zero") é centralizado no canvas — a mesma posição padrão onde a primeira nota criada também cai (`handleAddNote` também centraliza na área visível). Como a condição de exibição do aviso só checava `content.classes.length === 0` (sem considerar `notes`), o aviso cobria visualmente a primeira nota criada num diagrama ainda sem classes. **Corrigido**: condição agora é `content.classes.length === 0 && (content.notes ?? []).length === 0`. Revalidado ao vivo: com uma nota criada (mesmo sem nenhuma classe), o aviso não aparece mais e a nota fica visível. `npx vitest run src/features/class-diagram/ClassDiagramCanvas.test.tsx` segue limpo (78 testes) depois da correção.

## Validação

```
npx vitest run src/features/class-diagram/contentOperations.test.ts
✓ 5 arquivos de teste, 103 testes (8 novos desta task)

npx vitest run src/features/import-export/classDiagramConversion.test.ts
✓ 5 arquivos de teste, 38 testes (1 novo desta task)

npx vitest run src/features/class-diagram/ClassDiagramCanvas.test.tsx
✓ 5 arquivos de teste, 78 testes (6 novos desta task, revalidado depois da correção do empty-hint)

npm run build
✓ built in 438ms (sem erro de typecheck)

npm run lint
(mesmos 8 warnings já existentes na sessão, nenhum novo)

npx vitest run --exclude "**/.claude/worktrees/**"
✓ 35 arquivos de teste, 274 testes (259 antes desta task + 15 novos)
```

**Validação visual ao vivo** (dev server local, painel de teste descartável "TASK-051 teste comentario" no projeto ELIMS real, sem tocar nenhum diagrama real do usuário): "+ Nota" cria o card, inspector mostra "COMENTÁRIO"/textarea/paleta de cor/"Excluir comentário"; escolher uma cor (testado: vermelho) tinge o card imediatamente (borda + fundo); texto digitado aparece no card em tempo real. Achado e corrigido ao vivo: sobreposição do `.empty-hint` (ver "Correção pós-implementação" acima).

## Handoff
Nenhum handoff necessário — task implementada de ponta a ponta nesta sessão (ideia do usuário → refinamento → confirmação → ADR → código → testes → validação visual ao vivo, incluindo uma correção encontrada durante a própria validação).
