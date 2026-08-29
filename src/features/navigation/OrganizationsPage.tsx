import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  addOrganizationMember,
  createOrganization,
  deleteOrganization,
  getCurrentUserId,
  getMyOrganizationRole,
  listMyOrganizations,
  listOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from '../../lib/supabase/queries'
import type { Organization, OrganizationRole } from '../../lib/supabase/types'
import { AccessManagementModal } from './AccessManagementModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'

const ORGANIZATION_ROLE_OPTIONS: { value: OrganizationRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Membro' },
]

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null)
  // RN-01 da TASK-011: só quem é `admin` da organização vê "Excluir" — mesmo
  // reforço de UI das demais telas, a garantia real continua sendo RLS
  // (`organizations_delete` exige `is_org_admin`).
  const [adminOrgIds, setAdminOrgIds] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  // TASK-013 (ADR-004): organização cujo modal de "Gerenciar acesso" está aberto.
  const [manageTarget, setManageTarget] = useState<Organization | null>(null)

  async function reload() {
    setError(null)
    try {
      const orgs = await listMyOrganizations()
      setOrganizations(orgs)
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)
      if (userId) {
        const roles = await Promise.all(orgs.map((org) => getMyOrganizationRole(org.id, userId)))
        setAdminOrgIds(new Set(orgs.filter((_, i) => roles[i] === 'admin').map((org) => org.id)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar organizações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      await createOrganization(name.trim())
      setName('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar organização.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    await deleteOrganization(deleteTarget.id)
    setDeleteTarget(null)
    await reload()
  }

  return (
    <section>
      <div className="page-header">
        <h1>Organizações</h1>
      </div>
      <p className="page-subtitle">Organizações às quais você pertence.</p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando organizações…</p>
      ) : organizations && organizations.length > 0 ? (
        <ul className="entity-list">
          {organizations.map((org) => {
            const canDelete = adminOrgIds.has(org.id)
            return (
              <li key={org.id} className={canDelete ? 'entity-list-item with-actions' : 'entity-list-item'}>
                <Link to={`/orgs/${org.id}`} className="entity-link">
                  <span className="entity-name">{org.name}</span>
                  <span className="chevron">→</span>
                </Link>
                {canDelete && (
                  <>
                    {/* RN-01/CA-06 da TASK-013: só quem é `admin` da organização vê
                        este link — a garantia real continua sendo RLS
                        (`organization_members_insert`/`_update`/`_delete`). */}
                    <button type="button" className="btn ghost small" onClick={() => setManageTarget(org)}>
                      Gerenciar acesso
                    </button>
                    <button
                      type="button"
                      className="btn danger ghost small"
                      onClick={() => setDeleteTarget(org)}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      ) : !error ? (
        <div className="empty-state">
          <p>Você ainda não pertence a nenhuma organização.</p>
          <p>Crie a primeira abaixo para começar.</p>
        </div>
      ) : null}

      <form className="inline-create-form" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="org-name">Nova organização</label>
          <input
            id="org-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da organização"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="primary" disabled={creating || name.trim().length === 0}>
          {creating ? 'Criando…' : 'Criar organização'}
        </button>
      </form>

      {deleteTarget && (
        <DeleteConfirmModal
          title="Excluir organização"
          name={deleteTarget.name}
          warning={`Isto vai excluir definitivamente a organização "${deleteTarget.name}" e todos os projetos, membros e diagramas dela. Esta ação não pode ser desfeita.`}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {manageTarget && (
        <AccessManagementModal
          title={`Gerenciar acesso — ${manageTarget.name}`}
          roleOptions={ORGANIZATION_ROLE_OPTIONS}
          defaultRole="member"
          currentUserId={currentUserId}
          listMembers={() => listOrganizationMembers(manageTarget.id)}
          addMember={(userId, role) => addOrganizationMember(manageTarget.id, userId, role)}
          updateMemberRole={updateOrganizationMemberRole}
          removeMember={removeOrganizationMember}
          onClose={() => setManageTarget(null)}
        />
      )}
    </section>
  )
}
