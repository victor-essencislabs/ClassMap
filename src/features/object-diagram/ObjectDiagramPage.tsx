import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isClassDiagramContent } from '../class-diagram/types'
import {
  getCurrentUserId,
  getDiagram,
  getMyProjectRole,
  listDiagrams,
  updateDiagramContent,
} from '../../lib/supabase/queries'
import type { Diagram, ProjectRole } from '../../lib/supabase/types'
import { ObjectDiagramCanvas } from './ObjectDiagramCanvas'
import { emptyObjectDiagramContent, type ObjectDiagramContent } from './types'

const AUTOSAVE_DELAY_MS = 800

export function ObjectDiagramPage() {
  const { orgId, projectId, diagramId } = useParams<{
    orgId: string
    projectId: string
    diagramId: string
  }>()
  const [diagram, setDiagram] = useState<Diagram | null>(null)
  const [content, setContent] = useState<ObjectDiagramContent | null>(null)
  const [classDiagrams, setClassDiagrams] = useState<Diagram[]>([])
  const [role, setRole] = useState<ProjectRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!diagramId || !projectId) return
    Promise.all([getDiagram(diagramId), getCurrentUserId(), listDiagrams(projectId)])
      .then(([loadedDiagram, userId, projectDiagrams]) => {
        setDiagram(loadedDiagram)
        setContent(
          isObjectDiagramContent(loadedDiagram.content) ? loadedDiagram.content : emptyObjectDiagramContent(),
        )
        setClassDiagrams(projectDiagrams.filter((d) => d.type === 'classes'))
        return userId ? getMyProjectRole(projectId, userId) : null
      })
      .then(setRole)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar diagrama.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId, projectId])

  function handleChange(next: ObjectDiagramContent) {
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

  async function loadClasses(sourceDiagramId: string) {
    const sourceDiagram = await getDiagram(sourceDiagramId)
    if (!isClassDiagramContent(sourceDiagram.content)) return []
    return sourceDiagram.content.classes
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
        {!readOnly && (
          <span className="save-indicator">
            {saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? 'Salvo' : saveState === 'error' ? 'Falha ao salvar' : ''}
          </span>
        )}
      </div>

      <ObjectDiagramCanvas
        content={content}
        readOnly={readOnly}
        onChange={handleChange}
        classDiagrams={classDiagrams}
        loadClasses={loadClasses}
      />
    </section>
  )
}

function isObjectDiagramContent(value: unknown): value is ObjectDiagramContent {
  return typeof value === 'object' && value !== null && Array.isArray((value as ObjectDiagramContent).objects)
}
