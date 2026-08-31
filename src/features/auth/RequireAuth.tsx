import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ForcePasswordChangePage } from './ForcePasswordChangePage'

/** Redireciona para /login quando não há sessão. Reforço de UI — a
 * garantia real de autorização por linha continua sendo RLS.
 *
 * TASK-026 (ADR-010): uma sessão com `user_metadata.must_change_password`
 * (setado pela Edge Function `admin-create-user`, TASK-025, ao criar a
 * conta) nunca vê `children` — bloqueia qualquer navegação até a pessoa
 * trocar a senha em `ForcePasswordChangePage`. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <p>Carregando…</p>
  if (!session) return <Navigate to="/login" replace />
  if (session.user.user_metadata?.must_change_password) return <ForcePasswordChangePage />

  return <>{children}</>
}
