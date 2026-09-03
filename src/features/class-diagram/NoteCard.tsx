import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { screenDeltaToWorld } from '../diagram-shell/canvasTransform'
import { NOTE_CARD_WIDTH, type DiagramNote } from './types'

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
}

/** Card de comentário (TASK-051, ver ADR-013): anotação livre no canvas,
 * sem relação com nenhuma classe — texto + cor opcional (mesma paleta
 * `CLASS_COLORS` do card de classe). Arrastável quando `!readOnly` e fora
 * do modo de conexão, mesmo padrão de `ClassCard`; a edição do texto/cor
 * acontece no inspector (`NoteInspector`), não aqui. */
export function NoteCard({ note, selected, readOnly, zoom, connectMode, onSelect, onMove }: NoteCardProps) {
  const dragStart = useRef<{ clientX: number; clientY: number; origX: number; origY: number } | null>(null)

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

  const style: CSSProperties = { position: 'absolute', left: note.x, top: note.y, width: NOTE_CARD_WIDTH }
  if (note.color) (style as CSSProperties & { '--note-color'?: string })['--note-color'] = note.color

  return (
    <div
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
    </div>
  )
}
