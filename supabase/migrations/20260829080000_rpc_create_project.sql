-- TASK-002 (correção pós-deploy) — RPC para criar um projeto e já
-- vincular o criador como `editor` dele, atomicamente. Mesma lógica de
-- `create_organization` (20260828130500_rpc_create_organization.sql):
-- sem isso, um admin de organização cria o projeto (permitido por
-- `projects_insert`) mas fica sem nenhum vínculo em `project_members`,
-- e portanto sem papel de projeto — `project_role()` retorna null e
-- toda a UI de criar diagrama fica escondida (bug real encontrado ao
-- validar o primeiro projeto criado em produção).
--
-- Diferença para `create_organization`: aqui quem pode chamar precisa
-- ser admin da organização-alvo (reforçado dentro da função, não só via
-- policy de INSERT em `projects`) — a policy `projects_insert` já exige
-- isso, mas replicamos a checagem aqui para poder dar um erro claro
-- antes de qualquer INSERT, e porque a função roda como
-- SECURITY DEFINER (bypassa RLS internamente).

create or replace function public.create_project(p_organization_id uuid, p_name text)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects;
begin
  if not public.is_org_admin(p_organization_id) then
    raise exception 'only an organization admin can create a project';
  end if;

  insert into public.projects (organization_id, name)
  values (p_organization_id, p_name)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, auth.uid(), 'editor');

  return v_project;
end;
$$;

grant execute on function public.create_project(uuid, text) to authenticated;
