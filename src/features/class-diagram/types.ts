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
  /** Cor de acabamento do card, escolhida no inspector (TASK-014, ver
   * ADR-005) — sempre um dos hex de `CLASS_COLORS` abaixo (paleta
   * fechada, nunca RGB/hex arbitrário). `undefined` mantém a aparência
   * padrão (`--accent`), sem nenhuma mudança visual — comportamento
   * inalterado para diagramas já existentes (CA-04). Puramente interno
   * ao ClassMap: NUNCA entra no schema Zod de import/export
   * (`src/features/import-export/schema.ts`, RN-01 da ADR-005) — mesmo
   * precedente já usado para posição/layout (`x`/`y` acima). */
  color?: string
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

export function isClassDiagramContent(value: unknown): value is ClassDiagramContent {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ClassDiagramContent).classes) &&
    Array.isArray((value as ClassDiagramContent).relationships)
  )
}

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  association: 'Associação',
  aggregation: 'Agregação',
  composition: 'Composição',
  inheritance: 'Herança',
  dependency: 'Dependência',
}

/** Paleta fixa de cores para o card de classe (TASK-014, ver ADR-005) —
 * pelo menos 20 opções (CA-01), nunca um color-picker de RGB/hex livre.
 * Cada hex é aplicado como acento (borda + leve realce do cabeçalho do
 * card via `color-mix`, ver `.node-box.has-color` no `src/index.css`) —
 * nunca como cor de texto sólida — para continuar legível tanto contra
 * `--surface-raised` claro quanto escuro sem precisar de um hex
 * diferente por tema (mesma técnica já usada nos tokens de acento
 * existentes do design system, ex. `color-mix(in srgb, var(--accent)
 * 45%, transparent)` em `src/index.css`). */
export interface ClassColorOption {
  id: string
  label: string
  hex: string
}

export const CLASS_COLORS: ClassColorOption[] = [
  { id: 'red', label: 'Vermelho', hex: '#ef4444' },
  { id: 'orange', label: 'Laranja', hex: '#f97316' },
  { id: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { id: 'yellow', label: 'Amarelo', hex: '#eab308' },
  { id: 'lime', label: 'Lima', hex: '#84cc16' },
  { id: 'green', label: 'Verde', hex: '#22c55e' },
  { id: 'emerald', label: 'Esmeralda', hex: '#10b981' },
  { id: 'teal', label: 'Verde-azulado', hex: '#14b8a6' },
  { id: 'cyan', label: 'Ciano', hex: '#06b6d4' },
  { id: 'sky', label: 'Azul-celeste', hex: '#0ea5e9' },
  { id: 'blue', label: 'Azul', hex: '#3b82f6' },
  { id: 'indigo', label: 'Índigo', hex: '#6366f1' },
  { id: 'violet', label: 'Violeta', hex: '#8b5cf6' },
  { id: 'purple', label: 'Roxo', hex: '#a855f7' },
  { id: 'fuchsia', label: 'Fúcsia', hex: '#d946ef' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899' },
  { id: 'rose', label: 'Rosa-choque', hex: '#f43f5e' },
  { id: 'brown', label: 'Marrom', hex: '#a16207' },
  { id: 'slate', label: 'Ardósia', hex: '#64748b' },
  { id: 'gray', label: 'Cinza', hex: '#6b7280' },
  { id: 'stone', label: 'Pedra', hex: '#78716c' },
  { id: 'graphite', label: 'Grafite', hex: '#3f3f46' },
]

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
