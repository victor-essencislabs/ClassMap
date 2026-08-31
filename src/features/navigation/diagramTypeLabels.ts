// TASK-022 (ADR-008) — extraído de `DiagramsPage.tsx` (só ficava lá,
// TASK-002) para ser compartilhado com `DiagramTypeListPage.tsx` e o
// despachante da rota `/diagrams/:x` (`DiagramsRouteDispatcher.tsx`), sem
// duplicar o mapa de rótulos nem o vocabulário de slugs de URL.
import type { DiagramType } from '../../lib/supabase/types'

export const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  classes: 'Diagrama de Classes',
  objects: 'Diagrama de Objetos',
  'system-view': 'Visão do Sistema',
}

export const DIAGRAM_TYPES = Object.keys(DIAGRAM_TYPE_LABELS) as DiagramType[]

/** `true` quando `value` é um dos 3 slugs de tipo conhecidos — usado pelo
 * despachante da rota `/diagrams/:x` (ADR-008) para decidir entre a lista
 * por tipo e `DiagramRouterPage` (que trata `:x` como `diagramId`, UUID). */
export function isDiagramType(value: string): value is DiagramType {
  return value in DIAGRAM_TYPE_LABELS
}
