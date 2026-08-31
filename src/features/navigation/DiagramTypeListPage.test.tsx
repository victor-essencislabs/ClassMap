// TASK-022 (ADR-008) — testes migrados de `DiagramsPage.test.tsx`
// (TASK-016) para a lista/criação por tipo, agora nesta página.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiagramTypeListPage } from './DiagramTypeListPage'
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
const deleteDiagram = vi.fn(async () => undefined)
const getMyProjectRole = vi.fn(async () => 'editor')

vi.mock('../../lib/supabase/queries', () => ({
  createEmptyDiagram: (...args: Parameters<typeof createEmptyDiagram>) => createEmptyDiagram(...args),
  listDiagrams: () => listDiagrams(),
  deleteDiagram: (...args: Parameters<typeof deleteDiagram>) => deleteDiagram(...args),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: () => getMyProjectRole(),
}))

const SAMPLE_DIAGRAM: Diagram = {
  id: 'diagram-a',
  project_id: 'project-1',
  type: 'classes',
  name: 'Diagrama de Classes — Pedidos',
  content: {},
  created_at: '2026-08-29T00:00:00Z',
  updated_at: '2026-08-29T00:00:00Z',
}

function renderPage(type: Diagram['type'] = 'classes') {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1/diagrams/classes']}>
      <Routes>
        <Route path="/orgs/:orgId/projects/:projectId/diagrams/:x" element={<DiagramTypeListPage type={type} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiagramTypeListPage', () => {
  beforeEach(() => {
    createEmptyDiagram.mockClear()
    listDiagrams.mockClear()
    deleteDiagram.mockClear()
    getMyProjectRole.mockClear()
    getMyProjectRole.mockResolvedValue('editor')
  })

  it('CA-03: cria já com o tipo certo, sem pedir para escolher o tipo', async () => {
    renderPage('classes')

    fireEvent.click(await screen.findByText('+ Diagrama de Classes'))

    const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement
    expect(input.value).toBe('Diagrama de Classes')

    fireEvent.change(input, { target: { value: 'Diagrama de Classes — Pedidos' } })
    fireEvent.click(screen.getByText('Criar diagrama'))

    await waitFor(() =>
      expect(createEmptyDiagram).toHaveBeenCalledWith('project-1', 'classes', 'Diagrama de Classes — Pedidos'),
    )
  })

  it('campo vazio ao confirmar cai no rótulo padrão do tipo', async () => {
    renderPage('objects')

    fireEvent.click(await screen.findByText('+ Diagrama de Objetos'))
    const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement

    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByText('Criar diagrama'))

    await waitFor(() =>
      expect(createEmptyDiagram).toHaveBeenCalledWith('project-1', 'objects', 'Diagrama de Objetos'),
    )
  })

  it('CA-02: só mostra diagramas do tipo recebido, mesmo com outros tipos na lista', async () => {
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
        type: 'objects',
        name: 'Diagrama de Objetos — Pedidos',
        content: {},
        created_at: '2026-08-29T00:00:00Z',
        updated_at: '2026-08-29T00:00:00Z',
      },
    ])
    renderPage('classes')

    expect(await screen.findByText('Diagrama de Classes — Pedidos')).toBeInTheDocument()
    expect(screen.queryByText('Diagrama de Objetos — Pedidos')).not.toBeInTheDocument()
  })

  it('TASK-028 CA-01: editor confirma exclusão e a lista recarrega', async () => {
    listDiagrams.mockResolvedValueOnce([SAMPLE_DIAGRAM]).mockResolvedValueOnce([])
    renderPage('classes')

    fireEvent.click(await screen.findByText('Excluir'))
    expect(await screen.findByText('Excluir diagrama')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Excluir definitivamente'))

    await waitFor(() => expect(deleteDiagram).toHaveBeenCalledWith('diagram-a'))
    await waitFor(() => expect(listDiagrams).toHaveBeenCalledTimes(2))
  })

  it('TASK-028 CA-02: cancelar não exclui nada', async () => {
    listDiagrams.mockResolvedValueOnce([SAMPLE_DIAGRAM])
    renderPage('classes')

    fireEvent.click(await screen.findByText('Excluir'))
    fireEvent.click(await screen.findByText('Cancelar'))

    expect(screen.queryByText('Excluir diagrama')).not.toBeInTheDocument()
    expect(deleteDiagram).not.toHaveBeenCalled()
  })

  it('TASK-028 CA-03: visualizador não vê a opção de excluir', async () => {
    getMyProjectRole.mockResolvedValue('visualizador')
    listDiagrams.mockResolvedValueOnce([SAMPLE_DIAGRAM])
    renderPage('classes')

    await screen.findByText('Diagrama de Classes — Pedidos')
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument()
  })
})
