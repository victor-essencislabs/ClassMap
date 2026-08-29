---
id: ADR-004
title: Gestão de acesso de usuários — vincular usuário existente por e-mail
status: accepted
date: 2026-08-29
deciders: [victor-essencislabs]
related_tasks: [TASK-012, TASK-013]
---

# ADR-004 — Gestão de acesso de usuários por organização/projeto

## Contexto

Feedback do usuário registrado em `.agents/context/CONTEXT.md` (sessão de validação manual das TASK-001..005, 2026-08-29): não existe tela para o administrador de uma organização convidar/criar acesso de um usuário e conceder/revogar papel `visualizador`/`editor` por projeto. RN-03 da TASK-001 ("um usuário administrador... pode criar acessos de usuário e conceder/revogar visualizador/editor por projeto") está implementada só no schema/RLS, sem UI correspondente.

Investigação do schema mostra que a política RLS já permite tudo, exceto uma peça: `organization_members_insert`/`project_members_insert` já autorizam um `admin` a inserir **qualquer** `user_id` (não só o próprio); `organization_members_update`/`_delete` e `project_members_update`/`_delete` também já existem, sempre gated por `is_org_admin`/`is_project_org_admin`. O que falta é só a forma de descobrir o `user_id` de uma pessoa a partir do e-mail dela — hoje não há nenhuma política de `SELECT` em `auth.users` acessível ao client, e `profiles_select` só mostra o perfil de quem já divide uma organização com o usuário atual (não ajuda a encontrar alguém novo).

## Decisão

UI de gestão de acesso (organização e/ou projeto) onde o `admin` digita o e-mail de uma pessoa que **já tem conta no ClassMap** (se cadastrou sozinho, antes, pela tela de login) e a vincula com um papel escolhido. A resolução e-mail→`user_id` acontece via uma função `SECURITY DEFINER` nova (`public.find_user_id_by_email(p_email text) returns uuid`), que consulta `auth.users` internamente mas só devolve o `id` (ou `null` se não encontrar) — nunca expõe nenhum outro dado de `auth.users` ao client. O restante do fluxo (inserir/atualizar/revogar o vínculo) usa as políticas RLS já existentes, sem nenhuma outra mudança de schema.

Este produto **não envia e-mail de convite** — quem quiser dar acesso a alguém precisa avisar essa pessoa por fora (Slack, e-mail manual, etc.) para que ela se cadastre primeiro em `/login`, e só depois o `admin` a vincula pelo e-mail dela.

## Alternativas consideradas

### Alternativa B — Convite real por e-mail via Supabase Auth Admin API (Edge Function)
Uma Supabase Edge Function chamaria `auth.admin.inviteUserByEmail` (usando a `service_role` key, nunca exposta ao client) para mandar um e-mail de convite de verdade; ao aceitar, o usuário já nasceria vinculado à organização/projeto certo. É o fluxo mais completo — o que um SaaS profissional teria — mas introduz a **primeira peça de infraestrutura server-side própria do projeto** (uma Edge Function, com sua própria configuração, deploy e superfície de risco, mesmo rodando dentro do Supabase). `.claude/rules/global.md` (seção Propósito) registra que "ClassMap não tem uma camada de backend própria com controllers/services" — uma Edge Function não é exatamente isso (não é um servidor Express/Nest à parte), mas é uma mudança de superfície real o suficiente para merecer uma ADR própria depois, se o produto vier a precisar. Rejeitada nesta rodada por introduzir essa superfície nova para resolver um problema que a Alternativa A resolve com o que já existe (RPC simples), dentro do orçamento de complexidade do MVP.

### Alternativa C — Só gestão de papel, sem convite
A tela nova listaria só membros já vinculados, permitindo mudar/revogar `visualizador`/`editor` — vincular alguém novo continuaria exigindo que o `admin` copiasse o `user_id` manualmente do painel do Supabase, fora do ClassMap. Menor escopo de implementação (não precisa da função `find_user_id_by_email`), mas resolve só metade do pedido original do usuário ("cadê a opção de cadastro de usuários" — a queixa era justamente não conseguir adicionar alguém novo pela ferramenta). Rejeitada: deixaria o problema central sem solução, só cosmético.

## Consequências

### Positivas
- Nenhuma nova superfície de infraestrutura (nada de Edge Function/e-mail transacional) — só uma função `SECURITY DEFINER` a mais, mesmo padrão já usado em `create_organization` (TASK-001).
- Reaproveita 100% das políticas RLS de `INSERT`/`UPDATE`/`DELETE` de `organization_members`/`project_members`, já corretas desde a TASK-001 — RN-01 (RLS como única fonte de isolamento) não é tocada.
- Fecha RN-03 da TASK-001, que hoje só existe no papel.

### Negativas
- Não é um convite de verdade — a pessoa precisa se cadastrar primeiro, por fora da ferramenta, antes de poder ser vinculada. Se o e-mail digitado não corresponder a ninguém cadastrado, o `admin` só recebe "usuário não encontrado" e precisa avisar a pessoa manualmente para se cadastrar.
- `find_user_id_by_email` precisa ser cuidadosamente revisada (poder de veto de `supabase-multitenant`) para nunca vazar mais que o `user_id` — nenhum outro campo de `auth.users` (e-mail confirmado, etc.) deve sair da função.

### Riscos
- Um `admin` mal-intencionado poderia usar `find_user_id_by_email` para descobrir se um e-mail específico tem conta no ClassMap (enumeração de e-mail) — mitigação: exigir autenticação para chamar a função (já implícito, RPC do Supabase exige sessão) e não diferenciar "e-mail não existe" de "e-mail existe mas já está vinculado" na mensagem de erro, para não vazar informação além do necessário.

## Plano de adoção

Duas tasks, nesta ordem de dependência:
1. **TASK-012** (`supabase-multitenant`) — migration com `find_user_id_by_email` (`SECURITY DEFINER`) + validação de que não vaza dado além do `id`.
2. **TASK-013** (`frontend-diagramas`, depende da TASK-012) — tela de gestão de acesso: buscar por e-mail, listar membros atuais (organização e projeto), mudar papel, revogar.

## Validação

`supabase/README.md` atualizado com o padrão de teste da função nova (chamar com e-mail existente, e-mail inexistente, e confirmar que só o `id` sai). `npm test`/manual na TASK-013 para o fluxo de UI completo.

## Revisão

Reavaliar para a Alternativa B (convite real por e-mail) se o produto crescer para além de um time pequeno e o atrito de "avisar por fora antes de vincular" virar um problema real relatado pelo usuário.
