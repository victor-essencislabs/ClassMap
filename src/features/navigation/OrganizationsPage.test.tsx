// TASK-011 — botão "Excluir" só aparece para quem é `admin` da
// organização (CA-01/CA-04), e confirmar no modal chama `deleteOrganization`
// e recarrega a lista.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationsPage } from './OrganizationsPage'
import type { Organization } from '../../lib/supabase/types'

const {
  listMyOrganizations,
  getCurrentUserId,
  getMyOrganizationRole,
  deleteOrganization,
  listOrganizationMembers,
} = vi.hoisted(() => {
  let orgs: Organization[] = [
    { id: 'org-admin', name: 'Essencislabs', created_at: '2026-08-28T00:00:00Z' },
    { id: 'org-member', name: 'Outra Org', created_at: '2026-08-28T00:00:00Z' },
  ]
  return {
    listMyOrganizations: vi.fn(async () => orgs),
    getCurrentUserId: vi.fn(async () => 'user-1'),
    getMyOrganizationRole: vi.fn(async (organizationId: string) =>
      organizationId === 'org-admin' ? 'admin' : 'member',
    ),
    deleteOrganization: vi.fn(async (id: string) => {
      orgs = orgs.filter((org) => org.id !== id)
    }),
    listOrganizationMembers: vi.fn(async () => []),
  }
})

vi.mock('../../lib/supabase/queries', () => ({
  createOrganization: vi.fn(),
  listMyOrganizations,
  getCurrentUserId,
  getMyOrganizationRole,
  deleteOrganization,
  listOrganizationMembers,
  addOrganizationMember: vi.fn(),
  updateOrganizationMemberRole: vi.fn(),
  removeOrganizationMember: vi.fn(),
  findUserIdByEmail: vi.fn(),
  createUserWithPassword: vi.fn(),
}))

// TASK-023 (ADR-009): `OrganizationsPage` passou a usar `useAuth()` para
// mostrar o e-mail do usuário logado no estado vazio — mock simples,
// sem precisar montar `<AuthProvider>`/Supabase real nestes testes.
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { user: { email: 'nova.pessoa@essencislabs.com' } }, loading: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <OrganizationsPage />
    </MemoryRouter>,
  )
}

describe('OrganizationsPage — exclusão (TASK-011)', () => {
  it('CA-01/CA-04: mostra "Excluir" só na organização em que o usuário é admin', async () => {
    renderPage()
    await screen.findByText('Essencislabs')

    const items = screen.getAllByRole('listitem')
    const adminItem = items.find((li) => li.textContent?.includes('Essencislabs'))!
    const memberItem = items.find((li) => li.textContent?.includes('Outra Org'))!

    const adminButtons = Array.from(adminItem.querySelectorAll('button')).map((b) => b.textContent)
    expect(adminButtons).toContain('Excluir')
    expect(memberItem.querySelector('button')).toBeNull()
  })

  it('CA-01: confirmar a exclusão remove a organização da lista', async () => {
    renderPage()
    await screen.findByText('Essencislabs')

    fireEvent.click(screen.getByText('Excluir'))
    expect(screen.getByText('Excluir organização')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Digite/), { target: { value: 'Essencislabs' } })
    fireEvent.click(screen.getByText('Excluir definitivamente'))

    await waitFor(() => expect(deleteOrganization).toHaveBeenCalledWith('org-admin'))
    await waitFor(() => expect(screen.queryByText('Essencislabs')).not.toBeInTheDocument())
  })
})

describe('OrganizationsPage — gestão de acesso (TASK-013)', () => {
  // TASK-011 já excluiu `org-admin`/Essencislabs no describe acima (estado
  // mutado no closure de `listMyOrganizations`) — cada teste aqui repõe uma
  // lista própria via `mockResolvedValueOnce`, sem depender da ordem.
  it('CA-06: "Gerenciar acesso" só aparece para quem é admin da organização', async () => {
    listMyOrganizations.mockResolvedValueOnce([
      { id: 'org-a', name: 'Org Admin Aqui', created_at: '2026-08-28T00:00:00Z' },
      { id: 'org-b', name: 'Org Sem Admin', created_at: '2026-08-28T00:00:00Z' },
    ])
    getMyOrganizationRole.mockImplementationOnce(async (organizationId: string) =>
      organizationId === 'org-a' ? 'admin' : 'member',
    )
    getMyOrganizationRole.mockImplementationOnce(async (organizationId: string) =>
      organizationId === 'org-a' ? 'admin' : 'member',
    )
    renderPage()
    await screen.findByText('Org Admin Aqui')

    const items = screen.getAllByRole('listitem')
    const adminItem = items.find((li) => li.textContent?.includes('Org Admin Aqui'))!
    const memberItem = items.find((li) => li.textContent?.includes('Org Sem Admin'))!

    expect(adminItem.textContent).toContain('Gerenciar acesso')
    expect(memberItem.textContent).not.toContain('Gerenciar acesso')
  })

  it('abre o modal de gestão de acesso da organização certa', async () => {
    listMyOrganizations.mockResolvedValueOnce([
      { id: 'org-c', name: 'Org Gestão', created_at: '2026-08-28T00:00:00Z' },
    ])
    getMyOrganizationRole.mockResolvedValueOnce('admin')
    renderPage()
    await screen.findByText('Org Gestão')

    fireEvent.click(screen.getByText('Gerenciar acesso'))

    expect(await screen.findByText('Gerenciar acesso — Org Gestão')).toBeInTheDocument()
    await waitFor(() => expect(listOrganizationMembers).toHaveBeenCalledWith('org-c'))
  })
})

describe('OrganizationsPage — autocadastro (TASK-023)', () => {
  it('CA-03: sem nenhuma organização, orienta a pedir acesso com o e-mail do usuário logado', async () => {
    listMyOrganizations.mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByText(/peça a um administrador para liberar seu acesso/)).toBeInTheDocument()
    expect(screen.getByText('nova.pessoa@essencislabs.com')).toBeInTheDocument()
  })
})
