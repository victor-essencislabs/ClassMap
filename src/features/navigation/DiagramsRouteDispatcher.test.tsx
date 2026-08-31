// TASK-022 (ADR-008) — CA-04: a rota compartilhada `/diagrams/:x` precisa
// continuar abrindo diagramas existentes (UUID) sem regressão, além de
// despachar corretamente um slug de tipo para a lista por tipo.
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DiagramsRouteDispatcher } from './DiagramsRouteDispatcher'
import { emptyClassDiagramContent } from '../class-diagram/types'
import type { Diagram } from '../../lib/supabase/types'

const diagram: Diagram = {
  id: 'diagram-1',
  project_id: 'project-1',
  type: 'classes',
  name: 'Diagrama de Classes',
  content: emptyClassDiagramContent() as unknown as Record<string, unknown>,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
}

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: vi.fn(async () => 'editor'),
  updateDiagramContent: vi.fn(async () => undefined),
  renameDiagram: vi.fn(async () => undefined),
  listDiagrams: vi.fn(async () => [diagram]),
  createEmptyDiagram: vi.fn(async () => diagram),
  signOut: vi.fn(async () => undefined),
}))

function renderAt(diagramIdOrType: string) {
  return render(
    <MemoryRouter initialEntries={[`/orgs/org-1/projects/project-1/diagrams/${diagramIdOrType}`]}>
      <Routes>
        <Route
          path="/orgs/:orgId/projects/:projectId/diagrams/:diagramId"
          element={<DiagramsRouteDispatcher />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiagramsRouteDispatcher', () => {
  it('um slug de tipo conhecido abre a lista por tipo, dentro do AppLayout', async () => {
    renderAt('classes')

    expect(await screen.findByText('+ Diagrama de Classes')).toBeInTheDocument()
    // AppLayout (navegação) — o marcador que só existe lá, não nas telas de diagrama.
    expect(screen.getByText('Sair')).toBeInTheDocument()
  })

  it('CA-04: um id de diagrama existente continua abrindo o painel, sem AppLayout', async () => {
    renderAt('diagram-1')

    // ClassDiagramCanvas — chrome próprio, full-bleed (TASK-007/ADR-002).
    expect(await screen.findByRole('button', { name: '+ Classe' })).toBeInTheDocument()
    expect(screen.queryByText('Sair')).not.toBeInTheDocument()
  })
})
