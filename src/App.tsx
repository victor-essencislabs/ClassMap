import { Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase/client'
import { AuthProvider } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { AppLayout } from './features/navigation/AppLayout'
import { OrganizationsPage } from './features/navigation/OrganizationsPage'
import { ProjectsPage } from './features/navigation/ProjectsPage'
import { DiagramsPage } from './features/navigation/DiagramsPage'
import { DiagramRouterPage } from './features/navigation/DiagramRouterPage'
import { NotConfiguredPage } from './features/setup/NotConfiguredPage'

function App() {
  if (!isSupabaseConfigured) {
    return <NotConfiguredPage />
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout>
                <OrganizationsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/orgs/:orgId"
          element={
            <RequireAuth>
              <AppLayout>
                <ProjectsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/orgs/:orgId/projects/:projectId"
          element={
            <RequireAuth>
              <AppLayout>
                <DiagramsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/orgs/:orgId/projects/:projectId/diagrams/:diagramId"
          element={
            // TASK-007/ADR-002: sem `AppLayout` aqui — o Diagrama de
            // Classes já é full-bleed com seu próprio shell de 3
            // colunas; `DiagramRouterPage` decide, por tipo, quem ainda
            // precisa do `AppLayout` (Objetos/Visão do Sistema, até
            // TASK-008/009).
            <RequireAuth>
              <DiagramRouterPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
