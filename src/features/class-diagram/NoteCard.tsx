import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { screenDeltaToWorld } from '../diagram-shell/canvasTransform'
import { NOTE_CARD_WIDTH, NOTE_MIN_HEIGHT, NOTE_MIN_WIDTH, type DiagramNote } from './types'

interface NoteCardProps {
  note: DiagramNote
  selected: boolean
  readOnly: boolean
  /** Zoom atual do canvas — necessário para converter o arraste (em
   * pixels de tela) para coordenadas do mundo corretamente (mesmo padrão
   * de `ClassCard`). */
  zoom: number
  /** Em modo de conexão, uma nota nunca é origem/destino — mas ainda
   * assim não deve ser arrastável enquanto o usuário está no meio de
   * criar uma relação entre classes (mesmo comportamento de `ClassCard`,
   * por consistência de interação). */
  connectMode: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  /** TASK-052 — arrastar o grip no canto grava um tamanho manual
   * (`note.width`/`note.height`), que passa a vencer a largura fixa e a
   * altura automática por texto. */
  onResize: (id: string, width: number, height: number) => void
}

/** Card de comentário (TASK-051, ver ADR-013): anotação livre no canvas,
 * sem relação com nenhuma classe — texto + cor opcional (mesma paleta
 * `CLASS_COLORS` do card de classe). Arrastável quando `!readOnly` e fora
 * do modo de conexão, mesmo padrão de `ClassCard`; a edição do texto/cor
 * acontece no inspector (`NoteInspector`), não aqui. Redimensionável
 * (TASK-052) pelo grip no canto inferior direito, para ler o texto sem
 * precisar aproximar o zoom do canvas. */
export function NoteCard({ note, selected, readOnly, zoom, connectMode, onSelect, onMove, onResize }: NoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ clientX: number; clientY: number; origX: number; origY: number } | null>(null)
  const resizeStart = useRef<{ clientX: number; clientY: number; origWidth: number; origHeight: number } | null>(null)

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    onSelect(note.id)
    if (readOnly || connectMode) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, origX: note.x, origY: note.y }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    if (!start) return
    const delta = screenDeltaToWorld(e.clientX - start.clientX, e.clientY - start.clientY, zoom)
    onMove(note.id, start.origX + delta.x, start.origY + delta.y)
  }

  function handlePointerUp() {
    dragStart.current = null
  }

  // TASK-052 — o grip fica DENTRO do card, então seu próprio pointerdown
  // precisa de `stopPropagation` para não também iniciar o arraste de
  // mover (`handlePointerDown` acima, no card inteiro). A altura atual
  // parte do próprio DOM renderizado quando `note.height` ainda não foi
  // definido manualmente (altura automática por texto) — não tem como
  // saber esse valor sem medir, diferente da largura (sempre um número
  // conhecido, fixo ou já manual).
  function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const renderedHeight = cardRef.current?.getBoundingClientRect().height
    resizeStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origWidth: note.width ?? NOTE_CARD_WIDTH,
      origHeight: note.height ?? (renderedHeight ? renderedHeight / zoom : NOTE_MIN_HEIGHT),
    }
  }

  function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = resizeStart.current
    if (!start) return
    e.stopPropagation()
    const delta = screenDeltaToWorld(e.clientX - start.clientX, e.clientY - start.clientY, zoom)
    onResize(
      note.id,
      Math.max(NOTE_MIN_WIDTH, start.origWidth + delta.x),
      Math.max(NOTE_MIN_HEIGHT, start.origHeight + delta.y),
    )
  }

  function handleResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    resizeStart.current = null
  }

  const style: CSSProperties = {
    position: 'absolute',
    left: note.x,
    top: note.y,
    width: note.width ?? NOTE_CARD_WIDTH,
  }
  if (note.height) style.height = note.height
  if (note.color) (style as CSSProperties & { '--note-color'?: string })['--note-color'] = note.color

  return (
    <div
      ref={cardRef}
      className={`note-card${selected ? ' selected' : ''}${note.color ? ' has-color' : ''}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      tabIndex={0}
    >
      {note.text ? (
        <div className="note-card-text">{note.text}</div>
      ) : (
        <div className="note-card-text note-card-empty">Comentário vazio — clique para editar.</div>
      )}

      {!readOnly && (
        <div
          className="note-resize-handle"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
