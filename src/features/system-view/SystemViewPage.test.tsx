// Testa a página inteira (navegação módulo→entidade + os 3 blocos)
// mockando a camada de Supabase — sem isso, `getDiagram`/`getMyProjectRole`
// lançariam por não haver client configurado no ambiente de teste.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemViewPage } from './SystemViewPage'
import { emptySystemViewContent } from './types'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'

const diagram: Diagram = {
  id: 'diagram-1',
  project_id: 'project-1',
  type: 'system-view',
  name: 'Visão do Sistema',
  content: emptySystemViewContent() as unknown as Record<string, unknown>,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
}

const getMyProjectRole = vi.fn(async (): Promise<ProjectRole> => 'editor')
const updateDiagramContent = vi.fn(async () => undefined)

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: () => getMyProjectRole(),
  updateDiagramContent: (...args: Parameters<typeof updateDiagramContent>) => updateDiagramContent(...args),
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

/** Abre o modal de "+ Módulo", digita (ou não) um nome e confirma —
 * mesma interação do usuário nos testes abaixo (TASK-018). */
async function createModule(name?: string) {
  fireEvent.click(await screen.findByText('+ Módulo'))
  if (name !== undefined) {
    const input = (await screen.findByLabelText('Nome do módulo')) as HTMLInputElement
    fireEvent.change(input, { target: { value: name } })
  }
  fireEvent.click(screen.getByText('Criar módulo'))
}

describe('SystemViewPage', () => {
  beforeEach(() => {
    getMyProjectRole.mockClear()
    getMyProjectRole.mockResolvedValue('editor')
    updateDiagramContent.mockClear()
  })

  it('RN-02: uma entidade recém-criada mostra os 3 blocos, mesmo vazios', async () => {
    renderPage()

    await createModule('Account')
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

    await createModule('Account')
    fireEvent.click(await screen.findByText('+ Entidade'))
    fireEvent.click(screen.getByText('NovaEntidade'))
    fireEvent.click(screen.getByText('+ Campo'))

    expect(screen.queryByText('Nenhum campo cadastrado.')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('coluna')).toBeInTheDocument()
  })

  describe('TASK-018 — nome do módulo', () => {
    it('CA-01: cria o módulo com o nome digitado no modal', async () => {
      renderPage()

      await createModule('Account')

      expect(await screen.findByDisplayValue('Account')).toBeInTheDocument()
    })

    it('CA-02: confirmar com o campo vazio cai no padrão "Novo módulo"', async () => {
      renderPage()

      await createModule('   ')

      expect(await screen.findByDisplayValue('Novo módulo')).toBeInTheDocument()
    })

    it('CA-03: renomear um módulo existente pela sidebar persiste o novo nome', async () => {
      renderPage()

      await createModule('Account')
      const input = await screen.findByDisplayValue('Account')
      fireEvent.change(input, { target: { value: 'Company' } })

      expect(await screen.findByDisplayValue('Company')).toBeInTheDocument()
      await waitFor(() =>
        expect(updateDiagramContent).toHaveBeenCalledWith(
          'diagram-1',
          expect.objectContaining({
            modules: [expect.objectContaining({ name: 'Company' })],
          }),
        ),
      )
    })

    it('CA-04: em modo visualizador, não mostra "+ Módulo" nem input de nome', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()

      await waitFor(() => expect(getMyProjectRole).toHaveBeenCalled())
      expect(screen.queryByText('+ Módulo')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Nome do módulo')).not.toBeInTheDocument()
    })
  })
})
