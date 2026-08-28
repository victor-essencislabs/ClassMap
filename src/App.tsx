import { Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase/client'
import { AuthProvider } from './features/auth/AuthContext'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { AppLayout } from './features/navigation/AppLayout'
import { OrganizationsPage } from './features/navigation/OrganizationsPage'
import { ProjectsPage } from './features/navigation/ProjectsPage'
import { DiagramsPage } from './features/navigation/DiagramsPage'
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
      </Routes>
    </AuthProvider>
  )
}

export default App
