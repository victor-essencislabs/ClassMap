import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getCurrentUserId,
  getDiagram,
  getMyProjectRole,
  renameDiagram,
  updateDiagramContent,
} from '../../lib/supabase/queries'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'
import { ClassDiagramCanvas } from './ClassDiagramCanvas'
import { emptyClassDiagramContent, isClassDiagramContent, type ClassDiagramContent } from './types'
import { ImportExportControls } from '../import-export/ImportExportControls'

const AUTOSAVE_DELAY_MS = 800

export function DiagramEditorPage() {
  const { orgId, projectId, diagramId } = useParams<{
    orgId: string
    projectId: string
    diagramId: string
  }>()
  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [content, setContent] = useState<ClassDiagramContent | null>(null)
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // TASK-020: nome do diagrama editável na topbar — estado próprio (não
  // `diagram.name` direto) para não persistir campo vazio enquanto o
  // usuário ainda está digitando (RN-01).
  const [nameInput, setNameInput] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!diagramId || !projectId) return
    Promise.all([getDiagram(diagramId), getCurrentUserId()])
      .then(([loadedDiagram, userId]) => {
        setDiagram(loadedDiagram)
        setNameInput(loadedDiagram.name)
        setContent(
          isClassDiagramContent(loadedDiagram.content)
            ? loadedDiagram.content
            : emptyClassDiagramContent(),
        )
        return userId ? getMyProjectRole(projectId, userId) : null
      })
      .then(setRole)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar diagrama.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId, projectId])

  function handleChange(next: ClassDiagramContent) {
    setContent(next)
    if (!diagramId) return

    setSaveState('saving')
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      updateDiagramContent(diagramId, next as unknown as Record<string, unknown>)
        .then(() => setSaveState('saved'))
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Erro ao salvar diagrama.')
          setSaveState('error')
        })
    }, AUTOSAVE_DELAY_MS)
  }

  // TASK-020: campo vazio/só espaços nunca é persistido (RN-01) — o blur
  // (handleNameBlur) devolve o nome anterior nesse caso.
  function handleNameChange(value: string) {
    setNameInput(value)
    if (!diagramId) return
    if (nameSaveTimeout.current) clearTimeout(nameSaveTimeout.current)
    const trimmed = value.trim()
    if (!trimmed) return
    setSaveState('saving')
    nameSaveTimeout.current = setTimeout(() => {
      renameDiagram(diagramId, trimmed)
        .then(() => {
          setDiagram((prev) => (prev ? { ...prev, name: trimmed } : prev))
          setSaveState('saved')
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Erro ao renomear diagrama.')
          setSaveState('error')
        })
    }, AUTOSAVE_DELAY_MS)
  }

  function handleNameBlur() {
    if (!nameInput.trim()) setNameInput(diagram?.name ?? '')
  }

  if (error) return <p className="error">{error}</p>
  if (!diagram || !content) return <p>Carregando diagrama…</p>

  const readOnly = role !== 'editor'

  return (
    <ClassDiagramCanvas
      content={content}
      readOnly={readOnly}
      onChange={handleChange}
      topbarCenter={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          <Link to={`/orgs/${orgId}/projects/${projectId}`} className="breadcrumb" style={{ margin: 0 }}>
            ← Diagramas
          </Link>
          {readOnly ? (
            <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {diagram.name}
            </strong>
          ) : (
            <input
              className="diagram-name-input"
              aria-label="Nome do diagrama"
              value={nameInput}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
            />
          )}
          {/* TASK-038 (ADR-011) — "seal-confirm" só entra na transição real
              para `saved` (RN-01); nunca ao reabrir um diagrama já salvo. */}
          {!readOnly && (
            <span className={saveState === 'saved' ? 'save-indicator seal-confirm' : 'save-indicator'}>
              {saveIndicatorLabel(saveState)}
            </span>
          )}
        </div>
      }
      topbarActions={
        <ImportExportControls
          content={content}
          fileName={diagram.name}
          canImport={!readOnly}
          onImport={handleChange}
        />
      }
    />
  )
}

function saveIndicatorLabel(state: 'idle' | 'saving' | 'saved' | 'error'): string {
  switch (state) {
    case 'saving':
      return 'Salvando…'
    case 'saved':
      return 'Salvo'
    case 'error':
      return 'Falha ao salvar'
    default:
      return ''
  }
}

