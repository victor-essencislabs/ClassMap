import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { meFromSession, useDiagramPresence } from '../diagram-shell/useDiagramPresence'
import { useDiagramRemoteUpdate } from '../diagram-shell/useDiagramRemoteUpdate'
import { PresenceAvatars } from '../diagram-shell/PresenceAvatars'
import { RemoteUpdateBanner } from '../diagram-shell/RemoteUpdateBanner'
import {
  createDiagramWithContent,
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
import { classDiagramIO } from '../import-export/classDiagramConversion'

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
  const navigate = useNavigate()
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nameSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TASK-047 — presença (quem está vendo agora) + aviso passivo de
  // atualização remota (nunca substitui o conteúdo sozinho).
  const { session } = useAuth()
  const viewers = useDiagramPresence(diagramId, meFromSession(session))
  const { remoteUpdateAvailable, dismiss: dismissRemoteUpdate } = useDiagramRemoteUpdate(diagramId, content)

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

  /** TASK-056 (RN-08) — grava agora o que o autosave ainda ia gravar daqui
   * a `AUTOSAVE_DELAY_MS`. Sem isto, arrastar um card e apertar `N` em
   * seguida navegaria para o diagrama novo dentro da janela do debounce,
   * desmontando esta página e perdendo a alteração — em silêncio, que é o
   * pior modo de falha possível. */
  async function flushPendingSave() {
    if (!saveTimeout.current || !diagramId || !content) return
    clearTimeout(saveTimeout.current)
    saveTimeout.current = null
    await updateDiagramContent(diagramId, content as unknown as Record<string, unknown>)
    setSaveState('saved')
  }

  /** TASK-056 — cria um diagrama novo com o recorte da classe focada e
   * abre ele. Quem monta o recorte é o canvas (`ClassDiagramCanvas`, via
   * `focusSubgraph.ts`); esta página só sabe onde ele vai parar — mesmo
   * projeto, `type: 'classes'` — e como chegar lá. Erro aqui **não**
   * navega: o diagrama de origem continua aberto e intacto (CA-11). */
  async function handleCreateDerivedDiagram(name: string, derivedContent: ClassDiagramContent) {
    if (!projectId) return
    await flushPendingSave()
    const created = await createDiagramWithContent(
      projectId,
      'classes',
      name,
      derivedContent as unknown as Record<string, unknown>,
    )
    navigate(`/orgs/${orgId}/projects/${projectId}/diagrams/${created.id}`)
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
        setContent(isClassDiagramContent(loaded.content) ? loaded.content : emptyClassDiagramContent())
        dismissRemoteUpdate()
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao recarregar diagrama.'))
  }

  if (error) return <p className="error">{error}</p>
  if (!diagram || !content) return <p>Carregando diagrama…</p>

  const readOnly = role !== 'editor'

  return (
    <ClassDiagramCanvas
      content={content}
      readOnly={readOnly}
      onChange={handleChange}
      onCreateDerivedDiagram={handleCreateDerivedDiagram}
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
        <>
          <PresenceAvatars viewers={viewers} />
          <ImportExportControls
            content={content}
            fileName={diagram.name}
            canImport={!readOnly}
            onImport={handleChange}
            io={classDiagramIO}
          />
        </>
      }
      canvasOverlay={
        remoteUpdateAvailable && (
          <RemoteUpdateBanner onReload={handleReloadFromRemote} onDismiss={dismissRemoteUpdate} />
        )
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

