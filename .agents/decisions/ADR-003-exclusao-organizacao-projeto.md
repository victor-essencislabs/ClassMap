---
id: ADR-003
title: Exclusão de organização e projeto — hard delete com confirmação por nome
status: accepted
date: 2026-08-29
deciders: [victor-essencislabs]
related_tasks: [TASK-011]
---

# ADR-003 — Exclusão de organização e projeto

## Contexto

Feedback do usuário registrado em `.agents/context/CONTEXT.md` (sessão de validação manual das TASK-001..005, 2026-08-29): a UI permite criar organização e criar projeto, mas não há nenhum controle para excluir nenhum dos dois.

Investigação do schema (`supabase/migrations/20260828130300_rls_policies.sql`) mostra que a política RLS de `DELETE` **já existe** para `organizations` (`organizations_delete`, exige `is_org_admin(id)`) e para `projects` (`projects_delete`, exige `is_org_admin(organization_id)`), e todas as FKs relevantes (`organization_members.organization_id`, `projects.organization_id`, `project_members.project_id`, `diagrams.project_id`) já têm `on delete cascade`. Ou seja, a autorização e a cascata de exclusão **já estão prontas no banco desde a TASK-001** — só falta a UI que exercita isso.

## Decisão

Exclusão definitiva (hard delete), sem soft delete/arquivamento. Botão "Excluir" (visível só para quem a política RLS já permite — `admin` da organização para organização, `admin` da organização-dona para projeto) abre um modal de confirmação que exige **digitar o nome exato** da organização/projeto antes de habilitar o botão de confirmar (padrão já usado por GitHub/Vercel para ações destrutivas). Ao confirmar, o client chama `DELETE` diretamente via `src/lib/supabase/queries.ts` (nenhuma RPC nova — a política RLS já autoriza), e a cascata do Postgres remove projetos/membros/diagramas dependentes automaticamente.

## Alternativas consideradas

### Alternativa B — Hard delete com confirmação de um clique
Mesmo mecanismo de exclusão (RLS + cascade já prontos), mas sem a etapa de digitar o nome — só um modal "tem certeza?" com um botão. Mais rápido de implementar e usar, mas sem barreira deliberada contra excluir uma organização inteira (com todos os projetos e diagramas dela) por um clique errado. Rejeitada: o custo de digitar o nome é pequeno perto do risco de perda de dado permanente sem aviso reforçado — especialmente porque excluir uma organização é irreversível e casca(teia) para todo o conteúdo dela.

### Alternativa C — Soft delete (arquivamento)
Adicionar `deleted_at`/`archived_at` em `organizations`/`projects`; "excluir" só marca como arquivado, escondido da UI e recuperável. Mais seguro (nada se perde de fato), mas exige: uma migration nova, adaptar toda política RLS de `SELECT` para filtrar `deleted_at is null` (ou uma política nova cobrindo isso), adaptar `getMyOrganizations`/`getMyProjects`/`getDiagrams` para o mesmo filtro, e um conceito de dado novo ("arquivado") que não existe hoje em nenhuma tabela do schema. Rejeitada nesta rodada: o esforço de implementação é significativamente maior que as outras duas alternativas para resolver o mesmo pedido do usuário ("poder excluir"), e nada na Constituição ou no feedback do usuário pede recuperação de dado excluído — se essa necessidade aparecer no futuro, cabe uma ADR nova revisitando esta decisão.

## Consequências

### Positivas
- Nenhuma mudança de schema/RLS necessária — a autorização (`is_org_admin`) e a cascata (`on delete cascade`) já existem desde a TASK-001. Escopo da implementação é 100% frontend.
- Padrão de confirmação (digitar o nome) já validado por outras ferramentas — familiar para quem já usa GitHub/Vercel.

### Negativas
- Exclusão é permanente — não há como recuperar uma organização/projeto excluído por engano, mesmo com a barreira de confirmação.
- Excluir uma organização remove silenciosamente (via cascade) todos os projetos e diagramas dela, sem uma tela de "isto vai excluir X projetos e Y diagramas" — o modal de confirmação não vai listar o que será perdido, só pedir o nome.

### Riscos
- Um `admin` mal-intencionado ou descuidado pode excluir uma organização inteira sem que outros membros sejam avisados antes — mitigado só pela barreira de digitar o nome, não por um fluxo de aprovação (fora de escopo, RBAC continua simples por decisão da Constituição).

## Plano de adoção

Uma task só (`TASK-011`), 100% frontend (`frontend-diagramas`) — sem dependência de `supabase-multitenant` já que nenhuma migration é necessária. Cobre organização e projeto juntos (mesmo padrão de modal, reaproveitado).

## Validação

`npm run build`/`npm run lint`/`npm test` limpos, mais validação manual: excluir uma organização/projeto de teste e confirmar que some da lista e que a política RLS já existente bloqueia quem não é `admin` (ver `supabase/README.md` para o padrão de teste de RLS já usado na TASK-001).

## Revisão

Reavaliar se o produto precisar de recuperação de dado excluído (a Alternativa C volta à mesa) ou se a Essencislabs pedir um fluxo de aprovação para exclusão de organização (fora do escopo desta ADR).
