import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
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
  /** TASK-055 — troca a lista de atributos por uma linha com a contagem,
   * dando ao card uma altura fixa e pequena (`FOCUS_CARD_HEIGHT`). Usado
   * só pelo modal de foco: lá a pergunta é "com quem esta classe se
   * relaciona", e a lista de atributos é justamente o que impede de
   * responder — no diagrama real do ELIMS uma classe tem 97 atributos, o
   * que faz um card de ~2000px de altura e obriga o enquadramento a
   * encolher o recorte inteiro até ficar ilegível. Quem quer os atributos
   * clica na classe no canvas. */
  compact?: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

/** Card de classe: nome, estereótipo opcional e atributos (RN-01 da TASK-003).
 * Arrastável quando `!readOnly` e fora do modo de conexão — a edição de
 * nome/estereótipo/atributos acontece no inspector do shell (TASK-006),
 * não aqui. */
export function ClassCard({
  cls,
  selected,
  readOnly,
  zoom,
  connectMode,
  compact = false,
  onSelect,
  onMove,
}: ClassCardProps) {
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

  const style: CSSProperties = { position: 'absolute', left: cls.x, top: cls.y, width: CARD_WIDTH }
  // Cor escolhida no inspector (TASK-014, ver ADR-005) — vira variável
  // CSS lida por `.node-box.has-color` em `src/index.css`. Sem `color`,
  // nada muda (CA-04: aparência padrão preservada).
  if (cls.color) (style as CSSProperties & { '--node-color'?: string })['--node-color'] = cls.color

  return (
    <div
      className={`node-box${selected ? ' selected' : ''}${cls.color ? ' has-color' : ''}${compact ? ' compact' : ''}`}
      style={style}
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
        {compact ? (
          <div className="node-row node-attr-count">
            {cls.attributes.length} {cls.attributes.length === 1 ? 'atributo' : 'atributos'}
          </div>
        ) : cls.attributes.length === 0 ? (
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
