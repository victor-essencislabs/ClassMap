// TASK-005 — schema JSON formal de import/export de diagramas: o
// contrato público entre o ClassMap e qualquer agente de IA externo
// (Elims, GeoCloudAI — ver `.claude/agents/contrato-ia-diagrama.md` e a
// skill `gerar-diagrama-classmap`). Mudança neste arquivo é mudança de
// contrato — exige ADR em `.agents/decisions/` (RN-01 da TASK-005),
// exceto esta primeira formalização, que só torna executável o formato
// já descrito informalmente em `contrato-ia-diagrama.md`.
//
// Diferença deliberada do modelo interno (`class-diagram/types.ts`):
// aqui classes/relações se referenciam por NOME (`from`/`to`/`class` são
// nomes de classe, não ids) — é o formato que um agente de IA externo,
// sem acesso ao banco do ClassMap, consegue gerar. Posição no canvas e
// ponto de controle do conector não fazem parte do contrato (são
// detalhes de layout do ClassMap, não da estrutura do diagrama).
import { z } from 'zod'

export const RELATIONSHIP_TYPE_VALUES = [
  'association',
  'aggregation',
  'composition',
  'inheritance',
  'dependency',
] as const

const AttributeSchema = z.object({
  name: z.string().min(1, 'nome do atributo não pode ser vazio'),
  type: z.string().min(1, 'tipo do atributo não pode ser vazio'),
})

const ClassSchema = z.object({
  name: z.string().min(1, 'nome da classe não pode ser vazio'),
  stereotype: z.string().optional(),
  attributes: z.array(AttributeSchema).default([]),
})

const RelationshipSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(RELATIONSHIP_TYPE_VALUES),
  fromMultiplicity: z.string().optional(),
  toMultiplicity: z.string().optional(),
})

const DiagramObjectSchema = z.object({
  name: z.string().min(1, 'nome do objeto não pode ser vazio'),
  class: z.string().min(1, 'objeto precisa referenciar uma classe'),
  values: z.record(z.string(), z.string()).default({}),
})

export const DiagramExportSchema = z.object({
  classes: z.array(ClassSchema).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  objects: z.array(DiagramObjectSchema).default([]),
})

export type DiagramExportFile = z.infer<typeof DiagramExportSchema>
export type ExportedClass = z.infer<typeof ClassSchema>
export type ExportedRelationship = z.infer<typeof RelationshipSchema>
export type ExportedObject = z.infer<typeof DiagramObjectSchema>

export interface ParseResult {
  ok: boolean
  data?: DiagramExportFile
  errors: string[]
}

/** Valida um JSON arbitrário (ex.: lido de um arquivo importado) contra
 * o schema. Nunca lança — sempre retorna `ok`/`errors`, para a UI poder
 * mostrar uma mensagem clara sem corromper o diagrama atual (CA-03 da
 * TASK-005). */
export function parseDiagramExport(json: unknown): ParseResult {
  const result = DiagramExportSchema.safeParse(json)
  if (result.success) {
    return { ok: true, data: result.data, errors: [] }
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`),
  }
}

/** Validações semânticas além do shape (o schema por si só não garante
 * que uma relação referencia uma classe que existe no mesmo arquivo). */
export function validateReferentialIntegrity(file: DiagramExportFile): string[] {
  const classNames = new Set(file.classes.map((c) => c.name))
  const errors: string[] = []

  for (const rel of file.relationships) {
    if (!classNames.has(rel.from)) errors.push(`relationships: "${rel.from}" não é uma classe declarada em "classes"`)
    if (!classNames.has(rel.to)) errors.push(`relationships: "${rel.to}" não é uma classe declarada em "classes"`)
  }
  for (const obj of file.objects) {
    if (!classNames.has(obj.class)) errors.push(`objects: "${obj.name}" referencia a classe "${obj.class}", que não está em "classes"`)
  }

  return errors
}
