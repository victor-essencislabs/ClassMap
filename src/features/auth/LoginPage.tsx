import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { signInWithPassword, signUp } from '../../lib/supabase/queries'
import { useAuth } from './AuthContext'

// TASK-023 (ADR-009): alternância simples Entrar/Criar conta — mesmo
// formulário e-mail/senha, ação diferente. Autocadastro não cria nenhum
// vínculo de organização/projeto (RN-01) — só a conta em si.
type Mode = 'signIn' | 'signUp'

export function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signUpMessage, setSignUpMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSignUpMessage(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSignUpMessage(null)
    setSubmitting(true)
    try {
      if (mode === 'signIn') {
        await signInWithPassword(email, password)
      } else {
        await signUp(email, password)
        setSignUpMessage('Conta criada. Verifique seu e-mail para confirmar antes de entrar.')
        setPassword('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : mode === 'signIn' ? 'Falha ao entrar.' : 'Falha ao criar conta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="centered-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>ClassMap</h1>
        <p>{mode === 'signIn' ? 'Entre com seu e-mail e senha.' : 'Crie sua conta com e-mail e senha.'}</p>

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
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
        />

        {error && <p className="error">{error}</p>}
        {signUpMessage && <p className="save-indicator">{signUpMessage}</p>}

        <button type="submit" disabled={submitting}>
          {submitting
            ? mode === 'signIn'
              ? 'Entrando…'
              : 'Criando…'
            : mode === 'signIn'
              ? 'Entrar'
              : 'Criar conta'}
        </button>

        {mode === 'signIn' ? (
          <button type="button" className="btn ghost" onClick={() => switchMode('signUp')}>
            Não tem conta? Criar conta
          </button>
        ) : (
          <button type="button" className="btn ghost" onClick={() => switchMode('signIn')}>
            Já tem conta? Entrar
          </button>
        )}
      </form>
    </main>
  )
}
