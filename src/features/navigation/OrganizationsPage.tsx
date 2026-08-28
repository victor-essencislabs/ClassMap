import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyOrganizations } from '../../lib/supabase/queries'
import type { Organization } from '../../lib/supabase/types'

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listMyOrganizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar organizações.'))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!organizations) return <p>Carregando organizações…</p>

  if (organizations.length === 0) {
    return <p>Você ainda não pertence a nenhuma organização.</p>
  }

  return (
    <section>
      <h1>Organizações</h1>
      <ul className="list">
        {organizations.map((org) => (
          <li key={org.id}>
            <Link to={`/orgs/${org.id}`}>{org.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
