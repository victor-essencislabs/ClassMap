---
id: TASK-011
title: Exclusão de organização e projeto
status: active
type: feature
owner: frontend-diagramas
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [navigation]
related_use_cases: []
related_adrs: [ADR-003]
---

# TASK-011 — Exclusão de organização e projeto

## Contexto
Feedback do usuário (`.agents/context/CONTEXT.md`, sessão de validação manual de 2026-08-29): a UI permite criar organização e projeto, mas não excluir nenhum dos dois. Ver `ADR-003` para a decisão (hard delete + confirmação por nome) e por que nenhuma migration é necessária — a política RLS de `DELETE` e as cascatas (`on delete cascade`) já existem desde a TASK-001.

## Problema
Uma organização ou projeto criado por engano, ou que parou de ser usado, não tem como ser removido pela UI — só manualmente pelo painel do Supabase (fora da ferramenta).

## Objetivo
Botão "Excluir" em `OrganizationsPage`/`ProjectsPage`, visível só para quem a RLS já autoriza (`admin` da organização), com um modal de confirmação que exige digitar o nome exato da organização/projeto antes de habilitar a exclusão.

## Fora de escopo
- Exclusão de diagrama individual (já não existe hoje, mas não é o pedido desta task — se o usuário quiser, é uma task nova).
- Soft delete/arquivamento e qualquer forma de recuperação pós-exclusão (ver ADR-003, Alternativa C rejeitada).
- Mudança de schema/RLS/migration — nenhuma é necessária (ver "Comportamento atual").

## Comportamento atual
`src/features/navigation/OrganizationsPage.tsx`/`ProjectsPage.tsx` só têm formulário de criação (`Nova organização`/`Novo projeto`) — nenhum controle de exclusão. A política RLS `organizations_delete`/`projects_delete` (`supabase/migrations/20260828130300_rls_policies.sql`) já existe e já é respeitada pelo Postgres; só falta o client chamar `DELETE`.

## Comportamento esperado
- Cada linha de organização (para quem é `admin` dela) e cada linha de projeto (para quem é `admin` da organização dona) ganha um botão "Excluir".
- Clicar abre um modal (reaproveitando o componente `Modal` de `src/features/diagram-shell/Modal.tsx`, TASK-010) pedindo para digitar o nome exato da organização/projeto; o botão de confirmar só habilita quando o texto bate.
- Confirmar chama uma função nova em `src/lib/supabase/queries.ts` (`deleteOrganization`/`deleteProject`) que faz `DELETE` via SDK; sucesso remove a linha da lista (e, por cascata do Postgres, todos os projetos/membros/diagramas dependentes).
- Falha (ex.: RLS bloqueando por não ser `admin`) mostra uma mensagem de erro clara, sem quebrar a tela.

## Regras de negócio
- RN-01: Só `admin` da organização exclui a organização; só `admin` da organização dona exclui um projeto dela — já garantido por RLS (`organizations_delete`/`projects_delete`), a UI só reforça visualmente (mesmo padrão de reforço de UI das demais telas, a garantia real continua sendo RLS).
- RN-02: Exclusão é definitiva — nenhum dado é recuperável depois de confirmada (ADR-003).

## Critérios de aceitação
- [x] CA-01: Um `admin` de organização vê e usa o botão "Excluir" numa organização própria; a organização e tudo que dependia dela (projetos, membros, diagramas) desaparece da UI depois de confirmar. Verificado por teste automatizado (`OrganizationsPage.test.tsx`) mockando a camada de Supabase — **não** validado ainda contra um projeto Supabase real (ver "Pendências").
- [x] CA-02: O mesmo para projeto — `admin` da organização dona exclui um projeto, e os diagramas dele desaparecem junto. Verificado por teste automatizado (`ProjectsPage.test.tsx`), mesma ressalva de CA-01 (cascata em si não é exercida contra um Postgres real nesta sessão, só chamada de `DELETE` mockada).
- [x] CA-03: O botão de confirmar no modal só habilita quando o texto digitado bate exatamente com o nome da organização/projeto (case-sensitive). Verificado por teste automatizado (`DeleteConfirmModal.test.tsx`, inclui caso de case diferente e texto parcial).
- [x] CA-04: Um usuário sem papel `admin` na organização não vê o botão "Excluir" (reforço de UI) — e, mesmo que forçasse a chamada, a RLS já existente bloqueia (não é escopo desta task provar isso de novo, já validado na TASK-001). Reforço de UI verificado por teste automatizado; bloqueio de RLS não reexercido (já coberto pela TASK-001).
- [x] CA-05: `npm run build`, `npm run lint` e `npm test` limpos. Ver seção "Validação".

## Impacto técnico
### Backend
Não aplicável — nenhuma migration nova (ver ADR-003).
### Frontend
`src/features/navigation/OrganizationsPage.tsx`, `ProjectsPage.tsx`, `src/lib/supabase/queries.ts` (`deleteOrganization`/`deleteProject`).
### Banco de dados
Nenhuma mudança — RLS e cascata já existem desde a TASK-001.
### Integrações
Nenhuma nova.
### Segurança
Nenhuma superfície nova — reaproveita RLS já validada.

## Plano de implementação
- [x] Adicionar `deleteOrganization(id)`/`deleteProject(id)` em `queries.ts`.
- [x] Componente de confirmação (modal com campo de texto + botão desabilitado até o nome bater), reaproveitando `Modal`.
- [x] Botão "Excluir" condicionado ao papel do usuário (mesmo padrão de `getMyProjectRole`/equivalente para organização).
- [x] Tratar erro de RLS/rede com mensagem clara.

## Estratégia de testes
- [x] Componente: modal de confirmação (botão desabilitado até o nome bater, chamada de delete só depois de confirmar). `DeleteConfirmModal.test.tsx`, 7 casos.
- [ ] Manual: excluir uma organização/projeto de teste reais contra o Supabase real, confirmar cascata. **Não executado nesta sessão** — este worktree não tem acesso ao navegador autenticado do usuário nem às credenciais do Supabase real (ver "Pendências").
- [x] Integração: cobertura extra além do pedido mínimo da task — `OrganizationsPage.test.tsx`/`ProjectsPage.test.tsx` mockando `src/lib/supabase/queries` (mesmo padrão de `SystemViewPage.test.tsx`), cobrindo CA-01/02/04 (visibilidade do botão por papel e remoção da lista após confirmar).

## Riscos e rollback
Baixo risco — nenhuma mudança de schema, só UI sobre uma permissão que já existe. Rollback: reverter os componentes de UI, sem qualquer efeito em dados já excluídos (irreversível por natureza, ver ADR-003).

## Registro de execução

### Alterações realizadas
- `deleteOrganization(organizationId)` e `deleteProject(projectId)` adicionadas em `src/lib/supabase/queries.ts` — `DELETE` direto via SDK (sem RPC nova), confiando em `organizations_delete`/`projects_delete` (RLS já existente desde a TASK-001) e nas cascatas do Postgres (`on delete cascade`) para remover membros/projetos/diagramas dependentes.
- Componente novo `DeleteConfirmModal` (`src/features/navigation/DeleteConfirmModal.tsx`), reaproveitando o `Modal` genérico (TASK-010): campo de texto que precisa bater exatamente com o nome (case-sensitive) para habilitar "Excluir definitivamente"; mostra erro dentro do modal (sem fechar) se `onConfirm` rejeitar, e desabilita os controles durante a exclusão. Compartilhado por `OrganizationsPage` e `ProjectsPage` — mesmo mecanismo, só muda título/aviso/o que `onConfirm` chama.
- `OrganizationsPage.tsx`: `reload()` agora também busca, para cada organização listada, se o usuário autenticado é `admin` dela (`getMyOrganizationRole` por organização, via `Promise.all`) — só assim dá para decidir quais linhas mostram "Excluir" (a lista mistura organizações onde o usuário pode ser `admin` ou `member`). Botão "Excluir" abre o `DeleteConfirmModal`; confirmar chama `deleteOrganization` e recarrega a lista.
- `ProjectsPage.tsx`: reaproveita o `role` (papel na organização dona, já carregado para decidir "Criar projeto") para decidir "Excluir" em cada projeto da lista — mesmo papel, RN-01 da task. Confirmar chama `deleteProject` e recarrega a lista.
- CSS (`src/index.css`): `.entity-list-item.with-actions` (linha com o link + botão "Excluir" lado a lado, sem quebrar o layout das listas que não têm ação, como `DiagramsPage`) e `.modal-body .field`/`label`/`input` (estilo do campo de confirmação dentro do modal, espelhando `.inline-create-form .field` já existente). `.btn.danger` já existia (não precisou de classe nova).

### Arquivos principais
- `src/lib/supabase/queries.ts` — `deleteOrganization`, `deleteProject`.
- `src/features/navigation/DeleteConfirmModal.tsx` (novo) + `DeleteConfirmModal.test.tsx` (novo).
- `src/features/navigation/OrganizationsPage.tsx` + `OrganizationsPage.test.tsx` (novo).
- `src/features/navigation/ProjectsPage.tsx` + `ProjectsPage.test.tsx` (novo).
- `src/index.css` — regras novas para `.entity-list-item.with-actions` e `.modal-body .field`.

### Decisões
- **Um componente `DeleteConfirmModal` compartilhado**, em vez de duplicar o modal dentro de `OrganizationsPage`/`ProjectsPage` — o plano de implementação da task já previa "reaproveitando `Modal`"; estender isso a um componente próprio evita duplicar a lógica de "habilita só quando bate o nome" duas vezes. Não muda contrato nenhum, decisão de implementação dentro do escopo já definido pela ADR-003/task.
- **Papel de organização recalculado por linha em `OrganizationsPage`** (`Promise.all` de `getMyOrganizationRole` por organização), em vez de assumir um único papel para a página inteira (como `ProjectsPage` faz, onde há só uma organização por tela) — necessário porque `OrganizationsPage` lista organizações de papéis potencialmente diferentes (o usuário pode ser `admin` em uma e `member` em outra) na mesma tela.
- **Testes de página adicionados além do mínimo pedido** (`OrganizationsPage.test.tsx`, `ProjectsPage.test.tsx`) — a "Estratégia de testes" da task só pedia o componente de modal; adicionei cobertura de página (mockando `queries`, mesmo padrão de `SystemViewPage.test.tsx`) para os CA-01/02/04 (visibilidade do botão por papel, remoção da lista após confirmar) ficarem verificados por teste automatizado, e não só por inspeção manual do código.

### Divergências
- Nenhuma divergência do plano/critérios de aceitação descritos na task — a implementação seguiu literalmente o "Plano de implementação" e o "Comportamento esperado".

### Pendências
- **Validação manual contra o Supabase real não foi executada nesta sessão** (worktree isolado, sem navegador autenticado do usuário nem acesso às credenciais reais) — a "Estratégia de testes" da task pede explicitamente "excluir uma organização/projeto de teste reais contra o Supabase real, confirmar cascata". CA-01/02/04 foram verificados só por teste automatizado (mock da camada de Supabase), não contra produção. Antes de mover esta task para `completed/`, alguém com acesso ao app publicado (ou rodando localmente contra o projeto `classmap` real) deve: criar uma organização de teste, excluí-la digitando o nome exato, e confirmar que ela (e um projeto/diagrama de teste dentro dela) somem de fato — mesmo padrão de sessão de validação manual já usado nas TASK-001..005 (ver `.agents/context/CONTEXT.md`).
- Nenhuma pendência de código conhecida — `npm run build`/`npm run lint`/`npm test` limpos (ver "Validação").

## Validação

Todos os comandos rodados neste worktree (`C:\Users\Essencis007\Documents\ClassMap\.claude\worktrees\agent-a1e56f2c97d95c282`), após `npm install` (node_modules não vem por padrão em worktree novo):

- `npm run build` → `tsc -b && vite build` — **limpo**, sem erros de typecheck; build de produção gerado (`dist/`).
- `npm run lint` → `oxlint` — **limpo** (exit 0). 3 warnings pré-existentes, sem relação com esta task (`AuthContext.tsx`, `Toast.tsx` — `react(only-export-components)`/`react(set-state-in-effect)`).
- `npm test` → `vitest run` — **101 testes passando** em 16 arquivos (eram 90 antes desta task, ver `.agents/context/CONTEXT.md`; +11 novos: 7 em `DeleteConfirmModal.test.tsx`, 2 em `OrganizationsPage.test.tsx`, 2 em `ProjectsPage.test.tsx`). Nenhum teste quebrado.

Validação manual contra Supabase real: **não executada** (ver "Pendências").

## Handoff
Nenhum handoff formal em `.agents/handoffs/` — trabalho completo e commitado nesta sessão, branch `task/011-exclusao-organizacao-projeto`. Continuação necessária antes de mover para `completed/`: validação manual contra o Supabase real (ver "Pendências" acima).
