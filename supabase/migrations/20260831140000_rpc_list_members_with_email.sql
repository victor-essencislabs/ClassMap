-- TASK-027 — RPCs para listar membros de organização/projeto já com o
-- e-mail resolvido. Até aqui (TASK-013) a lista de membros só mostrava
-- `full_name`/id truncado — `profiles` nunca guardou e-mail (decisão da
-- TASK-012/ADR-004, para não duplicar dado de `auth.users`), e não havia
-- política de SELECT que expusesse e-mail de outro usuário. Isso ficou
-- inviável na prática assim que existiu um segundo usuário real: sem
-- e-mail, não dá para saber quem é "Usuário 87cb8966…" na lista.
--
-- Mesmo padrão de `find_user_id_by_email` (SECURITY DEFINER, ponte para
-- `auth.users`) — mas aqui a exposição é ainda mais restrita: só o e-mail
-- de quem **já é** membro visível da mesma organização/projeto de quem
-- chama (a mesma authorização que a política `organization_members_select`/
-- `project_members_select` já concede para a linha; a função só adiciona
-- o e-mail a uma linha que o chamador já pode ler, nunca amplia quem pode
-- ler quais linhas).

create or replace function public.list_organization_members_with_email(p_organization_id uuid)
returns table (id uuid, organization_id uuid, user_id uuid, role text, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'not a member of this organization';
  end if;

  return query
    select om.id, om.organization_id, om.user_id, om.role, u.email::text
    from public.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id = p_organization_id
    order by om.created_at;
end;
$$;

grant execute on function public.list_organization_members_with_email(uuid) to authenticated;

create or replace function public.list_project_members_with_email(p_project_id uuid)
returns table (id uuid, project_id uuid, user_id uuid, role text, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not (public.is_project_member(p_project_id) or public.is_project_org_admin(p_project_id)) then
    raise exception 'not authorized for this project';
  end if;

  return query
    select pm.id, pm.project_id, pm.user_id, pm.role, u.email::text
    from public.project_members pm
    join auth.users u on u.id = pm.user_id
    where pm.project_id = p_project_id
    order by pm.created_at;
end;
$$;

grant execute on function public.list_project_members_with_email(uuid) to authenticated;
