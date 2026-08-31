---
id: TASK-028
title: Polimento de UI (inputs fora do design system, botões desalinhados, tooltip de estereótipo) e exclusão de diagrama
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [navigation, class-diagram, object-diagram, system-view, diagram-shell]
related_use_cases: []
related_adrs: []
---

# TASK-028 — Polimento de UI e exclusão de diagrama

## Contexto
Feedback direto do usuário, testando ao vivo contra produção logo após TASK-025/026/027: 4 pedidos pontuais, sem ADR (nenhum mexe em schema JSON de import/export, contrato multi-tenant ou os 5 tipos de relação UML).

## Problema
1. O input "Nome do diagrama" (modal de criar diagrama) e "Nome do módulo" (Visão do Sistema) usavam `style={{ display: 'block', width: '100%', ... }}` inline, sem a classe `.field` do design system — apareciam com o estilo padrão do navegador (fundo/borda claros), destoando do resto do app. `ClassPickerModal` tinha o mesmo problema nos 2 `<select>`.
2. Na topbar do Diagrama de Classes, "Exportar JSON"/"Importar JSON" (`.btn.ghost.small`) tinham altura visivelmente menor que "🔗 Relação"/"+ Classe" (`.btn`/`.btn.primary`, sem `small`) — o mesmo valia para "🔗 Link"/"+ Objeto" no Diagrama de Objetos.
3. Nenhum jeito de saber o que "estereótipo" significa no inspector do Diagrama de Classes.
4. Não havia como excluir um diagrama já criado, em nenhum dos 3 tipos.

## Objetivo
Inputs/selects de modal seguindo o design system; botões da topbar com altura/estilo consistentes; tooltip de ajuda no campo de estereótipo; exclusão de diagrama nos 3 tipos.

## Fora de escopo
Exclusão de organização/projeto (já existe, TASK-011/ADR-003) — este é especificamente sobre diagramas.

## Comportamento esperado
- Inputs/selects de modal sempre dentro de `<div className="field">` com `<label>`, nunca `style` inline — herdam `.modal-body .field input`/`.access-add-form select` do design system.
- Todos os botões utilitários da topbar (`Exportar/Importar JSON`, `🔗 Relação`/`🔗 Link`) usam `.btn.ghost` (mesma altura/estilo, sem `small`); o botão de modo de conexão ganha estado visual `.active` quando ligado (reaproveita `.btn.active`, já existente).
- Novo componente `InfoTooltip` (`src/features/diagram-shell/`) — botão "i" com tooltip nativa (`title`), usado ao lado do label "Estereótipo (opcional)".
- `DiagramTypeListPage` (compartilhada pelos 3 tipos) ganha botão "Excluir" por linha, só para `editor`, com confirmação simples (sem digitar o nome — mesmo critério de módulo/entidade, TASK-021/024, não de organização/projeto, ADR-003).

## Regras de negócio
- RN-01: só `editor` do projeto vê "Excluir" num diagrama — reforço de UI; a garantia real é RLS (`diagrams_delete`, já existente desde a TASK-001, sem mudança).

## Critérios de aceitação
- [x] CA-01: modal "Novo — Diagrama de Classes"/"Novo módulo" com input no estilo do design system (fundo escuro, borda sutil, foco com outline do accent).
- [x] CA-02: `ClassPickerModal` com os 2 selects também no padrão `.field`.
- [x] CA-03: botões da topbar do Diagrama de Classes/Objetos com a mesma altura.
- [x] CA-04: passar o mouse no botão "i" ao lado de "Estereótipo (opcional)" mostra a explicação.
- [x] CA-05: "Excluir" aparece só para `editor`, nos 3 tipos de diagrama (mesmo componente); confirmar exclui de verdade e recarrega a lista; cancelar não exclui nada.

## Impacto técnico
### Backend
Nenhum.
### Frontend
`src/features/navigation/DiagramTypeListPage.tsx` (input do modal + exclusão), `src/features/system-view/SystemViewPage.tsx` (input do modal de módulo), `src/features/object-diagram/ClassPickerModal.tsx` (selects), `src/features/class-diagram/ClassDiagramCanvas.tsx` (botão Relação + tooltip de estereótipo), `src/features/object-diagram/ObjectDiagramCanvas.tsx` (botão Link), `src/features/import-export/ImportExportControls.tsx` (remove `small`), `src/features/diagram-shell/InfoTooltip.tsx` (novo), `src/lib/supabase/queries.ts` (`deleteDiagram`), `src/index.css`.
### Banco de dados
Nenhuma migration — `diagrams_delete` já existia (TASK-001).
### Segurança
Nenhuma mudança de superfície — `deleteDiagram` só chama `delete` sobre `diagrams`, RLS já exige `editor`.

## Plano de implementação
- [x] Corrigir os 3 inputs/selects fora do padrão (`DiagramTypeListPage`, `SystemViewPage`, `ClassPickerModal`).
- [x] Unificar altura/estilo dos botões de topbar (Classes e Objetos).
- [x] `InfoTooltip` novo + uso no campo de estereótipo.
- [x] `deleteDiagram` em `queries.ts` + UI de exclusão em `DiagramTypeListPage` (cobre os 3 tipos, componente compartilhado).

## Estratégia de testes
- [x] `DiagramTypeListPage.test.tsx` estendido: CA-01/02/03 de exclusão (editor confirma e recarrega; cancelar não exclui; visualizador não vê o botão).
- [x] `npm run build`/`lint`/`vitest` limpos.
- [ ] Validação manual contra produção real — pendente do próximo deploy (commit ainda não enviado no momento deste registro).

## Riscos e rollback
Baixo — mudanças de estilo/markup e uma função de delete que reaproveita RLS já existente. Rollback: reverter os arquivos listados.

## Registro de execução
### Alterações realizadas
Ver "Comportamento esperado".
### Arquivos principais
Ver "Impacto técnico".
### Decisões
Exclusão de diagrama com confirmação simples (sem digitar o nome) — critério: item único, sem cascata para outros diagramas/projetos, mesmo padrão já usado para módulo/entidade (TASK-021/024), diferente de organização/projeto (ADR-003, que cascateiam muitos registros).
### Divergências
Nenhuma.
### Pendências
Validação manual contra produção — depende do próximo `git push` (build/lint/test já limpos).

## Validação
`npm run build`/`lint` limpos; `npx vitest run --exclude "**/.claude/worktrees/**"` — 192 testes, 27 arquivos.

## Handoff
Nenhum — segue para commit/push na mesma sessão.
