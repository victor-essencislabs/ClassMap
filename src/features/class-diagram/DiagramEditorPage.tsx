import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCurrentUserId, getDiagram, getMyProjectRole, updateDiagramContent } from '../../lib/supabase/queries'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'
import { ClassDiagramCanvas } from './ClassDiagramCanvas'
import { emptyClassDiagramContent, type ClassDiagramContent } from './types'

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
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!diagramId || !projectId) return
    Promise.all([getDiagram(diagramId), getCurrentUserId()])
      .then(([loadedDiagram, userId]) => {
        setDiagram(loadedDiagram)
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

  if (error) return <p className="error">{error}</p>
  if (!diagram || !content) return <p>Carregando diagrama…</p>

  const readOnly = role !== 'editor'

  return (
    <section className="diagram-editor-page">
      <p>
        <Link to={`/orgs/${orgId}/projects/${projectId}`}>← Diagramas</Link>
      </p>
      <div className="diagram-editor-header">
        <h1>{diagram.name}</h1>
        {!readOnly && <span className="save-indicator">{saveIndicatorLabel(saveState)}</span>}
      </div>

      <ClassDiagramCanvas content={content} readOnly={readOnly} onChange={handleChange} />
    </section>
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

function isClassDiagramContent(value: unknown): value is ClassDiagramContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ClassDiagramContent).classes) &&
    Array.isArray((value as ClassDiagramContent).relationships)
  )
}
