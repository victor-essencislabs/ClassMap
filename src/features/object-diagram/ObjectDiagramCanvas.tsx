import { useState } from 'react'
import type { DiagramClass } from '../class-diagram/types'
import { ObjectCard } from './ObjectCard'
import * as ops from './contentOperations'
import type { ObjectDiagramContent } from './types'

interface ClassDiagramOption {
  id: string
  name: string
}

interface ObjectDiagramCanvasProps {
  content: ObjectDiagramContent
  readOnly: boolean
  onChange: (content: ObjectDiagramContent) => void
  /** Diagramas de classes disponíveis no projeto (type: 'classes') para servir de origem de um novo objeto. */
  classDiagrams: ClassDiagramOption[]
  /** Carrega as classes de um Diagrama de Classes (chamado sob demanda, ao escolher a origem). */
  loadClasses: (diagramId: string) => Promise<DiagramClass[]>
}

/** Canvas do Diagrama de Objetos (TASK-004): cards de instância +
 * formulário "criar objeto a partir de uma classe existente" (RN-01). */
export function ObjectDiagramCanvas({
  content,
  readOnly,
  onChange,
  classDiagrams,
  loadClasses,
}: ObjectDiagramCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sourceDiagramId, setSourceDiagramId] = useState('')
  const [availableClasses, setAvailableClasses] = useState<DiagramClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedObject = content.objects.find((o) => o.id === selectedId)

  async function handleSourceDiagramChange(diagramId: string) {
    setSourceDiagramId(diagramId)
    setSelectedClassId('')
    setAvailableClasses([])
    if (!diagramId) return
    setLoadingClasses(true)
    setError(null)
    try {
      setAvailableClasses(await loadClasses(diagramId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar classes.')
    } finally {
      setLoadingClasses(false)
    }
  }

  function handleAddObject() {
    const sourceClass = availableClasses.find((c) => c.id === selectedClassId)
    if (!sourceClass) return
    const next = ops.addObject(content, sourceClass)
    onChange(next)
    setSelectedId(next.objects[next.objects.length - 1].id)
  }

  function handleRemoveObject(id: string) {
    onChange(ops.removeObject(content, id))
    setSelectedId(null)
  }

  return (
    <div className="class-diagram-layout">
      {!readOnly && (
        <div className="toolbar">
          {classDiagrams.length === 0 ? (
            <p>Crie um Diagrama de Classes neste projeto antes de adicionar objetos.</p>
          ) : (
            <div className="new-relationship-form">
              <select value={sourceDiagramId} onChange={(e) => handleSourceDiagramChange(e.target.value)}>
                <option value="">Diagrama de classes de origem…</option>
                {classDiagrams.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={!sourceDiagramId || loadingClasses}
              >
                <option value="">{loadingClasses ? 'Carregando…' : 'Classe…'}</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleAddObject} disabled={!selectedClassId}>
                + Adicionar objeto
              </button>
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div className="canvas-area">
        {content.objects.map((obj) => (
          <ObjectCard
            key={obj.id}
            obj={obj}
            selected={obj.id === selectedId}
            readOnly={readOnly}
            onSelect={setSelectedId}
            onMove={(id, x, y) => onChange(ops.updateObject(content, id, { x, y }))}
          />
        ))}
      </div>

      {!readOnly && selectedObject && (
        <ObjectEditPanel
          obj={selectedObject}
          onChange={(patch) => onChange(ops.updateObject(content, selectedObject.id, patch))}
          onValueChange={(attributeId, value) =>
            onChange(ops.updateObjectValue(content, selectedObject.id, attributeId, value))
          }
          onDelete={() => handleRemoveObject(selectedObject.id)}
        />
      )}
    </div>
  )
}

function ObjectEditPanel({
  obj,
  onChange,
  onValueChange,
  onDelete,
}: {
  obj: ObjectDiagramContent['objects'][number]
  onChange: (patch: { instanceName?: string }) => void
  onValueChange: (attributeId: string, value: string) => void
  onDelete: () => void
}) {
  return (
    <aside className="edit-panel">
      <h2>Objeto : {obj.className}</h2>
      <label>
        Nome da instância (opcional)
        <input
          value={obj.instanceName ?? ''}
          onChange={(e) => onChange({ instanceName: e.target.value || undefined })}
        />
      </label>

      <h3>Valores</h3>
      {obj.values.map((v) => (
        <label key={v.attributeId}>
          {v.name} ({v.type})
          <input value={v.value} onChange={(e) => onValueChange(v.attributeId, e.target.value)} />
        </label>
      ))}

      <button type="button" className="danger" onClick={onDelete}>
        Excluir objeto
      </button>
    </aside>
  )
}
