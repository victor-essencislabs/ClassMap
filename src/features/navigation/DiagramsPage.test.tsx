// TASK-022 (ADR-008) — a tela virou 3 cards de tipo com contagem; a
// lista/criação por tipo migrou para `DiagramTypeListPage.test.tsx`.
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiagramsPage } from './DiagramsPage'
import type { Diagram } from '../../lib/supabase/types'

function diagram(overrides: Partial<Diagram>): Diagram {
  return {
    id: 'diagram-x',
    project_id: 'project-1',
    type: 'classes',
    name: 'Diagrama',
    content: {},
    created_at: '2026-08-29T00:00:00Z',
    updated_at: '2026-08-29T00:00:00Z',
    ...overrides,
  }
}

const listDiagrams = vi.fn(async (): Promise<Diagram[]> => [])

vi.mock('../../lib/supabase/queries', () => ({
  listDiagrams: () => listDiagrams(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1']}>
      <Routes>
        <Route path="/orgs/:orgId/projects/:projectId" element={<DiagramsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiagramsPage — TASK-022 cards por tipo', () => {
  beforeEach(() => {
    listDiagrams.mockClear()
  })

  it('CA-01: mostra os 3 tipos com a contagem correta', async () => {
    listDiagrams.mockResolvedValueOnce([
      diagram({ id: 'a', type: 'classes' }),
      diagram({ id: 'b', type: 'classes' }),
      diagram({ id: 'c', type: 'objects' }),
    ])
    renderPage()

    expect(await screen.findByText('Diagrama de Classes')).toBeInTheDocument()
    expect(screen.getByText('2 painéis')).toBeInTheDocument()
    expect(screen.getByText('Diagrama de Objetos')).toBeInTheDocument()
    expect(screen.getByText('1 painel')).toBeInTheDocument()
    expect(screen.getByText('Visão do Sistema')).toBeInTheDocument()
    expect(screen.getByText('0 painéis')).toBeInTheDocument()
  })

  it('CA-02: o card de cada tipo aponta para a rota de lista daquele tipo', async () => {
    renderPage()

    const link = (await screen.findByText('Diagrama de Classes')).closest('a')
    expect(link).toHaveAttribute('href', '/orgs/org-1/projects/project-1/diagrams/classes')
  })
})
