---
id: TASK-012
title: RPC para localizar usuário por e-mail (gestão de acesso)
status: backlog
type: feature
owner: supabase-multitenant
created_at: 2026-08-29
updated_at: 2026-08-29
affected_modules: [dados-multitenant]
related_use_cases: []
related_adrs: [ADR-004]
---

# TASK-012 — RPC para localizar usuário por e-mail

## Contexto
Primeira das 2 tasks de `ADR-004` (gestão de acesso de usuários). A TASK-013 (frontend, depende desta) precisa resolver "e-mail digitado pelo admin → `user_id`" para poder inserir em `organization_members`/`project_members` (cujas políticas de `INSERT` já permitem um `admin` vincular qualquer `user_id` — só falta descobrir qual).

## Problema
Não há hoje nenhuma forma segura, pelo client, de descobrir o `user_id` de uma pessoa a partir do e-mail dela — `auth.users` não tem política de `SELECT` exposta (nem deveria ter, é tabela do Supabase Auth) e `profiles_select` só mostra perfis de quem já divide uma organização com o usuário atual.

## Objetivo
Função `SECURITY DEFINER` `public.find_user_id_by_email(p_email text) returns uuid` que consulta `auth.users` internamente e devolve **só o `id`** (ou `null` se não encontrar) — nunca nenhum outro campo de `auth.users`.

## Fora de escopo
- Qualquer UI (TASK-013).
- Envio de e-mail/convite real (ver ADR-004, Alternativa B rejeitada).
- Alteração nas políticas de `organization_members`/`project_members` — já permitem o que é preciso (ver ADR-004, "Contexto").

## Comportamento atual
Nenhuma função equivalente existe. O único precedente de `SECURITY DEFINER` no projeto é `create_organization` (TASK-001, `20260828130500_rpc_create_organization.sql`).

## Comportamento esperado
- `select public.find_user_id_by_email('alguem@empresa.com')` retorna o `uuid` de `auth.users.id` se o e-mail existir (comparação case-insensitive, `lower(email) = lower(p_email)`), ou `null` se não existir.
- A função exige um usuário autenticado para ser chamada (comportamento padrão de RPC do Supabase com RLS habilitada no schema — confirmar que `anon` não consegue chamar sem sessão).
- Nenhum outro campo de `auth.users` (e-mail confirmado, criado em, etc.) é exposto pela função nem em nenhum log/erro dela.

## Regras de negócio
- RN-01: A função nunca deve devolver mais que o `id` — qualquer alteração futura que amplie o retorno é uma mudança de superfície de segurança e precisa de revisão do papel `supabase-multitenant` (poder de veto).
- RN-02: A mensagem de erro/retorno não deve diferenciar "e-mail não existe" de "e-mail existe mas a pessoa já está vinculada" (essa segunda checagem é feita depois, pelo client, ao tentar o `INSERT` em `organization_members`/`project_members` — que já falha por `unique (organization_id, user_id)` se já houver vínculo) — evita enumeração de e-mail além do mínimo necessário.

## Critérios de aceitação
- [ ] CA-01: Chamar a função com um e-mail de um usuário real cadastrado retorna o `user_id` correto.
- [ ] CA-02: Chamar com um e-mail que não existe retorna `null`, sem erro.
- [ ] CA-03: A função não expõe nenhum campo de `auth.users` além do `id` — confirmado lendo o corpo da função (não há `select *` nem qualquer campo além de `id` no retorno).
- [ ] CA-04: Migration aplica sem erro contra Postgres local, seguindo o mesmo padrão de validação da TASK-001 (`supabase/README.md`).

## Impacto técnico
### Backend
Não aplicável (sem camada de backend própria).
### Frontend
Nenhum nesta task (TASK-013 consome).
### Banco de dados
Nova migration em `supabase/migrations/`, com a função `SECURITY DEFINER`.
### Integrações
Nenhuma nova.
### Segurança
Superfície nova — uma função que consulta `auth.users` com privilégio elevado. Precisa de revisão explícita do papel `supabase-multitenant` (poder de veto sobre qualquer mudança que enfraqueça isolamento) antes de considerar concluída, mesmo sendo o próprio dono da task.

## Plano de implementação
- [ ] Escrever a migration com `find_user_id_by_email`, seguindo o padrão de `create_organization` (`SECURITY DEFINER`, `search_path` fixo para evitar sequestro de função).
- [ ] Validar contra Postgres local com e-mails de teste (existente/inexistente).
- [ ] Documentar em `supabase/README.md`, seção de funções `SECURITY DEFINER`.

## Estratégia de testes
- [ ] Manual: chamar a função via SQL direto (Postgres local) com e-mail existente/inexistente, confirmar CA-01/02/03.
- [ ] Integração: repetir contra o projeto Supabase real antes de a TASK-013 depender dela.

## Riscos e rollback
Risco médio — é uma função nova com privilégio elevado, mas de escopo mínimo (só devolve um id). Rollback: remover a função via migration de downgrade; nenhum dado é afetado (a função não escreve nada).

## Registro de execução
### Alterações realizadas
### Arquivos principais
### Decisões
### Divergências
### Pendências

## Validação
Comandos e resultados.

## Handoff
Nenhum — task ainda não iniciada. TASK-013 depende da conclusão desta.
