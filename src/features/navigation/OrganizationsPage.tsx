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
      await createOrganization(name)
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
      <h1>Organizações</h1>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando organizações…</p>
      ) : organizations && organizations.length > 0 ? (
        <ul className="list">
          {organizations.map((org) => (
            <li key={org.id}>
              <Link to={`/orgs/${org.id}`}>{org.name}</Link>
            </li>
          ))}
        </ul>
      ) : !error ? (
        <p>Você ainda não pertence a nenhuma organização. Crie a primeira abaixo.</p>
      ) : null}

      <form onSubmit={handleCreate}>
        <label htmlFor="org-name">Nova organização</label>
        <input
          id="org-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da organização"
        />
        <button type="submit" disabled={creating || name.trim().length === 0}>
          {creating ? 'Criando…' : 'Criar organização'}
        </button>
      </form>
    </section>
  )
}
