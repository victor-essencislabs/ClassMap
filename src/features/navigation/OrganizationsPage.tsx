import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createOrganization, listMyOrganizations } from '../../lib/supabase/queries'
import type { Organization } from '../../lib/supabase/types'

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  function reload() {
    setError(null)
    return listMyOrganizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar organizações.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
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
          {organizations.map((org) => (
            <li key={org.id} className="entity-list-item">
              <Link to={`/orgs/${org.id}`} className="entity-link">
                <span className="entity-name">{org.name}</span>
                <span className="chevron">→</span>
              </Link>
            </li>
          ))}
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
    </section>
  )
}
