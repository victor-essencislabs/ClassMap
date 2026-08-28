import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Redireciona para /login quando não há sessão. Reforço de UI — a
 * garantia real de autorização por linha continua sendo RLS. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <p>Carregando…</p>
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
