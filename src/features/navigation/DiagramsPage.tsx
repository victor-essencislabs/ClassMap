import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createEmptyDiagram,
  getCurrentUserId,
  getMyProjectRole,
  listDiagrams,
} from '../../lib/supabase/queries'
import type { Diagram, DiagramType, ProjectRole } from '../../lib/supabase/types'

const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  classes: 'Diagrama de Classes',
  objects: 'Diagrama de Objetos',
  'system-view': 'Visão do Sistema',
}

export function DiagramsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>()
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null)
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<DiagramType | null>(null)

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

  async function handleCreateDiagram(type: DiagramType) {
    if (!projectId) return
    setCreating(type)
    setError(null)
    try {
      await createEmptyDiagram(projectId, type, DIAGRAM_TYPE_LABELS[type])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar diagrama.')
    } finally {
      setCreating(null)
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
              <Link to={`/orgs/${orgId}/projects/${projectId}/diagrams/${diagram.id}`}>{diagram.name}</Link>{' '}
              <span className="badge">{DIAGRAM_TYPE_LABELS[diagram.type]}</span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="toolbar">
          {(Object.keys(DIAGRAM_TYPE_LABELS) as DiagramType[]).map((type) => (
            <button key={type} type="button" onClick={() => handleCreateDiagram(type)} disabled={creating !== null}>
              {creating === type ? 'Criando…' : `+ ${DIAGRAM_TYPE_LABELS[type]}`}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
