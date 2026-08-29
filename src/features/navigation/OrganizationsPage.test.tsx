// TASK-011 — botão "Excluir" só aparece para quem é `admin` da
// organização (CA-01/CA-04), e confirmar no modal chama `deleteOrganization`
// e recarrega a lista.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationsPage } from './OrganizationsPage'
import type { Organization } from '../../lib/supabase/types'

const { listMyOrganizations, getCurrentUserId, getMyOrganizationRole, deleteOrganization } = vi.hoisted(() => {
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
  }
})

vi.mock('../../lib/supabase/queries', () => ({
  createOrganization: vi.fn(),
  listMyOrganizations,
  getCurrentUserId,
  getMyOrganizationRole,
  deleteOrganization,
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

    expect(adminItem.querySelector('button')).toHaveTextContent('Excluir')
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
