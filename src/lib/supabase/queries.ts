// TASK-002 — única camada que fala com o Supabase para navegação da
// hierarquia. Componentes de UI chamam estas funções, nunca o SDK
// diretamente (RN-01 da TASK-002).
//
// Toda função aqui confia no RLS da TASK-001 para o filtro real de
// autorização — nenhuma query abaixo reimplementa isolamento
// organização/projeto em código de aplicação (RN-02 da TASK-002 /
// .claude/rules/global.md).
import { supabase } from './client'
import type {
  Diagram,
  DiagramType,
  Organization,
  OrganizationMember,
  OrganizationRole,
  Project,
  ProjectMember,
  ProjectRole,
} from './types'

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ver .env.example).',
    )
  }
  return supabase
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * Autocadastro (TASK-023, ADR-009) — cria a conta no Supabase Auth. Não
 * cria nenhum vínculo de organização/projeto (RN-01 da TASK-023): o
 * trigger `handle_new_user` (`20260828130400_profile_on_signup.sql`,
 * TASK-001) já cria a linha correspondente em `profiles` sozinho. Com
 * "Auth por e-mail confirmado" habilitado no projeto, `data.session` vem
 * `null` até a pessoa confirmar o e-mail — quem chama trata isso como
 * sucesso (pedir para checar o e-mail), não como erro.
 */
export async function signUp(email: string, password: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function getCurrentUserId(): Promise<string | null> {
  const client = requireClient()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  return data.user?.id ?? null
}

/** Organizações que o usuário autenticado enxerga — filtro real é RLS. */
export async function listMyOrganizations(): Promise<Organization[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('organizations')
    .select('id, name, created_at')
    .order('name')
  if (error) throw error
  return data as Organization[]
}

/**
 * Cria uma organização e já vincula o usuário autenticado como admin
 * dela, atomicamente (RPC `create_organization` da TASK-001 —
 * `SECURITY DEFINER`, único caminho para popular `organizations`/
 * `organization_members` fora de acesso administrativo direto).
 */
export async function createOrganization(name: string): Promise<Organization> {
  const client = requireClient()
  const { data, error } = await client.rpc('create_organization', { p_name: name })
  if (error) throw error
  return data as Organization
}

/** Projetos de uma organização que o usuário autenticado tem acesso. */
export async function listProjects(organizationId: string): Promise<Project[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('projects')
    .select('id, organization_id, name, created_at')
    .eq('organization_id', organizationId)
    .order('name')
  if (error) throw error
  return data as Project[]
}

/**
 * Cria um projeto numa organização e já vincula o usuário autenticado
 * como `editor` dele, atomicamente (RPC `create_project` — mesmo padrão
 * de `create_organization`). Sem isso, o criador ficaria sem papel de
 * *projeto* (é só admin da *organização*, um nível acima) e não veria
 * nenhum controle de edição — bug real encontrado no primeiro uso.
 */
export async function createProject(organizationId: string, name: string): Promise<Project> {
  const client = requireClient()
  const { data, error } = await client.rpc('create_project', {
    p_organization_id: organizationId,
    p_name: name,
  })
  if (error) throw error
  return data as Project
}

/**
 * Exclui definitivamente uma organização (TASK-011, ADR-003). Nenhuma RPC
 * nova — a política RLS `organizations_delete` já exige `is_org_admin(id)`
 * desde a TASK-001, e todas as FKs dependentes (`organization_members`,
 * `projects` e, por sua vez, `project_members`/`diagrams`) já têm `on
 * delete cascade`, então o Postgres remove tudo que dependia dela. Hard
 * delete, sem soft delete/arquivamento (Alternativa C rejeitada na
 * ADR-003) — não há como recuperar depois de confirmado.
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('organizations').delete().eq('id', organizationId)
  if (error) throw error
}

/** Uma organização por id — usado para mostrar o nome dela em telas mais fundas na hierarquia. */
export async function getOrganization(organizationId: string): Promise<Organization> {
  const client = requireClient()
  const { data, error } = await client
    .from('organizations')
    .select('id, name, created_at')
    .eq('id', organizationId)
    .single()
  if (error) throw error
  return data as Organization
}

/** Um projeto por id — usado para mostrar o nome dele em telas mais fundas na hierarquia. */
export async function getProject(projectId: string): Promise<Project> {
  const client = requireClient()
  const { data, error } = await client
    .from('projects')
    .select('id, organization_id, name, created_at')
    .eq('id', projectId)
    .single()
  if (error) throw error
  return data as Project
}

/**
 * Exclui definitivamente um projeto (TASK-011, ADR-003). Mesmo padrão de
 * `deleteOrganization`: nenhuma RPC nova — `projects_delete` já exige
 * `is_org_admin(organization_id)` desde a TASK-001, e `project_members`/
 * `diagrams` já têm `on delete cascade` a partir de `projects.id`. Hard
 * delete — irreversível.
 */
export async function deleteProject(projectId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('projects').delete().eq('id', projectId)
  if (error) throw error
}

/** Diagramas de um projeto — RLS já exige algum papel de projeto para retornar linha. */
export async function listDiagrams(projectId: string): Promise<Diagram[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('diagrams')
    .select('id, project_id, type, name, content, created_at, updated_at')
    .eq('project_id', projectId)
    .order('name')
  if (error) throw error
  return data as Diagram[]
}

/**
 * Papel do usuário autenticado na organização (admin/member), ou null se
 * não for membro. Usado só para reforço de UI (esconder/mostrar "criar
 * projeto") — nunca como a autorização real, que é RLS (RN-01/RN-02 da
 * TASK-002).
 */
export async function getMyOrganizationRole(
  organizationId: string,
  userId: string,
): Promise<OrganizationRole | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.role as OrganizationRole | undefined) ?? null
}

/**
 * Papel do usuário autenticado no projeto (visualizador/editor), ou null
 * se não for membro. Usado só para reforço de UI (esconder/mostrar
 * controles de edição) — nunca como a autorização real, que é RLS
 * (RN-02 da TASK-002).
 */
export async function getMyProjectRole(
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.role as ProjectRole | undefined) ?? null
}

/** Carrega um diagrama por id (RLS já exige algum papel no projeto dono dele). */
export async function getDiagram(diagramId: string): Promise<Diagram> {
  const client = requireClient()
  const { data, error } = await client
    .from('diagrams')
    .select('id, project_id, type, name, content, created_at, updated_at')
    .eq('id', diagramId)
    .single()
  if (error) throw error
  return data as Diagram
}

/** Sobrescreve o `content` de um diagrama. RLS só permite se o usuário for `editor` do projeto (TASK-003). */
export async function updateDiagramContent(
  diagramId: string,
  content: Record<string, unknown>,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('diagrams').update({ content }).eq('id', diagramId)
  if (error) throw error
}

/** Cria um diagrama vazio. RLS só permite se o usuário for `editor` do projeto (CA-03 da TASK-002). */
export async function createEmptyDiagram(
  projectId: string,
  type: DiagramType,
  name: string,
): Promise<Diagram> {
  const client = requireClient()
  const { data, error } = await client
    .from('diagrams')
    .insert({ project_id: projectId, type, name, content: {} })
    .select('id, project_id, type, name, content, created_at, updated_at')
    .single()
  if (error) throw error
  return data as Diagram
}

/**
 * Renomeia um diagrama já criado (TASK-020) — até aqui só era possível
 * definir o nome na criação (TASK-016). Mesma política RLS de
 * `updateDiagramContent` (`diagrams` update exige `editor` do projeto,
 * TASK-003), nenhuma mudança de schema.
 */
export async function renameDiagram(diagramId: string, name: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('diagrams').update({ name }).eq('id', diagramId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// TASK-013 (ADR-004) — gestão de acesso: vincular usuário já cadastrado por
// e-mail a uma organização/projeto e gerenciar o papel dele. Reaproveita
// 100% das políticas RLS de INSERT/UPDATE/DELETE de `organization_members`/
// `project_members`, já corretas desde a TASK-001 — nenhuma delas é
// alterada aqui.
// ---------------------------------------------------------------------------

/**
 * Resolve o `user_id` de uma pessoa a partir do e-mail dela, via a RPC
 * `find_user_id_by_email` (TASK-012, `SECURITY DEFINER`). Retorna `null`
 * quando não há usuário cadastrado com esse e-mail — nunca lança erro
 * nesse caso (RN-02 da ADR-004: não diferenciar "não existe" de "existe
 * mas já vinculado" nesta etapa).
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const client = requireClient()
  const { data, error } = await client.rpc('find_user_id_by_email', { p_email: email })
  if (error) throw error
  return (data as string | null) ?? null
}

/**
 * Busca `full_name` (via `profiles`) para um conjunto de `user_id`,
 * devolvendo um mapa `user_id -> full_name | null`. `profiles_select`
 * (TASK-001) só mostra perfil de quem já divide uma organização com o
 * usuário atual — suficiente aqui, pois só chamamos isto para gente que
 * já está em `organization_members`/`project_members` da mesma
 * organização. Sem FK direta entre `organization_members`/`project_members`
 * e `profiles` (ambas só referenciam `auth.users`), então o embed
 * automático do PostgREST não se aplica — busca à parte, em memória.
 */
async function loadProfileNames(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map()
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('id, full_name').in('id', userIds)
  if (error) throw error
  return new Map((data as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name]))
}

/** Código de erro do Postgres para violação de `unique constraint`. */
const UNIQUE_VIOLATION = '23505'

/** Membros de uma organização (papel `admin`/`member`), com nome de exibição resolvido. */
export async function listOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('organization_members')
    .select('id, organization_id, user_id, role')
    .eq('organization_id', organizationId)
    .order('created_at')
  if (error) throw error
  const rows = data as Omit<OrganizationMember, 'full_name'>[]
  const names = await loadProfileNames(rows.map((row) => row.user_id))
  return rows.map((row) => ({ ...row, full_name: names.get(row.user_id) ?? null }))
}

/**
 * Vincula um usuário já cadastrado (`userId`, resolvido via
 * `findUserIdByEmail`) a uma organização com o papel escolhido. RLS
 * (`organization_members_insert`) já exige que quem chama seja `admin`
 * da organização.
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('organization_members')
    .insert({ organization_id: organizationId, user_id: userId, role })
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error('Esta pessoa já tem acesso a esta organização.')
    throw error
  }
}

/** Muda o papel de um membro já vinculado (RLS exige `admin` da organização). */
export async function updateOrganizationMemberRole(
  memberId: string,
  role: OrganizationRole,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('organization_members').update({ role }).eq('id', memberId)
  if (error) throw error
}

/** Revoga o vínculo de um membro com a organização (RLS exige `admin` da organização). */
export async function removeOrganizationMember(memberId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('organization_members').delete().eq('id', memberId)
  if (error) throw error
}

/** Membros de um projeto (papel `visualizador`/`editor`), com nome de exibição resolvido. */
export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('project_members')
    .select('id, project_id, user_id, role')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  const rows = data as Omit<ProjectMember, 'full_name'>[]
  const names = await loadProfileNames(rows.map((row) => row.user_id))
  return rows.map((row) => ({ ...row, full_name: names.get(row.user_id) ?? null }))
}

/**
 * Vincula um usuário já cadastrado a um projeto com o papel escolhido.
 * RLS (`project_members_insert`) já exige que quem chama seja `admin` da
 * organização dona do projeto (`is_project_org_admin`).
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('project_members').insert({ project_id: projectId, user_id: userId, role })
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new Error('Esta pessoa já tem acesso a este projeto.')
    throw error
  }
}

/** Muda o papel de um membro já vinculado (RLS exige `admin` da organização dona do projeto). */
export async function updateProjectMemberRole(memberId: string, role: ProjectRole): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('project_members').update({ role }).eq('id', memberId)
  if (error) throw error
}

/** Revoga o vínculo de um membro com o projeto (RLS exige `admin` da organização dona do projeto). */
export async function removeProjectMember(memberId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('project_members').delete().eq('id', memberId)
  if (error) throw error
}
