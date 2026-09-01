// TASK-020 — testa o nome do diagrama editável na topbar, mockando a
// camada de Supabase (mesmo padrão de `SystemViewPage.test.tsx`).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiagramEditorPage } from './DiagramEditorPage'
import { emptyClassDiagramContent } from './types'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'

const diagram: Diagram = {
  id: 'diagram-1',
  project_id: 'project-1',
  type: 'classes',
  name: 'Diagrama de Classes',
  content: emptyClassDiagramContent() as unknown as Record<string, unknown>,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
}

const getMyProjectRole = vi.fn(async (): Promise<ProjectRole> => 'editor')
const renameDiagram = vi.fn(async () => undefined)

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: () => getMyProjectRole(),
  updateDiagramContent: vi.fn(async () => undefined),
  renameDiagram: (...args: Parameters<typeof renameDiagram>) => renameDiagram(...args),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1/diagrams/diagram-1']}>
      <Routes>
        <Route path="/orgs/:orgId/projects/:projectId/diagrams/:diagramId" element={<DiagramEditorPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DiagramEditorPage — TASK-020 nome do diagrama', () => {
  beforeEach(() => {
    getMyProjectRole.mockClear()
    getMyProjectRole.mockResolvedValue('editor')
    renameDiagram.mockClear()
  })

  it('CA-01: editar o nome persiste via renameDiagram', async () => {
    renderPage()

    const input = await screen.findByLabelText('Nome do diagrama')
    fireEvent.change(input, { target: { value: 'Domínio de Cobrança' } })

    await waitFor(() => expect(renameDiagram).toHaveBeenCalledWith('diagram-1', 'Domínio de Cobrança'))
    expect(await screen.findByDisplayValue('Domínio de Cobrança')).toBeInTheDocument()
  })

  it('CA-02: campo vazio não persiste — volta ao nome anterior ao perder o foco', async () => {
    renderPage()

    const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)

    expect(renameDiagram).not.toHaveBeenCalled()
    expect(await screen.findByDisplayValue('Diagrama de Classes')).toBeInTheDocument()
  })

  it('CA-03: em modo visualizador, o nome aparece como texto, sem input', async () => {
    getMyProjectRole.mockResolvedValue('visualizador')
    renderPage()

    expect(await screen.findByText('Diagrama de Classes')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome do diagrama')).not.toBeInTheDocument()
  })
})

describe('DiagramEditorPage — TASK-038 selo de validação no indicador "Salvo"', () => {
  beforeEach(() => {
    getMyProjectRole.mockClear()
    getMyProjectRole.mockResolvedValue('editor')
    renameDiagram.mockClear()
  })

  it('CA-01: "seal-confirm" só aparece na transição real para o estado salvo, nunca antes disso', async () => {
    renderPage()
    const input = await screen.findByLabelText('Nome do diagrama')

    // ainda não houve nenhuma gravação nesta sessão — nenhum carimbo na tela.
    expect(document.querySelector('.seal-confirm')).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'Domínio de Cobrança' } })

    // enquanto salva, o indicador existe mas ainda sem o efeito de carimbo.
    expect(await screen.findByText('Salvando…')).not.toHaveClass('seal-confirm')

    await waitFor(() => expect(screen.getByText('Salvo')).toHaveClass('seal-confirm'))
  })
})
