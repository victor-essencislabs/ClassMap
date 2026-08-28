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
