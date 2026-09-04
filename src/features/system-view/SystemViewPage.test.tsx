// Testa a página inteira (navegação módulo→entidade + os 3 blocos)
// mockando a camada de Supabase — sem isso, `getDiagram`/`getMyProjectRole`
// lançariam por não haver client configurado no ambiente de teste.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
const renameDiagram = vi.fn(async () => undefined)

vi.mock('../../lib/supabase/queries', () => ({
  getDiagram: vi.fn(async () => diagram),
  getCurrentUserId: vi.fn(async () => 'user-1'),
  getMyProjectRole: () => getMyProjectRole(),
  updateDiagramContent: (...args: Parameters<typeof updateDiagramContent>) => updateDiagramContent(...args),
  renameDiagram: (...args: Parameters<typeof renameDiagram>) => renameDiagram(...args),
}))

// TASK-047: `SystemViewPage` passou a usar `useAuth()` (presença) — mock
// simples, mesmo padrão de `OrganizationsPage.test.tsx`, sem precisar
// montar `<AuthProvider>`/Supabase real nestes testes.
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
    renameDiagram.mockClear()
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
    // TASK-057/CA-01: a linha nasce com nome próprio, além da coluna de banco
    expect(screen.getByDisplayValue('campo')).toBeInTheDocument()
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

  describe('TASK-020 — nome do diagrama', () => {
    it('CA-01: editar o nome do diagrama persiste via renameDiagram', async () => {
      renderPage()

      const input = await screen.findByLabelText('Nome do diagrama')
      fireEvent.change(input, { target: { value: 'Documentação — Módulo Cobrança' } })

      await waitFor(() =>
        expect(renameDiagram).toHaveBeenCalledWith('diagram-1', 'Documentação — Módulo Cobrança'),
      )
      expect(await screen.findByDisplayValue('Documentação — Módulo Cobrança')).toBeInTheDocument()
    })

    it('CA-02: campo vazio não persiste — volta ao nome anterior ao perder o foco', async () => {
      renderPage()

      const input = (await screen.findByLabelText('Nome do diagrama')) as HTMLInputElement
      fireEvent.change(input, { target: { value: '  ' } })
      fireEvent.blur(input)

      expect(renameDiagram).not.toHaveBeenCalled()
      expect(await screen.findByDisplayValue('Visão do Sistema')).toBeInTheDocument()
    })

    it('CA-03: em modo visualizador, o nome aparece como texto, sem input', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()

      expect(await screen.findByText('Visão do Sistema')).toBeInTheDocument()
      expect(screen.queryByLabelText('Nome do diagrama')).not.toBeInTheDocument()
    })
  })

  describe('TASK-021 — excluir módulo', () => {
    it('CA-01: excluir remove o módulo e persiste', async () => {
      renderPage()

      await createModule('Account')
      fireEvent.click(await screen.findByLabelText('Excluir módulo Account'))
      fireEvent.click(await screen.findByText('Excluir módulo', { selector: 'button' }))

      await waitFor(() => expect(screen.queryByDisplayValue('Account')).not.toBeInTheDocument())
      await waitFor(() =>
        expect(updateDiagramContent).toHaveBeenCalledWith('diagram-1', expect.objectContaining({ modules: [] })),
      )
    })

    it('CA-02: exige confirmação explícita — não some ao clicar só no "×"', async () => {
      renderPage()

      await createModule('Account')
      fireEvent.click(await screen.findByLabelText('Excluir módulo Account'))

      // ainda não confirmou — o módulo continua
      expect(await screen.findByDisplayValue('Account')).toBeInTheDocument()
      expect(screen.getByText('Excluir módulo', { selector: 'button' })).toBeInTheDocument()
    })

    it('CA-03: excluir o módulo com a entidade selecionada limpa a seleção', async () => {
      renderPage()

      await createModule('Account')
      fireEvent.click(await screen.findByText('+ Entidade'))
      fireEvent.click(screen.getByText('NovaEntidade'))
      expect(screen.getByText('Campos')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Excluir módulo Account'))
      fireEvent.click(screen.getByText('Excluir módulo', { selector: 'button' }))

      expect(await screen.findByText('Selecione uma entidade para ver seus detalhes.')).toBeInTheDocument()
    })

    it('CA-04: em modo visualizador, não mostra o controle de excluir módulo', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()

      await waitFor(() => expect(getMyProjectRole).toHaveBeenCalled())
      expect(screen.queryByLabelText(/Excluir módulo/)).not.toBeInTheDocument()
    })
  })

  describe('TASK-024 — excluir entidade', () => {
    /** Cria um módulo, uma entidade dentro dele e seleciona essa
     * entidade — estado de partida comum aos testes abaixo. */
    async function createAndSelectEntity() {
      await createModule('Account')
      fireEvent.click(await screen.findByText('+ Entidade'))
      fireEvent.click(screen.getByText('NovaEntidade'))
    }

    it('CA-01: excluir remove a entidade da sidebar/detalhe e persiste', async () => {
      renderPage()
      await createAndSelectEntity()
      fireEvent.click(screen.getByText('+ Campo')) // dá conteúdo real pra perder, não só o nome

      fireEvent.click(await screen.findByLabelText('Excluir entidade NovaEntidade'))
      fireEvent.click(await screen.findByText('Excluir entidade', { selector: 'button' }))

      await waitFor(() => expect(screen.queryByText('NovaEntidade')).not.toBeInTheDocument())
      await waitFor(() =>
        expect(updateDiagramContent).toHaveBeenCalledWith(
          'diagram-1',
          expect.objectContaining({ modules: [expect.objectContaining({ entities: [] })] }),
        ),
      )
    })

    it('CA-02: exige confirmação explícita — não some ao clicar só no "×"', async () => {
      renderPage()
      await createAndSelectEntity()

      fireEvent.click(await screen.findByLabelText('Excluir entidade NovaEntidade'))

      // ainda não confirmou — a entidade continua selecionada/visível
      expect(screen.getByText('NovaEntidade', { selector: 'button' })).toBeInTheDocument()
      expect(screen.getByText('Excluir entidade', { selector: 'button' })).toBeInTheDocument()
    })

    it('CA-03: excluir a entidade selecionada limpa a seleção (volta ao estado vazio)', async () => {
      renderPage()
      await createAndSelectEntity()
      expect(screen.getByText('Campos')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Excluir entidade NovaEntidade'))
      fireEvent.click(screen.getByText('Excluir entidade', { selector: 'button' }))

      expect(await screen.findByText('Selecione uma entidade para ver seus detalhes.')).toBeInTheDocument()
    })

    it('CA-04: em modo visualizador, não mostra o controle de excluir entidade', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()

      await waitFor(() => expect(getMyProjectRole).toHaveBeenCalled())
      expect(screen.queryByLabelText(/Excluir entidade/)).not.toBeInTheDocument()
    })
  })

  describe('TASK-058 — import/export na Visão do Sistema (ADR-014)', () => {
    it('a topbar oferece exportar e importar para quem edita', async () => {
      renderPage()

      expect(await screen.findByText('Exportar JSON')).toBeInTheDocument()
      expect(screen.getByText('Importar JSON')).toBeInTheDocument()
    })

    it('CA-08: em modo visualizador, exportar continua, importar não aparece', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()

      expect(await screen.findByText('Exportar JSON')).toBeInTheDocument()
      expect(screen.queryByText('Importar JSON')).not.toBeInTheDocument()
    })

    it('importar um módulo pelo modal traz o módulo e persiste', async () => {
      renderPage()

      fireEvent.click(await screen.findByText('Importar JSON'))
      fireEvent.change(screen.getByLabelText('JSON para importar'), {
        target: {
          value: JSON.stringify({
            type: 'system-view',
            modules: [
              {
                name: 'identidade-e-tenant',
                entities: [{ name: 'Account', fields: [{ name: 'id', dbColumn: 'id', dbType: 'int' }] }],
              },
            ],
          }),
        },
      })
      fireEvent.click(screen.getByText('Importar módulos'))

      expect(await screen.findByDisplayValue('identidade-e-tenant')).toBeInTheDocument()
      expect(screen.getByText('Account')).toBeInTheDocument()
      await waitFor(() =>
        expect(updateDiagramContent).toHaveBeenCalledWith(
          'diagram-1',
          expect.objectContaining({
            modules: [expect.objectContaining({ name: 'identidade-e-tenant' })],
          }),
        ),
      )
    })

    it('TASK-059/CA-02: o modal de exportar oferece o prompt para IA', async () => {
      renderPage()

      fireEvent.click(await screen.findByText('Exportar JSON'))

      expect(screen.getByText('Baixar prompt para IA (.md)')).toBeInTheDocument()
    })

    it('CA-03: arquivo de Diagrama de Classes é recusado, sem tocar no conteúdo', async () => {
      renderPage()

      fireEvent.click(await screen.findByText('Importar JSON'))
      fireEvent.change(screen.getByLabelText('JSON para importar'), {
        target: { value: JSON.stringify({ type: 'class-diagram', classes: [{ name: 'User' }] }) },
      })
      fireEvent.click(screen.getByText('Importar módulos'))

      expect(await screen.findByText(/Diagrama de Classes/)).toBeInTheDocument()
      expect(updateDiagramContent).not.toHaveBeenCalled()
    })
  })

  describe('TASK-057 — linha de correlação entre camadas (ADR-014)', () => {
    /** Conteúdo no formato anterior à `ADR-014` (sem `name`, sem
     * `dtoRequired`, sem `method`), com as três situações reais medidas no
     * E-LIMS: linha completa, coluna FK com alvo, e propriedade de navegação
     * sem coluna de banco. */
    const conteudoSalvo = {
      modules: [
        {
          id: 'm1',
          name: 'identidade-e-tenant',
          entities: [
            {
              id: 'e1',
              name: 'Account',
              fields: [
                {
                  id: 'f1',
                  dbColumn: 'name',
                  dbType: 'varchar(200)',
                  isRequired: true,
                  modelType: 'string?',
                  dtoType: 'string?',
                  dtoRequired: true,
                  dtoMin: '4',
                  dtoMax: '40',
                  validationRule: 'EmailAddress',
                  frontendType: 'string',
                },
                {
                  id: 'f2',
                  name: 'userId',
                  dbColumn: 'user_id',
                  dbType: 'int',
                  isForeignKey: true,
                  foreignKeyTarget: 'User',
                  modelType: 'int?',
                  dtoType: 'int?',
                  validationRule: '',
                  frontendType: 'number',
                },
                {
                  id: 'f3',
                  name: 'user',
                  dbType: '',
                  modelType: 'User?',
                  dtoType: 'UserDto?',
                  validationRule: '',
                  frontendType: 'User',
                },
              ],
              apiMethods: [],
              permissionRules: [
                {
                  id: 'p1',
                  description: 'p1 - dono da conta atualiza a própria',
                  method: 'update',
                  codeCondition: 'if (AccountIdToken != accountDto.Id) return Forbid();',
                },
              ],
            },
          ],
        },
      ],
    }

    const conteudoVazio = diagram.content

    beforeEach(() => {
      diagram.content = conteudoSalvo as unknown as Record<string, unknown>
    })

    afterEach(() => {
      diagram.content = conteudoVazio
    })

    /** Seleciona a entidade `Account` do conteúdo carregado. */
    async function selectAccount() {
      fireEvent.click(await screen.findByText('Account'))
    }

    it('CA-02: conteúdo salvo antes da ADR-014 carrega, com o `dbColumn` servindo de rótulo', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()
      await selectAccount()

      // `f1` não tem `name` salvo — o rótulo vem do `dbColumn` (RN-01).
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('varchar(200)')).toBeInTheDocument()
    })

    it('CA-03: linha sem coluna de banco usa o `name` como rótulo', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()
      await selectAccount()

      expect(screen.getByText('user')).toBeInTheDocument()
      // quando os dois existem e diferem, os dois aparecem
      expect(screen.getByText('userId')).toBeInTheDocument()
      expect(screen.getByText('user_id')).toBeInTheDocument()
    })

    it('CA-04: FK com alvo aparece como `FK → alvo`', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()
      await selectAccount()

      expect(screen.getByText('FK → User')).toBeInTheDocument()
    })

    it('CA-05: REQ/mín/máx convivem com o resíduo em texto livre', async () => {
      getMyProjectRole.mockResolvedValue('visualizador')
      renderPage()
      await selectAccount()

      expect(screen.getByText('REQ')).toBeInTheDocument()
      expect(screen.getByText('mín 4')).toBeInTheDocument()
      expect(screen.getByText('máx 40')).toBeInTheDocument()
      expect(screen.getByText('EmailAddress')).toBeInTheDocument()
      // RN-02: o NN do banco continua na coluna de restrições, separado do REQ
      expect(screen.getByText('NN')).toBeInTheDocument()
    })

    it('CA-06: o método da regra de permissão é editável e persistido', async () => {
      renderPage()
      await selectAccount()

      const input = (await screen.findByLabelText('Método')) as HTMLInputElement
      expect(input.value).toBe('update')

      fireEvent.change(input, { target: { value: 'delete' } })

      await waitFor(() =>
        expect(updateDiagramContent).toHaveBeenCalledWith(
          'diagram-1',
          expect.objectContaining({
            modules: [
              expect.objectContaining({
                entities: [expect.objectContaining({ permissionRules: [expect.objectContaining({ method: 'delete' })] })],
              }),
            ],
          }),
        ),
      )
    })
  })
})
