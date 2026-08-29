// TASK-016 — modal de nome antes de `createEmptyDiagram`, mockando a
// camada de Supabase como em `SystemViewPage.test.tsx` (sem isso,
// `listDiagrams`/`getMyProjectRole`/`createEmptyDiagram` lançariam por
// não haver client configurado no ambiente de teste).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiagramsPage } from './DiagramsPage'
import type { Diagram } from '../../lib/supabase/types'

const createEmptyDiagram = vi.fn(
  async (projectId: string, type: Diagram['type'], name: string): Promise<Diagram> => ({
    id: 'diagram-new',
    project_id: projectId,
    type,
    name,
    content: {},
    created_at: '2026-08-29T00:00:00Z',
    updated_at: '2026-08-29T00:00:00Z',
  }),
)
const listDiagrams = vi.fn(async (): Promise<Diagram[]> => [])

vi.mock('../../lib/supabase/queries', () => ({
  createEmptyDiagram: (...args: Parameters<typeof createEmptyDiagram>) => createEmptyDiagram(...args),
  listDiagrams: () => listDiagrams(),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: vi.fn(async () => 'editor'),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1/diagrams']}>
      <Routes>
        <Route path="/orgs/:orgId/projects/:projectId/diagrams" element={<DiagramsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiagramsPage', () => {
  beforeEach(() => {
    createEmptyDiagram.mockClear()
    listDiagrams.mockClear()
  })

  it('CA-01: abre o modal pré-preenchido com o rótulo do tipo e cria com o nome digitado', async () => {
    renderPage()

    fireEvent.click(await screen.findByText('+ Diagrama de Classes'))

    const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement
    expect(input.value).toBe('Diagrama de Classes')

    fireEvent.change(input, { target: { value: 'Diagrama de Classes — Pedidos' } })
    fireEvent.click(screen.getByText('Criar diagrama'))

    await waitFor(() =>
      expect(createEmptyDiagram).toHaveBeenCalledWith('project-1', 'classes', 'Diagrama de Classes — Pedidos'),
    )
  })

  it('CA-02: campo vazio ao confirmar cai no rótulo padrão do tipo', async () => {
    renderPage()

    fireEvent.click(await screen.findByText('+ Diagrama de Objetos'))
    const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByText('Criar diagrama'))

    await waitFor(() =>
      expect(createEmptyDiagram).toHaveBeenCalledWith('project-1', 'objects', 'Diagrama de Objetos'),
    )
  })

  it('CA-03: dois diagramas do mesmo tipo, com nomes diferentes, aparecem diferenciados na lista', async () => {
    listDiagrams.mockResolvedValueOnce([
      {
        id: 'diagram-a',
        project_id: 'project-1',
        type: 'classes',
        name: 'Diagrama de Classes — Pedidos',
        content: {},
        created_at: '2026-08-29T00:00:00Z',
        updated_at: '2026-08-29T00:00:00Z',
      },
      {
        id: 'diagram-b',
        project_id: 'project-1',
        type: 'classes',
        name: 'Diagrama de Classes — Estoque',
        content: {},
        created_at: '2026-08-29T00:00:00Z',
        updated_at: '2026-08-29T00:00:00Z',
      },
    ])
    renderPage()

    expect(await screen.findByText('Diagrama de Classes — Pedidos')).toBeInTheDocument()
    expect(await screen.findByText('Diagrama de Classes — Estoque')).toBeInTheDocument()
  })
})
