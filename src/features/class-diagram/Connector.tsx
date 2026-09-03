import {
  useRef,
  type AnimationEvent as ReactAnimationEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { screenDeltaToWorld } from '../diagram-shell/canvasTransform'
import { CLASS_CARD_WIDTH, estimateClassCardHeight, type DiagramClass, type DiagramRelationship } from './types'

/** TASK-049 — estado visual do conector, calculado pelo canvas
 * (`ClassDiagramCanvas.tsx`, `connectorEmphasis`) a partir da seleção
 * atual:
 * - `'selected'`: a relação em si foi clicada diretamente (comportamento
 *   já existente antes da TASK-049) — contorno mais grosso, ponto de
 *   controle visível, sempre `--class-accent`.
 * - `'outgoing'`/`'incoming'`: uma CLASSE foi selecionada (não a relação)
 *   e este conector toca ela — `outgoing` quando a classe selecionada é
 *   `from` desta relação, `incoming` quando é `to`. Cor por sentido cru
 *   da seta, não por semântica de "dono"/"pertence": os 5 tipos de
 *   relação não têm uma direção de posse consistente entre si (em
 *   agregação `from` é o todo/dono, mas em herança `from` é quem herda —
 *   sentidos opostos de "quem contém quem"), então "sai daqui"/"chega
 *   aqui" é a única leitura que funciona igual para todos os tipos.
 * - `'dimmed'`: uma classe está selecionada e este conector NÃO a toca —
 *   recua visualmente para o destaque acima se sobressair.
 * - `'normal'`: nada selecionado, ou uma classe selecionada mas o padrão
 *   (nunca deveria sobrar aqui — todo conector cai em outgoing/incoming/
 *   dimmed quando há classe selecionada) — aparência de sempre. */
export type ConnectorEmphasis = 'selected' | 'outgoing' | 'incoming' | 'dimmed' | 'normal'

interface ConnectorProps {
  relationship: DiagramRelationship
  fromClass: DiagramClass
  toClass: DiagramClass
  emphasis: ConnectorEmphasis
  readOnly: boolean
  /** Zoom atual do canvas (TASK-007) — necessário para converter o
   * arraste do ponto de controle (em pixels de tela) para coordenadas
   * do mundo corretamente. */
  zoom: number
  /** TASK-041 — true só para a relação recém-criada nesta sessão (RN-01:
   * nunca em relações carregadas de um diagrama existente). Dispara o
   * traço "nascendo" (`stroke-dasharray`/`stroke-dashoffset`) e o delay
   * dos símbolos de ponta — ver `src/index.css`, bloco `.connector.just-created`. */
  justCreated?: boolean
  /** Avisa o canvas que a animação de "nascer" terminou, para ele
   * limpar o id rastreado e o efeito não repetir em re-renders futuros
   * (reduced-motion também dispara isto, com sua própria animação mais curta). */
  onJustCreatedAnimationEnd?: () => void
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

/** TASK-041 — nomes das animações CSS (`src/index.css`, bloco
 * `.connector.just-created`) que marcam o FIM do efeito de "conector
 * nascendo": `connector-symbol-in` (movimento normal, símbolo com
 * delay) ou `connector-fade-once` (prefers-reduced-motion, fade único
 * no grupo inteiro). Extraído como função pura e exportada porque
 * jsdom não implementa `AnimationEvent` — `onAnimationEnd` do React
 * nunca dispara de fato num evento `animationend` simulado em teste,
 * então a decisão em si é testada aqui, isolada do DOM. */
export function isJustCreatedAnimationEnd(animationName: string | undefined): boolean {
  return animationName === 'connector-symbol-in' || animationName === 'connector-fade-once'
}

function anchorPoint(cls: DiagramClass, side: 'left' | 'right'): Point {
  const y = cls.y + estimateClassCardHeight(cls) / 2
  const x = side === 'right' ? cls.x + CLASS_CARD_WIDTH : cls.x
  return { x, y }
}

export function Connector({
  relationship,
  fromClass,
  toClass,
  emphasis,
  readOnly,
  zoom,
  justCreated = false,
  onJustCreatedAnimationEnd,
  onSelect,
  onDragControlPoint,
}: ConnectorProps) {
  const dragStart = useRef<{ clientX: number; origControlX: number } | null>(null)

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
    dragStart.current = { clientX: e.clientX, origControlX: relationship.controlX }
  }

  function handleHandlePointerMove(e: ReactPointerEvent<SVGCircleElement>) {
    const start = dragStart.current
    if (!start) return
    const delta = screenDeltaToWorld(e.clientX - start.clientX, 0, zoom)
    onDragControlPoint(relationship.id, start.origControlX + delta.x)
  }

  function handleHandlePointerUp() {
    dragStart.current = null
  }

  // TASK-033 (ADR-011) — tinta técnica azul (`--class-accent`), não o
  // selo genérico (`--accent`): o Diagrama de Classes tem sua própria
  // tinta, distinta da tinta QC verde do Diagrama de Objetos.
  // TASK-049 — `outgoing` reaproveita a mesma tinta (a relação "sai" da
  // classe selecionada); `incoming` usa `--rel-incoming` (a relação
  // "chega" nela). `dimmed`/`normal` seguem `currentColor`, diferindo só
  // na opacidade do grupo inteiro (classe `dimmed` no `<g>`, abaixo).
  const strokeWidth = emphasis === 'selected' ? 2.5 : emphasis === 'outgoing' || emphasis === 'incoming' ? 2 : 1.5
  const stroke =
    emphasis === 'selected' || emphasis === 'outgoing'
      ? 'var(--class-accent)'
      : emphasis === 'incoming'
        ? 'var(--rel-incoming)'
        : 'currentColor'

  function handleSelect(e: ReactMouseEvent<SVGGElement>) {
    // Sem isto, o clique borbulha até o <svg> (que deseleciona ao clicar
    // no vazio) e desfaz a seleção no mesmo evento.
    e.stopPropagation()
    onSelect(relationship.id)
  }

  // TASK-041 — só reage ao fim da animação relevante (a mais longa de
  // cada modo: símbolo com delay em movimento normal, fade único em
  // prefers-reduced-motion) para não cortar o efeito no meio ao limpar
  // `justCreated` um instante antes dele realmente terminar.
  function handleGroupAnimationEnd(e: ReactAnimationEvent<SVGGElement>) {
    if (!justCreated) return
    if (isJustCreatedAnimationEnd(e.animationName)) {
      onJustCreatedAnimationEnd?.()
    }
  }

  const groupClassName = ['connector', justCreated && 'just-created', emphasis === 'dimmed' && 'dimmed']
    .filter(Boolean)
    .join(' ')

  return (
    <g
      className={groupClassName}
      onClick={handleSelect}
      onAnimationEnd={handleGroupAnimationEnd}
      style={{ cursor: 'pointer' }}
    >
      {/* área de clique mais larga, invisível, para facilitar selecionar */}
      <path d={path} stroke="transparent" strokeWidth={12} fill="none" />
      <path
        d={path}
        className="connector-path"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={dashed ? '6 4' : undefined}
        pathLength={justCreated ? 1 : undefined}
      />

      {hasFromDiamond && (
        <polygon
          className="connector-symbol"
          points={`${fromAnchor.x},${fromAnchor.y} ${fromAnchor.x + fromDir * (DIAMOND_LENGTH / 2)},${fromAnchor.y - DIAMOND_HALF_HEIGHT} ${fromAnchor.x + fromDir * DIAMOND_LENGTH},${fromAnchor.y} ${fromAnchor.x + fromDir * (DIAMOND_LENGTH / 2)},${fromAnchor.y + DIAMOND_HALF_HEIGHT}`}
          fill={relationship.type === 'composition' ? stroke : 'var(--surface-raised)'}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}

      {hasToTriangle && (
        <polygon
          className="connector-symbol"
          points={`${toAnchor.x},${toAnchor.y} ${toAnchor.x + toDir * TRIANGLE_LENGTH},${toAnchor.y - TRIANGLE_HALF_HEIGHT} ${toAnchor.x + toDir * TRIANGLE_LENGTH},${toAnchor.y + TRIANGLE_HALF_HEIGHT}`}
          fill="var(--surface-raised)"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}

      {hasToArrow && (
        <>
          <line
            className="connector-symbol"
            x1={toAnchor.x}
            y1={toAnchor.y}
            x2={toAnchor.x - toDir * ARROW_LENGTH}
            y2={toAnchor.y - 5}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            className="connector-symbol"
            x1={toAnchor.x}
            y1={toAnchor.y}
            x2={toAnchor.x - toDir * ARROW_LENGTH}
            y2={toAnchor.y + 5}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      )}

      {/* Achado em produção (2026-09-03, relatado pelo usuário): sem
          `fill`, o SVG cai no preto padrão — invisível no tema escuro. O
          resto do conector usa `currentColor` (herda `var(--text)` do
          `:root`, tema-aware); o texto de multiplicidade nunca tinha
          reaproveitado isso. */}
      {relationship.fromMultiplicity && (
        <text
          x={fromAnchor.x + fromDir * (DIAMOND_LENGTH + 6)}
          y={fromAnchor.y - 6}
          fontSize={11}
          fill="currentColor"
        >
          {relationship.fromMultiplicity}
        </text>
      )}
      {relationship.toMultiplicity && (
        <text x={toAnchor.x + toDir * (TRIANGLE_LENGTH + 6)} y={toAnchor.y - 6} fontSize={11} fill="currentColor">
          {relationship.toMultiplicity}
        </text>
      )}

      {!readOnly && (
        <circle
          cx={controlX}
          cy={midY}
          r={5}
          fill={emphasis === 'selected' ? 'var(--class-accent)' : 'currentColor'}
          opacity={emphasis === 'selected' ? 1 : 0.35}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          style={{ cursor: 'ew-resize' }}
        />
      )}
    </g>
  )
}
