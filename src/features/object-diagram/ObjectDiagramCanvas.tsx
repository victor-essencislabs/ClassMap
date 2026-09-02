// TASK-004/008/017 — canvas do Diagrama de Objetos: cards de instância
// (TASK-004), dentro do shell de 3 colunas da TASK-006 com o zoom/pan
// compartilhado da TASK-007 e inspector fixo substituindo o antigo
// painel flutuante (ADR-002). TASK-017 (ver ADR-006) acrescenta o modo
// de conexão — link simples entre dois objetos, reaproveitando a
// máquina de estado de `class-diagram/connectMode.ts` (genérica por
// ids) — sem os 5 tipos UML/multiplicidade, que não fazem sentido
// semântico entre instâncias concretas.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { DiagramClass } from '../class-diagram/types'
import { resolveConnectClick } from '../class-diagram/connectMode'
import { computeBounds } from '../diagram-shell/canvasTransform'
import { DiagramShell } from '../diagram-shell/DiagramShell'
import { FitToScreenGlyph, LinkGlyph } from '../diagram-shell/Icons'
import { Toast, useToast } from '../diagram-shell/Toast'
import { useCanvasZoomPan } from '../diagram-shell/useCanvasZoomPan'
import { ClassPickerModal, type ClassDiagramOption } from './ClassPickerModal'
import { ObjectCard } from './ObjectCard'
import { ObjectLinkConnector } from './ObjectLinkConnector'
import * as ops from './contentOperations'
import { OBJECT_CARD_WIDTH, type DiagramObject, type ObjectDiagramContent, type ObjectLink } from './types'

interface ObjectDiagramCanvasProps {
  content: ObjectDiagramContent
  readOnly: boolean
  onChange: (content: ObjectDiagramContent) => void
  /** Diagramas de classes disponíveis no projeto (type: 'classes') para servir de origem de um novo objeto. */
  classDiagrams: ClassDiagramOption[]
  /** Carrega as classes de um Diagrama de Classes (chamado sob demanda, ao escolher a origem). */
  loadClasses: (diagramId: string) => Promise<DiagramClass[]>
  /** Breadcrumb/título/indicador de salvamento da página (`ObjectDiagramPage`) — vai entre a marca e os botões deste componente na topbar do shell. */
  topbarCenter?: ReactNode
}

type Selection = { type: 'object'; id: string } | { type: 'link'; id: string } | null

/** Um clique conta como "no fundo do canvas" (pan/deselect) quando não
 * pousa dentro de um card — mesmo critério do `ClassDiagramCanvas`. */
function isBackgroundTarget(target: EventTarget | null): boolean {
  return !(target instanceof Element) || !target.closest('.node-box')
}

const CLICK_MOVE_THRESHOLD_PX = 4

export function ObjectDiagramCanvas({
  content,
  readOnly,
  onChange,
  classDiagrams,
  loadClasses,
  topbarCenter,
}: ObjectDiagramCanvasProps) {
  const [selection, setSelection] = useState<Selection>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  /** TASK-042 (ADR-011) — id do objeto recém-criado nesta sessão de
   * edição (RN-01: nunca setado ao carregar um diagrama existente, só
   * dentro de `handlePickClass`). Dispara o destaque de "valor herdado
   * da classe" em `ObjectCard`; o próprio card limpa este estado ao
   * final da animação (`onJustCreatedShown`), para não repetir o efeito
   * em re-renders/edições manuais posteriores (CA-04). */
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const zoomPan = useCanvasZoomPan(canvasRef)
  const { message, showToast } = useToast()
  const didInitialFit = useRef(false)
  const clickStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (didInitialFit.current) return
    didInitialFit.current = true
    zoomPan.fitToScreen(computeBounds(content.objects.map(ops.toBoundedNode)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedObject = selection?.type === 'object' ? content.objects.find((o) => o.id === selection.id) : undefined
  const selectedLink = selection?.type === 'link' ? content.links.find((l) => l.id === selection.id) : undefined

  function handlePickClass(sourceClass: DiagramClass) {
    const rect = canvasRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: (rect.width / 2 - zoomPan.pan.x) / zoomPan.zoom - OBJECT_CARD_WIDTH / 2,
          y: (rect.height / 2 - zoomPan.pan.y) / zoomPan.zoom - 40,
        }
      : undefined
    const next = ops.addObject(content, sourceClass, origin)
    const created = next.objects[next.objects.length - 1]
    onChange(next)
    setSelection({ type: 'object', id: created.id })
    // TASK-042: só marca "recém-criado" quando há algum valor herdado
    // para destacar — um objeto sem atributos não tem `.node-row` para
    // animar, então nunca dispararia `onJustCreatedShown` e o flag
    // ficaria preso indefinidamente.
    if (created.values.length > 0) setJustCreatedId(created.id)
    setPickerOpen(false)
  }

  function updateObject(id: string, patch: Partial<Pick<DiagramObject, 'instanceName' | 'x' | 'y'>>) {
    onChange(ops.updateObject(content, id, patch))
  }

  function handleRemoveObject(id: string) {
    onChange(ops.removeObject(content, id))
    setSelection(null)
  }

  function updateLink(id: string, patch: Partial<Pick<ObjectLink, 'label' | 'controlX'>>) {
    onChange(ops.updateLink(content, id, patch))
  }

  function handleRemoveLink(id: string) {
    onChange(ops.removeLink(content, id))
    setSelection(null)
  }

  function startConnectMode() {
    setConnectMode(true)
    setConnectFrom(null)
  }

  function endConnectMode() {
    setConnectMode(false)
    setConnectFrom(null)
  }

  function handleCardClick(id: string) {
    if (!connectMode) {
      setSelection({ type: 'object', id })
      return
    }
    const result = resolveConnectClick(connectFrom, id)
    if (result.kind === 'started') {
      setConnectFrom(result.from)
      return
    }
    if (result.kind === 'same-class') {
      showToast('Escolha um objeto diferente')
      return
    }
    const next = ops.addLink(content, result.from, result.to)
    onChange(next)
    endConnectMode()
    setSelection({ type: 'link', id: next.links[next.links.length - 1].id })
    showToast('Link criado — adicione um rótulo (opcional) no inspector')
  }

  function handleSidebarSelect(obj: DiagramObject) {
    setSelection({ type: 'object', id: obj.id })
    zoomPan.panToNode(ops.toBoundedNode(obj))
  }

  function handleBackgroundPointerDown(e: ReactPointerEvent) {
    if (!isBackgroundTarget(e.target)) return
    clickStart.current = { x: e.clientX, y: e.clientY }
    zoomPan.onBackgroundPointerDown(e)
  }

  function handleBackgroundPointerUp(e: ReactPointerEvent) {
    zoomPan.onBackgroundPointerUp(e)
    const start = clickStart.current
    clickStart.current = null
    if (!start) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (moved < CLICK_MOVE_THRESHOLD_PX) {
      setSelection(null)
      if (connectMode) endConnectMode()
    }
  }

  const filteredObjects = ops
    .filterObjectsByQuery(content.objects, searchQuery)
    .slice()
    .sort((a, b) => (a.instanceName ?? a.className).localeCompare(b.instanceName ?? b.className))

  return (
    <>
      <DiagramShell
        topbarCenter={topbarCenter}
        topbarActions={
          <>
            {!readOnly && (
              <button
                type="button"
                className={connectMode ? 'btn ghost active' : 'btn ghost'}
                disabled={content.objects.length < 2}
                onClick={() => (connectMode ? endConnectMode() : startConnectMode())}
              >
                <LinkGlyph /> Link
              </button>
            )}
            {!readOnly && (
              <button type="button" className="btn primary" onClick={() => setPickerOpen(true)}>
                + Objeto
              </button>
            )}
          </>
        }
        canvasProps={{
          ref: canvasRef,
          className: connectMode ? 'connect-mode' : undefined,
          onPointerDown: handleBackgroundPointerDown,
          onPointerMove: zoomPan.onBackgroundPointerMove,
          onPointerUp: handleBackgroundPointerUp,
        }}
        sidebar={
          <Sidebar
            objects={content.objects}
            filteredObjects={filteredObjects}
            linkCount={content.links.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedId={selectedObject?.id}
            onSelect={handleSidebarSelect}
          />
        }
        canvas={
          <>
            {connectMode && (
              <div className="connect-banner show">
                <span>Clique no objeto de origem, depois no de destino</span>
                <button type="button" onClick={endConnectMode}>
                  Cancelar
                </button>
              </div>
            )}

            <div
              className={`canvas-viewport${zoomPan.settling ? ' settling' : ''}`}
              style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: zoomPan.transform }}
            >
              <svg className="connectors-layer" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                {content.links.map((link) => {
                  const fromObj = content.objects.find((o) => o.id === link.from)
                  const toObj = content.objects.find((o) => o.id === link.to)
                  if (!fromObj || !toObj) return null
                  return (
                    <ObjectLinkConnector
                      key={link.id}
                      link={link}
                      fromObject={fromObj}
                      toObject={toObj}
                      selected={selection?.type === 'link' && selection.id === link.id}
                      readOnly={readOnly}
                      zoom={zoomPan.zoom}
                      onSelect={(id) => setSelection({ type: 'link', id })}
                      onDragControlPoint={(id, controlX) => updateLink(id, { controlX })}
                    />
                  )
                })}
              </svg>

              {content.objects.map((obj) => (
                <ObjectCard
                  key={obj.id}
                  obj={obj}
                  selected={selection?.type === 'object' && selection.id === obj.id}
                  readOnly={readOnly}
                  zoom={zoomPan.zoom}
                  connectMode={connectMode}
                  justCreated={obj.id === justCreatedId}
                  onSelect={handleCardClick}
                  onMove={(id, x, y) => updateObject(id, { x, y })}
                  onJustCreatedShown={() => setJustCreatedId((current) => (current === obj.id ? null : current))}
                />
              ))}
            </div>

            {content.objects.length === 0 && (
              <div className="empty-hint">
                <div className="empty-hint-card">
                  <h3>Nenhum objeto ainda</h3>
                  <p>
                    Clique em <b>+ Objeto</b> para criar uma instância a partir de uma classe existente.
                  </p>
                </div>
              </div>
            )}

            <div className="zoom-controls">
              <button type="button" title="Aproximar" aria-label="Aproximar" onClick={zoomPan.zoomIn}>
                +
              </button>
              <button
                type="button"
                title="Ajustar à tela"
                aria-label="Ajustar à tela"
                onClick={() => zoomPan.fitToScreen(computeBounds(content.objects.map(ops.toBoundedNode)))}
              >
                <FitToScreenGlyph />
              </button>
              <button type="button" title="Afastar" aria-label="Afastar" onClick={zoomPan.zoomOut}>
                −
              </button>
            </div>
          </>
        }
        inspector={
          selectedObject ? (
            <ObjectInspector
              obj={selectedObject}
              readOnly={readOnly}
              onChange={(patch) => updateObject(selectedObject.id, patch)}
              onValueChange={(attributeId, value) =>
                onChange(ops.updateObjectValue(content, selectedObject.id, attributeId, value))
              }
              onDelete={() => handleRemoveObject(selectedObject.id)}
            />
          ) : selectedLink ? (
            <LinkInspector
              link={selectedLink}
              fromName={
                content.objects.find((o) => o.id === selectedLink.from)?.instanceName ??
                content.objects.find((o) => o.id === selectedLink.from)?.className ??
                '?'
              }
              toName={
                content.objects.find((o) => o.id === selectedLink.to)?.instanceName ??
                content.objects.find((o) => o.id === selectedLink.to)?.className ??
                '?'
              }
              readOnly={readOnly}
              onChange={(patch) => updateLink(selectedLink.id, patch)}
              onDelete={() => handleRemoveLink(selectedLink.id)}
            />
          ) : (
            <div className="insp-empty">Selecione um objeto ou link no diagrama para editar seus detalhes aqui.</div>
          )
        }
      />

      {!readOnly && pickerOpen && (
        <ClassPickerModal
          classDiagrams={classDiagrams}
          loadClasses={loadClasses}
          onClose={() => setPickerOpen(false)}
          onPick={handlePickClass}
        />
      )}
      <Toast message={message} />
    </>
  )
}

function Sidebar({
  objects,
  filteredObjects,
  linkCount,
  searchQuery,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  objects: DiagramObject[]
  filteredObjects: DiagramObject[]
  linkCount: number
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedId: string | undefined
  onSelect: (obj: DiagramObject) => void
}) {
  return (
    <>
      <div className="side-section">
        <input
          className="side-search"
          placeholder="Buscar objeto ou classe..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="stat-row">
        <div className="stat">
          <b>0</b>
          <span>Classes</span>
        </div>
        <div className="stat">
          <b>{linkCount}</b>
          <span>Relações</span>
        </div>
        <div className="stat">
          <b>{objects.length}</b>
          <span>Objetos</span>
        </div>
      </div>
      <div className="side-list">
        {objects.length === 0 ? (
          <div className="side-empty">Nenhum objeto ainda. Use "+ Objeto" para criar o primeiro.</div>
        ) : filteredObjects.length === 0 ? (
          <div className="side-empty">Nenhum objeto encontrado.</div>
        ) : (
          filteredObjects.map((obj) => (
            <div
              key={obj.id}
              className={`side-item obj${obj.id === selectedId ? ' selected' : ''}`}
              onClick={() => onSelect(obj)}
              role="button"
              tabIndex={0}
            >
              <span className="dot" aria-hidden="true" />
              {/* TASK-015: classe `.name` para truncar com reticências em vez
                  de vazar sob a borda da sidebar quando o nome é longo. */}
              <span className="name">{obj.instanceName || `instância : ${obj.className}`}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function ObjectInspector({
  obj,
  readOnly,
  onChange,
  onValueChange,
  onDelete,
}: {
  obj: DiagramObject
  readOnly: boolean
  onChange: (patch: { instanceName?: string }) => void
  onValueChange: (attributeId: string, value: string) => void
  onDelete: () => void
}) {
  return (
    <>
      <div className="insp-title">Objeto : {obj.className}</div>
      <div className="field">
        <label htmlFor="object-instance-name-input">Nome da instância (opcional)</label>
        {readOnly ? (
          <div className="mono">{obj.instanceName || '—'}</div>
        ) : (
          <input
            id="object-instance-name-input"
            value={obj.instanceName ?? ''}
            onChange={(e) => onChange({ instanceName: e.target.value || undefined })}
          />
        )}
      </div>

      <div className="insp-title" style={{ marginTop: 16 }}>
        Valores
      </div>
      {obj.values.map((v) => (
        <div className="field" key={v.attributeId}>
          <label htmlFor={`object-value-${v.attributeId}`}>
            {v.name} ({v.type})
          </label>
          {readOnly ? (
            <div className="mono">{v.value || '—'}</div>
          ) : (
            <input
              id={`object-value-${v.attributeId}`}
              value={v.value}
              onChange={(e) => onValueChange(v.attributeId, e.target.value)}
            />
          )}
        </div>
      ))}

      {!readOnly && (
        <div className="insp-actions">
          <button type="button" className="btn danger" onClick={onDelete}>
            Excluir objeto
          </button>
        </div>
      )}
    </>
  )
}

function LinkInspector({
  link,
  fromName,
  toName,
  readOnly,
  onChange,
  onDelete,
}: {
  link: ObjectLink
  fromName: string
  toName: string
  readOnly: boolean
  onChange: (patch: Partial<Pick<ObjectLink, 'label'>>) => void
  onDelete: () => void
}) {
  return (
    <>
      <div className="insp-title">Link</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        {fromName} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>→</span> {toName}
      </div>

      <div className="field">
        <label htmlFor="link-label-input">Rótulo (opcional)</label>
        {readOnly ? (
          <div className="mono">{link.label || '—'}</div>
        ) : (
          <input
            id="link-label-input"
            placeholder="ex: referencia"
            value={link.label ?? ''}
            onChange={(e) => onChange({ label: e.target.value || undefined })}
          />
        )}
      </div>

      {!readOnly && (
        <div className="insp-actions">
          <button type="button" className="btn danger" onClick={onDelete}>
            Excluir link
          </button>
        </div>
      )}
    </>
  )
}
