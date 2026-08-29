---
id: TASK-011
title: Exclusão de organização e projeto
status: backlog
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
- [ ] CA-01: Um `admin` de organização vê e usa o botão "Excluir" numa organização própria; a organização e tudo que dependia dela (projetos, membros, diagramas) desaparece da UI depois de confirmar.
- [ ] CA-02: O mesmo para projeto — `admin` da organização dona exclui um projeto, e os diagramas dele desaparecem junto.
- [ ] CA-03: O botão de confirmar no modal só habilita quando o texto digitado bate exatamente com o nome da organização/projeto (case-sensitive).
- [ ] CA-04: Um usuário sem papel `admin` na organização não vê o botão "Excluir" (reforço de UI) — e, mesmo que forçasse a chamada, a RLS já existente bloqueia (não é escopo desta task provar isso de novo, já validado na TASK-001).
- [ ] CA-05: `npm run build`, `npm run lint` e `npm test` limpos.

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
- [ ] Adicionar `deleteOrganization(id)`/`deleteProject(id)` em `queries.ts`.
- [ ] Componente de confirmação (modal com campo de texto + botão desabilitado até o nome bater), reaproveitando `Modal`.
- [ ] Botão "Excluir" condicionado ao papel do usuário (mesmo padrão de `getMyProjectRole`/equivalente para organização).
- [ ] Tratar erro de RLS/rede com mensagem clara.

## Estratégia de testes
- [ ] Componente: modal de confirmação (botão desabilitado até o nome bater, chamada de delete só depois de confirmar).
- [ ] Manual: excluir uma organização/projeto de teste reais contra o Supabase real, confirmar cascata.
- [ ] Integração: não aplicável além do manual (RLS já validada na TASK-001).

## Riscos e rollback
Baixo risco — nenhuma mudança de schema, só UI sobre uma permissão que já existe. Rollback: reverter os componentes de UI, sem qualquer efeito em dados já excluídos (irreversível por natureza, ver ADR-003).

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum — task ainda não iniciada.
