// TASK-011 — botão "Excluir" só aparece para `admin` da organização dona
// (CA-02/CA-04), e confirmar no modal chama `deleteProject` e recarrega a
// lista.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProjectsPage } from './ProjectsPage'
import type { Organization, OrganizationRole, Project } from '../../lib/supabase/types'

const { listProjects, getOrganization, getCurrentUserId, getMyOrganizationRole, deleteProject, listProjectMembers } =
  vi.hoisted(() => {
    let projects: Project[] = [
      { id: 'proj-1', organization_id: 'org-1', name: 'ClassMap', created_at: '2026-08-28T00:00:00Z' },
    ]
    const organization: Organization = { id: 'org-1', name: 'Essencislabs', created_at: '2026-08-28T00:00:00Z' }
    return {
      listProjects: vi.fn(async () => projects),
      getOrganization: vi.fn(async () => organization),
      getCurrentUserId: vi.fn(async () => 'user-1'),
      getMyOrganizationRole: vi.fn(async (): Promise<OrganizationRole> => 'admin'),
      deleteProject: vi.fn(async (id: string) => {
        projects = projects.filter((p) => p.id !== id)
      }),
      listProjectMembers: vi.fn(async () => []),
    }
  })

vi.mock('../../lib/supabase/queries', () => ({
  createProject: vi.fn(),
  listProjects,
  getOrganization,
  getCurrentUserId,
  getMyOrganizationRole,
  deleteProject,
  listProjectMembers,
  addProjectMember: vi.fn(),
  updateProjectMemberRole: vi.fn(),
  removeProjectMember: vi.fn(),
  findUserIdByEmail: vi.fn(),
  createUserWithPassword: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orgs/org-1']}>
      <Routes>
        <Route path="/orgs/:orgId" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProjectsPage — exclusão (TASK-011)', () => {
  it('CA-02: admin da organização vê "Excluir" e confirmar remove o projeto da lista', async () => {
    renderPage()
    await screen.findByText('ClassMap')

    fireEvent.click(screen.getByText('Excluir'))
    expect(screen.getByText('Excluir projeto')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Digite/), { target: { value: 'ClassMap' } })
    fireEvent.click(screen.getByText('Excluir definitivamente'))

    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('proj-1'))
    await waitFor(() => expect(screen.queryByText('ClassMap')).not.toBeInTheDocument())
  })

  it('CA-04: quem não é admin não vê "Excluir"', async () => {
    getMyOrganizationRole.mockResolvedValueOnce('member')
    // repõe o projeto removido pelo teste anterior
    listProjects.mockResolvedValueOnce([
      { id: 'proj-2', organization_id: 'org-1', name: 'Outro projeto', created_at: '2026-08-28T00:00:00Z' },
    ])
    renderPage()

    await screen.findByText('Outro projeto')
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument()
  })
})

describe('ProjectsPage — gestão de acesso (TASK-013)', () => {
  it('CA-06: quem não é admin da organização não vê "Gerenciar acesso"', async () => {
    getMyOrganizationRole.mockResolvedValueOnce('member')
    listProjects.mockResolvedValueOnce([
      { id: 'proj-3', organization_id: 'org-1', name: 'Outro projeto 2', created_at: '2026-08-28T00:00:00Z' },
    ])
    renderPage()

    await screen.findByText('Outro projeto 2')
    expect(screen.queryByText('Gerenciar acesso')).not.toBeInTheDocument()
  })

  it('CA-02: admin abre o modal de gestão de acesso do projeto com papel visualizador/editor', async () => {
    getMyOrganizationRole.mockResolvedValueOnce('admin')
    listProjects.mockResolvedValueOnce([
      { id: 'proj-4', organization_id: 'org-1', name: 'Projeto Gestão', created_at: '2026-08-28T00:00:00Z' },
    ])
    renderPage()
    await screen.findByText('Projeto Gestão')

    fireEvent.click(screen.getByText('Gerenciar acesso'))

    expect(await screen.findByText('Gerenciar acesso — Projeto Gestão')).toBeInTheDocument()
    await waitFor(() => expect(listProjectMembers).toHaveBeenCalledWith('proj-4'))
    // TASK-036 (ADR-011): o `<select>` de papel virou `RolePicker` (2
    // botões de rádio lado a lado, raise "Painel Catódico").
    expect(screen.getByRole('radiogroup', { name: 'Papel' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Visualizador' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Editor' })).toBeInTheDocument()
  })
})
