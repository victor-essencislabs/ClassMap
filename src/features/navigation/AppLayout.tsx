import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signOut } from '../../lib/supabase/queries'
import { ThemeToggle } from '../theme/ThemeToggle'

// TASK-044 (ADR-011) — profundidade da rota, para decidir a direção da
// transição de página (entrar da direita ao descer um nível na
// hierarquia Organizações→Projetos→Diagramas, da esquerda ao subir).
// Contagem simples de segmentos do path — não modela a hierarquia de
// forma alguma, só serve de heurística para a animação.
export function routeDepth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  // "Guardar informação de renders anteriores" sem useEffect — padrão
  // oficial do React (comparar durante o render e chamar `setState`
  // condicionalmente) para decidir a direção da transição sem depender
  // de heurística de rota nenhuma além da contagem de segmentos. Só
  // dispara um re-render extra quando o path realmente muda.
  const [previousPathname, setPreviousPathname] = useState(location.pathname)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  if (location.pathname !== previousPathname) {
    setDirection(routeDepth(location.pathname) > routeDepth(previousPathname) ? 'forward' : 'back')
    setPreviousPathname(location.pathname)
  }

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
        <div className="app-header-actions">
          <ThemeToggle />
          <button type="button" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </header>
      <main>
        {/* TASK-044 (ADR-011) — remonta a cada troca de rota (mesmo
            mecanismo de `key` da TASK-035) para repetir a transição de
            profundidade; a classe de direção decide se entra da direita
            (descendo um nível) ou da esquerda (subindo). */}
        <div key={location.pathname} className={`app-page-transition app-page-transition-${direction}`}>
          {children}
        </div>
      </main>
    </div>
  )
}
