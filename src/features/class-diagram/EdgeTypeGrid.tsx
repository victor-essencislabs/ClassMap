// TASK-007 — seletor visual de tipo de relação no inspector
// (`.edge-type-grid`/`.edge-type-opt`, TASK-006), substituindo o
// `<select>` textual do painel flutuante antigo. Os 5 ícones replicam
// os símbolos UML desenhados no artefato-protótipo (`EDGE_ICONS`) — RN-01
// do papel `frontend-diagramas`: os 5 tipos continuam distintos e com o
// símbolo geométrico correto.
import { RELATIONSHIP_LABELS, type RelationshipType } from './types'

const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]

function EdgeTypeIcon({ type }: { type: RelationshipType }) {
  switch (type) {
    case 'association':
      return (
        <svg viewBox="0 0 34 16" aria-hidden="true">
          <line x1={2} y1={8} x2={24} y2={8} stroke="currentColor" strokeWidth={1.6} />
          <polyline points="20,4 26,8 20,12" fill="none" stroke="currentColor" strokeWidth={1.6} />
        </svg>
      )
    case 'aggregation':
      return (
        <svg viewBox="0 0 34 16" aria-hidden="true">
          <polygon points="2,8 8,4 14,8 8,12" fill="none" stroke="currentColor" strokeWidth={1.4} />
          <line x1={14} y1={8} x2={30} y2={8} stroke="currentColor" strokeWidth={1.6} />
        </svg>
      )
    case 'composition':
      return (
        <svg viewBox="0 0 34 16" aria-hidden="true">
          <polygon points="2,8 8,4 14,8 8,12" fill="currentColor" stroke="currentColor" strokeWidth={1.4} />
          <line x1={14} y1={8} x2={30} y2={8} stroke="currentColor" strokeWidth={1.6} />
        </svg>
      )
    case 'inheritance':
      return (
        <svg viewBox="0 0 34 16" aria-hidden="true">
          <line x1={2} y1={8} x2={22} y2={8} stroke="currentColor" strokeWidth={1.6} />
          <polygon points="22,3 32,8 22,13" fill="none" stroke="currentColor" strokeWidth={1.4} />
        </svg>
      )
    case 'dependency':
      return (
        <svg viewBox="0 0 34 16" aria-hidden="true">
          <line x1={2} y1={8} x2={24} y2={8} stroke="currentColor" strokeWidth={1.6} strokeDasharray="4 3" />
          <polyline points="20,4 26,8 20,12" fill="none" stroke="currentColor" strokeWidth={1.6} />
        </svg>
      )
  }
}

export function EdgeTypeGrid({
  value,
  onChange,
}: {
  value: RelationshipType
  onChange: (type: RelationshipType) => void
}) {
  return (
    <div className="edge-type-grid" role="radiogroup" aria-label="Tipo de relação">
      {RELATIONSHIP_TYPES.map((type) => (
        <div
          key={type}
          className={`edge-type-opt${type === value ? ' active' : ''}`}
          role="radio"
          aria-checked={type === value}
          tabIndex={0}
          onClick={() => onChange(type)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onChange(type)
          }}
        >
          <EdgeTypeIcon type={type} />
          <span>{RELATIONSHIP_LABELS[type]}</span>
        </div>
      ))}
    </div>
  )
}
