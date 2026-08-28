import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createEmptyDiagram,
  getCurrentUserId,
  getMyProjectRole,
  listDiagrams,
} from '../../lib/supabase/queries'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'

export function DiagramsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>()
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null)
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function reload() {
    if (!projectId) return
    const [diagramList, userId] = await Promise.all([listDiagrams(projectId), getCurrentUserId()])
    setDiagrams(diagramList)
    if (userId) setRole(await getMyProjectRole(projectId, userId))
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar diagramas.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function handleCreateDiagram() {
    if (!projectId) return
    setCreating(true)
    setError(null)
    try {
      await createEmptyDiagram(projectId, 'classes', 'Novo diagrama')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar diagrama.')
    } finally {
      setCreating(false)
    }
  }

  if (error) return <p className="error">{error}</p>
  if (!diagrams) return <p>Carregando diagramas…</p>

  // `visualizador` não vê controle de criar diagrama — reforço de UI;
  // a garantia real de bloqueio é RLS (RN-02 da TASK-002).
  const canEdit = role === 'editor'

  return (
    <section>
      <p>
        <Link to={`/orgs/${orgId}`}>← Projetos</Link>
      </p>
      <h1>Diagramas</h1>

      {diagrams.length === 0 ? (
        <p>Nenhum diagrama neste projeto ainda.</p>
      ) : (
        <ul className="list">
          {diagrams.map((diagram) => (
            <li key={diagram.id}>
              {diagram.type === 'classes' ? (
                <Link to={`/orgs/${orgId}/projects/${projectId}/diagrams/${diagram.id}`}>
                  {diagram.name}
                </Link>
              ) : (
                diagram.name
              )}{' '}
              <span className="badge">{diagram.type}</span>
              {diagram.type === 'objects' && (
                <span className="badge" title="Diagrama de Objetos ainda não tem tela própria (TASK-004)">
                  em breve
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <button type="button" onClick={handleCreateDiagram} disabled={creating}>
          {creating ? 'Criando…' : 'Criar diagrama'}
        </button>
      )}
    </section>
  )
}
