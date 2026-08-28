-- TASK-001 — Funções auxiliares para as políticas RLS.
--
-- SECURITY DEFINER com search_path fixo: evitam recursão de RLS ao consultar
-- a própria tabela multi-tenant dentro de uma política (padrão recomendado
-- pelo Supabase) e evitam sequestro de search_path. Executam com o
-- privilégio do owner da migration (bypassa RLS internamente), mas só
-- expõem checagens de pertencimento — nunca retornam linhas inteiras de
-- outra organização.

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.project_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pm.role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = auth.uid();
$$;

-- Um admin de organização enxerga e gerencia todos os projetos/vínculos da
-- própria organização, mesmo sem estar em project_members (RN-03 TASK-001).
create or replace function public.is_project_org_admin(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = p_project_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.project_role(uuid) to authenticated;
grant execute on function public.is_project_org_admin(uuid) to authenticated;
