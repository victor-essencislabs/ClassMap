---
id: TASK-024
title: Excluir entidade na Visão do Sistema
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [system-view]
related_use_cases: []
related_adrs: []
---

# TASK-024 — Excluir entidade na Visão do Sistema

_Renumerada de TASK-022 para TASK-024 (2026-08-31): esta task foi gerada por uma sessão paralela (via `spawn_task`, sugestão sinalizada durante a implementação da TASK-021) enquanto `TASK-022` já tinha sido atribuída, na sessão principal, a "Agrupar a listagem de diagramas por tipo" (`ADR-008`). Renumerada para não colidir — nenhum conteúdo além do id/título foi alterado._

Task trivial e de escopo único — a lógica já existe (`removeEntity`), só falta o botão na UI. Mesmo padrão de TASK-018 e TASK-021; pulando o ritual de 3 opções do `bootstrap-plan`.

## Contexto
Gap identificado durante a investigação da TASK-021 (excluir módulo) e sinalizado separadamente ao usuário: `removeEntity(content, moduleId, entityId)` já existe em `src/features/system-view/contentOperations.ts:79-81` desde a TASK-004, com cobertura em `contentOperations.test.ts`, mas nunca é chamado por nenhum componente — mesma situação que `removeModule` tinha antes da TASK-021.

## Problema
Dentro de um módulo é possível criar entidades (`+ Entidade`) e excluir campos isolados (`removeField`, já wireado), mas não excluir a entidade inteira. Uma entidade criada por engano, ou que deixou de fazer sentido, fica presa na sidebar para sempre — só dá pra "esvaziar" removendo campo a campo, ou excluindo o módulo inteiro (TASK-021, perda maior).

## Objetivo
Permitir excluir uma entidade (e tudo que ela contém — campos, métodos de API, regras de permissão) de dentro de um módulo na Visão do Sistema, com confirmação explícita antes de remover.

## Fora de escopo
- Excluir módulo — já coberto pela TASK-021.
- Qualquer mudança de schema — `content` continua JSONB livre em `diagrams`.
- Desfazer/histórico de exclusão.

## Comportamento atual
`removeEntity` existe em `contentOperations.ts` mas não é chamado por `SystemViewPage.tsx` — não há controle de excluir entidade nem na sidebar (`.ov-entity-btn`) nem no painel de detalhe (`.ov-detail`).

## Comportamento esperado
- Quando `!readOnly`, a entidade selecionada ganha um controle de excluir — no cabeçalho do `EntityDetail` (`.ov-header`, ao lado do input de nome), consistente com onde a exclusão de módulo fica na sidebar (TASK-021).
- Clicar nele abre uma confirmação explícita — reaproveitando o `Modal` genérico (TASK-010), avisando quantos campos/métodos/regras serão perdidos, sem exigir digitar o nome da entidade (mesmo critério de risco da TASK-021: edição de conteúdo de um único diagrama, não hard delete de linhas do banco).
- Confirmar chama `ops.removeEntity(content, moduleId, entity.id)` e persiste via o mesmo mecanismo de autosave já existente (`handleChange`/`updateDiagramContent`). Após excluir, limpa `selectedEntityId` (e mostra o estado vazio `ov-empty` do painel de detalhe).
- Em modo `visualizador`, nenhum controle de exclusão de entidade aparece — mesmo padrão já aplicado a módulo/campo nesta tela.

## Regras de negócio
Nenhuma nova.

## Critérios de aceitação
- [x] CA-01: Excluir uma entidade remove ela e todo o conteúdo (campos/métodos/regras) da sidebar e do painel de detalhe, e persiste (sobrevive a reload). Coberto por teste automatizado (`SystemViewPage.test.tsx`, "CA-01") e confirmado ao vivo contra produção real (ver "Validação").
- [x] CA-02: A exclusão exige confirmação explícita antes de remover (não é um clique único acidental). Coberto por teste automatizado ("CA-02") e confirmado ao vivo (modal apareceu antes de qualquer remoção).
- [x] CA-03: Após excluir a entidade selecionada, a seleção é limpa e o painel volta ao estado vazio (`ov-empty`), sem erro de renderização. Coberto por teste automatizado ("CA-03") e confirmado ao vivo.
- [x] CA-04: Em modo `visualizador`, nenhum controle de exclusão de entidade aparece. Coberto por teste automatizado ("CA-04").
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/system-view/SystemViewPage.tsx` (botão de excluir no `EntityDetail`/`.ov-header` + modal de confirmação + limpar `selectedEntityId`). Nenhuma mudança em `contentOperations.ts` — `removeEntity` já existe e já tem cobertura em `contentOperations.test.ts`.
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma nova.

## Plano de implementação
- [x] Botão de excluir entidade no `EntityDetail` (`!readOnly`).
- [x] Modal de confirmação (reaproveitando `Modal`, sem exigir digitar nome) avisando quantidade de campos/métodos/regras perdidos.
- [x] Ao confirmar: `ops.removeEntity` + `handleChange` (autosave) + limpar `selectedEntityId`.

## Estratégia de testes
- [x] Unitário: confirmado que `contentOperations.test.ts` já cobria `removeEntity` isoladamente (`describe('removeEntity / removeModule')`) — nenhum caso de borda faltando.
- [x] Componente: `SystemViewPage.test.tsx` — excluir entidade remove da sidebar/detalhe e persiste (CA-01), exige confirmação (CA-02), limpa seleção (CA-03), `readOnly` não mostra o controle (CA-04).
- [x] Manual: contra produção real. Feito ao vivo nesta sessão: criada uma entidade de teste num módulo vazio do projeto real ELIMS, excluída de verdade (indicador "Salvo" confirmando persistência), sem tocar nos dados reais do usuário (módulo "account" com "Pedido"/"NovaEntidade" não foi mexido).

## Riscos e rollback
Risco baixo — mudança isolada a `system-view/`, sem schema/RLS. Rollback: reverter `SystemViewPage.tsx`.

## Registro de execução
### Alterações realizadas
Mesmo padrão da TASK-021 (excluir módulo): quando `!readOnly`, o nome da entidade no `EntityDetail` (`.ov-header`) virou uma `.ov-entity-name-row` (flex) contendo o `.ov-entity-name-input` já existente e um botão "×" novo (`className="ov-row-remove"`, mesma classe já reaproveitada para módulo/campo/método/regra), com `aria-label`/`title` "Excluir entidade {nome}". Clicar nele abre um `Modal` avisando o que será perdido — nova função `describeEntityLoss(entity)` monta a frase (`"e 3 campos, 1 método de API e 2 regras de permissão."` ou variações, omitindo categorias vazias), sem exigir digitar o nome (mesmo critério de risco da TASK-021). Confirmar chama `handleConfirmDeleteEntity`, que aplica `ops.removeEntity` (já existente desde a TASK-004, com cobertura em `contentOperations.test.ts`, nunca chamado até aqui) via `handleChange` (autosave) e, se a entidade excluída era a `selectedEntityId`, limpa a seleção (CA-03).

### Arquivos principais
- `src/features/system-view/SystemViewPage.tsx` — botão de excluir em `EntityDetail`, `deletingEntity`/`handleConfirmDeleteEntity`, modal de confirmação, `describeEntityLoss`.
- `src/index.css` — `.ov-entity-name-row` (novo, só layout, mesmo padrão de `.ov-module-title-row`).
- `src/features/system-view/SystemViewPage.test.tsx` — describe `TASK-024 — excluir entidade` (CA-01..04).

### Decisões
- `describeEntityLoss` enumera até 3 categorias (campos/métodos/regras), omitindo as vazias e concatenando com "e" antes da última — mais granular que o aviso de exclusão de módulo (TASK-021, que só conta entidades), porque uma entidade pode perder 3 tipos de conteúdo diferentes, não só um.
- Confirmação simples (Modal com aviso + botão), sem exigir digitar o nome — mesmo precedente da TASK-021, mesmo raciocínio de risco (conteúdo de um diagrama, não hard delete de linhas do banco).
- Sem ADR — mudança pequena, sem schema/contrato JSON, lógica de exclusão (`removeEntity`) já existia desde a TASK-004.

### Divergências
Nenhuma — implementação seguiu o "Comportamento esperado" e o "Plano de implementação" da task.

### Pendências
Nenhuma — validado ao vivo contra produção real nesta mesma sessão (ver "Estratégia de testes").

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos 3 warnings pré-existentes em `Toast.tsx`/`AuthContext.tsx`, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 26 arquivos / 180 testes passando (4 novos desta task).
- Verificação ao vivo (`npm run dev` local, usuário logado, projeto real ELIMS): criada uma entidade de teste num módulo vazio, botão "Excluir entidade" apareceu corretamente, modal mostrou o aviso certo (sem cláusula de conteúdo perdido, já que a entidade de teste estava vazia), confirmar removeu a entidade de fato (indicador "Salvo"), seleção voltou ao estado vazio — sem tocar em nenhum dado real do usuário (módulo "account", entidades "Pedido"/"NovaEntidade" pré-existentes, intocados).

## Handoff
Nenhum — todas as CAs fechadas com evidência automatizada e manual ao vivo. Movida para `completed/` via `bootstrap-complete` (2026-08-31).
