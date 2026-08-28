// TASK-002 — client único do Supabase. Nenhum componente de UI deve
// chamar o SDK do Supabase diretamente sem passar por esta camada
// (RN-01 da TASK-002, ver docs/architecture/dependencies.md).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Nenhum projeto Supabase real foi provisionado ainda (ver
// .agents/tasks/active/TASK-001-schema-rls-auth-supabase.md, pendências).
// Sem as env vars, a app deve subir e mostrar uma tela de aviso — nunca
// quebrar o build/dev server.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
