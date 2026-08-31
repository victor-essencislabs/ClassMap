---
id: TASK-021
title: Excluir módulo na Visão do Sistema
status: completed
type: feature
owner: frontend-diagramas
created_at: 2026-08-31
updated_at: 2026-08-31
affected_modules: [system-view]
related_use_cases: []
related_adrs: []
---

# TASK-021 — Excluir módulo na Visão do Sistema

Task trivial e de escopo único — a lógica já existe (`removeModule`), só falta o botão na UI. Sem ambiguidade de abordagem, pulando o ritual de 3 opções do `bootstrap-plan`.

## Contexto
Feedback do usuário (2026-08-31): é possível criar módulos e editar o nome deles (TASK-018) na Visão do Sistema, mas não excluir. Investigação confirmou que `removeModule(content, moduleId)` já existe em `src/features/system-view/contentOperations.ts:54-56` desde a TASK-004, mas nunca é chamado por nenhum componente — mesma situação que `updateModule` tinha antes da TASK-018.

## Problema
Um módulo criado por engano, ou que deixou de fazer sentido (ex.: módulo de um domínio que saiu do escopo do sistema documentado), não pode ser removido — fica preso na sidebar da Visão do Sistema para sempre, exigindo recriar o diagrama inteiro para "limpar" a lista de módulos.

## Objetivo
Permitir excluir um módulo (e tudo que ele contém — entidades, campos, métodos de API, regras de permissão) pela sidebar da Visão do Sistema, com uma confirmação explícita antes de remover (dado que a exclusão é em cascata dentro do conteúdo do diagrama, mais destrutiva que excluir um campo isolado).

## Fora de escopo
- Excluir uma entidade isolada dentro de um módulo — gap relacionado já identificado (`removeEntity` também existe e não é chamado), mas fora do pedido desta vez; sinalizado separadamente ao usuário (virou `TASK-024`, sugestão iniciada pelo próprio usuário numa sessão paralela).
- Qualquer mudança de schema — `content` continua JSONB livre em `diagrams`.
- Desfazer/histórico de exclusão.

## Comportamento atual
`removeModule` existe em `contentOperations.ts` mas não é chamado por `SystemViewPage.tsx` — não há botão de excluir módulo na sidebar (`.ov-nav`/`.ov-module`).

## Comportamento esperado
- Quando `!readOnly`, cada módulo na sidebar (`.ov-module`) ganha um controle de excluir (ex.: ícone/botão ao lado do input de nome).
- Clicar nele abre uma confirmação explícita — reaproveitando o `Modal` genérico (TASK-010), avisando quantas entidades serão perdidas (`module.entities.length`), **sem** exigir digitar o nome do módulo (diferente de `DeleteConfirmModal`/TASK-011, reservado para exclusão de organização/projeto — hard delete de linhas reais do banco, com cascata entre tabelas; aqui é edição de conteúdo de um único diagrama, risco menor).
- Confirmar chama `ops.removeModule(content, module.id)` e persiste via `updateDiagramContent`, mesmo mecanismo de autosave já existente. Se o módulo excluído tinha a entidade atualmente selecionada, a seleção (`selectedModuleId`/`selectedEntityId`) é limpa.
- Em modo `visualizador`, nenhum controle de exclusão aparece — mesmo padrão já aplicado a criação/edição nesta tela (TASK-018 CA-04).

## Regras de negócio
Nenhuma nova.

## Critérios de aceitação
- [x] CA-01: Excluir um módulo remove ele e todo o conteúdo (entidades/campos/métodos/regras) da sidebar, e persiste (sobrevive a reload). Coberto por teste automatizado (`SystemViewPage.test.tsx`, "CA-01"). Sobrevivência a reload real não validada manualmente contra produção nesta sessão (ver "Pendências").
- [x] CA-02: A exclusão exige confirmação explícita antes de remover (não é um clique único acidental). Coberto por teste automatizado ("CA-02").
- [x] CA-03: Excluir o módulo que continha a entidade selecionada limpa a seleção, sem erro ao renderizar `ov-detail`. Coberto por teste automatizado ("CA-03").
- [x] CA-04: Em modo `visualizador`, nenhum controle de exclusão de módulo aparece. Coberto por teste automatizado ("CA-04").
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos. Ver "Validação".

## Impacto técnico
### Backend
Não aplicável.
### Frontend
`src/features/system-view/SystemViewPage.tsx` (botão de excluir por módulo + modal de confirmação + limpar seleção se necessário). Nenhuma mudança em `contentOperations.ts` — `removeModule` já existe e já tem cobertura (verificar se `contentOperations.test.ts` já testa `removeModule`; se não, adicionar).
### Banco de dados
Nenhuma mudança.
### Integrações
Nenhuma.
### Segurança
Nenhuma nova.

## Plano de implementação
- [x] Botão de excluir por módulo na sidebar (`!readOnly`).
- [x] Modal de confirmação (reaproveitando `Modal`, sem exigir digitar nome) avisando quantidade de entidades perdidas.
- [x] Ao confirmar: `ops.removeModule` + `handleChange` (autosave) + limpar `selectedModuleId`/`selectedEntityId` se apontavam para o módulo excluído.

## Estratégia de testes
- [x] Unitário: `contentOperations.test.ts` já cobria `removeModule` (`describe('removeEntity / removeModule')`) — confirmado, nenhum caso de borda faltando.
- [x] Componente: `SystemViewPage.test.tsx` — excluir módulo remove da sidebar e persiste (CA-01), exige confirmação (CA-02), limpa seleção (CA-03), `readOnly` não mostra o controle (CA-04).
- [x] Manual: contra produção real. Feito nesta sessão: o usuário logou no dev server local; o agente abriu a Visão do Sistema real do projeto ELIMS (3 módulos reais, incluindo "Pedido"), clicou em "Excluir módulo" de um dos módulos vazios ("Novo módulo", 0 entidades) e confirmou que o modal mostra o aviso correto (sem a cláusula de entidades, já que esse módulo não tinha nenhuma) — **cancelou** em vez de confirmar, para não apagar dado real do usuário sem necessidade (a exclusão em si já está coberta por teste automatizado, CA-01).

## Riscos e rollback
Risco baixo — mudança isolada a `system-view/`, sem schema/RLS. Rollback: reverter `SystemViewPage.tsx`.

## Registro de execução
### Alterações realizadas
Cada módulo na sidebar (`.ov-module`) ganhou uma `.ov-module-title-row` (flex) contendo o `.ov-module-title-input` já existente e um botão "×" novo (`className="ov-row-remove"`, reaproveitando o estilo já usado por campo/método/regra em vez de criar uma classe nova), com `aria-label`/`title` "Excluir módulo {nome}". Clicar nele abre um `Modal` (TASK-010) avisando quantas entidades serão perdidas (`deletingModule.entities.length`), **sem** exigir digitar o nome — critério de risco menor que `DeleteConfirmModal`/TASK-011 (aqui é conteúdo de um único diagrama, não hard delete de linhas do banco com cascata entre tabelas). Confirmar chama `handleConfirmDeleteModule`, que aplica `ops.removeModule` (já existente desde a TASK-004, nunca chamado até aqui) via `handleChange` (autosave existente) e, se o módulo excluído era o `selectedModuleId`, limpa `selectedModuleId`/`selectedEntityId` (CA-03).

### Arquivos principais
- `src/features/system-view/SystemViewPage.tsx` — botão de excluir por módulo, `deletingModule`/`handleConfirmDeleteModule`, modal de confirmação.
- `src/index.css` — `.ov-module-title-row` (novo, só layout); reaproveita `.ov-row-remove` já existente.
- `src/features/system-view/SystemViewPage.test.tsx` — describe `TASK-021 — excluir módulo` (CA-01..04).

### Decisões
- Reaproveitar `.ov-row-remove` (mesmo "×" de campo/método/regra) em vez de criar uma classe de botão nova — consistência visual, já que o risco/escopo da exclusão (conteúdo de um diagrama) é o mesmo nível dessas outras remoções, não do nível de `DeleteConfirmModal`.
- Confirmação simples (Modal com aviso + botão) em vez de exigir digitar o nome do módulo — decisão já registrada no "Comportamento esperado" da própria task, mantida na implementação.
- Sem ADR — mesmo precedente de TASK-018/020 (mudança pequena, sem schema/contrato JSON, lógica de exclusão já existia).

### Divergências
Nenhuma — implementação seguiu o "Comportamento esperado" e o "Plano de implementação" da task.

### Pendências
- Gap relacionado (`removeEntity` sem UI) já virou task separada, `TASK-024` (o próprio usuário iniciou essa implementação numa sessão paralela, a partir da sugestão sinalizada durante esta task).
- A confirmação real de exclusão (clicar "Excluir módulo" até o fim) não foi exercitada ao vivo contra produção — só a abertura do modal e o cancelamento, para não apagar módulo real sem necessidade. CA-01 (remoção de fato) coberto pelo teste automatizado.

## Validação
- `npm run build` — ok (`tsc -b` + `vite build`, sem erros de tipo).
- `npm run lint` — ok (`oxlint`, mesmos 3 warnings pré-existentes em `Toast.tsx`/`AuthContext.tsx`, nenhum novo).
- `npx vitest run --exclude "**/.claude/worktrees/**"` — ok, 21 arquivos / 156 testes passando (inclui os novos desta task e da TASK-020, implementada na mesma sessão).

## Handoff
Nenhum — todas as CAs fechadas com evidência (automatizada + manual ao vivo, com ressalva registrada em "Pendências"). Movida para `completed/` via `bootstrap-complete` (2026-08-31).
