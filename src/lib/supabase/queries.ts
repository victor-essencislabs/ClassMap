// TASK-002 — única camada que fala com o Supabase para navegação da
// hierarquia. Componentes de UI chamam estas funções, nunca o SDK
// diretamente (RN-01 da TASK-002).
//
// Toda função aqui confia no RLS da TASK-001 para o filtro real de
// autorização — nenhuma query abaixo reimplementa isolamento
// organização/projeto em código de aplicação (RN-02 da TASK-002 /
// .claude/rules/global.md).
import { supabase } from './client'
import type { Diagram, DiagramType, Organization, Project, ProjectRole } from './types'

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
