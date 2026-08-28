import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { CLASS_CARD_WIDTH, estimateClassCardHeight, type DiagramClass, type DiagramRelationship } from './types'

interface ConnectorProps {
  relationship: DiagramRelationship
  fromClass: DiagramClass
  toClass: DiagramClass
  selected: boolean
  readOnly: boolean
  onSelect: (id: string) => void
  onDragControlPoint: (id: string, controlX: number) => void
}

interface Point {
  x: number
  y: number
}

// Losango (agregação/composição) fica na ponta `from` (quem tem o
// campo/coleção — o "todo"); seta (associação/dependência) e triângulo
// (herança) ficam na ponta `to` — ver convenção documentada em types.ts.
const DIAMOND_LENGTH = 18
const DIAMOND_HALF_HEIGHT = 7
const TRIANGLE_LENGTH = 16
const TRIANGLE_HALF_HEIGHT = 8
const ARROW_LENGTH = 10

function anchorPoint(cls: DiagramClass, side: 'left' | 'right'): Point {
  const y = cls.y + estimateClassCardHeight(cls) / 2
  const x = side === 'right' ? cls.x + CLASS_CARD_WIDTH : cls.x
  return { x, y }
}

export function Connector({
  relationship,
  fromClass,
  toClass,
  selected,
  readOnly,
  onSelect,
  onDragControlPoint,
}: ConnectorProps) {
  const dragging = useRef(false)

  const toIsRight = toClass.x + CLASS_CARD_WIDTH / 2 >= fromClass.x + CLASS_CARD_WIDTH / 2
  const fromSide: 'left' | 'right' = toIsRight ? 'right' : 'left'
  const toSide: 'left' | 'right' = toIsRight ? 'left' : 'right'
  const fromDir = fromSide === 'right' ? 1 : -1 // sentido para FORA do card `from`
  const toDir = toSide === 'left' ? 1 : -1 // sentido para DENTRO do card `to`

  const fromAnchor = anchorPoint(fromClass, fromSide)
  const toAnchor = anchorPoint(toClass, toSide)

  const hasFromDiamond = relationship.type === 'aggregation' || relationship.type === 'composition'
  const hasToTriangle = relationship.type === 'inheritance'
  const hasToArrow = relationship.type === 'association' || relationship.type === 'dependency'
  const dashed = relationship.type === 'dependency'

  const lineStart: Point = hasFromDiamond
    ? { x: fromAnchor.x + fromDir * DIAMOND_LENGTH, y: fromAnchor.y }
    : fromAnchor
  const lineEnd: Point = hasToTriangle
    ? { x: toAnchor.x + toDir * TRIANGLE_LENGTH, y: toAnchor.y }
    : toAnchor

  const midY = (lineStart.y + lineEnd.y) / 2
  const controlX = relationship.controlX

  const path = `M ${lineStart.x} ${lineStart.y} L ${controlX} ${lineStart.y} L ${controlX} ${lineEnd.y} L ${lineEnd.x} ${lineEnd.y}`

  function handleHandlePointerDown(e: ReactPointerEvent<SVGCircleElement>) {
    if (readOnly) return
    e.stopPropagation()
    onSelect(relationship.id)
    // setPointerCapture não existe em todo ambiente (ex.: jsdom nos testes).
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragging.current = true
  }

  function handleHandlePointerMove(e: ReactPointerEvent<SVGCircleElement>) {
    if (!dragging.current) return
    onDragControlPoint(relationship.id, e.clientX)
  }

  function handleHandlePointerUp() {
    dragging.current = false
  }

  const strokeWidth = selected ? 2.5 : 1.5
  const stroke = selected ? '#2563eb' : 'currentColor'

  function handleSelect(e: ReactMouseEvent<SVGGElement>) {
    // Sem isto, o clique borbulha até o <svg> (que deseleciona ao clicar
    // no vazio) e desfaz a seleção no mesmo evento.
    e.stopPropagation()
    onSelect(relationship.id)
  }

  return (
    <g onClick={handleSelect} style={{ cursor: 'pointer' }}>
      {/* área de clique mais larga, invisível, para facilitar selecionar */}
      <path d={path} stroke="transparent" strokeWidth={12} fill="none" />
      <path
        d={path}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={dashed ? '6 4' : undefined}
      />

      {hasFromDiamond && (
        <polygon
          points={`${fromAnchor.x},${fromAnchor.y} ${fromAnchor.x + fromDir * (DIAMOND_LENGTH / 2)},${fromAnchor.y - DIAMOND_HALF_HEIGHT} ${fromAnchor.x + fromDir * DIAMOND_LENGTH},${fromAnchor.y} ${fromAnchor.x + fromDir * (DIAMOND_LENGTH / 2)},${fromAnchor.y + DIAMOND_HALF_HEIGHT}`}
          fill={relationship.type === 'composition' ? stroke : 'var(--diagram-bg, #fff)'}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}

      {hasToTriangle && (
        <polygon
          points={`${toAnchor.x},${toAnchor.y} ${toAnchor.x + toDir * TRIANGLE_LENGTH},${toAnchor.y - TRIANGLE_HALF_HEIGHT} ${toAnchor.x + toDir * TRIANGLE_LENGTH},${toAnchor.y + TRIANGLE_HALF_HEIGHT}`}
          fill="var(--diagram-bg, #fff)"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}

      {hasToArrow && (
        <>
          <line
            x1={toAnchor.x}
            y1={toAnchor.y}
            x2={toAnchor.x - toDir * ARROW_LENGTH}
            y2={toAnchor.y - 5}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            x1={toAnchor.x}
            y1={toAnchor.y}
            x2={toAnchor.x - toDir * ARROW_LENGTH}
            y2={toAnchor.y + 5}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )}

      {relationship.fromMultiplicity && (
        <text x={fromAnchor.x + fromDir * (DIAMOND_LENGTH + 6)} y={fromAnchor.y - 6} fontSize={11}>
          {relationship.fromMultiplicity}
        </text>
      )}
      {relationship.toMultiplicity && (
        <text x={toAnchor.x + toDir * (TRIANGLE_LENGTH + 6)} y={toAnchor.y - 6} fontSize={11}>
          {relationship.toMultiplicity}
        </text>
      )}

      {!readOnly && (
        <circle
          cx={controlX}
          cy={midY}
          r={5}
          fill={selected ? '#2563eb' : 'currentColor'}
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
