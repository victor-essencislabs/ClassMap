// TASK-051 (ver ADR-013) — inspector do card de comentário: texto livre +
// a mesma paleta de cor do card de classe (`ClassColorGrid` reaproveitado,
// não uma paleta própria). Extraído de `ClassDiagramCanvas.tsx` na
// TASK-053 para ser reaproveitado também pelo Diagrama de Objetos — o
// comentário é genérico (não amarrado a nenhuma classe/objeto
// específico), então o mesmo componente serve aos dois.
import { ClassColorGrid } from './ClassColorGrid'
import type { DiagramNote } from './types'

export function NoteInspector({
  note,
  readOnly,
  onChange,
  onDelete,
}: {
  note: DiagramNote
  readOnly: boolean
  onChange: (patch: Partial<DiagramNote>) => void
  onDelete: () => void
}) {
  return (
    <>
      <div className="insp-title">Comentário</div>
      <div className="field">
        <label htmlFor="note-text-input">Texto</label>
        {readOnly ? (
          <div className="mono" style={{ whiteSpace: 'pre-wrap' }}>
            {note.text || '—'}
          </div>
        ) : (
          <textarea
            id="note-text-input"
            rows={5}
            placeholder="Ex.: classes que precisam ser excluídas"
            value={note.text}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        )}
      </div>

      <div className="insp-title">Cor do card (opcional)</div>
      {readOnly ? (
        <div className="mono" style={{ marginBottom: 14 }}>
          {note.color ?? 'Padrão'}
        </div>
      ) : (
        <ClassColorGrid value={note.color} onChange={(color) => onChange({ color })} />
      )}

      {!readOnly && (
        <div className="insp-actions">
          <button type="button" className="btn danger" onClick={onDelete}>
            Excluir comentário
          </button>
        </div>
      )}
    </>
  )
}
