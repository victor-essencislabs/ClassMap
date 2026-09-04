// TASK-058 — conversão entre o modelo interno da Visão do Sistema
// (`system-view/types.ts`, com ids internos) e o schema JSON público
// (`systemViewSchema.ts`, por nome). Ver `ADR-014`.
//
// A diferença central em relação ao Diagrama de Classes: **import mescla,
// não substitui**. `importClassDiagram` troca o conteúdo inteiro, e para a
// Visão do Sistema isso seria inutilizável — a cobertura real cresce módulo
// a módulo (no `ELIMS.xlsx` gerado, a aba de atributos cobre 147 blocos de
// entidade, a de métodos 64 e a de permissões 17), então importar o segundo
// módulo apagaria o primeiro.
import { newId } from '../system-view/contentOperations'
import { buildSystemViewAgentPromptMarkdown } from './agentPrompt'
import type {
  SystemViewApiMethod,
  SystemViewContent,
  SystemViewEntity,
  SystemViewField,
  SystemViewModule,
  SystemViewPermissionRule,
} from '../system-view/types'
import type { DiagramFileIO, DiagramImportResult } from './diagramFileIO'
import { SYSTEM_VIEW_FILE_TYPE } from './fileType'
import {
  parseSystemViewExport,
  validateModuleNamesUnique,
  type ExportedSystemViewModule,
  type SystemViewExportFile,
} from './systemViewSchema'

export function exportSystemView(content: SystemViewContent): SystemViewExportFile {
  return {
    type: SYSTEM_VIEW_FILE_TYPE,
    modules: content.modules.map((module) => ({
      name: module.name,
      entities: module.entities.map((entity) => ({
        name: entity.name,
        fields: entity.fields.map((field) => ({
          name: field.name,
          dbColumn: field.dbColumn,
          dbType: field.dbType,
          isPrimaryKey: field.isPrimaryKey,
          isForeignKey: field.isForeignKey,
          foreignKeyTarget: field.foreignKeyTarget,
          isAutoIncrement: field.isAutoIncrement,
          isRequired: field.isRequired,
          isUnique: field.isUnique,
          modelType: field.modelType,
          dtoType: field.dtoType,
          dtoRequired: field.dtoRequired,
          dtoMin: field.dtoMin,
          dtoMax: field.dtoMax,
          validationRule: field.validationRule,
          frontendType: field.frontendType,
        })),
        apiMethods: entity.apiMethods.map((method) => ({
          controller: method.controller,
          service: method.service,
          repository: method.repository,
          permissionCode: method.permissionCode,
        })),
        permissionRules: entity.permissionRules.map((rule) => ({
          description: rule.description,
          method: rule.method,
          codeCondition: rule.codeCondition,
        })),
      })),
    })),
  }
}

/** Um módulo do arquivo → módulo do modelo interno, com ids novos. Ids são
 * internos ao ClassMap e nunca vêm do arquivo (RN-06). */
function toModule(exported: ExportedSystemViewModule): SystemViewModule {
  return {
    id: newId(),
    name: exported.name,
    entities: exported.entities.map(
      (entity): SystemViewEntity => ({
        id: newId(),
        name: entity.name,
        fields: entity.fields.map(
          (field): SystemViewField => ({
            id: newId(),
            ...field,
            // Alvo preenchido implica FK, mesmo que quem gerou o arquivo só
            // tenha informado o alvo e esquecido o booleano.
            isForeignKey: field.isForeignKey || Boolean(field.foreignKeyTarget),
          }),
        ),
        apiMethods: entity.apiMethods.map((method): SystemViewApiMethod => ({ id: newId(), ...method })),
        permissionRules: entity.permissionRules.map(
          (rule): SystemViewPermissionRule => ({ id: newId(), ...rule }),
        ),
      }),
    ),
  }
}

/** Importa mesclando por nome de módulo: módulo presente no arquivo
 * substitui o de mesmo nome (na posição em que já estava, para a navegação
 * não pular de lugar); módulo ausente do arquivo fica intacto; módulo novo
 * entra no fim, na ordem do arquivo.
 *
 * Nunca lança — devolve `ok`/`errors` e não altera nada quando `ok` é
 * `false`. */
export function importSystemView(json: unknown, current: SystemViewContent): DiagramImportResult<SystemViewContent> {
  const parsed = parseSystemViewExport(json)
  if (!parsed.ok || !parsed.data) {
    return { ok: false, errors: parsed.errors }
  }

  const duplicateErrors = validateModuleNamesUnique(parsed.data)
  if (duplicateErrors.length > 0) {
    return { ok: false, errors: duplicateErrors }
  }

  const incoming = new Map(parsed.data.modules.map((module) => [module.name, module]))
  const merged = current.modules.map((existing) => {
    const replacement = incoming.get(existing.name)
    if (!replacement) return existing
    incoming.delete(existing.name)
    return toModule(replacement)
  })
  // O que sobrou em `incoming` é módulo que ainda não existia — percorre o
  // arquivo (não o Map) para preservar a ordem em que ele os declarou.
  for (const module of parsed.data.modules) {
    if (incoming.has(module.name)) {
      merged.push(toModule(module))
      incoming.delete(module.name)
    }
  }

  return { ok: true, content: { modules: merged }, errors: [] }
}

export const systemViewIO: DiagramFileIO<SystemViewContent> = {
  fileType: SYSTEM_VIEW_FILE_TYPE,
  export: exportSystemView,
  import: importSystemView,
  importPlaceholder:
    '{"type":"system-view","modules":[{"name":"identidade-e-tenant","entities":[{"name":"Account","fields":[{"name":"name","dbColumn":"name","dbType":"varchar(200)","dtoRequired":true,"dtoMax":"40"}]}]}]}',
  importHint:
    'Isso substitui os módulos que estiverem no arquivo e mantém os outros — dá para documentar um módulo por vez, sem perder o que já está aqui.',
  confirmImportLabel: 'Importar módulos',
  agentPrompt: buildSystemViewAgentPromptMarkdown,
  agentPromptFileName: 'classmap-prompt-ia-visao-sistema.md',
}
