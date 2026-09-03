// TASK-020 — testa o nome do diagrama editável na topbar, mockando a
// camada de Supabase (mesmo padrão de `SystemViewPage.test.tsx`).
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
// TASK-056
const updateDiagramContent = vi.fn(async () => undefined)
const createDiagramWithContent = vi.fn(async () => ({ ...diagram, id: 'diagram-novo' }))

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: () => getMyProjectRole(),
  updateDiagramContent: (...args: unknown[]) => updateDiagramContent(...(args as [])),
  renameDiagram: (...args: Parameters<typeof renameDiagram>) => renameDiagram(...args),
  createDiagramWithContent: (...args: unknown[]) => createDiagramWithContent(...(args as [])),
}))

// TASK-047: `DiagramEditorPage` passou a usar `useAuth()` (presença) —
// mock simples, mesmo padrão de `OrganizationsPage.test.tsx`, sem
// precisar montar `<AuthProvider>`/Supabase real nestes testes.
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1', email: 'user-1@essencislabs.com', user_metadata: {} } }, loading: false }),
}))

// TASK-047: `useDiagramPresence`/`useDiagramRemoteUpdate` chamam
// `supabase.channel(...)` direto (não passam por `queries.ts`) — sem
// isso, o client real (`.env.local` deste ambiente) tentava abrir um
// WebSocket de verdade contra o Supabase de produção durante o teste.
vi.mock('../../lib/supabase/client', () => ({ supabase: null, isSupabaseConfigured: false }))

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

// TASK-056 — o que é responsabilidade DESTA página no fluxo de criar um
// diagrama com o recorte: onde ele é criado, para onde navega, e o que
// acontece com uma alteração ainda não salva. O recorte em si é testado
// em `focusSubgraph.test.ts`; o gatilho, em `ClassDiagramCanvas.test.tsx`.
describe('DiagramEditorPage — TASK-056 criar diagrama com o recorte', () => {
  function renderPageWithLocation() {
    return render(
      <MemoryRouter initialEntries={['/orgs/org-1/projects/project-1/diagrams/diagram-1']}>
        <LocationProbe />
        <Routes>
          <Route path="/orgs/:orgId/projects/:projectId/diagrams/:diagramId" element={<DiagramEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  async function abrirModalDeNome() {
    renderPageWithLocation()
    await screen.findByRole('button', { name: '+ Classe' })
    fireEvent.click(screen.getByRole('button', { name: '+ Classe' }))
    fireEvent.keyDown(window, { key: 'n' })
    return screen.getByLabelText('Nome do novo diagrama')
  }

  beforeEach(() => {
    getMyProjectRole.mockClear()
    getMyProjectRole.mockResolvedValue('editor')
    updateDiagramContent.mockClear()
    createDiagramWithContent.mockClear()
    createDiagramWithContent.mockResolvedValue({ ...diagram, id: 'diagram-novo' })
  })

  it('CA-01: cria no mesmo projeto, com type "classes", e navega para o diagrama novo', async () => {
    await abrirModalDeNome()

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(createDiagramWithContent).toHaveBeenCalledTimes(1))
    const [projectId, type, name] = createDiagramWithContent.mock.calls[0] as unknown as [string, string, string]
    expect(projectId).toBe('project-1')
    expect(type).toBe('classes')
    expect(name).toBe('Foco — NovaClasse')
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/orgs/org-1/projects/project-1/diagrams/diagram-novo',
      ),
    )
  })

  // RN-08 — o modo de falha aqui é silencioso: navegar dentro da janela
  // do debounce de 800ms desmonta a página e a alteração pendente some
  // sem nenhum aviso. O teste não espera o debounce de propósito: se a
  // gravação não fosse forçada antes de navegar, `updateDiagramContent`
  // não teria sido chamada a esta altura.
  it('CA-10: grava a alteração ainda pendente do autosave antes de navegar', async () => {
    await abrirModalDeNome()
    expect(updateDiagramContent).not.toHaveBeenCalled() // ainda dentro do debounce

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(updateDiagramContent).toHaveBeenCalledTimes(1))
    const [diagramId, saved] = updateDiagramContent.mock.calls[0] as unknown as [
      string,
      { classes: unknown[] },
    ]
    expect(diagramId).toBe('diagram-1')
    expect(saved.classes).toHaveLength(1) // a classe recém-criada foi salva, não perdida
  })

  it('CA-11: falha ao criar mostra o erro e NÃO navega', async () => {
    createDiagramWithContent.mockRejectedValue(new Error('RLS: not authorized'))
    await abrirModalDeNome()

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir' }))

    await waitFor(() => expect(screen.getByText('RLS: not authorized')).toBeInTheDocument())
    expect(screen.getByTestId('location')).toHaveTextContent('/diagrams/diagram-1')
  })

  it('CA-09: visualizador não dispara o fluxo nem por atalho (RN-01)', async () => {
    getMyProjectRole.mockResolvedValue('visualizador')
    renderPageWithLocation()
    await screen.findByText('Diagrama de Classes')

    fireEvent.keyDown(window, { key: 'n' })

    expect(screen.queryByLabelText('Nome do novo diagrama')).not.toBeInTheDocument()
    expect(createDiagramWithContent).not.toHaveBeenCalled()
  })
})

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>
}
