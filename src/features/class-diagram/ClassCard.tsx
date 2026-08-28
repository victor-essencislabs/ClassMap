import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { DiagramClass } from './types'

const CARD_WIDTH = 200

interface ClassCardProps {
  cls: DiagramClass
  selected: boolean
  readOnly: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

/** Card de classe: nome, estereótipo opcional e atributos (RN-01 da TASK-003).
 * Arrastável quando `!readOnly` — a edição de nome/estereótipo/atributos
 * acontece no painel lateral (ver ClassDiagramCanvas), não aqui. */
export function ClassCard({ cls, selected, readOnly, onSelect, onMove }: ClassCardProps) {
  const dragOffset = useRef<{ x: number; y: number } | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(cls.id)
    if (readOnly) return
    // setPointerCapture não existe em todo ambiente (ex.: jsdom nos
    // testes) — degrada graciosamente para "sem drag" em vez de lançar.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragOffset.current = { x: e.clientX - cls.x, y: e.clientY - cls.y }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragOffset.current) return
    onMove(cls.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y)
  }

  function handlePointerUp() {
    dragOffset.current = null
  }

  return (
    <div
      className={`class-card${selected ? ' selected' : ''}`}
      style={{ left: cls.x, top: cls.y, width: CARD_WIDTH }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
    >
      <div className="class-card-header">
        <strong>{cls.name}</strong>
        {cls.stereotype && <div className="stereotype">«{cls.stereotype}»</div>}
      </div>
      <ul className="class-card-attributes">
        {cls.attributes.map((attr) => (
          <li key={attr.id}>
            {attr.name}: {attr.type}
          </li>
        ))}
      </ul>
    </div>
  )
}

export { CARD_WIDTH }
