---
id: TASK-031
title: Limpeza de CSS morto em src/index.css
status: completed
type: chore
owner: Claude Code
created_at: 2026-09-01
updated_at: 2026-09-01
affected_modules: [frontend]
related_use_cases: []
related_adrs: []
---

# TASK-031 — Limpeza de CSS morto em src/index.css

## Contexto
`src/index.css` acumulou regras de duas gerações anteriores do frontend
(pré-redesign ADR-002/TASK-006, e pré-ADR-008) que nenhum componente
`.tsx` mais referencia.

## Problema
Regras CSS sem uso aumentam o arquivo e podem confundir manutenção futura
(nomes genéricos como `.toolbar` quase colidiram com uso real).

## Objetivo
Remover as regras confirmadamente mortas sem alterar nenhum comportamento
visual.

## Fora de escopo
Qualquer classe ainda referenciada por um componente, mesmo que o nome
sugira origem antiga (ex.: `.save-indicator`, `.toolbar` — ambos
reaproveitados por componentes atuais e mantidos).

## Comportamento atual / esperado
Sem mudança de comportamento — apenas remoção de código morto.

## Critérios de aceitação
- [x] CA-01: cada classe removida confirmada via grep como não referenciada
  em nenhum `.tsx` de `src/` antes da remoção.
- [x] CA-02: `npm run build`, `npm run lint` e
  `npx vitest run --exclude "**/.claude/worktrees/**"` continuam passando.

## Registro de execução

### Alterações realizadas
Removidas de `src/index.css`:
- Bloco "Diagrama de Classes (TASK-003)", pré-redesign ADR-002/TASK-006:
  `.diagram-editor-page`, `.diagram-editor-header`, `.class-diagram-layout`,
  `.new-relationship-form` (+ `select`), `.canvas-area`, `.edit-panel`
  (+ `label`, `input`/`select`, `button.danger`), `.attribute-row`
  (+ `input`).
- Bloco pré-ADR-008: `.view-switch` e as regras
  `.diagram-shell-topbar .view-switch` / `button` / `button.active` /
  `button.active[data-view='objects']` — substituído por rotas dedicadas
  (ADR-008/TASK-022).

Mantidas por estarem em uso real, apesar de nomes genéricos/antigos:
- `.save-indicator` — usado em `DiagramEditorPage.tsx`,
  `SystemViewPage.tsx` e `ObjectDiagramPage.tsx`.
- `.toolbar` — usado em `DiagramTypeListPage.tsx` (wrapper do botão
  "+ Novo diagrama"), sem relação com a seção TASK-003 onde a regra
  estava documentada.

### Arquivos principais
- [src/index.css](../../../src/index.css)

### Decisões
Limpeza pura (sem ADR), conforme `.claude/rules/global.md` — mudança sem
alteração de comportamento.

### Divergências
Nenhuma.

### Pendências
Nenhuma.

## Validação
```
npm run build   # tsc -b + vite build — OK
npm run lint    # oxlint — só warnings pré-existentes, não relacionados
npx vitest run --exclude "**/.claude/worktrees/**"   # 27 arquivos, 192 testes — todos passaram
```

## Handoff
N/A — task trivial, concluída em uma única sessão.
