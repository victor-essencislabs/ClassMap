// TASK-002 — tipos manuais espelhando o schema de
// supabase/migrations/20260828130100_schema_tables.sql.
//
// Provisório: escritos à mão porque nenhum projeto Supabase real existe
// ainda para gerar tipos automaticamente. Assim que houver um projeto
// provisionado, regenerar com:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
// e substituir este arquivo pelos tipos gerados.

export type OrganizationRole = 'admin' | 'member'
export type ProjectRole = 'visualizador' | 'editor'
export type DiagramType = 'classes' | 'objects' | 'system-view'

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  created_at: string
}

export interface Diagram {
  id: string
  project_id: string
  type: DiagramType
  name: string
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

// TASK-013 (ADR-004) — vínculo usuário-organização/projeto já com o nome
// de exibição resolvido (via `profiles`, TASK-001/`profiles_select`).
// `full_name` vem null quando a pessoa nunca preencheu o perfil — a UI
// mostra o próprio `user_id` como último recurso (nunca o e-mail: não há
// política de SELECT que exponha e-mail de outro usuário, só o
// `find_user_id_by_email` da TASK-012, que só devolve `id`).
export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  full_name: string | null
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
  full_name: string | null
}
