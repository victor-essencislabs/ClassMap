// TASK-017 (ver ADR-006) — conector simples entre dois objetos: linha
// reta com roteamento ortogonal e ponto de controle arrastável, no
// mesmo espírito visual de `class-diagram/Connector.tsx`, mas SEM
// nenhum dos símbolos geométricos (losango/triângulo/seta) — um link
// entre instâncias não tem os 5 tipos UML nem multiplicidade (RN-01/02
// da ADR-006). Componente novo, não reaproveita `Connector.tsx`
// diretamente (ele é específico dos símbolos de classe).
import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { screenDeltaToWorld } from '../diagram-shell/canvasTransform'
import { estimateObjectCardHeight, OBJECT_CARD_WIDTH, type DiagramObject, type ObjectLink } from './types'

interface ObjectLinkConnectorProps {
  link: ObjectLink
  fromObject: DiagramObject
  toObject: DiagramObject
  selected: boolean
  readOnly: boolean
  /** Zoom atual do canvas — necessário para converter o arraste do ponto
   * de controle (em pixels de tela) para coordenadas do mundo
   * corretamente (mesmo padrão de `Connector.tsx`). */
  zoom: number
  onSelect: (id: string) => void
  onDragControlPoint: (id: string, controlX: number) => void
}

interface Point {
  x: number
  y: number
}

function anchorPoint(obj: DiagramObject, side: 'left' | 'right'): Point {
  const y = obj.y + estimateObjectCardHeight(obj) / 2
  const x = side === 'right' ? obj.x + OBJECT_CARD_WIDTH : obj.x
  return { x, y }
}

export function ObjectLinkConnector({
  link,
  fromObject,
  toObject,
  selected,
  readOnly,
  zoom,
  onSelect,
  onDragControlPoint,
}: ObjectLinkConnectorProps) {
  const dragStart = useRef<{ clientX: number; origControlX: number } | null>(null)

  const toIsRight = toObject.x + OBJECT_CARD_WIDTH / 2 >= fromObject.x + OBJECT_CARD_WIDTH / 2
  const fromSide: 'left' | 'right' = toIsRight ? 'right' : 'left'
  const toSide: 'left' | 'right' = toIsRight ? 'left' : 'right'

  const fromAnchor = anchorPoint(fromObject, fromSide)
  const toAnchor = anchorPoint(toObject, toSide)

  const midY = (fromAnchor.y + toAnchor.y) / 2
  const controlX = link.controlX

  const path = `M ${fromAnchor.x} ${fromAnchor.y} L ${controlX} ${fromAnchor.y} L ${controlX} ${toAnchor.y} L ${toAnchor.x} ${toAnchor.y}`

  function handleHandlePointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    if (readOnly) return
    e.stopPropagation()
    onSelect(link.id)
    // setPointerCapture não existe em todo ambiente (ex.: jsdom nos testes).
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragStart.current = { clientX: e.clientX, origControlX: link.controlX }
  }

  function handleHandlePointerMove(e: ReactPointerEvent<SVGCircleElement>) {
    const start = dragStart.current
    if (!start) return
    const delta = screenDeltaToWorld(e.clientX - start.clientX, 0, zoom)
    onDragControlPoint(link.id, start.origControlX + delta.x)
  }

  function handleHandlePointerUp() {
    dragStart.current = null
  }

  const strokeWidth = selected ? 2.5 : 1.5
  const stroke = selected ? 'var(--object-accent)' : 'currentColor'

  function handleSelect(e: ReactMouseEvent<SVGGElement>) {
    // Sem isto, o clique borbulha até o <svg> (que deseleciona ao clicar
    // no vazio) e desfaz a seleção no mesmo evento.
    e.stopPropagation()
    onSelect(link.id)
  }

  return (
    <g onClick={handleSelect} style={{ cursor: 'pointer' }}>
      {/* área de clique mais larga, invisível, para facilitar selecionar */}
      <path d={path} stroke="transparent" strokeWidth={12} fill="none" />
      <path d={path} stroke={stroke} strokeWidth={strokeWidth} fill="none" />

      {link.label && (
        <text x={controlX + 6} y={midY - 6} fontSize={11}>
          {link.label}
        </text>
      )}

      {!readOnly && (
        <circle
          cx={controlX}
          cy={midY}
          r={5}
          fill={selected ? 'var(--object-accent)' : 'currentColor'}
          opacity={selected ? 1 : 0.35}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          style={{ cursor: 'ew-resize' }}
        />
      )}
    </g>
  )
}
