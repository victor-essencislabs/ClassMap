// TASK-004 — lógica pura de edição da Visão do Sistema, testável sem
// renderizar componentes.
import {
  emptyApiMethod,
  emptyField,
  emptyPermissionRule,
  type SystemViewApiMethod,
  type SystemViewContent,
  type SystemViewEntity,
  type SystemViewField,
  type SystemViewModule,
  type SystemViewPermissionRule,
} from './types'

export function newId(): string {
  return crypto.randomUUID()
}

function mapModule(
  content: SystemViewContent,
  moduleId: string,
  fn: (m: SystemViewModule) => SystemViewModule,
): SystemViewContent {
  return { modules: content.modules.map((m) => (m.id === moduleId ? fn(m) : m)) }
}

function mapEntity(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  fn: (e: SystemViewEntity) => SystemViewEntity,
): SystemViewContent {
  return mapModule(content, moduleId, (m) => ({
    ...m,
    entities: m.entities.map((e) => (e.id === entityId ? fn(e) : e)),
  }))
}

/** `name` vazio/só espaços cai no padrão "Novo módulo" (TASK-018, mesmo
 * padrão de `createEmptyDiagram`/TASK-016) — nunca cria um módulo sem nome. */
export function addModule(content: SystemViewContent, name?: string): SystemViewContent {
  const module: SystemViewModule = { id: newId(), name: name?.trim() || 'Novo módulo', entities: [] }
  return { modules: [...content.modules, module] }
}

export function updateModule(
  content: SystemViewContent,
  moduleId: string,
  patch: Partial<Pick<SystemViewModule, 'name'>>,
): SystemViewContent {
  return mapModule(content, moduleId, (m) => ({ ...m, ...patch }))
}

export function removeModule(content: SystemViewContent, moduleId: string): SystemViewContent {
  return { modules: content.modules.filter((m) => m.id !== moduleId) }
}

/** Sempre nasce com os 3 blocos presentes (vazios) — RN-02: nenhum bloco é omitido, mesmo vazio. */
export function addEntity(content: SystemViewContent, moduleId: string): SystemViewContent {
  const entity: SystemViewEntity = {
    id: newId(),
    name: 'NovaEntidade',
    fields: [],
    apiMethods: [],
    permissionRules: [],
  }
  return mapModule(content, moduleId, (m) => ({ ...m, entities: [...m.entities, entity] }))
}

export function updateEntity(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  patch: Partial<Pick<SystemViewEntity, 'name'>>,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({ ...e, ...patch }))
}

export function removeEntity(content: SystemViewContent, moduleId: string, entityId: string): SystemViewContent {
  return mapModule(content, moduleId, (m) => ({ ...m, entities: m.entities.filter((e) => e.id !== entityId) }))
}

export function addField(content: SystemViewContent, moduleId: string, entityId: string): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({ ...e, fields: [...e.fields, emptyField(newId())] }))
}

export function updateField(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  fieldId: string,
  patch: Partial<SystemViewField>,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    fields: e.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
  }))
}

export function removeField(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  fieldId: string,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({ ...e, fields: e.fields.filter((f) => f.id !== fieldId) }))
}

export function addApiMethod(content: SystemViewContent, moduleId: string, entityId: string): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    apiMethods: [...e.apiMethods, emptyApiMethod(newId())],
  }))
}

export function updateApiMethod(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  methodId: string,
  patch: Partial<SystemViewApiMethod>,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    apiMethods: e.apiMethods.map((a) => (a.id === methodId ? { ...a, ...patch } : a)),
  }))
}

export function removeApiMethod(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  methodId: string,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    apiMethods: e.apiMethods.filter((a) => a.id !== methodId),
  }))
}

export function addPermissionRule(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    permissionRules: [...e.permissionRules, emptyPermissionRule(newId())],
  }))
}

export function updatePermissionRule(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  ruleId: string,
  patch: Partial<SystemViewPermissionRule>,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    permissionRules: e.permissionRules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
  }))
}

export function removePermissionRule(
  content: SystemViewContent,
  moduleId: string,
  entityId: string,
  ruleId: string,
): SystemViewContent {
  return mapEntity(content, moduleId, entityId, (e) => ({
    ...e,
    permissionRules: e.permissionRules.filter((r) => r.id !== ruleId),
  }))
}
