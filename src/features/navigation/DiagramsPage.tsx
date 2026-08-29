import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '../diagram-shell/Modal'
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
  // TASK-016: antes de criar, pergunta o nome — pré-preenchido com o
  // rótulo do tipo (mesmo valor que `createEmptyDiagram` usava sozinho),
  // editável. `namingType` guarda qual botão abriu o modal.
  const [namingType, setNamingType] = useState<DiagramType | null>(null)
  const [nameInput, setNameInput] = useState('')

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

  function openNamingModal(type: DiagramType) {
    setNameInput(DIAGRAM_TYPE_LABELS[type])
    setNamingType(type)
  }

  function closeNamingModal() {
    setNamingType(null)
  }

  async function handleCreateDiagram(type: DiagramType, name: string) {
    if (!projectId) return
    setCreating(type)
    setError(null)
    try {
      // Campo vazio (ou só espaços) cai de volta no rótulo padrão do tipo —
      // a coluna `diagrams.name` é `not null` (CA-02).
      await createEmptyDiagram(projectId, type, name.trim() || DIAGRAM_TYPE_LABELS[type])
      closeNamingModal()
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
              onClick={() => openNamingModal(type)}
              disabled={creating !== null}
            >
              {creating === type ? 'Criando…' : `+ ${DIAGRAM_TYPE_LABELS[type]}`}
            </button>
          ))}
        </div>
      )}

      {namingType && (
        <Modal title={`Novo — ${DIAGRAM_TYPE_LABELS[namingType]}`} onClose={closeNamingModal}>
          <label htmlFor="diagram-name-input">Nome do diagrama</label>
          <input
            id="diagram-name-input"
            type="text"
            style={{ display: 'block', width: '100%', marginTop: 6 }}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateDiagram(namingType, nameInput)
            }}
          />
          <div className="modal-actions">
            <button
              type="button"
              className="btn primary"
              disabled={creating !== null}
              onClick={() => handleCreateDiagram(namingType, nameInput)}
            >
              {creating === namingType ? 'Criando…' : 'Criar diagrama'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
