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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<DiagramType | null>(null)

  async function reload() {
    if (!projectId) return
    setError(null)
    try {
      const [diagramList, userId] = await Promise.all([listDiagrams(projectId), getCurrentUserId()])
      setDiagrams(diagramList)
      if (userId) setRole(await getMyProjectRole(projectId, userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar diagramas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
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

  // `visualizador` não vê controle de criar diagrama — reforço de UI;
  // a garantia real de bloqueio é RLS (RN-02 da TASK-002).
  const canEdit = role === 'editor'

  return (
    <section>
      <Link to={`/orgs/${orgId}`} className="breadcrumb">
        ← Projetos
      </Link>

      <div className="page-header">
        <h1>Diagramas</h1>
      </div>
      <p className="page-subtitle">As 3 visualizações deste projeto vivem aqui.</p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando diagramas…</p>
      ) : diagrams && diagrams.length > 0 ? (
        <ul className="entity-list">
          {diagrams.map((diagram) => (
            <li key={diagram.id} className="entity-list-item">
              <Link to={`/orgs/${orgId}/projects/${projectId}/diagrams/${diagram.id}`} className="entity-link">
                <span className="entity-name">{diagram.name}</span>
                <span className="entity-meta">
                  <span className="entity-badge">{DIAGRAM_TYPE_LABELS[diagram.type]}</span>
                  <span className="chevron">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="empty-state">
          <p>Nenhum diagrama neste projeto ainda.</p>
          {canEdit && <p>Crie o primeiro abaixo.</p>}
        </div>
      ) : null}

      {canEdit && (
        <div className="toolbar">
          {(Object.keys(DIAGRAM_TYPE_LABELS) as DiagramType[]).map((type) => (
            <button
              key={type}
              type="button"
              className="primary"
              onClick={() => handleCreateDiagram(type)}
              disabled={creating !== null}
            >
              {creating === type ? 'Criando…' : `+ ${DIAGRAM_TYPE_LABELS[type]}`}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
