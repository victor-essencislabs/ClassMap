// Testa a página inteira (navegação módulo→entidade + os 3 blocos)
// mockando a camada de Supabase — sem isso, `getDiagram`/`getMyProjectRole`
// lançariam por não haver client configurado no ambiente de teste.
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SystemViewPage } from './SystemViewPage'
import { emptySystemViewContent } from './types'
import type { Diagram } from '../../lib/supabase/types'

const diagram: Diagram = {
  id: 'diagram-1',
  project_id: 'project-1',
  type: 'system-view',
  name: 'Visão do Sistema',
  content: emptySystemViewContent() as unknown as Record<string, unknown>,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
}

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: vi.fn(async () => 'editor'),
  updateDiagramContent: vi.fn(async () => undefined),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1/diagrams/diagram-1']}>
      <Routes>
        <Route path="/orgs/:orgId/projects/:projectId/diagrams/:diagramId" element={<SystemViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SystemViewPage', () => {
  it('RN-02: uma entidade recém-criada mostra os 3 blocos, mesmo vazios', async () => {
    renderPage()

    fireEvent.click(await screen.findByText('+ Módulo'))
    fireEvent.click(await screen.findByText('+ Entidade'))
    fireEvent.click(screen.getByText('NovaEntidade'))

    expect(screen.getByText('Campos')).toBeInTheDocument()
    expect(screen.getByText('Nenhum campo cadastrado.')).toBeInTheDocument()
    expect(screen.getByText('Métodos de API')).toBeInTheDocument()
    expect(screen.getByText('Nenhum método de API cadastrado.')).toBeInTheDocument()
    expect(screen.getByText('Regras de Permissão')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma regra de permissão cadastrada.')).toBeInTheDocument()
  })

  it('adiciona um campo e o exibe na tabela', async () => {
    renderPage()

    fireEvent.click(await screen.findByText('+ Módulo'))
    fireEvent.click(await screen.findByText('+ Entidade'))
    fireEvent.click(screen.getByText('NovaEntidade'))
    fireEvent.click(screen.getByText('+ Campo'))

    expect(screen.queryByText('Nenhum campo cadastrado.')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('coluna')).toBeInTheDocument()
  })
})
