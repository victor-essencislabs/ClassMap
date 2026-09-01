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
  /** Em modo de conexão de links (TASK-017, mesmo padrão de `ClassCard`
   * no Diagrama de Classes), o card não é arrastável — só clicável, para
   * completar o link (ver `ObjectDiagramCanvas`). */
  connectMode: boolean
  /** TASK-042 (ADR-011) — verdadeiro só logo após a criação deste objeto
   * (RN-01 da task: nunca ao reabrir um diagrama existente nem depois de
   * uma edição manual). Dispara o destaque de "valor herdado da classe"
   * (`--object-soft` piscando uma vez) nos `.node-row` de valor. */
  justCreated?: boolean
  /** Chamado quando a animação de destaque termina, para o próprio
   * `ObjectDiagramCanvas` limpar o flag e não repetir o efeito em
   * re-renders futuros. Ignorado se `justCreated` for falso (ex.: objeto
   * sem atributos, sem `.node-row` para animar — ver chamada em
   * `ObjectDiagramCanvas.handlePickClass`, que só marca `justCreated`
   * quando há pelo menos um valor herdado). */
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onJustCreatedShown?: () => void
}

/** Card de objeto: "instância : Classe" + valores herdados da classe
 * (RN-01 da TASK-004), estilizado como `.node-box.object` (TASK-006/008
 * — sublinhado no cabeçalho, valores em `--object-accent`) para
 * diferenciar visualmente do Diagrama de Classes. Edição de
 * nome/valores acontece no inspector do shell (TASK-008), não aqui. */
export function ObjectCard({
  obj,
  selected,
  readOnly,
  zoom,
  connectMode,
  justCreated,
  onSelect,
  onMove,
  onJustCreatedShown,
}: ObjectCardProps) {
  const dragStart = useRef<{ clientX: number; clientY: number; origX: number; origY: number } | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(obj.id)
    if (readOnly || connectMode) return
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
      <div
        className="node-body"
        // TASK-042 (ADR-011): um `animationend` por `.node-row` que piscou
        // (evento borbulha até aqui) — chamar `onJustCreatedShown` mais de
        // uma vez é inofensivo (o canvas só limpa um `useState`), então não
        // há necessidade de contar quantos terminaram.
        onAnimationEnd={justCreated ? onJustCreatedShown : undefined}
      >
        {obj.values.length === 0 ? (
          <div className="node-empty-row">sem atributos</div>
        ) : (
          obj.values.map((v) => (
            <div className={`node-row${justCreated ? ' inherited-flash' : ''}`} key={v.attributeId}>
              {v.name} = <span className="attr-val">{v.value || '—'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
