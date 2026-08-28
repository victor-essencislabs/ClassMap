import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listProjects } from '../../lib/supabase/queries'
import type { Project } from '../../lib/supabase/types'

export function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    listProjects(orgId)
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar projetos.'))
  }, [orgId])

  if (error) return <p className="error">{error}</p>
  if (!projects) return <p>Carregando projetos…</p>

  return (
    <section>
      <p>
        <Link to="/">← Organizações</Link>
      </p>
      <h1>Projetos</h1>
      {projects.length === 0 ? (
        <p>Nenhum projeto disponível para você nesta organização.</p>
      ) : (
        <ul className="list">
          {projects.map((project) => (
            <li key={project.id}>
              <Link to={`/orgs/${orgId}/projects/${project.id}`}>{project.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
