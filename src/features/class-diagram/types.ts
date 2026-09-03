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

/** Card de comentário (TASK-051, ver ADR-013) — anotação livre no canvas,
 * sem relação com nenhuma classe específica. Reaproveita a mesma paleta
 * `CLASS_COLORS` do card de classe (reforça visualmente "esta cor de
 * comentário é a mesma cor que aparece nos cards"), nunca uma paleta
 * própria. Puramente interno ao ClassMap: NUNCA entra no schema Zod de
 * import/export (RN-01 da ADR-013) — mesmo precedente já usado para
 * posição/cor de classe (ADR-005). */
export interface DiagramNote {
  id: string
  text: string
  x: number
  y: number
  color?: string
  /** Tamanho manual (TASK-052), arrastando o grip no canto do card
   * (`NoteCard.tsx`). `undefined` mantém o comportamento padrão: largura
   * fixa (`NOTE_CARD_WIDTH`) e altura automática pelo texto. */
  width?: number
  height?: number
}

export interface ClassDiagramContent {
  classes: DiagramClass[]
  relationships: DiagramRelationship[]
  /** Opcional (TASK-051) — diagramas salvos antes da ADR-013 não têm
   * este campo no JSONB persistido; toda leitura trata como `[]`
   * (`content.notes ?? []`), nunca lança por causa de um campo ausente. */
  notes?: DiagramNote[]
}

export function emptyClassDiagramContent(): ClassDiagramContent {
  return { classes: [], relationships: [], notes: [] }
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

/** Estimativa da altura renderizada do card (sem medir o DOM) — usada
 * para ancorar o ponto vertical de onde um conector sai/chega, e (desde
 * a TASK-048) para calibrar o número de colunas do layout inicial de
 * import antes de as classes terem `id`/posição atribuídos — por isso o
 * parâmetro aceita qualquer objeto com `stereotype`/`attributes`, não só
 * um `DiagramClass` completo. Não precisa ser exata: o card cresce com
 * mais atributos e o conector mira aproximadamente o centro dele. */
export function estimateClassCardHeight(cls: { stereotype?: string; attributes: { length: number } }): number {
  const headerHeight = cls.stereotype ? 52 : 36
  const attributesHeight = Math.max(cls.attributes.length, 1) * 20
  return headerHeight + attributesHeight
}

// TASK-051 — card de comentário: mesma largura do card de classe (unidade
// visual consistente no canvas), altura estimada a partir do tamanho do
// texto (usada só para o cálculo de bounds do "ajustar à tela" — a altura
// real renderizada cresce com `white-space: pre-wrap`, não precisa bater
// exatamente).
export const NOTE_CARD_WIDTH = 200
// TASK-052 — piso de tamanho ao redimensionar pelo grip do canto
// (`NoteCard.tsx`): pequeno o suficiente para não atrapalhar, grande o
// suficiente para o texto não virar ilegível.
export const NOTE_MIN_WIDTH = 140
export const NOTE_MIN_HEIGHT = 50
const NOTE_CHARS_PER_LINE = 26
const NOTE_LINE_HEIGHT = 18
const NOTE_PADDING = 24

export function estimateNoteCardHeight(note: { text: string }): number {
  const lines = Math.max(1, Math.ceil(note.text.length / NOTE_CHARS_PER_LINE))
  return NOTE_PADDING + lines * NOTE_LINE_HEIGHT
}
