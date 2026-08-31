// TASK-026 (ADR-010) — troca obrigatória de senha no primeiro login de
// uma conta criada pelo admin (`user_metadata.must_change_password`,
// setado pela Edge Function `admin-create-user`, TASK-025). Renderizada
// por `RequireAuth` no lugar de `children` enquanto a flag for `true`.
import { useState, type FormEvent } from 'react'
import { updatePassword } from '../../lib/supabase/queries'

const MIN_PASSWORD_LENGTH = 6

export function ForcePasswordChangePage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      // Sucesso: `AuthContext` já ouve `USER_UPDATED` e atualiza a sessão
      // sozinho — `RequireAuth` re-renderiza e libera a navegação normal,
      // sem reload manual.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao trocar a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="centered-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Troque sua senha</h1>
        <p>Esta conta foi criada por um administrador. Defina uma nova senha antes de continuar.</p>

        <label htmlFor="new-password">Nova senha</label>
        <input
          id="new-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />

        <label htmlFor="confirm-password">Confirme a nova senha</label>
        <input
          id="confirm-password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Trocando…' : 'Trocar senha'}
        </button>
      </form>
    </main>
  )
}
