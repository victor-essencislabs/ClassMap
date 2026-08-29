import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { screenDeltaToWorld } from '../diagram-shell/canvasTransform'
import type { DiagramClass } from './types'

const CARD_WIDTH = 200

interface ClassCardProps {
  cls: DiagramClass
  selected: boolean
  readOnly: boolean
  /** Zoom atual do canvas (TASK-007) — necessário para converter o
   * arraste (em pixels de tela) para coordenadas do mundo corretamente. */
  zoom: number
  /** Em modo de conexão (TASK-007), o card não é arrastável — só
   * clicável, para completar a relação (ver `ClassDiagramCanvas`). */
  connectMode: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

/** Card de classe: nome, estereótipo opcional e atributos (RN-01 da TASK-003).
 * Arrastável quando `!readOnly` e fora do modo de conexão — a edição de
 * nome/estereótipo/atributos acontece no inspector do shell (TASK-006),
 * não aqui. */
export function ClassCard({ cls, selected, readOnly, zoom, connectMode, onSelect, onMove }: ClassCardProps) {
  const dragStart = useRef<{ clientX: number; clientY: number; origX: number; origY: number } | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(cls.id)
    if (readOnly || connectMode) return
    // setPointerCapture não existe em todo ambiente (ex.: jsdom nos
    // testes) — degrada graciosamente para "sem drag" em vez de lançar.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, origX: cls.x, origY: cls.y }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    if (!start) return
    const delta = screenDeltaToWorld(e.clientX - start.clientX, e.clientY - start.clientY, zoom)
    onMove(cls.id, start.origX + delta.x, start.origY + delta.y)
  }

  function handlePointerUp() {
    dragStart.current = null
  }

  return (
    <div
      className={`node-box${selected ? ' selected' : ''}`}
      style={{ position: 'absolute', left: cls.x, top: cls.y, width: CARD_WIDTH }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
    >
      <div className="node-head">
        {cls.stereotype && <span className="stereo">«{cls.stereotype}»</span>}
        {cls.name}
      </div>
      <div className="node-body">
        {cls.attributes.length === 0 ? (
          <div className="node-empty-row">sem atributos</div>
        ) : (
          cls.attributes.map((attr) => (
            <div className="node-row" key={attr.id}>
              {attr.name}
              {attr.type ? (
                <>
                  {' : '}
                  <span className="attr-type">{attr.type}</span>
                </>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export { CARD_WIDTH }
