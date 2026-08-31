// TASK-020 — testa o nome do diagrama editável na topbar, mockando a
// camada de Supabase (mesmo padrão de `SystemViewPage.test.tsx`).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectDiagramPage } from './ObjectDiagramPage'
import { emptyObjectDiagramContent } from './types'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'

const diagram: Diagram = {
  id: 'diagram-1',
  project_id: 'project-1',
  type: 'objects',
  name: 'Diagrama de Objetos',
  content: { ...emptyObjectDiagramContent(), links: [] } as unknown as Record<string, unknown>,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
}

const getMyProjectRole = vi.fn(async (): Promise<ProjectRole> => 'editor')
const renameDiagram = vi.fn(async () => undefined)

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: () => getMyProjectRole(),
  listDiagrams: vi.fn(async () => [diagram]),
  updateDiagramContent: vi.fn(async () => undefined),
  renameDiagram: (...args: Parameters<typeof renameDiagram>) => renameDiagram(...args),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1/diagrams/diagram-1']}>
      <Routes>
        <Route path="/orgs/:orgId/projects/:projectId/diagrams/:diagramId" element={<ObjectDiagramPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ObjectDiagramPage — TASK-020 nome do diagrama', () => {
  beforeEach(() => {
    getMyProjectRole.mockClear()
    getMyProjectRole.mockResolvedValue('editor')
    renameDiagram.mockClear()
  })

  it('CA-01: editar o nome persiste via renameDiagram', async () => {
    renderPage()

    const input = await screen.findByLabelText('Nome do diagrama')
    fireEvent.change(input, { target: { value: 'Instâncias de Cobrança' } })

    await waitFor(() => expect(renameDiagram).toHaveBeenCalledWith('diagram-1', 'Instâncias de Cobrança'))
    expect(await screen.findByDisplayValue('Instâncias de Cobrança')).toBeInTheDocument()
  })

  it('CA-02: campo vazio não persiste — volta ao nome anterior ao perder o foco', async () => {
    renderPage()

    const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    expect(renameDiagram).not.toHaveBeenCalled()
    expect(await screen.findByDisplayValue('Diagrama de Objetos')).toBeInTheDocument()
  })

  it('CA-03: em modo visualizador, o nome aparece como texto, sem input', async () => {
    getMyProjectRole.mockResolvedValue('visualizador')
    renderPage()

    expect(await screen.findByText('Diagrama de Objetos')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome do diagrama')).not.toBeInTheDocument()
  })
})
