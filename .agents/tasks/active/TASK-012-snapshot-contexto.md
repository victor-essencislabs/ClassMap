# Snapshot — TASK-012

Gerado em: 2026-08-29
Task: `.agents/tasks/backlog/TASK-012-rpc-buscar-usuario-por-email.md`

## ADR de referência

`.agents/decisions/ADR-004-gestao-acesso-usuarios.md` — decide vincular um usuário já cadastrado por e-mail via uma função `SECURITY DEFINER` nova, em vez de convite real por e-mail (Edge Function, rejeitada por introduzir a primeira infraestrutura server-side própria do projeto) ou de uma tela só de gestão de papel sem resolver o "achar por e-mail" (rejeitada por resolver só metade do pedido).

## Assinaturas de código necessárias

- `create_organization(p_name text) returns public.organizations` em `supabase/migrations/20260828130500_rpc_create_organization.sql` — o padrão exato a seguir: `language plpgsql`, `security definer`, `set search_path = public`, checa `auth.uid() is null` no início, `grant execute on function ... to authenticated` no final. `find_user_id_by_email` deve seguir essa mesma estrutura.
- `create_project(p_organization_id uuid, p_name text) returns public.projects` em `supabase/migrations/20260829080000_rpc_create_project.sql` — segundo exemplo do mesmo padrão, mostra como fazer uma checagem de autorização explícita dentro da função (`if not public.is_org_admin(...) then raise exception`) antes de qualquer efeito — útil de referência, mas `find_user_id_by_email` não escreve nada, só lê, então a checagem de autorização aqui é só "tem sessão" (`auth.uid() is null`), não `is_org_admin` (quem decide o que fazer com o `user_id` retornado é o client, na TASK-013, ao tentar o `INSERT` em `organization_members`/`project_members` — que aí sim exige `is_org_admin`/`is_project_org_admin`).
- `organization_members_insert`/`project_members_insert` em `supabase/migrations/20260828130300_rls_policies.sql` (linhas ~67-69 e ~119-121) — já permitem um `admin` inserir **qualquer** `user_id` (`with check (public.is_org_admin(organization_id))` / `is_project_org_admin(project_id)`, sem restringir a `auth.uid()`). Confirma que nenhuma política precisa mudar — só falta a função de lookup.
- `supabase/README.md` — documentação real das migrations/funções já existentes (frontmatter `estado: real`); a nova função entra aqui, na mesma seção de funções `SECURITY DEFINER`.

## Restrições ativas

- RN-01 da Constituição (`.agents/test-onboarding.md`): RLS é a única fonte de isolamento — `find_user_id_by_email` não pode se tornar um jeito de contornar isso; ela só resolve e-mail→id, nunca decide quem pode vincular quem (isso continua sendo a política RLS de `INSERT`).
- ADR-004, regra "nunca vazar mais que o `id`" — não fazer `select *` nem retornar nenhum outro campo de `auth.users` (e-mail confirmado, criado em, etc.), nem em mensagem de erro.
- `supabase-multitenant` tem poder de veto sobre qualquer mudança que enfraqueça isolamento (`.claude/agents/supabase-multitenant.md`) — mesmo sendo o dono desta task, uma segunda leitura crítica da função antes de considerar concluída é esperada (é uma função com privilégio elevado tocando `auth.users`).

## Próximo passo imediato

~~Escrever a migration nova...~~ — feito em 2026-08-29:
`supabase/migrations/20260829090000_rpc_find_user_id_by_email.sql`,
validada contra Postgres local (CA-01 a CA-04, ver "Validação" na task).
Próximo passo real agora é a TASK-013 (`frontend-diagramas`), e, antes
dela depender desta função em produção, aplicar/validar esta migration
contra o projeto Supabase real (`classmap`) — não feito nesta task por
instrução explícita (aplicar em produção exige revisão humana).

---
Para retomar: abra uma sessão nova e peça para ler este arquivo antes de continuar a task `TASK-012`.
