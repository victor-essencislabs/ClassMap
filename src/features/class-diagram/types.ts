// TASK-003 — estrutura interna do conteúdo de um Diagrama de Classes,
// persistida em `diagrams.content` (JSONB, TASK-001).
//
// Desenhada como um SUPERSET do contrato JSON de import/export
// documentado em `.claude/agents/contrato-ia-diagrama.md`
// (`{ classes: [{ name, attributes }], relationships: [{ from, to, type }] }`):
// mesmos nomes de campo para classes/attributes/relationships/from/to/type,
// acrescentando só o que é preciso para o canvas (posição, ponto de
// controle do conector, ids estáveis para edição). Isso é rascunho
// interno, não o contrato público em si — a TASK-005 formaliza o schema
// de import/export (e um ADR, se os tokens de `RelationshipType` abaixo
// precisarem mudar).
//
// Convenção adotada para os símbolos (combinar com `contrato-ia-diagrama`
// ao formalizar): losango de agregação/composição fica na ponta `from`
// (quem tem o campo/coleção — o "todo"); seta de associação/dependência e
// triângulo de herança ficam na ponta `to` (quem é referenciado, ou a
// classe pai).

export type RelationshipType =
  | 'association'
  | 'aggregation'
  | 'composition'
  | 'inheritance'
  | 'dependency'

export interface DiagramAttribute {
  id: string
  name: string
  type: string
}

export interface DiagramClass {
  id: string
  name: string
  stereotype?: string
  attributes: DiagramAttribute[]
  x: number
  y: number
}

export interface DiagramRelationship {
  id: string
  from: string // DiagramClass.id
  to: string // DiagramClass.id
  type: RelationshipType
  fromMultiplicity?: string
  toMultiplicity?: string
  /** x absoluto (coordenadas do canvas) do segmento vertical do
   * conector ortogonal — o "ponto de controle arrastável" (RN-02 do
   * agente frontend-diagramas). */
  controlX: number
}

export interface ClassDiagramContent {
  classes: DiagramClass[]
  relationships: DiagramRelationship[]
}

export function emptyClassDiagramContent(): ClassDiagramContent {
  return { classes: [], relationships: [] }
}

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  association: 'Associação',
  aggregation: 'Agregação',
  composition: 'Composição',
  inheritance: 'Herança',
  dependency: 'Dependência',
}

export const CLASS_CARD_WIDTH = 200

/** Estimativa da altura renderizada do card (sem medir o DOM) — usada só
 * para ancorar o ponto vertical de onde um conector sai/chega. Não
 * precisa ser exata: o card cresce com mais atributos e o conector
 * mira aproximadamente o centro dele. */
export function estimateClassCardHeight(cls: DiagramClass): number {
  const headerHeight = cls.stereotype ? 52 : 36
  const attributesHeight = Math.max(cls.attributes.length, 1) * 20
  return headerHeight + attributesHeight
}
