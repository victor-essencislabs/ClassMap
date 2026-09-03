// TASK-004 — estrutura interna do Diagrama de Objetos, persistida em
// `diagrams.content` (JSONB, `type: 'objects'`).
//
// RN-01 (`.claude/agents/frontend-diagramas.md`): um objeto sempre
// referencia uma classe existente e herda sua lista de atributos —
// nunca um atributo solto sem classe correspondente. Aqui isso é feito
// por SNAPSHOT: ao criar o objeto, copiamos a lista de atributos da
// classe escolhida (de um Diagrama de Classes do mesmo projeto) para
// dentro do próprio objeto. Decisão deliberada — ver "Decisões" no
// registro de execução da TASK-004: evita ter que reabrir/sincronizar o
// Diagrama de Classes de origem sempre que o Diagrama de Objetos for
// carregado, ao custo de o objeto não acompanhar uma renomeação de
// atributo feita depois na classe original.

import type { DiagramNote } from '../class-diagram/types'

export interface ObjectAttributeValue {
  attributeId: string
  name: string
  type: string
  value: string
}

export interface DiagramObject {
  id: string
  /** Nome da instância, opcional (ex.: "pedido1"). */
  instanceName?: string
  /** id da classe de origem — só para referência/depuração, não é mais consultado após a criação. */
  classId: string
  className: string
  values: ObjectAttributeValue[]
  x: number
  y: number
}

// TASK-017 (ver ADR-006) — link simples entre dois objetos, sem os 5
// tipos UML/multiplicidade do Diagrama de Classes (não fazem sentido
// semântico entre instâncias concretas). `controlX` segue o mesmo
// padrão de `DiagramRelationship.controlX` em `class-diagram/types.ts`
// (x absoluto do segmento vertical do roteamento ortogonal, arrastável)
// — a ADR descreve o shape essencial `{ id, from, to, label? }`;
// `controlX` é acrescentado aqui pelo mesmo motivo que lá: sem ele, o
// ponto de controle arrastável do conector não sobreviveria a um
// reload. Puramente interno — nunca faz parte do schema Zod de
// import/export (RN-04, `src/features/import-export/schema.ts`).
export interface ObjectLink {
  id: string
  from: string // DiagramObject.id
  to: string // DiagramObject.id
  label?: string
  controlX: number
}

// TASK-053 — cards de comentário também no Diagrama de Objetos, mesmo
// tipo `DiagramNote` do Diagrama de Classes (ver `class-diagram/types.ts`,
// TASK-051/ADR-013): texto livre + cor, sem relação com nenhum objeto
// específico, nunca entra no schema Zod de import/export. Reaproveitado
// em vez de duplicado — é genérico, não amarrado a classe nenhuma.
export interface ObjectDiagramContent {
  objects: DiagramObject[]
  links: ObjectLink[]
  /** Opcional — diagramas salvos antes da TASK-053 não têm este campo no
   * JSONB persistido; toda leitura trata como `[]` (`content.notes ?? []`). */
  notes?: DiagramNote[]
}

export function emptyObjectDiagramContent(): ObjectDiagramContent {
  return { objects: [], links: [], notes: [] }
}

export const OBJECT_CARD_WIDTH = 220

/** Estimativa da altura renderizada do card (TASK-008, mesmo espírito de
 * `estimateClassCardHeight` em `class-diagram/types.ts`) — usada para o
 * enquadramento do zoom/pan. O cabeçalho do objeto sempre tem 2 linhas
 * (rótulo "objeto" + "instância : Classe", ver `.node-head .stereo` no
 * artefato), diferente da classe onde o estereótipo é opcional. */
export function estimateObjectCardHeight(obj: DiagramObject): number {
  const headerHeight = 52
  const valuesHeight = Math.max(obj.values.length, 1) * 20
  return headerHeight + valuesHeight
}
