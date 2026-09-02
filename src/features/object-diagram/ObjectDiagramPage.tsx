import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isClassDiagramContent } from '../class-diagram/types'
import { useAuth } from '../auth/AuthContext'
import { meFromSession, useDiagramPresence } from '../diagram-shell/useDiagramPresence'
import { useDiagramRemoteUpdate } from '../diagram-shell/useDiagramRemoteUpdate'
import { PresenceAvatars } from '../diagram-shell/PresenceAvatars'
import { RemoteUpdateBanner } from '../diagram-shell/RemoteUpdateBanner'
import {
  getCurrentUserId,
  getDiagram,
  getMyProjectRole,
  listDiagrams,
  renameDiagram,
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
  // TASK-020: nome do diagrama editável na topbar — ver mesmo padrão em
  // `DiagramEditorPage`.
  const [nameInput, setNameInput] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TASK-047 — presença (quem está vendo agora) + aviso passivo de
  // atualização remota (nunca substitui o conteúdo sozinho).
  const { session } = useAuth()
  const viewers = useDiagramPresence(diagramId, meFromSession(session))
  const { remoteUpdateAvailable, dismiss: dismissRemoteUpdate } = useDiagramRemoteUpdate(diagramId, content)

  useEffect(() => {
    if (!diagramId || !projectId) return
    Promise.all([getDiagram(diagramId), getCurrentUserId(), listDiagrams(projectId)])
      .then(([loadedDiagram, userId, projectDiagrams]) => {
        setDiagram(loadedDiagram)
        setNameInput(loadedDiagram.name)
        setContent(normalizeContent(loadedDiagram.content))
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

  // TASK-047 — busca de novo o diagrama e substitui o conteúdo local
  // (a pessoa decidiu, no banner, que quer a versão de outra pessoa —
  // nunca acontece sozinho).
  function handleReloadFromRemote() {
    if (!diagramId) return
    getDiagram(diagramId)
      .then((loaded) => {
        setDiagram(loaded)
        setNameInput(loaded.name)
        setContent(normalizeContent(loaded.content))
        dismissRemoteUpdate()
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao recarregar diagrama.'))
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
    <ObjectDiagramCanvas
      content={content}
      readOnly={readOnly}
      onChange={handleChange}
      classDiagrams={classDiagrams}
      loadClasses={loadClasses}
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
              {saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? 'Salvo' : saveState === 'error' ? 'Falha ao salvar' : ''}
            </span>
          )}
        </div>
      }
      topbarActions={<PresenceAvatars viewers={viewers} />}
      canvasOverlay={
        remoteUpdateAvailable && (
          <RemoteUpdateBanner onReload={handleReloadFromRemote} onDismiss={dismissRemoteUpdate} />
        )
      }
    />
  )
}

function isObjectDiagramContent(value: unknown): value is ObjectDiagramContent {
  return typeof value === 'object' && value !== null && Array.isArray((value as ObjectDiagramContent).objects)
}

// TASK-017: diagramas salvos antes dessa task não têm `links` no JSONB
// persistido — normaliza para `[]` em vez de deixar `undefined` (mudança
// aditiva, ver ADR-006). Extraído (TASK-047) pra ser reaproveitado tanto
// no carregamento inicial quanto no "recarregar" do aviso de atualização
// remota.
function normalizeContent(raw: unknown): ObjectDiagramContent {
  return isObjectDiagramContent(raw) ? { ...raw, links: raw.links ?? [] } : emptyObjectDiagramContent()
}
