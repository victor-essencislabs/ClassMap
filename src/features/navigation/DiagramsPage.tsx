// TASK-022 (ADR-008): esta tela deixou de listar diagramas diretamente —
// agora é só a navegação por tipo (cards com contagem). A lista de
// diagramas de um tipo, e a criação, vivem em `DiagramTypeListPage.tsx`.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listDiagrams } from '../../lib/supabase/queries'
import type { Diagram, DiagramType } from '../../lib/supabase/types'
import { DIAGRAM_TYPES, DIAGRAM_TYPE_LABELS } from './diagramTypeLabels'

export function DiagramsPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>()
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    async function reload() {
      setError(null)
      try {
        setDiagrams(await listDiagrams(projectId!))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar diagramas.')
      } finally {
        setLoading(false)
      }
    }
    reload()
  }, [projectId])

  function countFor(type: DiagramType): number {
    return diagrams?.filter((d) => d.type === type).length ?? 0
  }

  return (
    <section>
      <Link to={`/orgs/${orgId}`} className="breadcrumb">
        ← Projetos
      </Link>

      <div className="page-header">
        <h1>Diagramas</h1>
      </div>
      <p className="page-subtitle">Escolha o tipo de documentação para ver os painéis deste projeto.</p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando diagramas…</p>
      ) : (
        <ul className="entity-list">
          {DIAGRAM_TYPES.map((type) => {
            const count = countFor(type)
            return (
              <li key={type} className="entity-list-item">
                <Link to={`/orgs/${orgId}/projects/${projectId}/diagrams/${type}`} className="entity-link">
                  <span className="entity-name">{DIAGRAM_TYPE_LABELS[type]}</span>
                  <span className="entity-meta">
                    <span className="entity-badge">{count === 1 ? '1 painel' : `${count} painéis`}</span>
                    <span className="chevron">→</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
