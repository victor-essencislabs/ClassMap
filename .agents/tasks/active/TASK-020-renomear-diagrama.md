---
id: TASK-020
title: Renomear diagrama depois de criado (Classes/Objetos/Visão do Sistema)
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [class-diagram, object-diagram, system-view]
related_use_cases: []
related_adrs: []
---

# TASK-020 — Renomear diagrama depois de criado

Task trivial e de escopo único — mesmo padrão já implementado na TASK-016/018 (nome editável), aplicado agora ao nome do diagrama já criado, nas 3 telas. Sem ambiguidade de abordagem, pulando o ritual de 3 opções do `bootstrap-plan`.

## Contexto
Feedback do usuário (2026-08-31): hoje só é possível definir o nome de um diagrama (Classes/Objetos/Visão do Sistema) no momento da criação (TASK-016, modal antes de `createEmptyDiagram`) — depois de criado, o nome fica fixo. Investigação confirmou que `diagram.name` é exibido como texto estático (`<strong>{diagram.name}</strong>`) nas 3 topbars — `src/features/class-diagram/DiagramEditorPage.tsx:73`, `src/features/object-diagram/ObjectDiagramPage.tsx:92`, `src/features/system-view/SystemViewPage.tsx:127` — e não existe nenhuma função em `src/lib/supabase/queries.ts` para atualizar a coluna `diagrams.name` (só `updateDiagramContent`, que atualiza `content`, e `createEmptyDiagram`, que grava o nome só na criação).

## Problema
Um diagrama criado com um nome (ou com o nome padrão do tipo, se o usuário deixou em branco na criação) fica preso a esse nome para sempre — não há como corrigir um erro de digitação nem reorganizar a nomenclatura conforme o projeto evolui, sem excluir e recriar o diagrama do zero (perdendo todo o conteúdo).

## Objetivo
Tornar o nome do diagrama editável a qualquer momento, nas 3 telas de visualização, com persistência imediata (mesmo padrão de autosave já usado para o conteúdo).

## Fora de escopo
- Renomear pela `DiagramsPage` (lista) — o pedido e o problema descrito são sobre a tela do diagrama já aberta; se fizer sentido também editar da lista, é uma extensão a avaliar depois, não travar esta task por isso.
- Qualquer mudança de schema — `diagrams.name` já existe e já é `not null` desde a TASK-001/TASK-002.
- Histórico de nomes anteriores.

## Comportamento atual
`diagram.name` é exibido como `<strong>` estático na topbar das 3 telas de diagrama, sem input nem função de persistência.

## Comportamento esperado
- Nas 3 telas (`DiagramEditorPage`, `ObjectDiagramPage`, `SystemViewPage`), quando `!readOnly`, o nome na topbar vira um campo editável (mesmo padrão visual/interação de `.ov-module-title-input`, TASK-018) — clicar/focar permite editar, e a mudança persiste (via nova função `renameDiagram` em `queries.ts`) com o mesmo mecanismo de indicador de salvamento (`save-indicator`) já usado para o conteúdo.
- Campo vazio/só espaços não persiste — mantém o nome anterior (mesmo padrão de fallback das TASK-016/018, já que `diagrams.name` é `not null`).
- Em modo `visualizador` (`readOnly`), o nome continua como texto estático, sem input — mesmo padrão já aplicado a outros campos editáveis desta fase (TASK-018 CA-04).

## Regras de negócio
- RN-01: Nome vazio/só espaços nunca é persistido — reverte para o nome anterior, sem erro visível ao usuário.

## Critérios de aceitação
- [x] CA-01: Editar o nome do diagrama em qualquer uma das 3 telas persiste (nova função `renameDiagram`) e sobrevive a reload. Coberto por teste automatizado nas 3 páginas (`DiagramEditorPage.test.tsx`, `ObjectDiagramPage.test.tsx`, `SystemViewPage.test.tsx`, "CA-01"). Sobrevivência a reload real não validada manualmente contra produção nesta sessão (ver "Pendências").
- [x] CA-02: Deixar o campo vazio (ou só espaços) ao confirmar mantém o nome anterior, sem erro. Coberto por teste automatizado nas 3 páginas ("CA-02").
- [x] CA-03: Em modo `visualizador`, o nome aparece como texto, sem input editável — mesmo padrão das demais telas. Coberto por teste automatizado nas 3 páginas ("CA-03").
- [x] CA-04: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/lib/supabase/queries.ts` (nova função `renameDiagram(diagramId, name)`, mesmo padrão de `updateDiagramContent`); `DiagramEditorPage.tsx`, `ObjectDiagramPage.tsx`, `SystemViewPage.tsx` (trocar `<strong>{diagram.name}</strong>` por input editável quando `!readOnly`, com autosave/debounce — reaproveitar o mesmo padrão de `AUTOSAVE_DELAY_MS` já usado para conteúdo, se fizer sentido, ou persistir no blur/Enter).
### Banco de dados
Nenhuma migration — `diagrams.name` já existe.
### Integrações
Nenhuma.
### Segurança
Nenhuma nova — RLS de `diagrams` (update) já exige `editor` do projeto desde a TASK-001/003, reaproveitada sem alteração.

## Plano de implementação
- [x] `renameDiagram(diagramId, name)` em `queries.ts`.
- [x] Input editável na topbar das 3 telas, com fallback para nome anterior em campo vazio, respeitando `readOnly`.
- [x] Indicador de salvamento reaproveitado (`saveState`/`save-indicator` já existente) — timeout de debounce próprio (`nameSaveTimeout`), separado do de conteúdo (`saveTimeout`).

## Estratégia de testes
- [x] Unitário/componente: cada uma das 3 páginas — renomear persiste (mock de `renameDiagram`), campo vazio não persiste, `readOnly` não mostra input.
- [x] Manual: renomear um diagrama de cada tipo, confirmar persistência após reload — contra produção real. Feito nesta sessão: o usuário logou no dev server local (mesmo Supabase real de `.env.local`); o agente renomeou ao vivo um Diagrama de Classes real do projeto ELIMS ("teste de classes" → "teste de classes (renomeado ao vivo)"), confirmou o indicador "Salvo" e reverteu para o nome original em seguida, para não deixar sujeira nos dados reais do usuário. Só validado para Diagrama de Classes — Objetos/Visão do Sistema usam o mesmo código, não testados individualmente ao vivo (cobertura automatizada idêntica nos 3).

## Riscos e rollback
Risco baixo — mudança pequena e isolada à topbar de cada tela, sem tocar schema/RLS. Rollback: reverter as 3 páginas e remover `renameDiagram` de `queries.ts`.

## Nota sobre validação
Diferente das tasks anteriores (TASK-011..019, todas com a ressalva "sem acesso a produção nesta sessão"), o usuário confirmou (2026-08-31) que o navegador desta sessão já está autenticado nas contas reais Supabase/Vercel do projeto, e que hoje só ele usa a produção, a título de teste — ou seja, esta task (e as demais geradas nesta rodada) podem ser validadas manualmente contra produção real durante a implementação, sem a lacuna estrutural registrada em `.agents/context/CONTEXT.md` ("Falta um segundo usuário real").

## Registro de execução
### Alterações realizadas
`renameDiagram(diagramId, name)` adicionada em `queries.ts` (mesmo padrão de `updateDiagramContent`: `update({ name }).eq('id', diagramId)`, sem RPC nova). Nas 3 páginas (`DiagramEditorPage`, `ObjectDiagramPage`, `SystemViewPage`), o `<strong>{diagram.name}</strong>` na topbar virou condicional: `readOnly` mantém o texto estático; `!readOnly` mostra um `<input className="diagram-name-input">` com estado local (`nameInput`), separado de `diagram.name`, para não persistir o campo vazio enquanto o usuário digita (RN-01). `handleNameChange` debounça 800ms (`nameSaveTimeout`, mesmo `AUTOSAVE_DELAY_MS` do conteúdo, mas timeout próprio para não disputar com o autosave do `content`) e só agenda o `renameDiagram` se o valor tiver algo além de espaço; `handleNameBlur` devolve `nameInput` para `diagram.name` se o campo ficou vazio ao perder o foco. Nova classe `.diagram-name-input` em `index.css`, mesmo padrão visual (borda transparente → hover → foco com `--accent-soft-border`/`--surface-alt`) de `.ov-module-title-input`/`.ov-entity-name-input`.

### Arquivos principais
- `src/lib/supabase/queries.ts` — `renameDiagram`.
- `src/features/class-diagram/DiagramEditorPage.tsx`, `src/features/object-diagram/ObjectDiagramPage.tsx`, `src/features/system-view/SystemViewPage.tsx` — input editável de nome na topbar.
- `src/index.css` — `.diagram-name-input` (novo).
- `src/features/class-diagram/DiagramEditorPage.test.tsx`, `src/features/object-diagram/ObjectDiagramPage.test.tsx` (novos) e `src/features/system-view/SystemViewPage.test.tsx` (estendido) — CA-01..03.

### Decisões
- Timeout de debounce separado (`nameSaveTimeout`) do já existente para conteúdo (`saveTimeout`), mesmo os dois usando o mesmo `saveState`/indicador visual — evita que renomear e editar conteúdo quase ao mesmo tempo cancelem o debounce um do outro.
- Sem ADR — mesmo precedente de TASK-016/018 (mudança pequena, sem schema/contrato JSON).

### Divergências
Nenhuma — implementação seguiu o "Comportamento esperado" da task.

### Pendências
Nenhuma — validado ao vivo contra produção real nesta mesma sessão (usuário logou no dev server local; ver "Estratégia de testes").

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos 3 warnings pré-existentes em `Toast.tsx`/`AuthContext.tsx`, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 21 arquivos / 156 testes passando (inclui os novos desta task e da TASK-021, implementada na mesma sessão).

## Handoff
Nenhum — todas as CAs fechadas com evidência (automatizada + manual ao vivo). Candidata a `bootstrap-complete` mover para `completed/` quando o usuário pedir.
