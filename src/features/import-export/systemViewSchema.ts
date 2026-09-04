// TASK-058 — schema JSON formal de import/export da **Visão do Sistema**: o
// segundo contrato público entre o ClassMap e agentes de IA externos
// (E-LIMS, GeoCloudAI), irmão de `schema.ts` (Diagrama de Classes). Dono:
// `contrato-ia-diagrama`. Mudança aqui é mudança de contrato — exige ADR em
// `.agents/decisions/`, exceto esta primeira formalização, que implementa a
// `ADR-014`.
//
// Diferenças deliberadas do modelo interno (`system-view/types.ts`):
//
// - módulo e entidade se referenciam por **nome**, e ids internos não fazem
//   parte do contrato (um agente externo não tem acesso ao banco do
//   ClassMap) — mesmo princípio já usado no contrato de classes;
// - `type` é **obrigatório** aqui. No contrato de classes ele é opcional
//   (RN-04: os JSONs já gerados no E-LIMS não têm o campo), mas nenhum
//   arquivo de Visão do Sistema existe ainda, então este nasce
//   auto-descritivo;
// - `dtoMin`/`dtoMax` aceitam número **ou** string. Na origem eles vêm de
//   `[MaxLength(40)]`/`[Range(2, 10)]`, onde são números — recusar `40` e
//   exigir `"40"` seria uma armadilha gratuita para quem gera o arquivo.
import { z } from 'zod'
import { declaredFileType, SYSTEM_VIEW_FILE_TYPE, wrongFileTypeError } from './fileType'

/** Texto que também aceita número na entrada (convertido para string). */
const NumericText = z.union([z.string(), z.number()]).transform(String)

const FieldSchema = z.object({
  /** Nome canônico da linha (ADR-014, decisão 1) — o único nome obrigatório.
   * `dbColumn` é opcional porque 38% das linhas reais não têm coluna de
   * banco. */
  name: z.string().min(1, 'nome do campo não pode ser vazio'),
  dbColumn: z.string().optional(),
  dbType: z.string().default(''),
  isPrimaryKey: z.boolean().default(false),
  isForeignKey: z.boolean().default(false),
  /** Tabela/entidade alvo da FK. Preenchido implica `isForeignKey` — ver
   * `normalizeParsedField`. */
  foreignKeyTarget: z.string().optional(),
  isAutoIncrement: z.boolean().default(false),
  /** NN do banco — distinto de `dtoRequired` (REQ do DTO). */
  isRequired: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  modelType: z.string().default(''),
  dtoType: z.string().default(''),
  dtoRequired: z.boolean().default(false),
  dtoMin: NumericText.optional(),
  dtoMax: NumericText.optional(),
  validationRule: z.string().default(''),
  frontendType: z.string().default(''),
})

const ApiMethodSchema = z.object({
  controller: z.string().min(1, 'método de API precisa do controller'),
  service: z.string().default(''),
  repository: z.string().default(''),
  /** Chave de funcionalidade exigida pelo código (ex.: `account.add`) —
   * ADR-014, decisão 4. */
  permissionCode: z.string().optional(),
})

const PermissionRuleSchema = z.object({
  description: z.string().min(1, 'regra de permissão precisa de descrição'),
  /** Método que a regra guarda (ADR-014, decisão 5). */
  method: z.string().default(''),
  codeCondition: z.string().default(''),
})

const EntitySchema = z.object({
  name: z.string().min(1, 'nome da entidade não pode ser vazio'),
  fields: z.array(FieldSchema).default([]),
  apiMethods: z.array(ApiMethodSchema).default([]),
  permissionRules: z.array(PermissionRuleSchema).default([]),
})

const ModuleSchema = z.object({
  name: z.string().min(1, 'nome do módulo não pode ser vazio'),
  entities: z.array(EntitySchema).default([]),
})

export const SystemViewExportSchema = z.object({
  type: z.literal(SYSTEM_VIEW_FILE_TYPE),
  modules: z.array(ModuleSchema).default([]),
})

export type SystemViewExportFile = z.infer<typeof SystemViewExportSchema>
export type ExportedSystemViewModule = z.infer<typeof ModuleSchema>
export type ExportedSystemViewEntity = z.infer<typeof EntitySchema>
export type ExportedSystemViewField = z.infer<typeof FieldSchema>

export interface SystemViewParseResult {
  ok: boolean
  data?: SystemViewExportFile
  errors: string[]
}

/** Valida um JSON arbitrário contra o schema. Nunca lança — sempre devolve
 * `ok`/`errors`, para a UI recusar sem corromper o conteúdo atual (mesma
 * garantia da TASK-005/CA-03). */
export function parseSystemViewExport(json: unknown): SystemViewParseResult {
  // O tipo é checado antes do schema para a mensagem falar do tipo errado,
  // em vez de listar `type: Invalid literal value` junto de erros de campo.
  const declared = declaredFileType(json)
  if (declared !== SYSTEM_VIEW_FILE_TYPE) {
    return { ok: false, errors: [wrongFileTypeError(declared, SYSTEM_VIEW_FILE_TYPE)] }
  }

  const result = SystemViewExportSchema.safeParse(json)
  if (result.success) {
    return { ok: true, data: result.data, errors: [] }
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`),
  }
}

/** Nomes de módulo repetidos no mesmo arquivo — o merge do import é por
 * nome de módulo, então dois módulos com o mesmo nome fariam um sobrescrever
 * o outro em silêncio. */
export function validateModuleNamesUnique(file: SystemViewExportFile): string[] {
  const seen = new Set<string>()
  const errors: string[] = []
  for (const module of file.modules) {
    if (seen.has(module.name)) {
      errors.push(`modules: "${module.name}" aparece mais de uma vez — o import mescla por nome de módulo`)
    }
    seen.add(module.name)
    const entities = new Set<string>()
    for (const entity of module.entities) {
      if (entities.has(entity.name)) {
        errors.push(`modules.${module.name}: a entidade "${entity.name}" aparece mais de uma vez`)
      }
      entities.add(entity.name)
    }
  }
  return errors
}
