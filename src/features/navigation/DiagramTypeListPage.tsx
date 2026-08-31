// TASK-022 (ADR-008) — lista só os diagramas de um tipo (`type`, recebido
// do despachante `DiagramsRouteDispatcher.tsx`), com o botão de criar já
// específico desse tipo. Reaproveita a lógica que antes vivia direto em
// `DiagramsPage.tsx` (TASK-016/TASK-002) antes de virar a tela de 3 cards.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Modal } from '../diagram-shell/Modal'
import {
  createEmptyDiagram,
  deleteDiagram,
  getCurrentUserId,
  getMyProjectRole,
  listDiagrams,
} from '../../lib/supabase/queries'
import type { Diagram, DiagramType, ProjectRole } from '../../lib/supabase/types'
import { DIAGRAM_TYPE_LABELS } from './diagramTypeLabels'

export function DiagramTypeListPage({ type }: { type: DiagramType }) {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>()
  const [diagrams, setDiagrams] = useState<Diagram[] | null>(null)
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  // TASK-016: antes de criar, pergunta o nome — pré-preenchido com o
  // rótulo do tipo (mesmo padrão de antes, só que agora o tipo já vem
  // fixo pela rota, não escolhido entre 3 botões).
  const [naming, setNaming] = useState(false)
  const [nameInput, setNameInput] = useState('')
  // TASK-028: exclusão de diagrama — confirmação simples (sem digitar o
  // nome), mesmo critério já usado para módulo/entidade na Visão do
  // Sistema (TASK-021/024): exclusão de um único item, sem cascata para
  // outros diagramas/projetos (diferente de ADR-003, organização/projeto).
  const [deleteTarget, setDeleteTarget] = useState<Diagram | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  }, [projectId, type])

  function openNamingModal() {
    setNameInput(DIAGRAM_TYPE_LABELS[type])
    setNaming(true)
  }

  function closeNamingModal() {
    setNaming(false)
  }

  async function handleCreateDiagram(name: string) {
    if (!projectId) return
    setCreating(true)
    setError(null)
    try {
      // Campo vazio (ou só espaços) cai de volta no rótulo padrão do tipo —
      // a coluna `diagrams.name` é `not null` (CA-02 original, TASK-016).
      await createEmptyDiagram(projectId, type, name.trim() || DIAGRAM_TYPE_LABELS[type])
      closeNamingModal()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar diagrama.')
    } finally {
      setCreating(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await deleteDiagram(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir diagrama.')
    } finally {
      setDeleting(false)
    }
  }

  // `visualizador` não vê controle de criar diagrama — reforço de UI;
  // a garantia real de bloqueio é RLS (RN-02 da TASK-002).
  const canEdit = role === 'editor'
  const filtered = diagrams?.filter((d) => d.type === type) ?? null

  return (
    <section>
      <Link to={`/orgs/${orgId}/projects/${projectId}`} className="breadcrumb">
        ← Diagramas
      </Link>

      <div className="page-header">
        <h1>{DIAGRAM_TYPE_LABELS[type]}</h1>
      </div>
      <p className="page-subtitle">Painéis de {DIAGRAM_TYPE_LABELS[type].toLowerCase()} deste projeto.</p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Carregando diagramas…</p>
      ) : filtered && filtered.length > 0 ? (
        <ul className="entity-list">
          {filtered.map((diagram) => (
            <li key={diagram.id} className={canEdit ? 'entity-list-item with-actions' : 'entity-list-item'}>
              <Link to={`/orgs/${orgId}/projects/${projectId}/diagrams/${diagram.id}`} className="entity-link">
                <span className="entity-name">{diagram.name}</span>
                <span className="chevron">→</span>
              </Link>
              {/* RN da TASK-028: só `editor` vê "Excluir" — reforço de UI, a
                  garantia real continua sendo RLS (`diagrams_delete`). */}
              {canEdit && (
                <button
                  type="button"
                  className="btn danger ghost small"
                  onClick={() => setDeleteTarget(diagram)}
                >
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : !error ? (
        <div className="empty-state">
          <p>Nenhum painel deste tipo ainda.</p>
          {canEdit && <p>Crie o primeiro abaixo.</p>}
        </div>
      ) : null}

      {canEdit && (
        <div className="toolbar">
          <button type="button" className="primary" onClick={openNamingModal} disabled={creating}>
            {creating ? 'Criando…' : `+ ${DIAGRAM_TYPE_LABELS[type]}`}
          </button>
        </div>
      )}

      {naming && (
        <Modal title={`Novo — ${DIAGRAM_TYPE_LABELS[type]}`} onClose={closeNamingModal}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreateDiagram(nameInput)
            }}
          >
            <div className="field">
              <label htmlFor="diagram-name-input">Nome do diagrama</label>
              <input
                id="diagram-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn primary" disabled={creating}>
                {creating ? 'Criando…' : 'Criar diagrama'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Excluir diagrama" onClose={() => setDeleteTarget(null)}>
          <p className="error">
            Isto vai excluir definitivamente o diagrama <strong>{deleteTarget.name}</strong>, com todo o
            conteúdo dele. Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn danger" disabled={deleting} onClick={handleConfirmDelete}>
              {deleting ? 'Excluindo…' : 'Excluir definitivamente'}
            </button>
            <button type="button" className="btn ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
