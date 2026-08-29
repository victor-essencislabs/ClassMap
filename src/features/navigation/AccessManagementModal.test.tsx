// TASK-013 (ADR-004) — fluxo completo do modal genérico de gestão de
// acesso: listar membros, vincular por e-mail (encontrado/não encontrado),
// mudar papel e revogar. Mocka `findUserIdByEmail` (TASK-012) — as demais
// operações (listar/adicionar/mudar papel/revogar) chegam via props,
// exatamente como `OrganizationsPage`/`ProjectsPage` as passam.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccessManagementModal, type AccessMember } from './AccessManagementModal'

const { findUserIdByEmail } = vi.hoisted(() => ({
  findUserIdByEmail: vi.fn(async (email: string) => (email === 'existe@empresa.com' ? 'user-2' : null)),
}))

vi.mock('../../lib/supabase/queries', () => ({ findUserIdByEmail }))

type Role = 'visualizador' | 'editor'

const roleOptions = [
  { value: 'visualizador' as Role, label: 'Visualizador' },
  { value: 'editor' as Role, label: 'Editor' },
]

function renderModal(overrides: Partial<Parameters<typeof AccessManagementModal<Role>>[0]> = {}) {
  const members: AccessMember<Role>[] = [
    { id: 'member-1', user_id: 'user-1', role: 'editor', full_name: 'Ana' },
  ]
  const listMembers = vi.fn(async () => members)
  const addMember = vi.fn(async () => undefined)
  const updateMemberRole = vi.fn(async () => undefined)
  const removeMember = vi.fn(async () => undefined)
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
      onClose={onClose}
      {...overrides}
    />,
  )

  return { listMembers, addMember, updateMemberRole, removeMember, onClose }
}

describe('AccessManagementModal (TASK-013)', () => {
  it('CA-01/CA-02: lista os membros atuais com nome e papel', async () => {
    renderModal()
    expect(await screen.findByText('Ana (você)')).toBeInTheDocument()
  })

  it('CA-03: e-mail sem conta correspondente mostra a mensagem clara, sem adicionar', async () => {
    const { addMember } = renderModal()
    await screen.findByText('Ana (você)')

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
    await screen.findByText('Ana (você)')

    fireEvent.change(screen.getByLabelText('Adicionar por e-mail'), {
      target: { value: 'existe@empresa.com' },
    })
    fireEvent.change(screen.getByLabelText('Papel'), { target: { value: 'editor' } })
    fireEvent.click(screen.getByText('Adicionar'))

    await waitFor(() => expect(addMember).toHaveBeenCalledWith('user-2', 'editor'))
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
  })

  it('CA-04: mudar o papel de um membro chama updateMemberRole e recarrega', async () => {
    const { updateMemberRole, listMembers } = renderModal()
    await screen.findByText('Ana (você)')

    fireEvent.change(screen.getByLabelText('Papel de Ana'), { target: { value: 'visualizador' } })

    await waitFor(() => expect(updateMemberRole).toHaveBeenCalledWith('member-1', 'visualizador'))
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
  })

  it('CA-05: revogar chama removeMember e recarrega', async () => {
    const { removeMember, listMembers } = renderModal()
    await screen.findByText('Ana (você)')

    fireEvent.click(screen.getByText('Revogar'))

    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('member-1'))
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2))
  })

  it('mostra erro e não trava a UI quando addMember rejeita (ex.: já vinculado)', async () => {
    const addMember = vi.fn(async () => {
      throw new Error('Esta pessoa já tem acesso a este projeto.')
    })
    renderModal({ addMember })
    await screen.findByText('Ana (você)')

    fireEvent.change(screen.getByLabelText('Adicionar por e-mail'), {
      target: { value: 'existe@empresa.com' },
    })
    fireEvent.click(screen.getByText('Adicionar'))

    await waitFor(() =>
      expect(screen.getByText('Esta pessoa já tem acesso a este projeto.')).toBeInTheDocument(),
    )
  })
})
