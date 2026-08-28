-- TASK-001 — Row Level Security: única fonte de isolamento multi-tenant
-- (RN-01, ver .claude/rules/global.md e .claude/agents/supabase-multitenant.md).
--
-- Toda tabela abaixo tem RLS habilitada. Nenhuma política de INSERT é criada
-- para `organizations`/`organization_members` na criação inicial de uma
-- organização — esse fluxo passa pela função RPC
-- public.create_organization (20260828130500_rpc_create_organization.sql),
-- que roda como SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy organizations_select on public.organizations
  for select
  using (public.is_org_member(id));

create policy organizations_update on public.organizations
  for update
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create policy organizations_delete on public.organizations
  for delete
  using (public.is_org_admin(id));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Um usuário vê o próprio perfil e o perfil de quem divide ao menos uma
-- organização com ele (necessário para telas de gestão de acesso).
create policy profiles_select on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy profiles_insert on public.profiles
  for insert
  with check (id = auth.uid());

create policy profiles_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy organization_members_select on public.organization_members
  for select
  using (public.is_org_member(organization_id));

create policy organization_members_insert on public.organization_members
  for insert
  with check (public.is_org_admin(organization_id));

create policy organization_members_update on public.organization_members
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy organization_members_delete on public.organization_members
  for delete
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

-- Admin da organização vê todos os projetos dela; demais usuários só veem
-- projetos aos quais foram explicitamente adicionados via project_members.
create policy projects_select on public.projects
  for select
  using (
    public.is_org_admin(organization_id)
    or public.is_project_member(id)
  );

create policy projects_insert on public.projects
  for insert
  with check (public.is_org_admin(organization_id));

create policy projects_update on public.projects
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy projects_delete on public.projects
  for delete
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
alter table public.project_members enable row level security;

create policy project_members_select on public.project_members
  for select
  using (
    public.is_project_org_admin(project_id)
    or public.is_project_member(project_id)
  );

create policy project_members_insert on public.project_members
  for insert
  with check (public.is_project_org_admin(project_id));

create policy project_members_update on public.project_members
  for update
  using (public.is_project_org_admin(project_id))
  with check (public.is_project_org_admin(project_id));

create policy project_members_delete on public.project_members
  for delete
  using (public.is_project_org_admin(project_id));

-- ---------------------------------------------------------------------------
-- diagrams
-- ---------------------------------------------------------------------------
alter table public.diagrams enable row level security;

-- Qualquer papel de projeto (visualizador ou editor) pode ler.
create policy diagrams_select on public.diagrams
  for select
  using (public.project_role(project_id) is not null);

-- Só editor cria/edita/exclui (CA-03/CA-04 da TASK-001) — reforçado no
-- banco, nunca só na UI (RN-02 da TASK-001 / dependencies.md).
create policy diagrams_insert on public.diagrams
  for insert
  with check (public.project_role(project_id) = 'editor');

create policy diagrams_update on public.diagrams
  for update
  using (public.project_role(project_id) = 'editor')
  with check (public.project_role(project_id) = 'editor');

create policy diagrams_delete on public.diagrams
  for delete
  using (public.project_role(project_id) = 'editor');
