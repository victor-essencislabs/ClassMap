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

export interface ObjectDiagramContent {
  objects: DiagramObject[]
}

export function emptyObjectDiagramContent(): ObjectDiagramContent {
  return { objects: [] }
}
