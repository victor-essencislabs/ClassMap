import { useState } from 'react'
import { ClassCard } from './ClassCard'
import { Connector } from './Connector'
import * as ops from './contentOperations'

import {
  RELATIONSHIP_LABELS,
  type ClassDiagramContent,
  type DiagramClass,
  type DiagramRelationship,
  type RelationshipType,
} from './types'

interface ClassDiagramCanvasProps {
  content: ClassDiagramContent
  readOnly: boolean
  onChange: (content: ClassDiagramContent) => void
}

type Selection = { type: 'class'; id: string } | { type: 'relationship'; id: string } | null

const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]

/** Canvas do Diagrama de Classes: cards + conectores UML ortogonais
 * (TASK-003). Único ponto que sabe editar `ClassDiagramContent` — a
 * página que hospeda este componente só carrega/salva via Supabase. */
export function ClassDiagramCanvas({ content, readOnly, onChange }: ClassDiagramCanvasProps) {
  const [selection, setSelection] = useState<Selection>(null)
  const [newRelFrom, setNewRelFrom] = useState('')
  const [newRelTo, setNewRelTo] = useState('')
  const [newRelType, setNewRelType] = useState<RelationshipType>('association')

  const selectedClass =
    selection?.type === 'class' ? content.classes.find((c) => c.id === selection.id) : undefined
  const selectedRelationship =
    selection?.type === 'relationship'
      ? content.relationships.find((r) => r.id === selection.id)
      : undefined

  function addClass() {
    const next = ops.addClass(content)
    onChange(next)
    setSelection({ type: 'class', id: next.classes[next.classes.length - 1].id })
  }

  function updateClass(id: string, patch: Partial<DiagramClass>) {
    onChange(ops.updateClass(content, id, patch))
  }

  function removeClass(id: string) {
    onChange(ops.removeClass(content, id))
    setSelection(null)
  }

  function addRelationship() {
    const next = ops.addRelationship(content, newRelFrom, newRelTo, newRelType)
    if (next === content) return
    onChange(next)
    setSelection({ type: 'relationship', id: next.relationships[next.relationships.length - 1].id })
  }

  function updateRelationship(id: string, patch: Partial<DiagramRelationship>) {
    onChange(ops.updateRelationship(content, id, patch))
  }

  function removeRelationship(id: string) {
    onChange(ops.removeRelationship(content, id))
    setSelection(null)
  }

  return (
    <div className="class-diagram-layout">
      {!readOnly && (
        <div className="toolbar">
          <button type="button" onClick={addClass}>
            + Adicionar classe
          </button>

          {content.classes.length >= 2 && (
            <div className="new-relationship-form">
              <select value={newRelFrom} onChange={(e) => setNewRelFrom(e.target.value)}>
                <option value="">De…</option>
                {content.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={newRelType} onChange={(e) => setNewRelType(e.target.value as RelationshipType)}>
                {RELATIONSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RELATIONSHIP_LABELS[t]}
                  </option>
                ))}
              </select>
              <select value={newRelTo} onChange={(e) => setNewRelTo(e.target.value)}>
                <option value="">Para…</option>
                {content.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addRelationship} disabled={!newRelFrom || !newRelTo}>
                Criar relação
              </button>
            </div>
          )}
        </div>
      )}

      <div className="canvas-area">
        <svg className="connectors-layer" onClick={() => setSelection(null)}>
          {content.relationships.map((rel) => {
            const fromClass = content.classes.find((c) => c.id === rel.from)
            const toClass = content.classes.find((c) => c.id === rel.to)
            if (!fromClass || !toClass) return null
            return (
              <Connector
                key={rel.id}
                relationship={rel}
                fromClass={fromClass}
                toClass={toClass}
                selected={selection?.type === 'relationship' && selection.id === rel.id}
                readOnly={readOnly}
                onSelect={(id) => setSelection({ type: 'relationship', id })}
                onDragControlPoint={(id, controlX) => updateRelationship(id, { controlX })}
              />
            )
          })}
        </svg>

        {content.classes.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            selected={selection?.type === 'class' && selection.id === cls.id}
            readOnly={readOnly}
            onSelect={(id) => setSelection({ type: 'class', id })}
            onMove={(id, x, y) => updateClass(id, { x, y })}
          />
        ))}
      </div>

      {!readOnly && selectedClass && (
        <ClassEditPanel
          cls={selectedClass}
          onChange={(patch) => updateClass(selectedClass.id, patch)}
          onDelete={() => removeClass(selectedClass.id)}
        />
      )}

      {!readOnly && selectedRelationship && (
        <RelationshipEditPanel
          relationship={selectedRelationship}
          fromName={content.classes.find((c) => c.id === selectedRelationship.from)?.name ?? '?'}
          toName={content.classes.find((c) => c.id === selectedRelationship.to)?.name ?? '?'}
          onChange={(patch) => updateRelationship(selectedRelationship.id, patch)}
          onDelete={() => removeRelationship(selectedRelationship.id)}
        />
      )}
    </div>
  )
}

function ClassEditPanel({
  cls,
  onChange,
  onDelete,
}: {
  cls: DiagramClass
  onChange: (patch: Partial<DiagramClass>) => void
  onDelete: () => void
}) {
  function updateAttribute(id: string, patch: Partial<DiagramClass['attributes'][number]>) {
    onChange({ attributes: cls.attributes.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
  }

  function addAttribute() {
    onChange({
      attributes: [...cls.attributes, { id: ops.newId(), name: 'novoAtributo', type: 'string' }],
    })
  }

  function removeAttribute(id: string) {
    onChange({ attributes: cls.attributes.filter((a) => a.id !== id) })
  }

  return (
    <aside className="edit-panel">
      <h2>Classe</h2>
      <label>
        Nome
        <input value={cls.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <label>
        Estereótipo (opcional)
        <input
          value={cls.stereotype ?? ''}
          onChange={(e) => onChange({ stereotype: e.target.value || undefined })}
        />
      </label>

      <h3>Atributos</h3>
      {cls.attributes.map((attr) => (
        <div className="attribute-row" key={attr.id}>
          <input value={attr.name} onChange={(e) => updateAttribute(attr.id, { name: e.target.value })} />
          <input value={attr.type} onChange={(e) => updateAttribute(attr.id, { type: e.target.value })} />
          <button type="button" onClick={() => removeAttribute(attr.id)} aria-label="Remover atributo">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={addAttribute}>
        + Atributo
      </button>

      <button type="button" className="danger" onClick={onDelete}>
        Excluir classe
      </button>
    </aside>
  )
}

function RelationshipEditPanel({
  relationship,
  fromName,
  toName,
  onChange,
  onDelete,
}: {
  relationship: DiagramRelationship
  fromName: string
  toName: string
  onChange: (patch: Partial<DiagramRelationship>) => void
  onDelete: () => void
}) {
  return (
    <aside className="edit-panel">
      <h2>Relação</h2>
      <p>
        {fromName} → {toName}
      </p>
      <label>
        Tipo
        <select
          value={relationship.type}
          onChange={(e) => onChange({ type: e.target.value as RelationshipType })}
        >
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t} value={t}>
              {RELATIONSHIP_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Multiplicidade em {fromName}
        <input
          value={relationship.fromMultiplicity ?? ''}
          placeholder="1, 0..*, n"
          onChange={(e) => onChange({ fromMultiplicity: e.target.value || undefined })}
        />
      </label>
      <label>
        Multiplicidade em {toName}
        <input
          value={relationship.toMultiplicity ?? ''}
          placeholder="1, 0..*, n"
          onChange={(e) => onChange({ toMultiplicity: e.target.value || undefined })}
        />
      </label>

      <button type="button" className="danger" onClick={onDelete}>
        Excluir relação
      </button>
    </aside>
  )
}
