import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createProject,
  deleteProject,
  getCurrentUserId,
  getMyOrganizationRole,
  getOrganization,
  listProjects,
} from '../../lib/supabase/queries'
import type { Organization, OrganizationRole, Project } from '../../lib/supabase/types'
import { DeleteConfirmModal } from './DeleteConfirmModal'

export function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [role, setRole] = useState<OrganizationRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  function reload() {
    if (!orgId) return Promise.resolve()
    setError(null)
    return Promise.all([listProjects(orgId), getOrganization(orgId), getCurrentUserId()])
      .then(([projectList, org, userId]) => {
        setProjects(projectList)
        setOrganization(org)
        return userId ? getMyOrganizationRole(orgId, userId) : null
      })
      .then((organizationRole) => setRole(organizationRole))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar projetos.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setError(null)
    setCreating(true)
    try {
      await createProject(orgId, name.trim())
      setName('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    await deleteProject(deleteTarget.id)
    setDeleteTarget(null)
    await reload()
  }

  return (
    <section>
      <Link to="/" className="breadcrumb">
        ← Organizações
      </Link>

      <div className="page-header">
        <h1>Projetos</h1>
      </div>
      <p className="page-subtitle">
        {organization ? <>Projetos de <strong>{organization.name}</strong>.</> : 'Carregando organização…'}
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando projetos…</p>
      ) : projects && projects.length > 0 ? (
        <ul className="entity-list">
          {projects.map((project) => (
            <li key={project.id} className={role === 'admin' ? 'entity-list-item with-actions' : 'entity-list-item'}>
              <Link to={`/orgs/${orgId}/projects/${project.id}`} className="entity-link">
                <span className="entity-name">{project.name}</span>
                <span className="chevron">→</span>
              </Link>
              {/* RN-01 da TASK-011: só `admin` da organização dona exclui um
                  projeto dela — mesmo papel que já controla "Criar projeto"
                  abaixo; a garantia real continua sendo RLS (`projects_delete`). */}
              {role === 'admin' && (
                <button
                  type="button"
                  className="btn danger ghost small"
                  onClick={() => setDeleteTarget(project)}
                >
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="empty-state">
          <p>Nenhum projeto disponível para você nesta organização.</p>
          {role === 'admin' && <p>Crie o primeiro abaixo.</p>}
        </div>
      ) : null}

      {/* `member` não vê controle de criar projeto — reforço de UI; a
          garantia real de bloqueio é RLS (projects_insert exige admin). */}
      {role === 'admin' && (
        <form className="inline-create-form" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="project-name">Novo projeto</label>
            <input
              id="project-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do projeto"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="primary" disabled={creating || name.trim().length === 0}>
            {creating ? 'Criando…' : 'Criar projeto'}
          </button>
        </form>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Excluir projeto"
          name={deleteTarget.name}
          warning={`Isto vai excluir definitivamente o projeto "${deleteTarget.name}" e todos os membros e diagramas dele. Esta ação não pode ser desfeita.`}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  )
}
