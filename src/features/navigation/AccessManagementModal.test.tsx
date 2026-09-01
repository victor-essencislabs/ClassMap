// TASK-013 (ADR-004) — fluxo completo do modal genérico de gestão de
// acesso: listar membros, vincular por e-mail (encontrado/não encontrado),
// mudar papel e revogar. Mocka `findUserIdByEmail` (TASK-012) — as demais
// operações (listar/adicionar/mudar papel/revogar) chegam via props,
// exatamente como `OrganizationsPage`/`ProjectsPage` as passam.
//
// TASK-026 (ADR-010): modo "Criar conta nova" (`createUser`, chama a
// Edge Function `admin-create-user` via `queries.ts`) e legenda de papel.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccessManagementModal, type AccessMember, type AccessRoleOption } from './AccessManagementModal'

const { findUserIdByEmail } = vi.hoisted(() => ({
  findUserIdByEmail: vi.fn(async (email: string) => (email === 'existe@empresa.com' ? 'user-2' : null)),
}))

vi.mock('../../lib/supabase/queries', () => ({ findUserIdByEmail }))

type Role = 'visualizador' | 'editor'

const roleOptions: AccessRoleOption<Role>[] = [
  { value: 'visualizador', label: 'Visualizador', description: 'Só navega e visualiza os diagramas.' },
  { value: 'editor', label: 'Editor', description: 'Cria, edita e exclui diagramas.' },
]

// TASK-036 (ADR-011): o `<select>` de papel virou `RolePicker` (2 botões
// de rádio lado a lado, raise "Painel Catódico") — clicar no rótulo do
// papel desejado dentro do `radiogroup` certo (há mais de um "Papel" na
// tela: o de cada linha de membro e o do formulário de adicionar).
function clickRole(radiogroupName: string, roleLabel: string) {
  const group = screen.getByRole('radiogroup', { name: radiogroupName })
  fireEvent.click(within(group).getByText(roleLabel))
}

function renderModal(overrides: Partial<Parameters<typeof AccessManagementModal<Role>>[0]> = {}) {
  const members: AccessMember<Role>[] = [
    { id: 'member-1', user_id: 'user-1', role: 'editor', full_name: 'Ana', email: 'ana@empresa.com' },
  ]
  const listMembers = vi.fn(async () => members)
  const addMember = vi.fn(async () => undefined)
  const updateMemberRole = vi.fn(async () => undefined)
  const removeMember = vi.fn(async () => undefined)
  const createUser = vi.fn(async () => ({ user_id: 'new-user-1' }))
  const onClose = vi.fn()

  render(
    <AccessManagementModal<Role>
      title="Gerenciar acesso — Projeto X"
      roleOptions={roleOptions}
      defaultRole="visualizador"
      currentUserId="user-1"
      listMembers={listMembers}
      addMember={addMember}
      updateMemberRole={updateMemberRole}
      removeMember={removeMember}
      createUser={createUser}
      onClose={onClose}
      {...overrides}
    />,
  )

  return { listMembers, addMember, updateMemberRole, removeMember, createUser, onClose }
}

describe('AccessManagementModal (TASK-013)', () => {
  it('CA-01/CA-02: lista os membros atuais com nome e papel', async () => {
    renderModal()
    expect(await screen.findByText('ana@empresa.com — Ana (você)')).toBeInTheDocument()
  })

  it('CA-03: e-mail sem conta correspondente mostra a mensagem clara, sem adicionar', async () => {
    const { addMember } = renderModal()
    await screen.findByText('ana@empresa.com — Ana (você)')

    fireEvent.change(screen.getByLabelText('Adicionar por e-mail'), {
      target: { value: 'naoexiste@empresa.com' },
    })
    fireEvent.click(screen.getByText('Adicionar'))

    await waitFor(() =>
      expect(
        screen.getByText(/Nenhum usuário encontrado com este e-mail/),
      ).toBeInTheDocument(),
    )
    expect(addMember).not.toHaveBeenCalled()
  })

  it('CA-01: e-mail de usuário existente vincula com o papel escolhido e a lista recarrega', async () => {
    const { addMember, listMembers } = renderModal()
    await screen.findByText('ana@empresa.com — Ana (você)')

    fireEvent.change(screen.getByLabelText('Adicionar por e-mail'), {
      target: { value: 'existe@empresa.com' },
    })
    clickRole('Papel', 'Editor')
    fireEvent.click(screen.getByText('Adicionar'))

    await waitFor(() => expect(addMember).toHaveBeenCalledWith('user-2', 'editor'))
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
  })

  it('CA-04: mudar o papel de um membro chama updateMemberRole e recarrega', async () => {
    const { updateMemberRole, listMembers } = renderModal()
    await screen.findByText('ana@empresa.com — Ana (você)')

    clickRole('Papel de ana@empresa.com', 'Visualizador')

    await waitFor(() => expect(updateMemberRole).toHaveBeenCalledWith('member-1', 'visualizador'))
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
  })

  it('CA-05: revogar chama removeMember e recarrega', async () => {
    const { removeMember, listMembers } = renderModal()
    await screen.findByText('ana@empresa.com — Ana (você)')

    fireEvent.click(screen.getByText('Revogar'))

    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('member-1'))
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
  })

  it('mostra erro e não trava a UI quando addMember rejeita (ex.: já vinculado)', async () => {
    const addMember = vi.fn(async () => {
      throw new Error('Esta pessoa já tem acesso a este projeto.')
    })
    renderModal({ addMember })
    await screen.findByText('ana@empresa.com — Ana (você)')

    fireEvent.change(screen.getByLabelText('Adicionar por e-mail'), {
      target: { value: 'existe@empresa.com' },
    })
    fireEvent.click(screen.getByText('Adicionar'))

    await waitFor(() =>
      expect(screen.getByText('Esta pessoa já tem acesso a este projeto.')).toBeInTheDocument(),
    )
  })

  it('legenda do papel muda com a seleção, no formulário de "Já tem conta"', async () => {
    renderModal()
    await screen.findByText('ana@empresa.com — Ana (você)')

    expect(screen.getByText('Só navega e visualiza os diagramas.')).toBeInTheDocument()
    clickRole('Papel', 'Editor')
    expect(screen.getByText('Cria, edita e exclui diagramas.')).toBeInTheDocument()
  })

  describe('TASK-026 — "Criar conta nova"', () => {
    async function switchToCreateMode() {
      await screen.findByText('ana@empresa.com — Ana (você)')
      fireEvent.click(screen.getByText('Criar conta nova'))
    }

    it('CA-01/02: chama createUser com e-mail/senha/papel e mostra a senha uma vez, na tela de sucesso', async () => {
      const { createUser, listMembers } = renderModal()
      await switchToCreateMode()

      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'novo@empresa.com' } })
      fireEvent.change(screen.getByLabelText('Senha temporária'), { target: { value: 'senha-temp-123' } })
      clickRole('Papel', 'Editor')
      fireEvent.click(screen.getByText('Criar conta'))

      await waitFor(() =>
        expect(createUser).toHaveBeenCalledWith('novo@empresa.com', 'senha-temp-123', 'editor'),
      )
      expect(await screen.findByText(/Conta criada\. Repasse para novo@empresa\.com/)).toBeInTheDocument()
      expect(screen.getByText('senha-temp-123')).toBeInTheDocument()
      await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
    })

    // TASK-038 (ADR-011): "seal-confirm" dispara na entrada do bloco
    // "Conta criada..." — o `<p>` só existe a partir do momento em que
    // `createdAccount` deixa de ser nulo (RN-01), então não há estado
    // intermediário para checar "antes" além de o bloco não existir.
    it('CA-03: o bloco "Conta criada..." ganha o efeito de carimbo (seal-confirm) ao aparecer', async () => {
      renderModal()
      await switchToCreateMode()

      expect(document.querySelector('.seal-confirm')).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'novo@empresa.com' } })
      fireEvent.change(screen.getByLabelText('Senha temporária'), { target: { value: 'senha-temp-123' } })
      fireEvent.click(screen.getByText('Criar conta'))

      const block = await screen.findByText(/Conta criada\. Repasse para novo@empresa\.com/)
      expect(block).toHaveClass('seal-confirm')
    })

    it('botão "Gerar senha" preenche o campo com um valor não vazio', async () => {
      renderModal()
      await switchToCreateMode()

      fireEvent.click(screen.getByText('Gerar senha'))
      expect((screen.getByLabelText('Senha temporária') as HTMLInputElement).value.length).toBeGreaterThan(0)
    })

    it('CA-04: e-mail já cadastrado mostra erro claro, sem criar duplicata', async () => {
      const createUser = vi.fn(async () => {
        throw new Error('Este e-mail já tem uma conta — use "Já tem conta" para vincular em vez de criar uma nova.')
      })
      renderModal({ createUser })
      await switchToCreateMode()

      fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ja.existe@empresa.com' } })
      fireEvent.change(screen.getByLabelText('Senha temporária'), { target: { value: 'senha-temp-123' } })
      fireEvent.click(screen.getByText('Criar conta'))

      expect(
        await screen.findByText('Este e-mail já tem uma conta — use "Já tem conta" para vincular em vez de criar uma nova.'),
      ).toBeInTheDocument()
    })

    it('mostra o texto de ajuda de vínculo de organização quando informado (modal de projeto)', async () => {
      renderModal({ createUserHelpText: 'Essa pessoa também será adicionada como membro de ELIMS.' })
      await switchToCreateMode()

      expect(
        screen.getByText('Essa pessoa também será adicionada como membro de ELIMS.'),
      ).toBeInTheDocument()
    })
  })
})
