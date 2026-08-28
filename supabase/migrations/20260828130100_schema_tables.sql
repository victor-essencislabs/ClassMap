-- TASK-001 — Schema multi-tenant, RLS e autenticação no Supabase
-- Hierarquia: Organização -> Usuários -> Projetos -> Diagramas.
-- RLS é habilitada na migration seguinte (20260828130300_rls_policies.sql).

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant de topo. Isolamento entre organizações é garantido por RLS (ver .claude/rules/global.md).';

-- ---------------------------------------------------------------------------
-- profiles — perfil 1:1 com auth.users (Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de aplicação vinculado 1:1 a auth.users. Criado automaticamente no cadastro (ver 20260828130400_profile_on_signup.sql).';

-- ---------------------------------------------------------------------------
-- organization_members — vínculo usuário-organização, com papel admin/member
-- ---------------------------------------------------------------------------
create table if not exists public.organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null check (role in ('admin', 'member')),
  created_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Papel admin permite gerenciar acessos e conceder/revogar visualizador/editor por projeto (RN-03 da TASK-001). Não é o papel de projeto.';

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- projects — pertencem a uma organização
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null check (char_length(trim(name)) > 0),
  created_at       timestamptz not null default now()
);

create index if not exists projects_organization_id_idx
  on public.projects (organization_id);

-- ---------------------------------------------------------------------------
-- project_members — vínculo usuário-projeto, com papel visualizador/editor
-- ---------------------------------------------------------------------------
create table if not exists public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('visualizador', 'editor')),
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

comment on table public.project_members is
  'Único nível de permissão granular do produto: visualizador (só leitura) ou editor (RN-02 da TASK-001). Não introduzir um terceiro papel sem ADR.';

create index if not exists project_members_user_id_idx
  on public.project_members (user_id);

create index if not exists project_members_project_id_idx
  on public.project_members (project_id);

-- ---------------------------------------------------------------------------
-- diagrams — pertencem a um projeto; conteúdo em JSONB
-- ---------------------------------------------------------------------------
create table if not exists public.diagrams (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  type        text not null check (type in ('classes', 'objects')),
  name        text not null default 'Novo diagrama',
  content     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.diagrams is
  'content guarda o estado do diagrama (classes/atributos/relações ou objetos). Schema JSON público, contrato com agentes de IA externos — ver .claude/agents/contrato-ia-diagrama.md.';

create index if not exists diagrams_project_id_idx
  on public.diagrams (project_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diagrams_set_updated_at on public.diagrams;
create trigger diagrams_set_updated_at
  before update on public.diagrams
  for each row
  execute function public.set_updated_at();
