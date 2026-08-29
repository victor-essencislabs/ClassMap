// TASK-004/008 — canvas do Diagrama de Objetos: cards de instância
// (TASK-004), agora dentro do shell de 3 colunas da TASK-006 com o
// zoom/pan compartilhado da TASK-007 e inspector fixo substituindo o
// antigo painel flutuante (ADR-002). Sem modo de conexão — objetos não
// se relacionam entre si neste modelo (fora de escopo, ver TASK-008).
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { DiagramClass } from '../class-diagram/types'
import { computeBounds } from '../diagram-shell/canvasTransform'
import { DiagramShell } from '../diagram-shell/DiagramShell'
import { useCanvasZoomPan } from '../diagram-shell/useCanvasZoomPan'
import { ClassPickerModal, type ClassDiagramOption } from './ClassPickerModal'
import { ObjectCard } from './ObjectCard'
import * as ops from './contentOperations'
import { OBJECT_CARD_WIDTH, type DiagramObject, type ObjectDiagramContent } from './types'

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const zoomPan = useCanvasZoomPan(canvasRef)
  const didInitialFit = useRef(false)
  const clickStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (didInitialFit.current) return
    didInitialFit.current = true
    zoomPan.fitToScreen(computeBounds(content.objects.map(ops.toBoundedNode)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedObject = content.objects.find((o) => o.id === selectedId)

  function handlePickClass(sourceClass: DiagramClass) {
    const rect = canvasRef.current?.getBoundingClientRect()
    const origin = rect
      ? {
          x: (rect.width / 2 - zoomPan.pan.x) / zoomPan.zoom - OBJECT_CARD_WIDTH / 2,
          y: (rect.height / 2 - zoomPan.pan.y) / zoomPan.zoom - 40,
        }
      : undefined
    const next = ops.addObject(content, sourceClass, origin)
    onChange(next)
    setSelectedId(next.objects[next.objects.length - 1].id)
    setPickerOpen(false)
  }

  function updateObject(id: string, patch: Partial<Pick<DiagramObject, 'instanceName' | 'x' | 'y'>>) {
    onChange(ops.updateObject(content, id, patch))
  }

  function handleRemoveObject(id: string) {
    onChange(ops.removeObject(content, id))
    setSelectedId(null)
  }

  function handleSidebarSelect(obj: DiagramObject) {
    setSelectedId(obj.id)
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
    if (moved < CLICK_MOVE_THRESHOLD_PX) setSelectedId(null)
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
          !readOnly && (
            <button type="button" className="btn primary" onClick={() => setPickerOpen(true)}>
              + Objeto
            </button>
          )
        }
        canvasProps={{
          ref: canvasRef,
          onPointerDown: handleBackgroundPointerDown,
          onPointerMove: zoomPan.onBackgroundPointerMove,
          onPointerUp: handleBackgroundPointerUp,
        }}
        sidebar={
          <Sidebar
            objects={content.objects}
            filteredObjects={filteredObjects}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedId={selectedObject?.id}
            onSelect={handleSidebarSelect}
          />
        }
        canvas={
          <>
            <div
              className="canvas-viewport"
              style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: zoomPan.transform }}
            >
              {content.objects.map((obj) => (
                <ObjectCard
                  key={obj.id}
                  obj={obj}
                  selected={obj.id === selectedId}
                  readOnly={readOnly}
                  zoom={zoomPan.zoom}
                  onSelect={setSelectedId}
                  onMove={(id, x, y) => updateObject(id, { x, y })}
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
                ⤢
              </button>
              <button type="button" title="Afastar" aria-label="Afastar" onClick={zoomPan.zoomOut}>
                −
              </button>
            </div>
          </>
        }
        inspector={
          !selectedObject ? (
            <div className="insp-empty">Selecione um objeto no diagrama para editar seus detalhes aqui.</div>
          ) : (
            <ObjectInspector
              obj={selectedObject}
              readOnly={readOnly}
              onChange={(patch) => updateObject(selectedObject.id, patch)}
              onValueChange={(attributeId, value) =>
                onChange(ops.updateObjectValue(content, selectedObject.id, attributeId, value))
              }
              onDelete={() => handleRemoveObject(selectedObject.id)}
            />
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
    </>
  )
}

function Sidebar({
  objects,
  filteredObjects,
  searchQuery,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  objects: DiagramObject[]
  filteredObjects: DiagramObject[]
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
          <b>0</b>
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
