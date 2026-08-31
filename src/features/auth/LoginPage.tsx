import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { signInWithPassword } from '../../lib/supabase/queries'
import { useAuth } from './AuthContext'

// TASK-026 (ADR-010): reverte a alternância pública "Criar conta" da
// TASK-023 — provisionamento agora é sempre pelo admin (ver
// AccessManagementModal), nunca por autocadastro. Só o formulário de
// entrar.
export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="centered-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>ClassMap</h1>
        <p>Entre com seu e-mail e senha.</p>

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
