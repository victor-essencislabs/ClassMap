import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { DiagramObject } from './types'

const CARD_WIDTH = 220

interface ObjectCardProps {
  obj: DiagramObject
  selected: boolean
  readOnly: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

/** Card de objeto: "instância : Classe" + valores herdados da classe
 * (RN-01 da TASK-004). Edição de nome/valores acontece no painel
 * lateral (ver ObjectDiagramCanvas), igual ao ClassCard. */
export function ObjectCard({ obj, selected, readOnly, onSelect, onMove }: ObjectCardProps) {
  const dragOffset = useRef<{ x: number; y: number } | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(obj.id)
    if (readOnly) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragOffset.current = { x: e.clientX - obj.x, y: e.clientY - obj.y }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return
    onMove(obj.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
  }

  function handlePointerUp() {
    dragOffset.current = null
  }

  return (
    <div
      className={`class-card object-card${selected ? ' selected' : ''}`}
      style={{ left: obj.x, top: obj.y, width: CARD_WIDTH }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
    >
      <div className="class-card-header">
        <strong>
          <u>
            {obj.instanceName || 'instância'} : {obj.className}
          </u>
        </strong>
      </div>
      <ul className="class-card-attributes">
        {obj.values.map((v) => (
          <li key={v.attributeId}>
            {v.name} = {v.value || <em>—</em>}
          </li>
        ))}
      </ul>
    </div>
  )
}
