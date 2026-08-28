-- TASK-001 — RPC para criar uma organização e já vincular o criador como
-- admin, atomicamente. É o único caminho para popular `organizations` e o
-- primeiro `organization_members` de um usuário comum — não há política de
-- INSERT direta nessas tabelas para esse caso (ver 20260828130300_rls_policies.sql).

create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.organizations (name)
  values (p_name)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, auth.uid(), 'admin');

  return v_org;
end;
$$;

grant execute on function public.create_organization(text) to authenticated;
