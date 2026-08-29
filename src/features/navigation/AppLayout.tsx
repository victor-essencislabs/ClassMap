import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/supabase/queries'

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          ClassMap
        </Link>
        <button type="button" onClick={handleSignOut}>
          Sair
        </button>
      </header>
      <main>{children}</main>
    </div>
  )
}
