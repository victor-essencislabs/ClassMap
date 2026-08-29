---
id: TASK-012
title: RPC para localizar usuário por e-mail (gestão de acesso)
status: active
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
- [x] CA-01: Chamar a função com um e-mail de um usuário real cadastrado retorna o `user_id` correto. Validado contra Postgres local (ver "Validação") — pendente repetir contra o projeto Supabase real antes de a TASK-013 depender disso.
- [x] CA-02: Chamar com um e-mail que não existe retorna `null`, sem erro. Validado contra Postgres local.
- [x] CA-03: A função não expõe nenhum campo de `auth.users` além do `id` — confirmado lendo o corpo da função (não há `select *` nem qualquer campo além de `id` no retorno). Confirmado por leitura do arquivo e por inspeção de `pg_proc.prosrc` contra o Postgres local.
- [x] CA-04: Migration aplica sem erro contra Postgres local, seguindo o mesmo padrão de validação da TASK-001 (`supabase/README.md`). As 10 migrations de `supabase/migrations/` aplicaram em ordem, sem erro, num banco limpo.

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
- [x] Escrever a migration com `find_user_id_by_email`, seguindo o padrão de `create_organization` (`SECURITY DEFINER`, `search_path` fixo para evitar sequestro de função).
- [x] Validar contra Postgres local com e-mails de teste (existente/inexistente).
- [x] Documentar em `supabase/README.md`, seção de funções `SECURITY DEFINER`.

## Estratégia de testes
- [x] Manual: chamar a função via SQL direto (Postgres local) com e-mail existente/inexistente, confirmar CA-01/02/03.
- [ ] Integração: repetir contra o projeto Supabase real antes de a TASK-013 depender dela — **não feito nesta task** (fora de escopo por instrução explícita: não aplicar contra produção sem revisão humana).

## Riscos e rollback
Risco médio — é uma função nova com privilégio elevado, mas de escopo mínimo (só devolve um id). Rollback: remover a função via migration de downgrade; nenhum dado é afetado (a função não escreve nada).

## Registro de execução
### Alterações realizadas
Nova migration `supabase/migrations/20260829090000_rpc_find_user_id_by_email.sql`
com a função `public.find_user_id_by_email(p_email text) returns uuid`,
seguindo exatamente a estrutura de `create_organization`
(`20260828130500_rpc_create_organization.sql`): `language plpgsql`,
`security definer`, `set search_path = public`, checa `auth.uid() is
null` no início (`raise exception 'authentication required'`), corpo faz
só `select u.id ... into v_user_id from auth.users u where lower(u.email)
= lower(p_email) limit 1` (retorna `null` se não encontrar, sem lançar
exceção nesse caso), `grant execute on function
public.find_user_id_by_email(text) to authenticated` no final. Nenhuma
política RLS foi tocada — não era necessário (ver ADR-004, "Contexto").
`supabase/README.md` atualizado: item novo na "Ordem das migrations" e
nova seção "Gestão de acesso de usuários — `find_user_id_by_email`
(TASK-012, ADR-004)" com o comportamento da função e o registro da
validação local.

### Arquivos principais
- `supabase/migrations/20260829090000_rpc_find_user_id_by_email.sql` (novo)
- `supabase/README.md` (documentação da função + registro de validação)

### Decisões
- Checagem de autorização dentro da função é só `auth.uid() is null`
  (exige sessão), não `is_org_admin`/`is_project_org_admin` — quem
  decide o que fazer com o `user_id` retornado é o client, na TASK-013,
  ao tentar o `INSERT` em `organization_members`/`project_members` (que
  aí sim já exige `is_org_admin`/`is_project_org_admin` via RLS
  existente). Consistente com a nota do snapshot de contexto da task e
  com ADR-004.
- Timestamp da migration (`20260829090000`) escolhido para vir depois de
  todas as migrations já existentes no repositório no momento da
  implementação (a mais recente era `20260829080000_rpc_create_project.sql`).

### Divergências
Nenhuma divergência da assinatura combinada no snapshot de contexto
(`find_user_id_by_email(p_email text) returns uuid`, mesmo padrão de
`create_organization`). A única observação: o snapshot também citava
`create_project` como segundo exemplo de referência — usado só para
confirmar que a checagem de autorização aqui deveria ficar mínima
(`auth.uid() is null`), não para replicar a checagem `is_org_admin` (que
não se aplica a uma função somente-leitura).

### Pendências
- Aplicar e validar esta migration contra o projeto Supabase real de
  produção (`classmap`) antes de a TASK-013 (frontend) depender dela —
  decisão explícita de não fazer isso nesta task, fica para revisão
  humana.
- TASK-013 (frontend-diagramas): tela de gestão de acesso que consome
  esta função.

## Validação
Sem projeto Supabase real disponível/autorizado para esta task, a
validação rodou contra um Postgres 16 local, num container Docker
efêmero (`postgres:16`), com o mesmo mock de `auth` usado na validação
original da TASK-001 (schema `auth`, tabela `auth.users` com
`id uuid`/`email text`/`raw_user_meta_data jsonb`, função `auth.uid()`
lendo `current_setting('request.jwt.claim.sub', true)`, roles
`anon`/`authenticated`).

Passos executados:
1. Subir `postgres:16` via `docker run`, criar um banco novo
   (`createdb classmap_test`).
2. Aplicar o mock de `auth` e, em seguida, as 10 migrations de
   `supabase/migrations/` em ordem (`psql -f` para cada arquivo,
   `ON_ERROR_STOP=1`) — todas aplicaram sem erro, banco limpo (**CA-04**).
3. Seed de 2 usuários de teste em `auth.users`.
4. Sem sessão (papel `anon`, `request.jwt.claim.sub` vazio):
   `find_user_id_by_email(...)` lançou `authentication required` (mesmo
   comportamento de `create_organization` sem sessão).
5. Autenticado (`request.jwt.claim.sub` setado para um `user_id` de
   teste, papel `authenticated`):
   - `find_user_id_by_email('EXISTE@empresa.com')` (caixa diferente do
     cadastro) retornou o `user_id` correto — confirma comparação
     case-insensitive (**CA-01**).
   - `find_user_id_by_email('naoexiste@empresa.com')` retornou `null`,
     sem erro (**CA-02**).
6. `select prosrc from pg_proc where proname = 'find_user_id_by_email'`
   — corpo da função só contém `select u.id ... into v_user_id`, nenhum
   outro campo de `auth.users` é lido ou retornado (**CA-03**).
7. Container Docker removido ao final (`docker rm -f`) — nenhum estado
   deixado no ambiente.

Resultado completo e comandos reproduzidos em
`supabase/README.md`, seção "TASK-012 — `find_user_id_by_email`
(2026-08-29)".

**Não executado nesta task**: aplicação/validação contra o projeto
Supabase real de produção (`classmap`) — decisão explícita da instrução
recebida (não aplicar migration em produção sem revisão humana).

## Handoff
Migration e validação local concluídas (CA-01 a CA-04). Falta: (1)
aplicar e validar esta migration contra o projeto Supabase real
(`classmap`) — decisão humana, fora desta task; (2) TASK-013
(`frontend-diagramas`), que depende desta, ainda não iniciada.
