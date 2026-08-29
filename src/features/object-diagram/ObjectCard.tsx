import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { screenDeltaToWorld } from '../diagram-shell/canvasTransform'
import { OBJECT_CARD_WIDTH, type DiagramObject } from './types'

interface ObjectCardProps {
  obj: DiagramObject
  selected: boolean
  readOnly: boolean
  /** Zoom atual do canvas (TASK-008, mesmo padrão de `ClassCard`) —
   * necessário para converter o arraste (em pixels de tela) para
   * coordenadas do mundo corretamente. */
  zoom: number
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

/** Card de objeto: "instância : Classe" + valores herdados da classe
 * (RN-01 da TASK-004), estilizado como `.node-box.object` (TASK-006/008
 * — sublinhado no cabeçalho, valores em `--object-accent`) para
 * diferenciar visualmente do Diagrama de Classes. Edição de
 * nome/valores acontece no inspector do shell (TASK-008), não aqui. */
export function ObjectCard({ obj, selected, readOnly, zoom, onSelect, onMove }: ObjectCardProps) {
  const dragStart = useRef<{ clientX: number; clientY: number; origX: number; origY: number } | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(obj.id)
    if (readOnly) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, origX: obj.x, origY: obj.y }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    if (!start) return
    const delta = screenDeltaToWorld(e.clientX - start.clientX, e.clientY - start.clientY, zoom)
    onMove(obj.id, start.origX + delta.x, start.origY + delta.y)
  }

  function handlePointerUp() {
    dragStart.current = null
  }

  return (
    <div
      className={`node-box object${selected ? ' selected' : ''}`}
      style={{ position: 'absolute', left: obj.x, top: obj.y, width: OBJECT_CARD_WIDTH }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
    >
      <div className="node-head">
        <span className="stereo">objeto</span>
        {obj.instanceName || 'instância'} : {obj.className}
      </div>
      <div className="node-body">
        {obj.values.length === 0 ? (
          <div className="node-empty-row">sem atributos</div>
        ) : (
          obj.values.map((v) => (
            <div className="node-row" key={v.attributeId}>
              {v.name} = <span className="attr-val">{v.value || '—'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
